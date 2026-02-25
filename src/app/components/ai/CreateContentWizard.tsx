import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronRight, ChevronLeft, Sparkles, Check, Lock,
  Send, Loader2, Bot, User, RotateCcw, Zap, Copy, CheckCircle,
  Save, PlusCircle,
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

type WizardStep = 'channel' | 'platforms' | 'actions' | 'chat';

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

      // Extract platform-specific caption or fallback to generic
      const platformSection = combinedContent
        .split(new RegExp(`### ${platformName}`, 'i'));
      let caption = extractedCaption;
      if (platformSection.length > 1) {
        // Extract captions specifically for this platform's section
        const sectionText = platformSection[1].split(/###\s/)[0]; // take until next section
        const sectionCaptions = sectionText.match(/^>\s*.+$/gm);
        if (sectionCaptions && sectionCaptions.length > 0) {
          caption = sectionCaptions.map(l => l.replace(/^>\s*/, '')).join('\n');
        }
      }

      const card: ContentCard = {
        id: createCardId(),
        projectId,
        platform: platformId,
        channel: selectedChannel || 'social-media',
        title: `${platformName} — ${actionLabel}`,
        caption: caption || `AI-generated ${actionLabel.toLowerCase()} for ${projectName} on ${platformName}.`,
        hashtags: hashtags.slice(0, 10),
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
  }, [savedToBoard, user, messages, selectedPlatforms, selectedActions, selectedChannel, projectId, projectName, addCards]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when entering chat step
  useEffect(() => {
    if (step === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 300);
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

  const stepNumber = step === 'channel' ? 1 : step === 'platforms' ? 2 : step === 'actions' ? 3 : 4;

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
          step === 'chat' ? 'max-w-5xl h-[95vh] sm:h-[90vh]' : 'max-w-4xl max-h-[95vh] sm:max-h-[90vh]'
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
            {step !== 'chat' && (
              <span className="sm:hidden text-white/50 text-xs font-medium">
                Step {stepNumber}/4
              </span>
            )}
            {/* Step indicators — desktop */}
            {step !== 'chat' && (
              <div className="hidden sm:flex items-center gap-2">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      s < stepNumber ? 'bg-teal-500 text-white' :
                      s === stepNumber ? 'bg-white/20 text-white border border-white/40' :
                      'bg-white/5 text-white/30 border border-white/10'
                    }`}>
                      {s < stepNumber ? <Check className="w-3.5 h-3.5" /> : s}
                    </div>
                    {s < 4 && <div className={`w-6 h-0.5 ${s < stepNumber ? 'bg-teal-500' : 'bg-white/10'}`} />}
                  </div>
                ))}
              </div>
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
                  {/* Save to Board button */}
                  {messages.some(m => m.role === 'assistant') && !isGenerating && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-3"
                    >
                      <motion.button
                        onClick={handleSaveToBoard}
                        disabled={savedToBoard}
                        whileHover={!savedToBoard ? { scale: 1.02 } : {}}
                        whileTap={!savedToBoard ? { scale: 0.98 } : {}}
                        className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
                          savedToBoard
                            ? 'bg-teal-500/20 border border-teal-400/30 text-teal-300 cursor-default'
                            : 'bg-gradient-to-r from-teal-500 to-purple-600 text-white shadow-lg hover:shadow-teal-500/20 border border-transparent'
                        }`}
                      >
                        {savedToBoard ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Saved to Content Board ({selectedPlatforms.length} card{selectedPlatforms.length !== 1 ? 's' : ''})
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-4 h-4" />
                            Save to Content Board ({selectedPlatforms.length} card{selectedPlatforms.length !== 1 ? 's' : ''} as draft)
                          </>
                        )}
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
          </AnimatePresence>
        </div>

        {/* Footer (wizard steps only) */}
        {step !== 'chat' && (
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