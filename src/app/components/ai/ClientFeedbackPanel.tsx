/**
 * ClientFeedbackPanel
 * ─────────────────────────────────────────────────────────────────────────────
 * Displayed inside ContentCardDetail below the Comment Thread.
 * Fetches all client review sessions that include this card and shows
 * the client's decision (approved / changes_requested / pending) with
 * any associated feedback notes.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, CheckCircle2, MessageSquare, Clock, ChevronDown, ChevronUp,
  Loader2, AlertCircle, Copy, Check, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHeaders';

const API  = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientReviewEntry {
  token:        string;
  clientName:   string;
  createdAt:    string;
  expiresAt:    string;
  expired:      boolean;
  totalCards:   number;
  totalDecided: number;
  decision: {
    decision:   'approved' | 'changes_requested';
    comment?:   string;
    decidedAt:  string;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-MY', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-MY', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ─── Single review row ────────────────────────────────────────────────────────

function ReviewRow({ review, appUrl }: { review: ClientReviewEntry; appUrl: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied,   setCopied]   = useState(false);

  const reviewUrl = `${appUrl}/review/${review.token}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      toast.success('Review link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Could not copy link'); }
  };

  const { decision } = review;

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${
      decision?.decision === 'approved'
        ? 'border-emerald-400/30 bg-emerald-500/5'
        : decision?.decision === 'changes_requested'
          ? 'border-amber-400/30 bg-amber-500/5'
          : review.expired
            ? 'border-white/8 bg-white/3'
            : 'border-white/10 bg-white/5'
    }`}>

      {/* Row header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/3 transition-all"
      >
        {/* Decision icon */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          decision?.decision === 'approved'
            ? 'bg-emerald-500/20 border border-emerald-400/30'
            : decision?.decision === 'changes_requested'
              ? 'bg-amber-500/20 border border-amber-400/30'
              : 'bg-white/8 border border-white/10'
        }`}>
          {decision?.decision === 'approved' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : decision?.decision === 'changes_requested' ? (
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-white/30" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/80 text-xs font-semibold">{review.clientName}</span>
            {/* Decision badge */}
            {decision ? (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                decision.decision === 'approved'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/25'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-400/25'
              }`}>
                {decision.decision === 'approved' ? '✓ Approved' : '↺ Changes Requested'}
              </span>
            ) : review.expired ? (
              <span className="text-[10px] text-white/25 border border-white/10 px-2 py-0.5 rounded-full">
                Expired
              </span>
            ) : (
              <span className="text-[10px] text-white/30 border border-white/10 px-2 py-0.5 rounded-full">
                Pending
              </span>
            )}
          </div>
          <p className="text-white/30 text-[10px] mt-0.5">
            {decision ? `Decided ${fmtDateTime(decision.decidedAt)}` : `Sent ${fmtDate(review.createdAt)}`}
            {review.totalCards > 1 && ` · ${review.totalDecided}/${review.totalCards} cards reviewed`}
          </p>
        </div>

        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-white/25 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-white/25 shrink-0" />
        )}
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/6">

              {/* Client comment / feedback */}
              {decision?.comment && (
                <div className="mt-3 bg-amber-500/6 border border-amber-400/20 rounded-lg px-3 py-2.5">
                  <p className="text-amber-300/60 text-[10px] font-semibold uppercase tracking-wider mb-1">Client Note</p>
                  <p className="text-amber-100/80 text-xs leading-relaxed">{decision.comment}</p>
                </div>
              )}

              {!decision && !review.expired && (
                <p className="mt-3 text-white/30 text-[11px] italic">
                  The client has not yet submitted their decision for this card.
                </p>
              )}

              {/* Meta row */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-white/20 text-[10px]">
                  Expires {fmtDate(review.expiresAt)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
                    title="Copy review link"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                  <a
                    href={reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Preview
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface ClientFeedbackPanelProps {
  cardId: string;
}

export function ClientFeedbackPanel({ cardId }: ClientFeedbackPanelProps) {
  const [reviews,  setReviews]  = useState<ClientReviewEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(false);

  const appUrl = window.location.origin;

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API}/client-review/by-card/${cardId}`, { headers: await getAuthHeaders() });
        const data = await res.json();
        if (res.ok) {
          setReviews(data.reviews ?? []);
          // Auto-expand if there's any client feedback (decisions made)
          if ((data.reviews ?? []).some((r: ClientReviewEntry) => r.decision !== null)) {
            setOpen(true);
          }
        }
      } catch (e) {
        console.error('[ClientFeedbackPanel] fetch error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [cardId]);

  // Count decisions
  const approvedCount  = reviews.filter(r => r.decision?.decision === 'approved').length;
  const changesCount   = reviews.filter(r => r.decision?.decision === 'changes_requested').length;
  const pendingCount   = reviews.filter(r => !r.decision && !r.expired).length;
  const total          = reviews.length;

  if (!loading && total === 0) return null;

  return (
    <div>
      {/* Section toggle header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full text-white/50 hover:text-white/70 text-xs uppercase tracking-wider transition-colors py-2"
      >
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Client Reviews
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin text-white/30" />
          ) : (
            <span className="flex items-center gap-1 normal-case font-normal text-white/30">
              ({total})
              {approvedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[9px] font-bold">
                  {approvedCount} ✓
                </span>
              )}
              {changesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[9px] font-bold">
                  {changesCount} ↺
                </span>
              )}
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/8 text-white/30 text-[9px] font-bold border border-white/10">
                  {pendingCount} pending
                </span>
              )}
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pb-2">
              {loading ? (
                <div className="flex items-center gap-2 py-3 text-white/30">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Loading client reviews…</span>
                </div>
              ) : reviews.length === 0 ? (
                <div className="flex items-center gap-2 py-3 text-white/20 text-xs">
                  <AlertCircle className="w-4 h-4" />
                  No client reviews yet
                </div>
              ) : (
                reviews.map(review => (
                  <ReviewRow key={review.token} review={review} appUrl={appUrl} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}