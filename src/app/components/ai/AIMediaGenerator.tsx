import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Image as ImageIcon, Video, Wand2, Loader2, Check,
  AlertCircle, Sparkles, RefreshCw, Play, Pause, Download,
  Info, ChevronRight, Clock, ChevronDown, ChevronUp, Scissors,
} from 'lucide-react';
import { toast } from 'sonner';
import { type ContentCard, type AiPromptHistoryEntry } from '../../contexts/ContentContext';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHeaders';
import { IS_DEMO_MODE } from '../../config/appConfig';
import { useDashboardTheme } from '../saas/DashboardThemeContext';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// ─── Types ───────────────────────────────────────────────────────────────────

type MediaTab = 'image' | 'video';
type Phase    = 'idle' | 'generating' | 'ready' | 'error';

export interface GeneratedMedia {
  url:             string;
  type:            'image' | 'video';
  filename:        string;
  revisedPrompt?:  string;
  promptUsed?:     string;
  styleUsed?:      string;
  aspectRatioUsed?: string;
}

export interface AIMediaGeneratorProps {
  card:           ContentCard;
  promptHistory?: AiPromptHistoryEntry[];
  onAttach:       (media: GeneratedMedia) => void;
  onClose:        () => void;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const IMAGE_STYLES = [
  { id: 'photorealistic', label: 'Photo Real',  emoji: '📷', hint: 'DSLR quality, lifelike details'   },
  { id: 'cinematic',      label: 'Cinematic',   emoji: '🎬', hint: 'Dramatic lighting, film depth'    },
  { id: 'digital_art',    label: 'Digital Art', emoji: '🎨', hint: 'Illustrated, vibrant concept art'  },
  { id: '3d_render',      label: '3D Render',   emoji: '💎', hint: 'CGI, ray-traced, glossy finish'   },
  { id: 'minimalist',     label: 'Minimalist',  emoji: '⬜', hint: 'Clean, flat, brand-safe layout'   },
  { id: 'anime',          label: 'Anime',       emoji: '⛩️', hint: 'Japanese animation style art'     },
] as const;

const VIDEO_STYLES = [
  { id: 'cinematic', label: 'Cinematic', emoji: '🎬', hint: 'Smooth camera, professional look'   },
  { id: 'dynamic',   label: 'Dynamic',   emoji: '⚡', hint: 'Fast-paced, high-energy motion'     },
  { id: 'ambient',   label: 'Ambient',   emoji: '🌊', hint: 'Slow, atmospheric, peaceful flow'   },
  { id: 'product',   label: 'Product',   emoji: '📦', hint: 'Clean hero shot, 360° reveal'       },
] as const;

const ASPECT_RATIOS = [
  { id: '1:1',  label: 'Square',    sub: 'Instagram · Posts',    dimPct: 21.9 },
  { id: '16:9', label: 'Landscape', sub: 'YouTube · Facebook',   dimPct: 0    },
  { id: '9:16', label: 'Portrait',  sub: 'Reels · TikTok',       dimPct: 34.2 },
] as const;

const PLATFORM_GRADIENT: Record<string, string> = {
  instagram: 'from-purple-600 to-pink-500',
  facebook:  'from-blue-700  to-blue-500',
  twitter:   'from-sky-600   to-sky-400',
  linkedin:  'from-blue-800  to-blue-600',
  tiktok:    'from-gray-900  to-gray-700',
  youtube:   'from-red-700   to-red-500',
  pinterest: 'from-red-600   to-red-400',
  general:   'from-teal-700  to-teal-500',
};

const VIDEO_PROGRESS_MSGS = [
  { at: 0,  msg: 'Initialising AI model…'          },
  { at: 10, msg: 'Processing your prompt…'          },
  { at: 25, msg: 'Generating scene keyframes…'      },
  { at: 45, msg: 'Rendering motion sequence…'       },
  { at: 65, msg: 'Applying cinematic style pass…'   },
  { at: 82, msg: 'Encoding final video clip…'       },
  { at: 93, msg: 'Almost ready — finalising…'       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getVideoProgressMsg(pct: number): string {
  let msg = VIDEO_PROGRESS_MSGS[0].msg;
  for (const m of VIDEO_PROGRESS_MSGS) if (pct >= m.at) msg = m.msg;
  return msg;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function buildAutoPrompt(card: ContentCard, tab: MediaTab): string {
  const parts: string[] = [];
  if (card.title)             parts.push(card.title);
  if (card.visualDescription) parts.push(card.visualDescription as string);
  const platformHint: Record<string, string> = {
    instagram: 'vibrant lifestyle aesthetic, eye-catching composition, warm colour palette',
    linkedin:  'clean professional setting, corporate environment, polished and modern',
    tiktok:    'energetic trendy visual, bold colours, Gen-Z aesthetic',
    youtube:   'high production value, engaging storytelling, cinematic framing',
    facebook:  'warm community feel, relatable everyday scene, approachable',
    twitter:   'bold punchy graphic, striking composition, high contrast',
    pinterest: 'beautiful flat-lay, pastel tones, aspirational lifestyle',
  };
  const hint = platformHint[card.platform];
  if (hint) parts.push(hint);
  if (tab === 'video') parts.push('smooth 10-second motion clip, no text overlays, social media optimised');
  return parts.filter(Boolean).join(', ');
}

/** Returns the aspect-ratio framing hint to append to the prompt. */
function arHint(ar: string): string {
  if (ar === '9:16') return 'vertical 9:16 portrait format, keep main subject centred in the middle third, optimised for Reels and TikTok';
  if (ar === '1:1')  return 'square 1:1 format, balanced symmetrical composition, optimised for Instagram posts';
  return 'widescreen 16:9 landscape format, cinematic horizontal framing';
}

// Demo-mode simulation
async function simulateGenerate(tab: MediaTab, onProgress: (p: number) => void): Promise<GeneratedMedia> {
  const steps = tab === 'image' ? 14 : 30;
  const delay = tab === 'image' ? 120 : 200;
  for (let i = 1; i <= steps; i++) {
    await new Promise(r => setTimeout(r, delay + Math.random() * 60));
    onProgress(Math.min(Math.round((i / steps) * 100), tab === 'video' ? 94 : 100));
  }
  if (tab === 'image') {
    return {
      url: 'https://images.unsplash.com/photo-1764664281863-f736f2d942bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NpYWwlMjBtZWRpYSUyMGNvbnRlbnQlMjBjcmVhdGlvbiUyMEFJJTIwZGlnaXRhbCUyMG1hcmtldGluZ3xlbnwxfHx8fDE3NzIyMDE3Nzd8MA&ixlib=rb-4.1.0&q=80&w=1080',
      type:          'image',
      filename:      `demo-ai-image-${Date.now()}.jpg`,
      revisedPrompt: 'A vibrant, professionally composed marketing visual — AI-generated by DALL-E 3 and optimised for social media engagement.',
    };
  }
  return {
    url:      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    type:     'video',
    filename: `demo-ai-video-${Date.now()}.mp4`,
  };
}

// ─── Crop-guide overlay ───────────────────────────────────────────────────────
// Shows a dim vignette outside the target aspect-ratio crop area.
// The source video is always 16:9; dimPct is the % to dim on each side.
function CropGuide({ aspectRatio }: { aspectRatio: string }) {
  const ar = ASPECT_RATIOS.find(a => a.id === aspectRatio);
  if (!ar || ar.dimPct === 0) return null;
  const dim = `${ar.dimPct.toFixed(1)}%`;
  return (
    <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
      {/* Left dim */}
      <div className="absolute top-0 left-0 h-full bg-black/65" style={{ width: dim }} />
      {/* Right dim */}
      <div className="absolute top-0 right-0 h-full bg-black/65" style={{ width: dim }} />
      {/* Crop-area border */}
      <div
        className="absolute top-0 bottom-0 border-2 border-yellow-400/70 pointer-events-none"
        style={{ left: dim, right: dim }}
      />
      {/* Label */}
      <div
        className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/60 backdrop-blur-sm
          rounded text-yellow-300 text-[9px] font-bold uppercase tracking-wide whitespace-nowrap"
      >
        {ar.id} crop
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIMediaGenerator({ card, promptHistory = [], onAttach, onClose }: AIMediaGeneratorProps) {

  const { isDark } = useDashboardTheme();

  // ── Tab ──────────────────────────────────────────────────────────────────
  const [tab,  setTab]  = useState<MediaTab>('image');
  const [prompt, setPrompt] = useState(() => buildAutoPrompt(card, 'image'));

  // ── Style & ratio ─────────────────────────────────────────────────────────
  const [imgStyle,    setImgStyle]    = useState('photorealistic');
  const [vidStyle,    setVidStyle]    = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState('1:1');

  // ── Generation state ──────────────────────────────────────────────────────
  const [phase,        setPhase]        = useState<Phase>('idle');
  const [progress,     setProgress]     = useState(0);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [media,        setMedia]        = useState<GeneratedMedia | null>(null);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [revisedPrompt,setRevisedPrompt]= useState('');

  // Track prompt/style used so we can include in GeneratedMedia
  const currentJobRef = useRef<{ prompt: string; style: string; aspectRatio: string; tab: MediaTab } | null>(null);

  // ── Video player ──────────────────────────────────────────────────────────
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [showCropGuide,setShowCropGuide]= useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Prompt history panel ──────────────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false);

  // ── Tab switch ────────────────────────────────────────────────────────────
  const handleTabSwitch = (t: MediaTab) => {
    setTab(t);
    setPrompt(buildAutoPrompt(card, t));
    setPhase('idle');
    setMedia(null);
    setErrorMsg('');
    setRevisedPrompt('');
    setProgress(0);
    setPredictionId(null);
    setIsPlaying(false);
  };

  const handleAutoFill = () => {
    setPrompt(buildAutoPrompt(card, tab));
    toast.info('Prompt auto-filled from card content');
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) { toast.error('Please enter a prompt first'); return; }
    const style = tab === 'image' ? imgStyle : vidStyle;

    setPhase('generating');
    setProgress(0);
    setMedia(null);
    setErrorMsg('');
    setRevisedPrompt('');
    setPredictionId(null);
    setIsPlaying(false);
    currentJobRef.current = { prompt, style, aspectRatio, tab };

    // Build enhanced prompt with framing hint
    const fullPrompt = `${prompt.trim()}, ${arHint(aspectRatio)}`;

    if (IS_DEMO_MODE) {
      try {
        const result = await simulateGenerate(tab, setProgress);
        setMedia({ ...result, promptUsed: prompt, styleUsed: style, aspectRatioUsed: aspectRatio });
        if (result.revisedPrompt) setRevisedPrompt(result.revisedPrompt);
        setPhase('ready');
        setProgress(100);
      } catch {
        setErrorMsg('Demo simulation failed unexpectedly');
        setPhase('error');
      }
      return;
    }

    try {
      if (tab === 'image') {
        const res = await fetch(`${API_BASE}/ai/generate-image`, {
          method:  'POST',
          headers: await getAuthHeaders(true),
          body: JSON.stringify({
            prompt:      fullPrompt,
            style:       imgStyle,
            aspectRatio,
            cardId:      card.id,
            tenantId:    (card as any).tenantId,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
        setMedia({ url: data.mediaUrl, type: 'image', filename: data.filename,
          revisedPrompt: data.revisedPrompt, promptUsed: prompt, styleUsed: imgStyle, aspectRatioUsed: aspectRatio });
        if (data.revisedPrompt) setRevisedPrompt(data.revisedPrompt);
        setPhase('ready');
        setProgress(100);

      } else {
        const res = await fetch(`${API_BASE}/ai/generate-video`, {
          method:  'POST',
          headers: await getAuthHeaders(true),
          body: JSON.stringify({
            prompt:      fullPrompt,
            style:       vidStyle,
            aspectRatio,
            cardId:      card.id,
            tenantId:    (card as any).tenantId,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
        setPredictionId(data.predictionId);
        // Polling via useEffect
      }
    } catch (err) {
      setErrorMsg(String(err).replace(/^Error:\s*/, ''));
      setPhase('error');
    }
  }, [prompt, tab, imgStyle, vidStyle, aspectRatio, card]);

  // ── Poll Replicate ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'generating' || !predictionId || tab !== 'video' || IS_DEMO_MODE) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/ai/media-status/${predictionId}?tenantId=${encodeURIComponent((card as any).tenantId ?? '')}&cardId=${encodeURIComponent(card.id)}`,
          { headers: await getAuthHeaders() },
        );
        const data = await res.json();
        if (data.error && !data.status) throw new Error(data.error);

        if (data.status === 'succeeded' && data.mediaUrl) {
          clearInterval(poll);
          const job = currentJobRef.current;
          setMedia({ url: data.mediaUrl, type: 'video', filename: data.filename ?? `ai-video-${Date.now()}.mp4`,
            promptUsed: job?.prompt, styleUsed: job?.style, aspectRatioUsed: job?.aspectRatio });
          setPhase('ready');
          setProgress(100);
        } else if (data.status === 'failed') {
          clearInterval(poll);
          setErrorMsg(data.error ?? 'Video generation failed');
          setPhase('error');
        } else if (typeof data.progress === 'number') {
          setProgress(data.progress);
        } else {
          setProgress(prev => Math.min(prev + 1.5, 94));
        }
      } catch (e) {
        console.log('[ai/media-status] poll error:', e);
      }
    }, 3500);

    return () => clearInterval(poll);
  }, [phase, predictionId, tab, card]);

  // ── Video play/pause ──────────────────────────────────────────────────────
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
    else           { videoRef.current.play();  setIsPlaying(true);  }
  };

  // ── Attach ────────────────────────────────────────────────────────────────
  const handleAttach = () => {
    if (!media) return;
    onAttach(media);
    toast.success(`AI ${media.type === 'image' ? 'image' : 'video'} attached to card`, {
      description: 'Generated media added to this content card.',
      duration: 4000,
    });
  };

  // ── Apply history entry ───────────────────────────────────────────────────
  const applyHistory = (entry: AiPromptHistoryEntry) => {
    setPrompt(entry.prompt);
    setAspectRatio(entry.aspectRatio);
    if (entry.tab !== tab) handleTabSwitch(entry.tab);
    if (entry.tab === 'image') setImgStyle(entry.style);
    else setVidStyle(entry.style);
    setShowHistory(false);
    toast.info('Prompt restored from history');
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const isGenerating   = phase === 'generating';
  const isReady        = phase === 'ready';
  const isError        = phase === 'error';
  const currentStyle   = tab === 'image' ? imgStyle : vidStyle;
  const progMsg        = tab === 'video'
    ? getVideoProgressMsg(progress)
    : progress < 50 ? 'Crafting your prompt with DALL-E 3…'
    : progress < 85 ? 'Rendering high-resolution image…'
    :                 'Uploading to secure media storage…';
  const platformGrad   = PLATFORM_GRADIENT[card.platform] ?? PLATFORM_GRADIENT.general;
  const videoNeedsCrop = tab === 'video' && aspectRatio !== '16:9';

  // ── Render ────────────────────────────────────────────────────────────────
  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9000] flex items-center justify-center p-3 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/78 backdrop-blur-md"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: isDark ? 'linear-gradient(135deg, rgba(18,18,32,0.99) 0%, rgba(12,12,22,0.99) 100%)' : 'linear-gradient(135deg, rgba(255,255,255,0.99) 0%, rgba(248,249,252,0.99) 100%)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.1)'}` }}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className={`flex items-center gap-3 px-6 py-4 border-b shrink-0 ${isDark ? 'border-white/8' : 'border-gray-200'}`}>
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${platformGrad} flex items-center justify-center shrink-0`}>
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`font-bold text-base leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Media Generator</h2>
              <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                For&nbsp;<span className={`font-medium ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{card.title || 'Untitled Card'}</span>
                &nbsp;·&nbsp;
                <span className={`capitalize font-medium text-transparent bg-clip-text bg-gradient-to-r ${platformGrad}`}>{card.platform}</span>
              </p>
            </div>
            {IS_DEMO_MODE && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/25 text-amber-300 text-[10px] font-semibold uppercase tracking-wide shrink-0">
                Demo Mode
              </span>
            )}
            <button onClick={onClose} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${isDark ? 'bg-white/6 hover:bg-white/12 text-white/50 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700'}`}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Tab switcher ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {([
              { id: 'image' as const, label: 'AI Image',         Icon: ImageIcon, sub: 'DALL-E 3 · HD' },
              { id: 'video' as const, label: 'AI Video (~10 s)', Icon: Video,     sub: 'minimax/video-01' },
            ] as const).map(({ id, label, Icon, sub }) => (
              <button
                key={id}
                onClick={() => handleTabSwitch(id)}
                disabled={isGenerating}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all disabled:opacity-40
                  ${tab === id
                    ? 'bg-teal-500/20 border-teal-400/40 text-teal-300'
                    : isDark ? 'bg-white/4 border-white/8 text-white/40 hover:text-white/70 hover:bg-white/8' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {tab === id && <span className="text-teal-400/50 text-[10px] font-normal hidden sm:inline">· {sub}</span>}
              </button>
            ))}
          </div>

          {/* ── Body ─────────────────────────────────────────────────────── */}
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

            {/* ── LEFT: Controls ────────────────────────────────────────── */}
            <div className={`flex-1 flex flex-col gap-4 p-6 overflow-y-auto border-r shrink-0 lg:w-[42%] ${isDark ? 'border-white/6' : 'border-gray-200'}`}>
              {/* Platform chip */}
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${platformGrad} text-white text-xs font-semibold`}>
                  {card.platform.charAt(0).toUpperCase() + card.platform.slice(1)}
                </div>
                <span className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>context applied to prompt</span>
              </div>

              {/* Prompt */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Prompt</label>
                  <button
                    onClick={handleAutoFill}
                    className="flex items-center gap-1 text-[10px] text-teal-400 hover:text-teal-300 px-2 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 transition-all"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> Auto-fill
                  </button>
                </div>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  rows={4}
                  placeholder={`Describe the ${tab === 'image' ? 'image' : 'video scene'} you want to generate…`}
                  disabled={isGenerating}
                  className={`w-full border rounded-xl px-3.5 py-2.5 text-sm
                    focus:outline-none transition-all resize-none
                    disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed ${isDark ? 'bg-white/5 border-white/12 text-white placeholder-white/25 focus:border-teal-400/40 focus:bg-white/8' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-400/60 focus:bg-white'}`}
                />
                <p className={`text-[10px] mt-1 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>{prompt.length} chars</p>
              </div>

              {/* ── Recent Prompts ── */}
              {promptHistory.length > 0 && (
                <div className={`border rounded-xl overflow-hidden ${isDark ? 'border-white/8' : 'border-gray-200'}`}>
                  <button
                    onClick={() => setShowHistory(v => !v)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 transition-all ${isDark ? 'bg-white/4 hover:bg-white/7' : 'bg-gray-50 hover:bg-gray-100'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
                      <span className={`text-xs font-semibold ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Recent Prompts</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${isDark ? 'bg-white/10 text-white/30' : 'bg-gray-200 text-gray-400'}`}>{Math.min(promptHistory.length, 5)}</span>
                    </div>
                    {showHistory ? <ChevronUp className={`w-3.5 h-3.5 ${isDark ? 'text-white/30' : 'text-gray-400'}`} /> : <ChevronDown className={`w-3.5 h-3.5 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />}
                  </button>

                  <AnimatePresence>
                    {showHistory && (
                      <motion.div
                        initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        className="overflow-hidden"
                        transition={{ duration: 0.2 }}
                      >
                        <div className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                          {promptHistory.slice(0, 5).map(entry => (
                            <button
                              key={entry.id}
                              onClick={() => applyHistory(entry)}
                              disabled={isGenerating}
                              className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-all disabled:opacity-40 ${isDark ? 'hover:bg-white/6' : 'hover:bg-gray-50'}`}
                            >
                              <span className="text-sm mt-0.5 shrink-0">{entry.tab === 'image' ? '📷' : '🎬'}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-[11px] leading-snug line-clamp-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{entry.prompt}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-[9px] capitalize ${isDark ? 'text-white/25' : 'text-gray-400'}`}>{entry.style}</span>
                                  <span className={`text-[9px] ${isDark ? 'text-white/15' : 'text-gray-300'}`}>·</span>
                                  <span className={`text-[9px] ${isDark ? 'text-white/25' : 'text-gray-400'}`}>{entry.aspectRatio}</span>
                                  <span className={`text-[9px] ${isDark ? 'text-white/15' : 'text-gray-300'}`}>·</span>
                                  <span className={`text-[9px] ${isDark ? 'text-white/25' : 'text-gray-400'}`}>{timeAgo(entry.generatedAt)}</span>
                                </div>
                              </div>
                              <ChevronRight className={`w-3 h-3 shrink-0 mt-1 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ── Style grid ── */}
              <div>
                <label className={`text-xs uppercase tracking-wider font-semibold mb-2 block ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  {tab === 'image' ? 'Visual Style' : 'Motion Style'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(tab === 'image' ? IMAGE_STYLES : VIDEO_STYLES).map(s => {
                    const active = currentStyle === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => tab === 'image' ? setImgStyle(s.id) : setVidStyle(s.id)}
                        disabled={isGenerating}
                        title={s.hint}
                        className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-center transition-all disabled:opacity-40
                          ${active ? 'bg-teal-500/20 border-teal-400/40 text-teal-200' : isDark ? 'bg-white/4 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/70' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                      >
                        <span className="text-base leading-none">{s.emoji}</span>
                        <span className="text-[10px] font-semibold leading-tight">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Aspect ratio (both tabs) ── */}
              <div>
                <label className={`text-xs uppercase tracking-wider font-semibold mb-2 block ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  {tab === 'image' ? 'Aspect Ratio' : 'Target Aspect Ratio'}
                </label>
                <div className="flex gap-1.5">
                  {ASPECT_RATIOS.map(ar => (
                    <button
                      key={ar.id}
                      onClick={() => setAspectRatio(ar.id)}
                      disabled={isGenerating}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border text-center transition-all disabled:opacity-40
                        ${aspectRatio === ar.id ? 'bg-teal-500/20 border-teal-400/40 text-teal-200' : isDark ? 'bg-white/4 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/70' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                    >
                      {/* Mini aspect ratio icon */}
                      <span
                        className={`border-2 rounded-[3px] transition-all ${aspectRatio === ar.id ? 'border-teal-400' : isDark ? 'border-white/30' : 'border-gray-300'}`}
                        style={{
                          width:  ar.id === '9:16' ? 10 : ar.id === '1:1' ? 14 : 20,
                          height: ar.id === '9:16' ? 16 : ar.id === '1:1' ? 14 : 12,
                        }}
                      />
                      <span className="text-[10px] font-bold">{ar.id}</span>
                      <span className={`text-[9px] leading-tight ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{ar.label}</span>
                    </button>
                  ))}
                </div>
                {/* Video crop note */}
                {tab === 'video' && aspectRatio !== '16:9' && (
                  <div className="flex items-start gap-1.5 mt-2 p-2 bg-yellow-500/8 border border-yellow-400/15 rounded-lg">
                    <Scissors className="w-3 h-3 text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-yellow-300/70 text-[10px] leading-relaxed">
                      Video renders in 16:9 natively. A <strong className="text-yellow-300">{aspectRatio} crop guide</strong> will overlay the preview so you know exactly where to crop in post.
                    </p>
                  </div>
                )}
              </div>

              {/* Video info note */}
              {tab === 'video' && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/8 border border-amber-400/15 rounded-xl">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-amber-300/70 text-[10px] leading-relaxed">
                    Video generation takes <strong className="text-amber-300">60–120 seconds</strong>. The model renders ~6–10 s of footage. Keep this panel open while generating.
                  </p>
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm transition-all
                  bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500
                  text-white shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  : <><Wand2 className="w-4 h-4" /> Generate {tab === 'image' ? 'Image' : 'Video'}</>
                }
              </button>

              <p className={`text-[10px] text-center ${isDark ? 'text-white/18' : 'text-gray-400'}`}>
                {tab === 'image' ? '~$0.08 USD per HD image (DALL-E 3)' : '~$0.45–0.60 USD per video (Replicate minimax)'}
              </p>
            </div>

            {/* ── RIGHT: Preview ────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">

              {/* IDLE */}
              {phase === 'idle' && (
                <motion.div className="flex-1 flex flex-col items-center justify-center gap-4 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/20 to-purple-500/20 border flex items-center justify-center ${isDark ? 'border-white/8' : 'border-gray-200'}`}>
                    {tab === 'image' ? <ImageIcon className={`w-9 h-9 ${isDark ? 'text-white/20' : 'text-gray-300'}`} /> : <Video className={`w-9 h-9 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />}
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Preview appears here</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>Configure your prompt and style, then click Generate</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-xs mt-2">
                    {(tab === 'image'
                      ? ['HD 1024 px output', 'DALL-E 3 model', '6 visual styles', 'Stored securely']
                      : ['~6-10 s video', 'minimax/video-01', '4 motion styles', 'Crop guide overlay']
                    ).map(feat => (
                      <div key={feat} className={`flex items-center gap-2 p-2 rounded-lg border ${isDark ? 'bg-white/4 border-white/6' : 'bg-gray-50 border-gray-200'}`}>
                        <Check className="w-3 h-3 text-teal-400 shrink-0" />
                        <span className={`text-[10px] ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{feat}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* GENERATING */}
              {phase === 'generating' && (
                <motion.div className="flex-1 flex flex-col items-center justify-center gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="relative w-32 h-32">
                    <motion.div
                      className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-500/30 to-purple-500/30 blur-2xl"
                      animate={{ scale: [1, 1.3, 1], rotate: [0, 360] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    />
                    <div className="absolute inset-0 rounded-full border border-teal-400/20 flex items-center justify-center">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                        <Loader2 className="w-8 h-8 text-teal-400/70" />
                      </motion.div>
                    </div>
                    <motion.div
                      className="absolute w-3 h-3 rounded-full bg-teal-400 shadow-lg shadow-teal-400/50"
                      style={{ top: '50%', left: '50%', x: '-50%', y: '-50%', transformOrigin: '50% 68px' }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                  <div className="text-center">
                    <motion.p key={progMsg} className={`text-sm font-semibold ${isDark ? 'text-white/70' : 'text-gray-600'}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                      {progMsg}
                    </motion.p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{tab === 'image' ? 'DALL-E 3 · HD quality' : 'Replicate · minimax/video-01'}</p>
                  </div>
                  <div className="w-full max-w-xs">
                    <div className={`flex justify-between text-[10px] mb-1.5 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                      <span>Progress</span><span>{progress}%</span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/8' : 'bg-gray-200'}`}>
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    {tab === 'video' && <p className={`text-[9px] mt-1.5 text-center ${isDark ? 'text-white/20' : 'text-gray-400'}`}>Keep this panel open — video takes 1–2 minutes</p>}
                  </div>
                  <button
                    onClick={() => { setPhase('idle'); setPredictionId(null); setProgress(0); }}
                    className={`text-xs flex items-center gap-1.5 transition-all ${isDark ? 'text-white/30 hover:text-white/60' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </motion.div>
              )}

              {/* READY */}
              {phase === 'ready' && media && (
                <motion.div
                  className="flex flex-col gap-4 flex-1"
                  initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                >
                  {/* Success pill */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-500/12 border border-green-400/20 rounded-xl w-fit">
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-300 text-xs font-semibold">{media.type === 'image' ? 'Image' : 'Video'} generated successfully</span>
                    {aspectRatio !== '16:9' && media.type === 'video' && (
                      <span className="ml-1 px-1.5 py-0.5 bg-yellow-500/15 rounded text-yellow-300 text-[9px]">crop guide: {aspectRatio}</span>
                    )}
                  </div>

                  {/* Media preview */}
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 flex-1 min-h-[220px] flex items-center justify-center">
                    {media.type === 'image' ? (
                      <img src={media.url} alt="AI generated" className="max-w-full max-h-[360px] w-full object-contain rounded-xl" />
                    ) : (
                      <div className="w-full relative">
                        <video
                          ref={videoRef}
                          src={media.url}
                          loop playsInline
                          onEnded={() => setIsPlaying(false)}
                          className="w-full max-h-[360px] object-contain rounded-xl"
                        />
                        {/* Crop guide overlay */}
                        {showCropGuide && <CropGuide aspectRatio={aspectRatio} />}
                        {/* Play overlay */}
                        <button
                          onClick={togglePlay}
                          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/10 transition-all rounded-xl group"
                        >
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:bg-white/30 transition-all">
                            {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                          </div>
                        </button>
                      </div>
                    )}
                    {/* Top-right actions */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      {media.type === 'video' && aspectRatio !== '16:9' && (
                        <button
                          onClick={() => setShowCropGuide(v => !v)}
                          title="Toggle crop guide"
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-sm border text-[10px] font-medium transition-all
                            ${showCropGuide ? 'bg-yellow-500/30 border-yellow-400/40 text-yellow-300' : 'bg-black/50 border-white/15 text-white/50'}`}
                        >
                          <Scissors className="w-2.5 h-2.5" />
                          {showCropGuide ? 'Hide guide' : 'Crop guide'}
                        </button>
                      )}
                      <a
                        href={media.url} download={media.filename} target="_blank" rel="noreferrer"
                        className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/70 transition-all"
                        title="Download"
                      >
                        <Download className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Revised prompt */}
                  {revisedPrompt && (
                    <div className={`p-3 border rounded-xl ${isDark ? 'bg-white/4 border-white/8' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`text-[10px] uppercase tracking-wider mb-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>DALL-E 3 Revised Prompt</p>
                      <p className={`text-xs leading-relaxed italic ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{revisedPrompt}</p>
                    </div>
                  )}

                  {/* Prompt used */}
                  {media.promptUsed && (
                    <p className={`text-[10px] truncate ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                      📝 <span className="italic">{media.promptUsed.slice(0, 90)}{media.promptUsed.length > 90 ? '…' : ''}</span>
                    </p>
                  )}

                  {/* CTAs */}
                  <div className="flex items-center gap-3 mt-auto pt-2">
                    <button
                      onClick={() => { setPhase('idle'); setMedia(null); setRevisedPrompt(''); setProgress(0); setIsPlaying(false); }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${isDark ? 'border-white/12 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </button>
                    <button
                      onClick={handleAttach}
                      className="flex-1 flex items-center justify-center gap-2.5 py-2.5 rounded-xl font-bold text-sm transition-all
                        bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500
                        text-white shadow-lg shadow-teal-500/25"
                    >
                      <Check className="w-4 h-4" />
                      Attach to Card
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ERROR */}
              {phase === 'error' && (
                <motion.div className="flex-1 flex flex-col items-center justify-center gap-4 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-400/20 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${isDark ? 'text-red-300' : 'text-red-500'}`}>Generation failed</p>
                    <p className={`text-xs mt-1 max-w-xs mx-auto leading-relaxed ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{errorMsg}</p>
                  </div>
                  <button
                    onClick={() => { setPhase('idle'); setErrorMsg(''); setProgress(0); }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${isDark ? 'bg-white/8 border-white/12 hover:bg-white/12 text-white/70 hover:text-white' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Try Again
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}