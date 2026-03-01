/**
 * PublishModal
 * Lets an employee publish a content card to one or more connected social
 * channels in a single step.  Shows:
 *  • Card preview (caption + media thumbnail)
 *  • Connected accounts grid with checkbox selection
 *  • Optional per-platform caption override
 *  • Real-time publish status per platform
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Send, Check, AlertCircle, Loader2, ExternalLink,
  ImageIcon, Video, ChevronDown, ChevronUp, Edit3,
  Plus, RefreshCw,
} from 'lucide-react';
import {
  SiTelegram, SiWhatsapp, SiFacebook,
  SiInstagram, SiX, SiLinkedin,
} from 'react-icons/si';
import { toast } from 'sonner';
import { useAuth } from '../AuthContext';
import { type ContentCard } from '../../contexts/ContentContext';
import { type SocialConnection } from './ConnectAccountDrawer';
import { projectId } from '/utils/supabase/info';
import { IS_DEMO_MODE } from '../../config/appConfig';
import { getAuthHeaders } from '../../utils/authHeaders';
import { useDashboardTheme } from '../saas/DashboardThemeContext';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// ─── Platform meta ───────────────────────────────────────────���────────────────

const PLATFORM_META: Record<string, {
  Icon: React.ComponentType<{ className?: string }>;
  color: string; bg: string; border: string;
}> = {
  telegram:  { Icon: SiTelegram,  color: 'text-sky-400',   bg: 'bg-sky-500/15',   border: 'border-sky-400/30'   },
  whatsapp:  { Icon: SiWhatsapp,  color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-400/30' },
  facebook:  { Icon: SiFacebook,  color: 'text-blue-400',  bg: 'bg-blue-500/15',  border: 'border-blue-400/30'  },
  instagram: { Icon: SiInstagram, color: 'text-pink-400',  bg: 'bg-pink-500/15',  border: 'border-pink-400/30'  },
  twitter:   { Icon: SiX,         color: 'text-white',     bg: 'bg-white/8',      border: 'border-white/15'     },
  linkedin:  { Icon: SiLinkedin,  color: 'text-blue-300',  bg: 'bg-blue-700/15',  border: 'border-blue-400/25'  },
};

// ─── Publish status per connection ────────────────────────────────────────────

type PubStatus = 'idle' | 'publishing' | 'success' | 'error';
interface PubState { status: PubStatus; postUrl?: string; error?: string; }

// ─── Demo simulation ──────────────────────────────────────────────────────────

async function simulatePublish(): Promise<{ ok: boolean; postUrl?: string; error?: string }> {
  await new Promise(r => setTimeout(r, 1400 + Math.random() * 800));
  const ok = Math.random() > 0.15;
  return ok
    ? { ok: true, postUrl: 'https://t.me/demo/123' }
    : { ok: false, error: 'Demo: simulated network error (15 % failure rate)' };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PublishModalProps {
  card:      ContentCard;
  tenantId:  string;
  onClose:   () => void;
  onOpenConnectionManager?: () => void; // navigates to /app/publish
}

export function PublishModal({ card, tenantId, onClose, onOpenConnectionManager }: PublishModalProps) {
  const { user } = useAuth();
  const { isDark } = useDashboardTheme();

  // Connections
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loadingConns, setLoadingConns] = useState(true);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Per-platform caption overrides
  const [showCaptionOverride, setShowCaptionOverride] = useState<Record<string, boolean>>({});
  const [captionOverrides,    setCaptionOverrides]    = useState<Record<string, string>>({});

  // Publish state per connection id
  const [pubState, setPubState] = useState<Record<string, PubState>>({});
  const [anyPublishing, setAnyPublishing] = useState(false);
  const [allDone,       setAllDone]       = useState(false);

  // Load connections
  useEffect(() => {
    if (IS_DEMO_MODE) {
      setConnections([
        { id: 'demo-tg',  platform: 'telegram',  displayName: '@brandtelligence_channel', credentials: {}, connectedAt: '', connectedBy: '', lastTestStatus: 'ok' },
        { id: 'demo-wa',  platform: 'whatsapp',  displayName: 'WhatsApp Business (+6011-XXXX)', credentials: {}, connectedAt: '', connectedBy: '', lastTestStatus: 'ok' },
        { id: 'demo-fb',  platform: 'facebook',  displayName: 'Brandtelligence Official Page', credentials: {}, connectedAt: '', connectedBy: '', lastTestStatus: 'ok' },
        { id: 'demo-ig',  platform: 'instagram', displayName: '@brandtelligence.my', credentials: {}, connectedAt: '', connectedBy: '', lastTestStatus: 'ok' },
        { id: 'demo-tw',  platform: 'twitter',   displayName: '@Brandtelligence', credentials: {}, connectedAt: '', connectedBy: '', lastTestStatus: 'error', lastTestError: 'Token expired' },
        { id: 'demo-li',  platform: 'linkedin',  displayName: 'Brandtelligence Sdn Bhd', credentials: {}, connectedAt: '', connectedBy: '' },
      ]);
      setLoadingConns(false);
      return;
    }
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const r = await fetch(`${API_BASE}/social/connections?tenantId=${encodeURIComponent(tenantId)}`, { headers });
        const data = await r.json();
        if (data.connections) setConnections(data.connections);
      } catch (e) { console.error('[PublishModal] load connections:', e); }
      finally { setLoadingConns(false); }
    })();
  }, [tenantId]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const buildCaption = (connId: string) => {
    if (captionOverrides[connId]?.trim()) return captionOverrides[connId];
    return card.caption ?? '';
  };

  const handlePublish = async () => {
    if (selected.size === 0) { toast.error('Select at least one channel to publish to'); return; }
    setAnyPublishing(true);

    // Set all selected to "publishing"
    setPubState(prev => {
      const next = { ...prev };
      for (const id of selected) next[id] = { status: 'publishing' };
      return next;
    });

    const publishedBy = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
    const results = await Promise.allSettled(
      [...selected].map(async connId => {
        try {
          let result: { ok: boolean; postUrl?: string; error?: string };
          if (IS_DEMO_MODE) {
            result = await simulatePublish();
          } else {
            const pubHeaders = await getAuthHeaders(true);
            const res  = await fetch(`${API_BASE}/social/publish`, {
              method:  'POST',
              headers: pubHeaders,
              body: JSON.stringify({
                tenantId,
                connectionId: connId,
                caption:      buildCaption(connId),
                hashtags:     card.hashtags,
                mediaUrl:     card.mediaUrl,
                mediaType:    card.mediaType,
                cardId:       card.id,
                cardTitle:    card.title,
                publishedBy,
              }),
            });
            result = await res.json();
          }
          setPubState(prev => ({ ...prev, [connId]: { status: result.ok ? 'success' : 'error', postUrl: result.postUrl, error: result.error } }));
          return { connId, ...result };
        } catch (err: any) {
          setPubState(prev => ({ ...prev, [connId]: { status: 'error', error: err.message } }));
          return { connId, ok: false, error: err.message };
        }
      }),
    );

    const succeeded = results.filter(r => r.status === 'fulfilled' && (r as any).value.ok).length;
    const failed    = results.length - succeeded;
    if (succeeded > 0 && failed === 0) toast.success(`🚀 Published to ${succeeded} channel${succeeded > 1 ? 's' : ''}!`);
    else if (succeeded > 0)            toast.warning(`Published to ${succeeded}, failed ${failed}`);
    else                               toast.error(`All ${failed} publishes failed — check credentials`);

    setAnyPublishing(false);
    setAllDone(true);
  };

  const selectedConns = connections.filter(c => selected.has(c.id));
  const canPublish    = selected.size > 0 && !anyPublishing;

  const captionPreview = (card.caption ?? '').slice(0, 200) + ((card.caption?.length ?? 0) > 200 ? '…' : '');
  const hashtagStr     = (card.hashtags ?? []).map(h => `#${h}`).join(' ');

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9200] flex items-end sm:items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} />

        <motion.div
          className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: isDark ? 'linear-gradient(150deg,rgba(14,12,28,0.99) 0%,rgba(9,7,20,0.99) 100%)' : 'linear-gradient(150deg,rgba(255,255,255,0.99) 0%,rgba(248,249,252,0.99) 100%)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.1)'}` }}
          initial={{ y: 60, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/8 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
              <Send className="w-4 h-4 text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-sm">Publish to Social Channels</h2>
              <p className="text-white/35 text-xs truncate mt-0.5">"{card.title}"</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/50 hover:text-white transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ── Card preview ── */}
            <div className="px-5 py-4 border-b border-white/6">
              <p className="text-white/30 text-[10px] uppercase tracking-wider font-semibold mb-2">Content Preview</p>
              <div className="flex gap-3">
                {/* Media thumb */}
                {card.mediaUrl ? (
                  card.mediaType === 'video'
                    ? <div className="w-14 h-14 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center shrink-0">
                        <Video className="w-5 h-5 text-white/40" />
                      </div>
                    : <img src={card.mediaUrl} alt="" className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5 text-white/20" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-xs leading-relaxed line-clamp-3">{captionPreview}</p>
                  {hashtagStr && <p className="text-teal-400/60 text-[10px] mt-1 line-clamp-1">{hashtagStr}</p>}
                </div>
              </div>
            </div>

            {/* ── Channel selection ── */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/30 text-[10px] uppercase tracking-wider font-semibold">Connected Channels</p>
                {connections.length > 0 && (
                  <button
                    onClick={() => {
                      const allIds = new Set(connections.map(c => c.id));
                      setSelected(prev => prev.size === connections.length ? new Set() : allIds);
                    }}
                    className="text-[10px] text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    {selected.size === connections.length ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>

              {loadingConns ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                  <span className="text-white/30 text-sm">Loading connections…</span>
                </div>
              ) : connections.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center">
                    <Send className="w-6 h-6 text-white/20" />
                  </div>
                  <div>
                    <p className="text-white/50 font-semibold text-sm">No channels connected</p>
                    <p className="text-white/25 text-xs mt-0.5">Go to Social Publishing to add your first channel</p>
                  </div>
                  {onOpenConnectionManager && (
                    <button
                      onClick={() => { onClose(); onOpenConnectionManager(); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/15 border border-teal-400/25 text-teal-300 text-xs font-semibold transition-all hover:bg-teal-500/25"
                    >
                      <Plus className="w-3.5 h-3.5" /> Connect a Channel
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {connections.map(conn => {
                    const meta   = PLATFORM_META[conn.platform] ?? PLATFORM_META.telegram;
                    const isSel  = selected.has(conn.id);
                    const state  = pubState[conn.id];
                    const hasErr = conn.lastTestStatus === 'error';

                    return (
                      <div key={conn.id} className="space-y-2">
                        {/* Channel row */}
                        <button
                          onClick={() => !anyPublishing && !state && toggleSelect(conn.id)}
                          disabled={anyPublishing || !!state}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                            ${isSel
                              ? `${meta.bg} ${meta.border}`
                              : 'bg-white/3 border-white/8 hover:bg-white/6'}
                            ${(anyPublishing || state) ? 'opacity-70 cursor-default' : ''}`}
                        >
                          {/* Checkbox */}
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all
                            ${isSel ? `${meta.border} ${meta.bg}` : 'border-white/20'}`}>
                            {isSel && <Check className={`w-3 h-3 ${meta.color}`} />}
                          </div>

                          {/* Platform icon */}
                          <div className={`w-8 h-8 rounded-lg ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0`}>
                            <meta.Icon className={`w-4 h-4 ${meta.color}`} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-white/80 text-xs font-semibold truncate">{conn.displayName}</p>
                            <p className="text-white/30 text-[10px] capitalize">{conn.platform}</p>
                          </div>

                          {/* Status indicators */}
                          <div className="shrink-0 flex items-center gap-1.5">
                            {hasErr && !state && (
                              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/20 text-amber-300 text-[9px]">
                                ⚠ token issue
                              </span>
                            )}
                            {state?.status === 'publishing' && <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />}
                            {state?.status === 'success'    && <Check className="w-4 h-4 text-green-400" />}
                            {state?.status === 'error'      && <AlertCircle className="w-4 h-4 text-red-400" />}
                          </div>
                        </button>

                        {/* Publish result */}
                        {state?.status === 'success' && (
                          <div className="ml-10 flex items-center gap-2 text-[10px] text-green-300/70">
                            <Check className="w-3 h-3 text-green-400 shrink-0" />
                            <span>Published successfully</span>
                            {state.postUrl && (
                              <a href={state.postUrl} target="_blank" rel="noreferrer"
                                className="flex items-center gap-0.5 text-teal-400 hover:underline">
                                View post <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        )}
                        {state?.status === 'error' && (
                          <div className="ml-10 text-[10px] text-red-300/70 flex items-start gap-1.5">
                            <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                            <span>{state.error}</span>
                          </div>
                        )}

                        {/* Caption override (for selected, not yet published) */}
                        {isSel && !state && (
                          <div className="ml-10">
                            <button
                              onClick={() => setShowCaptionOverride(p => ({ ...p, [conn.id]: !p[conn.id] }))}
                              className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                              Customise caption for this channel
                              {showCaptionOverride[conn.id]
                                ? <ChevronUp className="w-2.5 h-2.5" />
                                : <ChevronDown className="w-2.5 h-2.5" />}
                            </button>
                            <AnimatePresence>
                              {showCaptionOverride[conn.id] && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <textarea
                                    value={captionOverrides[conn.id] ?? card.caption ?? ''}
                                    onChange={e => setCaptionOverrides(p => ({ ...p, [conn.id]: e.target.value }))}
                                    rows={3}
                                    placeholder="Custom caption for this platform…"
                                    className="mt-1.5 w-full bg-white/5 border border-white/12 rounded-xl px-3 py-2 text-white text-xs
                                      placeholder-white/20 focus:outline-none focus:border-teal-400/40 transition-all resize-none"
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          {connections.length > 0 && (
            <div className="px-5 py-4 border-t border-white/8 shrink-0">
              {allDone ? (
                <div className="flex items-center gap-3">
                  <button onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10 text-white/70 text-sm font-semibold transition-all">
                    Close
                  </button>
                  <button
                    onClick={() => { setPubState({}); setAllDone(false); setSelected(new Set()); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10 text-white/60 text-sm font-semibold transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Publish again
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-xs text-white/30">
                    {selected.size === 0
                      ? 'Select one or more channels above'
                      : `${selected.size} channel${selected.size > 1 ? 's' : ''} selected`}
                  </div>
                  <button
                    onClick={handlePublish}
                    disabled={!canPublish}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all
                      bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500
                      text-white shadow-lg shadow-teal-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {anyPublishing
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
                      : <><Send className="w-4 h-4" /> Publish Now</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
