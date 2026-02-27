import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Image as ImageIcon, Video, Wand2, Loader2, Check,
  AlertCircle, Sparkles, RefreshCw, Play, Pause, Download,
  Info, ChevronRight, Maximize2, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { type ContentCard } from '../../contexts/ContentContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { IS_DEMO_MODE } from '../../config/appConfig';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// ─── Types ───────────────────────────────────────────────────────────────────

type MediaTab  = 'image' | 'video';
type Phase     = 'idle' | 'generating' | 'ready' | 'error';

export interface GeneratedMedia {
  url:           string;
  type:          'image' | 'video';
  filename:      string;
  revisedPrompt?: string;
}

export interface AIMediaGeneratorProps {
  card:     ContentCard;
  onAttach: (media: GeneratedMedia) => void;
  onClose:  () => void;
}

// ─── Static data ──────────────────────────────────────────────────────────────

const IMAGE_STYLES = [
  { id: 'photorealistic', label: 'Photo Real',  emoji: '📷', hint: 'DSLR quality, lifelike details'  },
  { id: 'cinematic',      label: 'Cinematic',   emoji: '🎬', hint: 'Dramatic lighting, film depth'   },
  { id: 'digital_art',    label: 'Digital Art', emoji: '🎨', hint: 'Illustrated, vibrant concept art' },
  { id: '3d_render',      label: '3D Render',   emoji: '💎', hint: 'CGI, ray-traced, glossy finish'  },
  { id: 'minimalist',     label: 'Minimalist',  emoji: '⬜', hint: 'Clean, flat, brand-safe layout'  },
  { id: 'anime',          label: 'Anime',       emoji: '⛩️', hint: 'Japanese animation style art'    },
] as const;

const VIDEO_STYLES = [
  { id: 'cinematic', label: 'Cinematic', emoji: '🎬', hint: 'Smooth camera, professional look' },
  { id: 'dynamic',   label: 'Dynamic',   emoji: '⚡', hint: 'Fast-paced, high-energy motion'   },
  { id: 'ambient',   label: 'Ambient',   emoji: '🌊', hint: 'Slow, atmospheric, peaceful flow' },
  { id: 'product',   label: 'Product',   emoji: '📦', hint: 'Clean hero shot, 360° reveal'     },
] as const;

const ASPECT_RATIOS = [
  { id: '1:1',  label: 'Square',    sub: 'Instagram · Posts',   ratio: '1/1',  icon: '■' },
  { id: '16:9', label: 'Landscape', sub: 'YouTube · Facebook',  ratio: '16/9', icon: '▬' },
  { id: '9:16', label: 'Portrait',  sub: 'Reels · TikTok',      ratio: '9/16', icon: '▮' },
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
  for (const m of VIDEO_PROGRESS_MSGS) {
    if (pct >= m.at) msg = m.msg;
  }
  return msg;
}

function buildAutoPrompt(card: ContentCard, tab: MediaTab): string {
  const parts: string[] = [];
  if (card.title)             parts.push(card.title);
  if ((card as any).visualDescription) parts.push((card as any).visualDescription);

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

// Demo-mode simulation — no real API calls
async function simulateGenerate(
  tab: MediaTab,
  onProgress: (p: number) => void,
): Promise<GeneratedMedia> {
  const steps = tab === 'image' ? 14 : 30;
  const delay = tab === 'image' ? 120 : 200;
  for (let i = 1; i <= steps; i++) {
    await new Promise(r => setTimeout(r, delay + Math.random() * 60));
    onProgress(Math.min(Math.round((i / steps) * 100), tab === 'video' ? 94 : 100));
  }
  if (tab === 'image') {
    return {
      url:           'https://images.unsplash.com/photo-1764664281863-f736f2d942bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NpYWwlMjBtZWRpYSUyMGNvbnRlbnQlMjBjcmVhdGlvbiUyMEFJJTIwZGlnaXRhbCUyMG1hcmtldGluZ3xlbnwxfHx8fDE3NzIyMDE3Nzd8MA&ixlib=rb-4.1.0&q=80&w=1080',
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

// ─── Main component ───────────────────────────────────────────────────────────

export function AIMediaGenerator({ card, onAttach, onClose }: AIMediaGeneratorProps) {
  // ── Tab & prompt ──
  const [tab,         setTab]         = useState<MediaTab>('image');
  const [prompt,      setPrompt]      = useState(() => buildAutoPrompt(card, 'image'));

  // ── Style / ratio ──
  const [imgStyle,    setImgStyle]    = useState<string>('photorealistic');
  const [vidStyle,    setVidStyle]    = useState<string>('cinematic');
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');

  // ── Generation state ──
  const [phase,         setPhase]         = useState<Phase>('idle');
  const [progress,      setProgress]      = useState(0);
  const [predictionId,  setPredictionId]  = useState<string | null>(null);
  const [media,         setMedia]         = useState<GeneratedMedia | null>(null);
  const [errorMsg,      setErrorMsg]      = useState('');
  const [revisedPrompt, setRevisedPrompt] = useState('');

  // ── Video player ──
  const [isPlaying,     setIsPlaying]     = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Switch tab → rebuild prompt ──
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

  // ── Auto-fill prompt ──
  const handleAutoFill = () => {
    setPrompt(buildAutoPrompt(card, tab));
    toast.info('Prompt auto-filled from card content');
  };

  // ── Copy prompt ──
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt).then(() => toast.success('Prompt copied!'));
  };

  // ── Generate ─────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) { toast.error('Please enter a prompt first'); return; }

    setPhase('generating');
    setProgress(0);
    setMedia(null);
    setErrorMsg('');
    setRevisedPrompt('');
    setPredictionId(null);
    setIsPlaying(false);

    // ── Demo mode simulation ──────────────────────────────────────────────
    if (IS_DEMO_MODE) {
      try {
        const result = await simulateGenerate(tab, setProgress);
        setMedia(result);
        if (result.revisedPrompt) setRevisedPrompt(result.revisedPrompt);
        setPhase('ready');
        setProgress(100);
      } catch {
        setErrorMsg('Demo simulation failed unexpectedly');
        setPhase('error');
      }
      return;
    }

    // ── Production mode ───────────────────────────────────────────────────
    try {
      if (tab === 'image') {
        const res = await fetch(`${API_BASE}/ai/generate-image`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body:    JSON.stringify({
            prompt,
            style:       imgStyle,
            aspectRatio,
            cardId:   card.id,
            tenantId: (card as any).tenantId,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
        setMedia({ url: data.mediaUrl, type: 'image', filename: data.filename, revisedPrompt: data.revisedPrompt });
        if (data.revisedPrompt) setRevisedPrompt(data.revisedPrompt);
        setPhase('ready');
        setProgress(100);

      } else {
        // Video: start Replicate prediction; poll via useEffect
        const res = await fetch(`${API_BASE}/ai/generate-video`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body:    JSON.stringify({
            prompt,
            style:    vidStyle,
            cardId:   card.id,
            tenantId: (card as any).tenantId,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
        setPredictionId(data.predictionId);
        // Polling handled by useEffect below
      }
    } catch (err) {
      setErrorMsg(String(err).replace(/^Error:\s*/, ''));
      setPhase('error');
    }
  }, [prompt, tab, imgStyle, vidStyle, aspectRatio, card]);

  // ── Poll Replicate for video status ──────────────────────────────────────
  useEffect(() => {
    if (phase !== 'generating' || !predictionId || tab !== 'video' || IS_DEMO_MODE) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/ai/media-status/${predictionId}?tenantId=${encodeURIComponent((card as any).tenantId ?? '')}&cardId=${encodeURIComponent(card.id)}`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } },
        );
        const data = await res.json();
        if (data.error && !data.status) { throw new Error(data.error); }

        if (data.status === 'succeeded' && data.mediaUrl) {
          clearInterval(poll);
          setMedia({ url: data.mediaUrl, type: 'video', filename: data.filename ?? `ai-video-${Date.now()}.mp4` });
          setPhase('ready');
          setProgress(100);

        } else if (data.status === 'failed') {
          clearInterval(poll);
          setErrorMsg(data.error ?? 'Video generation failed');
          setPhase('error');

        } else if (typeof data.progress === 'number') {
          setProgress(data.progress);
        } else {
          // Gently tick up while we wait
          setProgress(prev => Math.min(prev + 1.5, 94));
        }
      } catch (e) {
        console.log('[ai/media-status] poll error:', e);
      }
    }, 3500);

    return () => clearInterval(poll);
  }, [phase, predictionId, tab, card]);

  // ── Toggle video play/pause ──
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
    else           { videoRef.current.play();  setIsPlaying(true);  }
  };

  // ── Attach handler ────────────────────────────────────────────────────────
  const handleAttach = () => {
    if (!media) return;
    onAttach(media);
    toast.success(`AI ${media.type === 'image' ? 'image' : 'video'} attached to card`, {
      description: 'The generated media has been added to this content card.',
      duration: 4000,
    });
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const isGenerating = phase === 'generating';
  const isReady      = phase === 'ready';
  const isError      = phase === 'error';
  const progMsg      = tab === 'video'
    ? getVideoProgressMsg(progress)
    : progress < 50 ? 'Crafting your prompt with DALL-E 3…'
    : progress < 85 ? 'Rendering high-resolution image…'
    :                 'Uploading to secure media storage…';

  const platformGrad = PLATFORM_GRADIENT[card.platform] ?? PLATFORM_GRADIENT.general;

  // ── Portal render ─────────────────────────────────────────────────────────
  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(135deg, rgba(20,20,35,0.98) 0%, rgba(14,14,26,0.98) 100%)', border: '1px solid rgba(255,255,255,0.10)' }}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/8 shrink-0">
            {/* Icon */}
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${platformGrad} flex items-center justify-center shrink-0 shadow-lg`}>
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-base leading-tight">AI Media Generator</h2>
              <p className="text-white/40 text-xs truncate mt-0.5">
                Generating for&nbsp;
                <span className="text-white/60 font-medium">{card.title || 'Untitled Card'}</span>
                &nbsp;·&nbsp;
                <span className={`capitalize font-medium text-transparent bg-clip-text bg-gradient-to-r ${platformGrad}`}>{card.platform}</span>
              </p>
            </div>

            {/* Demo badge */}
            {IS_DEMO_MODE && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/25 text-amber-300 text-[10px] font-semibold uppercase tracking-wide shrink-0">
                Demo Mode
              </span>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/50 hover:text-white transition-all shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Tab switcher ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 px-6 pt-4 shrink-0">
            {([
              { id: 'image' as const, label: 'AI Image',           Icon: ImageIcon, sub: 'DALL-E 3 · HD quality'   },
              { id: 'video' as const, label: 'AI Video  (~10 s)',   Icon: Video,     sub: 'Replicate · minimax/video-01' },
            ] as const).map(({ id, label, Icon, sub }) => (
              <button
                key={id}
                onClick={() => handleTabSwitch(id)}
                disabled={isGenerating}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all disabled:opacity-40
                  ${tab === id
                    ? 'bg-teal-500/20 border-teal-400/40 text-teal-300'
                    : 'bg-white/4 border-white/8 text-white/40 hover:text-white/70 hover:bg-white/8'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {tab === id && <span className="text-teal-400/60 text-[10px] font-normal hidden sm:inline">· {sub}</span>}
              </button>
            ))}
          </div>

          {/* ── Body: controls (left) + preview (right) ──────────────────── */}
          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden gap-0">

            {/* ── LEFT: Controls ────────────────────────────────────────── */}
            <div className="lg:w-[42%] flex flex-col gap-4 p-6 overflow-y-auto border-r border-white/6 shrink-0">

              {/* Platform context chip */}
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${platformGrad} text-white text-xs font-semibold`}>
                  {card.platform.charAt(0).toUpperCase() + card.platform.slice(1)}
                </div>
                <span className="text-white/30 text-xs">context applied to prompt</span>
              </div>

              {/* Prompt textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-white/50 text-xs uppercase tracking-wider font-semibold">Prompt</label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleAutoFill}
                      className="flex items-center gap-1 text-[10px] text-teal-400 hover:text-teal-300 px-2 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 transition-all"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> Auto-fill
                    </button>
                    <button
                      onClick={handleCopyPrompt}
                      className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 px-2 py-1 rounded-lg hover:bg-white/6 transition-all"
                    >
                      <Copy className="w-2.5 h-2.5" /> Copy
                    </button>
                  </div>
                </div>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  rows={4}
                  placeholder={`Describe the ${tab === 'image' ? 'image' : 'video scene'} you want to generate…`}
                  disabled={isGenerating}
                  className="w-full bg-white/5 border border-white/12 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-teal-400/40 focus:bg-white/8 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
                />
                <p className="text-white/20 text-[10px] mt-1">{prompt.length}/1000 chars</p>
              </div>

              {/* ── Style grid ── */}
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-2 block">
                  {tab === 'image' ? 'Visual Style' : 'Motion Style'}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(tab === 'image' ? IMAGE_STYLES : VIDEO_STYLES).map(s => {
                    const active = tab === 'image' ? imgStyle === s.id : vidStyle === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => tab === 'image' ? setImgStyle(s.id) : setVidStyle(s.id)}
                        disabled={isGenerating}
                        title={s.hint}
                        className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-center transition-all disabled:opacity-40
                          ${active
                            ? 'bg-teal-500/20 border-teal-400/40 text-teal-200'
                            : 'bg-white/4 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/70'
                          }`}
                      >
                        <span className="text-base leading-none">{s.emoji}</span>
                        <span className="text-[10px] font-semibold leading-tight">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Aspect ratio (image only) ── */}
              {tab === 'image' && (
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-2 block">Aspect Ratio</label>
                  <div className="flex gap-1.5">
                    {ASPECT_RATIOS.map(ar => (
                      <button
                        key={ar.id}
                        onClick={() => setAspectRatio(ar.id)}
                        disabled={isGenerating}
                        className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-center transition-all disabled:opacity-40
                          ${aspectRatio === ar.id
                            ? 'bg-teal-500/20 border-teal-400/40 text-teal-200'
                            : 'bg-white/4 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/70'
                          }`}
                      >
                        <span
                          className={`border-2 ${aspectRatio === ar.id ? 'border-teal-400' : 'border-white/30'} rounded-[3px] transition-all`}
                          style={{
                            width:  ar.id === '9:16' ? 10 : ar.id === '1:1' ? 14 : 20,
                            height: ar.id === '9:16' ? 16 : ar.id === '1:1' ? 14 : 12,
                          }}
                        />
                        <span className="text-[10px] font-bold">{ar.id}</span>
                        <span className="text-[9px] text-white/30 leading-tight">{ar.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Info note (video) ── */}
              {tab === 'video' && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/8 border border-amber-400/15 rounded-xl">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-amber-300/70 text-[10px] leading-relaxed">
                    Video generation typically takes <strong className="text-amber-300">60–120 seconds</strong>. The AI renders approximately 6–10 seconds of footage using Replicate's minimax/video-01 model. Please keep this panel open while generating.
                  </p>
                </div>
              )}

              {/* ── Generate button ── */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm transition-all
                  bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500
                  text-white shadow-lg shadow-teal-500/20
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isGenerating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  : <><Wand2 className="w-4 h-4" /> Generate {tab === 'image' ? 'Image' : 'Video'}</>
                }
              </button>

              {/* Cost hint */}
              <p className="text-white/20 text-[10px] text-center">
                {tab === 'image'
                  ? '~$0.08 USD per HD image (DALL-E 3)'
                  : '~$0.30–$0.60 USD per video (Replicate minimax)'}
              </p>
            </div>

            {/* ── RIGHT: Preview ────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">

              {/* ── IDLE ── */}
              {phase === 'idle' && (
                <motion.div
                  className="flex-1 flex flex-col items-center justify-center gap-4 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/20 to-purple-500/20 border border-white/8 flex items-center justify-center">
                    {tab === 'image'
                      ? <ImageIcon className="w-9 h-9 text-white/20" />
                      : <Video className="w-9 h-9 text-white/20" />
                    }
                  </div>
                  <div>
                    <p className="text-white/40 font-semibold text-sm">Preview appears here</p>
                    <p className="text-white/20 text-xs mt-1">Configure your prompt and style, then click Generate</p>
                  </div>

                  {/* Capability bullets */}
                  <div className="grid grid-cols-2 gap-2 w-full max-w-xs mt-2">
                    {(tab === 'image'
                      ? ['HD 1024 px output', 'DALL-E 3 model', '6 visual styles', 'Stored securely']
                      : ['~6-10 s video', 'minimax/video-01', '4 motion styles', 'MP4 format']
                    ).map(feat => (
                      <div key={feat} className="flex items-center gap-2 p-2 bg-white/4 rounded-lg border border-white/6">
                        <Check className="w-3 h-3 text-teal-400 shrink-0" />
                        <span className="text-white/50 text-[10px]">{feat}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── GENERATING ── */}
              {phase === 'generating' && (
                <motion.div
                  className="flex-1 flex flex-col items-center justify-center gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {/* Animated blob */}
                  <div className="relative w-32 h-32">
                    <motion.div
                      className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-500/30 to-purple-500/30 blur-2xl"
                      animate={{ scale: [1, 1.3, 1], rotate: [0, 90, 180, 270, 360] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    />
                    <div className="absolute inset-0 rounded-full border border-teal-400/20 flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="w-8 h-8 text-teal-400/70" />
                      </motion.div>
                    </div>
                    {/* Orbiting dot */}
                    <motion.div
                      className="absolute w-3 h-3 rounded-full bg-teal-400 shadow-lg shadow-teal-400/50"
                      style={{ top: '50%', left: '50%', x: '-50%', y: '-50%', transformOrigin: '50% 68px' }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>

                  {/* Status label */}
                  <div className="text-center">
                    <motion.p
                      key={progMsg}
                      className="text-white/70 text-sm font-semibold"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {progMsg}
                    </motion.p>
                    <p className="text-white/30 text-xs mt-1">
                      {tab === 'image' ? 'DALL-E 3 · HD quality' : 'Replicate · minimax/video-01'}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full max-w-xs">
                    <div className="flex justify-between text-[10px] text-white/30 mb-1.5">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    {tab === 'video' && (
                      <p className="text-white/20 text-[9px] mt-1.5 text-center">Keep this panel open — video takes 1–2 minutes</p>
                    )}
                  </div>

                  {/* Cancel */}
                  <button
                    onClick={() => { setPhase('idle'); setPredictionId(null); setProgress(0); }}
                    className="text-white/30 hover:text-white/60 text-xs flex items-center gap-1.5 transition-all"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </motion.div>
              )}

              {/* ── READY ── */}
              {phase === 'ready' && media && (
                <motion.div
                  className="flex flex-col gap-4 flex-1"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                >
                  {/* Success pill */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-500/12 border border-green-400/20 rounded-xl w-fit">
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-300 text-xs font-semibold">
                      {media.type === 'image' ? 'Image' : 'Video'} generated successfully
                    </span>
                  </div>

                  {/* Media preview */}
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 flex-1 min-h-[220px] flex items-center justify-center">
                    {media.type === 'image' ? (
                      <img
                        src={media.url}
                        alt="AI generated"
                        className="max-w-full max-h-[360px] w-full object-contain rounded-xl"
                      />
                    ) : (
                      <div className="w-full relative">
                        <video
                          ref={videoRef}
                          src={media.url}
                          loop
                          playsInline
                          muted={false}
                          onEnded={() => setIsPlaying(false)}
                          className="w-full max-h-[360px] object-contain rounded-xl"
                        />
                        {/* Play overlay */}
                        <button
                          onClick={togglePlay}
                          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/10 transition-all rounded-xl group"
                        >
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:bg-white/30 transition-all">
                            {isPlaying
                              ? <Pause className="w-5 h-5 text-white" />
                              : <Play  className="w-5 h-5 text-white ml-0.5" />
                            }
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Top-right actions overlay */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <a
                        href={media.url}
                        download={media.filename}
                        target="_blank"
                        rel="noreferrer"
                        className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/70 transition-all"
                        title="Download"
                      >
                        <Download className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Revised prompt */}
                  {revisedPrompt && (
                    <div className="p-3 bg-white/4 border border-white/8 rounded-xl">
                      <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">DALL-E 3 Revised Prompt</p>
                      <p className="text-white/50 text-xs leading-relaxed italic">{revisedPrompt}</p>
                    </div>
                  )}

                  {/* Filename */}
                  <p className="text-white/20 text-[10px] truncate">
                    📁 {media.filename}
                  </p>

                  {/* CTAs */}
                  <div className="flex items-center gap-3 mt-auto pt-2">
                    <button
                      onClick={() => { setPhase('idle'); setMedia(null); setRevisedPrompt(''); setProgress(0); setIsPlaying(false); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-semibold transition-all"
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

              {/* ── ERROR ── */}
              {phase === 'error' && (
                <motion.div
                  className="flex-1 flex flex-col items-center justify-center gap-4 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-400/20 flex items-center justify-center">
                    <AlertCircle className="w-7 h-7 text-red-400" />
                  </div>
                  <div>
                    <p className="text-red-300 font-semibold text-sm">Generation failed</p>
                    <p className="text-white/30 text-xs mt-1 max-w-xs mx-auto leading-relaxed">{errorMsg}</p>
                  </div>
                  <button
                    onClick={() => { setPhase('idle'); setErrorMsg(''); setProgress(0); }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/8 border border-white/12 hover:bg-white/12 text-white/70 hover:text-white text-sm font-semibold transition-all"
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
