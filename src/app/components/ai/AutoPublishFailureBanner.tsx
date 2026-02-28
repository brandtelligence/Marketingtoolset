/**
 * AutoPublishFailureBanner
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches auto-publish failure alerts from the server for the current tenant
 * and renders a dismissable red warning banner for each failed card.
 *
 * Alerts are created by the Deno cron in index.tsx when a card's
 * `autoPublishAttempts` hits 3 (permanent failure / max retries exhausted).
 *
 * Each alert can be:
 *  • Retried  (POST /content/autopublish-alerts/:cardId/retry)  — resets
 *             autoPublishAttempts to 0 so the cron picks the card up next tick
 *  • Dismissed (DELETE /content/autopublish-alerts/:cardId)
 *  • Clicked to open the card's detail modal (via `onOpenCard`)
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle, X, ExternalLink, RotateCw,
  Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHeaders';

const API  = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutoPublishAlert {
  cardId:    string;
  cardTitle: string;
  platform:  string;
  failedAt:  string;
  error:     string;
  attempts:  number;
}

interface AutoPublishFailureBannerProps {
  tenantId:     string;
  onOpenCard?:  (cardId: string) => void;  // optional — open card in detail modal
}

// ─── Platform display name map ────────────────────────────────────────────────

const PLATFORM_NAMES: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', twitter: 'X (Twitter)',
  linkedin: 'LinkedIn',   tiktok: 'TikTok',     youtube: 'YouTube',
  pinterest: 'Pinterest', snapchat: 'Snapchat',  threads: 'Threads',
  reddit: 'Reddit',       whatsapp: 'WhatsApp',  telegram: 'Telegram',
};

function fmtRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1)   return 'just now';
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return iso; }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AutoPublishFailureBanner({ tenantId, onOpenCard }: AutoPublishFailureBannerProps) {
  const [alerts,     setAlerts]     = useState<AutoPublishAlert[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [collapsed,  setCollapsed]  = useState(false);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [retrying,   setRetrying]   = useState<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res  = await fetch(`${API}/content/autopublish-alerts?tenantId=${encodeURIComponent(tenantId)}`, { headers: await getAuthHeaders() });
      const data = await res.json();
      if (res.ok) setAlerts(data.alerts ?? []);
    } catch (e) {
      console.error('[AutoPublishFailureBanner] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // ── Dismiss ──────────────────────────────────────────────────────────────────

  const handleDismiss = async (cardId: string) => {
    setDismissing(prev => new Set(prev).add(cardId));
    try {
      await fetch(
        `${API}/content/autopublish-alerts/${cardId}?tenantId=${encodeURIComponent(tenantId)}`,
        { method: 'DELETE', headers: await getAuthHeaders() }
      );
      setAlerts(prev => prev.filter(a => a.cardId !== cardId));
    } catch (e) {
      console.error('[AutoPublishFailureBanner] dismiss error:', e);
    } finally {
      setDismissing(prev => { const s = new Set(prev); s.delete(cardId); return s; });
    }
  };

  const handleDismissAll = async () => {
    await Promise.allSettled(alerts.map(a => handleDismiss(a.cardId)));
  };

  // ── Retry ─────────────────────────────────────────────────────────────────────

  const handleRetry = async (cardId: string, cardTitle: string) => {
    setRetrying(prev => new Set(prev).add(cardId));
    try {
      const res = await fetch(
        `${API}/content/autopublish-alerts/${cardId}/retry?tenantId=${encodeURIComponent(tenantId)}`,
        { method: 'POST', headers: await getAuthHeaders() }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Retry failed');
      }
      setAlerts(prev => prev.filter(a => a.cardId !== cardId));
      toast.success(`"${cardTitle}" re-queued — cron will retry within 1 minute`);
    } catch (e) {
      console.error('[AutoPublishFailureBanner] retry error:', e);
      toast.error('Retry failed — please try again');
    } finally {
      setRetrying(prev => { const s = new Set(prev); s.delete(cardId); return s; });
    }
  };

  // Nothing to show
  if (loading || alerts.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="overflow-hidden"
      >
        <div className="rounded-2xl border border-red-400/30 bg-red-500/6 overflow-hidden">

          {/* ── Header bar ── */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-red-400/15">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <div>
                <p className="text-red-200 text-xs font-semibold leading-tight">
                  Auto-Publish Failed · {alerts.length} card{alerts.length !== 1 ? 's' : ''} need attention
                </p>
                <p className="text-red-300/40 text-[10px] leading-tight mt-0.5">
                  These cards have exhausted 3 publish attempts. Retry to re-queue for the next cron tick.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {alerts.length > 1 && (
                <button
                  onClick={handleDismissAll}
                  className="text-[10px] text-red-300/40 hover:text-red-200 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all border border-red-400/15"
                >
                  Dismiss all
                </button>
              )}
              <button
                onClick={() => setCollapsed(v => !v)}
                className="p-1 rounded-lg text-red-300/40 hover:text-red-200 hover:bg-red-500/10 transition-all"
                title={collapsed ? 'Expand alerts' : 'Collapse alerts'}
              >
                {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* ── Alert rows ── */}
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="divide-y divide-red-400/8">
                  {alerts.map((alert, idx) => (
                    <motion.div
                      key={alert.cardId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8, height: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/4 transition-all group"
                    >
                      {/* Platform + card info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white/70 text-[11px] font-semibold truncate max-w-[12rem]">
                            {alert.cardTitle}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/12 text-red-300 border border-red-400/20">
                            {PLATFORM_NAMES[alert.platform] ?? alert.platform}
                          </span>
                          <span className="text-[9px] text-white/20">
                            {fmtRelative(alert.failedAt)}
                          </span>
                        </div>
                        <p className="text-red-300/50 text-[10px] mt-0.5 truncate">
                          Error: {alert.error}
                        </p>
                      </div>

                      {/* Actions — visible on hover */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">

                        {/* Retry */}
                        <button
                          onClick={() => handleRetry(alert.cardId, alert.cardTitle)}
                          disabled={retrying.has(alert.cardId) || dismissing.has(alert.cardId)}
                          title="Re-queue for auto-publish (resets attempt counter)"
                          className="flex items-center gap-1 text-[10px] text-emerald-300/70 hover:text-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-500/10 transition-all border border-emerald-400/20 disabled:opacity-40"
                        >
                          {retrying.has(alert.cardId)
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <RotateCw className="w-3 h-3" />
                          }
                          Retry
                        </button>

                        {/* View card */}
                        {onOpenCard && (
                          <button
                            onClick={() => onOpenCard(alert.cardId)}
                            title="Open card detail"
                            className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white px-2 py-1 rounded-lg hover:bg-white/8 transition-all border border-white/10"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View
                          </button>
                        )}

                        {/* Dismiss */}
                        <button
                          onClick={() => handleDismiss(alert.cardId)}
                          disabled={dismissing.has(alert.cardId) || retrying.has(alert.cardId)}
                          className="p-1 rounded-lg text-red-300/30 hover:text-red-200 hover:bg-red-500/10 transition-all disabled:opacity-40"
                          title="Dismiss this alert"
                        >
                          {dismissing.has(alert.cardId)
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <X className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}