/**
 * SocialCalendarPlanner
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-flow AI-powered social media campaign planner.
 *
 * Flow:
 *   1. Campaign Setup  — name, brand, date range, platforms, frequency,
 *                        brand voice (tone / style / audience / keywords),
 *                        campaign themes
 *   2. AI Generation   — calls POST /ai/generate-calendar → GPT-4o JSON mode
 *                        (demo mode: deterministic mock slots)
 *   3. Review & Edit   — per-slot editing, select/deselect, filter by platform
 *   4. Save to Board   — selected slots → ContentCards (draft, with scheduledDate)
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, CalendarDays, Check, ChevronDown, ChevronUp,
  Loader2, X, Edit3, Save, AlertTriangle, LayoutGrid,
  CheckSquare2, Square, FolderOpen, Clock, Tag, Zap,
  Globe, RefreshCw, ArrowRight, Info, Target, Mic,
  Image as ImageIcon, Video, FileText, BarChart2,
} from 'lucide-react';
import {
  SiInstagram, SiFacebook, SiX, SiLinkedin, SiTiktok,
  SiYoutube, SiPinterest, SiSnapchat, SiThreads, SiReddit,
  SiWhatsapp, SiTelegram,
} from 'react-icons/si';
import { toast } from 'sonner';
import { useAuth } from '../AuthContext';
import { useDashboardTheme } from '../saas/DashboardThemeContext';
import { employeeTheme } from '../../utils/employeeTheme';
import { useProjects } from '../../contexts/ProjectsContext';
import { useContent, createCardId } from '../../contexts/ContentContext';
import { supabase } from '../../utils/supabaseClient';
import { IS_DEMO_MODE } from '../../config/appConfig';
import { projectId } from '/utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram',      Icon: SiInstagram, color: 'text-pink-400',   bg: 'bg-pink-500/12',   border: 'border-pink-400/30' },
  { id: 'facebook',  label: 'Facebook',       Icon: SiFacebook,  color: 'text-blue-400',   bg: 'bg-blue-500/12',   border: 'border-blue-400/30' },
  { id: 'twitter',   label: 'X (Twitter)',    Icon: SiX,         color: 'text-gray-800',   bg: 'bg-gray-200',      border: 'border-gray-300',     colorDark: 'text-white',      bgDark: 'bg-white/8',       borderDark: 'border-white/15'    },
  { id: 'linkedin',  label: 'LinkedIn',       Icon: SiLinkedin,  color: 'text-blue-300',   bg: 'bg-blue-700/12',   border: 'border-blue-400/20' },
  { id: 'tiktok',    label: 'TikTok',         Icon: SiTiktok,    color: 'text-cyan-300',   bg: 'bg-cyan-500/12',   border: 'border-cyan-400/30' },
  { id: 'youtube',   label: 'YouTube',        Icon: SiYoutube,   color: 'text-red-400',    bg: 'bg-red-500/12',    border: 'border-red-400/30'  },
  { id: 'pinterest', label: 'Pinterest',      Icon: SiPinterest, color: 'text-red-400',    bg: 'bg-red-500/12',    border: 'border-red-400/30'  },
  { id: 'snapchat',  label: 'Snapchat',       Icon: SiSnapchat,  color: 'text-yellow-300', bg: 'bg-yellow-400/12', border: 'border-yellow-300/30'},
  { id: 'threads',   label: 'Threads',        Icon: SiThreads,   color: 'text-gray-800',   bg: 'bg-gray-200',      border: 'border-gray-300',     colorDark: 'text-white',      bgDark: 'bg-white/8',       borderDark: 'border-white/15'    },
  { id: 'reddit',    label: 'Reddit',         Icon: SiReddit,    color: 'text-orange-400', bg: 'bg-orange-500/12', border: 'border-orange-400/30'},
  { id: 'whatsapp',  label: 'WhatsApp',       Icon: SiWhatsapp,  color: 'text-green-400',  bg: 'bg-green-500/12',  border: 'border-green-400/30'},
  { id: 'telegram',  label: 'Telegram',       Icon: SiTelegram,  color: 'text-sky-400',    bg: 'bg-sky-500/12',    border: 'border-sky-400/30'  },
];
const PL_MAP = Object.fromEntries(PLATFORMS.map(p => [p.id, p]));

/** Resolve platform colors based on theme — handles Twitter/Threads dark overrides */
function plColors(p: typeof PLATFORMS[number], isDark: boolean) {
  if (isDark && 'colorDark' in p && p.colorDark) {
    return { color: p.colorDark, bg: (p as any).bgDark ?? p.bg, border: (p as any).borderDark ?? p.border };
  }
  return { color: p.color, bg: p.bg, border: p.border };
}

// ─── Tone / Style config ──────────────────────────────────────────────────────

const TONES = [
  { id: 'professional',   label: 'Professional',   emoji: '🎯' },
  { id: 'conversational', label: 'Conversational', emoji: '🤝' },
  { id: 'creative',       label: 'Creative',       emoji: '🎨' },
  { id: 'authoritative',  label: 'Authoritative',  emoji: '🏆' },
  { id: 'humorous',       label: 'Humorous',       emoji: '😄' },
  { id: 'inspirational',  label: 'Inspirational',  emoji: '⚡' },
];

const STYLES = [
  'Storytelling', 'Data-driven', 'Visual-first', 'Community-focused',
  'Educational', 'Entertainment', 'Behind-the-scenes', 'Thought Leadership',
];

const FREQUENCIES = [
  { id: '3x',    label: '3× / week',  desc: 'Mon, Wed, Fri'   },
  { id: '5x',    label: '5× / week',  desc: 'Mon – Fri'       },
  { id: 'daily', label: 'Daily',      desc: 'Every day'       },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarSlot {
  id:             string;
  date:           string;          // YYYY-MM-DD
  dayOfWeek:      string;
  time:           string;          // HH:MM
  platform:       string;
  postType:       string;
  theme:          string;
  caption:        string;
  hashtags:       string[];
  callToAction:   string;
  contentIdea:    string;
  mediaType:      'image' | 'video' | 'text';
}

// ─── Mock calendar generator (demo mode) ─────────────────────────────────────

const MOCK_CAPTIONS: Record<string, Record<string, string[]>> = {
  instagram: {
    professional:   ['✨ Elevating your brand with strategic social media presence. See how we deliver measurable results. 🎯 #BrandStrategy #DigitalMarketing'],
    conversational: ['Hey there! 👋 Did you know consistent posting can triple your engagement? Let us show you how! 💪 #SocialMediaTips'],
    creative:       ['🎨 Where creativity meets strategy — that\'s the Brandtelligence difference. Swipe to see the magic! ✨ #CreativeMarketing'],
    humorous:       ['Me: I\'ll post once a week.\nAlso me, 3 weeks later: 👀\n\nDon\'t be like me — let us handle your content calendar! 😂 #MarketingLife'],
    inspirational:  ['Every great brand was once just an idea. Your story matters. Let\'s tell it together. 🌟 #BrandInspiration'],
    authoritative:  ['Data speaks louder than opinions. Here\'s what 1,000+ campaigns taught us about high-performing social content. 📊 #MarketingInsights'],
  },
  linkedin: {
    professional:   ['I\'ve spent 10 years watching brands struggle with social media consistency.\n\nHere\'s the framework that finally works:\n\n1. Content pillars (not random posts)\n2. Platform-native formats\n3. Audience feedback loops\n\nThe results? 3× engagement, 40% lower CAC.\n\n#MarketingStrategy #DigitalMarketing #ContentMarketing'],
    conversational: ['Quick question for my network: What\'s your biggest social media challenge right now?\n\nDrop it in the comments — I read every single one.\n\n#SocialMedia #Marketing'],
    creative:       ['The most underrated marketing move? Showing your work-in-progress.\n\nAuthenticity converts. Polish doesn\'t.\n\nHere\'s how we\'ve used behind-the-scenes content to build trust and drive 52% more leads.\n\n#AuthenticMarketing'],
  },
  tiktok: {
    professional:   ['POV: Your social media is finally consistent 📱✅ #MarketingTips #SocialMediaGrowth #FYP'],
    conversational: ['Things that secretly tank your engagement 👀 #SocialMediaSecrets #MarketingHacks #FYP'],
    creative:       ['We tried posting 7 times this week and THIS happened 📈 #ContentCreator #MarketingTikTok'],
  },
  facebook: {
    professional:   ['🎯 Social media success isn\'t about going viral — it\'s about consistent, strategic content that builds real relationships.\n\nHere\'s how we approach it for our clients:\n▶ Platform-specific content strategy\n▶ Audience persona development\n▶ Monthly performance reviews\n\nWhat does your social media strategy look like? Share below! 👇'],
    conversational: ['Happy Monday! ☀️ Starting the week with a reminder that your brand\'s social media voice is one of its most valuable assets.\n\nWhat tone of voice works best for YOUR audience? We\'d love to know! 💬'],
  },
  twitter: {
    professional:   ['The brands winning on social media aren\'t posting more — they\'re posting smarter.\n\nThread on what "smarter" actually means 🧵👇'],
    conversational: ['Hot take: Most brands are on too many platforms.\n\nBetter to dominate 2 than to be mediocre on 7.\n\nAgree? 👇'],
  },
};

function getMockCaption(platform: string, tone: string, theme: string, projectName?: string): string {
  const captions = MOCK_CAPTIONS[platform]?.[tone] ?? MOCK_CAPTIONS['instagram']?.['professional'] ?? [];
  const base = captions[Math.floor(Math.random() * captions.length)] || `Exciting content about ${theme} for ${projectName || 'our brand'}! #Marketing`;
  return base;
}

function generateMockSlots(params: {
  startDate: string; endDate: string; platforms: string[];
  frequency: string; tone: string; themes: string[]; campaignName: string; brandName: string;
}): CalendarSlot[] {
  const { startDate, endDate, platforms, frequency, tone, themes, campaignName, brandName } = params;
  const slots: CalendarSlot[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end   = new Date(endDate   + 'T00:00:00');
  const themeList = themes.filter(Boolean).length ? themes.filter(Boolean) : ['Brand Awareness', 'Engagement', 'Conversion'];

  const POST_TYPES_BY_PLATFORM: Record<string, string[]> = {
    instagram: ['Carousel', 'Reel', 'Story', 'Single Image', 'Quote Card'],
    facebook:  ['Single Image', 'Video', 'Poll', 'Article', 'Quote Card'],
    twitter:   ['Thread', 'Single Image', 'Poll', 'Quote Card'],
    linkedin:  ['Article', 'Single Image', 'Carousel', 'Poll'],
    tiktok:    ['Video', 'Story', 'Reel'],
    youtube:   ['Video', 'Story'],
    default:   ['Single Image', 'Video', 'Carousel'],
  };

  const BEST_TIMES: Record<string, string> = {
    instagram: '11:00', facebook: '13:00', twitter: '08:00',
    linkedin: '08:00', tiktok: '12:00', youtube: '15:00',
    default: '10:00',
  };

  const HASHTAGS_BY_PLATFORM: Record<string, string[]> = {
    instagram: ['#DigitalMarketing', '#BrandStrategy', '#ContentMarketing', '#SocialMedia', '#Marketing', '#BusinessGrowth', '#MarketingTips', '#BrandGrowth', '#ContentCreation', '#MarketingStrategy'],
    tiktok:    ['#MarketingTips', '#FYP', '#SocialMediaGrowth', '#ContentCreator', '#MarketingTikTok', '#BrandGrowth'],
    linkedin:  ['#MarketingStrategy', '#DigitalMarketing', '#ContentMarketing'],
    twitter:   ['#Marketing', '#SocialMedia'],
    default:   ['#Marketing', '#Digital', '#Brand'],
  };

  const isPostDay = (date: Date): boolean => {
    const dow = date.getDay();
    if (frequency === 'daily') return true;
    if (frequency === '5x')   return dow >= 1 && dow <= 5;
    return [1, 3, 5].includes(dow); // 3x: Mon Wed Fri
  };

  const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  const curr = new Date(start);
  let slotIdx = 0;

  while (curr <= end) {
    if (isPostDay(curr)) {
      const dateStr   = curr.toISOString().slice(0, 10);
      const dayOfWeek = DAY_NAMES[curr.getDay()];
      const theme     = themeList[slotIdx % themeList.length];

      // Rotate platforms — 1 or 2 per day depending on count
      const maxPerDay = platforms.length <= 2 ? platforms.length : Math.min(2, platforms.length);
      for (let pi = 0; pi < maxPerDay; pi++) {
        const platform  = platforms[(slotIdx + pi) % platforms.length];
        const postTypes = POST_TYPES_BY_PLATFORM[platform] ?? POST_TYPES_BY_PLATFORM.default;
        const postType  = postTypes[(slotIdx + pi) % postTypes.length];
        const hashtags  = (HASHTAGS_BY_PLATFORM[platform] ?? HASHTAGS_BY_PLATFORM.default)
          .slice(0, platform === 'instagram' ? 10 : platform === 'tiktok' ? 6 : 3);

        slots.push({
          id:           crypto.randomUUID(),
          date:         dateStr,
          dayOfWeek,
          time:         BEST_TIMES[platform] ?? BEST_TIMES.default,
          platform,
          postType,
          theme,
          caption:      getMockCaption(platform, tone, theme, brandName || campaignName),
          hashtags,
          callToAction: ['Link in bio', 'DM us', 'Shop now', 'Learn more', 'Comment below'][slotIdx % 5],
          contentIdea:  `${postType} post featuring ${theme.toLowerCase()} content. Visual: branded graphic with ${campaignName} messaging and ${tone} tone.`,
          mediaType:    postType === 'Video' || postType === 'Reel' ? 'video' : postType === 'Thread' || postType === 'Article' || postType === 'Poll' ? 'text' : 'image',
        });
      }
      slotIdx++;
    }
    curr.setDate(curr.getDate() + 1);
  }

  return slots.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

// ─── PlatformIcon helper ──────────────────────────────────────────────────────

function PlatformIcon({ platformId, className }: { platformId: string; className?: string }) {
  const p = PL_MAP[platformId];
  if (!p) return null;
  return <p.Icon className={className || `w-4 h-4 ${p.color}`} />;
}

// ─── MediaType icon ───────────────────────────────────────────────────────────

function MediaIcon({ type }: { type: string }) {
  if (type === 'video') return <Video className="w-3 h-3" />;
  if (type === 'text')  return <FileText className="w-3 h-3" />;
  return <ImageIcon className="w-3 h-3" />;
}

// ─── SlotCard ─────────────────────────────────────────────────────────────────

function SlotCard({
  slot, selected, onToggle, onEdit,
}: {
  slot: CalendarSlot;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const pl = PL_MAP[slot.platform];
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);
  const pc = pl ? plColors(pl, isDark) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative rounded-2xl border transition-all cursor-pointer group
        ${selected
          ? 'border-[#0BA4AA]/50 bg-[#0BA4AA]/6 shadow-lg shadow-[#0BA4AA]/10'
          : isDark ? 'border-white/10 bg-white/4 hover:border-white/20 hover:bg-white/6' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
        }`}
      onClick={onToggle}
    >
      {/* Selection indicator */}
      <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
        selected ? 'bg-[#0BA4AA] border-[#0BA4AA]' : isDark ? 'border-white/20 bg-transparent' : 'border-gray-300 bg-transparent'
      }`}>
        {selected && <Check className="w-2.5 h-2.5 text-white" />}
      </div>

      <div className="p-4">
        {/* Date + platform row */}
        <div className="flex items-center gap-2 mb-3 pr-8">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold ${pc?.bg ?? (isDark ? 'bg-white/8' : 'bg-gray-100')} ${pc?.border ?? et.border} border`}>
            <PlatformIcon platformId={slot.platform} className={`w-3 h-3 ${pc?.color ?? et.textMd}`} />
            <span className={pc?.color ?? et.textMd}>{pl?.label ?? slot.platform}</span>
          </div>
          <span className={`text-[10px] ${et.textFaint}`}>{slot.dayOfWeek}, {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}</span>
          <span className={`text-[10px] ${et.textFaint} ml-auto`}>⏰ {slot.time}</span>
        </div>

        {/* Post type + theme */}
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F47A20]/10 text-[#F47A20]/80 border border-[#F47A20]/20">
            {slot.postType}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-white/6 text-white/40 border border-white/10' : 'bg-gray-100 text-gray-500 border border-gray-200'} flex items-center gap-1`}>
            <MediaIcon type={slot.mediaType} />
            {slot.mediaType}
          </span>
          <span className={`text-[10px] ${et.textFaint} truncate max-w-[120px]`}>📌 {slot.theme}</span>
        </div>

        {/* Caption preview */}
        <p className={`text-xs ${et.textMd} leading-relaxed line-clamp-2 mb-2.5`}>
          {slot.caption}
        </p>

        {/* Hashtags preview */}
        <div className="flex items-center gap-1 flex-wrap">
          {slot.hashtags.slice(0, 4).map(tag => (
            <span key={tag} className="text-[9px] text-[#0BA4AA]/60 hover:text-[#0BA4AA] transition-colors">
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
          {slot.hashtags.length > 4 && (
            <span className={`text-[9px] ${et.textFaint}`}>+{slot.hashtags.length - 4} more</span>
          )}
        </div>

        {/* CTA */}
        <div className={`mt-2 pt-2 border-t ${isDark ? 'border-white/6' : 'border-gray-100'} flex items-center justify-between`}>
          <span className={`text-[10px] ${et.textFaint} flex items-center gap-1`}>
            <ArrowRight className="w-2.5 h-2.5" /> {slot.callToAction}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className={`text-[10px] ${et.textFaint} hover:text-[#0BA4AA] flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-[#0BA4AA]/10 transition-all`}
          >
            <Edit3 className="w-2.5 h-2.5" /> Edit
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── SlotEditModal ────────────────────────────────────────────────────────────

function SlotEditModal({ slot, onSave, onClose }: {
  slot: CalendarSlot;
  onSave: (updated: CalendarSlot) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CalendarSlot>({ ...slot });
  const [hashtagInput, setHashtagInput] = useState(slot.hashtags.join(' '));
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);
  const inputCls = et.inputCls;
  const labelCls = `block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${et.textFaint}`;

  const handleSave = () => {
    const parsed = hashtagInput
      .split(/[\s,]+/)
      .map(h => h.trim().replace(/^#*/, '#'))
      .filter(h => h.length > 1);
    onSave({ ...draft, hashtags: parsed });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border shadow-2xl ${isDark ? 'border-white/15' : 'border-gray-200'}`}
        style={{ background: isDark ? 'rgba(10,8,35,0.97)' : 'rgba(255,255,255,0.98)', backdropFilter: 'blur(24px)' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${et.border} sticky top-0 z-10`}
          style={{ background: isDark ? 'rgba(10,8,35,0.95)' : 'rgba(255,255,255,0.95)' }}>
          <div className="flex items-center gap-2">
            <PlatformIcon platformId={draft.platform} className={`w-4 h-4 ${PL_MAP[draft.platform]?.color ?? et.textMd}`} />
            <span className={`${et.text} font-semibold text-sm`}>Edit Slot — {draft.dayOfWeek} {new Date(draft.date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}</span>
          </div>
          <button onClick={onClose} className={`${et.textFaint} hover:${isDark ? 'text-white' : 'text-gray-900'} transition-colors`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {/* Row: date + time + postType */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Time</label>
              <input type="time" value={draft.time} onChange={e => setDraft(d => ({ ...d, time: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Post Type</label>
              <input type="text" value={draft.postType} onChange={e => setDraft(d => ({ ...d, postType: e.target.value }))} className={inputCls} />
            </div>
          </div>

          {/* Theme + CTA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Theme</label>
              <input type="text" value={draft.theme} onChange={e => setDraft(d => ({ ...d, theme: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Call to Action</label>
              <input type="text" value={draft.callToAction} onChange={e => setDraft(d => ({ ...d, callToAction: e.target.value }))} className={inputCls} />
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className={labelCls}>Caption</label>
            <textarea
              value={draft.caption}
              onChange={e => setDraft(d => ({ ...d, caption: e.target.value }))}
              rows={6}
              className={`${inputCls} resize-none leading-relaxed`}
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className={labelCls}>Hashtags (space or comma separated)</label>
            <input
              type="text"
              value={hashtagInput}
              onChange={e => setHashtagInput(e.target.value)}
              placeholder="#tag1 #tag2 #tag3"
              className={inputCls}
            />
          </div>

          {/* Content idea */}
          <div>
            <label className={labelCls}>Content / Visual Concept</label>
            <textarea
              value={draft.contentIdea}
              onChange={e => setDraft(d => ({ ...d, contentIdea: e.target.value }))}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="Describe the visual or content concept…"
            />
          </div>

          {/* Media type */}
          <div>
            <label className={labelCls}>Media Type</label>
            <div className="flex gap-2">
              {(['image', 'video', 'text'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setDraft(d => ({ ...d, mediaType: m }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all capitalize ${
                    draft.mediaType === m
                      ? 'bg-[#0BA4AA]/15 border-[#0BA4AA]/40 text-[#0BA4AA]'
                      : isDark ? 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/8' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <MediaIcon type={m} /> {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-2 px-6 py-4 border-t ${et.border} sticky bottom-0`}
          style={{ background: isDark ? 'rgba(10,8,35,0.95)' : 'rgba(255,255,255,0.95)' }}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm transition-all ${isDark ? 'text-white/50 hover:text-white hover:bg-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
            Cancel
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg,#0BA4AA,#3E3C70)' }}>
            <Save className="w-3.5 h-3.5" /> Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SocialCalendarPlanner() {
  const { user }     = useAuth();
  const { projects } = useProjects();
  const { addCard }  = useContent();
  const { isDark }   = useDashboardTheme();
  const et           = employeeTheme(isDark);

  // Shadow module-level constants with themed versions
  const glass    = et.glass;
  const inputCls = et.inputCls;
  const labelCls = `block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${et.textFaint}`;

  const activeProjects = projects.filter(p => p.status === 'active');

  // ── Setup form ──────────────────────────────────────────────────────────────
  const today    = new Date().toISOString().slice(0, 10);
  const oneMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [campaignName,   setCampaignName]   = useState('');
  const [brandName,      setBrandName]      = useState('');
  const [startDate,      setStartDate]      = useState(today);
  const [endDate,        setEndDate]        = useState(oneMonth);
  const [selPlatforms,   setSelPlatforms]   = useState<string[]>(['instagram', 'facebook']);
  const [frequency,      setFrequency]      = useState<'3x' | '5x' | 'daily'>('3x');
  const [tone,           setTone]           = useState('professional');
  const [style,          setStyle]          = useState('Storytelling');
  const [targetAudience, setTargetAudience] = useState('');
  const [brandKeywords,  setBrandKeywords]  = useState('');
  const [themes,         setThemes]         = useState(['Brand Awareness', 'Engagement & Community', 'Product / Service Spotlight']);

  // ── Generated slots ─────────────────────────────────────────────────────────
  const [slots,         setSlots]         = useState<CalendarSlot[]>([]);
  const [generating,    setGenerating]    = useState(false);
  const [genError,      setGenError]      = useState<string | null>(null);
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [platformFilter,setPlatformFilter]= useState<string>('all');
  const [editingSlot,   setEditingSlot]   = useState<CalendarSlot | null>(null);

  // ── Save-to-board ────────────────────────────────────────────────────────────
  const [targetProject, setTargetProject] = useState(activeProjects[0]?.id ?? '');
  const [saving,        setSaving]        = useState(false);
  const [savedCount,    setSavedCount]    = useState<number | null>(null);

  // Derived
  const filteredSlots = useMemo(() =>
    platformFilter === 'all' ? slots : slots.filter(s => s.platform === platformFilter),
    [slots, platformFilter]);

  const allFilteredSelected = filteredSlots.length > 0 && filteredSlots.every(s => selectedIds.has(s.id));

  const togglePlatform = (id: string) =>
    setSelPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const toggleSlot = (id: string) =>
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(prev => { const s = new Set(prev); filteredSlots.forEach(sl => s.delete(sl.id)); return s; });
    } else {
      setSelectedIds(prev => { const s = new Set(prev); filteredSlots.forEach(sl => s.add(sl.id)); return s; });
    }
  };

  const updateSlot = (updated: CalendarSlot) => {
    setSlots(prev => prev.map(s => s.id === updated.id ? updated : s));
    setEditingSlot(null);
  };

  // ── Generate ─────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!selPlatforms.length) { toast.error('Select at least one platform'); return; }
    if (!startDate || !endDate) { toast.error('Set a date range'); return; }
    if (new Date(startDate) > new Date(endDate)) { toast.error('Start date must be before end date'); return; }

    setGenerating(true);
    setGenError(null);
    setSlots([]);
    setSelectedIds(new Set());
    setSavedCount(null);

    try {
      if (IS_DEMO_MODE) {
        // Simulate network delay then return mock slots
        await new Promise(r => setTimeout(r, 1800));
        const mockSlots = generateMockSlots({
          startDate, endDate,
          platforms: selPlatforms,
          frequency, tone,
          themes: themes.filter(Boolean),
          campaignName: campaignName || 'Campaign',
          brandName: brandName || '',
        });
        setSlots(mockSlots);
        setSelectedIds(new Set(mockSlots.map(s => s.id)));
        toast.success(`${mockSlots.length} slots generated — review and customise`);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Not authenticated');

        const res = await fetch(`${API}/ai/generate-calendar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({
            campaignName: campaignName || 'Campaign',
            brandName, startDate, endDate,
            platforms: selPlatforms, frequency, tone, style,
            targetAudience,
            brandKeywords: brandKeywords.split(/[,\s]+/).filter(Boolean),
            themes: themes.filter(Boolean),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);

        const slotsWithIds: CalendarSlot[] = (data.slots ?? []).map((s: any) => ({ ...s, id: crypto.randomUUID() }));
        setSlots(slotsWithIds);
        setSelectedIds(new Set(slotsWithIds.map(s => s.id)));
        toast.success(`${slotsWithIds.length} slots generated — ${data.tokensUsed?.toLocaleString() ?? '?'} tokens used`);
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Generation failed';
      setGenError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  }, [selPlatforms, startDate, endDate, frequency, tone, style, targetAudience, brandKeywords, themes, campaignName, brandName]);

  // ── Save to board ─────────────────────────────────────────────────────────────
  const handleSaveToBoard = async () => {
    const toSave = slots.filter(s => selectedIds.has(s.id));
    if (!toSave.length) { toast.error('Select at least one slot to save'); return; }
    if (!targetProject) { toast.error('Choose a project to attach cards to'); return; }

    setSaving(true);
    let count = 0;
    try {
      for (const slot of toSave) {
        const card = {
          id:              createCardId(),
          projectId:       targetProject,
          platform:        slot.platform,
          channel:         'social-media',
          title:           `${slot.postType} — ${slot.platform} — ${slot.date}`,
          caption:         slot.caption,
          hashtags:        slot.hashtags,
          scheduledDate:   slot.date,
          scheduledTime:   slot.time,
          status:          'draft' as const,
          approvers:       [],
          createdBy:       user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'AI Planner',
          createdByEmail:  user?.email ?? '',
          createdAt:       new Date(),
          auditLog:        [],
          postType:        slot.postType,
          visualDescription: slot.contentIdea,
          callToAction:    slot.callToAction,
        };
        await addCard(card);
        count++;
      }
      setSavedCount(count);
      setSelectedIds(new Set());
      toast.success(`${count} content card${count !== 1 ? 's' : ''} added to the board as drafts!`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save cards');
    } finally {
      setSaving(false);
    }
  };

  // ── Unique platforms in generated slots ───────────────────────────────────────
  const slotPlatforms = useMemo(() => [...new Set(slots.map(s => s.platform))], [slots]);

  // ── Group slots by date ───────────────────────────────────────────────────────
  const slotsByDate = useMemo(() => {
    const map: Record<string, CalendarSlot[]> = {};
    filteredSlots.forEach(s => { (map[s.date] ??= []).push(s); });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredSlots]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-2xl font-bold ${et.text} flex items-center gap-2`}>
            <CalendarDays className="w-6 h-6 text-[#0BA4AA]" />
            AI Campaign Planner
          </h1>
          <p className={`${et.textFaint} text-sm mt-1`}>
            Set your campaign details, let AI generate a full posting calendar, then save to the Content Board as draft cards.
          </p>
        </div>
      </div>

      {/* ── Two-column layout: Setup + Results ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 items-start">

        {/* ════ LEFT: Campaign Setup ════ */}
        <div className={`${glass} p-5 flex flex-col gap-5 sticky top-4`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0BA4AA] to-[#3E3C70] flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className={`${et.text} font-semibold text-sm`}>Campaign Setup</h2>
          </div>

          {/* Campaign name + brand */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Campaign Name</label>
              <input value={campaignName} onChange={e => setCampaignName(e.target.value)}
                placeholder="Raya 2026 Launch" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Brand / Client</label>
              <input value={brandName} onChange={e => setBrandName(e.target.value)}
                placeholder="Brandtelligence" className={inputCls} />
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className={labelCls}>Campaign Period</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
              <input type="date" value={endDate}   onChange={e => setEndDate(e.target.value)}   className={inputCls} />
            </div>
          </div>

          {/* Posting frequency */}
          <div>
            <label className={labelCls}>Posting Frequency</label>
            <div className="grid grid-cols-3 gap-2">
              {FREQUENCIES.map(f => (
                <button key={f.id} onClick={() => setFrequency(f.id as any)}
                  className={`flex flex-col items-center py-2.5 px-2 rounded-xl border text-[11px] font-semibold transition-all ${
                    frequency === f.id
                      ? 'bg-[#0BA4AA]/12 border-[#0BA4AA]/40 text-[#0BA4AA]'
                      : isDark ? 'bg-white/4 border-white/10 text-white/40 hover:text-white hover:bg-white/8' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                  }`}>
                  <span className="font-bold text-xs">{f.label}</span>
                  <span className="text-[9px] mt-0.5 opacity-70">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className={labelCls}>Platforms <span className="text-[#F47A20] normal-case font-normal">(select all that apply)</span></label>
            <div className="grid grid-cols-2 gap-1.5">
              {PLATFORMS.map(p => {
                const pc = plColors(p, isDark);
                return (
                <button key={p.id} onClick={() => togglePlatform(p.id)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs font-medium transition-all ${
                    selPlatforms.includes(p.id)
                      ? `${pc.bg} ${pc.border} ${pc.color}`
                      : isDark ? 'bg-white/4 border-white/8 text-white/30 hover:text-white/60 hover:bg-white/8' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}>
                  <p.Icon className="w-3 h-3" />
                  {p.label}
                  {selPlatforms.includes(p.id) && <Check className="w-2.5 h-2.5 ml-auto" />}
                </button>
                );
              })}
            </div>
          </div>

          {/* ── Brand Voice ── */}
          <div className={`border-t pt-4 ${et.border}`}>
            <div className="flex items-center gap-1.5 mb-3">
              <Mic className="w-3.5 h-3.5 text-[#F47A20]" />
              <label className={`${labelCls} mb-0`}>Brand Voice</label>
            </div>

            {/* Tone */}
            <div className="mb-3">
              <label className={labelCls}>Tone</label>
              <div className="grid grid-cols-3 gap-1.5">
                {TONES.map(t => (
                  <button key={t.id} onClick={() => setTone(t.id)}
                    className={`flex flex-col items-center py-2 px-1 rounded-xl border text-[10px] font-medium transition-all ${
                      tone === t.id
                        ? 'bg-[#F47A20]/12 border-[#F47A20]/40 text-[#F47A20]'
                        : isDark ? 'bg-white/4 border-white/8 text-white/30 hover:text-white/60' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600'
                    }`}>
                    <span className="text-sm leading-none mb-0.5">{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div className="mb-3">
              <label className={labelCls}>Content Style</label>
              <div className="flex flex-wrap gap-1.5">
                {STYLES.map(s => (
                  <button key={s} onClick={() => setStyle(s)}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                      style === s
                        ? 'bg-[#3E3C70]/20 border-[#3E3C70]/40 text-purple-300'
                        : isDark ? 'bg-white/4 border-white/10 text-white/30 hover:text-white/60' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Target audience */}
            <div className="mb-3">
              <label className={labelCls}>Target Audience</label>
              <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
                placeholder="e.g. Malaysian SME owners aged 30–50" className={inputCls} />
            </div>

            {/* Brand keywords */}
            <div>
              <label className={labelCls}>Brand Keywords <span className={`normal-case font-normal ${et.textFaint}`}>(comma-separated)</span></label>
              <input value={brandKeywords} onChange={e => setBrandKeywords(e.target.value)}
                placeholder="e.g. innovation, trusted, Malaysia" className={inputCls} />
            </div>
          </div>

          {/* ── Campaign Themes ── */}
          <div className={`border-t pt-4 ${et.border}`}>
            <label className={`${labelCls} flex items-center gap-1.5`}>
              <BarChart2 className="w-3.5 h-3.5 text-[#0BA4AA]" /> Campaign Themes
            </label>
            <p className={`text-[10px] ${et.textFaint} mb-2`}>3 themes the AI will rotate across the calendar</p>
            {themes.map((t, i) => (
              <div key={i} className="mb-2">
                <input value={t} onChange={e => { const n = [...themes]; n[i] = e.target.value; setThemes(n); }}
                  placeholder={`Theme ${i + 1}…`} className={inputCls} />
              </div>
            ))}
          </div>

          {/* ── Generate button ── */}
          <button
            onClick={handleGenerate}
            disabled={generating || !selPlatforms.length}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            style={{ background: 'linear-gradient(135deg,#0BA4AA,#3E3C70)' }}
          >
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Calendar…</>
              : slots.length > 0
                ? <><RefreshCw className="w-4 h-4" /> Regenerate Calendar</>
                : <><Sparkles className="w-4 h-4" /> Generate AI Calendar</>
            }
          </button>

          {genError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/8 border border-red-400/20">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300 text-xs leading-snug">{genError}</p>
            </div>
          )}
        </div>

        {/* ════ RIGHT: Generated Calendar ════ */}
        <div className="flex flex-col gap-4">

          {/* No slots yet */}
          {!generating && slots.length === 0 && (
            <div className={`${glass} flex flex-col items-center justify-center py-20 gap-4`}>
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0BA4AA]/10 to-[#3E3C70]/10 border ${et.border} flex items-center justify-center`}>
                <CalendarDays className={`w-8 h-8 ${et.textFaint}`} />
              </div>
              <div className="text-center">
                <p className={`${et.textMd} font-semibold`}>Your AI Calendar will appear here</p>
                <p className={`${et.textFaint} text-sm mt-1`}>Configure your campaign settings and click Generate</p>
              </div>
              <div className={`flex items-center gap-6 ${et.textFaint} text-xs`}>
                <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Multi-platform</span>
                <span className="flex items-center gap-1.5"><Mic className="w-3.5 h-3.5" /> Brand voice</span>
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> AI-optimized</span>
              </div>
            </div>
          )}

          {/* Generating skeleton */}
          {generating && (
            <div className={`${glass} flex flex-col items-center justify-center py-20 gap-4`}>
              <div className="w-14 h-14 rounded-2xl bg-[#0BA4AA]/10 border border-[#0BA4AA]/20 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-[#0BA4AA] animate-pulse" />
              </div>
              <div className="text-center">
                <p className={`${et.textSm} font-semibold`}>AI is building your calendar…</p>
                <p className={`${et.textFaint} text-sm mt-1`}>Crafting captions, optimising times, rotating post types</p>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-2 h-2 rounded-full bg-[#0BA4AA]/60"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }} />
                ))}
              </div>
            </div>
          )}

          {/* Slots result */}
          {!generating && slots.length > 0 && (
            <>
              {/* Toolbar */}
              <div className={`${glass} px-4 py-3 flex items-center gap-3 flex-wrap`}>
                {/* Select all */}
                <button onClick={toggleAll} className={`flex items-center gap-1.5 text-xs transition-colors ${isDark ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                  {allFilteredSelected
                    ? <CheckSquare2 className="w-4 h-4 text-[#0BA4AA]" />
                    : <Square className="w-4 h-4" />
                  }
                  {allFilteredSelected ? 'Deselect all' : 'Select all'}
                </button>

                {/* Platform filter pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button onClick={() => setPlatformFilter('all')}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                      platformFilter === 'all'
                        ? isDark ? 'bg-white/12 border-white/25 text-white' : 'bg-gray-200 border-gray-300 text-gray-900'
                        : isDark ? 'bg-white/4 border-white/10 text-white/30 hover:text-white/60' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600'
                    }`}>
                    All ({slots.length})
                  </button>
                  {slotPlatforms.map(pid => {
                    const p = PL_MAP[pid];
                    const pc = p ? plColors(p, isDark) : null;
                    const cnt = slots.filter(s => s.platform === pid).length;
                    return (
                      <button key={pid} onClick={() => setPlatformFilter(pid)}
                        className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                          platformFilter === pid
                            ? `${pc?.bg ?? (isDark ? 'bg-white/10' : 'bg-gray-200')} ${pc?.border ?? (isDark ? 'border-white/20' : 'border-gray-300')} ${pc?.color ?? et.text}`
                            : isDark ? 'bg-white/4 border-white/10 text-white/30 hover:text-white/60' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600'
                        }`}>
                        {p && <p.Icon className="w-2.5 h-2.5" />}
                        {p?.label ?? pid} ({cnt})
                      </button>
                    );
                  })}
                </div>

                {/* Selection count */}
                <span className={`${et.textFaint} text-xs ml-auto`}>
                  {selectedIds.size} of {slots.length} selected
                </span>
              </div>

              {/* Slot grid grouped by date */}
              <div className="flex flex-col gap-5">
                {slotsByDate.map(([date, dateSlots]) => (
                  <div key={date}>
                    {/* Date header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-3.5 h-3.5 text-[#0BA4AA]" />
                        <span className={`${et.textSm} text-sm font-semibold`}>
                          {new Date(date + 'T00:00:00').toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <div className={`flex-1 h-px ${isDark ? 'bg-white/8' : 'bg-gray-200'}`} />
                      <span className={`${et.textFaint} text-xs`}>{dateSlots.length} post{dateSlots.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dateSlots.map(slot => (
                        <SlotCard
                          key={slot.id}
                          slot={slot}
                          selected={selectedIds.has(slot.id)}
                          onToggle={() => toggleSlot(slot.id)}
                          onEdit={() => setEditingSlot(slot)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Save to Board panel ── */}
              <div className={`${glass} p-5`}>
                <div className="flex items-center gap-2 mb-4">
                  <FolderOpen className="w-4 h-4 text-[#F47A20]" />
                  <h3 className={`${et.text} font-semibold text-sm`}>Save Selected Slots to Content Board</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F47A20]/12 text-[#F47A20] border border-[#F47A20]/25 ml-auto">
                    {selectedIds.size} slot{selectedIds.size !== 1 ? 's' : ''} selected
                  </span>
                </div>

                {savedCount !== null && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-emerald-500/8 border border-emerald-400/20">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-emerald-300 text-sm font-semibold">
                      {savedCount} card{savedCount !== 1 ? 's' : ''} added to the Content Board as drafts.
                      You can now find them in the project's AI Studio board.
                    </p>
                  </motion.div>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Project picker */}
                  <div className="flex-1 min-w-[200px]">
                    <label className={labelCls}>Attach to Project</label>
                    {activeProjects.length === 0 ? (
                      <p className={`${et.textFaint} text-xs italic`}>No active projects found</p>
                    ) : (
                      <div className="relative">
                        <select value={targetProject} onChange={e => setTargetProject(e.target.value)}
                          className={et.selectCls}>
                          {activeProjects.map(p => (
                            <option key={p.id} value={p.id} className={isDark ? 'bg-[#1a1040]' : 'bg-white'}>
                              {p.name} — {p.client}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${et.textFaint} pointer-events-none`} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className={`flex items-start gap-1.5 ${et.textFaint} text-[11px] flex-1 min-w-[160px]`}>
                    <Info className="w-3 h-3 shrink-0 mt-0.5" />
                    Cards are saved as drafts. Submit for approval via the Content Board, then schedule for auto-publish.
                  </div>

                  {/* Save button */}
                  <button
                    onClick={handleSaveToBoard}
                    disabled={saving || selectedIds.size === 0 || !targetProject}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg whitespace-nowrap"
                    style={{ background: 'linear-gradient(135deg,#F47A20,#3E3C70)' }}
                  >
                    {saving
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      : <><Save className="w-4 h-4" /> Save {selectedIds.size} Card{selectedIds.size !== 1 ? 's' : ''} to Board</>
                    }
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Slot edit modal ── */}
      <AnimatePresence>
        {editingSlot && (
          <SlotEditModal
            slot={editingSlot}
            onSave={updateSlot}
            onClose={() => setEditingSlot(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}