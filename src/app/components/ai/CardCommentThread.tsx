/**
 * CardCommentThread
 * ─────────────────────────────────────────────────────────────────────────────
 * Per-card async comment thread for the ContentCardDetail modal.
 * Comments are fetched from / persisted to the KV-backed server route:
 *   GET  /content/comments?cardId=xxx
 *   POST /content/comments
 *   DELETE /content/comments/:id?cardId=xxx
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle, Send, Trash2, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHeaders';
import { useAuth } from '../AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardComment {
  id:          string;
  cardId:      string;
  text:        string;
  authorName:  string;
  authorEmail: string;
  createdAt:   string;
}

const API = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// Deterministic pastel hue from a string
function avatarHue(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue},55%,42%)`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CardCommentThreadProps {
  cardId: string;
}

export function CardCommentThread({ cardId }: CardCommentThreadProps) {
  const { user } = useAuth();
  const [open,     setOpen]     = useState(false);
  const [comments, setComments] = useState<CardComment[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [sending,  setSending]  = useState(false);
  const [text,     setText]     = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Load comments ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!cardId) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API}/content/comments?cardId=${encodeURIComponent(cardId)}`, { headers: await getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Load failed');
      setComments(data.comments ?? []);
    } catch (err: any) {
      console.error('[CardCommentThread] load:', err.message);
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length, open]);

  // ── Post comment ───────────────────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    setSending(true);
    try {
      const res  = await fetch(`${API}/content/comments`, {
        method:  'POST',
        headers: { ...(await getAuthHeaders()), 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          cardId,
          text:        trimmed,
          authorName:  `${user.firstName} ${user.lastName}`,
          authorEmail: user.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Post failed');
      setComments(prev => [...prev, data.comment]);
      setText('');
    } catch (err: any) {
      toast.error(`Comment failed: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // ── Delete comment ─────────────────────────────────────────────────────────
  const handleDelete = async (commentId: string) => {
    setDeleting(commentId);
    try {
      const res  = await fetch(
        `${API}/content/comments/${commentId}?cardId=${encodeURIComponent(cardId)}`,
        { method: 'DELETE', headers: await getAuthHeaders() },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Delete failed');
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const myName = user ? `${user.firstName} ${user.lastName}` : '';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Section toggle ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full text-white/50 hover:text-white/70 text-xs uppercase tracking-wider transition-colors py-2"
      >
        <span className="flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" />
          Comments
          {comments.length > 0 && !open && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#0BA4AA]/20 text-[#0BA4AA] text-[10px] font-bold border border-[#0BA4AA]/25">
              {comments.length}
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
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5 pb-1">

              {/* ── Comment list ── */}
              {loading ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
                  <span className="text-white/30 text-xs">Loading comments…</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-1.5">
                  <MessageCircle className="w-6 h-6 text-white/15" />
                  <p className="text-white/25 text-xs">No comments yet — be the first to leave feedback</p>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/8 rounded-xl overflow-hidden">
                  {comments.map((comment, i) => {
                    const isMe   = comment.authorName === myName;
                    const isLast = i === comments.length - 1;
                    return (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-start gap-3 px-4 py-3 group ${!isLast ? 'border-b border-white/6' : ''}`}
                      >
                        {/* Avatar */}
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5"
                          style={{ background: avatarHue(comment.authorName) }}
                        >
                          {initials(comment.authorName)}
                        </div>

                        {/* Body */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-white/80 text-xs font-semibold">
                              {comment.authorName}
                              {isMe && <span className="ml-1 text-[#0BA4AA] text-[9px] font-medium">(you)</span>}
                            </span>
                            <span className="text-white/25 text-[10px]">{fmtAgo(comment.createdAt)}</span>
                          </div>
                          <p className="text-white/60 text-[12px] leading-relaxed mt-0.5 break-words">
                            {comment.text}
                          </p>
                        </div>

                        {/* Delete (own comments) */}
                        {isMe && (
                          <button
                            onClick={() => handleDelete(comment.id)}
                            disabled={deleting === comment.id}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/15 text-white/25 hover:text-red-400 transition-all shrink-0 mt-0.5"
                            title="Delete comment"
                          >
                            {deleting === comment.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Trash2 className="w-3 h-3" />}
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}

              {/* ── Composer ── */}
              <div className="flex items-end gap-2">
                {/* My avatar */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mb-0.5"
                  style={{ background: avatarHue(myName) }}
                >
                  {initials(myName)}
                </div>

                {/* Input + send */}
                <div className="flex-1 flex items-end gap-2 bg-white/5 border border-white/10 focus-within:border-[#0BA4AA]/40 rounded-xl px-3 py-2 transition-colors">
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder="Leave a comment… (Enter to send, Shift+Enter for newline)"
                    rows={1}
                    className="flex-1 bg-transparent text-white/80 text-xs resize-none focus:outline-none placeholder:text-white/20 leading-relaxed min-h-[20px] max-h-24 overflow-y-auto"
                    style={{ fieldSizing: 'content' } as any}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all
                      bg-[#0BA4AA] hover:bg-[#0BA4AA]/80 text-white
                      disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Send comment"
                  >
                    {sending
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <p className="text-white/15 text-[10px] pl-9">
                Comments are visible to all team members with access to this card.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}