/**
 * SocialPublishPage  (/app/publish)
 * Social Publishing Hub — manage connected channels and view publish history.
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, Plus, Trash2, RefreshCw, Check, AlertCircle,
  Loader2, ExternalLink, Clock, CheckCircle2, XCircle,
  Settings, Wifi, WifiOff, History,
} from 'lucide-react';
import {
  SiTelegram, SiWhatsapp, SiFacebook,
  SiInstagram, SiX, SiLinkedin,
} from 'react-icons/si';
import { toast } from 'sonner';
import { useAuth } from '../../components/AuthContext';
import { ProfileBanner } from '../../components/ProfileBanner';
import { ConnectAccountDrawer, type SocialConnection, type SocialPlatform } from '../../components/publishing/ConnectAccountDrawer';
import { projectId } from '/utils/supabase/info';
import { IS_DEMO_MODE } from '../../config/appConfig';
import { getAuthHeaders } from '../../utils/authHeaders';
import { BackgroundLayout } from '../../components/BackgroundLayout';
import { EmployeeNav } from '../../components/EmployeeNav';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { employeeTheme } from '../../utils/employeeTheme';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// ─── Platform meta ────────────────────────────────────────────────────────────

const PM: Record<SocialPlatform, {
  Icon: React.ComponentType<{ className?: string }>;
  label: string; color: string; bg: string; border: string;
}> = {
  telegram:  { Icon: SiTelegram,  label: 'Telegram',           color: 'text-sky-400',   bg: 'bg-sky-500/12',   border: 'border-sky-400/25'   },
  whatsapp:  { Icon: SiWhatsapp,  label: 'WhatsApp Business',  color: 'text-green-400', bg: 'bg-green-500/12', border: 'border-green-400/25' },
  facebook:  { Icon: SiFacebook,  label: 'Facebook Page',      color: 'text-blue-400',  bg: 'bg-blue-500/12',  border: 'border-blue-400/25'  },
  instagram: { Icon: SiInstagram, label: 'Instagram',          color: 'text-pink-400',  bg: 'bg-pink-500/12',  border: 'border-pink-400/25'  },
  twitter:   { Icon: SiX,         label: 'X (Twitter)',        color: 'text-white',     bg: 'bg-white/6',      border: 'border-white/12'     },
  linkedin:  { Icon: SiLinkedin,  label: 'LinkedIn',           color: 'text-blue-300',  bg: 'bg-blue-700/12',  border: 'border-blue-400/20'  },
};

// ─── History record type ──────────────────────────────────────────────────────

interface PublishRecord {
  id:             string;
  cardTitle:      string;
  platform:       string;
  connectionName: string;
  status:         'success' | 'error';
  errorMessage?:  string;
  publishedAt:    string;
  publishedBy:    string;
  postUrl?:       string;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_CONNECTIONS: SocialConnection[] = [
  { id: 'demo-tg', platform: 'telegram',  displayName: '@brandtelligence_channel',    credentials: {}, connectedAt: new Date(Date.now()-86400000*5).toISOString(), connectedBy: 'Sarah Chen', lastTestedAt: new Date(Date.now()-3600000).toISOString(), lastTestStatus: 'ok' },
  { id: 'demo-wa', platform: 'whatsapp',  displayName: 'WhatsApp Business (+6011-XXXX)', credentials: {}, connectedAt: new Date(Date.now()-86400000*3).toISOString(), connectedBy: 'Sarah Chen', lastTestedAt: new Date(Date.now()-7200000).toISOString(), lastTestStatus: 'ok' },
  { id: 'demo-fb', platform: 'facebook',  displayName: 'Brandtelligence Official Page', credentials: {}, connectedAt: new Date(Date.now()-86400000*8).toISOString(), connectedBy: 'Marcus Johnson', lastTestStatus: 'ok' },
  { id: 'demo-ig', platform: 'instagram', displayName: '@brandtelligence.my',           credentials: {}, connectedAt: new Date(Date.now()-86400000*8).toISOString(), connectedBy: 'Marcus Johnson', lastTestStatus: 'ok' },
  { id: 'demo-tw', platform: 'twitter',   displayName: '@Brandtelligence',             credentials: {}, connectedAt: new Date(Date.now()-86400000*20).toISOString(), connectedBy: 'Sarah Chen', lastTestedAt: new Date(Date.now()-86400000).toISOString(), lastTestStatus: 'error', lastTestError: 'Access token expired — regenerate in X Developer Portal' },
  { id: 'demo-li', platform: 'linkedin',  displayName: 'Brandtelligence Sdn Bhd',     credentials: {}, connectedAt: new Date(Date.now()-86400000*10).toISOString(), connectedBy: 'Sarah Chen' },
];

const DEMO_HISTORY: PublishRecord[] = [
  { id: '1', cardTitle: 'vCard Launch Announcement', platform: 'telegram',  connectionName: '@brandtelligence_channel',    status: 'success', publishedAt: new Date(Date.now()-3600000*2).toISOString(), publishedBy: 'Sarah Chen', postUrl: 'https://t.me/demo/123' },
  { id: '2', cardTitle: 'vCard Launch Announcement', platform: 'facebook',  connectionName: 'Brandtelligence Official Page', status: 'success', publishedAt: new Date(Date.now()-3600000*2).toISOString(), publishedBy: 'Sarah Chen' },
  { id: '3', cardTitle: 'NFC Sharing Feature',       platform: 'instagram', connectionName: '@brandtelligence.my',           status: 'success', publishedAt: new Date(Date.now()-86400000).toISOString(),   publishedBy: 'Marcus Johnson' },
  { id: '4', cardTitle: 'Analytics Dashboard Post',  platform: 'twitter',   connectionName: '@Brandtelligence',             status: 'error',   publishedAt: new Date(Date.now()-86400000*2).toISOString(),   publishedBy: 'Sarah Chen', errorMessage: 'Access token expired' },
  { id: '5', cardTitle: 'Community Spotlight',       platform: 'whatsapp',  connectionName: 'WhatsApp Business (+6011-XXXX)', status: 'success', publishedAt: new Date(Date.now()-86400000*3).toISOString(),   publishedBy: 'Sarah Chen' },
  { id: '6', cardTitle: 'Product Launch Thread',     platform: 'linkedin',  connectionName: 'Brandtelligence Sdn Bhd',     status: 'success', publishedAt: new Date(Date.now()-86400000*4).toISOString(),   publishedBy: 'Marcus Johnson' },
];

// ─── Connection card ──────────────────────────────────────────────────────────

function ConnectionCard({
  conn, onEdit, onDelete, onTest, testing,
}: {
  conn: SocialConnection;
  onEdit:   () => void;
  onDelete: () => void;
  onTest:   () => void;
  testing:  boolean;
}) {
  const meta = PM[conn.platform];
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);
  const ok   = conn.lastTestStatus === 'ok';
  const err  = conn.lastTestStatus === 'error';
  const none = !conn.lastTestStatus;

  const ago = (iso?: string) => {
    if (!iso) return null;
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <motion.div
      layout
      className={`relative flex flex-col gap-3 p-4 rounded-2xl border ${meta.bg} ${meta.border} backdrop-blur-sm`}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0`}>
          <meta.Icon className={`w-5 h-5 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm truncate ${et.text}`}>{conn.displayName}</p>
          <p className={`text-xs capitalize ${et.textFaint}`}>{meta.label}</p>
        </div>
        {/* Status dot */}
        <div className="shrink-0 mt-1">
          {ok   && <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-sm shadow-green-400/50" title="Connection verified" />}
          {err  && <div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-sm shadow-red-400/50" title="Connection issue" />}
          {none && <div className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} title="Not yet tested" />}
        </div>
      </div>

      {/* Meta info */}
      <div className={`space-y-1 text-[10px] ${et.textFaint}`}>
        <div className="flex items-center gap-1.5">
          <Clock className="w-2.5 h-2.5" />
          <span>Connected by <span className={et.textMd}>{conn.connectedBy}</span></span>
        </div>
        {conn.lastTestedAt && (
          <div className="flex items-center gap-1.5">
            {ok ? <Wifi className="w-2.5 h-2.5 text-green-400" /> : <WifiOff className="w-2.5 h-2.5 text-red-400" />}
            <span>Last tested {ago(conn.lastTestedAt)}</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {err && conn.lastTestError && (
        <div className="flex items-start gap-1.5 p-2 bg-red-500/10 border border-red-400/20 rounded-lg">
          <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300/70 text-[10px] leading-relaxed">{conn.lastTestError}</p>
        </div>
      )}

      {/* Actions */}
      <div className={`flex items-center gap-2 pt-1 border-t ${et.border}`}>
        <button
          onClick={onTest}
          disabled={testing}
          className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-40 ${isDark ? 'text-white/40 hover:text-white/70 bg-white/4 hover:bg-white/8' : 'text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
        >
          {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Test
        </button>
        <button
          onClick={onEdit}
          className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-all ${isDark ? 'text-white/40 hover:text-white/70 bg-white/4 hover:bg-white/8' : 'text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200'}`}
        >
          <Settings className="w-3 h-3" /> Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 ml-auto text-[10px] font-semibold text-red-400/60 hover:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition-all"
        >
          <Trash2 className="w-3 h-3" /> Remove
        </button>
      </div>
    </motion.div>
  );
}

// ─── History row ──────────────────────────────────────────────────────────────

function HistoryRow({ rec }: { rec: PublishRecord }) {
  const meta = PM[rec.platform as SocialPlatform] ?? PM.telegram;
  const d    = new Date(rec.publishedAt);
  const fmt  = d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);

  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${isDark ? 'hover:bg-white/3' : 'hover:bg-gray-50'}`}>
      {/* Status icon */}
      {rec.status === 'success'
        ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
        : <XCircle      className="w-4 h-4 text-red-400   shrink-0" />}

      {/* Platform icon */}
      <div className={`w-7 h-7 rounded-lg ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0`}>
        <meta.Icon className={`w-3.5 h-3.5 ${meta.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${et.textSm}`}>{rec.cardTitle}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] capitalize ${et.textFaint}`}>{meta.label}</span>
          <span className={`text-[10px] ${et.textFaint}`}>·</span>
          <span className={`text-[10px] ${et.textFaint}`}>{rec.connectionName}</span>
          <span className={`text-[10px] ${et.textFaint}`}>·</span>
          <span className={`text-[10px] ${et.textFaint}`}>by {rec.publishedBy}</span>
        </div>
        {rec.errorMessage && <p className="text-red-300/60 text-[10px] mt-0.5 truncate">{rec.errorMessage}</p>}
      </div>

      {/* Date + link */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] ${et.textFaint}`}>{fmt}</span>
        {rec.postUrl && (
          <a href={rec.postUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-0.5 text-teal-400 hover:text-teal-300 text-[10px] transition-colors">
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SocialPublishPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? 'demo';
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);

  const [connections,  setConnections]  = useState<SocialConnection[]>([]);
  const [history,      setHistory]      = useState<PublishRecord[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [histLoading,  setHistLoading]  = useState(true);
  const [tab,          setTab]          = useState<'accounts' | 'history'>('accounts');
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [editingConn,  setEditingConn]  = useState<SocialConnection | undefined>();
  const [testingId,    setTestingId]    = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (IS_DEMO_MODE) { setConnections(DEMO_CONNECTIONS); setLoading(false); return; }
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res  = await fetch(`${API_BASE}/social/connections?tenantId=${encodeURIComponent(tenantId)}`, {
        headers,
      });
      const data = await res.json();
      if (data.connections) setConnections(data.connections);
    } catch (e) { console.error('[SocialPublishPage] fetchConnections:', e); }
    finally { setLoading(false); }
  }, [tenantId]);

  const fetchHistory = useCallback(async () => {
    if (IS_DEMO_MODE) { setHistory(DEMO_HISTORY); setHistLoading(false); return; }
    setHistLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res  = await fetch(`${API_BASE}/social/history?tenantId=${encodeURIComponent(tenantId)}&limit=50`, {
        headers,
      });
      const data = await res.json();
      if (data.history) setHistory(data.history);
    } catch (e) { console.error('[SocialPublishPage] fetchHistory:', e); }
    finally { setHistLoading(false); }
  }, [tenantId]);

  useEffect(() => { fetchConnections(); fetchHistory(); }, [fetchConnections, fetchHistory]);

  const handleTest = async (connId: string) => {
    if (IS_DEMO_MODE) {
      setTestingId(connId);
      await new Promise(r => setTimeout(r, 1500));
      setConnections(prev => prev.map(c => c.id === connId
        ? { ...c, lastTestedAt: new Date().toISOString(), lastTestStatus: 'ok' }
        : c,
      ));
      setTestingId(null);
      toast.success('✅ Connection verified (demo)');
      return;
    }
    setTestingId(connId);
    try {
      const headers = await getAuthHeaders(true);
      const res  = await fetch(`${API_BASE}/social/connections/test`, {
        method:  'POST',
        headers,
        body:    JSON.stringify({ tenantId, connectionId: connId }),
      });
      const data = await res.json();
      if (data.ok) toast.success(`✅ Connection verified${data.info ? ` — ${data.info}` : ''}`);
      else         toast.error(`Test failed: ${data.error}`);
      await fetchConnections();
    } catch (e: any) { toast.error(`Test error: ${e.message}`); }
    finally { setTestingId(null); }
  };

  const handleDelete = async (connId: string) => {
    if (!window.confirm('Remove this connection? This cannot be undone.')) return;
    if (IS_DEMO_MODE) {
      setConnections(prev => prev.filter(c => c.id !== connId));
      toast.success('Connection removed (demo)');
      return;
    }
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/social/connections/${tenantId}/${connId}`, {
        method:  'DELETE',
        headers,
      });
      setConnections(prev => prev.filter(c => c.id !== connId));
      toast.success('Connection removed');
    } catch (e: any) { toast.error(`Delete failed: ${e.message}`); }
  };

  const handleSaved = (conn: SocialConnection) => {
    setConnections(prev => {
      const idx = prev.findIndex(c => c.id === conn.id);
      return idx >= 0 ? prev.map(c => c.id === conn.id ? conn : c) : [...prev, conn];
    });
    setDrawerOpen(false);
    setEditingConn(undefined);
  };

  const successCount = history.filter(h => h.status === 'success').length;
  const errorCount   = history.filter(h => h.status === 'error').length;

  return (
    <BackgroundLayout>
      <EmployeeNav />
      <ProfileBanner />
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className={`font-bold text-2xl flex items-center gap-2.5 ${et.text}`}>
              <Send className="w-6 h-6 text-teal-400" /> Social Publishing Hub
            </h1>
            <p className={`text-sm mt-1 ${et.textFaint}`}>
              Connect social channels and publish content directly from Brandtelligence
            </p>
          </div>
          <button
            onClick={() => { setEditingConn(undefined); setDrawerOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600
              hover:from-teal-400 hover:to-teal-500 text-white text-sm font-bold shadow-lg shadow-teal-500/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Channel
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Connected',  value: connections.length, Icon: Wifi,          color: 'text-teal-400'  },
            { label: 'Published',  value: successCount,        Icon: CheckCircle2,  color: 'text-green-400' },
            { label: 'Failed',     value: errorCount,          Icon: XCircle,       color: 'text-red-400'   },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className={`flex items-center gap-3 p-4 rounded-2xl ${isDark ? 'bg-white/4 border border-white/8' : 'bg-white border border-gray-200 shadow-sm'}`}>
              <Icon className={`w-5 h-5 ${color} shrink-0`} />
              <div>
                <p className={`font-bold text-xl leading-tight ${et.text}`}>{value}</p>
                <p className={`text-xs ${et.textFaint}`}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div className={`flex items-center gap-1 mb-5 p-1 rounded-xl w-fit ${isDark ? 'bg-white/4 border border-white/8' : 'bg-gray-100 border border-gray-200'}`}>
          {([
            { id: 'accounts' as const, label: 'Connected Accounts', Icon: Wifi    },
            { id: 'history'  as const, label: 'Publish History',     Icon: History },
          ] as const).map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                ${tab === id ? (isDark ? 'bg-white/15 text-white' : 'bg-white text-gray-900 shadow-sm') : (isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-500 hover:text-gray-700')}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* ── Accounts tab ── */}
        <AnimatePresence mode="wait">
          {tab === 'accounts' && (
            <motion.div key="accounts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
                </div>
              ) : connections.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-20 text-center">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${isDark ? 'bg-white/4 border border-white/8' : 'bg-gray-100 border border-gray-200'}`}>
                    <Send className={`w-8 h-8 ${et.textFaint}`} />
                  </div>
                  <div>
                    <p className={`font-bold text-lg ${et.textMd}`}>No channels connected yet</p>
                    <p className={`text-sm mt-1 max-w-sm ${et.textFaint}`}>
                      Connect Telegram, WhatsApp, Facebook, Instagram, Twitter/X, or LinkedIn to start publishing directly from content cards.
                    </p>
                  </div>
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold text-sm shadow-lg shadow-teal-500/20 transition-all hover:from-teal-400 hover:to-teal-500"
                  >
                    <Plus className="w-4 h-4" /> Connect Your First Channel
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {connections.map(conn => (
                      <ConnectionCard
                        key={conn.id}
                        conn={conn}
                        testing={testingId === conn.id}
                        onTest={() => handleTest(conn.id)}
                        onEdit={() => { setEditingConn(conn); setDrawerOpen(true); }}
                        onDelete={() => handleDelete(conn.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {/* ── History tab ── */}
          {tab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {histLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-20 text-center">
                  <History className={`w-10 h-10 ${et.textFaint}`} />
                  <p className={`text-sm ${et.textFaint}`}>No publish history yet</p>
                </div>
              ) : (
                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/3 border-white/8' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <div className={`${isDark ? 'divide-y divide-white/5' : 'divide-y divide-gray-100'}`}>
                    {history.map(rec => <HistoryRow key={rec.id} rec={rec} />)}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Connect / Edit drawer */}
      {drawerOpen && (
        <ConnectAccountDrawer
          tenantId={tenantId}
          existingConnection={editingConn}
          onSaved={handleSaved}
          onClose={() => { setDrawerOpen(false); setEditingConn(undefined); }}
        />
      )}
    </BackgroundLayout>
  );
}