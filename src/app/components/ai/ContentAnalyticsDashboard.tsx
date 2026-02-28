import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp, CheckCircle, Clock,
  FileText, CalendarDays, Check, XCircle,
  Heart, MessageCircle, Repeat2, Eye, Timer,
  Upload, X, AlertCircle, Download, Loader2,
  RefreshCw, Wifi,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  SiInstagram, SiFacebook, SiX, SiLinkedin, SiTiktok,
  SiYoutube, SiPinterest, SiSnapchat, SiThreads, SiReddit, SiWhatsapp,
  SiTelegram,
} from 'react-icons/si';
import { type ContentCard, type ContentStatus, type EngagementData, useContent } from '../../contexts/ContentContext';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHeaders';
import { getSlaStatusWith, SLA_BREACH_HOURS, SLA_WARNING_HOURS } from '../../utils/sla';
import { useAuth } from '../AuthContext';
import { useSlaConfig } from '../../hooks/useSlaConfig';

// ─── Platform metadata ────────────────────────────────────────────────────────

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: SiInstagram, facebook: SiFacebook, twitter: SiX,
  linkedin: SiLinkedin, tiktok: SiTiktok, youtube: SiYoutube,
  pinterest: SiPinterest, snapchat: SiSnapchat, threads: SiThreads,
  reddit: SiReddit, whatsapp: SiWhatsapp, telegram: SiTelegram,
};

const platformNames: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', twitter: 'X (Twitter)',
  linkedin: 'LinkedIn', tiktok: 'TikTok', youtube: 'YouTube',
  pinterest: 'Pinterest', snapchat: 'Snapchat', threads: 'Threads',
  reddit: 'Reddit', whatsapp: 'WhatsApp', telegram: 'Telegram',
};

const platformTailwindColors: Record<string, string> = {
  instagram: 'bg-pink-500',
  facebook:  'bg-blue-600',
  twitter:   'bg-sky-400',
  linkedin:  'bg-blue-500',
  tiktok:    'bg-cyan-400',
  youtube:   'bg-red-500',
  pinterest: 'bg-red-500',
  snapchat:  'bg-yellow-300',
  threads:   'bg-gray-200',
  reddit:    'bg-orange-500',
  whatsapp:  'bg-green-400',
  telegram:  'bg-sky-500',
};

const platformIconColors: Record<string, string> = {
  instagram: 'text-pink-400', facebook: 'text-blue-500', twitter: 'text-sky-300',
  linkedin: 'text-blue-400', tiktok: 'text-cyan-400', youtube: 'text-red-500',
  pinterest: 'text-red-400', snapchat: 'text-yellow-300', threads: 'text-gray-200',
  reddit: 'text-orange-500', whatsapp: 'text-green-400', telegram: 'text-sky-400',
};

// ─── Status metadata ──────────────────────────────────────────────────────────

const statusMeta: Record<ContentStatus, {
  label: string;
  hex: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}> = {
  draft:            { label: 'Draft',    hex: '#6b7280', icon: FileText,    iconColor: 'text-gray-400'  },
  pending_approval: { label: 'Pending',  hex: '#f59e0b', icon: Clock,       iconColor: 'text-amber-400' },
  approved:         { label: 'Approved', hex: '#14b8a6', icon: CheckCircle, iconColor: 'text-teal-400'  },
  scheduled:        { label: 'Scheduled',hex: '#3b82f6', icon: CalendarDays,iconColor: 'text-blue-400'  },
  published:        { label: 'Published',hex: '#22c55e', icon: Check,       iconColor: 'text-green-400' },
  rejected:         { label: 'Rejected', hex: '#ef4444', icon: XCircle,     iconColor: 'text-red-400'   },
};

const STATUS_ORDER: ContentStatus[] = [
  'published', 'scheduled', 'approved', 'pending_approval', 'draft', 'rejected',
];

// ─── Custom recharts tooltip ──────────────────────────────────────────────────

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value, percent } = payload[0];
  return (
    <div
      className="px-3 py-2 rounded-xl border border-white/15 text-xs shadow-2xl"
      style={{ background: 'rgba(15,10,40,0.95)', backdropFilter: 'blur(12px)' }}
    >
      <p className="text-white font-semibold">{name}</p>
      <p className="text-white/60 mt-0.5">{value} cards · {(percent * 100).toFixed(1)}%</p>
    </div>
  );
}

// ─── Engagement bar tooltip ───────────────────────────────────────────────────

function EngagementTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2.5 rounded-xl border border-white/15 text-xs shadow-2xl space-y-1"
      style={{ background: 'rgba(15,10,40,0.95)', backdropFilter: 'blur(12px)' }}
    >
      <p className="text-white font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-white/60">{p.name}:</span>
          <span className="text-white font-semibold">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  accentClass,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub: string;
  accentClass: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2"
    >
      <div className={`w-8 h-8 rounded-lg ${accentClass} flex items-center justify-center`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-white font-bold text-2xl leading-none tracking-tight">{value}</p>
        <p className="text-white/40 text-[10px] mt-1.5 leading-snug">{sub}</p>
      </div>
      <p className="text-white/50 text-xs font-medium mt-auto">{label}</p>
    </motion.div>
  );
}

// ─── CSV Engagement Importer ──────────────────────────────────────────────────

/**
 * Expected CSV columns (header row required, order flexible):
 *   cardTitle | platform | likes | comments | shares | reach
 *
 * Matching is done case-insensitively on `cardTitle` against card.title.
 */

interface CsvRow {
  cardTitle: string;
  platform:  string;
  likes:     number;
  comments:  number;
  shares:    number;
  reach:     number;
}

interface MatchedRow extends CsvRow {
  cardId:    string;
  matched:   boolean;
}

function parseCsv(raw: string): CsvRow[] {
  const lines = raw.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''));
  const colIdx = (name: string) => headers.indexOf(name);

  const iTitle    = colIdx('cardtitle');
  const iPlatform = colIdx('platform');
  const iLikes    = colIdx('likes');
  const iComments = colIdx('comments');
  const iShares   = colIdx('shares');
  const iReach    = colIdx('reach');

  if (iTitle === -1) throw new Error('Missing required column: cardTitle');

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    return {
      cardTitle: cols[iTitle]   ?? '',
      platform:  iPlatform >= 0 ? (cols[iPlatform] ?? '') : '',
      likes:     iLikes    >= 0 ? (parseInt(cols[iLikes],    10) || 0) : 0,
      comments:  iComments >= 0 ? (parseInt(cols[iComments], 10) || 0) : 0,
      shares:    iShares   >= 0 ? (parseInt(cols[iShares],   10) || 0) : 0,
      reach:     iReach    >= 0 ? (parseInt(cols[iReach],    10) || 0) : 0,
    };
  });
}

const CSV_TEMPLATE = [
  'cardTitle,platform,likes,comments,shares,reach',
  '"Ramadan Campaign 2025",instagram,1240,88,45,9800',
  '"Product Launch Post",facebook,632,34,21,5100',
].join('\n');

function EngagementCsvImporter({
  cards,
  onClose,
}: {
  cards: ContentCard[];
  onClose: () => void;
}) {
  const { updateCard } = useContent();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows,     setRows]     = useState<MatchedRow[] | null>(null);
  const [applying, setApplying] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    setRows(null);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const parsed = parseCsv(e.target?.result as string);
        if (!parsed.length) { setError('No data rows found in the CSV.'); return; }
        const matched: MatchedRow[] = parsed.map(row => {
          const match = cards.find(c =>
            c.title.toLowerCase().trim() === row.cardTitle.toLowerCase().trim(),
          );
          return { ...row, cardId: match?.id ?? '', matched: !!match };
        });
        setRows(matched);
      } catch (err: any) {
        setError(err.message);
      }
    };
    reader.readAsText(file);
  }, [cards]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleApply = async () => {
    if (!rows) return;
    setApplying(true);
    const toApply = rows.filter(r => r.matched);
    let applied = 0;
    for (const row of toApply) {
      const card = cards.find(c => c.id === row.cardId);
      if (!card) continue;
      updateCard({
        ...card,
        engagementData: {
          likes:     row.likes,
          comments:  row.comments,
          shares:    row.shares,
          reach:     row.reach,
          updatedAt: new Date().toISOString(),
        },
      });
      applied++;
    }
    await new Promise(r => setTimeout(r, 300)); // brief visual pause
    setApplying(false);
    toast.success(`Engagement data imported for ${applied} card${applied !== 1 ? 's' : ''}`, {
      description: `${rows.length - applied} row${rows.length - applied !== 1 ? 's' : ''} had no matching card`,
    });
    onClose();
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'engagement_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const matchedCount   = rows?.filter(r => r.matched).length  ?? 0;
  const unmatchedCount = rows?.filter(r => !r.matched).length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(150deg,rgba(14,12,28,0.99) 0%,rgba(8,6,18,0.99) 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-400/25 flex items-center justify-center">
            <Upload className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-sm">Import Engagement Metrics</h2>
            <p className="text-white/35 text-xs mt-0.5">Upload a CSV to bulk-update engagement data on published cards</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/50 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Template download */}
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-xs text-teal-400 hover:text-teal-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV template
          </button>

          {/* Drop zone */}
          {!rows && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-white/15 hover:border-teal-400/40 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group"
            >
              <Upload className="w-8 h-8 text-white/20 group-hover:text-teal-400/60 transition-colors" />
              <div className="text-center">
                <p className="text-white/50 text-sm font-medium">Drop your CSV here or click to browse</p>
                <p className="text-white/25 text-xs mt-1">Columns: <span className="font-mono">cardTitle, platform, likes, comments, shares, reach</span></p>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-400/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300 text-xs leading-relaxed">{error}</p>
            </div>
          )}

          {/* Preview table */}
          {rows && (
            <div className="space-y-3">
              {/* Summary badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-full bg-white/6 border border-white/10 text-white/60 text-xs">{rows.length} rows parsed</span>
                {matchedCount > 0   && <span className="px-2.5 py-1 rounded-full bg-green-500/12 border border-green-400/20 text-green-300 text-xs">✓ {matchedCount} matched</span>}
                {unmatchedCount > 0 && <span className="px-2.5 py-1 rounded-full bg-amber-500/12 border border-amber-400/20 text-amber-300 text-xs">⚠ {unmatchedCount} unmatched</span>}
                <button onClick={() => { setRows(null); setError(null); }} className="ml-auto text-white/30 hover:text-white/60 text-[10px] transition-colors">
                  Upload different file
                </button>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-white/8 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/8" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        {['Status', 'Card Title', 'Likes', 'Comments', 'Shares', 'Reach'].map(h => (
                          <th key={h} className="text-left text-white/40 px-3 py-2.5 font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rows.map((row, i) => (
                        <tr key={i} className={`transition-colors ${row.matched ? 'hover:bg-white/3' : 'opacity-50'}`}>
                          <td className="px-3 py-2.5 shrink-0">
                            {row.matched
                              ? <span className="w-5 h-5 rounded-full bg-green-500/15 border border-green-400/25 flex items-center justify-center"><Check className="w-3 h-3 text-green-400" /></span>
                              : <span className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-400/25 flex items-center justify-center"><AlertCircle className="w-3 h-3 text-amber-400" /></span>}
                          </td>
                          <td className="px-3 py-2.5 text-white/70 font-medium max-w-[180px] truncate">{row.cardTitle}</td>
                          <td className="px-3 py-2.5 text-pink-300/80 font-mono">{row.likes.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-blue-300/80 font-mono">{row.comments.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-green-300/80 font-mono">{row.shares.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-purple-300/80 font-mono">{row.reach.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {rows && matchedCount > 0 && (
          <div className="px-5 py-4 border-t border-white/8 shrink-0 flex items-center gap-3">
            <p className="flex-1 text-white/30 text-xs">
              Will update engagement metrics on {matchedCount} card{matchedCount !== 1 ? 's' : ''}
            </p>
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10 text-white/60 text-sm font-semibold transition-all">
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all
                bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500
                text-white shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Apply to {matchedCount} Card{matchedCount !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ContentAnalyticsDashboardProps {
  cards: ContentCard[];
}

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

export function ContentAnalyticsDashboard({ cards }: ContentAnalyticsDashboardProps) {

  const [showImporter, setShowImporter] = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [syncStatus,   setSyncStatus]   = useState<{ lastSyncAt?: string; synced?: number; errors?: number } | null>(null);

  const { updateCard, refreshCards } = useContent();

  // ── Per-tenant SLA thresholds ─────────────────────────────────────────────
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  // Load sync status on mount
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const r = await fetch(`${API_BASE}/social/analytics/sync-status?tenantId=${tenantId}`, { headers });
        const d = await r.json();
        if (d.status) setSyncStatus(d.status);
      } catch { /* non-fatal */ }
    })();
  }, [tenantId]);

  const handleSync = async () => {
    if (!tenantId) { toast.error('No tenant ID'); return; }
    setSyncing(true);
    try {
      const headers = await getAuthHeaders(true);
      const res = await fetch(`${API_BASE}/social/analytics/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tenantId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);

      setSyncStatus({ lastSyncAt: new Date().toISOString(), synced: data.synced, errors: data.errors });

      if (data.synced > 0) {
        toast.success(`Synced engagement for ${data.synced} card${data.synced !== 1 ? 's' : ''}`, {
          description: data.errors > 0 ? `${data.errors} card(s) had errors` : 'All platforms synced successfully',
        });
        // Re-fetch cards from the server so the dashboard picks up updated engagement data
        await refreshCards();
      } else if (data.errors > 0) {
        toast.error(`Sync completed with ${data.errors} error(s)`, {
          description: data.details?.map((d: any) => d.error).filter(Boolean).slice(0, 3).join('; '),
        });
      } else {
        toast.info('No published cards to sync', { description: 'Publish some content first, then sync to pull live metrics.' });
      }
    } catch (err: any) {
      console.error('[analytics/sync]', err);
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };
  const { warningHours, breachHours } = useSlaConfig(user?.tenantId ?? undefined);

  // ── Period picker ─────────────────────────────────────────────────────────
  type Period = '7d' | '14d' | '30d' | '90d' | 'all';
  const [period, setPeriod] = useState<Period>('30d');

  const PERIOD_OPTIONS: { id: Period; label: string }[] = [
    { id: '7d',  label: '7 days'   },
    { id: '14d', label: '14 days'  },
    { id: '30d', label: '30 days'  },
    { id: '90d', label: '90 days'  },
    { id: 'all', label: 'All time' },
  ];

  const filteredCards = useMemo(() => {
    if (period === 'all') return cards;
    const days = period === '7d' ? 7 : period === '14d' ? 14 : period === '30d' ? 30 : 90;
    const cutoff = new Date(Date.now() - days * 86400000);
    return cards.filter(c => {
      const d = c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt);
      return d >= cutoff;
    });
  }, [cards, period]);

  // ── KPI derivations ──────────────────────────────────────────────────────
  const totalCards = filteredCards.length;

  const { approvalRate, decisionedCount } = useMemo(() => {
    const decisioned  = filteredCards.filter(c => ['approved','scheduled','published','rejected'].includes(c.status));
    const approved    = filteredCards.filter(c => ['approved','scheduled','published'].includes(c.status));
    return {
      approvalRate:    decisioned.length > 0 ? (approved.length / decisioned.length) * 100 : null,
      decisionedCount: decisioned.length,
    };
  }, [filteredCards]);

  const avgTurnaround = useMemo(() => {
    const approvedWithDates = filteredCards.filter(c => c.approvedAt && c.createdAt);
    if (!approvedWithDates.length) return null;
    const avgMs = approvedWithDates.reduce((sum, c) =>
      sum + (c.approvedAt!.getTime() - c.createdAt.getTime()), 0
    ) / approvedWithDates.length;
    const hours = avgMs / (1000 * 60 * 60);
    if (hours < 1)  return '< 1 hr';
    if (hours < 24) return `${hours.toFixed(1)} hrs`;
    return `${(hours / 24).toFixed(1)} days`;
  }, [filteredCards]);

  // ── Platform breakdown ────────────────────────────────────────────────────
  const platformData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCards.forEach(c => { counts[c.platform] = (counts[c.platform] || 0) + 1; });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
      .map(([platform, count]) => ({ platform, count }));
  }, [filteredCards]);

  const maxPlatformCount = platformData[0]?.count || 1;

  // ── Status distribution (for PieChart) ───────────────────────────────────
  const statusData = useMemo(() => {
    return STATUS_ORDER
      .map(status => ({
        name:  statusMeta[status].label,
        value: filteredCards.filter(c => c.status === status).length,
        hex:   statusMeta[status].hex,
        status,
      }))
      .filter(d => d.value > 0);
  }, [filteredCards]);

  // ── Published this period ─────────────────────────────────────────────────
  const publishedThisMonth = useMemo(() => {
    if (period === 'all') {
      return filteredCards.filter(c => c.status === 'published').length;
    }
    const days = period === '7d' ? 7 : period === '14d' ? 14 : period === '30d' ? 30 : 90;
    const cutoff = new Date(Date.now() - days * 86400000);
    return filteredCards.filter(c =>
      c.status === 'published' && c.approvedAt && c.approvedAt >= cutoff
    ).length;
  }, [filteredCards, period]);

  // ── Engagement aggregates ─────────────────────────────────────────────────
  const { engagementByPlatform, totalLikes, totalReach, avgEngagementRate, hasEngagement } = useMemo(() => {
    const withData = filteredCards.filter(c => c.status === 'published' && c.engagementData);
    const map: Record<string, { likes: number; comments: number; shares: number; reach: number }> = {};

    withData.forEach(c => {
      const p  = c.platform;
      const ed = c.engagementData!;
      if (!map[p]) map[p] = { likes: 0, comments: 0, shares: 0, reach: 0 };
      map[p].likes    += ed.likes    ?? 0;
      map[p].comments += ed.comments ?? 0;
      map[p].shares   += ed.shares   ?? 0;
      map[p].reach    += ed.reach    ?? 0;
    });

    const engagementByPlatform = Object.entries(map)
      .map(([platform, d]) => ({
        name:     (platformNames[platform] ?? platform).replace(' (Twitter)', '').replace('WhatsApp', 'WA').replace('Business', ''),
        platform,
        likes:    d.likes,
        comments: d.comments,
        shares:   d.shares,
        reach:    d.reach,
        total:    d.likes + d.comments + d.shares,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);

    const totalLikes    = withData.reduce((s, c) => s + (c.engagementData?.likes ?? 0), 0);
    const totalReach    = withData.reduce((s, c) => s + (c.engagementData?.reach ?? 0), 0);
    const totalEngage   = withData.reduce((s, c) => s + (c.engagementData?.likes ?? 0) + (c.engagementData?.comments ?? 0) + (c.engagementData?.shares ?? 0), 0);
    const avgEngagementRate = totalReach > 0 ? (totalEngage / totalReach) * 100 : null;

    return { engagementByPlatform, totalLikes, totalReach, avgEngagementRate, hasEngagement: withData.length > 0 };
  }, [filteredCards]);

  // ── SLA snapshot ──────────────────────────────────────────────────────────
  const { slaOk, slaWarning, slaBreached, hasPending } = useMemo(() => {
    const pending = filteredCards.filter(c => c.status === 'pending_approval');
    return {
      slaOk:       pending.filter(c => getSlaStatusWith(c, warningHours, breachHours) === 'ok').length,
      slaWarning:  pending.filter(c => getSlaStatusWith(c, warningHours, breachHours) === 'warning').length,
      slaBreached: pending.filter(c => getSlaStatusWith(c, warningHours, breachHours) === 'breached').length,
      hasPending:  pending.length > 0,
    };
  }, [filteredCards, warningHours, breachHours]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Dashboard header row ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider">Analytics Overview</p>
          {/* Period picker */}
          <div className="flex items-center gap-1 p-0.5 bg-white/5 border border-white/10 rounded-xl">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setPeriod(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  period === opt.id
                    ? 'bg-[#0BA4AA]/20 text-[#0BA4AA] border border-[#0BA4AA]/30'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {period !== 'all' && (
            <span className="text-white/20 text-[10px]">
              {filteredCards.length} of {cards.length} cards in period
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sync status indicator */}
          {syncStatus?.lastSyncAt && (
            <span className="text-white/20 text-[10px] flex items-center gap-1">
              <Wifi className="w-2.5 h-2.5" />
              Last sync: {new Date(syncStatus.lastSyncAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {syncStatus.synced !== undefined && ` · ${syncStatus.synced} synced`}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-400/25 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200 text-xs font-semibold transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync from Platforms'}
          </button>
          <button
            onClick={() => setShowImporter(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-400/25 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 hover:text-teal-200 text-xs font-semibold transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </button>
          <button
            onClick={() => {
              // Export analytics data as CSV
              const publishedCards = filteredCards.filter(c => c.status === 'published' && c.engagementData);
              const csvLines = [
                'Title,Platform,Status,Likes,Comments,Shares,Reach,Published At,Created At',
                ...filteredCards.map(c => {
                  const ed = c.engagementData;
                  return [
                    `"${(c.title || '').replace(/"/g, '""')}"`,
                    c.platform,
                    c.status,
                    ed?.likes ?? '',
                    ed?.comments ?? '',
                    ed?.shares ?? '',
                    ed?.reach ?? '',
                    c.approvedAt ? new Date(c.approvedAt as any).toISOString().slice(0, 10) : '',
                    c.createdAt ? new Date(c.createdAt as any).toISOString().slice(0, 10) : '',
                  ].join(',');
                }),
              ];
              const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `analytics-export-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Analytics exported', { description: `${filteredCards.length} cards exported to CSV` });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          icon={FileText}
          label="Total Cards"
          value={totalCards}
          sub={`across ${Object.keys(filteredCards.reduce((a, c) => ({ ...a, [c.platform]: 1 }), {})).length} platforms`}
          accentClass="bg-purple-500/50"
          delay={0}
        />
        <KPICard
          icon={TrendingUp}
          label="Approval Rate"
          value={approvalRate !== null ? `${approvalRate.toFixed(1)}%` : '—'}
          sub={`from ${decisionedCount} decisioned card${decisionedCount !== 1 ? 's' : ''}`}
          accentClass="bg-teal-500/50"
          delay={0.05}
        />
        <KPICard
          icon={Clock}
          label="Avg. Turnaround"
          value={avgTurnaround ?? '—'}
          sub="from creation to approval"
          accentClass="bg-blue-500/50"
          delay={0.1}
        />
        <KPICard
          icon={CheckCircle}
          label={period === 'all' ? 'Total Published' : `Published (${period})`}
          value={publishedThisMonth}
          sub={period === 'all' ? 'all published cards' : `cards published in last ${period}`}
          accentClass="bg-green-600/40"
          delay={0.15}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Platform breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3"
        >
          <h4 className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">
            Posts by Platform
          </h4>

          {platformData.length === 0 ? (
            <p className="text-white/25 text-xs py-4 text-center">No platform data yet</p>
          ) : (
            <div className="space-y-2.5">
              {platformData.map(({ platform, count }) => {
                const PIcon      = platformIcons[platform];
                const barPct     = (count / maxPlatformCount) * 100;
                const barCls     = platformTailwindColors[platform] || 'bg-white';
                const iconCls    = platformIconColors[platform] || 'text-white/50';
                const name       = platformNames[platform] || platform;
                return (
                  <div key={platform} className="flex items-center gap-2.5">
                    {/* Icon */}
                    {PIcon ? (
                      <PIcon className={`w-3.5 h-3.5 shrink-0 ${iconCls}`} />
                    ) : (
                      <div className="w-3.5 h-3.5 shrink-0" />
                    )}
                    {/* Name */}
                    <span className="text-white/60 text-xs w-20 shrink-0 truncate">{name}</span>
                    {/* Progress bar */}
                    <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                        className={`h-full rounded-full ${barCls} opacity-80`}
                      />
                    </div>
                    {/* Count */}
                    <span className="text-white/40 text-[10px] w-5 text-right shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Status donut + legend */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4"
        >
          <h4 className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-3">
            Status Distribution
          </h4>

          {statusData.length === 0 ? (
            <p className="text-white/25 text-xs py-4 text-center">No status data yet</p>
          ) : (
            <div className="flex items-center gap-4">
              {/* Donut */}
              <div className="shrink-0 w-[130px] h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={58}
                      dataKey="value"
                      strokeWidth={0}
                      paddingAngle={2}
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.hex} opacity={0.9} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex-1 min-w-0 space-y-1.5">
                {statusData.map(({ status, name, value, hex }) => {
                  const StatusIcon = statusMeta[status].icon;
                  const pct = totalCards > 0 ? ((value / totalCards) * 100).toFixed(0) : '0';
                  return (
                    <div key={status} className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                      <StatusIcon className={`w-3 h-3 shrink-0 ${statusMeta[status].iconColor}`} />
                      <span className="text-white/60 text-[11px] flex-1 min-w-0 truncate">{name}</span>
                      <span className="text-white/35 text-[10px] shrink-0">{value} · {pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Engagement Performance Section ── */}
      {hasEngagement && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-4"
        >
          {/* Section header */}
          <div className="flex items-center gap-2 border-t border-white/8 pt-4">
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider">
              Engagement Performance — Published Posts
            </h4>
          </div>

          {/* Engagement KPI row */}
          <div className="grid grid-cols-3 gap-3">
            {/* Total Likes */}
            <div className="bg-pink-500/8 border border-pink-400/15 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none">{totalLikes.toLocaleString()}</p>
                <p className="text-white/40 text-[10px] mt-1">Total Likes</p>
              </div>
            </div>
            {/* Total Reach */}
            <div className="bg-purple-500/8 border border-purple-400/15 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                <Eye className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none">{totalReach.toLocaleString()}</p>
                <p className="text-white/40 text-[10px] mt-1">Total Reach</p>
              </div>
            </div>
            {/* Avg Engagement Rate */}
            <div className="bg-teal-500/8 border border-teal-400/15 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none">
                  {avgEngagementRate !== null ? `${avgEngagementRate.toFixed(2)}%` : '—'}
                </p>
                <p className="text-white/40 text-[10px] mt-1">Avg. Engagement Rate</p>
              </div>
            </div>
          </div>

          {/* Stacked bar chart — engagement by platform */}
          {engagementByPlatform.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h4 className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-4">
                Engagement by Platform (Likes · Comments · Shares)
              </h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={engagementByPlatform} barSize={14} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                  />
                  <Tooltip content={<EngagementTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="likes"    stackId="a" fill="#f472b6" name="Likes"    radius={[0, 0, 0, 0]} />
                  <Bar dataKey="comments" stackId="a" fill="#60a5fa" name="Comments" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="shares"   stackId="a" fill="#4ade80" name="Shares"   radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex items-center justify-center gap-5 mt-2">
                {[
                  { color: '#f472b6', label: 'Likes' },
                  { color: '#60a5fa', label: 'Comments' },
                  { color: '#4ade80', label: 'Shares' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-white/40 text-[10px]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Approval SLA Snapshot ── */}
      {hasPending && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 border-t border-white/8 pt-4">
            <Timer className="w-3.5 h-3.5 text-amber-400" />
            <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider">
              Approval SLA Snapshot — Pending Cards
            </h4>
            <span className="text-white/20 text-[10px]">({warningHours}h warn · {breachHours}h breach)</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* On Time */}
            <div className="bg-green-500/6 border border-green-400/15 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none">{slaOk}</p>
                <p className="text-white/40 text-[10px] mt-1">On Time</p>
              </div>
            </div>
            {/* At Risk */}
            <div className="bg-amber-500/6 border border-amber-400/15 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <Timer className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className={`font-bold text-lg leading-none ${slaWarning > 0 ? 'text-amber-300' : 'text-white'}`}>{slaWarning}</p>
                <p className="text-white/40 text-[10px] mt-1">At Risk (&gt;{warningHours}h)</p>
              </div>
            </div>
            {/* SLA Breached */}
            <div className="bg-red-500/6 border border-red-400/15 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                <XCircle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className={`font-bold text-lg leading-none ${slaBreached > 0 ? 'text-red-300' : 'text-white'}`}>{slaBreached}</p>
                <p className="text-white/40 text-[10px] mt-1">Breached (&gt;{breachHours}h)</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Publishing cadence footer ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex items-center justify-between text-[10px] text-white/25 border-t border-white/8 pt-3"
      >
        <span>Analytics computed from {totalCards} card{totalCards !== 1 ? 's' : ''} in this project · Live, no server call</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400/50 animate-pulse" />
          Real-time
        </span>
      </motion.div>

      {/* ── CSV Importer modal ── */}
      <AnimatePresence>
        {showImporter && (
          <EngagementCsvImporter
            cards={cards}
            onClose={() => setShowImporter(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}