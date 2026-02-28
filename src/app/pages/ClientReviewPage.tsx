/**
 * ClientReviewPage  —  /review/:token
 * ─────────────────────────────────────────────────────────────────────────────
 * Public, unauthenticated page where external clients review content cards.
 * No login required. The token encodes which cards to show and when it expires.
 *
 * UX flow:
 *  1. Load → validate token → show cards
 *  2. Client clicks ✓ Approve or ↺ Request Changes (with optional note)
 *  3. "Submit Review" sends all decisions at once
 *  4. Thank-you screen
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, MessageSquare, Send, Loader2, AlertTriangle,
  Clock, Check, X, ChevronDown, ChevronUp, Link2,
} from 'lucide-react';
import {
  SiInstagram, SiFacebook, SiX, SiLinkedin, SiTiktok,
  SiYoutube, SiPinterest, SiSnapchat, SiThreads, SiReddit,
  SiWhatsapp, SiTelegram,
} from 'react-icons/si';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../utils/authHeaders';
import brandLogo from 'figma:asset/250842c5232a8611aa522e6a3530258e858657d5.png';

const API  = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;


// ─── Platform meta ────────────────────────────────────────────────────────────

const PLATFORM_META: Record<string, { label: string; color: string; bg: string; border: string; Icon: React.ComponentType<{ className?: string }> }> = {
  instagram: { label: 'Instagram',          color: 'text-pink-500',   bg: 'bg-pink-50',   border: 'border-pink-200',   Icon: SiInstagram },
  facebook:  { label: 'Facebook',           color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   Icon: SiFacebook  },
  twitter:   { label: 'X (Twitter)',        color: 'text-slate-900',  bg: 'bg-slate-50',  border: 'border-slate-200',  Icon: SiX         },
  linkedin:  { label: 'LinkedIn',           color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   Icon: SiLinkedin  },
  tiktok:    { label: 'TikTok',             color: 'text-slate-900',  bg: 'bg-slate-50',  border: 'border-slate-200',  Icon: SiTiktok    },
  youtube:   { label: 'YouTube',            color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    Icon: SiYoutube   },
  pinterest: { label: 'Pinterest',          color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',    Icon: SiPinterest },
  snapchat:  { label: 'Snapchat',           color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200', Icon: SiSnapchat  },
  threads:   { label: 'Threads',            color: 'text-slate-900',  bg: 'bg-slate-50',  border: 'border-slate-200',  Icon: SiThreads   },
  reddit:    { label: 'Reddit',             color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', Icon: SiReddit    },
  whatsapp:  { label: 'WhatsApp Business',  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200',  Icon: SiWhatsapp  },
  telegram:  { label: 'Telegram',           color: 'text-sky-600',    bg: 'bg-sky-50',    border: 'border-sky-200',    Icon: SiTelegram  },
};
const DEFAULT_PLATFORM = { label: 'Social Post', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', Icon: Link2 };

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewCard {
  id:            string;
  platform:      string;
  title:         string;
  caption:       string;
  hashtags:      string[];
  mediaUrl?:     string;
  mediaType?:    'image' | 'video';
  status:        string;
  scheduledDate?: string;
}

type Decision = 'approved' | 'changes_requested' | null;

interface CardDecision {
  decision: Decision;
  comment:  string;
}

// ─── Card Review Item ─────────────────────────────────────────────────────────

function ReviewCardItem({
  card,
  index,
  decision,
  onChange,
}: {
  card:     ReviewCard;
  index:    number;
  decision: CardDecision;
  onChange: (d: CardDecision) => void;
}) {
  const meta         = PLATFORM_META[card.platform] ?? DEFAULT_PLATFORM;
  const [open, setOpen] = useState(true);
  const [showNote, setShowNote] = useState(false);

  const setDecision = (d: Decision) => {
    const newShowNote = d === 'changes_requested';
    setShowNote(newShowNote);
    onChange({ ...decision, decision: d });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all ${
        decision.decision === 'approved'           ? 'border-emerald-400'
        : decision.decision === 'changes_requested' ? 'border-amber-400'
        : 'border-slate-200'
      }`}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        {/* Status dot */}
        <div className={`w-3 h-3 rounded-full shrink-0 ${
          decision.decision === 'approved'            ? 'bg-emerald-400'
          : decision.decision === 'changes_requested'  ? 'bg-amber-400'
          : 'bg-slate-200'
        }`} />

        {/* Platform pill */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${meta.bg} ${meta.border} border text-[11px] font-semibold ${meta.color} shrink-0`}>
          <meta.Icon className="w-2.5 h-2.5" />
          {meta.label}
        </div>

        <p className="flex-1 font-semibold text-slate-800 text-sm truncate">{card.title}</p>

        {decision.decision && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
            decision.decision === 'approved'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {decision.decision === 'approved' ? '✓ Approved' : '↺ Changes Requested'}
          </span>
        )}

        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
              {/* Media */}
              {card.mediaUrl && (
                <div className="rounded-xl overflow-hidden bg-slate-100 max-h-72">
                  {card.mediaType === 'video' ? (
                    <video
                      src={card.mediaUrl}
                      controls
                      className="w-full max-h-72 object-contain"
                    />
                  ) : (
                    <img
                      src={card.mediaUrl}
                      alt={card.title}
                      className="w-full max-h-72 object-contain"
                    />
                  )}
                </div>
              )}

              {/* Caption */}
              <div>
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Caption</p>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{card.caption}</p>
              </div>

              {/* Hashtags */}
              {card.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {card.hashtags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-medium">
                      #{tag.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              )}

              {/* Decision buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setDecision('approved')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm border-2 transition-all ${
                    decision.decision === 'approved'
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => setDecision(decision.decision === 'changes_requested' ? null : 'changes_requested')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm border-2 transition-all ${
                    decision.decision === 'changes_requested'
                      ? 'bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Request Changes
                </button>
              </div>

              {/* Note input for changes_requested */}
              <AnimatePresence>
                {decision.decision === 'changes_requested' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <textarea
                      value={decision.comment}
                      onChange={e => onChange({ ...decision, comment: e.target.value })}
                      placeholder="Please describe what changes you'd like to see…"
                      rows={3}
                      className="w-full bg-amber-50 border-2 border-amber-200 focus:border-amber-400 rounded-xl px-4 py-3 text-slate-700 text-sm resize-none focus:outline-none transition-colors placeholder:text-slate-400"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ClientReviewPage() {
  const { token } = useParams<{ token: string }>();

  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [expired,   setExpired]   = useState(false);
  const [clientName,setClientName]= useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [cards,     setCards]     = useState<ReviewCard[]>([]);
  const [decisions, setDecisions] = useState<Record<string, CardDecision>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  // ── Load review ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setError('Invalid review link'); setLoading(false); return; }
    (async () => {
      try {
        const res  = await fetch(`${API}/client-review/${token}`, { headers: await getAuthHeaders() });
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setError(data.reason === 'not_found' ? 'This review link was not found.' : `Error: ${data.error ?? 'Unknown'}`);
          setLoading(false);
          return;
        }

        if (data.expired) { setExpired(true); setLoading(false); return; }

        setClientName(data.session.clientName);
        setExpiresAt(data.session.expiresAt);
        setCards(data.cards ?? []);

        // Pre-populate decisions from any already-submitted ones
        const init: Record<string, CardDecision> = {};
        (data.cards ?? []).forEach((c: ReviewCard) => {
          const existing = data.session.decisions?.[c.id];
          init[c.id] = existing
            ? { decision: existing.decision, comment: existing.comment ?? '' }
            : { decision: null, comment: '' };
        });
        setDecisions(init);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load review');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const entries = Object.entries(decisions).filter(([, d]) => d.decision !== null);
      const authH = await getAuthHeaders(true);
      await Promise.all(
        entries.map(([cardId, d]) =>
          fetch(`${API}/client-review/${token}/decide`, {
            method:  'POST',
            headers: authH,
            body:    JSON.stringify({ cardId, decision: d.decision, comment: d.comment }),
          })
        )
      );
      setSubmitted(true);
    } catch (e: any) {
      alert(`Submission failed: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const decidedCount  = Object.values(decisions).filter(d => d.decision !== null).length;
  const allDecided    = cards.length > 0 && decidedCount === cards.length;
  const someDecided   = decidedCount > 0;

  const fmtExpiry = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return iso; }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/40">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="Brandtelligence" className="h-7 w-auto" />
            <div className="w-px h-5 bg-slate-200" />
            <span className="text-slate-500 text-sm font-medium">Content Review</span>
          </div>
          {expiresAt && (
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>Expires {fmtExpiry(expiresAt)}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-8 h-8 text-[#0BA4AA] animate-spin" />
            <p className="text-slate-400 text-sm">Loading your review…</p>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
              <X className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-slate-700 font-bold text-lg">Review not found</h2>
            <p className="text-slate-400 text-sm max-w-xs">{error}</p>
          </div>
        )}

        {/* ── Expired ── */}
        {!loading && expired && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-slate-700 font-bold text-lg">Review link expired</h2>
            <p className="text-slate-400 text-sm max-w-xs">
              This review link has expired. Please ask your contact at Brandtelligence to send you a fresh link.
            </p>
          </div>
        )}

        {/* ── Thank-you ── */}
        {!loading && submitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-5 text-center"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 500, damping: 20 }}
                className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-[#0BA4AA] border-2 border-white flex items-center justify-center"
              >
                <Check className="w-3.5 h-3.5 text-white" />
              </motion.div>
            </div>
            <div>
              <h2 className="text-slate-800 font-bold text-2xl">Review submitted!</h2>
              <p className="text-slate-500 text-sm mt-2 max-w-sm">
                Thank you, <span className="font-semibold text-slate-700">{clientName}</span>. Your feedback has been sent to the Brandtelligence team and they'll be in touch shortly.
              </p>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  {Object.values(decisions).filter(d => d.decision === 'approved').length}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">Approved</p>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-500">
                  {Object.values(decisions).filter(d => d.decision === 'changes_requested').length}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">Changes requested</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Review UI ── */}
        {!loading && !error && !expired && !submitted && (
          <>
            {/* Intro */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-5">
              <h1 className="text-slate-800 font-bold text-xl">
                Hello{clientName ? `, ${clientName}` : ''}! 👋
              </h1>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                The Brandtelligence team has shared{' '}
                <strong className="text-slate-700">{cards.length} content card{cards.length !== 1 ? 's' : ''}</strong>{' '}
                with you for review. Please go through each card and let us know your thoughts — approve or request changes with notes.
              </p>
              {/* Progress */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{decidedCount} of {cards.length} reviewed</span>
                  <span>{Math.round((decidedCount / Math.max(cards.length, 1)) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#0BA4AA] rounded-full"
                    animate={{ width: `${(decidedCount / Math.max(cards.length, 1)) * 100}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-4">
              {cards.map((card, i) => (
                <ReviewCardItem
                  key={card.id}
                  card={card}
                  index={i}
                  decision={decisions[card.id] ?? { decision: null, comment: '' }}
                  onChange={d => setDecisions(prev => ({ ...prev, [card.id]: d }))}
                />
              ))}
            </div>

            {/* Submit bar */}
            <AnimatePresence>
              {someDecided && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="sticky bottom-4 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-slate-700 font-semibold text-sm">
                      {allDecided ? 'All cards reviewed — ready to submit!' : `${decidedCount} of ${cards.length} reviewed`}
                    </p>
                    {!allDecided && (
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        You can submit now or review the remaining {cards.length - decidedCount} card{cards.length - decidedCount !== 1 ? 's' : ''} first.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0
                      bg-gradient-to-r from-[#0BA4AA] to-[#0BA4AA]/80 text-white
                      hover:from-[#0BA4AA]/90 hover:to-[#0BA4AA]/70
                      shadow-md shadow-[#0BA4AA]/25
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {submitting ? 'Submitting…' : 'Submit Review'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-3xl mx-auto px-4 pb-8 pt-4 text-center">
        <p className="text-slate-300 text-[11px]">
          Powered by <span className="text-[#0BA4AA] font-semibold">Brandtelligence</span> · AI-Powered Social Media Platform
        </p>
      </footer>
    </div>
  );
}