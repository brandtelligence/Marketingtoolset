/**
 * ContentGenPage  —  /app/content
 * ─────────────────────────────────────────────────────────────────────────────
 * GPT-4o powered content generation studio.
 *
 * Production → calls POST /ai/generate-content on the server (key is server-side)
 * Demo mode  → uses the existing mock engine so the UI is fully interactive
 *
 * Panels
 *   LEFT   Template picker → per-template structured fields → tone/platform →
 *          Additional Instructions → Generate button + usage meter
 *   RIGHT  Output display → Copy / Save-as-Card / Regenerate → Saved Assets → History
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  Sparkles, Copy, RefreshCw, Trash2, ChevronDown, ChevronUp,
  Clock, Check, Loader2, Info, AlertTriangle, History,
  Zap, Megaphone, FileText, Hash, ClipboardList, MessageSquare,
  X as XIcon, Wand2, Bookmark, BookmarkCheck, FolderOpen, ExternalLink,
  Send, UserCheck, Users,
} from 'lucide-react';
import { useAuth } from '../../components/AuthContext';
import { BackgroundLayout } from '../../components/BackgroundLayout';
import { EmployeeNav } from '../../components/EmployeeNav';
import { supabase } from '../../utils/supabaseClient';
import { IS_PRODUCTION } from '../../config/appConfig';
import { toast } from 'sonner';
import {
  generateContent, fetchContentHistory, deleteContentHistory, fetchContentGenUsage,
  type GenerationRecord, type ContentGenUsageSummary,
} from '../../utils/apiClient';
import { generateInitialResponse } from '../../components/ai/aiEngine';
import { useContent, createCardId, type ContentCard } from '../../contexts/ContentContext';
import { useProjects, availableTeamMembers } from '../../contexts/ProjectsContext';

// ─── Template definitions ─────────────────────────────────────────────────────

const TEMPLATES = [
  { id: 'social_caption', label: 'Social Caption', icon: Zap,           desc: 'Platform-optimised captions with hashtags & CTA' },
  { id: 'ad_copy',        label: 'Ad Copy',         icon: Megaphone,     desc: 'Hook → Body → CTA high-converting ad structure' },
  { id: 'blog_intro',     label: 'Blog Intro',      icon: FileText,      desc: 'SEO-optimised opening paragraph (150–200 words)' },
  { id: 'hashtag_set',    label: 'Hashtag Set',     icon: Hash,          desc: 'Tiered hashtags: high-volume · niche · branded' },
  { id: 'campaign_brief', label: 'Campaign Brief',  icon: ClipboardList, desc: 'Objective · Audience · Pillars · KPIs · Timeline' },
  { id: 'custom',         label: 'Custom / Chat',   icon: MessageSquare, desc: 'Free-form request — anything goes' },
] as const;

type TemplateId = typeof TEMPLATES[number]['id'];

// ─── Structured field system ──────────────────────────────────────────────────

type FieldType = 'text' | 'textarea' | 'select';

interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
  fullWidth?: boolean;
}

const TEMPLATE_FIELDS: Record<TemplateId, TemplateField[]> = {
  social_caption: [
    { id: 'productName',   label: 'Brand / Product Name', type: 'text',   placeholder: 'e.g. Milo Halia, GrabFood, XOX Mobile', required: true },
    { id: 'keyMessage',    label: 'Core Message',          type: 'text',   placeholder: 'e.g. New flavour launch, Hari Raya promo', required: true },
    { id: 'offer',         label: 'Offer or Hook',          type: 'text',   placeholder: 'e.g. 30% off, Limited edition, Free gift' },
    { id: 'cta',           label: 'Call-to-Action',         type: 'select', options: [
        { value: 'Link in bio', label: 'Link in bio' }, { value: 'DM us', label: 'DM us' },
        { value: 'Shop now', label: 'Shop now' }, { value: 'Sign up', label: 'Sign up' },
        { value: 'Learn more', label: 'Learn more' }, { value: 'Swipe up', label: 'Swipe up' },
        { value: 'Book now', label: 'Book now' }, { value: 'Try it free', label: 'Try it free' },
      ]},
    { id: 'captionLength', label: 'Caption Length', type: 'select', options: [
        { value: 'short (under 100 characters)',          label: 'Short  — <100 chars'   },
        { value: 'medium (100–250 characters)',           label: 'Medium — 100–250 chars' },
        { value: 'long storytelling style (300+ chars)',  label: 'Long   — 300+ chars'    },
      ]},
  ],
  ad_copy: [
    { id: 'productName', label: 'Product / Service Name',   type: 'text',     placeholder: 'e.g. Brandtelligence AI Content Studio', required: true },
    { id: 'description', label: 'What It Is & Does',        type: 'textarea', placeholder: 'e.g. An AI-powered platform that generates social media captions in seconds.', required: true, fullWidth: true },
    { id: 'keyBenefit',  label: 'Strongest Single Benefit', type: 'text',     placeholder: 'e.g. Cut content creation time by 80%', required: true },
    { id: 'offer',       label: 'Offer / Incentive',         type: 'text',     placeholder: 'e.g. First month free, 50% off annual plan' },
    { id: 'urgency',     label: 'Urgency / Deadline',        type: 'text',     placeholder: 'e.g. Offer ends 31 March' },
    { id: 'audience',    label: 'Who Is This For',           type: 'text',     placeholder: 'e.g. Malaysian SME owners aged 30–50' },
  ],
  blog_intro: [
    { id: 'title',        label: 'Blog Post Title',     type: 'text',   placeholder: 'e.g. 7 Ways Malaysian Brands Can Win on TikTok in 2026', required: true, fullWidth: true },
    { id: 'targetReader', label: 'Target Reader',       type: 'text',   placeholder: 'e.g. Malaysian startup founders, F&B SME owners',         required: true },
    { id: 'painPoint',    label: 'Problem This Solves', type: 'text',   placeholder: 'e.g. Most brands post on TikTok but get no traction',      required: true, fullWidth: true },
    { id: 'keyword',      label: 'SEO Keyword (opt.)',  type: 'text',   placeholder: 'e.g. TikTok marketing Malaysia' },
    { id: 'angle',        label: 'Article Angle',       type: 'select', options: [
        { value: 'How-To Guide',                 label: 'How-To Guide'              },
        { value: 'Opinion / Thought Leadership', label: 'Opinion / Thought Leadership' },
        { value: 'Listicle (Top X)',              label: 'Listicle (Top X)'          },
        { value: 'Case Study',                   label: 'Case Study'                },
        { value: 'News / Trend Analysis',        label: 'News / Trend Analysis'     },
        { value: "Beginner's Guide",             label: "Beginner's Guide"          },
      ]},
  ],
  hashtag_set: [
    { id: 'niche',        label: 'Industry / Niche',      type: 'text',   placeholder: 'e.g. F&B, beauty, fintech, real estate',              required: true },
    { id: 'contentTheme', label: 'Content Theme',         type: 'text',   placeholder: 'e.g. healthy eating, luxury property, digital banking', required: true },
    { id: 'brand',        label: 'Brand Name (opt.)',     type: 'text',   placeholder: 'e.g. Brandtelligence' },
    { id: 'location',     label: 'Location Focus (opt.)', type: 'text',   placeholder: 'e.g. Malaysia, Kuala Lumpur, Southeast Asia' },
    { id: 'count',        label: 'Hashtags per Tier',     type: 'select', options: [
        { value: '5 hashtags per tier (15 total)',      label: '5 per tier (15 total)'  },
        { value: '10 hashtags per tier (30 total)',     label: '10 per tier (30 total)' },
        { value: 'a mix of 3 high-volume, 5 niche, and 7 branded (15 total)', label: '3/5/7 mix (15 total)' },
      ]},
  ],
  campaign_brief: [
    { id: 'campaignName', label: 'Campaign Name',      type: 'text',   placeholder: 'e.g. Raya 2026 Grand Sale',   required: true },
    { id: 'clientBrand',  label: 'Client / Brand',     type: 'text',   placeholder: 'e.g. Padini Berhad',          required: true },
    { id: 'goal',         label: 'Campaign Objective', type: 'select', required: true, options: [
        { value: 'Brand Awareness',              label: 'Brand Awareness'          },
        { value: 'Lead Generation',              label: 'Lead Generation'          },
        { value: 'Sales / Conversion',           label: 'Sales / Conversion'       },
        { value: 'Product Launch',               label: 'Product Launch'           },
        { value: 'Engagement & Community',       label: 'Engagement & Community'   },
        { value: 'App Downloads',                label: 'App Downloads'            },
        { value: 'Event Promotion',              label: 'Event Promotion'          },
        { value: 'Customer Retention / Loyalty', label: 'Customer Retention'       },
      ]},
    { id: 'audience',  label: 'Target Audience',    type: 'text',   placeholder: 'e.g. Malaysian Muslims aged 25–45, household income RM5k+', required: true, fullWidth: true },
    { id: 'budget',    label: 'Budget Range',        type: 'select', options: [
        { value: 'under RM5,000',       label: 'Under RM5,000'  },
        { value: 'RM5,000 – RM20,000',  label: 'RM5k – RM20k'  },
        { value: 'RM20,000 – RM50,000', label: 'RM20k – RM50k' },
        { value: 'RM50,000 – RM100,000',label: 'RM50k – RM100k' },
        { value: 'over RM100,000',      label: 'RM100k+'       },
        { value: 'not yet specified',   label: 'Not specified'  },
      ]},
    { id: 'duration',  label: 'Campaign Duration',  type: 'text',   placeholder: 'e.g. 4 weeks, April–May 2026' },
  ],
  custom: [],
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPromptFromFields(template: TemplateId, f: Record<string, string>): string {
  const v   = (k: string) => (f[k] ?? '').trim();
  const opt = (k: string, prefix: string) => v(k) ? ` ${prefix}${v(k)}.` : '';

  switch (template) {
    case 'social_caption':
      return [`Write a ${v('captionLength') || 'medium'} social media caption for ${v('productName') || '[Brand]'}.`,
              `Core message: ${v('keyMessage') || '[message]'}.`,
              v('offer') ? `Offer / hook: ${v('offer')}.` : '',
              `Call-to-action: ${v('cta') || 'Link in bio'}.`,
      ].filter(Boolean).join(' ');
    case 'ad_copy':
      return [`Write high-converting ad copy for ${v('productName') || '[Product]'}.`,
              v('description') ? `About the product: ${v('description')}` : '',
              v('keyBenefit') ? `Strongest benefit: ${v('keyBenefit')}.` : '',
              opt('offer', 'Offer/incentive: '), opt('urgency', 'Urgency/deadline: '), opt('audience', 'Target audience: '),
      ].filter(Boolean).join(' ');
    case 'blog_intro':
      return [`Write an SEO-optimised blog post introduction for the article titled: "${v('title') || '[Title]'}".`,
              `Target reader: ${v('targetReader') || '[reader]'}.`,
              v('painPoint') ? `Main problem this solves: ${v('painPoint')}.` : '',
              opt('keyword', 'Primary SEO keyword to include naturally: '),
              `Article angle: ${v('angle') || 'How-To Guide'}.`,
      ].filter(Boolean).join(' ');
    case 'hashtag_set':
      return [`Generate a strategic hashtag set for a ${v('niche') || '[niche]'} brand`,
              v('brand') ? `called "${v('brand')}"` : '', `.`,
              `Content theme: ${v('contentTheme') || '[theme]'}.`,
              opt('location', 'Location focus: '),
              `Provide ${v('count') || '5 hashtags per tier (15 total)'}.`,
      ].filter(Boolean).join(' ').replace('. .', '.').replace('  .', '.');
    case 'campaign_brief':
      return [`Write a detailed campaign brief for ${v('clientBrand') || '[Brand]'} — Campaign name: "${v('campaignName') || '[Campaign]'}".`,
              `Campaign objective: ${v('goal') || 'Brand Awareness'}.`,
              v('audience') ? `Target audience: ${v('audience')}.` : '',
              opt('budget', 'Budget: '), opt('duration', 'Campaign duration: '),
      ].filter(Boolean).join(' ');
    default: return '';
  }
}

function getMissingRequired(template: TemplateId, values: Record<string, string>): string[] {
  return TEMPLATE_FIELDS[template]
    .filter(f => f.required && !(values[f.id] ?? '').trim())
    .map(f => f.label);
}

// ─── Platform + Tone config ───────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram'   },
  { id: 'facebook',  label: 'Facebook'    },
  { id: 'twitter',   label: 'X (Twitter)' },
  { id: 'linkedin',  label: 'LinkedIn'    },
  { id: 'tiktok',    label: 'TikTok'      },
  { id: 'youtube',   label: 'YouTube'     },
  { id: 'general',   label: 'General'     },
];

const TONES = [
  { id: 'professional',   label: 'Professional',   emoji: '🎯' },
  { id: 'conversational', label: 'Conversational', emoji: '🤝' },
  { id: 'creative',       label: 'Creative',       emoji: '🎨' },
  { id: 'authoritative',  label: 'Authoritative',  emoji: '🏆' },
  { id: 'humorous',       label: 'Humorous',       emoji: '😄' },
  { id: 'inspirational',  label: 'Inspirational',  emoji: '⚡' },
] as const;

const TOKEN_LIMIT = 100_000;

// ─── Saved Asset type ─────────────────────────────────────────────────────────

interface SavedAsset {
  id:              string;   // local id (not cardId)
  cardId:          string;   // ContentCard id in ContentContext
  projectId:       string;
  projectName:     string;
  projectRoute:    string;
  template:        TemplateId;
  platform:        string;
  title:           string;
  outputSnippet:   string;   // first 120 chars
  savedAt:         string;   // ISO
  approvalStatus?: 'draft' | 'pending_approval';  // updated after submit
}

const LS_KEY = 'bt_saved_ai_assets';

function loadSavedAssets(): SavedAsset[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch { return []; }
}

function persistSavedAssets(assets: SavedAsset[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(assets.slice(0, 30))); } catch {}
}

// ─── Glassmorphism helpers ────────────────────────────────────────────────────

const glass      = 'backdrop-blur-xl bg-white/8 border border-white/15 rounded-2xl';
const glassInner = 'bg-white/5 border border-white/10 rounded-xl';
const inputCls   = 'w-full bg-white/8 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#0BA4AA]/60 focus:bg-white/10 transition-all';
const selectCls  = 'w-full bg-white/8 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#0BA4AA]/60 focus:bg-white/10 transition-all appearance-none';

// ─── Markdown-lite renderer ───────────────────────────────────────────────────

function renderOutput(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0, key = 0;

  const inlineFormat = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, pi) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={pi} className="font-semibold text-white">{p.slice(2, -2)}</strong>
      : <span key={pi}>{p}</span>
  );

  while (i < lines.length) {
    const line = lines[i];
    if      (line.startsWith('## '))  { elements.push(<h2 key={key++} className="text-lg font-bold text-white mt-5 mb-2 border-b border-white/20 pb-1">{line.slice(3)}</h2>); }
    else if (line.startsWith('### ')) { elements.push(<h3 key={key++} className="text-base font-semibold text-white/90 mt-4 mb-1.5">{line.slice(4)}</h3>); }
    else if (line.startsWith('# '))  { elements.push(<h1 key={key++} className="text-xl font-bold text-white mt-4 mb-2">{line.slice(2)}</h1>); }
    else if (line.startsWith('> '))   { elements.push(<blockquote key={key++} className="border-l-4 border-[#0BA4AA] pl-4 my-2 text-white/80 italic text-sm">{inlineFormat(line.slice(2))}</blockquote>); }
    else if (/^\|.+\|/.test(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\|.+\|/.test(lines[i])) {
        if (!/^[\|\s\-:]+$/.test(lines[i])) tableLines.push(lines[i]);
        i++;
      }
      elements.push(<div key={key++} className="overflow-x-auto my-3"><table className="text-sm text-white/80 w-full border-collapse">{tableLines.map((tl, ti) => { const cells = tl.split('|').filter((_, ci) => ci > 0 && ci < tl.split('|').length - 1); return (<tr key={ti} className={ti === 0 ? 'border-b border-white/30' : 'border-b border-white/10'}>{cells.map((c, ci) => <td key={ci} className={`px-3 py-1.5 ${ti === 0 ? 'font-semibold text-white' : ''}`}>{inlineFormat(c.trim())}</td>)}</tr>); })}</table></div>);
      continue;
    }
    else if (line.startsWith('- ') || line.startsWith('• ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('• '))) { items.push(lines[i].slice(2)); i++; }
      elements.push(<ul key={key++} className="list-none space-y-1 my-2 pl-0">{items.map((item, ii) => <li key={ii} className="flex gap-2 text-sm text-white/85"><span className="text-[#0BA4AA] shrink-0 mt-0.5">•</span><span>{inlineFormat(item)}</span></li>)}</ul>);
      continue;
    }
    else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, '')); i++; }
      elements.push(<ol key={key++} className="list-none space-y-1.5 my-2">{items.map((item, ii) => <li key={ii} className="flex gap-2.5 text-sm text-white/85"><span className="text-[#0BA4AA] font-bold shrink-0 w-5">{ii + 1}.</span><span>{inlineFormat(item)}</span></li>)}</ol>);
      continue;
    }
    else if (line === '---')      { elements.push(<hr key={key++} className="border-white/20 my-4" />); }
    else if (line.trim() === '')  { elements.push(<div key={key++} className="h-2" />); }
    else                          { elements.push(<p key={key++} className="text-sm text-white/85 leading-relaxed">{inlineFormat(line)}</p>); }
    i++;
  }
  return <>{elements}</>;
}

// ─── TemplateFieldForm ────────────────────────────────────────────────────────

function TemplateFieldForm({ template, values, onChange }: {
  template: TemplateId;
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
}) {
  const fields = TEMPLATE_FIELDS[template];
  if (!fields || fields.length === 0) return null;
  return (
    <motion.div key={template} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} className="flex flex-col gap-2.5">
      {fields.map(field => (
        <div key={field.id} className={field.fullWidth ? 'col-span-2' : ''}>
          <label className="flex items-center gap-1 text-xs text-white/50 mb-1.5">
            {field.label}{field.required && <span className="text-[#F47A20]">*</span>}
          </label>
          {field.type === 'select' ? (
            <div className="relative">
              <select value={values[field.id] ?? ''} onChange={e => onChange(field.id, e.target.value)} className={selectCls}>
                {!field.required && <option value="" className="bg-[#1a1040]">— Select —</option>}
                {field.options!.map(o => <option key={o.value} value={o.value} className="bg-[#1a1040]">{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            </div>
          ) : field.type === 'textarea' ? (
            <textarea value={values[field.id] ?? ''} onChange={e => onChange(field.id, e.target.value)} placeholder={field.placeholder} rows={2} className={`${inputCls} resize-none leading-relaxed`} style={{ minHeight: '60px', maxHeight: '120px' }} />
          ) : (
            <input type="text" value={values[field.id] ?? ''} onChange={e => onChange(field.id, e.target.value)} placeholder={field.placeholder} className={inputCls} />
          )}
        </div>
      ))}
    </motion.div>
  );
}

// ─── PromptPreview ────────────────────────────────────────────────────────────

function PromptPreview({ prompt }: { prompt: string }) {
  if (!prompt) return null;
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
      <div className="mt-2 px-3 py-2.5 rounded-xl bg-[#0BA4AA]/8 border border-[#0BA4AA]/20">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Wand2 className="w-3 h-3 text-[#0BA4AA]" />
          <span className="text-[10px] font-semibold text-[#0BA4AA]/80 uppercase tracking-wider">Auto-built prompt</span>
        </div>
        <p className="text-[12px] text-white/55 leading-relaxed line-clamp-3">{prompt}</p>
      </div>
    </motion.div>
  );
}

// ─── SaveAsCardModal ──────────────────────────────────────────────────────────

function SaveAsCardModal({
  output, template, platform, tone,
  currentFields,
  onSave, onClose, isSaving,
}: {
  output: string;
  template: TemplateId;
  platform: string;
  tone: string;
  currentFields: Record<string, string>;
  onSave: (title: string, projectId: string) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const { projects } = useProjects();
  const activeProjects = projects.filter(p => p.status === 'active');

  const defaultTitle = (() => {
    const t = TEMPLATES.find(t => t.id === template)!;
    const d = new Date();
    const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    return `${t.label} — ${mon} ${d.getDate()}, ${d.getFullYear()}`;
  })();

  const [title,     setTitle]     = useState(defaultTitle);
  const [projectId, setProjectId] = useState(activeProjects[0]?.id ?? '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md backdrop-blur-xl bg-[#0d0b2a]/90 border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0BA4AA] to-[#F47A20] flex items-center justify-center">
              <Bookmark className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-white">Save as Draft Card</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Card title */}
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">
              Card Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={inputCls}
              placeholder="e.g. Instagram Caption — Raya Launch"
              autoFocus
            />
          </div>

          {/* Project picker */}
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">
              Attach to Project <span className="text-[#F47A20]">*</span>
            </label>
            {activeProjects.length === 0 ? (
              <p className="text-sm text-white/40 italic">No active projects found.</p>
            ) : (
              <div className="relative">
                <select value={projectId} onChange={e => setProjectId(e.target.value)} className={selectCls}>
                  {activeProjects.map(p => (
                    <option key={p.id} value={p.id} className="bg-[#1a1040]">
                      {p.name} — {p.client}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Output preview */}
          <div>
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">
              Content Preview
            </label>
            <div className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 max-h-28 overflow-y-auto">
              <p className="text-[12px] text-white/55 leading-relaxed whitespace-pre-wrap">
                {output.slice(0, 300)}{output.length > 300 ? '…' : ''}
              </p>
            </div>
          </div>

          {/* Meta badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] px-2 py-1 rounded-full bg-[#0BA4AA]/15 text-[#0BA4AA] border border-[#0BA4AA]/25">
              {TEMPLATES.find(t => t.id === template)?.label}
            </span>
            <span className="text-[11px] px-2 py-1 rounded-full bg-white/8 text-white/50 border border-white/10">
              {PLATFORMS.find(p => p.id === platform)?.label ?? platform}
            </span>
            <span className="text-[11px] px-2 py-1 rounded-full bg-[#F47A20]/15 text-[#F47A20]/80 border border-[#F47A20]/20">
              {TONES.find(t => t.id === tone)?.emoji} {TONES.find(t => t.id === tone)?.label}
            </span>
            <span className="text-[11px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Draft
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/10 bg-white/3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/8 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(title.trim() || defaultTitle, projectId)}
            disabled={isSaving || !projectId || !title.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#0BA4AA,#F47A20)' }}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookmarkCheck className="w-3.5 h-3.5" />}
            <span>{isSaving ? 'Saving…' : 'Save as Draft'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── SubmitApprovalModal ──────────────────────────────────────────────────────

function SubmitApprovalModal({
  asset,
  onClose,
  onDone,
}: {
  asset: SavedAsset;
  onClose: () => void;
  onDone: (assetId: string) => void;
}) {
  const { cards, updateCard, addAuditEntry, logApprovalEvent } = useContent();
  const { projects } = useProjects();
  const { user }     = useAuth();
  const navigate     = useNavigate();

  const card    = cards.find(c => c.id === asset.cardId);
  const project = projects.find(p => p.id === asset.projectId);

  // Team members from the project
  const projectMembers = project
    ? availableTeamMembers.filter(m => project.teamMembers.includes(m.id))
    : availableTeamMembers.slice(0, 6);  // fallback: first 6

  const [selectedIds,  setSelectedIds]  = useState<string[]>([]);
  const [noteText,     setNoteText]     = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggle = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = async () => {
    if (!card || selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      const performer      = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'AI Studio';
      const performerEmail = user?.email ?? '';
      const approverNames  = selectedIds
        .map(id => { const m = availableTeamMembers.find(m => m.id === id); return m ? `${m.firstName} ${m.lastName}` : id; })
        .join(', ');

      const updatedCard: ContentCard = {
        ...card,
        status:        'pending_approval',
        approvers:     selectedIds,
        lastEditedBy:  performer,
        lastEditedAt:  new Date(),
      };
      updateCard(updatedCard);

      addAuditEntry(card.id, {
        action:            'submitted_for_approval',
        performedBy:       performer,
        performedByEmail:  performerEmail,
        timestamp:         new Date(),
        details:           `Submitted to: ${approverNames}${noteText.trim() ? ` — "${noteText.trim()}"` : ''} · Via AI Content Studio`,
      });

      logApprovalEvent({
        id:               crypto.randomUUID(),
        cardId:           card.id,
        cardTitle:        card.title,
        platform:         card.platform,
        action:           'submitted_for_approval',
        performedBy:      performer,
        performedByEmail: performerEmail,
        timestamp:        new Date().toISOString(),
      });

      toast.success(`Submitted for approval to ${approverNames}`, {
        action: { label: 'View Project', onClick: () => navigate(asset.projectRoute) },
      });

      onDone(asset.id);
    } catch (err: any) {
      console.error('[SubmitApprovalModal] error:', err);
      toast.error(err?.message ?? 'Submit failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const templateMeta = TEMPLATES.find(t => t.id === asset.template);
  const Icon         = templateMeta?.icon ?? MessageSquare;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-lg backdrop-blur-xl bg-[#0d0b2a]/92 border border-white/20 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F47A20] to-[#3E3C70] flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-white">Submit for Approval</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">

          {/* Card identity */}
          <div className="flex items-start gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/10">
            <div className="w-8 h-8 rounded-lg bg-[#0BA4AA]/15 border border-[#0BA4AA]/25 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-[#0BA4AA]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{asset.title}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[11px] text-[#F47A20]/80 flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />{asset.projectName}
                </span>
                <span className="text-[11px] text-white/35">·</span>
                <span className="text-[11px] text-[#0BA4AA]/70">{templateMeta?.label}</span>
                {!card && (
                  <span className="text-[11px] text-red-400 ml-auto">Card not found in context</span>
                )}
              </div>
            </div>
          </div>

          {/* Content preview */}
          <div>
            <label className="text-xs font-semibold text-white/45 uppercase tracking-wider mb-1.5 block">
              Content Preview
            </label>
            <div className="px-3 py-2.5 rounded-xl bg-white/4 border border-white/8 max-h-24 overflow-y-auto">
              <p className="text-[12px] text-white/50 leading-relaxed whitespace-pre-wrap">
                {asset.outputSnippet}{asset.outputSnippet.length >= 120 ? '…' : ''}
              </p>
            </div>
          </div>

          {/* Approver selection */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5 text-[#F47A20]" />
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Select Approvers <span className="text-[#F47A20]">*</span>
              </label>
              {selectedIds.length > 0 && (
                <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-[#F47A20]/15 text-[#F47A20] border border-[#F47A20]/25">
                  {selectedIds.length} selected
                </span>
              )}
            </div>

            {projectMembers.length === 0 ? (
              <p className="text-sm text-white/35 italic px-2">No team members found for this project.</p>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/8">
                {projectMembers.map(member => {
                  const isSelected = selectedIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      onClick={() => toggle(member.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${
                        isSelected
                          ? 'bg-[#F47A20]/10 hover:bg-[#F47A20]/15'
                          : 'bg-white/3 hover:bg-white/6'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold ${
                        isSelected ? 'bg-[#F47A20]/30 text-[#F47A20]' : 'bg-white/10 text-white/50'
                      }`}>
                        {member.firstName[0]}{member.lastName[0]}
                      </div>
                      {/* Name + role */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-tight ${isSelected ? 'text-white' : 'text-white/70'}`}>
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-[10px] text-white/35 leading-tight">{member.jobTitle}</p>
                      </div>
                      {/* Check */}
                      <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'bg-[#F47A20] border-[#F47A20]'
                          : 'bg-transparent border-white/20'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Note to approvers */}
          <div>
            <label className="text-xs font-semibold text-white/45 uppercase tracking-wider mb-1.5 block">
              Note to Approvers <span className="text-white/25 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="e.g. Please review before end of day — this is for tomorrow's campaign launch"
              rows={2}
              className={`${inputCls} resize-none leading-relaxed`}
              style={{ minHeight: '60px', maxHeight: '100px' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-white/10 bg-white/3 shrink-0">
          <p className="text-[11px] text-white/30">
            {selectedIds.length === 0
              ? 'Select at least one approver to continue'
              : `Will notify ${selectedIds.length} approver${selectedIds.length !== 1 ? 's' : ''}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/8 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedIds.length === 0 || !card}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#F47A20,#3E3C70)' }}
            >
              {isSubmitting
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Submitting…</span></>
                : <><Send className="w-3.5 h-3.5" /><span>Submit for Approval</span></>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── SavedAssetsPanel ─────────────────────────────────────────────────────────

function SavedAssetsPanel({
  assets, onRemove, onSubmitForApproval,
}: {
  assets: SavedAsset[];
  onRemove: (id: string) => void;
  onSubmitForApproval: (asset: SavedAsset) => void;
}) {
  const navigate = useNavigate();
  if (assets.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${glass} p-4`}
    >
      <div className="flex items-center gap-2 mb-3">
        <BookmarkCheck className="w-4 h-4 text-[#0BA4AA]" />
        <h3 className="text-sm font-semibold text-white">Saved as Draft Cards</h3>
        <span className="ml-auto text-[11px] text-white/35">{assets.length} item{assets.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {assets.map(asset => {
          const templateMeta = TEMPLATES.find(t => t.id === asset.template);
          const Icon         = templateMeta?.icon ?? MessageSquare;
          const timeAgo      = formatTimeAgo(asset.savedAt);
          const isPending    = asset.approvalStatus === 'pending_approval';

          return (
            <div
              key={asset.id}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all group ${
                isPending
                  ? 'bg-[#F47A20]/6 border-[#F47A20]/20'
                  : 'bg-white/4 border-white/8 hover:bg-white/6'
              }`}
            >
              {/* Template icon */}
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                isPending
                  ? 'bg-[#F47A20]/15 border-[#F47A20]/30'
                  : 'bg-[#0BA4AA]/15 border-[#0BA4AA]/25'
              }`}>
                <Icon className={`w-3.5 h-3.5 ${isPending ? 'text-[#F47A20]' : 'text-[#0BA4AA]'}`} />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-semibold text-white/80 truncate">{asset.title}</span>
                  {isPending && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F47A20]/15 text-[#F47A20] border border-[#F47A20]/25 shrink-0">
                      Pending
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <FolderOpen className="w-3 h-3 text-[#F47A20]/70 shrink-0" />
                  <span className="text-[11px] text-[#F47A20]/70 truncate">{asset.projectName}</span>
                  <span className="text-[10px] text-white/25 ml-auto shrink-0">{timeAgo}</span>
                </div>
                <p className="text-[11px] text-white/40 line-clamp-1 leading-snug">{asset.outputSnippet}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Submit for approval — only shows when still draft */}
                {!isPending && (
                  <button
                    onClick={() => onSubmitForApproval(asset)}
                    title="Submit for approval"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[#F47A20]/10 border border-[#F47A20]/25 text-[#F47A20]/80 hover:bg-[#F47A20]/20 hover:text-[#F47A20] transition-all"
                  >
                    <Send className="w-3 h-3" />
                    <span className="hidden sm:inline">Approve</span>
                  </button>
                )}
                {isPending && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[#F47A20]/8 border border-[#F47A20]/15 text-[#F47A20]/50 cursor-default">
                    <UserCheck className="w-3 h-3" />
                    <span className="hidden sm:inline">Submitted</span>
                  </span>
                )}
                <button
                  onClick={() => navigate(asset.projectRoute)}
                  title="View in project"
                  className="p-1.5 rounded-lg text-white/30 hover:text-[#0BA4AA] hover:bg-[#0BA4AA]/10 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onRemove(asset.id)}
                  title="Remove from list"
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ContentGenPage() {
  const { user }                   = useAuth();
  const { addCard }                = useContent();
  const { projects }               = useProjects();
  const navigate                   = useNavigate();

  // Template / platform / tone
  const [template,    setTemplate]    = useState<TemplateId>('social_caption');
  const [platform,    setPlatform]    = useState('instagram');
  const [tone,        setTone]        = useState('professional');

  // Per-template structured field values
  const [fieldValues, setFieldValues] = useState<Record<TemplateId, Record<string, string>>>({
    social_caption: {}, ad_copy: {}, blog_intro: {}, hashtag_set: {}, campaign_brief: {}, custom: {},
  });

  // Additional free-form instructions
  const [extraInstructions, setExtraInstructions] = useState('');

  // Generation state
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [output,        setOutput]        = useState('');
  const [lastTokens,    setLastTokens]    = useState(0);
  const [lastModel,     setLastModel]     = useState('');
  const [copied,        setCopied]        = useState(false);

  // History + usage
  const [history,         setHistory]         = useState<GenerationRecord[]>([]);
  const [usage,           setUsage]           = useState<ContentGenUsageSummary | null>(null);
  const [showHistory,     setShowHistory]     = useState(false);
  const [loadingHistory,  setLoadingHistory]  = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // Save-as-card state
  const [savedAssets,   setSavedAssets]   = useState<SavedAsset[]>(() => loadSavedAssets());
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaving,      setIsSaving]      = useState(false);
  const [justSaved,     setJustSaved]     = useState(false);

  // Submit-for-approval state
  const [approvalTarget, setApprovalTarget] = useState<SavedAsset | null>(null);

  // Prompt preview
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const outputRef = useRef<HTMLDivElement>(null);

  // ── Persist saved assets whenever they change ─────────────────────────────
  useEffect(() => { persistSavedAssets(savedAssets); }, [savedAssets]);

  // ── Get access token ──────────────────────────────────────────────────────
  const getToken = useCallback(async (): Promise<string | null> => {
    if (!IS_PRODUCTION) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const tenantKey = user?.tenantId ?? user?.supabaseUid ?? 'demo';

  // ── Load history + usage on mount ────────────────────────────────────────
  useEffect(() => {
    if (!IS_PRODUCTION) return;
    (async () => {
      setLoadingHistory(true);
      try {
        const token = await getToken();
        if (!token) return;
        const [hist, use] = await Promise.all([
          fetchContentHistory(tenantKey, token, 20),
          fetchContentGenUsage(tenantKey, token),
        ]);
        setHistory(hist);
        setUsage(use);
      } catch (err) {
        console.error('[ContentGenPage] load history/usage error:', err);
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, [tenantKey, getToken]);

  // ── Field helpers ─────────────────────────────────────────────────────────
  const setField = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [template]: { ...prev[template], [fieldId]: value } }));
  };

  const currentFields     = fieldValues[template] ?? {};
  const structuredPrompt  = template === 'custom' ? '' : buildPromptFromFields(template, currentFields);
  const hasStructuredFields = TEMPLATE_FIELDS[template].length > 0;

  const getFinalPrompt = (): string => {
    if (template === 'custom') return extraInstructions.trim();
    const base  = structuredPrompt;
    const extra = extraInstructions.trim();
    return extra ? `${base}\n\nAdditional instructions: ${extra}` : base;
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (template !== 'custom') {
      const missing = getMissingRequired(template, currentFields);
      if (missing.length > 0) { toast.error(`Please fill in: ${missing.join(', ')}`); return; }
    }
    const finalPrompt = getFinalPrompt();
    if (!finalPrompt) { toast.error(template === 'custom' ? 'Please enter your prompt' : 'Please fill in the required fields'); return; }

    setIsGenerating(true);
    setOutput('');
    setActiveHistoryId(null);
    setJustSaved(false);

    try {
      if (IS_PRODUCTION) {
        const token = await getToken();
        if (!token) { toast.error('Session expired — please sign in again'); setIsGenerating(false); return; }
        const result = await generateContent({ template, platform, tone, prompt: finalPrompt }, token);
        setOutput(result.output);
        setLastTokens(result.tokensUsed);
        setLastModel(result.model);
        setUsage(result.usage);
        const newRecord: GenerationRecord = {
          id: result.id, tenantId: tenantKey,
          userId: user?.supabaseUid ?? '', userName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
          template, platform, tone,
          prompt: finalPrompt.slice(0, 500),
          output: result.output, tokensUsed: result.tokensUsed, model: result.model,
          createdAt: new Date().toISOString(),
        };
        setHistory(prev => [newRecord, ...prev].slice(0, 20));
        toast.success(`Generated! ${result.tokensUsed.toLocaleString()} tokens used`);
      } else {
        await new Promise(r => setTimeout(r, 1200));
        const mockOutput = generateInitialResponse({
          projectName:        currentFields['productName'] || currentFields['clientBrand'] || currentFields['brand'] || 'Your Brand',
          projectDescription: finalPrompt,
          channel:            'social-media',
          platforms:          [platform === 'general' ? 'instagram' : platform],
          actions:            [template === 'social_caption' ? 'copywriting' : template === 'ad_copy' ? 'copywriting' : template === 'blog_intro' ? 'content-plan' : template === 'hashtag_set' ? 'research' : template === 'campaign_brief' ? 'content-plan' : 'copywriting'],
        });
        setOutput(mockOutput);
        setLastTokens(0);
        setLastModel('mock');
        toast.success('Demo output generated');
      }
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err: any) {
      console.error('[ContentGenPage] generate error:', err);
      toast.error(err?.message ?? 'Generation failed — check console for details');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Copy ──────────────────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Save as ContentCard ───────────────────────────────────────────────────
  const handleSaveAsCard = async (title: string, projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !output) return;

    setIsSaving(true);
    try {
      // Extract hashtags if this is a hashtag_set template (look for #word patterns)
      const hashtags: string[] = template === 'hashtag_set'
        ? (output.match(/#([a-zA-Z0-9_]+)/g) ?? []).map(h => h.slice(1)).slice(0, 30)
        : [];

      const newCard: ContentCard = {
        id:             createCardId(),
        projectId,
        platform:       template === 'campaign_brief' ? 'general' : platform,
        channel:        'social-media',
        title,
        caption:        output,
        hashtags,
        status:         'draft',
        approvers:      [],
        createdBy:      `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'AI Studio',
        createdByEmail: user?.email ?? '',
        createdAt:      new Date(),
        auditLog: [{
          id:                `ai_${Date.now()}`,
          action:            'created',
          performedBy:       `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'AI Studio',
          performedByEmail:  user?.email ?? '',
          timestamp:         new Date(),
          details:           `Created from AI Content Studio · Template: ${TEMPLATES.find(t => t.id === template)?.label} · Model: ${lastModel || 'mock'}`,
        }],
      };

      addCard(newCard);

      // Track in local saved assets
      const asset: SavedAsset = {
        id:           crypto.randomUUID(),
        cardId:       newCard.id,
        projectId,
        projectName:  project.name,
        projectRoute: `/app/projects/${project.route.split('/').pop()}`,
        template,
        platform,
        title,
        outputSnippet: output.slice(0, 120),
        savedAt:      new Date().toISOString(),
      };
      setSavedAssets(prev => [asset, ...prev].slice(0, 30));
      setJustSaved(true);
      setShowSaveModal(false);
      toast.success(`Saved to "${project.name}" as a draft card`, {
        action: {
          label: 'View Project',
          onClick: () => navigate(asset.projectRoute),
        },
      });
    } catch (err: any) {
      console.error('[ContentGenPage] save as card error:', err);
      toast.error(err?.message ?? 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete history item ───────────────────────────────────────────────────
  const handleDeleteHistory = async (id: string) => {
    try {
      if (IS_PRODUCTION) {
        const token = await getToken();
        if (token) await deleteContentHistory(id, tenantKey, token);
      }
      setHistory(prev => prev.filter(r => r.id !== id));
      if (activeHistoryId === id) { setActiveHistoryId(null); setOutput(''); }
      toast.success('Deleted');
    } catch (err: any) {
      toast.error(err?.message ?? 'Delete failed');
    }
  };

  // ── Restore from history ──────────────────────────────────────────────────
  const handleRestoreHistory = (rec: GenerationRecord) => {
    setOutput(rec.output);
    setTemplate(rec.template as TemplateId);
    setPlatform(rec.platform);
    setTone(rec.tone);
    setExtraInstructions('');
    setLastTokens(rec.tokensUsed);
    setLastModel(rec.model);
    setActiveHistoryId(rec.id);
    setJustSaved(false);
    setShowHistory(false);
    setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  // ── Remove saved asset from local list ────────────────────────────────────
  const handleRemoveSavedAsset = (id: string) => {
    setSavedAssets(prev => prev.filter(a => a.id !== id));
  };

  // ── Mark saved asset as pending_approval after successful submit ──────────
  const handleApprovalDone = (assetId: string) => {
    setSavedAssets(prev =>
      prev.map(a => a.id === assetId ? { ...a, approvalStatus: 'pending_approval' } : a)
    );
    setApprovalTarget(null);
  };

  // ── Usage bar ─────────────────────────────────────────────────────────────
  const usageTokens = usage?.tokens ?? 0;
  const usageLimit  = usage?.limit  ?? TOKEN_LIMIT;
  const usagePct    = Math.min((usageTokens / usageLimit) * 100, 100);
  const usageColor  = usagePct > 85 ? 'bg-red-500' : usagePct > 65 ? 'bg-[#F47A20]' : 'bg-[#0BA4AA]';

  if (!user) return null;

  const selectedTemplate = TEMPLATES.find(t => t.id === template)!;
  const canGenerate = !isGenerating && (
    template === 'custom'
      ? extraInstructions.trim().length > 0
      : getMissingRequired(template, currentFields).length === 0
  );

  return (
    <BackgroundLayout>
      <EmployeeNav />

      {/* Save-as-card modal */}
      <AnimatePresence>
        {showSaveModal && (
          <SaveAsCardModal
            output={output}
            template={template}
            platform={platform}
            tone={tone}
            currentFields={currentFields}
            isSaving={isSaving}
            onSave={handleSaveAsCard}
            onClose={() => setShowSaveModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Submit-for-approval modal */}
      <AnimatePresence>
        {approvalTarget && (
          <SubmitApprovalModal
            asset={approvalTarget}
            onClose={() => setApprovalTarget(null)}
            onDone={handleApprovalDone}
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0BA4AA] to-[#F47A20] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">AI Content Studio</h1>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#0BA4AA]/20 text-[#0BA4AA] border border-[#0BA4AA]/30">GPT-4o</span>
            </div>
            <p className="text-white/55 text-sm">Generate on-brand social media content, ad copy, and campaign assets instantly.</p>
          </div>

          <div className="flex items-center gap-2">
            {savedAssets.length > 0 && (() => {
              const pendingCount = savedAssets.filter(a => a.approvalStatus === 'pending_approval').length;
              return (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0BA4AA]/10 border border-[#0BA4AA]/25 text-[#0BA4AA] text-sm">
                    <BookmarkCheck className="w-4 h-4" />
                    <span className="font-medium">{savedAssets.length}</span>
                    <span className="text-[#0BA4AA]/70">saved</span>
                  </span>
                  {pendingCount > 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F47A20]/10 border border-[#F47A20]/25 text-[#F47A20] text-sm">
                      <Send className="w-3.5 h-3.5" />
                      <span className="font-medium">{pendingCount}</span>
                      <span className="text-[#F47A20]/70">pending</span>
                    </span>
                  )}
                </div>
              );
            })()}
            <button
              onClick={() => setShowHistory(h => !h)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/8 border border-white/15 text-white/70 hover:text-white hover:bg-white/12 transition-all text-sm"
            >
              <History className="w-4 h-4" />
              <span>History</span>
              {history.length > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-[#0BA4AA]/30 text-[#0BA4AA] text-xs flex items-center justify-center font-bold">
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </motion.div>

        {/* Demo mode banner */}
        {!IS_PRODUCTION && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Demo mode</strong> — outputs come from the built-in mock engine.
              Sign in with a real Brandtelligence account to use live GPT-4o generation.
              Saving assets to projects works in demo mode.
            </span>
          </motion.div>
        )}

        {/* ── Main two-panel layout ────────────────────────────────────────── */}
        <div className="flex gap-5 items-start flex-col lg:flex-row">

          {/* ── LEFT PANEL ───────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
            className={`${glass} p-5 flex flex-col gap-5 w-full lg:w-80 lg:sticky lg:top-20 shrink-0`}
          >
            {/* Template selector */}
            <div>
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2.5 block">Template</label>
              <div className="grid grid-cols-1 gap-1.5">
                {TEMPLATES.map(t => {
                  const Icon = t.icon;
                  const isActive = template === t.id;
                  return (
                    <button key={t.id} onClick={() => { setTemplate(t.id); setOutput(''); setActiveHistoryId(null); setJustSaved(false); }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-sm ${isActive ? 'bg-[#0BA4AA]/20 border border-[#0BA4AA]/50 text-white' : 'bg-white/5 border border-white/10 text-white/65 hover:text-white hover:bg-white/8'}`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#0BA4AA]' : ''}`} />
                      <div className="min-w-0">
                        <div className="font-medium leading-tight">{t.label}</div>
                        <div className="text-[11px] text-white/40 leading-tight mt-0.5 truncate">{t.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Structured template fields */}
            <AnimatePresence mode="wait">
              {hasStructuredFields && (
                <motion.div key={`fields-${template}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[10px] font-semibold text-white/35 uppercase tracking-widest whitespace-nowrap">{selectedTemplate.label} Fields</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <TemplateFieldForm template={template} values={currentFields} onChange={setField} />
                  {structuredPrompt && (
                    <>
                      <button onClick={() => setShowPromptPreview(p => !p)} className="flex items-center gap-1.5 text-[11px] text-[#0BA4AA]/70 hover:text-[#0BA4AA] transition-colors mt-2.5">
                        <Wand2 className="w-3 h-3" />
                        <span>{showPromptPreview ? 'Hide' : 'Preview'} auto-built prompt</span>
                        {showPromptPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      <AnimatePresence>{showPromptPreview && <PromptPreview prompt={structuredPrompt} />}</AnimatePresence>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Platform */}
            {template !== 'campaign_brief' && (
              <div>
                <div className="h-px bg-white/10 mb-4" />
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Platform</label>
                <div className="relative">
                  <select value={platform} onChange={e => setPlatform(e.target.value)} className={selectCls}>
                    {PLATFORMS.map(p => <option key={p.id} value={p.id} className="bg-[#1a1040] text-white">{p.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Tone */}
            <div>
              {template === 'campaign_brief' && <div className="h-px bg-white/10 mb-4" />}
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Tone</label>
              <div className="grid grid-cols-2 gap-1.5">
                {TONES.map(t => (
                  <button key={t.id} onClick={() => setTone(t.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${tone === t.id ? 'bg-[#F47A20]/20 border border-[#F47A20]/50 text-white' : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/8'}`}
                  >
                    <span>{t.emoji}</span><span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional instructions / raw prompt */}
            <div className="flex flex-col gap-2">
              <div className="h-px bg-white/10" />
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                {template === 'custom' ? 'Your Prompt' : 'Additional Instructions'}
                {template !== 'custom' && <span className="normal-case font-normal text-white/30 ml-1">(optional)</span>}
              </label>
              <textarea
                value={extraInstructions}
                onChange={e => {
                  setExtraInstructions(e.target.value);
                  e.currentTarget.style.height = 'auto';
                  e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 160) + 'px';
                }}
                placeholder={template === 'custom' ? 'Ask me anything — write, rewrite, translate, brainstorm…' : 'Any extra nuance, constraints, or style notes…'}
                rows={template === 'custom' ? 4 : 2}
                className={`${inputCls} resize-none leading-relaxed`}
                style={{ minHeight: template === 'custom' ? '96px' : '60px', maxHeight: '160px' }}
              />
              {extraInstructions && (
                <button onClick={() => setExtraInstructions('')} className="self-end text-[11px] text-white/30 hover:text-white/60 transition-colors">Clear</button>
              )}
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="relative flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
              style={{ background: isGenerating ? 'rgba(11,164,170,0.4)' : 'linear-gradient(135deg,#0BA4AA,#F47A20)' }}
            >
              {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Generating…</span></> : <><Sparkles className="w-4 h-4" /><span>Generate Content</span></>}
            </button>

            {/* Usage meter */}
            {IS_PRODUCTION && (
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-white/40">Monthly Token Usage</span>
                  <span className="text-[11px] text-white/40">{usageTokens.toLocaleString()} / {usageLimit.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${usagePct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className={`h-full rounded-full ${usageColor}`} />
                </div>
                {usage?.period && <p className="text-[10px] text-white/25 mt-1 text-right">{usage.period}</p>}
                {usagePct > 85 && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-red-300">
                    <AlertTriangle className="w-3 h-3 shrink-0" /><span>Approaching monthly limit</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* ── RIGHT PANEL ──────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* History overlay */}
            <AnimatePresence>
              {showHistory && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className={`${glass} p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-[#0BA4AA]" />
                      <h3 className="text-sm font-semibold text-white">Recent Generations</h3>
                    </div>
                    <button onClick={() => setShowHistory(false)} className="text-white/40 hover:text-white transition-colors"><XIcon className="w-4 h-4" /></button>
                  </div>
                  {loadingHistory ? (
                    <div className="flex items-center gap-2 text-white/40 text-sm py-4 justify-center"><Loader2 className="w-4 h-4 animate-spin" /><span>Loading history…</span></div>
                  ) : history.length === 0 ? (
                    <p className="text-white/35 text-sm text-center py-6">No generations yet — create your first one!</p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {history.map(rec => (
                        <HistoryRow key={rec.id} rec={rec} isActive={activeHistoryId === rec.id} onRestore={handleRestoreHistory} onDelete={handleDeleteHistory} />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Output area */}
            <motion.div ref={outputRef} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className={`${glass} overflow-hidden`}>
              {/* Output header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
                <div className="flex items-center gap-2 flex-wrap">
                  <selectedTemplate.icon className="w-4 h-4 text-[#0BA4AA]" />
                  <span className="text-sm font-semibold text-white/80">{selectedTemplate.label}</span>
                  {template !== 'campaign_brief' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/50 border border-white/10">
                      {PLATFORMS.find(p => p.id === platform)?.label}
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#F47A20]/10 text-[#F47A20]/80 border border-[#F47A20]/20">
                    {TONES.find(t => t.id === tone)?.emoji} {TONES.find(t => t.id === tone)?.label}
                  </span>
                  {activeHistoryId && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#3E3C70]/40 text-purple-300 border border-purple-500/20">From history</span>
                  )}
                </div>

                {output && (
                  <div className="flex items-center gap-2 shrink-0">
                    {lastTokens > 0 && (
                      <span className="text-[11px] text-white/30 flex items-center gap-1">
                        <Zap className="w-3 h-3" />{lastTokens.toLocaleString()} tokens
                        {lastModel && lastModel !== 'mock' && <span className="ml-1 opacity-50">· {lastModel}</span>}
                      </span>
                    )}
                    <button onClick={handleCopy} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/8 border border-white/15 text-white/60 hover:text-white hover:bg-white/12 transition-all text-xs">
                      {copied ? <Check className="w-3 h-3 text-[#0BA4AA]" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>

                    {/* ── Save as card button ── */}
                    <button
                      onClick={() => setShowSaveModal(true)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all text-xs ${
                        justSaved
                          ? 'bg-[#0BA4AA]/20 border-[#0BA4AA]/40 text-[#0BA4AA]'
                          : 'bg-[#F47A20]/10 border-[#F47A20]/30 text-[#F47A20]/80 hover:bg-[#F47A20]/20 hover:text-[#F47A20]'
                      }`}
                    >
                      {justSaved ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                      <span>{justSaved ? 'Saved!' : 'Save as Card'}</span>
                    </button>

                    <button onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0BA4AA]/15 border border-[#0BA4AA]/30 text-[#0BA4AA] hover:bg-[#0BA4AA]/25 transition-all text-xs disabled:opacity-50">
                      <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span>Regenerate</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Output body */}
              <div className="p-5 min-h-[320px]">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-[#0BA4AA]/30" />
                        <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-[#0BA4AA] animate-spin" />
                        <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-[#0BA4AA]" />
                      </div>
                      <div className="text-center">
                        <p className="text-white/70 text-sm font-medium">GPT-4o is thinking…</p>
                        <p className="text-white/35 text-xs mt-1">Crafting your {selectedTemplate.label.toLowerCase()}</p>
                      </div>
                      <GeneratingDots />
                    </motion.div>
                  ) : output ? (
                    <motion.div key="output" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="prose prose-invert max-w-none">
                      {renderOutput(output)}
                    </motion.div>
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0BA4AA]/20 to-[#F47A20]/10 border border-white/10 flex items-center justify-center">
                        <selectedTemplate.icon className="w-6 h-6 text-[#0BA4AA]/70" />
                      </div>
                      <div>
                        <p className="text-white/50 text-sm font-medium">{selectedTemplate.label}</p>
                        <p className="text-white/30 text-xs mt-1 max-w-xs">{selectedTemplate.desc}</p>
                      </div>
                      <p className="text-white/20 text-xs mt-2">
                        {hasStructuredFields
                          ? <>Fill in the <span className="text-[#0BA4AA]/60">fields on the left</span>, then hit Generate Content</>
                          : <>Enter your prompt on the left, then hit <span className="text-[#0BA4AA]/60">Generate Content</span></>
                        }
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* ── Saved Assets Panel ─────────────────────────────────────── */}
            <AnimatePresence>
              {savedAssets.length > 0 && (
                <SavedAssetsPanel
                  assets={savedAssets}
                  onRemove={handleRemoveSavedAsset}
                  onSubmitForApproval={setApprovalTarget}
                />
              )}
            </AnimatePresence>

            {/* ── Prompt tips ─────────────────────────────────────────────── */}
            {!output && !isGenerating && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`${glassInner} p-4`}>
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                  {hasStructuredFields ? 'Tips for Better Results' : 'Prompt Tips'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(hasStructuredFields ? [
                    { icon: '✅', tip: 'Fill all required (*) fields for the best structured output' },
                    { icon: '💾', tip: 'Hit "Save as Card" to send output directly into a project for approval' },
                    { icon: '🔄', tip: 'Hit Regenerate to get a fresh variation with the same inputs' },
                    { icon: '📋', tip: 'Use "Preview auto-built prompt" to see exactly what\'s sent to GPT-4o' },
                  ] : [
                    { icon: '🎯', tip: 'Be specific about your target audience — age, location, interests' },
                    { icon: '💾', tip: 'Hit "Save as Card" to send output directly into a project for approval' },
                    { icon: '🗓️', tip: 'Include seasonal context — Hari Raya, Merdeka, end-of-year sales' },
                    { icon: '📐', tip: 'Add constraints — "under 150 chars" or "no emoji" work great' },
                  ]).map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-white/45">
                      <span className="shrink-0 text-base leading-tight">{t.icon}</span>
                      <span className="leading-relaxed">{t.tip}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </BackgroundLayout>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GeneratingDots() {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-[#0BA4AA]"
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function HistoryRow({ rec, isActive, onRestore, onDelete }: {
  rec: GenerationRecord;
  isActive: boolean;
  onRestore: (r: GenerationRecord) => void;
  onDelete: (id: string) => void;
}) {
  const templateMeta = TEMPLATES.find(t => t.id === rec.template);
  const Icon         = templateMeta?.icon ?? MessageSquare;

  return (
    <div
      className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer group ${isActive ? 'bg-[#0BA4AA]/10 border-[#0BA4AA]/30' : 'bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/15'}`}
      onClick={() => onRestore(rec)}
    >
      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isActive ? 'text-[#0BA4AA]' : 'text-white/40'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-white/70 truncate">{templateMeta?.label ?? rec.template}</span>
          <span className="text-[10px] text-white/30">{PLATFORMS.find(p => p.id === rec.platform)?.label}</span>
        </div>
        <p className="text-[11px] text-white/40 truncate leading-snug">{rec.prompt || rec.output.slice(0, 80)}</p>
        <div className="flex items-center gap-2 mt-1">
          <Clock className="w-2.5 h-2.5 text-white/25" />
          <span className="text-[10px] text-white/30">{formatTimeAgo(rec.createdAt)}</span>
          {rec.tokensUsed > 0 && <span className="text-[10px] text-white/25">{rec.tokensUsed.toLocaleString()} tokens</span>}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onDelete(rec.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/15 text-white/30 hover:text-red-400">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
