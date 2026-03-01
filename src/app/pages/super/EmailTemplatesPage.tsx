import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Edit3, Eye, RotateCcw, Send, Save, Copy, Check,
  ChevronDown, ChevronUp, AlertCircle, Sparkles, X, Palette,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { Field, Input } from '../../components/saas/DrawerForm';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import {
  DEFAULT_EMAIL_TEMPLATES, TEMPLATE_TAGS,
  EmailTemplate, EmailTemplateTag,
} from '../../data/defaultEmailTemplates';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHeaders';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

const TAG_COLOURS: Record<string, string> = {
  Onboarding: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  Billing:    'bg-teal-500/20 text-teal-600 border-teal-500/30',
  Dunning:    'bg-red-500/20 text-red-600 border-red-500/30',
  Security:   'bg-amber-500/20 text-amber-600 border-amber-500/30',
  System:     'bg-sky-500/20 text-sky-600 border-sky-500/30',
};

const TAG_ICONS: Record<string, string> = {
  Onboarding: '🚀', Billing: '💳', Dunning: '⚠️', Security: '🔐', System: '⚙️',
};

export function EmailTemplatesPage() {
  const t = useDashboardTheme();

  // Merge default templates with any KV-saved customisations
  const [templates, setTemplates]       = useState<(EmailTemplate & { savedAt?: string; customised?: boolean })[]>(
    DEFAULT_EMAIL_TEMPLATES.map(tpl => ({ ...tpl }))
  );
  const [loadingIds, setLoadingIds]     = useState<Set<string>>(new Set());
  const [activeTag, setActiveTag]       = useState<EmailTemplateTag | 'All'>('All');

  // Editor drawer
  const [editing, setEditing]           = useState<EmailTemplate | null>(null);
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editorTab, setEditorTab]       = useState<'edit' | 'preview'>('edit');
  const [editSubject, setEditSubject]   = useState('');
  const [editHtml, setEditHtml]         = useState('');
  const [saving, setSaving]             = useState(false);
  const [resetting, setResetting]       = useState(false);
  const [varsOpen, setVarsOpen]         = useState(true);
  const [stylesOpen, setStylesOpen]     = useState(true);
  const [copied, setCopied]             = useState<string | null>(null);

  // Test send modal
  const [testOpen, setTestOpen]         = useState(false);
  const [testEmail, setTestEmail]       = useState('it@brandtelligence.com.my');
  const [testing, setTesting]           = useState(false);

  // Load all saved templates from KV on mount
  useEffect(() => {
    DEFAULT_EMAIL_TEMPLATES.forEach(async (tpl) => {
      try {
        const res  = await fetch(`${SERVER}/email-templates/${tpl.id}`, { headers: await getAuthHeaders(true) });
        const json = await res.json();
        if (json.template) {
          setTemplates(prev => prev.map(t =>
            t.id === tpl.id
              ? { ...tpl, ...json.template, customised: true }
              : t
          ));
        }
      } catch {
        // ignore — use default
      }
    });
  }, []);

  const openEditor = (tpl: EmailTemplate & { savedAt?: string; customised?: boolean }) => {
    setEditing(tpl);
    setEditSubject(tpl.subject);
    setEditHtml(tpl.html);
    setEditorTab('edit');
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = { ...editing, subject: editSubject, html: editHtml };
      const res = await fetch(`${SERVER}/email-templates/${editing.id}`, {
        method: 'PUT',
        headers: await getAuthHeaders(true),
        body: JSON.stringify(updated),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setTemplates(prev => prev.map(tpl =>
        tpl.id === editing.id
          ? { ...updated, customised: true, savedAt: new Date().toISOString() }
          : tpl
      ));
      toast.success('Template saved successfully');
      setDrawerOpen(false);
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
      console.error('[EmailTemplatesPage] save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!editing) return;
    setResetting(true);
    try {
      const res = await fetch(`${SERVER}/email-templates/${editing.id}`, {
        method: 'DELETE', headers: await getAuthHeaders(true),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Reset failed');
      const original = DEFAULT_EMAIL_TEMPLATES.find(tpl => tpl.id === editing.id)!;
      setEditSubject(original.subject);
      setEditHtml(original.html);
      setTemplates(prev => prev.map(tpl =>
        tpl.id === editing.id ? { ...original, customised: false } : tpl
      ));
      toast.success('Template reset to default');
    } catch (err: any) {
      toast.error(`Reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail || !editing) return;
    setTesting(true);
    try {
      const res = await fetch(`${SERVER}/email-templates/${editing.id}/test`, {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({ to: testEmail, subject: editSubject, html: editHtml }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Send failed');
      toast.success(`Preview sent to ${testEmail} — check inbox`);
      setTestOpen(false);
    } catch (err: any) {
      toast.error(err.message);
      console.error('[EmailTemplatesPage] test error:', err);
    } finally {
      setTesting(false);
    }
  };

  const copyVar = useCallback((key: string) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  // ── Inline CSS colour helpers ────────────────────────────────────────────────
  const COLOR_LABELS: Record<string, string> = {
    '#7c3aed': 'Primary Purple',
    '#0d9488': 'Teal Accent',
    '#f59e0b': 'Amber / Warning',
    '#dc2626': 'Red / Danger',
    '#16a34a': 'Green / Success',
    '#1a1a2e': 'Heading Text',
    '#f4f4f7': 'Body Background',
    '#ffffff': 'Card Background',
    '#f8f8f8': 'Section Background',
    '#f8f8fb': 'Info Table Background',
    '#eeeeee': 'Divider / Border',
    '#aaaaaa': 'Footer Text',
    '#888888': 'Muted Text',
    '#888':    'Muted Text',
    '#666666': 'Secondary Text',
    '#666':    'Secondary Text',
    '#444444': 'Body Text',
    '#444':    'Body Text',
    '#333333': 'Dark Text',
    '#333':    'Dark Text',
    '#92400e': 'Amber Dark',
    '#fef3c7': 'Highlight Background',
    '#fff5f5': 'Warning Box Background',
    '#fca5a5': 'Warning Box Border',
    '#f0fdf4': 'Success Box Background',
    '#86efac': 'Success Box Border',
  };

  // Expand 3-digit hex (#abc → #aabbcc) for <input type="color">
  const expandHex = (hex: string): string => {
    if (hex.length === 4) {
      return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
    }
    return hex;
  };

  // Extract all unique hex colours from the HTML (longest match first to avoid #abc matching inside #aabbcc)
  const extractColors = (html: string): string[] => {
    const sixDigit  = [...(html.match(/#[0-9a-fA-F]{6}/g) ?? [])];
    const threeDigit = [...(html.match(/#[0-9a-fA-F]{3}(?![0-9a-fA-F])/g) ?? [])];
    // Normalise to lowercase and deduplicate; prefer 6-digit, filter 3-digit that are subsets
    const sixSet = new Set(sixDigit.map(c => c.toLowerCase()));
    const threeFiltered = threeDigit.filter(c => {
      const expanded = expandHex(c.toLowerCase());
      return !sixSet.has(expanded);  // skip if a 6-digit version already exists
    });
    const all = [...sixSet, ...new Set(threeFiltered.map(c => c.toLowerCase()))];
    // Sort: labelled colours first, then alphabetically
    return all.sort((a, b) => {
      const aLabelled = !!COLOR_LABELS[a];
      const bLabelled = !!COLOR_LABELS[b];
      if (aLabelled && !bLabelled) return -1;
      if (!aLabelled && bLabelled) return 1;
      return a.localeCompare(b);
    });
  };

  const handleColorChange = (oldColor: string, newColor: string) => {
    // Replace all occurrences (case-insensitive) in the raw HTML
    const escaped = oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    setEditHtml(prev => prev.replace(regex, newColor));
  };

  // Build preview with sample values
  const samples: Record<string, string> = {
    companyName: 'Acme Corp Sdn Bhd', contactName: 'Ahmad Hafiz', contactEmail: 'ahmad@acme.com.my',
    adminName: 'Siti Nuraini', inviteUrl: '#', expiresAt: '24 hours from now', plan: 'Growth',
    tenantName: 'Acme Corp Sdn Bhd', invoiceNumber: 'INV-2026-042', amount: '1,299.00',
    issueDate: '1 Feb 2026', dueDate: '15 Feb 2026', invoiceUrl: '#',
    daysOverdue: '5', suspensionDate: '20 Feb 2026', paymentDate: '10 Feb 2026',
    paymentMethod: 'FPX Online Transfer', receiptUrl: '#',
    country: 'Malaysia', size: '11–50 employees', submittedAt: '24 Feb 2026, 10:30 AM',
    adminPanelUrl: '#', reason: 'Overdue invoice for 30+ days',
    supportEmail: 'support@brandtelligence.com.my', reactivatedAt: '24 Feb 2026, 2:15 PM',
    portalUrl: '#', userName: 'Ahmad Hafiz', resetUrl: '#', ipAddress: '115.134.xx.xx',
    employeeName: 'Lim Wei Jing', role: 'Employee',
    smtpHost: 'smtp.sendgrid.net', smtpPort: '587', fromEmail: 'no-reply@brandtelligence.com.my',
    sentTo: 'it@brandtelligence.com.my', sentAt: '24 Feb 2026, 10:00 AM',
    // Auth templates (12–16)
    email: 'ahmad@acme.com.my', confirmUrl: '#',
    invitedByName: 'Siti Nuraini', invitedByEmail: 'siti@brandtelligence.com.my',
    magicLinkUrl: '#',
    oldEmail: 'ahmad.old@acme.com.my', newEmail: 'ahmad.new@acme.com.my', changeUrl: '#',
    reauthUrl: '#', actionDescription: 'Change Password',
  };

  // Two-pass replacement:
  // Pass 1 — variables inside HTML attributes (e.g. href="{{url}}") → replace with raw value only
  // Pass 2 — variables in text content → wrap with highlighted span
  const previewHtml = editHtml
    .replace(/(=["'][^"']*)\{\{(\w+)\}\}([^"']*["'])/g, (_, pre, k, post) =>
      `${pre}${samples[k] ?? `{{${k}}}`}${post}`
    )
    .replace(/\{\{(\w+)\}\}/g, (_, k) =>
      `<span style="background:#fef3c7;border:1px dashed #f59e0b;border-radius:4px;padding:1px 4px;font-size:0.9em;color:#92400e;">${samples[k] ?? `{{${k}}}`}</span>`
    );

  const filtered = activeTag === 'All'
    ? templates
    : templates.filter(tpl => tpl.tag === activeTag);

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  return (
    <div>
      <PageHeader
        title="Email Templates"
        subtitle="Customise every system email sent by the platform — changes are persisted and applied immediately"
        actions={
          <div className={`flex items-center gap-2 text-xs ${t.textFaint}`}>
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>{templates.filter(tpl => (tpl as any).customised).length} of {templates.length} customised</span>
          </div>
        }
      />

      {/* Tag filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['All', ...TEMPLATE_TAGS] as const).map(tag => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag as any)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              activeTag === tag
                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                : `${t.s0} ${t.border} ${t.textMd} ${t.hover}`
            }`}
          >
            {tag !== 'All' && <span className="mr-1">{TAG_ICONS[tag]}</span>}
            {tag}
            {tag !== 'All' && (
              <span className={`ml-1.5 text-xs ${activeTag === tag ? 'opacity-70' : t.textFaint}`}>
                ({templates.filter(tpl => tpl.tag === tag).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((tpl, i) => {
          const isCustomised = !!(tpl as any).customised;
          return (
            <motion.div
              key={tpl.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`group relative flex flex-col ${t.s1} rounded-2xl border ${t.border} overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-purple-500/30`}
            >
              {/* Coloured top stripe */}
              <div className={`h-1 w-full ${
                tpl.tag === 'Onboarding' ? 'bg-gradient-to-r from-purple-500 to-violet-400' :
                tpl.tag === 'Billing'    ? 'bg-gradient-to-r from-teal-500 to-cyan-400' :
                tpl.tag === 'Dunning'    ? 'bg-gradient-to-r from-red-500 to-orange-400' :
                tpl.tag === 'Security'   ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                                           'bg-gradient-to-r from-sky-500 to-blue-400'
              }`} />

              <div className="flex flex-col flex-1 p-5">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      t.isDark ? 'bg-white/10' : 'bg-gray-100'
                    }`}>
                      {TAG_ICONS[tpl.tag]}
                    </div>
                    <div>
                      <p className={`${t.text} font-semibold text-sm leading-tight`}>{tpl.name}</p>
                      {isCustomised
                        ? <p className="text-[10px] text-emerald-500 font-medium mt-0.5">✏️ Customised</p>
                        : <p className={`text-[10px] ${t.textFaint} mt-0.5`}>Using default</p>
                      }
                    </div>
                  </div>
                  <span className={`shrink-0 text-[0.62rem] px-2 py-0.5 rounded-full border font-medium ${TAG_COLOURS[tpl.tag]}`}>
                    {tpl.tag}
                  </span>
                </div>

                {/* Description */}
                <p className={`${t.textFaint} text-xs leading-relaxed mb-3 flex-1`}>{tpl.description}</p>

                {/* Subject preview */}
                <div className={`${t.s0} rounded-lg border ${t.border} px-3 py-2 mb-4`}>
                  <p className={`${t.textFaint} text-[10px] uppercase tracking-wide mb-0.5`}>Subject</p>
                  <p className={`${t.textMd} text-xs font-mono truncate`}>{tpl.subject}</p>
                </div>

                {/* Variables count */}
                <p className={`${t.textFaint} text-[11px] mb-3`}>
                  {tpl.variables.length} variable{tpl.variables.length !== 1 ? 's' : ''} ·{' '}
                  <span className="font-mono">{`{{${tpl.variables[0]?.key}}}`}</span>
                  {tpl.variables.length > 1 && ` +${tpl.variables.length - 1} more`}
                </p>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditor(tpl)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Template
                  </button>
                  <button
                    onClick={() => { openEditor(tpl); setTimeout(() => setEditorTab('preview'), 50); }}
                    className={`px-3 py-2 rounded-xl border ${t.border} ${t.hover} ${t.textFaint} transition-colors`}
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Editor Drawer ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && editing && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setDrawerOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className={`fixed right-0 top-0 h-full w-full max-w-4xl ${t.isDark ? 'bg-[#13131f]' : 'bg-white'} shadow-2xl z-50 flex flex-col`}
            >
              {/* Drawer Header */}
              <div className={`flex items-start justify-between gap-4 px-6 py-4 border-b ${t.border} shrink-0`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${t.isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                    {TAG_ICONS[editing.tag]}
                  </div>
                  <div>
                    <h2 className={`${t.text} font-bold text-base leading-tight`}>{editing.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[0.62rem] px-2 py-0.5 rounded-full border font-medium ${TAG_COLOURS[editing.tag]}`}>{editing.tag}</span>
                      {(editing as any).customised && <span className="text-[10px] text-emerald-500 font-medium">✏️ Customised</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => setDrawerOpen(false)} className={`${t.hover} ${t.textFaint} p-2 rounded-xl transition-colors mt-0.5`}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className={`flex border-b ${t.border} shrink-0 px-6`}>
                {(['edit', 'preview'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setEditorTab(tab)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                      editorTab === tab
                        ? 'border-purple-500 text-purple-500'
                        : `border-transparent ${t.textFaint} hover:${t.text}`
                    }`}
                  >
                    {tab === 'edit' ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {tab}
                  </button>
                ))}
              </div>

              {/* Drawer Body */}
              <div className="flex flex-1 overflow-hidden">
                {editorTab === 'edit' ? (
                  <div className="flex flex-1 overflow-hidden">
                    {/* Left: form */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      {/* Subject */}
                      <Field label="Subject Line" required hint="Supports {{variables}} — use the reference panel on the right">
                        <input
                          value={editSubject}
                          onChange={e => setEditSubject(e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border ${t.border} ${t.s0} ${t.text} text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40`}
                        />
                      </Field>

                      {/* HTML Body */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className={`text-xs font-semibold ${t.textMd} uppercase tracking-wide`}>HTML Body <span className="text-red-400">*</span></label>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] ${t.textFaint}`}>{editHtml.length.toLocaleString()} chars</span>
                            <button
                              onClick={() => setEditorTab('preview')}
                              className="text-xs text-purple-500 hover:text-purple-600 flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3 h-3" /> Preview →
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={editHtml}
                          onChange={e => setEditHtml(e.target.value)}
                          rows={22}
                          spellCheck={false}
                          className={`w-full px-3 py-3 rounded-xl border ${t.border} ${t.s0} ${t.text} text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none`}
                        />
                        <p className={`${t.textFaint} text-[10px] mt-1.5 flex items-center gap-1`}>
                          <AlertCircle className="w-3 h-3" />
                          Use inline CSS only — email clients do not support external stylesheets.
                        </p>
                      </div>
                    </div>

                    {/* Right: variables panel */}
                    <div className={`w-64 shrink-0 border-l ${t.border} overflow-y-auto min-h-0`}>
                      {/* ── Variables ── */}
                      <button
                        onClick={() => setVarsOpen(v => !v)}
                        className={`flex items-center justify-between gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider ${t.textMd} hover:${t.text} transition-colors`}
                      >
                        <span>Variables ({editing.variables.length})</span>
                        {varsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <AnimatePresence initial={false}>
                        {varsOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className={`px-3 pb-3 space-y-1.5 border-b ${t.border}`}>
                              <p className={`${t.textFaint} text-[10px] mb-2`}>Click any variable to copy it.</p>
                              {editing.variables.map(v => (
                                <button
                                  key={v.key}
                                  onClick={() => copyVar(v.key)}
                                  className={`w-full text-left px-3 py-2 rounded-lg border ${t.border} ${t.hover} transition-all group/var`}
                                >
                                  <div className="flex items-center justify-between">
                                    <code className="text-[10px] text-purple-500 font-mono">{`{{${v.key}}}`}</code>
                                    {copied === v.key
                                      ? <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                      : <Copy className="w-3 h-3 opacity-0 group-hover/var:opacity-100 transition-opacity shrink-0 text-gray-400" />
                                    }
                                  </div>
                                  <p className={`${t.textFaint} text-[10px] mt-0.5 leading-snug`}>{v.description}</p>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* ── Colours ── */}
                      <button
                        onClick={() => setStylesOpen(v => !v)}
                        className={`flex items-center justify-between gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider ${t.textMd} hover:${t.text} transition-colors`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-purple-500" />
                          Colours ({extractColors(editHtml).length})
                        </span>
                        {stylesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <AnimatePresence initial={false}>
                        {stylesOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className={`px-3 pb-3 space-y-1.5 border-b ${t.border}`}>
                              <p className={`${t.textFaint} text-[10px] mb-2`}>Click any swatch to change that colour everywhere in the template.</p>
                              {extractColors(editHtml).map(color => {
                                const inputColor = expandHex(color);
                                const label = COLOR_LABELS[color] ?? 'Custom';
                                return (
                                  <label
                                    key={color}
                                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border ${t.border} ${t.hover} cursor-pointer transition-all group/color`}
                                    title={`Click to change ${color}`}
                                  >
                                    {/* Swatch — clicking opens the native colour picker */}
                                    <div
                                      className="relative w-7 h-7 rounded-lg shrink-0 ring-1 ring-black/10 overflow-hidden"
                                      style={{ background: color }}
                                    >
                                      <input
                                        type="color"
                                        value={inputColor}
                                        onChange={e => handleColorChange(color, e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-[10px] font-semibold ${t.textMd} leading-tight truncate`}>{label}</p>
                                      <code className={`text-[9px] font-mono ${t.textFaint}`}>{color}</code>
                                    </div>
                                    <Edit3 className="w-3 h-3 text-gray-400 opacity-0 group-hover/color:opacity-100 transition-opacity shrink-0" />
                                  </label>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Tips */}
                      <div className="p-4">
                        <p className={`${t.textFaint} text-[10px] font-semibold uppercase tracking-wide mb-2`}>Tips</p>
                        <ul className={`${t.textFaint} text-[10px] space-y-1.5 list-disc list-inside leading-snug`}>
                          <li>All variables use <code className="font-mono">{'{{double braces}}'}</code></li>
                          <li>Unknown variables will be left as-is</li>
                          <li>Use inline CSS for email compatibility</li>
                          <li>Test sends replace vars with sample data</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Preview tab */
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className={`px-6 py-3 border-b ${t.border} flex items-center justify-between shrink-0`}>
                      <div>
                        <p className={`${t.textFaint} text-xs`}>Subject preview:</p>
                        <p className={`${t.text} text-sm font-medium font-mono`}>
                          {editSubject.replace(/\{\{(\w+)\}\}/g, (_, k) => {
                            const s: Record<string, string> = { companyName: 'Acme Corp Sdn Bhd', adminName: 'Siti Nuraini', invoiceNumber: 'INV-2026-042', amount: '1,299.00', dueDate: '15 Feb 2026', tenantName: 'Acme Corp' };
                            return s[k] || `{{${k}}}`;
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full ${t.s1} border ${t.border} ${t.textFaint}`}>
                          Sample data injected — highlighted in yellow
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
                      <iframe
                        srcDoc={previewHtml}
                        title="Email Preview"
                        className="w-full rounded-xl border-0 bg-white shadow-lg block"
                        sandbox="allow-same-origin"
                        onLoad={e => {
                          const iframe = e.currentTarget;
                          const h = iframe.contentDocument?.documentElement?.scrollHeight;
                          if (h) iframe.style.height = h + 'px';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className={`flex items-center justify-between gap-3 px-6 py-4 border-t ${t.border} shrink-0`}>
                <div className="flex items-center gap-2">
                  <PrimaryBtn
                    size="sm" variant="ghost"
                    onClick={handleReset}
                    loading={resetting}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
                  </PrimaryBtn>
                </div>
                <div className="flex items-center gap-2">
                  <PrimaryBtn size="sm" variant="ghost" onClick={() => setTestOpen(true)}>
                    <Send className="w-3.5 h-3.5" /> Send Test
                  </PrimaryBtn>
                  <PrimaryBtn size="sm" onClick={handleSave} loading={saving}>
                    <Save className="w-3.5 h-3.5" /> Save Template
                  </PrimaryBtn>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Test Send Modal ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {testOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
              onClick={() => setTestOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className={`fixed inset-0 flex items-center justify-center z-[70] pointer-events-none`}
            >
              <div className={`pointer-events-auto w-full max-w-md mx-4 ${t.isDark ? 'bg-[#16162a]' : 'bg-white'} rounded-2xl shadow-2xl border ${t.border} overflow-hidden`}>
                <div className={`px-6 py-4 border-b ${t.border} flex items-center justify-between`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <Send className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                      <h3 className={`${t.text} font-bold text-sm`}>Send Test Preview</h3>
                      <p className={`${t.textFaint} text-xs`}>{editing?.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setTestOpen(false)} className={`${t.hover} ${t.textFaint} p-1.5 rounded-lg`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <Field label="Send preview to" hint="Template variables will be replaced with sample data">
                    <Input
                      type="email"
                      value={testEmail}
                      onChange={e => setTestEmail(e.target.value)}
                      placeholder="recipient@example.com"
                    />
                  </Field>
                  <div className={`${t.s1} rounded-xl border ${t.border} px-4 py-3 text-xs ${t.textFaint} leading-relaxed`}>
                    <p className="font-semibold mb-1">ℹ️ Note</p>
                    <p>The email will be sent using your saved SMTP configuration from <strong>Settings → Email / SMTP</strong>. Make sure SMTP is saved before sending.</p>
                  </div>
                </div>
                <div className={`px-6 py-4 border-t ${t.border} flex justify-end gap-2`}>
                  <PrimaryBtn size="sm" variant="ghost" onClick={() => setTestOpen(false)}>Cancel</PrimaryBtn>
                  <PrimaryBtn size="sm" onClick={handleTest} loading={testing} disabled={!testEmail}>
                    <Send className="w-3.5 h-3.5" /> Send Preview
                  </PrimaryBtn>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}