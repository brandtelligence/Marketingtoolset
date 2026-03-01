/**
 * ContentGenPage  —  /app/content
 * ─────────────────────────────────────────────────────────────────────────────
 * AI Content Studio — 7-step wizard for generating social media content.
 *
 * Content Strategy phase (bt-teal steps):
 *   Step 1 → Select Marketing Channel
 *   Step 2 → Select Social Media Platforms
 *   Step 3 → Select Content Action
 *   Step 4 → Generate Content (AI waterfall based on selected action)
 *
 * Asset Creation phase (bt-orange steps):
 *   Step 5 → Content Brief (structured brief from generated content)
 *   Step 6 → Platform Copy (captions, hashtags, CTAs per platform)
 *   Step 7 → Review & Save (final review + save to Content Board as draft)
 *
 * Production → calls POST /ai/generate-content on the server (key is server-side)
 * Demo mode  → uses the built-in mock engine so the UI is fully interactive
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  Sparkles, Copy, RefreshCw, Trash2, ChevronDown, ChevronRight,
  Clock, Check, Loader2, Info, History, AlertTriangle,
  X as XIcon, Bookmark, BookmarkCheck, FolderOpen, ExternalLink,
  Send, UserCheck, Users, ArrowLeft, ArrowRight, Wand2,
  CheckCircle2, Pencil, AlertCircle, Type,
  Download, FileText, FileCode,
} from 'lucide-react';
import { useAuth } from '../../components/AuthContext';
import { BackgroundLayout } from '../../components/BackgroundLayout';
import { EmployeeNav } from '../../components/EmployeeNav';
import { getAccessToken } from '../../utils/authHeaders';
import { IS_PRODUCTION } from '../../config/appConfig';
import { toast } from 'sonner';
import {
  generateContent, generateBrief as generateBriefApi, generatePlatformCopy as generatePlatformCopyApi,
  fetchContentHistory, deleteContentHistory, fetchContentGenUsage,
  type GenerationRecord, type ContentGenUsageSummary,
} from '../../utils/apiClient';
import {
  generateInitialResponse,
  marketingChannels, socialPlatforms, contentActions,
  type MarketingChannel, type SocialPlatform, type ContentAction,
} from '../../components/ai/aiEngine';
import { useContent, createCardId, type ContentCard } from '../../contexts/ContentContext';
import { useProjects, availableTeamMembers } from '../../contexts/ProjectsContext';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { employeeTheme } from '../../utils/employeeTheme';

// ─── Glassmorphism helpers (legacy dark-only constants kept for backward compat) ─

const glass      = 'backdrop-blur-xl bg-white/8 border border-white/15 rounded-2xl';
const glassInner = 'bg-white/5 border border-white/10 rounded-xl';
const inputCls   = 'w-full bg-white/8 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#0BA4AA]/60 focus:bg-white/10 transition-all';
const selectCls  = 'w-full bg-white/8 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#0BA4AA]/60 focus:bg-white/10 transition-all appearance-none';

// ─── Wizard Step IDs ──────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Channel',
  2: 'Platforms',
  3: 'Action',
  4: 'Generate',
  5: 'Content Brief',
  6: 'Platform Copy',
  7: 'Review & Save',
};

// ─── Saved Asset type ─────────────────────────────────────────────────────────

interface SavedAsset {
  id:              string;
  cardId:          string;
  projectId:       string;
  projectName:     string;
  projectRoute:    string;
  actionId:        string;
  platform:        string;
  title:           string;
  outputSnippet:   string;
  savedAt:         string;
  approvalStatus?: 'draft' | 'pending_approval';
}

// ─── Version History type ─────────────────────────────────────────────────────

interface ContentVersion {
  id: string;
  content: string;
  source: 'ai-generated' | 'manual-edit';
  timestamp: number;
}

function createVersion(content: string, source: ContentVersion['source']): ContentVersion {
  return { id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, content, source, timestamp: Date.now() };
}

/** Simple line-based diff: returns lines tagged as 'same', 'added', or 'removed'. */
function computeLineDiff(
  oldText: string, newText: string,
): { type: 'same' | 'added' | 'removed'; text: string }[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const n = oldLines.length;
  const m = newLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack
  const result: { type: 'same' | 'added' | 'removed'; text: string }[] = [];
  let i = n, j = m;
  const stack: typeof result = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({ type: 'same', text: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'added', text: newLines[j - 1] });
      j--;
    } else {
      stack.push({ type: 'removed', text: oldLines[i - 1] });
      i--;
    }
  }
  stack.reverse();
  return stack;
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function buildExportContent(
  channelName: string,
  platforms: string[],
  actionName: string,
  initialContent: string,
  briefContent: string,
  platformCopy: string,
  format: 'markdown' | 'text',
): string {
  const sep = format === 'markdown' ? '---' : '════════════════════════════════════════';
  const h1 = (t: string) => format === 'markdown' ? `# ${t}` : `═══ ${t.toUpperCase()} ═══`;
  const h2 = (t: string) => format === 'markdown' ? `## ${t}` : `── ${t} ──`;
  const meta = [
    `Channel: ${channelName}`,
    `Platforms: ${platforms.join(', ')}`,
    `Action: ${actionName}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Powered by: Brandtelligence AI`,
  ].join('\n');

  return [
    h1('Brandtelligence Content Package'),
    '',
    meta,
    '',
    sep,
    '',
    h2('Initial Content'),
    '',
    initialContent,
    '',
    sep,
    '',
    h2('Content Brief'),
    '',
    briefContent,
    '',
    sep,
    '',
    h2('Platform-Specific Copy'),
    '',
    platformCopy,
    '',
    sep,
    '',
    format === 'markdown'
      ? '*Generated by Brandtelligence AI Content Wizard*'
      : '-- Generated by Brandtelligence AI Content Wizard --',
  ].join('\n');
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

const TOKEN_LIMIT = 100_000;

// ─── Markdown-lite renderer ───────────────────────────────────────────────────

function renderOutput(text: string, isDark = true) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0, key = 0;

  const headingCls = isDark ? 'text-white' : 'text-gray-900';
  const subCls     = isDark ? 'text-white/90' : 'text-gray-800';
  const bodyCls    = isDark ? 'text-white/85' : 'text-gray-700';
  const quoteCls   = isDark ? 'text-white/80' : 'text-gray-600';
  const borderCls  = isDark ? 'border-white/20' : 'border-gray-200';
  const borderFaint= isDark ? 'border-white/10' : 'border-gray-100';

  const inlineFormat = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, pi) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={pi} className={`font-semibold ${headingCls}`}>{p.slice(2, -2)}</strong>
      : <span key={pi}>{p}</span>
  );

  while (i < lines.length) {
    const line = lines[i];
    if      (line.startsWith('## '))  { elements.push(<h2 key={key++} className={`text-lg font-bold ${headingCls} mt-5 mb-2 border-b ${borderCls} pb-1`}>{line.slice(3)}</h2>); }
    else if (line.startsWith('### ')) { elements.push(<h3 key={key++} className={`text-base font-semibold ${subCls} mt-4 mb-1.5`}>{line.slice(4)}</h3>); }
    else if (line.startsWith('# '))  { elements.push(<h1 key={key++} className={`text-xl font-bold ${headingCls} mt-4 mb-2`}>{line.slice(2)}</h1>); }
    else if (line.startsWith('> '))   { elements.push(<blockquote key={key++} className={`border-l-4 border-[#0BA4AA] pl-4 my-2 ${quoteCls} italic text-sm`}>{inlineFormat(line.slice(2))}</blockquote>); }
    else if (/^\|.+\|/.test(line)) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\|.+\|/.test(lines[i])) {
        if (!/^[\|\s\-:]+$/.test(lines[i])) tableLines.push(lines[i]);
        i++;
      }
      elements.push(<div key={key++} className="overflow-x-auto my-3"><table className={`text-sm ${bodyCls} w-full border-collapse`}>{tableLines.map((tl, ti) => { const cells = tl.split('|').filter((_, ci) => ci > 0 && ci < tl.split('|').length - 1); return (<tr key={ti} className={ti === 0 ? `border-b ${borderCls}` : `border-b ${borderFaint}`}>{cells.map((c, ci) => <td key={ci} className={`px-3 py-1.5 ${ti === 0 ? `font-semibold ${headingCls}` : ''}`}>{inlineFormat(c.trim())}</td>)}</tr>); })}</table></div>);
      continue;
    }
    else if (line.startsWith('- ') || line.startsWith('• ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('• '))) { items.push(lines[i].slice(2)); i++; }
      elements.push(<ul key={key++} className="list-none space-y-1 my-2 pl-0">{items.map((item, ii) => <li key={ii} className={`flex gap-2 text-sm ${bodyCls}`}><span className="text-[#0BA4AA] shrink-0 mt-0.5">•</span><span>{inlineFormat(item)}</span></li>)}</ul>);
      continue;
    }
    else if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, '')); i++; }
      elements.push(<ol key={key++} className="list-none space-y-1.5 my-2">{items.map((item, ii) => <li key={ii} className={`flex gap-2.5 text-sm ${bodyCls}`}><span className="text-[#0BA4AA] font-bold shrink-0 w-5">{ii + 1}.</span><span>{inlineFormat(item)}</span></li>)}</ol>);
      continue;
    }
    else if (line === '---')      { elements.push(<hr key={key++} className={`${borderCls} my-4`} />); }
    else if (line.trim() === '')  { elements.push(<div key={key++} className="h-2" />); }
    else                          { elements.push(<p key={key++} className={`text-sm ${bodyCls} leading-relaxed`}>{inlineFormat(line)}</p>); }
    i++;
  }
  return <>{elements}</>;
}

// ─── SaveAsCardModal ──────────────────────────────────────────────────────────

function SaveAsCardModal({
  output, actionId, platforms,
  onSave, onClose, isSaving,
}: {
  output: string;
  actionId: string;
  platforms: string[];
  onSave: (title: string, projectId: string) => void;
  onClose: () => void;
  isSaving: boolean;
}) {
  const { projects } = useProjects();
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);
  const activeProjects = projects.filter(p => p.status === 'active');

  const actionMeta = contentActions.find(a => a.id === actionId);
  const d = new Date();
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  const defaultTitle = `${actionMeta?.name ?? 'AI Content'} — ${mon} ${d.getDate()}, ${d.getFullYear()}`;

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
        className={`relative w-full max-w-md backdrop-blur-xl border rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#0d0b2a]/90 border-white/20' : 'bg-white border-gray-200'}`}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${et.border}`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0BA4AA] to-[#F47A20] flex items-center justify-center">
              <Bookmark className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className={`text-sm font-bold ${et.text}`}>Save to Content Board</h2>
          </div>
          <button onClick={onClose} className={`transition-colors ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${et.textMd}`}>Card Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={et.inputCls} placeholder="e.g. Instagram Calendar — March 2026" autoFocus />
          </div>

          <div>
            <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${et.textMd}`}>
              Attach to Project <span className="text-[#F47A20]">*</span>
            </label>
            {activeProjects.length === 0 ? (
              <p className={`text-sm italic ${et.textFaint}`}>No active projects found.</p>
            ) : (
              <div className="relative">
                <select value={projectId} onChange={e => setProjectId(e.target.value)} className={et.selectCls}>
                  {activeProjects.map(p => (
                    <option key={p.id} value={p.id} className={isDark ? 'bg-[#1a1040]' : 'bg-white'}>{p.name} — {p.client}</option>
                  ))}
                </select>
                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${et.textFaint}`} />
              </div>
            )}
          </div>

          <div>
            <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${et.textMd}`}>Content Preview</label>
            <div className={`px-3 py-2.5 rounded-xl max-h-28 overflow-y-auto ${et.glassInner}`}>
              <p className={`text-[12px] leading-relaxed whitespace-pre-wrap ${et.textMd}`}>
                {output.slice(0, 300)}{output.length > 300 ? '…' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] px-2 py-1 rounded-full bg-[#0BA4AA]/15 text-[#0BA4AA] border border-[#0BA4AA]/25">
              {actionMeta?.name ?? actionId}
            </span>
            {platforms.slice(0, 3).map(pid => {
              const pl = socialPlatforms.find(p => p.id === pid);
              return (
                <span key={pid} className={`text-[11px] px-2 py-1 rounded-full ${isDark ? 'bg-white/8 text-white/50 border border-white/10' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                  {pl?.name ?? pid}
                </span>
              );
            })}
            {platforms.length > 3 && (
              <span className={`text-[11px] px-2 py-1 rounded-full ${isDark ? 'bg-white/8 text-white/40 border border-white/10' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                +{platforms.length - 3} more
              </span>
            )}
            <span className={`text-[11px] px-2 py-1 rounded-full ${isDark ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>Draft</span>
          </div>
        </div>

        <div className={`flex items-center justify-end gap-2 px-5 py-4 border-t ${et.border} ${isDark ? 'bg-white/3' : 'bg-gray-50'}`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm transition-all ${isDark ? 'text-white/60 hover:text-white hover:bg-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>Cancel</button>
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
  asset, onClose, onDone,
}: {
  asset: SavedAsset;
  onClose: () => void;
  onDone: (assetId: string) => void;
}) {
  const { cards, updateCard, addAuditEntry, logApprovalEvent } = useContent();
  const { projects } = useProjects();
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const { isDark }   = useDashboardTheme();
  const et           = employeeTheme(isDark);

  const card    = cards.find(c => c.id === asset.cardId);
  const project = projects.find(p => p.id === asset.projectId);

  const projectMembers = project
    ? availableTeamMembers.filter(m => project.teamMembers.includes(m.id))
    : availableTeamMembers.slice(0, 6);

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

  const actionMeta = contentActions.find(a => a.id === asset.actionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22 }}
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-lg backdrop-blur-xl border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${isDark ? 'bg-[#0d0b2a]/92 border-white/20' : 'bg-white border-gray-200'}`}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${et.border}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F47A20] to-[#3E3C70] flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className={`text-sm font-bold ${et.text}`}>Submit for Approval</h2>
          </div>
          <button onClick={onClose} className={`transition-colors ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">
          <div className={`flex items-start gap-3 px-3 py-3 rounded-xl ${et.glassInner}`}>
            <div className="w-8 h-8 rounded-lg bg-[#0BA4AA]/15 border border-[#0BA4AA]/25 flex items-center justify-center shrink-0 mt-0.5 text-lg">
              {actionMeta?.icon ?? '📋'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${et.text}`}>{asset.title}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[11px] text-[#F47A20]/80 flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />{asset.projectName}
                </span>
                <span className={`text-[11px] ${et.textFaint}`}>·</span>
                <span className="text-[11px] text-[#0BA4AA]/70">{actionMeta?.name}</span>
                {!card && <span className="text-[11px] text-red-400 ml-auto">Card not found in context</span>}
              </div>
            </div>
          </div>

          <div>
            <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${et.textFaint}`}>Content Preview</label>
            <div className={`px-3 py-2.5 rounded-xl max-h-24 overflow-y-auto ${et.glassInner}`}>
              <p className={`text-[12px] leading-relaxed whitespace-pre-wrap ${et.textMd}`}>
                {asset.outputSnippet}{asset.outputSnippet.length >= 120 ? '…' : ''}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5 text-[#F47A20]" />
              <label className={`text-xs font-semibold uppercase tracking-wider ${et.textMd}`}>
                Select Approvers <span className="text-[#F47A20]">*</span>
              </label>
              {selectedIds.length > 0 && (
                <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-[#F47A20]/15 text-[#F47A20] border border-[#F47A20]/25">
                  {selectedIds.length} selected
                </span>
              )}
            </div>

            {projectMembers.length === 0 ? (
              <p className={`text-sm italic px-2 ${et.textFaint}`}>No team members found for this project.</p>
            ) : (
              <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-white/10 divide-y divide-white/8' : 'border-gray-200 divide-y divide-gray-100'}`}>
                {projectMembers.map(member => {
                  const isSelected = selectedIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      onClick={() => toggle(member.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${
                        isSelected ? 'bg-[#F47A20]/10 hover:bg-[#F47A20]/15' : isDark ? 'bg-white/3 hover:bg-white/6' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold ${
                        isSelected ? 'bg-[#F47A20]/30 text-[#F47A20]' : isDark ? 'bg-white/10 text-white/50' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {member.firstName[0]}{member.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-tight ${isSelected ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-white/70' : 'text-gray-700')}`}>
                          {member.firstName} {member.lastName}
                        </p>
                        <p className={`text-[10px] leading-tight ${et.textFaint}`}>{member.jobTitle}</p>
                      </div>
                      <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'bg-[#F47A20] border-[#F47A20]' : isDark ? 'bg-transparent border-white/20' : 'bg-transparent border-gray-300'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className={`text-xs font-semibold uppercase tracking-wider mb-1.5 block ${et.textFaint}`}>
              Note to Approvers <span className={`normal-case font-normal ${et.textFaint}`}>(optional)</span>
            </label>
            <textarea
              value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="e.g. Please review before end of day — this is for tomorrow's campaign launch"
              rows={2} className={`${et.inputCls} resize-none leading-relaxed`}
              style={{ minHeight: '60px', maxHeight: '100px' }}
            />
          </div>
        </div>

        <div className={`flex items-center justify-between gap-2 px-5 py-4 border-t shrink-0 ${et.border} ${isDark ? 'bg-white/3' : 'bg-gray-50'}`}>
          <p className={`text-[11px] ${et.textFaint}`}>
            {selectedIds.length === 0 ? 'Select at least one approver' : `Will notify ${selectedIds.length} approver${selectedIds.length !== 1 ? 's' : ''}`}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className={`px-4 py-2 rounded-xl text-sm transition-all ${isDark ? 'text-white/60 hover:text-white hover:bg-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>Cancel</button>
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
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);
  if (assets.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`${et.glass} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <BookmarkCheck className="w-4 h-4 text-[#0BA4AA]" />
        <h3 className={`text-sm font-semibold ${et.text}`}>Saved Draft Cards</h3>
        <span className={`ml-auto text-[11px] ${et.textFaint}`}>{assets.length} item{assets.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {assets.map(asset => {
          const actionMeta = contentActions.find(a => a.id === asset.actionId);
          const timeAgo    = formatTimeAgo(asset.savedAt);
          const isPending  = asset.approvalStatus === 'pending_approval';

          return (
            <div
              key={asset.id}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all group ${
                isPending ? 'bg-[#F47A20]/6 border-[#F47A20]/20' : isDark ? 'bg-white/4 border-white/8 hover:bg-white/6' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 text-sm ${
                isPending ? 'bg-[#F47A20]/15 border-[#F47A20]/30' : 'bg-[#0BA4AA]/15 border-[#0BA4AA]/25'
              }`}>
                {actionMeta?.icon ?? '📋'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`text-xs font-semibold truncate ${et.textSm}`}>{asset.title}</span>
                  {isPending && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F47A20]/15 text-[#F47A20] border border-[#F47A20]/25 shrink-0">Pending</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <FolderOpen className="w-3 h-3 text-[#F47A20]/70 shrink-0" />
                  <span className="text-[11px] text-[#F47A20]/70 truncate">{asset.projectName}</span>
                  <span className={`text-[10px] ml-auto shrink-0 ${et.textFaint}`}>{timeAgo}</span>
                </div>
                <p className={`text-[11px] line-clamp-1 leading-snug ${et.textFaint}`}>{asset.outputSnippet}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
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
                <button onClick={() => navigate(asset.projectRoute)} title="View in project" className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-white/30' : 'text-gray-400'} hover:text-[#0BA4AA] hover:bg-[#0BA4AA]/10`}>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onRemove(asset.id)} title="Remove from list" className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${isDark ? 'text-white/30' : 'text-gray-400'} hover:text-red-400 hover:bg-red-500/10`}>
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

// ─── StepIndicator ────────────────────────────────────────────────────────────

function StepIndicator({ currentStep, completedSteps }: { currentStep: WizardStep; completedSteps: Set<number> }) {
  const { isDark } = useDashboardTheme();
  const inactiveLine = isDark ? 'bg-white/15' : 'bg-gray-200';
  const inactiveBg   = isDark ? 'bg-white/8 text-white/30 border border-white/15' : 'bg-gray-100 text-gray-400 border border-gray-200';
  const inactiveText = isDark ? 'text-white/30' : 'text-gray-400';
  const currentText  = isDark ? 'text-white' : 'text-gray-900';

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {([1, 2, 3, 4, 5, 6, 7] as WizardStep[]).map((step, idx) => {
        const isComplete = completedSteps.has(step);
        const isCurrent  = step === currentStep;
        const isPast     = step < currentStep;
        return (
          <div key={step} className="flex items-center gap-1 sm:gap-2">
            {idx > 0 && step === 5 ? (
              <div className="hidden sm:flex items-center gap-1">
                <div className={`w-1 h-1 rounded-full transition-colors duration-300 ${isPast || isCurrent ? 'bg-[#F47A20]' : inactiveLine}`} />
                <div className={`w-3 lg:w-4 h-px transition-colors duration-300 ${isPast || isCurrent ? 'bg-[#F47A20]' : inactiveLine}`} />
                <div className={`w-1 h-1 rounded-full transition-colors duration-300 ${isPast || isCurrent ? 'bg-[#F47A20]' : inactiveLine}`} />
              </div>
            ) : idx > 0 ? (
              <div className={`hidden sm:block w-3 lg:w-5 h-px transition-colors duration-300 ${isPast || isCurrent ? 'bg-[#0BA4AA]' : inactiveLine}`} />
            ) : null}
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                isComplete && step >= 5 ? 'bg-[#F47A20] text-white' :
                isComplete ? 'bg-[#0BA4AA] text-white' :
                isCurrent && step >= 5  ? 'bg-[#F47A20]/30 text-[#F47A20] border border-[#F47A20]/60' :
                isCurrent  ? 'bg-[#0BA4AA]/30 text-[#0BA4AA] border border-[#0BA4AA]/60' :
                             inactiveBg
              }`}>
                {isComplete ? <Check className="w-3 h-3" /> : step}
              </div>
              <span className={`hidden lg:inline text-xs font-medium transition-colors ${
                isCurrent ? currentText : isComplete ? 'text-[#0BA4AA]/80' : inactiveText
              }`}>
                {STEP_LABELS[step]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ContentGenPage() {
  const { user }     = useAuth();
  const { addCard }  = useContent();
  const { projects } = useProjects();
  const navigate     = useNavigate();
  const { isDark }   = useDashboardTheme();
  const et           = employeeTheme(isDark);

  // Shadow module-level constants with theme-aware versions
  // so all ${glass} / ${glassInner} / ${inputCls} / ${selectCls}
  // references in this component auto-adapt to light/dark mode.
  const glass      = et.glass;
  const glassInner = et.glassInner;
  const inputCls   = et.inputCls;
  const selectCls  = et.selectCls;

  // ── Wizard state ──
  const [currentStep, setCurrentStep]       = useState<WizardStep>(1);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // ── Generation state ──
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput]             = useState('');
  const [lastModel, setLastModel]       = useState('');
  const [copied, setCopied]             = useState(false);

  // ── History + usage ──
  const [history, setHistory]                 = useState<GenerationRecord[]>([]);
  const [usage, setUsage]                     = useState<ContentGenUsageSummary | null>(null);
  const [showHistory, setShowHistory]         = useState(false);
  const [loadingHistory, setLoadingHistory]   = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // ── Save state ──
  const [savedAssets, setSavedAssets]       = useState<SavedAsset[]>(() => loadSavedAssets());
  const [showSaveModal, setShowSaveModal]   = useState(false);
  const [isSaving, setIsSaving]             = useState(false);
  const [justSaved, setJustSaved]           = useState(false);
  const [approvalTarget, setApprovalTarget] = useState<SavedAsset | null>(null);

  // ── Asset pipeline state (steps 5–7) ──
  const [briefOutput, setBriefOutput]                     = useState('');
  const [isGeneratingBrief, setIsGeneratingBrief]         = useState(false);
  const [platformCopyOutput, setPlatformCopyOutput]       = useState('');
  const [isGeneratingPlatformCopy, setIsGeneratingPlatformCopy] = useState(false);

  // ── Regenerate confirmation state ──
  const [regenerateTarget, setRegenerateTarget] = useState<5 | 6 | null>(null);

  // ── Version history state ──
  const [briefVersions, setBriefVersions] = useState<ContentVersion[]>([]);
  const [platformCopyVersions, setPlatformCopyVersions] = useState<ContentVersion[]>([]);

  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => { persistSavedAssets(savedAssets); }, [savedAssets]);

  const tenantKey = user?.tenantId ?? user?.supabaseUid ?? 'demo';

  // ── Load history + usage ──
  useEffect(() => {
    if (!IS_PRODUCTION) return;
    (async () => {
      setLoadingHistory(true);
      try {
        const token = await getAccessToken();
        if (!token) return;
        const [hist, use] = await Promise.all([
          fetchContentHistory(tenantKey, 20),
          fetchContentGenUsage(tenantKey),
        ]);
        setHistory(hist);
        setUsage(use);
      } catch (err) {
        console.error('[ContentGenPage] load history/usage error:', err);
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, [tenantKey]);

  // ── Computed ──
  const completedSteps = useMemo(() => {
    const s = new Set<number>();
    if (selectedChannel) s.add(1);
    if (selectedPlatforms.length > 0) s.add(2);
    if (selectedAction) s.add(3);
    if (output) s.add(4);
    if (briefOutput) s.add(5);
    if (platformCopyOutput) s.add(6);
    if (justSaved) s.add(7);
    return s;
  }, [selectedChannel, selectedPlatforms, selectedAction, output, briefOutput, platformCopyOutput, justSaved]);

  const canProceedToNext = (): boolean => {
    switch (currentStep) {
      case 1: return !!selectedChannel;
      case 2: return selectedPlatforms.length > 0;
      case 3: return !!selectedAction;
      case 4: return !!output && !isGenerating;
      case 5: return !!briefOutput && !isGeneratingBrief;
      case 6: return !!platformCopyOutput && !isGeneratingPlatformCopy;
      case 7: return false;
      default: return false;
    }
  };

  // ── Asset pipeline generators ──
  const generateBrief = async (force?: boolean) => {
    if (isGeneratingBrief || (briefOutput && !force)) return;
    setIsGeneratingBrief(true);
    if (force) setBriefOutput('');
    try {
      if (IS_PRODUCTION) {
        const token = await getAccessToken();
        if (!token) { toast.error('Session expired'); setIsGeneratingBrief(false); return; }
        const result = await generateBriefApi({
          initialContent: output,
          actionName: selectedActionMeta?.name ?? selectedAction,
          platforms: selectedPlatforms,
          channel: selectedChannelMeta?.name ?? 'Social Media',
          tone: 'professional',
        });
        setBriefOutput(result.output);
        setBriefVersions(prev => [...prev, createVersion(result.output, 'ai-generated')]);
        toast.success(`Content brief generated (${result.tokensUsed.toLocaleString()} tokens)`);
      } else {
        await new Promise(r => setTimeout(r, 1800));
        const platformLabels = selectedPlatforms.map(id => socialPlatforms.find(p => p.id === id)?.name ?? id).join(', ');
        const mockBrief = generateMockBrief(selectedActionMeta?.name ?? 'Content', platformLabels);
        setBriefOutput(mockBrief);
        setBriefVersions(prev => [...prev, createVersion(mockBrief, 'ai-generated')]);
        toast.success('Content brief generated');
      }
    } catch (err: any) {
      console.error('[ContentGenPage] brief error:', err);
      toast.error(err?.message ?? 'Brief generation failed');
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  const generatePlatformCopy = async (force?: boolean) => {
    if (isGeneratingPlatformCopy || (platformCopyOutput && !force)) return;
    setIsGeneratingPlatformCopy(true);
    if (force) setPlatformCopyOutput('');
    try {
      if (IS_PRODUCTION) {
        const token = await getAccessToken();
        if (!token) { toast.error('Session expired'); setIsGeneratingPlatformCopy(false); return; }
        const result = await generatePlatformCopyApi({
          briefContent: briefOutput,
          initialContent: output,
          platforms: selectedPlatforms,
          channel: selectedChannelMeta?.name ?? 'Social Media',
          tone: 'professional',
        });
        setPlatformCopyOutput(result.output);
        setPlatformCopyVersions(prev => [...prev, createVersion(result.output, 'ai-generated')]);
        toast.success(`Platform copy generated (${result.tokensUsed.toLocaleString()} tokens)`);
      } else {
        await new Promise(r => setTimeout(r, 2000));
        const mockCopy = generateMockPlatformCopy(selectedPlatforms);
        setPlatformCopyOutput(mockCopy);
        setPlatformCopyVersions(prev => [...prev, createVersion(mockCopy, 'ai-generated')]);
        toast.success('Platform copy generated');
      }
    } catch (err: any) {
      console.error('[ContentGenPage] platform copy error:', err);
      toast.error(err?.message ?? 'Platform copy generation failed');
    } finally {
      setIsGeneratingPlatformCopy(false);
    }
  };

  const selectedChannelMeta = marketingChannels.find(c => c.id === selectedChannel);
  const selectedActionMeta  = contentActions.find(a => a.id === selectedAction);

  // ── Platform toggle ──
  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  // ── Generate ──
  const handleGenerate = async () => {
    if (!selectedAction || selectedPlatforms.length === 0) return;
    setIsGenerating(true);
    setOutput('');
    setActiveHistoryId(null);
    setJustSaved(false);

    try {
      if (IS_PRODUCTION) {
        const token = await getAccessToken();
        if (!token) { toast.error('Session expired — please sign in again'); setIsGenerating(false); return; }

        const actionLabel = selectedActionMeta?.name ?? selectedAction;
        const platformLabels = selectedPlatforms.map(id => socialPlatforms.find(p => p.id === id)?.name ?? id).join(', ');

        const prompt = `Create a comprehensive ${actionLabel} for the following social media platforms: ${platformLabels}. Channel: ${selectedChannelMeta?.name ?? 'Social Media'}.`;

        const result = await generateContent({
          template: selectedAction,
          platform: selectedPlatforms[0],
          tone: 'professional',
          prompt,
        });
        setOutput(result.output);
        setLastModel(result.model);
        setUsage(result.usage);

        const newRecord: GenerationRecord = {
          id: result.id, tenantId: tenantKey,
          userId: user?.supabaseUid ?? '', userName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
          template: selectedAction, platform: selectedPlatforms[0], tone: 'professional',
          prompt: prompt.slice(0, 500),
          output: result.output, tokensUsed: result.tokensUsed, model: result.model,
          createdAt: new Date().toISOString(),
        };
        setHistory(prev => [newRecord, ...prev].slice(0, 20));
        toast.success(`Generated! ${result.tokensUsed.toLocaleString()} tokens used`);
      } else {
        // Demo mode — use mock engine
        await new Promise(r => setTimeout(r, 1500));
        const mockOutput = generateInitialResponse({
          projectName: 'Your Brand',
          projectDescription: `${selectedActionMeta?.name} for social media marketing`,
          channel: selectedChannel ?? 'social-media',
          platforms: selectedPlatforms,
          actions: [selectedAction],
        });
        setOutput(mockOutput);
        setLastModel('mock');
        toast.success('Demo output generated');
      }
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err: any) {
      console.error('[ContentGenPage] generate error:', err);
      toast.error(err?.message ?? 'Generation failed — check console');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Copy ──
  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Save as ContentCard ──
  const handleSaveAsCard = async (title: string, projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !output) return;

    setIsSaving(true);
    try {
      // Combine all generated assets into the card caption
      const sections: string[] = [];
      if (output)             sections.push(`## Generated Content\n\n${output}`);
      if (briefOutput)        sections.push(`## Content Brief\n\n${briefOutput}`);
      if (platformCopyOutput) sections.push(`## Platform Copy\n\n${platformCopyOutput}`);
      const combinedCaption = sections.length > 1
        ? sections.join('\n\n---\n\n')
        : output;

      const hashtagSource = platformCopyOutput || output;
      const hashtags: string[] = (hashtagSource.match(/#([a-zA-Z0-9_]+)/g) ?? []).map(h => h.slice(1)).slice(0, 30);

      const newCard: ContentCard = {
        id:             createCardId(),
        projectId,
        platform:       selectedPlatforms[0] ?? 'general',
        channel:        selectedChannel ?? 'social-media',
        title,
        caption:        combinedCaption,
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
          details:           `Created from AI Content Studio · Action: ${selectedActionMeta?.name ?? selectedAction} · Model: ${lastModel || 'mock'}`,
        }],
      };

      addCard(newCard);

      const asset: SavedAsset = {
        id:           crypto.randomUUID(),
        cardId:       newCard.id,
        projectId,
        projectName:  project.name,
        projectRoute: `/app/projects/${project.route.split('/').pop()}`,
        actionId:     selectedAction ?? '',
        platform:     selectedPlatforms[0] ?? 'general',
        title,
        outputSnippet: output.slice(0, 120),
        savedAt:      new Date().toISOString(),
      };
      setSavedAssets(prev => [asset, ...prev].slice(0, 30));
      setJustSaved(true);
      setShowSaveModal(false);
      toast.success(`Saved to "${project.name}" as a draft card`, {
        action: { label: 'View Project', onClick: () => navigate(asset.projectRoute) },
      });
    } catch (err: any) {
      console.error('[ContentGenPage] save as card error:', err);
      toast.error(err?.message ?? 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete history ──
  const handleDeleteHistory = async (id: string) => {
    try {
      if (IS_PRODUCTION) await deleteContentHistory(id, tenantKey);
      setHistory(prev => prev.filter(r => r.id !== id));
      if (activeHistoryId === id) { setActiveHistoryId(null); setOutput(''); }
      toast.success('Deleted');
    } catch (err: any) { toast.error(err?.message ?? 'Delete failed'); }
  };

  // ── Restore from history ──
  const handleRestoreHistory = (rec: GenerationRecord) => {
    setOutput(rec.output);
    setLastModel(rec.model);
    setActiveHistoryId(rec.id);
    setJustSaved(false);
    setShowHistory(false);
    setCurrentStep(4);
    setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleRemoveSavedAsset = (id: string) => {
    setSavedAssets(prev => prev.filter(a => a.id !== id));
  };

  const handleApprovalDone = (assetId: string) => {
    setSavedAssets(prev =>
      prev.map(a => a.id === assetId ? { ...a, approvalStatus: 'pending_approval' } : a)
    );
    setApprovalTarget(null);
  };

  // ── Confirm regeneration with cascading invalidation ──
  const handleConfirmRegenerate = () => {
    if (!regenerateTarget) return;
    if (regenerateTarget === 5) {
      // Regenerating the brief invalidates downstream platform copy
      setPlatformCopyOutput('');
      setJustSaved(false);
      generateBrief(true);
    } else if (regenerateTarget === 6) {
      setJustSaved(false);
      generatePlatformCopy(true);
    }
    setRegenerateTarget(null);
  };

  // ── Reset wizard ──
  const handleStartOver = () => {
    setCurrentStep(1);
    setSelectedChannel(null);
    setSelectedPlatforms([]);
    setSelectedAction(null);
    setOutput('');
    setLastModel('');
    setJustSaved(false);
    setActiveHistoryId(null);
    setBriefOutput('');
    setPlatformCopyOutput('');
  };

  // ── Usage bar ──
  const usageTokens = usage?.tokens ?? 0;
  const usageLimit  = usage?.limit  ?? TOKEN_LIMIT;
  const usagePct    = Math.min((usageTokens / usageLimit) * 100, 100);
  const usageColor  = usagePct > 85 ? 'bg-red-500' : usagePct > 65 ? 'bg-[#F47A20]' : 'bg-[#0BA4AA]';

  if (!user) return null;

  return (
    <BackgroundLayout>
      <EmployeeNav />

      {/* Save modal */}
      <AnimatePresence>
        {showSaveModal && (
          <SaveAsCardModal
            output={output}
            actionId={selectedAction ?? ''}
            platforms={selectedPlatforms}
            isSaving={isSaving}
            onSave={handleSaveAsCard}
            onClose={() => setShowSaveModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Approval modal */}
      <AnimatePresence>
        {approvalTarget && (
          <SubmitApprovalModal
            asset={approvalTarget}
            onClose={() => setApprovalTarget(null)}
            onDone={handleApprovalDone}
          />
        )}
      </AnimatePresence>

      {/* Regenerate confirmation modal */}
      <AnimatePresence>
        {regenerateTarget && (
          <RegenerateConfirmModal
            stepNumber={regenerateTarget}
            stepLabel={regenerateTarget === 5 ? 'Content Brief' : 'Platform Copy'}
            hasCascade={regenerateTarget === 5 && !!platformCopyOutput}
            onConfirm={handleConfirmRegenerate}
            onCancel={() => setRegenerateTarget(null)}
          />
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0BA4AA] to-[#F47A20] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h1 className={`text-2xl font-bold ${et.text}`}>AI Content Studio</h1>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#0BA4AA]/20 text-[#0BA4AA] border border-[#0BA4AA]/30">GPT-4o</span>
            </div>
            <p className={`text-sm ${et.textMd}`}>Follow the steps to generate AI-powered marketing content.</p>
          </div>

          <div className="flex items-center gap-2">
            {output && (
              <button onClick={handleStartOver} className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-sm ${isDark ? 'bg-white/8 border border-white/15 text-white/70 hover:text-white hover:bg-white/12' : 'bg-gray-100 border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}>
                <RefreshCw className="w-4 h-4" />
                <span>Start Over</span>
              </button>
            )}
            <button
              onClick={() => setShowHistory(h => !h)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-sm ${isDark ? 'bg-white/8 border border-white/15 text-white/70 hover:text-white hover:bg-white/12' : 'bg-gray-100 border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
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

        {/* ── Step Indicator ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}
          className={`${glass} px-5 py-3.5 flex items-center justify-between`}
        >
          <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />
          {IS_PRODUCTION && (
            <div className="hidden sm:flex items-center gap-2">
              <span className={`text-[11px] ${et.textFaint}`}>{usageTokens.toLocaleString()} / {usageLimit.toLocaleString()} tokens</span>
              <div className={`w-20 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                <div className={`h-full rounded-full transition-all duration-700 ${usageColor}`} style={{ width: `${usagePct}%` }} />
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Demo banner ─────────────────────────────────────────────── */}
        {!IS_PRODUCTION && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span><strong>Demo mode</strong> — outputs come from the built-in mock engine. Sign in with a real account to use live GPT-4o.</span>
          </motion.div>
        )}

        {/* ── History overlay ─────────────────────────────────────────── */}
        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className={`${glass} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#0BA4AA]" />
                  <h3 className={`text-sm font-semibold ${et.text}`}>Recent Generations</h3>
                </div>
                <button onClick={() => setShowHistory(false)} className={`${et.textFaint} hover:${et.text} transition-colors`}><XIcon className="w-4 h-4" /></button>
              </div>
              {loadingHistory ? (
                <div className={`flex items-center gap-2 text-sm py-4 justify-center ${et.textFaint}`}><Loader2 className="w-4 h-4 animate-spin" /><span>Loading…</span></div>
              ) : history.length === 0 ? (
                <p className={`text-sm text-center py-6 ${et.textFaint}`}>No generations yet — create your first one!</p>
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

        {/* ── Wizard Content ──────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {/* ── STEP 1: Select Marketing Channel ─────────────────────── */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className={`${glass} p-6`}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0BA4AA] to-[#3E3C70] flex items-center justify-center text-white font-bold text-sm">1</div>
                <div>
                  <h2 className={`text-lg font-bold ${et.text}`}>Select Marketing Channel</h2>
                  <p className={`text-sm ${et.textMd}`}>Choose the primary marketing channel for your content</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {marketingChannels.map(channel => {
                  const isActive = selectedChannel === channel.id;
                  const isDisabled = !channel.active;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => !isDisabled && setSelectedChannel(channel.id)}
                      disabled={isDisabled}
                      className={`relative flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                        isActive
                          ? 'bg-[#0BA4AA]/15 border-[#0BA4AA]/50 ring-1 ring-[#0BA4AA]/30'
                          : isDisabled
                          ? isDark ? 'bg-white/3 border-white/8 opacity-40 cursor-not-allowed' : 'bg-gray-50 border-gray-200 opacity-40 cursor-not-allowed'
                          : isDark ? 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20' : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                      }`}
                    >
                      <span className="text-2xl shrink-0 mt-0.5">{channel.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${isActive ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-white/70' : 'text-gray-700')}`}>{channel.name}</span>
                          {isActive && <CheckCircle2 className="w-4 h-4 text-[#0BA4AA] shrink-0" />}
                        </div>
                        <p className={`text-xs mt-1 line-clamp-2 ${et.textFaint}`}>{channel.description}</p>
                      </div>
                      {isDisabled && (
                        <span className={`absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-white/30 border border-white/10' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>Soon</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Step navigation */}
              <div className={`flex items-center justify-end mt-6 pt-4 border-t ${et.border}`}>
                <button
                  onClick={() => { if (canProceedToNext()) setCurrentStep(2); }}
                  disabled={!canProceedToNext()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: canProceedToNext() ? 'linear-gradient(135deg,#0BA4AA,#3E3C70)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') }}
                >
                  <span>Next: Social Platforms</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Select Social Media Platforms ─────────────────── */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className={`${glass} p-6`}
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0BA4AA] to-[#3E3C70] flex items-center justify-center text-white font-bold text-sm">2</div>
                <div>
                  <h2 className={`text-lg font-bold ${et.text}`}>Select Social Media Platforms</h2>
                  <p className={`text-sm ${et.textMd}`}>Choose one or more platforms to target</p>
                </div>
              </div>

              {/* Selected channel badge */}
              {selectedChannelMeta && (
                <div className="flex items-center gap-2 mt-3 mb-5">
                  <span className={`text-xs ${et.textFaint}`}>Channel:</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#0BA4AA]/15 text-[#0BA4AA] border border-[#0BA4AA]/25 flex items-center gap-1.5">
                    <span>{selectedChannelMeta.icon}</span>
                    <span>{selectedChannelMeta.name}</span>
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {socialPlatforms.map(platform => {
                  const isActive = selectedPlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`relative flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                        isActive
                          ? 'bg-[#0BA4AA]/15 border-[#0BA4AA]/50 ring-1 ring-[#0BA4AA]/30'
                          : isDark ? 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20' : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${platform.color} flex items-center justify-center shrink-0`}>
                        <span className="text-white text-xs font-bold">{platform.name.slice(0, 2).toUpperCase()}</span>
                      </div>
                      <span className={`text-sm font-medium ${isActive ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-white/65' : 'text-gray-600')}`}>{platform.name}</span>
                      {isActive && (
                        <CheckCircle2 className="w-4 h-4 text-[#0BA4AA] absolute top-2 right-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedPlatforms.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-2 flex-wrap">
                  <span className={`text-xs ${et.textFaint}`}>Selected:</span>
                  {selectedPlatforms.map(pid => {
                    const p = socialPlatforms.find(pp => pp.id === pid);
                    return (
                      <span key={pid} className="text-xs px-2 py-1 rounded-full bg-[#0BA4AA]/15 text-[#0BA4AA]/80 border border-[#0BA4AA]/25 flex items-center gap-1">
                        {p?.name}
                        <button onClick={() => togglePlatform(pid)} className={`transition-colors ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`}>
                          <XIcon className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </motion.div>
              )}

              <div className={`flex items-center justify-between mt-6 pt-4 border-t ${et.border}`}>
                <button onClick={() => setCurrentStep(1)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all ${isDark ? 'text-white/60 hover:text-white hover:bg-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={() => { if (canProceedToNext()) setCurrentStep(3); }}
                  disabled={!canProceedToNext()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: canProceedToNext() ? 'linear-gradient(135deg,#0BA4AA,#3E3C70)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') }}
                >
                  <span>Next: Content Action</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Select Content Action ─────────────────────────── */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className={`${glass} p-6`}
            >
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0BA4AA] to-[#3E3C70] flex items-center justify-center text-white font-bold text-sm">3</div>
                <div>
                  <h2 className={`text-lg font-bold ${et.text}`}>Select Content Action</h2>
                  <p className={`text-sm ${et.textMd}`}>What would you like the AI to create?</p>
                </div>
              </div>

              {/* Selected summary */}
              <div className="flex items-center gap-2 mt-3 mb-5 flex-wrap">
                {selectedChannelMeta && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#0BA4AA]/15 text-[#0BA4AA] border border-[#0BA4AA]/25 flex items-center gap-1.5">
                    <span>{selectedChannelMeta.icon}</span>
                    <span>{selectedChannelMeta.name}</span>
                  </span>
                )}
                {selectedPlatforms.slice(0, 3).map(pid => {
                  const p = socialPlatforms.find(pp => pp.id === pid);
                  return (
                    <span key={pid} className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-white/8 text-white/50 border border-white/10' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>{p?.name}</span>
                  );
                })}
                {selectedPlatforms.length > 3 && (
                  <span className={`text-xs ${et.textFaint}`}>+{selectedPlatforms.length - 3} more</span>
                )}
              </div>

              {/* Planning actions */}
              <div className="mb-4">
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2.5 ${et.textFaint}`}>Planning & Strategy</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contentActions.filter(a => a.category === 'planning').map(action => {
                    const isActive = selectedAction === action.id;
                    return (
                      <button
                        key={action.id}
                        onClick={() => setSelectedAction(action.id)}
                        className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                          isActive
                            ? 'bg-[#F47A20]/15 border-[#F47A20]/50 ring-1 ring-[#F47A20]/30'
                            : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
                        }`}
                      >
                        <span className="text-2xl shrink-0">{action.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${isActive ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-white/70' : 'text-gray-700')}`}>{action.name}</span>
                            {isActive && <CheckCircle2 className="w-4 h-4 text-[#F47A20] shrink-0" />}
                          </div>
                          <p className={`text-xs mt-1 line-clamp-2 ${et.textFaint}`}>{action.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Creation actions */}
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2.5 ${et.textFaint}`}>Content Creation</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contentActions.filter(a => a.category === 'creation').map(action => {
                    const isActive = selectedAction === action.id;
                    return (
                      <button
                        key={action.id}
                        onClick={() => setSelectedAction(action.id)}
                        className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                          isActive
                            ? 'bg-[#F47A20]/15 border-[#F47A20]/50 ring-1 ring-[#F47A20]/30'
                            : isDark ? 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20' : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
                        }`}
                      >
                        <span className="text-2xl shrink-0">{action.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${isActive ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-white/70' : 'text-gray-700')}`}>{action.name}</span>
                            {isActive && <CheckCircle2 className="w-4 h-4 text-[#F47A20] shrink-0" />}
                          </div>
                          <p className={`text-xs mt-1 line-clamp-2 ${et.textFaint}`}>{action.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={`flex items-center justify-between mt-6 pt-4 border-t ${et.border}`}>
                <button onClick={() => setCurrentStep(2)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all ${isDark ? 'text-white/60 hover:text-white hover:bg-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={() => { if (canProceedToNext()) setCurrentStep(4); }}
                  disabled={!canProceedToNext()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: canProceedToNext() ? 'linear-gradient(135deg,#0BA4AA,#F47A20)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') }}
                >
                  <span>Next: Generate Content</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: Generate Content ──────────────────────────────── */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-5"
            >
              {/* Summary + generate bar */}
              <div className={`${glass} p-5`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0BA4AA] to-[#F47A20] flex items-center justify-center text-white font-bold text-sm">4</div>
                  <div>
                    <h2 className={`text-lg font-bold ${et.text}`}>Generate Content</h2>
                    <p className={`text-sm ${et.textMd}`}>Review your selections and generate AI content</p>
                  </div>
                </div>

                {/* Selections summary */}
                <div className="flex items-center gap-2 flex-wrap mb-5">
                  {selectedChannelMeta && (
                    <span className="text-xs px-2.5 py-1.5 rounded-full bg-[#3E3C70]/40 text-purple-300 border border-purple-500/25 flex items-center gap-1.5">
                      <span>{selectedChannelMeta.icon}</span>
                      <span>{selectedChannelMeta.name}</span>
                    </span>
                  )}
                  <ChevronRight className={`w-3.5 h-3.5 ${et.textFaint}`} />
                  {selectedPlatforms.map(pid => {
                    const p = socialPlatforms.find(pp => pp.id === pid);
                    return (
                      <span key={pid} className={`text-xs px-2 py-1.5 rounded-full ${isDark ? 'bg-white/8 text-white/60 border border-white/15' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{p?.name}</span>
                    );
                  })}
                  <ChevronRight className={`w-3.5 h-3.5 ${et.textFaint}`} />
                  {selectedActionMeta && (
                    <span className="text-xs px-2.5 py-1.5 rounded-full bg-[#F47A20]/15 text-[#F47A20] border border-[#F47A20]/25 flex items-center gap-1.5">
                      <span>{selectedActionMeta.icon}</span>
                      <span>{selectedActionMeta.name}</span>
                    </span>
                  )}
                </div>

                {/* Generate button */}
                {!output && !isGenerating && (
                  <button
                    onClick={handleGenerate}
                    className="relative flex items-center justify-center gap-3 w-full py-4 rounded-xl font-semibold text-base text-white transition-all overflow-hidden group"
                    style={{ background: 'linear-gradient(135deg,#0BA4AA,#F47A20)' }}
                  >
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                    <Wand2 className="w-5 h-5 relative" />
                    <span className="relative">Generate {selectedActionMeta?.name ?? 'Content'}</span>
                  </button>
                )}

                {/* Back button when not generating */}
                {!output && !isGenerating && (
                  <div className={`flex items-center justify-start mt-4 pt-3 border-t ${et.border}`}>
                    <button onClick={() => setCurrentStep(3)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${isDark ? 'text-white/60 hover:text-white hover:bg-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Content Actions</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Output area */}
              {(isGenerating || output) && (
                <motion.div
                  ref={outputRef}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`${glass} overflow-hidden`}
                >
                  {/* Output header */}
                  <div className={`flex items-center justify-between px-5 py-3.5 border-b ${et.border}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{selectedActionMeta?.icon ?? '📋'}</span>
                      <span className={`text-sm font-semibold ${et.textMd}`}>{selectedActionMeta?.name ?? 'Generated Content'}</span>
                      {activeHistoryId && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#3E3C70]/40 text-purple-300 border border-purple-500/20">From history</span>
                      )}
                    </div>

                    {output && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={handleCopy} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-xs ${isDark ? 'bg-white/8 border border-white/15 text-white/60 hover:text-white hover:bg-white/12' : 'bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}>
                          {copied ? <Check className="w-3 h-3 text-[#0BA4AA]" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? 'Copied!' : 'Copy'}</span>
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
                            <div className="w-14 h-14 rounded-full border-2 border-[#0BA4AA]/30" />
                            <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-transparent border-t-[#0BA4AA] animate-spin" />
                            <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-[#0BA4AA]" />
                          </div>
                          <div className="text-center">
                            <p className={`text-sm font-medium ${et.textMd}`}>AI is generating your {selectedActionMeta?.name?.toLowerCase() ?? 'content'}…</p>
                            <p className={`text-xs mt-1 ${et.textFaint}`}>This may take a few seconds</p>
                          </div>
                          <GeneratingDots />
                        </motion.div>
                      ) : output ? (
                        <motion.div key="output" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className={`prose max-w-none ${isDark ? 'prose-invert' : ''}`}>
                          {renderOutput(output, isDark)}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  {/* ── Continue to Asset Creation — appears after generation ── */}
                  {output && !isGenerating && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className={`px-5 py-4 border-t bg-gradient-to-r from-[#0BA4AA]/10 to-[#F47A20]/10 ${et.border}`}
                    >
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0BA4AA] to-[#F47A20] flex items-center justify-center">
                            <CheckCircle2 className="w-4.5 h-4.5 text-white" />
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${et.text}`}>Content generated successfully</p>
                            <p className={`text-xs ${et.textFaint}`}>Continue to build your content assets step by step</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setCurrentStep(5)}
                          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                          style={{ background: 'linear-gradient(135deg,#0BA4AA,#F47A20)' }}
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Continue to Asset Creation</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Saved Assets */}
              <AnimatePresence>
                {savedAssets.length > 0 && (
                  <SavedAssetsPanel
                    assets={savedAssets}
                    onRemove={handleRemoveSavedAsset}
                    onSubmitForApproval={setApprovalTarget}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── STEP 5: Content Brief ──────────────────────────────────── */}
          {currentStep === 5 && (
            <AssetPipelineStep
              key="step5"
              stepNumber={5}
              title="Content Brief"
              subtitle="AI is building a structured brief from your generated content"
              icon="📋"
              isGenerating={isGeneratingBrief}
              output={briefOutput}
              onGenerate={generateBrief}
              onRegenerate={() => setRegenerateTarget(5)}
              onOutputChange={(v) => { setBriefOutput(v); setJustSaved(false); setBriefVersions(prev => [...prev, createVersion(v, 'manual-edit')]); }}
              versionHistory={briefVersions}
              onRestoreVersion={(v) => { setBriefOutput(v.content); setJustSaved(false); }}
              onBack={() => setCurrentStep(4)}
              onNext={() => setCurrentStep(6)}
              nextLabel="Next: Platform Copy"
              canProceed={!!briefOutput && !isGeneratingBrief}
              renderOutputFn={(t) => renderOutput(t, isDark)}
              selectedActionMeta={selectedActionMeta}
              selectedChannelMeta={selectedChannelMeta}
              selectedPlatforms={selectedPlatforms}
            />
          )}

          {/* ── STEP 6: Platform Copy ──────────────────────────────────── */}
          {currentStep === 6 && (
            <AssetPipelineStep
              key="step6"
              stepNumber={6}
              title="Platform-Specific Copy"
              subtitle="AI is creating optimized copy, hashtags, and CTAs for each platform"
              icon="✍️"
              isGenerating={isGeneratingPlatformCopy}
              output={platformCopyOutput}
              onGenerate={generatePlatformCopy}
              onRegenerate={() => setRegenerateTarget(6)}
              onOutputChange={(v) => { setPlatformCopyOutput(v); setJustSaved(false); setPlatformCopyVersions(prev => [...prev, createVersion(v, 'manual-edit')]); }}
              versionHistory={platformCopyVersions}
              onRestoreVersion={(v) => { setPlatformCopyOutput(v.content); setJustSaved(false); }}
              onBack={() => setCurrentStep(5)}
              onNext={() => setCurrentStep(7)}
              nextLabel="Next: Review & Save"
              canProceed={!!platformCopyOutput && !isGeneratingPlatformCopy}
              renderOutputFn={(t) => renderOutput(t, isDark)}
              selectedActionMeta={selectedActionMeta}
              selectedChannelMeta={selectedChannelMeta}
              selectedPlatforms={selectedPlatforms}
            />
          )}

          {/* ── STEP 7: Review & Save ──────────────────────────────────── */}
          {currentStep === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-5"
            >
              {/* Header */}
              <div className={`${glass} p-5`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0BA4AA] to-[#F47A20] flex items-center justify-center text-white font-bold text-sm">7</div>
                  <div>
                    <h2 className={`text-lg font-bold ${et.text}`}>Review & Save to Content Board</h2>
                    <p className={`text-sm ${et.textMd}`}>Review all generated assets before saving as a draft card</p>
                  </div>
                </div>

                {/* Summary badges */}
                <div className="flex items-center gap-2 flex-wrap mb-5">
                  {selectedChannelMeta && (
                    <span className="text-xs px-2.5 py-1.5 rounded-full bg-[#3E3C70]/40 text-purple-300 border border-purple-500/25 flex items-center gap-1.5">
                      <span>{selectedChannelMeta.icon}</span>
                      <span>{selectedChannelMeta.name}</span>
                    </span>
                  )}
                  <ChevronRight className={`w-3.5 h-3.5 ${et.textFaint}`} />
                  {selectedPlatforms.map(pid => {
                    const p = socialPlatforms.find(pp => pp.id === pid);
                    return (
                      <span key={pid} className={`text-xs px-2 py-1.5 rounded-full ${isDark ? 'bg-white/8 text-white/60 border border-white/15' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{p?.name}</span>
                    );
                  })}
                  <ChevronRight className={`w-3.5 h-3.5 ${et.textFaint}`} />
                  {selectedActionMeta && (
                    <span className="text-xs px-2.5 py-1.5 rounded-full bg-[#F47A20]/15 text-[#F47A20] border border-[#F47A20]/25 flex items-center gap-1.5">
                      <span>{selectedActionMeta.icon}</span>
                      <span>{selectedActionMeta.name}</span>
                    </span>
                  )}
                </div>

                {/* Asset count + Export actions */}
                <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-[#0BA4AA]/10 to-[#F47A20]/10 border ${et.border}`}>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#0BA4AA]" />
                    <div>
                      <p className={`text-sm font-semibold ${et.text}`}>3 assets ready</p>
                      <p className={`text-xs ${et.textFaint}`}>Initial content + Content brief + Platform copy</p>
                    </div>
                  </div>
                  <ExportToolbar
                    channelName={selectedChannelMeta?.name ?? ''}
                    platforms={selectedPlatforms.map(id => socialPlatforms.find(p => p.id === id)?.name ?? id)}
                    actionName={selectedActionMeta?.name ?? ''}
                    initialContent={output}
                    briefContent={briefOutput}
                    platformCopy={platformCopyOutput}
                  />
                </div>
              </div>

              {/* Collapsible asset previews */}
              <ReviewSection title="Initial Content" icon="🤖" content={output} renderOutputFn={(t) => renderOutput(t, isDark)} defaultOpen={false} />
              <ReviewSection title="Content Brief" icon="📋" content={briefOutput} renderOutputFn={(t) => renderOutput(t, isDark)} defaultOpen={false} />
              <ReviewSection title="Platform Copy" icon="✍️" content={platformCopyOutput} renderOutputFn={(t) => renderOutput(t, isDark)} defaultOpen={true} />

              {/* Save CTA */}
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className={`${glass} overflow-hidden`}
              >
                <div className="px-5 py-5 bg-gradient-to-r from-[#0BA4AA]/10 to-[#F47A20]/10">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0BA4AA] to-[#F47A20] flex items-center justify-center">
                        {justSaved
                          ? <CheckCircle2 className="w-5 h-5 text-white" />
                          : <BookmarkCheck className="w-5 h-5 text-white" />
                        }
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${et.text}`}>
                          {justSaved ? 'Saved to Content Board!' : 'All assets are ready'}
                        </p>
                        <p className={`text-xs ${et.textFaint}`}>
                          {justSaved ? 'Your draft card includes all 3 generated assets' : 'Save everything as a single draft card to your project'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowSaveModal(true)}
                      className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white transition-all ${
                        justSaved ? 'opacity-60' : 'hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                      style={{ background: justSaved
                        ? 'rgba(11,164,170,0.3)'
                        : 'linear-gradient(135deg,#0BA4AA,#F47A20)'
                      }}
                    >
                      {justSaved
                        ? <><BookmarkCheck className="w-4 h-4" /><span>Save Another Copy</span></>
                        : <><Bookmark className="w-4 h-4" /><span>Save to Content Board</span></>
                      }
                    </button>
                  </div>
                </div>

                {/* Back navigation */}
                <div className={`flex items-center justify-start px-5 py-3 border-t ${et.border}`}>
                  <button onClick={() => setCurrentStep(6)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${isDark ? 'text-white/60 hover:text-white hover:bg-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Platform Copy</span>
                  </button>
                </div>
              </motion.div>

              {/* Saved Assets */}
              <AnimatePresence>
                {savedAssets.length > 0 && (
                  <SavedAssetsPanel
                    assets={savedAssets}
                    onRemove={handleRemoveSavedAsset}
                    onSubmitForApproval={setApprovalTarget}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </BackgroundLayout>
  );
}

// ─── Regenerate Confirmation Modal ────────────────────────────────────────────

function RegenerateConfirmModal({
  stepNumber, stepLabel, hasCascade, onConfirm, onCancel,
}: {
  stepNumber: number;
  stepLabel: string;
  hasCascade: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22 }}
        onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-sm backdrop-blur-xl border rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#0d0b2a]/92 border-white/20' : 'bg-white border-gray-200'}`}
      >
        {/* Header */}
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${et.border}`}>
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${et.text}`}>Regenerate {stepLabel}?</h3>
            <p className={`text-xs ${et.textFaint}`}>Step {stepNumber}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-3">
          <p className={`text-sm leading-relaxed ${et.textMd}`}>
            This will replace the current {stepLabel.toLowerCase()} with a freshly generated version.
          </p>

          {hasCascade && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80 leading-relaxed">
                <strong className="text-amber-300">Cascading impact:</strong> Your existing Platform Copy (Step 6) will also be cleared because it was derived from the current brief.
              </p>
            </div>
          )}

          <p className={`text-xs ${et.textFaint}`}>This action cannot be undone.</p>
        </div>

        {/* Actions */}
        <div className={`flex items-center justify-end gap-2 px-5 py-3.5 border-t ${et.border} ${isDark ? 'bg-white/3' : 'bg-gray-50'}`}>
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${isDark ? 'text-white/60 hover:text-white hover:bg-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,#F47A20,#3E3C70)' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Regenerate</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Platform Character Limits ────────────────────────────────────────────────

const PLATFORM_CHAR_LIMITS: Record<string, { caption: number; label: string }> = {
  instagram:  { caption: 2200,  label: 'Instagram' },
  facebook:   { caption: 63206, label: 'Facebook' },
  twitter:    { caption: 280,   label: 'X (Twitter)' },
  linkedin:   { caption: 3000,  label: 'LinkedIn' },
  tiktok:     { caption: 2200,  label: 'TikTok' },
  youtube:    { caption: 5000,  label: 'YouTube' },
  pinterest:  { caption: 500,   label: 'Pinterest' },
  snapchat:   { caption: 80,    label: 'Snapchat' },
  threads:    { caption: 500,   label: 'Threads' },
  reddit:     { caption: 40000, label: 'Reddit' },
  whatsapp:   { caption: 4096,  label: 'WhatsApp Business' },
  telegram:   { caption: 4096,  label: 'Telegram' },
};

/** Parse platform sections from Step 6 output (## PlatformName blocks separated by ---) */
function parsePlatformSections(text: string): { platform: string; captionText: string }[] {
  const sections: { platform: string; captionText: string }[] = [];
  const blocks = text.split(/(?=^## )/m).filter(b => b.trim());
  for (const block of blocks) {
    const headerMatch = block.match(/^## (.+)/);
    if (!headerMatch) continue;
    const name = headerMatch[1].trim();
    const pid = Object.entries(PLATFORM_CHAR_LIMITS).find(
      ([, v]) => v.label.toLowerCase() === name.toLowerCase()
    )?.[0];
    if (!pid) continue;
    const captionMatch = block.match(/### Post Caption\s*\n([\s\S]*?)(?=\n### |$)/);
    const captionText = captionMatch?.[1]?.trim() ?? '';
    sections.push({ platform: pid, captionText });
  }
  return sections;
}

function ContentEditStats({
  text, stepNumber, selectedPlatforms,
}: {
  text: string;
  stepNumber: number;
  selectedPlatforms: string[];
}) {
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lineCount = text.split('\n').length;

  const platformStats = stepNumber === 6
    ? parsePlatformSections(text)
    : [];

  return (
    <div className="flex flex-col gap-2.5">
      {/* General stats bar */}
      <div className={`flex items-center gap-4 text-xs ${et.textFaint}`}>
        <span className="flex items-center gap-1.5">
          <Type className="w-3 h-3" />
          {charCount.toLocaleString()} chars
        </span>
        <span>{wordCount.toLocaleString()} words</span>
        <span>{lineCount} lines</span>
        <span className={`ml-auto ${et.textFaint}`}>Press Escape to cancel</span>
      </div>

      {/* Platform limit indicators (Step 6 only) */}
      {stepNumber === 6 && selectedPlatforms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedPlatforms.map(pid => {
            const limit = PLATFORM_CHAR_LIMITS[pid];
            if (!limit) return null;
            const section = platformStats.find(s => s.platform === pid);
            const captionLen = section?.captionText.length ?? 0;
            const found = !!section;
            const ratio = captionLen / limit.caption;
            const isOver = ratio > 1;
            const isNear = ratio > 0.85 && ratio <= 1;
            const statusColor = !found
              ? (isDark ? 'text-white/30 border-white/10 bg-white/4' : 'text-gray-400 border-gray-200 bg-gray-50')
              : isOver
                ? 'text-red-400 border-red-500/30 bg-red-500/10'
                : isNear
                  ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                  : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
            const StatusIcon = !found ? null : isOver ? AlertCircle : isNear ? AlertTriangle : CheckCircle2;

            return (
              <div
                key={pid}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] transition-all ${statusColor}`}
                title={found
                  ? `Caption: ${captionLen.toLocaleString()} / ${limit.caption.toLocaleString()} chars`
                  : `${limit.label} section not detected`
                }
              >
                {StatusIcon && <StatusIcon className="w-3 h-3 shrink-0" />}
                <span className="font-medium">{limit.label}</span>
                {found && (
                  <span className="opacity-70">
                    {captionLen.toLocaleString()}/{limit.caption.toLocaleString()}
                  </span>
                )}
                {isOver && (
                  <span className="font-semibold">
                    (+{(captionLen - limit.caption).toLocaleString()})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Asset Pipeline Step ──────────────────────────────────────────────────────

function AssetPipelineStep({
  stepNumber, title, subtitle, icon,
  isGenerating, output, onGenerate, onRegenerate, onOutputChange, onBack, onNext,
  nextLabel, canProceed, renderOutputFn,
  selectedActionMeta, selectedChannelMeta, selectedPlatforms,
  versionHistory = [], onRestoreVersion,
}: {
  stepNumber: number;
  title: string;
  subtitle: string;
  icon: string;
  isGenerating: boolean;
  output: string;
  onGenerate: () => void;
  onRegenerate: () => void;
  onOutputChange: (updated: string) => void;
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  canProceed: boolean;
  renderOutputFn: (text: string) => React.ReactNode;
  selectedActionMeta: { name: string; icon: string } | undefined;
  selectedChannelMeta: { name: string; icon: string } | undefined;
  selectedPlatforms: string[];
  versionHistory?: ContentVersion[];
  onRestoreVersion?: (v: ContentVersion) => void;
}) {
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);
  const glass = et.glass;

  const hasTriggered = useRef(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [diffPair, setDiffPair] = useState<[string, string] | null>(null); // [versionIdA, versionIdB]

  useEffect(() => {
    if (!hasTriggered.current && !output && !isGenerating) {
      hasTriggered.current = true;
      onGenerate();
    }
  }, []);

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = () => {
    setEditBuffer(output);
    setIsEditing(true);
    setShowVersionHistory(false);
    setDiffPair(null);
    // Auto-focus textarea after render
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSaveEdit = () => {
    const trimmed = editBuffer.trim();
    if (trimmed && trimmed !== output) {
      onOutputChange(trimmed);
      toast.success('Changes saved');
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditBuffer('');
    setIsEditing(false);
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditBuffer(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <motion.div
      key={`step${stepNumber}`}
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-5"
    >
      <div className={`${glass} overflow-hidden`}>
        {/* Header */}
        <div className={`p-5 border-b ${et.border}`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0BA4AA] to-[#F47A20] flex items-center justify-center text-white font-bold text-sm">{stepNumber}</div>
              <div>
                <h2 className={`text-lg font-bold ${et.text} flex items-center gap-2`}>
                  <span>{icon}</span>
                  <span>{title}</span>
                </h2>
                <p className={`text-sm ${et.textMd}`}>{subtitle}</p>
              </div>
            </div>

            {/* Copy + Edit + Regenerate actions */}
            {(() => {
              const secBtn = `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-xs ${isDark ? 'bg-white/8 border border-white/15 text-white/60 hover:text-white hover:bg-white/12' : 'bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`;
              return (<>
            {output && !isGenerating && !isEditing && (
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleCopy} className={secBtn}>
                  {copied ? <Check className="w-3 h-3 text-[#0BA4AA]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button onClick={handleStartEdit} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0BA4AA]/15 border border-[#0BA4AA]/30 text-[#0BA4AA] hover:bg-[#0BA4AA]/25 transition-all text-xs">
                  <Pencil className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button onClick={onRegenerate} disabled={isGenerating} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F47A20]/15 border border-[#F47A20]/30 text-[#F47A20] hover:bg-[#F47A20]/25 transition-all text-xs disabled:opacity-50">
                  <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
                {versionHistory.length > 1 && (
                  <button
                    onClick={() => { setShowVersionHistory(v => !v); setDiffPair(null); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-xs ${showVersionHistory ? 'bg-[#3E3C70]/40 border border-purple-500/40 text-purple-300' : isDark ? 'bg-white/8 border border-white/15 text-white/60 hover:text-white hover:bg-white/12' : 'bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}
                  >
                    <History className="w-3 h-3" />
                    <span>History</span>
                    <span className="text-[10px] opacity-60">({versionHistory.length})</span>
                  </button>
                )}
              </div>
            )}
            {isEditing && (
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={handleCancelEdit} className={secBtn}>
                  <XIcon className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
                <button onClick={handleSaveEdit} disabled={!editBuffer.trim()} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0BA4AA]/20 border border-[#0BA4AA]/40 text-[#0BA4AA] hover:bg-[#0BA4AA]/30 transition-all text-xs font-semibold disabled:opacity-40">
                  <Check className="w-3 h-3" />
                  <span>Save</span>
                </button>
              </div>
            )}
              </>);
            })()}
          </div>

          {/* Context badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedChannelMeta && (
              <span className="text-xs px-2 py-1 rounded-full bg-[#3E3C70]/40 text-purple-300 border border-purple-500/25 flex items-center gap-1">
                <span>{selectedChannelMeta.icon}</span>
                <span>{selectedChannelMeta.name}</span>
              </span>
            )}
            {selectedPlatforms.slice(0, 3).map(pid => {
              const p = socialPlatforms.find(pp => pp.id === pid);
              return <span key={pid} className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-white/8 text-white/50 border border-white/10' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>{p?.name}</span>;
            })}
            {selectedPlatforms.length > 3 && <span className={`text-xs ${et.textFaint}`}>+{selectedPlatforms.length - 3} more</span>}
            {selectedActionMeta && (
              <span className="text-xs px-2 py-1 rounded-full bg-[#F47A20]/15 text-[#F47A20] border border-[#F47A20]/25 flex items-center gap-1">
                <span>{selectedActionMeta.icon}</span>
                <span>{selectedActionMeta.name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="p-5 min-h-[280px]">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-14 gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-2 border-[#0BA4AA]/30" />
                  <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-transparent border-t-[#0BA4AA] animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-[#0BA4AA]" />
                </div>
                <div className="text-center">
                  <p className={`text-sm font-medium ${et.textMd}`}>AI is generating your {title.toLowerCase()}…</p>
                  <p className={`text-xs mt-1 ${et.textFaint}`}>Building on your previous content</p>
                </div>
                <GeneratingDots />
              </motion.div>
            ) : output && isEditing ? (
              <motion.div key="editing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs text-[#0BA4AA]/70">
                  <Pencil className="w-3 h-3" />
                  <span>Editing mode — modify the content below and click Save</span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={editBuffer}
                  onChange={handleTextareaChange}
                  onKeyDown={e => { if (e.key === 'Escape') handleCancelEdit(); }}
                  className={`w-full min-h-[240px] p-4 rounded-xl border border-[#0BA4AA]/25 text-sm leading-relaxed font-mono resize-y focus:outline-none focus:ring-2 focus:ring-[#0BA4AA]/40 focus:border-[#0BA4AA]/50 transition-all ${isDark ? 'bg-white/5 text-white/90 placeholder-white/25' : 'bg-gray-50 text-gray-800 placeholder-gray-400'}`}
                  placeholder="Edit your content here..."
                  spellCheck={false}
                />
                <ContentEditStats text={editBuffer} stepNumber={stepNumber} selectedPlatforms={selectedPlatforms} />
              </motion.div>
            ) : output ? (
              <motion.div key="output" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className={`prose max-w-none ${isDark ? 'prose-invert' : ''}`}>
                {renderOutputFn(output)}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Version History Panel */}
        <AnimatePresence>
          {showVersionHistory && versionHistory.length > 1 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`overflow-hidden border-t ${et.border}`}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-400" />
                    <h3 className={`text-sm font-semibold ${et.text}`}>Version History</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'text-white/30 bg-white/5' : 'text-gray-400 bg-gray-100'}`}>{versionHistory.length} versions</span>
                  </div>
                  {diffPair && (
                    <button
                      onClick={() => setDiffPair(null)}
                      className={`flex items-center gap-1 text-xs transition-all ${isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      <XIcon className="w-3 h-3" />
                      <span>Close diff</span>
                    </button>
                  )}
                </div>

                {/* Version list */}
                <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1 mb-3 scrollbar-thin">
                  {[...versionHistory].reverse().map((ver, idx) => {
                    const vIdx = versionHistory.length - idx;
                    const isLatest = idx === 0;
                    const isCurrent = ver.content === output;
                    const isSelectedForDiff = diffPair?.includes(ver.id);
                    const ts = new Date(ver.timestamp);
                    const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={ver.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all group ${
                          isCurrent
                            ? 'bg-[#0BA4AA]/10 border-[#0BA4AA]/25'
                            : isSelectedForDiff
                              ? 'bg-purple-500/10 border-purple-500/25'
                              : isDark ? 'bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/15' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <span className={`text-xs font-mono w-6 text-right shrink-0 ${et.textFaint}`}>v{vIdx}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ${
                          ver.source === 'ai-generated'
                            ? 'bg-[#0BA4AA]/15 text-[#0BA4AA] border border-[#0BA4AA]/20'
                            : 'bg-[#F47A20]/15 text-[#F47A20] border border-[#F47A20]/20'
                        }`}>
                          {ver.source === 'ai-generated' ? '🤖 AI' : '✏️ Edit'}
                        </span>
                        <span className={`text-xs truncate flex-1 ${et.textMd}`}>
                          {ver.content.slice(0, 80).replace(/\n/g, ' ')}…
                        </span>
                        <span className={`text-[10px] shrink-0 ${et.textFaint}`}>{timeStr}</span>
                        {isCurrent && (
                          <span className="text-[10px] text-[#0BA4AA] font-semibold shrink-0">current</span>
                        )}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!isCurrent && onRestoreVersion && (
                            <button
                              onClick={() => { onRestoreVersion(ver); toast.success(`Restored to v${vIdx}`); }}
                              className="text-[10px] px-2 py-1 rounded-md bg-[#0BA4AA]/15 text-[#0BA4AA] hover:bg-[#0BA4AA]/25 transition-all"
                            >
                              Restore
                            </button>
                          )}
                          {versionHistory.length >= 2 && (
                            <button
                              onClick={() => {
                                if (!diffPair) {
                                  // Select as first diff target, pair with the latest version
                                  const latestId = versionHistory[versionHistory.length - 1].id;
                                  if (ver.id !== latestId) {
                                    setDiffPair([ver.id, latestId]);
                                  } else if (versionHistory.length >= 2) {
                                    setDiffPair([versionHistory[versionHistory.length - 2].id, ver.id]);
                                  }
                                } else if (diffPair.includes(ver.id)) {
                                  setDiffPair(null);
                                } else {
                                  setDiffPair([diffPair[0], ver.id]);
                                }
                              }}
                              className={`text-[10px] px-2 py-1 rounded-md transition-all ${
                                isSelectedForDiff
                                  ? 'bg-purple-500/25 text-purple-300'
                                  : isDark ? 'bg-white/8 text-white/40 hover:bg-white/15 hover:text-white/60' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                              }`}
                            >
                              Diff
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Diff view */}
                <AnimatePresence>
                  {diffPair && (() => {
                    const vA = versionHistory.find(v => v.id === diffPair[0]);
                    const vB = versionHistory.find(v => v.id === diffPair[1]);
                    if (!vA || !vB) return null;
                    const idxA = versionHistory.indexOf(vA) + 1;
                    const idxB = versionHistory.indexOf(vB) + 1;
                    const diffLines = computeLineDiff(vA.content, vB.content);
                    const addedCount = diffLines.filter(d => d.type === 'added').length;
                    const removedCount = diffLines.filter(d => d.type === 'removed').length;

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-xl border border-purple-500/20 bg-purple-500/5 overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-purple-500/15">
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-purple-300 font-semibold">Comparing v{idxA} → v{idxB}</span>
                            <span className="text-emerald-400">+{addedCount} added</span>
                            <span className="text-red-400">−{removedCount} removed</span>
                          </div>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-3 font-mono text-xs leading-relaxed scrollbar-thin">
                          {diffLines.map((line, i) => (
                            <div
                              key={i}
                              className={`px-2 py-0.5 rounded-sm ${
                                line.type === 'added'
                                  ? 'bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500/50'
                                  : line.type === 'removed'
                                    ? 'bg-red-500/10 text-red-300 border-l-2 border-red-500/50 line-through opacity-70'
                                    : isDark ? 'text-white/35' : 'text-gray-400'
                              }`}
                            >
                              <span className="inline-block w-6 text-right mr-2 opacity-40 select-none">
                                {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
                              </span>
                              {line.text || '\u00A0'}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation footer */}
        {output && !isGenerating && !isEditing && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`px-5 py-4 border-t flex items-center justify-between ${et.border}`}>
            <button onClick={onBack} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all ${isDark ? 'text-white/60 hover:text-white hover:bg-white/8' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              onClick={onNext}
              disabled={!canProceed}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: canProceed ? 'linear-gradient(135deg,#0BA4AA,#F47A20)' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') }}
            >
              <span>{nextLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Export Toolbar ───────────────────────────────────────────────────────────

function ExportToolbar({
  channelName, platforms, actionName, initialContent, briefContent, platformCopy,
}: {
  channelName: string;
  platforms: string[];
  actionName: string;
  initialContent: string;
  briefContent: string;
  platformCopy: string;
}) {
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const dateSlug = new Date().toISOString().slice(0, 10);

  const handleCopyAll = () => {
    const text = buildExportContent(channelName, platforms, actionName, initialContent, briefContent, platformCopy, 'text');
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('All content copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
    setShowMenu(false);
  };

  const handleDownloadMarkdown = () => {
    const md = buildExportContent(channelName, platforms, actionName, initialContent, briefContent, platformCopy, 'markdown');
    triggerDownload(md, `brandtelligence-content-${dateSlug}.md`, 'text/markdown;charset=utf-8');
    toast.success('Downloaded as Markdown');
    setShowMenu(false);
  };

  const handleDownloadText = () => {
    const txt = buildExportContent(channelName, platforms, actionName, initialContent, briefContent, platformCopy, 'text');
    triggerDownload(txt, `brandtelligence-content-${dateSlug}.txt`, 'text/plain;charset=utf-8');
    toast.success('Downloaded as plain text');
    setShowMenu(false);
  };

  const handleDownloadJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      channel: channelName,
      platforms,
      action: actionName,
      assets: {
        initialContent,
        contentBrief: briefContent,
        platformCopy,
      },
      meta: { generator: 'Brandtelligence AI', version: '1.0' },
    };
    triggerDownload(JSON.stringify(data, null, 2), `brandtelligence-content-${dateSlug}.json`, 'application/json;charset=utf-8');
    toast.success('Downloaded as JSON');
    setShowMenu(false);
  };

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        onClick={() => setShowMenu(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
          showMenu
            ? 'bg-[#0BA4AA]/20 border border-[#0BA4AA]/40 text-[#0BA4AA]'
            : isDark ? 'bg-white/8 border border-white/15 text-white/60 hover:text-white hover:bg-white/12' : 'bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-200'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Export</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 top-full mt-2 w-56 z-50 backdrop-blur-xl border rounded-xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#0d0b2a]/95 border-white/20' : 'bg-white border-gray-200'}`}
          >
            <div className={`px-3 py-2 border-b ${et.border}`}>
              <p className={`text-[10px] uppercase tracking-wider font-semibold ${et.textFaint}`}>Export Content Package</p>
            </div>

            <div className="py-1">
              {(() => {
                const menuBtnCls = `w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all ${isDark ? 'text-white/70 hover:text-white hover:bg-white/8' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`;
                const menuDescCls = `text-[10px] ${et.textFaint}`;
                return (<>
              <button onClick={handleCopyAll} className={menuBtnCls}>
                <div className="w-7 h-7 rounded-lg bg-[#0BA4AA]/15 flex items-center justify-center shrink-0">
                  {copied ? <Check className="w-3.5 h-3.5 text-[#0BA4AA]" /> : <Copy className="w-3.5 h-3.5 text-[#0BA4AA]" />}
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium">{copied ? 'Copied!' : 'Copy All'}</p>
                  <p className={menuDescCls}>All 3 assets to clipboard</p>
                </div>
              </button>

              <button onClick={handleDownloadMarkdown} className={menuBtnCls}>
                <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
                  <FileCode className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium">Download Markdown</p>
                  <p className={menuDescCls}>.md — formatted with headings</p>
                </div>
              </button>

              <button onClick={handleDownloadText} className={menuBtnCls}>
                <div className="w-7 h-7 rounded-lg bg-[#F47A20]/15 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5 text-[#F47A20]" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium">Download Plain Text</p>
                  <p className={menuDescCls}>.txt — universal compatibility</p>
                </div>
              </button>

              <button onClick={handleDownloadJSON} className={menuBtnCls}>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium">Download JSON</p>
                  <p className={menuDescCls}>.json — structured data export</p>
                </div>
              </button>
                </>);
              })()}
            </div>

            <div className={`px-3 py-2 border-t ${et.border}`}>
              <p className={`text-[10px] text-center ${et.textFaint}`}>Includes all 3 generated assets</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ReviewSection (collapsible) ──────────────────────────────────────────────

function ReviewSection({
  title, icon, content, renderOutputFn, defaultOpen,
}: {
  title: string;
  icon: string;
  content: string;
  renderOutputFn: (text: string) => React.ReactNode;
  defaultOpen: boolean;
}) {
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!content) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`${glass} overflow-hidden`}>
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <span className={`text-sm font-semibold ${et.text}`}>{title}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#0BA4AA]/15 text-[#0BA4AA] border border-[#0BA4AA]/25">
            {content.split('\n').length} lines
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${et.textFaint}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className={`px-5 pb-5 pt-2 border-t max-h-72 overflow-y-auto ${et.border}`}>
              <div className={`prose max-w-none ${isDark ? 'prose-invert' : ''}`}>
                {renderOutputFn(content)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Mock generators for asset pipeline ───────────────────────────────────────

function generateMockBrief(actionName: string, platforms: string): string {
  return `## Content Brief — ${actionName}

### Campaign Objective
Drive brand awareness and engagement across ${platforms} through strategic, AI-powered content that resonates with the target audience and supports quarterly business goals.

### Target Audience
- **Primary:** Professionals aged 25-45, digitally savvy, active on social media
- **Secondary:** Decision-makers in SMEs looking for marketing solutions
- **Psychographics:** Value innovation, data-driven insights, and creative storytelling

### Key Messages
1. **Brand Authority** — Position as the go-to expert in the industry
2. **Value Proposition** — Highlight unique benefits and ROI
3. **Community Building** — Foster engagement through interactive content
4. **Thought Leadership** — Share insights, trends, and expert opinions
5. **Call-to-Action** — Drive conversions with clear, compelling CTAs

### Content Pillars
| Pillar | Description | Frequency |
|--------|-------------|-----------|
| Educational | Tips, tutorials, industry insights | 3x/week |
| Engagement | Polls, questions, user-generated content | 2x/week |
| Promotional | Product features, offers, case studies | 2x/week |
| Behind-the-Scenes | Team culture, process, values | 1x/week |

### Tone & Voice Guidelines
- **Professional** yet approachable
- **Confident** without being arrogant
- **Data-informed** with a human touch
- Use active voice and concise sentences
- Incorporate relevant emojis sparingly for social platforms

### KPIs & Success Metrics
- Engagement rate: Target 4.5%+ across platforms
- Reach growth: 15% month-over-month
- Click-through rate: 2.5%+ on CTA posts
- Follower growth: 10% monthly increase
- Content saves/shares: Track as leading indicator`;
}

function generateMockPlatformCopy(platformIds: string[]): string {
  const platformBlocks = platformIds.map(pid => {
    const p = socialPlatforms.find(pp => pp.id === pid);
    const name = p?.name ?? pid;

    const copies: Record<string, string> = {
      instagram: `## Instagram

### Post Caption
🚀 Ready to transform your social media game? Here's what the top brands are doing differently in 2026 — and how you can stay ahead of the curve.

The secret? It's not just about posting more. It's about posting **smarter**.

Swipe through to discover our 5-step framework for content that converts 👉

### Hashtags
#SocialMediaMarketing #ContentStrategy #DigitalMarketing #BrandGrowth #MarketingTips #SocialMediaTips #ContentCreation #BrandStrategy #MarketingStrategy2026 #GrowthHacking #InstagramMarketing #ContentCalendar

### Call-to-Action
💡 Save this post for later & tag someone who needs to see this!

### Best Posting Time
Tuesday & Thursday at 10:00 AM — 12:00 PM (peak engagement window)

### Visual Direction
Carousel post with bold typography on gradient backgrounds (teal → orange brand colors). Each slide reveals one step of the framework with supporting icons and data visualizations.`,

      facebook: `## Facebook

### Post Caption
Did you know that 78% of brands that use strategic content planning see 3x more engagement? 📊

We've been testing this approach with our clients, and the results speak for themselves. Here's what we learned after analyzing 10,000+ posts across different industries…

[Read more in the comments 👇]

### Hashtags
#ContentMarketing #SocialMediaStrategy #DigitalMarketing #BusinessGrowth #MarketingInsights

### Call-to-Action
What's your biggest content challenge? Drop it in the comments and we'll share a quick tip! 💬

### Best Posting Time
Wednesday at 1:00 PM — 3:00 PM

### Visual Direction
Eye-catching infographic with key statistics highlighted. Use brand colors with a professional, data-driven aesthetic. Include the company logo subtly in the corner.`,

      tiktok: `## TikTok

### Post Caption
POV: You just discovered the content strategy that changed everything 🤯 #ContentTips #MarketingHacks

### Hashtags
#ContentStrategy #SocialMediaTips #MarketingHacks #DigitalMarketing #ContentCreator #TikTokBusiness #LearnOnTikTok #MarketingTok #BrandGrowth #ViralContent

### Call-to-Action
Follow for more marketing tips that actually work ✨

### Best Posting Time
Monday, Wednesday, Friday at 7:00 PM — 9:00 PM

### Visual Direction
15-second fast-paced video with text overlays. Start with a hook ("Stop scrolling if you want more engagement"), show quick before/after metrics, end with a surprising reveal. Use trending audio.`,

      linkedin: `## LinkedIn

### Post Caption
I spent 6 months analyzing what makes social media content actually convert.

Here's the uncomfortable truth: Most brands are still doing it wrong.

The top-performing content in 2026 follows a simple framework:

→ Research your audience deeply (not just demographics)
→ Create pillar content that educates AND entertains
→ Optimize for each platform's unique algorithm
→ Measure what matters (hint: it's not just likes)
→ Iterate based on data, not gut feeling

The brands that embrace this? They're seeing 3-5x ROI on their content investment.

What's your experience? I'd love to hear what's working for your team.

### Hashtags
#ContentMarketing #SocialMediaStrategy #DigitalMarketing #B2BMarketing #MarketingLeadership

### Call-to-Action
♻️ Repost if this resonates. Follow for weekly marketing insights.

### Best Posting Time
Tuesday & Thursday at 8:00 AM — 10:00 AM

### Visual Direction
Clean, professional document-style post with key statistics as pull quotes. Use the brand's deep purple as the accent color. Professional headshot of the poster for authenticity.`,

      twitter: `## X (Twitter)

### Post Caption
Most brands post content.
Top brands post *strategy*.

Here's the 5-step framework that turns random posts into a growth engine 🧵👇

### Hashtags
#ContentStrategy #MarketingTips #SocialMedia #DigitalMarketing #GrowthHacking

### Call-to-Action
RT + Follow for more actionable marketing frameworks

### Best Posting Time
Monday — Friday at 12:00 PM — 1:00 PM

### Visual Direction
Thread format with a hero image for the first tweet. Each subsequent tweet includes a numbered visual card (1/5, 2/5, etc.) with one key insight per card. Clean, minimalist design.`,

      youtube: `## YouTube

### Post Caption
🎯 The Complete Social Media Content Strategy for 2026 | Step-by-Step Framework

In this video, we break down the exact content strategy framework that top brands use to 3x their social media engagement. Whether you're a small business or an agency, this framework works.

Timestamps:
0:00 — Introduction
1:30 — Why most content strategies fail
3:45 — The 5-step framework explained
8:20 — Real case studies & results
12:00 — How to implement this TODAY
14:30 — Tools & resources

### Hashtags
#ContentStrategy #SocialMediaMarketing #DigitalMarketing #MarketingStrategy #ContentCreation

### Call-to-Action
📌 Subscribe & hit the bell for weekly marketing strategies. Drop a comment with your biggest takeaway!

### Best Posting Time
Saturday at 10:00 AM — 12:00 PM

### Visual Direction
Professional thumbnail with bold text "3X Your Engagement", presenter's face showing surprise/excitement, brand colors as background gradient, YouTube-optimized 16:9 ratio.`,
    };

    return copies[pid] ?? `## ${name}\n\n### Post Caption\nExciting content coming your way! Stay tuned for our latest campaign across ${name}. 🚀\n\n### Hashtags\n#${name.replace(/\\s+/g, '')} #ContentMarketing #SocialMedia #DigitalMarketing #BrandGrowth\n\n### Call-to-Action\nEngage with us! Like, share, and follow for more updates.\n\n### Best Posting Time\nWeekdays at 10:00 AM — 2:00 PM\n\n### Visual Direction\nBrand-consistent visual with ${name}-optimized dimensions. Use brand colors and clean typography.`;
  });

  return platformBlocks.join('\n\n---\n\n');
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
  const actionMeta = contentActions.find(a => a.id === rec.template);

  return (
    <div
      className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer group ${isActive ? 'bg-[#0BA4AA]/10 border-[#0BA4AA]/30' : 'bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/15'}`}
      onClick={() => onRestore(rec)}
    >
      <span className="text-sm mt-0.5 shrink-0">{actionMeta?.icon ?? '📋'}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-white/70 truncate">{actionMeta?.name ?? rec.template}</span>
          <span className="text-[10px] text-white/30">{socialPlatforms.find(p => p.id === rec.platform)?.name ?? rec.platform}</span>
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
