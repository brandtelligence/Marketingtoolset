import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronRight, ChevronLeft, ChevronDown, Sparkles, Check, Lock,
  Send, Loader2, Bot, User, RotateCcw, Zap, Copy, CheckCircle,
  Save, PlusCircle, Image, Film, Music, Mic, Wand2, RefreshCw,
  Edit3, Eye, FileCheck, Palette,
} from 'lucide-react';
import {
  SiInstagram, SiFacebook, SiX, SiLinkedin, SiTiktok,
  SiYoutube, SiPinterest, SiSnapchat, SiThreads, SiReddit, SiWhatsapp,
  SiTelegram,
} from 'react-icons/si';
import {
  marketingChannels,
  socialPlatforms,
  contentActions,
  generateInitialResponse,
  generateChatResponse,
  createMessageId,
  generateImage,
  refineContent,
  type AIMessage,
  type ContentRequest,
  type MarketingChannel,
} from './aiEngine';
import { useContent, createCardId, type ContentCard } from '../../contexts/ContentContext';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';

// ─── Brand icon mapping ────────────────────────────────────────────────────────

const platformBrandIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: SiInstagram,
  facebook: SiFacebook,
  twitter: SiX,
  linkedin: SiLinkedin,
  tiktok: SiTiktok,
  youtube: SiYoutube,
  pinterest: SiPinterest,
  snapchat: SiSnapchat,
  threads: SiThreads,
  reddit: SiReddit,
  whatsapp: SiWhatsapp,
  telegram: SiTelegram,
};

const platformBrandColors: Record<string, string> = {
  instagram: 'text-pink-400',
  facebook: 'text-blue-500',
  twitter: 'text-white',
  linkedin: 'text-blue-400',
  tiktok: 'text-white',
  youtube: 'text-red-500',
  pinterest: 'text-red-400',
  snapchat: 'text-yellow-300',
  threads: 'text-white',
  reddit: 'text-orange-500',
  whatsapp: 'text-green-400',
  telegram: 'text-blue-500',
};

function PlatformIcon({ platformId, className }: { platformId: string; className?: string }) {
  const Icon = platformBrandIcons[platformId];
  if (!Icon) return null;
  return <Icon className={className || `w-6 h-6 ${platformBrandColors[platformId] || 'text-white'}`} />;
}

interface CreateContentWizardProps {
  projectId: string;
  projectName: string;
  projectDescription: string;
  onClose: () => void;
}

type WizardStep = 'channel' | 'platforms' | 'actions' | 'chat' | 'assets' | 'review';

// ─── Asset Generation Types & Data ─────────────────────────────────────────────

interface GeneratedAsset {
  id: string;
  actionId: string;
  title: string;
  description: string;
  imageUrl: string;
  status: 'pending' | 'generating' | 'generated';
  prompt: string;
}

const assetPlaceholderImages = [
  'https://images.unsplash.com/photo-1675119715594-30fde4bd3dbc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
  'https://images.unsplash.com/photo-1649006865582-7267627f500c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
  'https://images.unsplash.com/photo-1726066012749-f81bf4422d4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
  'https://images.unsplash.com/photo-1584448097935-a4b1aed506ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
  'https://images.unsplash.com/photo-1762028892567-6ebfbb894992?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
  'https://images.unsplash.com/photo-1617893604862-2462582254c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
  'https://images.unsplash.com/photo-1639493115941-b269818abfcd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
  'https://images.unsplash.com/photo-1764312385768-93b8f47250de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
  'https://images.unsplash.com/photo-1661922028028-e3c340d459d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
  'https://images.unsplash.com/photo-1587400563263-e77a5590bfe7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600',
];

const actionAssetMeta: Record<string, { icon: React.ReactNode; label: string; concepts: { title: string; desc: string; prompt: string }[] }> = {
  'image-creation': {
    icon: <Image className="w-4 h-4" />,
    label: 'Images & Graphics',
    concepts: [
      { title: 'Hero Banner', desc: 'Brand hero image with gradient background and bold typography', prompt: 'Modern hero banner with brand colors, gradient background, bold headline' },
      { title: 'Feature Carousel', desc: '5-slide carousel highlighting key features with icons', prompt: 'Multi-slide carousel infographic with feature icons and benefit statements' },
      { title: 'Quote Card', desc: 'Testimonial graphic with customer photo and quote overlay', prompt: 'Professional testimonial card with portrait photo and quote typography' },
      { title: 'Story Template', desc: 'Interactive story with poll/quiz and swipe-up CTA', prompt: 'Vertical story template with interactive elements and brand gradient' },
    ],
  },
  'video-creation': {
    icon: <Film className="w-4 h-4" />,
    label: 'Video Assets',
    concepts: [
      { title: 'Product Teaser (12s)', desc: 'Dynamic logo reveal with particle effects and feature showcase', prompt: 'Short product teaser video with logo animation and feature highlights' },
      { title: 'Before vs After (15s)', desc: 'Split screen comparison with clean UI reveal', prompt: 'Split-screen comparison video showing transformation' },
      { title: 'Quick Tips Reel (14s)', desc: 'Hook + 3 tips with motion graphics and CTA', prompt: 'Short-form tips reel with motion graphics and text overlays' },
    ],
  },
  animation: {
    icon: <Palette className="w-4 h-4" />,
    label: 'Animations',
    concepts: [
      { title: 'Logo Animation (5s)', desc: 'Logo assembles from particles with gradient glow', prompt: 'Animated logo reveal with particle effects and brand glow' },
      { title: 'Data Visualization (10s)', desc: 'Animated charts with counting numbers', prompt: 'Animated bar chart with counting metrics and brand colors' },
      { title: 'Feature Walkthrough (15s)', desc: 'Screen recording style with highlighted interactions', prompt: 'UI walkthrough animation with cursor and tooltip highlights' },
    ],
  },
  voiceover: {
    icon: <Mic className="w-4 h-4" />,
    label: 'Voice Overs',
    concepts: [
      { title: 'Product Intro (12s)', desc: 'Professional, warm, confident voice introduction', prompt: 'Professional warm voiceover for product introduction' },
      { title: 'Feature Highlight (10s)', desc: 'Energetic, conversational feature showcase', prompt: 'Energetic conversational voiceover for feature demo' },
      { title: 'Testimonial Overlay (15s)', desc: 'Authentic, relatable customer testimonial', prompt: 'Authentic customer testimonial voiceover' },
    ],
  },
  music: {
    icon: <Music className="w-4 h-4" />,
    label: 'Music & Audio',
    concepts: [
      { title: 'Upbeat Corporate', desc: '120 BPM — Piano, percussion, synth pads', prompt: 'Upbeat corporate background music 120 BPM' },
      { title: 'Inspiring Tech', desc: '110 BPM — Electronic beats, ambient textures', prompt: 'Inspiring tech ambient background music 110 BPM' },
      { title: 'Social Energy', desc: '130 BPM — Trap beats, bass drops, vocal chops', prompt: 'Energetic social media background music 130 BPM' },
    ],
  },
};

const actionIconMap: Record<string, React.ReactNode> = {
  'image-creation': <Image className="w-5 h-5" />,
  'video-creation': <Film className="w-5 h-5" />,
  animation: <Palette className="w-5 h-5" />,
  voiceover: <Mic className="w-5 h-5" />,
  music: <Music className="w-5 h-5" />,
};

export function CreateContentWizard({ projectId, projectName, projectDescription, onClose }: CreateContentWizardProps) {
  const [step, setStep] = useState<WizardStep>('channel');
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedToBoard, setSavedToBoard] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [assetPrompts, setAssetPrompts] = useState<Record<string, string>>({});
  const [reviewCaptions, setReviewCaptions] = useState<Record<string, string>>({});
  const [reviewRefineInput, setReviewRefineInput] = useState('');
  const [reviewRefineMessages, setReviewRefineMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [refiningPlatform, setRefiningPlatform] = useState<string | null>(null);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  // Undo stack: per-platform array of previous caption values (max 5 deep)
  const [captionUndoStack, setCaptionUndoStack] = useState<Record<string, string[]>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { addCards } = useContent();
  const { user } = useAuth();

  // ── Save to Board: parse AI content into content cards ──
  const handleSaveToBoard = useCallback(() => {
    if (savedToBoard || !user) return;

    const userName = `${user.firstName} ${user.lastName}`;
    const userEmail = user.email;
    const now = new Date();
    const newCards: ContentCard[] = [];

    // Create one card per selected platform, extracting content from AI messages
    const aiMessages = messages.filter(m => m.role === 'assistant');
    const combinedContent = aiMessages.map(m => m.content).join('\n');

    // Extract captions from blockquotes (> ...) in the AI output
    const captionMatches = combinedContent.match(/^>\s*.+$/gm);
    const extractedCaption = captionMatches
      ? captionMatches.map(l => l.replace(/^>\s*/, '')).join('\n')
      : '';

    // Extract hashtags
    const hashtagMatches = combinedContent.match(/#(\w+)/g);
    const hashtags = hashtagMatches
      ? [...new Set(hashtagMatches.map(h => h.replace('#', '')))]
      : [];

    // Determine action-based title suffix
    const actionTitles: Record<string, string> = {
      calendar: 'Content Calendar',
      'content-plan': 'Content Plan',
      copywriting: 'Copywriting',
      'image-creation': 'Image Concepts',
      'video-creation': 'Video Scripts',
      voiceover: 'Voice Over Scripts',
      animation: 'Animation Concepts',
      music: 'Music & Audio',
      research: 'Research & Trends',
    };

    const actionLabel = selectedActions
      .map(a => actionTitles[a] || a)
      .slice(0, 2)
      .join(' + ');

    selectedPlatforms.forEach((platformId) => {
      const platformName = socialPlatforms.find(p => p.id === platformId)?.name || platformId;

      // Prefer user-edited caption from Step 6, fall back to AI extraction
      let caption = reviewCaptions[platformId]?.trim() || '';
      if (!caption) {
        const platformSection = combinedContent
          .split(new RegExp(`### ${platformName}`, 'i'));
        caption = extractedCaption;
        if (platformSection.length > 1) {
          const sectionText = platformSection[1].split(/###\s/)[0];
          const sectionCaptions = sectionText.match(/^>\s*.+$/gm);
          if (sectionCaptions && sectionCaptions.length > 0) {
            caption = sectionCaptions.map(l => l.replace(/^>\s*/, '')).join('\n');
          }
        }
      }

      // Extract hashtags from the caption itself as well
      const captionHashtags = caption.match(/#(\w+)/g);
      const mergedHashtags = [
        ...hashtags,
        ...(captionHashtags ? captionHashtags.map(h => h.replace('#', '')) : []),
      ];
      const uniqueHashtags = [...new Set(mergedHashtags)].slice(0, 15);

      const card: ContentCard = {
        id: createCardId(),
        projectId,
        platform: platformId,
        channel: selectedChannel || 'social-media',
        title: `${platformName} — ${actionLabel}`,
        caption: caption || `AI-generated ${actionLabel.toLowerCase()} for ${projectName} on ${platformName}.`,
        hashtags: uniqueHashtags,
        status: 'draft',
        approvers: [],
        createdBy: userName,
        createdByEmail: userEmail,
        createdAt: now,
        auditLog: [{
          id: `audit_wizard_${Date.now()}_${platformId}`,
          action: 'created',
          performedBy: userName,
          performedByEmail: userEmail,
          timestamp: now,
          details: `Created via AI Content Studio wizard — ${actionLabel} for ${platformName}`,
        }],
      };

      newCards.push(card);
    });

    if (newCards.length > 0) {
      addCards(newCards);
      setSavedToBoard(true);

      toast.success(`${newCards.length} content card${newCards.length !== 1 ? 's' : ''} saved to board`, {
        description: `Created as drafts for ${selectedPlatforms.length} platform${selectedPlatforms.length !== 1 ? 's' : ''}`,
        icon: '🎉',
        duration: 5000,
      });
    }
  }, [savedToBoard, user, messages, selectedPlatforms, selectedActions, selectedChannel, projectId, projectName, addCards, reviewCaptions]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when entering chat step
  useEffect(() => {
    if (step === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
    // Auto-expand first platform in review step
    if (step === 'review' && selectedPlatforms.length > 0 && !expandedPlatform) {
      setExpandedPlatform(selectedPlatforms[0]);
    }
  }, [step]);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleAction = (id: string) => {
    setSelectedActions(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const getContentRequest = useCallback((): ContentRequest => ({
    projectName,
    projectDescription,
    channel: selectedChannel || 'social-media',
    platforms: selectedPlatforms,
    actions: selectedActions,
  }), [projectName, projectDescription, selectedChannel, selectedPlatforms, selectedActions]);

  const startAIChat = useCallback(() => {
    setStep('chat');
    setIsGenerating(true);

    const systemMsg: AIMessage = {
      id: createMessageId(),
      role: 'system',
      content: `🤖 AI Content Studio initialized for **${projectName}**. Generating your content...`,
      timestamp: new Date(),
    };
    setMessages([systemMsg]);

    // Simulate AI thinking delay
    setTimeout(() => {
      const request = getContentRequest();
      const response = generateInitialResponse(request);
      const aiMsg: AIMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsGenerating(false);
    }, 2000);
  }, [projectName, getContentRequest]);

  const sendMessage = () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMsg: AIMessage = {
      id: createMessageId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsGenerating(true);

    // Simulate AI response delay
    setTimeout(() => {
      const request = getContentRequest();
      const response = generateChatResponse(userMsg.content, request);
      const aiMsg: AIMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsGenerating(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetWizard = () => {
    setStep('channel');
    setSelectedChannel(null);
    setSelectedPlatforms([]);
    setSelectedActions([]);
    setMessages([]);
    setIsGenerating(false);
    setInputValue('');
    setSavedToBoard(false);
    setGeneratedAssets([]);
    setAssetPrompts({});
    setReviewCaptions({});
    setReviewRefineInput('');
    setReviewRefineMessages([]);
  };

  const copyContent = (content: string, msgId: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 'channel': return selectedChannel !== null;
      case 'platforms': return selectedPlatforms.length > 0;
      case 'actions': return selectedActions.length > 0;
      default: return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;
    switch (step) {
      case 'channel':
        if (selectedChannel === 'social-media') setStep('platforms');
        break;
      case 'platforms':
        setStep('actions');
        break;
      case 'actions':
        startAIChat();
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'platforms': setStep('channel'); break;
      case 'actions': setStep('platforms'); break;
      case 'chat': setStep('actions'); setMessages([]); break;
    }
  };

  const stepNumber = step === 'channel' ? 1 : step === 'platforms' ? 2 : step === 'actions' ? 3 : step === 'chat' ? 4 : step === 'assets' ? 5 : 6;

  // ── Asset generation helpers ──
  const creationActions = selectedActions.filter(a => actionAssetMeta[a]);

  // Build a context-rich DALL-E prompt from project info
  const buildEnrichedPrompt = useCallback((basePrompt: string): string => {
    const platformList = selectedPlatforms
      .map(id => socialPlatforms.find(p => p.id === id)?.name || id)
      .join(', ');
    const channelLabel = marketingChannels.find(c => c.id === selectedChannel)?.name || 'Social Media';
    return [
      basePrompt,
      `for "${projectName}"`,
      projectDescription ? `— ${projectDescription.slice(0, 120)}` : '',
      `(${channelLabel} · ${platformList})`,
      'Professional quality, modern design, clean composition, high contrast, no text overlay unless specified.',
    ].filter(Boolean).join(' ');
  }, [projectName, projectDescription, selectedPlatforms, selectedChannel]);

  const initializeAssets = useCallback(() => {
    const assets: GeneratedAsset[] = [];
    let imgIdx = 0;
    creationActions.forEach(actionId => {
      const meta = actionAssetMeta[actionId];
      if (!meta) return;
      meta.concepts.forEach(concept => {
        assets.push({
          id: `asset_${actionId}_${concept.title.replace(/\s/g, '_')}_${Date.now()}`,
          actionId,
          title: concept.title,
          description: concept.desc,
          imageUrl: assetPlaceholderImages[imgIdx % assetPlaceholderImages.length],
          status: 'pending',
          prompt: buildEnrichedPrompt(concept.prompt),
        });
        imgIdx++;
      });
    });
    setGeneratedAssets(assets);
  }, [creationActions, buildEnrichedPrompt]);

  const generateSingleAsset = useCallback(async (assetId: string) => {
    setGeneratedAssets(prev => prev.map(a =>
      a.id === assetId ? { ...a, status: 'generating' as const } : a
    ));

    // Find the asset to get its prompt
    const asset = generatedAssets.find(a => a.id === assetId);
    const customPrompt = assetPrompts[assetId];
    // If user typed a custom prompt, enrich it; otherwise use the pre-enriched one
    const prompt = customPrompt
      ? buildEnrichedPrompt(customPrompt)
      : asset?.prompt || buildEnrichedPrompt('Professional marketing visual');

    try {
      // Try real DALL-E generation
      const result = await generateImage({
        prompt,
        size: '1024x1024',
        quality: 'standard',
        assetId: assetId.slice(0, 20),
        projectName,
      });

      if (result.success && result.imageUrl) {
        setGeneratedAssets(prev => prev.map(a =>
          a.id === assetId ? { ...a, status: 'generated' as const, imageUrl: result.imageUrl } : a
        ));
        return;
      }
    } catch (err) {
      console.log('[CreateContentWizard] DALL-E fallback to placeholder:', err);
      toast.error('AI image generation unavailable — using placeholder', {
        description: 'Configure OPENAI_API_KEY and redeploy the edge function to enable DALL-E 3.',
        duration: 6000,
      });
    }

    // Fallback to placeholder after delay (if DALL-E fails or is not configured)
    setTimeout(() => {
      setGeneratedAssets(prev => prev.map(a =>
        a.id === assetId ? { ...a, status: 'generated' as const } : a
      ));
    }, 1500);
  }, [generatedAssets, assetPrompts, projectName, buildEnrichedPrompt]);

  const generateAllAssets = useCallback(() => {
    const pending = generatedAssets.filter(a => a.status === 'pending');
    pending.forEach((asset, i) => {
      setTimeout(() => { generateSingleAsset(asset.id); }, i * 1200);
    });
  }, [generatedAssets, generateSingleAsset]);

  const regenerateAsset = useCallback(async (assetId: string) => {
    const asset = generatedAssets.find(a => a.id === assetId);
    const customPrompt = assetPrompts[assetId];
    const prompt = customPrompt
      ? buildEnrichedPrompt(customPrompt)
      : asset?.prompt || buildEnrichedPrompt('Professional marketing visual');

    setGeneratedAssets(prev => prev.map(a =>
      a.id === assetId ? {
        ...a,
        status: 'generating' as const,
        prompt: customPrompt || a.prompt,
      } : a
    ));

    try {
      const result = await generateImage({
        prompt,
        size: '1024x1024',
        quality: 'standard',
        assetId: assetId.slice(0, 20),
        projectName,
      });

      if (result.success && result.imageUrl) {
        setGeneratedAssets(prev => prev.map(a =>
          a.id === assetId ? { ...a, status: 'generated' as const, imageUrl: result.imageUrl } : a
        ));
        return;
      }
    } catch (err) {
      console.log('[CreateContentWizard] DALL-E regenerate fallback:', err);
      toast.error('AI image generation unavailable — using placeholder', {
        description: 'Configure OPENAI_API_KEY and redeploy the edge function to enable DALL-E 3.',
        duration: 6000,
      });
    }

    // Fallback
    setTimeout(() => {
      setGeneratedAssets(prev => prev.map(a =>
        a.id === assetId ? {
          ...a,
          status: 'generated' as const,
          imageUrl: assetPlaceholderImages[Math.floor(Math.random() * assetPlaceholderImages.length)],
        } : a
      ));
    }, 1500);
  }, [generatedAssets, assetPrompts, projectName, buildEnrichedPrompt]);

  const allAssetsGenerated = generatedAssets.length > 0 && generatedAssets.every(a => a.status === 'generated');

  // ── Undo helpers (must be defined before sendRefineMessage which references them) ──
  const pushUndo = useCallback((platformId: string, previousValue: string) => {
    setCaptionUndoStack(prev => ({
      ...prev,
      [platformId]: [...(prev[platformId] || []).slice(-4), previousValue],
    }));
  }, []);

  const undoCaption = useCallback((platformId: string) => {
    const stack = captionUndoStack[platformId];
    if (!stack || stack.length === 0) return;
    const previous = stack[stack.length - 1];
    setCaptionUndoStack(prev => ({
      ...prev,
      [platformId]: (prev[platformId] || []).slice(0, -1),
    }));
    setReviewCaptions(prev => ({ ...prev, [platformId]: previous }));
    toast('Undo applied', { duration: 2000 });
  }, [captionUndoStack]);

  // ── Review refinement ──
  const sendRefineMessage = useCallback(async () => {
    if (!reviewRefineInput.trim() || isRefining) return;
    const userText = reviewRefineInput.trim();
    setReviewRefineMessages(prev => [...prev, { role: 'user', text: userText }]);
    setReviewRefineInput('');
    setIsRefining(true);

    // Get combined AI content for context
    const aiMessages = messages.filter(m => m.role === 'assistant');
    const combinedContent = aiMessages.map(m => m.content).join('\n');
    const platformNames = selectedPlatforms.map(id => socialPlatforms.find(p => p.id === id)?.name || id);

    try {
      const result = await refineContent({
        instruction: userText,
        currentContent: combinedContent.slice(0, 1000),
        captions: reviewCaptions,
        platforms: platformNames,
        projectName,
      });

      if (result.success && result.output) {
        setReviewRefineMessages(prev => [...prev, { role: 'ai', text: result.output }]);

        // Try to auto-apply: check if the AI response contains platform-keyed captions
        // Pattern: "**Instagram:** new caption" or "Instagram: new caption"
        let appliedCount = 0;
        for (const pid of selectedPlatforms) {
          const pName = socialPlatforms.find(p => p.id === pid)?.name;
          if (!pName) continue;
          // Match "**PlatformName:** caption" or "PlatformName: caption"
          const regex = new RegExp(`\\*?\\*?${pName}\\*?\\*?:\\s*["']?(.+?)["']?(?=\\n\\*?\\*?\\w|$)`, 'is');
          const match = result.output.match(regex);
          if (match && match[1]?.trim()) {
            const newCaption = match[1].trim().replace(/^["']|["']$/g, '');
            const currentCaption = reviewCaptions[pid] || '';
            if (currentCaption) pushUndo(pid, currentCaption);
            setReviewCaptions(prev => ({ ...prev, [pid]: newCaption }));
            appliedCount++;
          }
        }

        if (appliedCount > 0) {
          toast.success(`AI applied changes to ${appliedCount} platform caption${appliedCount > 1 ? 's' : ''}`, {
            description: 'Use ↩ Undo if you want to revert.',
            duration: 4000,
          });
        }

        setIsRefining(false);
        return;
      }
    } catch (err) {
      console.log('[CreateContentWizard] refine-content fallback:', err);
    }

    // Fallback to mock response
    setTimeout(() => {
      const responses = [
        `Got it! I've noted your changes to the ${projectName} content. The adjustments will be reflected in the final draft cards.`,
        `Updated! The content for ${projectName} has been refined based on your feedback. Everything looks good for submission.`,
        `Changes applied! I've fine-tuned the assets and copy for ${projectName}. Ready to submit as draft whenever you are.`,
      ];
      setReviewRefineMessages(prev => [...prev, { role: 'ai', text: responses[Math.floor(Math.random() * responses.length)] }]);
      setIsRefining(false);
    }, 1000);
  }, [reviewRefineInput, isRefining, projectName, messages, selectedPlatforms, reviewCaptions, pushUndo]);

  // Platform character limits for caption counter
  const platformCharLimits: Record<string, number> = {
    instagram: 2200, facebook: 63206, twitter: 280, linkedin: 3000,
    tiktok: 2200, youtube: 5000, pinterest: 500, snapchat: 250,
    threads: 500, reddit: 40000, whatsapp: 1024, telegram: 4096,
  };

  // AI Quick Action on a per-platform caption
  const quickRefineCaption = useCallback(async (platformId: string, actionLabel: string) => {
    const platform = socialPlatforms.find(p => p.id === platformId);
    if (!platform) return;

    const currentCaption = reviewCaptions[platformId] || '';
    if (!currentCaption.trim()) {
      toast.error('Write or generate a caption first before refining it.');
      return;
    }

    // Save current caption for undo before any modification
    pushUndo(platformId, currentCaption);
    setRefiningPlatform(platformId);

    const instructionMap: Record<string, string> = {
      'Shorten':        `Shorten this ${platform.name} caption to be more concise while keeping the core message. Keep hashtags. Return ONLY the rewritten caption, no commentary.`,
      'More Casual':    `Rewrite this ${platform.name} caption in a more casual, friendly, conversational tone. Keep hashtags. Return ONLY the rewritten caption.`,
      'More Professional': `Rewrite this ${platform.name} caption in a more professional, authoritative tone suitable for B2B audiences. Keep hashtags. Return ONLY the rewritten caption.`,
      'Add Hashtags':   `Add 5-8 relevant, trending hashtags to this ${platform.name} caption. Keep the existing text. Return ONLY the caption with hashtags added at the end.`,
      'Add CTA':        `Add a compelling call-to-action to this ${platform.name} caption. Make it action-oriented and platform-appropriate. Return ONLY the rewritten caption.`,
      'Emoji Boost':    `Add relevant emojis throughout this ${platform.name} caption to make it more engaging and visually appealing. Return ONLY the rewritten caption.`,
    };

    const instruction = instructionMap[actionLabel] || `${actionLabel} for this ${platform.name} caption. Return ONLY the rewritten caption.`;

    try {
      const result = await refineContent({
        instruction,
        currentContent: currentCaption,
        platforms: [platform.name],
        projectName,
      });

      if (result.success && result.output) {
        // Auto-apply the refined text directly into the caption field
        const cleaned = result.output.replace(/^["']|["']$/g, '').trim();
        setReviewCaptions(prev => ({ ...prev, [platformId]: cleaned }));
        toast.success(`${actionLabel} applied to ${platform.name} caption`);
        setRefiningPlatform(null);
        return;
      }
    } catch (err) {
      console.log(`[CreateContentWizard] quick-refine ${actionLabel} fallback:`, err);
    }

    // Fallback: simple local transformations
    setTimeout(() => {
      let refined = currentCaption;
      if (actionLabel === 'Shorten') refined = currentCaption.split('.').slice(0, 2).join('.') + '.';
      if (actionLabel === 'Add Hashtags') refined += '\n\n#Marketing #Growth #Brand #Digital #Strategy #ContentCreation';
      if (actionLabel === 'Add CTA') refined += '\n\n👉 Try it today — link in bio!';
      if (actionLabel === 'Emoji Boost') refined = '🚀 ' + currentCaption + ' ✨';
      setReviewCaptions(prev => ({ ...prev, [platformId]: refined }));
      setRefiningPlatform(null);
      toast.success(`${actionLabel} applied (offline mode)`);
    }, 800);
  }, [reviewCaptions, projectName, pushUndo]);

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('### ')) return <h4 key={i} className="text-white font-semibold mt-4 mb-2 text-sm">{renderInline(line.slice(4))}</h4>;
      if (line.startsWith('## ')) return <h3 key={i} className="text-white font-bold mt-5 mb-2">{renderInline(line.slice(3))}</h3>;
      if (line.startsWith('# ')) return <h2 key={i} className="text-white font-bold mt-4 mb-3 text-lg">{renderInline(line.slice(2))}</h2>;

      // Horizontal rule
      if (line.trim() === '---') return <hr key={i} className="border-white/15 my-4" />;

      // Table rows
      if (line.includes('|') && line.trim().startsWith('|')) {
        const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
        if (cells.every(c => /^[-:]+$/.test(c))) return null; // separator
        const isHeader = i > 0 && lines[i + 1]?.includes('---');
        return (
          <div key={i} className={`flex gap-2 text-xs py-1.5 px-2 ${isHeader ? 'font-semibold text-white border-b border-white/20' : 'text-white/70'} ${i % 2 === 0 ? 'bg-white/5 rounded' : ''}`}>
            {cells.map((cell, j) => <span key={j} className="flex-1 min-w-0 truncate">{cell}</span>)}
          </div>
        );
      }

      // Code blocks
      if (line.trim() === '```') return null;
      if (line.startsWith('[') && line.endsWith(']')) {
        return <div key={i} className="text-teal-300/80 text-xs font-mono pl-4 py-0.5">{line}</div>;
      }

      // Blockquotes
      if (line.startsWith('> ')) return <blockquote key={i} className="border-l-2 border-teal-400/40 pl-3 text-white/70 text-sm my-1 italic">{renderInline(line.slice(2))}</blockquote>;
      if (line.startsWith('>')) return <blockquote key={i} className="border-l-2 border-teal-400/40 pl-3 text-white/70 text-sm my-0.5 italic">{renderInline(line.slice(1))}</blockquote>;

      // List items
      if (line.match(/^[-•]\s/)) return <div key={i} className="text-white/80 text-sm pl-4 py-0.5 flex gap-2"><span className="text-teal-400">•</span><span>{renderInline(line.slice(2))}</span></div>;
      if (line.match(/^\d+\.\s/)) {
        const num = line.match(/^(\d+)\./)?.[1];
        return <div key={i} className="text-white/80 text-sm pl-4 py-0.5 flex gap-2"><span className="text-teal-400 font-semibold min-w-[1rem]">{num}.</span><span>{renderInline(line.replace(/^\d+\.\s/, ''))}</span></div>;
      }

      // Empty lines
      if (!line.trim()) return <div key={i} className="h-2" />;

      // Regular text
      return <p key={i} className="text-white/80 text-sm">{renderInline(line)}</p>;
    });
  };

  const renderInline = (text: string) => {
    // Bold + italic, bold, italic, code
    const parts = text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('***') && part.endsWith('***')) return <strong key={i} className="text-white italic">{part.slice(3, -3)}</strong>;
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="text-white">{part.slice(2, -2)}</strong>;
      if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="text-white/90">{part.slice(1, -1)}</em>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-white/10 px-1.5 py-0.5 rounded text-teal-300 text-xs">{part.slice(1, -1)}</code>;
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className={`bg-gradient-to-br from-gray-900/95 via-purple-900/90 to-gray-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl w-full overflow-hidden flex flex-col fold-modal-safe ${
          step === 'chat' || step === 'assets' || step === 'review' ? 'max-w-5xl h-[95vh] sm:h-[90vh]' : 'max-w-4xl max-h-[95vh] sm:max-h-[90vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-teal-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold">AI Content Studio</h2>
              <p className="text-white/50 text-xs">{projectName}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Step indicators — mobile compact */}
            {!['chat', 'assets', 'review'].includes(step) && (
              <span className="sm:hidden text-white/50 text-xs font-medium">
                Step {stepNumber}/6
              </span>
            )}
            {/* Step indicators — desktop */}
            {!['chat', 'assets', 'review'].includes(step) && (
              <div className="hidden sm:flex items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6].map(s => (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all ${
                      s < stepNumber ? 'bg-teal-500 text-white' :
                      s === stepNumber ? 'bg-white/20 text-white border border-white/40' :
                      'bg-white/5 text-white/30 border border-white/10'
                    }`}>
                      {s < stepNumber ? <Check className="w-3 h-3" /> : s}
                    </div>
                    {s < 6 && <div className={`w-4 h-0.5 ${s < stepNumber ? 'bg-teal-500' : 'bg-white/10'}`} />}
                  </div>
                ))}
              </div>
            )}

            {/* Step indicators for later steps */}
            {(step === 'assets' || step === 'review') && (
              <>
                <span className="sm:hidden text-white/50 text-xs font-medium">
                  Step {stepNumber}/6
                </span>
                <div className="hidden sm:flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map(s => (
                    <div key={s} className="flex items-center gap-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all ${
                        s < stepNumber ? 'bg-teal-500 text-white' :
                        s === stepNumber ? 'bg-white/20 text-white border border-white/40' :
                        'bg-white/5 text-white/30 border border-white/10'
                      }`}>
                        {s < stepNumber ? <Check className="w-3 h-3" /> : s}
                      </div>
                      {s < 6 && <div className={`w-4 h-0.5 ${s < stepNumber ? 'bg-teal-500' : 'bg-white/10'}`} />}
                    </div>
                  ))}
                </div>
              </>
            )}

            {step === 'chat' && (
              <button
                onClick={resetWizard}
                className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                New Session
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <AnimatePresence mode="wait">
            {/* Step 1: Channel Selection */}
            {step === 'channel' && (
              <motion.div
                key="channel"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">Select Marketing Channel</h3>
                  <p className="text-white/50 text-sm">Choose the digital marketing channel you want to create content for</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
                  {marketingChannels.map((channel) => (
                    <ChannelCard
                      key={channel.id}
                      channel={channel}
                      selected={selectedChannel === channel.id}
                      onSelect={() => channel.active ? setSelectedChannel(channel.id) : undefined}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Platform Selection */}
            {step === 'platforms' && (
              <motion.div
                key="platforms"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">Select Social Media Platforms</h3>
                  <p className="text-white/50 text-sm">Choose one or more platforms to target (multi-select)</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-3xl mx-auto">
                  {socialPlatforms.map((platform) => {
                    const isSelected = selectedPlatforms.includes(platform.id);
                    return (
                      <motion.button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                          isSelected
                            ? 'bg-white/15 border-teal-400/60 shadow-lg shadow-teal-500/10'
                            : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/8'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="text-2xl mb-2"><PlatformIcon platformId={platform.id} className={`w-7 h-7 ${platformBrandColors[platform.id] || 'text-white'}`} /></div>
                        <div className="text-white font-semibold text-sm">{platform.name}</div>
                      </motion.button>
                    );
                  })}
                </div>

                {selectedPlatforms.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mt-4"
                  >
                    <span className="text-teal-300 text-sm font-medium">{selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected</span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 3: Action Selection */}
            {step === 'actions' && (
              <motion.div
                key="actions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6"
              >
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-white mb-2">Select Content Actions</h3>
                  <p className="text-white/50 text-sm">Choose what you want the AI to create (multi-select)</p>
                </div>

                <div className="max-w-3xl mx-auto space-y-4">
                  {/* Planning */}
                  <div>
                    <h4 className="text-white/60 text-xs uppercase tracking-wider mb-2 px-1">📊 Planning & Strategy</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {contentActions.filter(a => a.category === 'planning').map(action => {
                        const isSelected = selectedActions.includes(action.id);
                        return (
                          <motion.button
                            key={action.id}
                            onClick={() => toggleAction(action.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                              isSelected
                                ? 'bg-white/15 border-teal-400/60 shadow-lg shadow-teal-500/10'
                                : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/8'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-3 right-3 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <div className="flex items-start gap-3">
                              <span className="text-xl">{action.icon}</span>
                              <div className="pr-6">
                                <div className="text-white font-semibold text-sm">{action.name}</div>
                                <div className="text-white/50 text-xs mt-1 leading-relaxed">{action.description}</div>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Creation */}
                  <div>
                    <h4 className="text-white/60 text-xs uppercase tracking-wider mb-2 px-1">🎨 Content Creation</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {contentActions.filter(a => a.category === 'creation').map(action => {
                        const isSelected = selectedActions.includes(action.id);
                        return (
                          <motion.button
                            key={action.id}
                            onClick={() => toggleAction(action.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                              isSelected
                                ? 'bg-white/15 border-teal-400/60 shadow-lg shadow-teal-500/10'
                                : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/8'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-3 right-3 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <div className="flex items-start gap-3">
                              <span className="text-xl">{action.icon}</span>
                              <div className="pr-6">
                                <div className="text-white font-semibold text-sm">{action.name}</div>
                                <div className="text-white/50 text-xs mt-1 leading-relaxed">{action.description}</div>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {selectedActions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mt-4"
                  >
                    <span className="text-teal-300 text-sm font-medium">{selectedActions.length} action{selectedActions.length !== 1 ? 's' : ''} selected</span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 4: AI Chat */}
            {step === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col h-full"
              >
                {/* Chat summary bar */}
                <div className="px-5 py-3 bg-white/5 border-b border-white/10 flex flex-wrap gap-2 text-xs shrink-0">
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-400/30 px-2 py-1 rounded-full">
                    📱 Social Media
                  </span>
                  {selectedPlatforms.slice(0, 4).map(id => {
                    const p = socialPlatforms.find(sp => sp.id === id);
                    return p ? (
                      <span key={id} className="bg-white/10 text-white/70 border border-white/15 px-2 py-1 rounded-full inline-flex items-center gap-1.5">
                        <PlatformIcon platformId={id} className={`w-3.5 h-3.5 ${platformBrandColors[id] || 'text-white'}`} /> {p.name}
                      </span>
                    ) : null;
                  })}
                  {selectedPlatforms.length > 4 && (
                    <span className="bg-white/10 text-white/50 border border-white/15 px-2 py-1 rounded-full">
                      +{selectedPlatforms.length - 4} more
                    </span>
                  )}
                  <span className="bg-teal-500/20 text-teal-300 border border-teal-400/30 px-2 py-1 rounded-full">
                    <Zap className="w-3 h-3 inline mr-1" />
                    {selectedActions.length} action{selectedActions.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
                  {messages.map(msg => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                    >
                      {msg.role !== 'user' && (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          msg.role === 'system' ? 'bg-purple-500/20 border border-purple-400/30' : 'bg-teal-500/20 border border-teal-400/30'
                        }`}>
                          <Bot className={`w-4 h-4 ${msg.role === 'system' ? 'text-purple-300' : 'text-teal-300'}`} />
                        </div>
                      )}

                      <div className={`max-w-[80%] ${msg.role === 'user' ? '' : ''}`}>
                        <div className={`rounded-2xl p-4 ${
                          msg.role === 'user'
                            ? 'bg-teal-500/20 border border-teal-400/30 text-white'
                            : msg.role === 'system'
                            ? 'bg-purple-500/10 border border-purple-400/20'
                            : 'bg-white/5 border border-white/10'
                        }`}>
                          {msg.role === 'user' ? (
                            <p className="text-sm">{msg.content}</p>
                          ) : (
                            <div className="space-y-0">{renderContent(msg.content)}</div>
                          )}
                        </div>

                        {/* Copy button for AI messages */}
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-2 mt-1.5 ml-2">
                            <button
                              onClick={() => copyContent(msg.content, msg.id)}
                              className="flex items-center gap-1 text-white/30 hover:text-white/60 text-xs transition-colors"
                            >
                              {copiedId === msg.id ? (
                                <><CheckCircle className="w-3 h-3 text-teal-400" /> <span className="text-teal-400">Copied!</span></>
                              ) : (
                                <><Copy className="w-3 h-3" /> Copy</>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  {isGenerating && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-teal-300" />
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                        <span className="text-white/50 text-sm">AI is generating content...</span>
                      </div>
                    </motion.div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="px-5 py-4 border-t border-white/10 bg-white/5 shrink-0">
                  {/* Continue to Asset Generation */}
                  {messages.some(m => m.role === 'assistant') && !isGenerating && creationActions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-3"
                    >
                      <motion.button
                        onClick={() => { initializeAssets(); setStep('assets'); }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-teal-500 to-purple-600 text-white shadow-lg hover:shadow-teal-500/20 border border-transparent"
                      >
                        <Wand2 className="w-4 h-4" />
                        Continue to Asset Generation ({creationActions.length} asset type{creationActions.length !== 1 ? 's' : ''})
                      </motion.button>
                    </motion.div>
                  )}
                  {/* Skip to review if no creation actions */}
                  {messages.some(m => m.role === 'assistant') && !isGenerating && creationActions.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-3"
                    >
                      <motion.button
                        onClick={() => setStep('review')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-teal-500 to-purple-600 text-white shadow-lg hover:shadow-teal-500/20 border border-transparent"
                      >
                        <Eye className="w-4 h-4" />
                        Continue to Review & Submit
                      </motion.button>
                    </motion.div>
                  )}

                  <div className="flex gap-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask AI to modify, expand, or create new content..."
                      disabled={isGenerating}
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-teal-400/50 transition-all disabled:opacity-50 text-sm"
                    />
                    <motion.button
                      onClick={sendMessage}
                      disabled={!inputValue.trim() || isGenerating}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-12 h-12 bg-gradient-to-br from-teal-500 to-purple-600 rounded-xl flex items-center justify-center text-white disabled:opacity-30 transition-all shadow-lg"
                    >
                      <Send className="w-5 h-5" />
                    </motion.button>
                  </div>
                  <p className="text-white/30 text-xs mt-2 text-center">
                    AI-generated content is for reference. Always review and customize before publishing.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 5: Asset Generation */}
            {step === 'assets' && (
              <motion.div
                key="assets"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                {/* Header bar */}
                <div className="px-5 py-4 bg-white/5 border-b border-white/10 shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-purple-400" />
                        AI Asset Generation
                      </h3>
                      <p className="text-white/50 text-xs mt-1">
                        Generate digital assets based on your content selections — {generatedAssets.length} assets across {creationActions.length} type{creationActions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={generateAllAssets}
                        disabled={generatedAssets.every(a => a.status !== 'pending')}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-500 to-teal-500 text-white shadow-lg disabled:opacity-30 transition-all"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span className="hidden sm:inline">Generate All</span>
                      </motion.button>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-teal-500 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${generatedAssets.length > 0 ? (generatedAssets.filter(a => a.status === 'generated').length / generatedAssets.length) * 100 : 0}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-white/40 text-[10px]">
                      {generatedAssets.filter(a => a.status === 'generated').length}/{generatedAssets.length} generated
                    </span>
                    {generatedAssets.some(a => a.status === 'generating') && (
                      <span className="text-teal-300 text-[10px] flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Generating...
                      </span>
                    )}
                  </div>
                </div>

                {/* Asset Grid */}
                <div className="flex-1 overflow-y-auto p-5 min-h-0">
                  <div className="space-y-6">
                    {creationActions.map(actionId => {
                      const meta = actionAssetMeta[actionId];
                      if (!meta) return null;
                      const actionAssets = generatedAssets.filter(a => a.actionId === actionId);
                      return (
                        <div key={actionId}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-teal-300">
                              {actionIconMap[actionId] || <Sparkles className="w-5 h-5" />}
                            </div>
                            <div>
                              <h4 className="text-white font-semibold text-sm">{meta.label}</h4>
                              <p className="text-white/40 text-[10px]">{actionAssets.length} asset{actionAssets.length !== 1 ? 's' : ''}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {actionAssets.map(asset => (
                              <motion.div
                                key={asset.id}
                                layout
                                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group hover:border-white/20 transition-all"
                              >
                                {/* Asset preview */}
                                <div className="relative aspect-[4/3] bg-black/30 overflow-hidden">
                                  {asset.status === 'pending' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                                        {actionIconMap[actionId] || <Image className="w-6 h-6" />}
                                      </div>
                                      <span className="text-white/30 text-xs">Ready to generate</span>
                                      <motion.button
                                        onClick={() => generateSingleAsset(asset.id)}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/80 to-teal-500/80 text-white text-xs font-medium mt-1"
                                      >
                                        <Sparkles className="w-3 h-3" />
                                        Generate
                                      </motion.button>
                                    </div>
                                  )}
                                  {asset.status === 'generating' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
                                      <div className="relative">
                                        <div className="w-14 h-14 rounded-full border-2 border-transparent border-t-teal-400 border-r-purple-400 animate-spin" />
                                        <Wand2 className="w-5 h-5 text-teal-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                      </div>
                                      <span className="text-white/60 text-xs">AI generating...</span>
                                    </div>
                                  )}
                                  {asset.status === 'generated' && (
                                    <>
                                      <img
                                        src={asset.imageUrl}
                                        alt={asset.title}
                                        className="w-full h-full object-cover"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <motion.button
                                          onClick={() => regenerateAsset(asset.id)}
                                          whileHover={{ scale: 1.1 }}
                                          whileTap={{ scale: 0.9 }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs font-medium"
                                        >
                                          <RefreshCw className="w-3 h-3" />
                                          Regenerate
                                        </motion.button>
                                      </div>
                                      <div className="absolute top-2 right-2">
                                        <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                                          <Check className="w-3 h-3 text-white" />
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                                {/* Asset info */}
                                <div className="p-3 space-y-2">
                                  <h5 className="text-white font-semibold text-xs truncate">{asset.title}</h5>
                                  <p className="text-white/40 text-[10px] line-clamp-2">{asset.description}</p>
                                  {/* Prompt editor — always visible so users can tune before/after */}
                                  {asset.status !== 'generating' && (
                                    <div>
                                      <label className="text-white/30 text-[9px] uppercase tracking-wider font-medium flex items-center gap-1 mb-1">
                                        <Wand2 className="w-2.5 h-2.5" /> Prompt
                                      </label>
                                      <textarea
                                        placeholder={asset.prompt}
                                        value={assetPrompts[asset.id] || ''}
                                        onChange={e => setAssetPrompts(prev => ({ ...prev, [asset.id]: e.target.value }))}
                                        rows={2}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/70 placeholder-white/20 text-[10px] focus:outline-none focus:border-purple-400/40 transition-all resize-none leading-relaxed"
                                      />
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Asset Footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-white/10 bg-white/5 shrink-0">
                  <button
                    onClick={() => setStep('chat')}
                    className="flex items-center gap-2 text-white/60 hover:text-white text-sm px-4 py-2 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Chat
                  </button>
                  <div className="flex items-center gap-2">
                    {/* Skip to Review — available when at least some assets are still pending */}
                    {!allAssetsGenerated && generatedAssets.some(a => a.status === 'generated') && (
                      <button
                        onClick={() => setStep('review')}
                        className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-xs px-3 py-2 rounded-lg hover:bg-white/10 transition-all"
                      >
                        Skip to Review
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <motion.button
                      onClick={() => setStep('review')}
                      disabled={!allAssetsGenerated}
                      whileHover={allAssetsGenerated ? { scale: 1.03 } : {}}
                      whileTap={allAssetsGenerated ? { scale: 0.97 } : {}}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        allAssetsGenerated
                          ? 'bg-gradient-to-r from-teal-500 to-purple-600 text-white shadow-lg shadow-teal-500/20'
                          : 'bg-white/5 text-white/30 cursor-not-allowed'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      Review & Refine
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 6: Review & Refine */}
            {step === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                {/* Review header */}
                <div className="px-5 py-4 bg-white/5 border-b border-white/10 shrink-0">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-teal-400" />
                    Review & Refine
                  </h3>
                  <p className="text-white/50 text-xs mt-1">
                    Edit each caption, use AI quick-actions to refine, then submit — {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Review content */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="p-5 space-y-3">
                    {/* Per-platform accordion cards */}
                    {selectedPlatforms.map(platformId => {
                      const platform = socialPlatforms.find(p => p.id === platformId);
                      if (!platform) return null;
                      const isExpanded = expandedPlatform === platformId;
                      const isThisRefining = refiningPlatform === platformId;

                      // Extract AI-generated preview for this platform
                      const aiMsgs = messages.filter(m => m.role === 'assistant');
                      const combined = aiMsgs.map(m => m.content).join('\n');
                      const platformSect = combined.split(new RegExp(`### ${platform.name}`, 'i'));
                      let preview = '';
                      if (platformSect.length > 1) {
                        preview = platformSect[1].split(/###\s/)[0].trim().slice(0, 300);
                      } else {
                        const caps = combined.match(/^>\s*.+$/gm);
                        preview = caps ? caps.slice(0, 3).map(l => l.replace(/^>\s*/, '')).join(' ') : `AI-generated content for ${platform.name}.`;
                      }

                      // Initialize caption if not yet set
                      const caption = reviewCaptions[platformId] ?? preview.slice(0, 300);
                      const charLimit = platformCharLimits[platformId] || 2200;
                      const charCount = caption.length;
                      const charPct = Math.min((charCount / charLimit) * 100, 100);
                      const isOverLimit = charCount > charLimit;

                      return (
                        <motion.div
                          key={platformId}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                        >
                          {/* Clickable platform header (accordion) */}
                          <button
                            onClick={() => setExpandedPlatform(isExpanded ? null : platformId)}
                            className="flex items-center gap-3 w-full p-3.5 hover:bg-white/3 transition-all text-left"
                          >
                            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                              <PlatformIcon platformId={platformId} className={`w-4 h-4 ${platformBrandColors[platformId]}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-semibold text-sm">{platform.name}</h4>
                              <p className="text-white/35 text-[10px] truncate">
                                {charCount} / {charLimit.toLocaleString()} chars
                                {caption.trim() ? '' : ' · No caption yet'}
                              </p>
                            </div>
                            {isThisRefining && (
                              <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin shrink-0" />
                            )}
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-medium shrink-0">
                              Draft
                            </span>
                            <ChevronDown className={`w-4 h-4 text-white/30 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Expanded content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3.5 pb-4 space-y-3 border-t border-white/5 pt-3">
                                  {/* Editable caption */}
                                  <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <label className="text-white/50 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1.5">
                                        <Edit3 className="w-3 h-3" /> Caption
                                      </label>
                                      {/* Char counter */}
                                      <span className={`text-[10px] font-medium ${isOverLimit ? 'text-red-400' : charPct > 80 ? 'text-amber-400' : 'text-white/30'}`}>
                                        {charCount.toLocaleString()} / {charLimit.toLocaleString()}
                                      </span>
                                    </div>
                                    <textarea
                                      value={caption}
                                      onChange={e => setReviewCaptions(prev => ({ ...prev, [platformId]: e.target.value }))}
                                      rows={4}
                                      className={`w-full bg-white/5 border rounded-lg px-3 py-2.5 text-white/80 placeholder-white/30 text-xs focus:outline-none transition-all resize-none ${isOverLimit ? 'border-red-400/40 focus:border-red-400/60' : 'border-white/15 focus:border-teal-400/40'}`}
                                      placeholder="Write or paste your caption..."
                                    />
                                    {/* Char progress bar */}
                                    <div className="mt-1 bg-white/5 rounded-full h-1 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-red-400' : charPct > 80 ? 'bg-amber-400' : 'bg-teal-400/50'}`}
                                        style={{ width: `${Math.min(charPct, 100)}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* AI Quick Actions */}
                                  <div>
                                    <label className="text-white/40 text-[9px] uppercase tracking-wider font-medium flex items-center gap-1 mb-2">
                                      <Sparkles className="w-2.5 h-2.5 text-purple-400" /> AI Quick Actions
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                      {[
                                        { label: 'Shorten', icon: '✂️' },
                                        { label: 'More Casual', icon: '😊' },
                                        { label: 'More Professional', icon: '👔' },
                                        { label: 'Add Hashtags', icon: '#️⃣' },
                                        { label: 'Add CTA', icon: '👉' },
                                        { label: 'Emoji Boost', icon: '✨' },
                                      ].map(({ label, icon }) => (
                                        <motion.button
                                          key={label}
                                          onClick={() => quickRefineCaption(platformId, label)}
                                          disabled={isThisRefining || !caption.trim()}
                                          whileHover={{ scale: 1.04 }}
                                          whileTap={{ scale: 0.96 }}
                                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-400/20 text-purple-300 text-[10px] font-medium hover:bg-purple-500/20 hover:border-purple-400/35 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                          <span>{icon}</span> {label}
                                          {isThisRefining && <Loader2 className="w-2.5 h-2.5 animate-spin ml-0.5" />}
                                        </motion.button>
                                      ))}
                                      {/* Undo button — visible when undo stack has entries */}
                                      {(captionUndoStack[platformId]?.length ?? 0) > 0 && (
                                        <motion.button
                                          onClick={() => undoCaption(platformId)}
                                          disabled={isThisRefining}
                                          whileHover={{ scale: 1.04 }}
                                          whileTap={{ scale: 0.96 }}
                                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-400/20 text-amber-300 text-[10px] font-medium hover:bg-amber-500/20 hover:border-amber-400/35 transition-all disabled:opacity-30"
                                        >
                                          <RotateCcw className="w-2.5 h-2.5" /> Undo
                                        </motion.button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Generated assets thumbnails */}
                                  {generatedAssets.filter(a => a.status === 'generated').length > 0 && (
                                    <div>
                                      <label className="text-white/40 text-[9px] uppercase tracking-wider font-medium flex items-center gap-1 mb-1.5">
                                        <Image className="w-2.5 h-2.5" /> Assets
                                      </label>
                                      <div className="flex gap-2 overflow-x-auto pb-1">
                                        {generatedAssets.filter(a => a.status === 'generated').map(asset => (
                                          <div key={asset.id} className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-white/10 relative group cursor-pointer">
                                            <img src={asset.imageUrl} alt={asset.title} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                              <span className="text-white text-[7px] font-medium text-center px-1 leading-tight">{asset.title}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}

                    {/* Global AI Refinement Chat — compact */}
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10 bg-white/3">
                        <Bot className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                        <span className="text-white font-semibold text-xs">Ask AI anything</span>
                        <span className="text-white/30 text-[10px]">— edits auto-apply to captions</span>
                      </div>

                      {/* Messages */}
                      {reviewRefineMessages.length > 0 && (
                        <div className="p-3 space-y-2 max-h-32 overflow-y-auto border-b border-white/5">
                          {reviewRefineMessages.map((msg, i) => (
                            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                              {msg.role === 'ai' && (
                                <div className="w-5 h-5 rounded bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                                  <Bot className="w-2.5 h-2.5 text-teal-300" />
                                </div>
                              )}
                              <div className={`rounded-lg px-2.5 py-1.5 text-[11px] max-w-[80%] leading-relaxed ${
                                msg.role === 'user'
                                  ? 'bg-teal-500/20 border border-teal-400/30 text-white'
                                  : 'bg-white/5 border border-white/10 text-white/70'
                              }`}>
                                {msg.text}
                              </div>
                            </div>
                          ))}
                          {isRefining && (
                            <div className="flex gap-2">
                              <div className="w-5 h-5 rounded bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                                <Bot className="w-2.5 h-2.5 text-teal-300" />
                              </div>
                              <div className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                                <Loader2 className="w-2.5 h-2.5 text-teal-400 animate-spin" />
                                <span className="text-white/40 text-[10px]">Refining...</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="p-2.5 flex gap-2">
                        <input
                          type="text"
                          value={reviewRefineInput}
                          onChange={e => setReviewRefineInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendRefineMessage(); } }}
                          placeholder="e.g., &quot;Rewrite all captions in Gen-Z tone&quot; or &quot;Make LinkedIn more formal&quot;..."
                          disabled={isRefining}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 placeholder-white/25 text-xs focus:outline-none focus:border-teal-400/40 transition-all disabled:opacity-50"
                        />
                        <motion.button
                          onClick={sendRefineMessage}
                          disabled={!reviewRefineInput.trim() || isRefining}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-purple-600 flex items-center justify-center text-white disabled:opacity-30 transition-all shrink-0"
                        >
                          <Send className="w-3 h-3" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review Footer */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-white/10 bg-white/5 shrink-0">
                  <button
                    onClick={() => creationActions.length > 0 ? setStep('assets') : setStep('chat')}
                    className="flex items-center gap-2 text-white/60 hover:text-white text-sm px-4 py-2 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <motion.button
                    onClick={handleSaveToBoard}
                    disabled={savedToBoard}
                    whileHover={!savedToBoard ? { scale: 1.03 } : {}}
                    whileTap={!savedToBoard ? { scale: 0.97 } : {}}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                      savedToBoard
                        ? 'bg-teal-500/20 border border-teal-400/30 text-teal-300'
                        : 'bg-gradient-to-r from-teal-500 to-purple-600 text-white shadow-lg shadow-teal-500/20'
                    }`}
                  >
                    {savedToBoard ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Submitted as Draft ({selectedPlatforms.length} card{selectedPlatforms.length !== 1 ? 's' : ''})
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4" />
                        Submit as Draft ({selectedPlatforms.length} card{selectedPlatforms.length !== 1 ? 's' : ''})
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer (wizard steps 1-3 only) */}
        {['channel', 'platforms', 'actions'].includes(step) && (
          <div className="flex items-center justify-between p-5 border-t border-white/10 bg-white/5 shrink-0">
            <button
              onClick={step === 'channel' ? onClose : handleBack}
              className="flex items-center gap-2 text-white/60 hover:text-white text-sm px-4 py-2 rounded-xl hover:bg-white/10 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 'channel' ? 'Cancel' : 'Back'}
            </button>

            <motion.button
              onClick={handleNext}
              disabled={!canProceed()}
              whileHover={canProceed() ? { scale: 1.03 } : {}}
              whileTap={canProceed() ? { scale: 0.97 } : {}}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                canProceed()
                  ? 'bg-gradient-to-r from-teal-500 to-purple-600 text-white shadow-lg shadow-teal-500/20'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
            >
              {step === 'actions' ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Content
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function ChannelCard({ channel, selected, onSelect }: { channel: MarketingChannel; selected: boolean; onSelect: () => void }) {
  return (
    <motion.button
      onClick={onSelect}
      whileHover={channel.active ? { scale: 1.03 } : {}}
      whileTap={channel.active ? { scale: 0.97 } : {}}
      disabled={!channel.active}
      className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
        !channel.active
          ? 'bg-white/3 border-white/5 opacity-50 cursor-not-allowed'
          : selected
          ? 'bg-white/15 border-teal-400/60 shadow-lg shadow-teal-500/10'
          : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/8'
      }`}
    >
      {!channel.active && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-white/30 text-[10px] bg-white/5 px-2 py-0.5 rounded-full">
          <Lock className="w-3 h-3" />
          Coming Soon
        </div>
      )}
      {selected && channel.active && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      <div className="text-2xl mb-2">{channel.icon}</div>
      <div className="text-white font-semibold text-sm mb-1">{channel.name}</div>
      <div className="text-white/40 text-xs leading-relaxed line-clamp-2">{channel.description}</div>
    </motion.button>
  );
}