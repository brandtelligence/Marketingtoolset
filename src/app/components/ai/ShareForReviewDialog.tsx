/**
 * ShareForReviewDialog
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal that lets staff generate a client-facing review link for one or more
 * content cards. The link is tokenised, optionally expiring, and requires no
 * login from the recipient.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Share2, Link2, Copy, Check, Loader2, Clock, User, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHeaders';
import type { ContentCard } from '../../contexts/ContentContext';
import { useDashboardTheme } from '../saas/DashboardThemeContext';

const API  = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

const EXPIRY_OPTIONS = [
  { label: '3 days',  value: 3  },
  { label: '7 days',  value: 7  },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
];

interface ShareForReviewDialogProps {
  cards:    ContentCard[];      // 1-N cards to include in the review
  tenantId: string;
  onClose:  () => void;
}

export function ShareForReviewDialog({ cards, tenantId, onClose }: ShareForReviewDialogProps) {
  const { isDark } = useDashboardTheme();
  const [clientName,   setClientName]   = useState('');
  const [expiresInDays, setExpiresIn]  = useState(7);
  const [generating,   setGenerating]   = useState(false);
  const [reviewUrl,    setReviewUrl]    = useState('');
  const [copied,       setCopied]       = useState(false);

  const handleGenerate = async () => {
    if (!clientName.trim()) { toast.error('Please enter the client name'); return; }
    setGenerating(true);
    try {
      const res  = await fetch(`${API}/client-review/generate`, {
        method:  'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          cardIds:      cards.map(c => c.id),
          tenantId,
          clientName:   clientName.trim(),
          expiresInDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setReviewUrl(data.reviewUrl);
    } catch (err: any) {
      toast.error(`Failed to generate link: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      setCopied(true);
      toast.success('Review link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — please copy manually');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1,    opacity: 1, y: 0  }}
          exit={{    scale: 0.94, opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="relative w-full max-w-md rounded-2xl border border-white/15 shadow-2xl overflow-hidden"
          style={{ background: isDark ? 'rgba(12,10,40,0.97)' : 'rgba(255,255,255,0.98)', backdropFilter: 'blur(24px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0BA4AA]/15 border border-[#0BA4AA]/30 flex items-center justify-center">
                <Share2 className="w-4 h-4 text-[#0BA4AA]" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Share for Client Review</h3>
                <p className="text-white/40 text-[11px] mt-0.5">
                  {cards.length === 1
                    ? `1 card · "${cards[0].title}"`
                    : `${cards.length} cards`}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">

            {!reviewUrl ? (
              <>
                {/* Card preview pills */}
                {cards.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {cards.map(c => (
                      <span
                        key={c.id}
                        className="px-2 py-0.5 rounded-full bg-white/6 border border-white/10 text-white/50 text-[10px] truncate max-w-[140px]"
                        title={c.title}
                      >
                        {c.title}
                      </span>
                    ))}
                  </div>
                )}

                {/* Client name */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-white/50 text-xs font-medium">
                    <User className="w-3.5 h-3.5" />
                    Client / recipient name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleGenerate(); }}
                    placeholder="e.g. Acme Corp, John Smith"
                    className="w-full bg-white/6 border border-white/12 focus:border-[#0BA4AA]/50 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>

                {/* Expiry */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-white/50 text-xs font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    Link expires after
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {EXPIRY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setExpiresIn(opt.value)}
                        className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                          expiresInDays === opt.value
                            ? 'bg-[#0BA4AA]/20 border-[#0BA4AA]/50 text-[#0BA4AA]'
                            : 'bg-white/4 border-white/10 text-white/40 hover:text-white hover:bg-white/8'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info box */}
                <div className="bg-white/4 border border-white/8 rounded-xl px-4 py-3 text-[11px] text-white/40 space-y-1 leading-relaxed">
                  <p>✦ The link can be opened by anyone — no login required.</p>
                  <p>✦ Client decisions are recorded against each card for your review.</p>
                  <p>✦ The link stops working after the expiry period.</p>
                </div>

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={!clientName.trim() || generating}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all
                    bg-gradient-to-r from-[#0BA4AA] to-[#0BA4AA]/70 hover:from-[#0BA4AA]/90 hover:to-[#0BA4AA]/60
                    text-white shadow-lg shadow-[#0BA4AA]/20
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  {generating ? 'Generating…' : 'Generate Review Link'}
                </button>
              </>
            ) : (
              /* ── Success state ── */
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Success banner */}
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-400/25 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-emerald-300 text-xs font-bold">Review link created!</p>
                    <p className="text-emerald-400/60 text-[11px] mt-0.5">
                      For <span className="text-emerald-300/80">{clientName}</span> · expires in {expiresInDays} day{expiresInDays !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* URL box */}
                <div className="space-y-1.5">
                  <p className="text-white/40 text-[11px] font-medium">Shareable review link</p>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                    <Link2 className="w-3.5 h-3.5 text-[#0BA4AA] shrink-0" />
                    <span className="flex-1 text-white/70 text-[11px] font-mono truncate">{reviewUrl}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm border transition-all ${
                      copied
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                        : 'bg-[#0BA4AA]/15 border-[#0BA4AA]/35 text-[#0BA4AA] hover:bg-[#0BA4AA]/25'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <a
                    href={reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm border border-white/12 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    title="Preview review page"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Preview
                  </a>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-2 text-white/30 hover:text-white/60 text-xs transition-colors"
                >
                  Close
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}