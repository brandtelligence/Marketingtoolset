/**
 * EmployeeNav
 * ─────────────────────────────────────────────────────────────────────────────
 * Glassmorphism top navigation bar for the employee portal (/app/*).
 *
 * Links:
 *   📂 Projects  →  /app/projects
 *   ✨ AI Studio  →  /app/content
 *   🧩 Modules   →  /app/modules
 *   👤 Profile   →  /app/profile
 *
 * Approval Bell:
 *   Shows a live badge count of pending_approval content cards.
 *   Opens a mini dropdown listing each card with a deep-link to its project.
 *   Re-derives in real time whenever ContentContext.cards changes.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderKanban, Puzzle, UserCircle, LogOut, Sparkles,
  Bell, X, ExternalLink, CheckCheck, Send, Activity,
  CheckCircle, XCircle, Check, Clock, AlertTriangle,
  RotateCw, Loader2, CalendarDays,
} from 'lucide-react';
import brandLogo from 'figma:asset/250842c5232a8611aa522e6a3530258e858657d5.png';
import { useAuth } from './AuthContext';
import { useContent } from '../contexts/ContentContext';
import { useProjects } from '../contexts/ProjectsContext';
import { toast } from 'sonner';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../utils/authHeaders';

// ─── Platform icon map ────────────────────────────────────────────────────────

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '📘', twitter: '🐦', linkedin: '💼',
  tiktok: '🎵', youtube: '📺', general: '📄',
};

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { path: '/app/projects',  label: 'Projects',    icon: <FolderKanban className="w-4 h-4" /> },
  { path: '/app/content',   label: 'AI Studio',   icon: <Sparkles className="w-4 h-4" /> },
  { path: '/app/campaign',  label: 'Campaign',    icon: <CalendarDays className="w-4 h-4" /> },
  { path: '/app/publish',   label: 'Publish Hub', icon: <Send className="w-4 h-4" /> },
  { path: '/app/modules',   label: 'My Modules',  icon: <Puzzle className="w-4 h-4" /> },
  { path: '/app/profile',   label: 'My Profile',  icon: <UserCircle className="w-4 h-4" /> },
];

// ─── Action colour map ────────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  approved:                { label: 'Approved',        color: 'text-teal-300',   Icon: CheckCircle },
  rejected:                { label: 'Rejected',        color: 'text-red-300',    Icon: XCircle    },
  published:               { label: 'Published',       color: 'text-green-300',  Icon: Check      },
  submitted_for_approval:  { label: 'Submitted',       color: 'text-amber-300',  Icon: Clock      },
  reverted_to_draft:       { label: 'Reverted',        color: 'text-gray-300',   Icon: Activity   },
};

// ─── Failure alert type (mirrors server AutoPublishAlert) ─────────────────────

interface FailureAlert {
  cardId:    string;
  cardTitle: string;
  platform:  string;
  failedAt:  string;
  error:     string;
  attempts:  number;
}

const BELL_API  = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;


const PLATFORM_SHORT: Record<string, string> = {
  instagram: 'IG', facebook: 'FB', twitter: 'X', linkedin: 'LI',
  tiktok: 'TK', youtube: 'YT', pinterest: 'PI', snapchat: 'SC',
  threads: 'TH', reddit: 'RD', whatsapp: 'WA', telegram: 'TG',
};

// ─── ApprovalBell sub-component ───────────────────────────────────────────────

function ApprovalBell() {
  const { cards, recentEvents } = useContent();
  const { projects }            = useProjects();
  const { user }                = useAuth();
  const navigate                = useNavigate();
  const [open, setOpen]         = useState(false);
  const [tab, setTab]           = useState<'queue' | 'activity' | 'failures'>('queue');
  const ref                     = useRef<HTMLDivElement>(null);

  // ── Approval queue ──────────────────────────────────────────────────────────
  const pendingCards = cards.filter(c => c.status === 'pending_approval');
  const count        = pendingCards.length;

  // ── Activity feed ───────────────────────────────────────────────────────────
  const [lastSeen, setLastSeen] = useState<number>(Date.now());
  const newActivity = recentEvents.filter(e => new Date(e.timestamp).getTime() > lastSeen).length;

  // ── Failure alerts ──────────────────────────────────────────────────────────
  const [failures,        setFailures]        = useState<FailureAlert[]>([]);
  const [failuresLoading, setFailuresLoading] = useState(false);
  const [retrying,        setRetrying]        = useState<Set<string>>(new Set());

  const fetchFailures = useCallback(async () => {
    if (!user?.tenantId) return;
    setFailuresLoading(true);
    try {
      const res  = await fetch(`${BELL_API}/content/autopublish-alerts?tenantId=${encodeURIComponent(user.tenantId)}`, { headers: await getAuthHeaders() });
      const data = await res.json();
      if (res.ok) setFailures(data.alerts ?? []);
    } catch (e) {
      console.error('[ApprovalBell] fetch failures:', e);
    } finally {
      setFailuresLoading(false);
    }
  }, [user?.tenantId]);

  // Fetch on mount and whenever the failures tab is opened
  useEffect(() => { fetchFailures(); }, [fetchFailures]);
  useEffect(() => { if (open && tab === 'failures') fetchFailures(); }, [open, tab]); // eslint-disable-line

  const handleRetryFromBell = async (cardId: string, cardTitle: string) => {
    if (!user?.tenantId) return;
    setRetrying(prev => new Set(prev).add(cardId));
    try {
      const res = await fetch(
        `${BELL_API}/content/autopublish-alerts/${cardId}/retry?tenantId=${encodeURIComponent(user.tenantId)}`,
        { method: 'POST', headers: await getAuthHeaders() }
      );
      if (!res.ok) throw new Error((await res.json()).error ?? 'Retry failed');
      setFailures(prev => prev.filter(f => f.cardId !== cardId));
      toast.success(`"${cardTitle}" re-queued — cron retries within 1 minute`);
    } catch (e) {
      console.error('[ApprovalBell] retry error:', e);
      toast.error('Retry failed — please try again');
    } finally {
      setRetrying(prev => { const s = new Set(prev); s.delete(cardId); return s; });
    }
  };

  const failureCount = failures.length;
  const totalBadge   = count + newActivity + failureCount;
  const hasDanger    = failureCount > 0;

  // Mark activity as seen when opening the activity tab
  useEffect(() => {
    if (open && tab === 'activity') setLastSeen(Date.now());
  }, [open, tab]);

  const fmtFailureAge = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (m < 1)   return 'just now';
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const goToProject = (projectSlug: string) => {
    setOpen(false);
    navigate(`/app/projects/${projectSlug}`);
  };

  const fmtAgo = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        title={
          hasDanger
            ? `${failureCount} publish failure${failureCount !== 1 ? 's' : ''} · ${count} pending · ${newActivity} new activity`
            : totalBadge > 0 ? `${count} pending · ${newActivity} new activity` : 'Notifications'
        }
        className={`relative p-2 rounded-lg transition-all ${
          open
            ? hasDanger ? 'bg-red-500/15 text-red-400' : 'bg-[#F47A20]/15 text-[#F47A20]'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
      >
        <Bell className="w-4 h-4" />

        {/* Primary badge — red when failures exist, orange otherwise */}
        <AnimatePresence>
          {totalBadge > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full text-white text-[0.55rem] font-bold leading-none ${
                hasDanger ? 'bg-red-500' : 'bg-[#F47A20]'
              }`}
            >
              {totalBadge > 9 ? '9+' : totalBadge}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-white/15 shadow-2xl z-50 overflow-hidden"
            style={{ background: 'rgba(10,8,35,0.97)', backdropFilter: 'blur(20px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#F47A20]" />
                <span className="text-white font-semibold text-sm">Notifications</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/8">
              <button
                onClick={() => setTab('queue')}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                  tab === 'queue' ? 'text-[#F47A20] border-b-2 border-[#F47A20]' : 'text-white/40 hover:text-white/60'
                }`}
              >
                <Clock className="w-3 h-3" />
                Queue
                {count > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#F47A20] text-white text-[0.6rem] font-bold rounded-full">{count}</span>
                )}
              </button>
              <button
                onClick={() => { setTab('activity'); setLastSeen(Date.now()); }}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                  tab === 'activity' ? 'text-[#0BA4AA] border-b-2 border-[#0BA4AA]' : 'text-white/40 hover:text-white/60'
                }`}
              >
                <Activity className="w-3 h-3" />
                Activity
                {newActivity > 0 && tab !== 'activity' && (
                  <span className="px-1.5 py-0.5 bg-[#0BA4AA] text-white text-[0.6rem] font-bold rounded-full">{newActivity}</span>
                )}
              </button>
              <button
                onClick={() => setTab('failures')}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                  tab === 'failures' ? 'text-red-400 border-b-2 border-red-400' : 'text-white/40 hover:text-white/60'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                Failures
                {failureCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-[0.6rem] font-bold rounded-full">{failureCount}</span>
                )}
              </button>
            </div>

            {/* ── Queue tab ── */}
            {tab === 'queue' && (
              <div className="max-h-72 overflow-y-auto">
                {count === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 gap-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-white/60 text-sm font-medium">All caught up!</p>
                    <p className="text-white/30 text-xs text-center">No content cards are currently waiting for approval.</p>
                  </div>
                ) : (
                  pendingCards.slice(0, 8).map((card, i) => {
                    const project  = projects.find(p => p.id === card.projectId);
                    const slug     = project?.route.split('/').pop() ?? '';
                    const emoji    = PLATFORM_EMOJI[card.platform] ?? '📄';
                    const isLast   = i === Math.min(pendingCards.length, 8) - 1;

                    return (
                      <button
                        key={card.id}
                        onClick={() => goToProject(slug)}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors group ${!isLast ? 'border-b border-white/6' : ''}`}
                      >
                        <span className="text-base shrink-0 mt-0.5 leading-none">{emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/90 text-xs font-semibold truncate leading-snug">{card.title}</p>
                          <p className="text-white/40 text-[11px] truncate mt-0.5">
                            {project?.name ?? 'Unknown project'}
                            {card.createdBy ? ` · by ${card.createdBy}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F47A20]/15 text-[#F47A20] border border-[#F47A20]/25">
                            Pending
                          </span>
                          <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/60 transition-colors" />
                        </div>
                      </button>
                    );
                  })
                )}

                {pendingCards.length > 8 && (
                  <div className="px-4 py-2 border-t border-white/8 text-center">
                    <span className="text-white/30 text-[11px]">
                      +{pendingCards.length - 8} more card{pendingCards.length - 8 !== 1 ? 's' : ''} not shown
                    </span>
                  </div>
                )}

                {count > 0 && (
                  <div className="px-4 py-2.5 border-t border-white/8">
                    <button
                      onClick={() => { setOpen(false); navigate('/app/projects'); }}
                      className="w-full text-center text-xs text-[#0BA4AA] hover:text-[#0BA4AA]/80 transition-colors py-0.5"
                    >
                      View all projects →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Activity tab ── */}
            {tab === 'activity' && (
              <div className="max-h-72 overflow-y-auto">
                {recentEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 gap-2">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-white/25" />
                    </div>
                    <p className="text-white/60 text-sm font-medium">No recent activity</p>
                    <p className="text-white/30 text-xs text-center">Approval decisions and publish events will appear here.</p>
                  </div>
                ) : (
                  recentEvents.slice(0, 12).map((event, i) => {
                    const meta   = ACTION_META[event.action] ?? { label: event.action, color: 'text-white/40', Icon: Activity };
                    const isLast = i === Math.min(recentEvents.length, 12) - 1;
                    return (
                      <div
                        key={event.id}
                        className={`flex items-start gap-3 px-4 py-3 ${!isLast ? 'border-b border-white/6' : ''}`}
                      >
                        <div className="w-6 h-6 rounded-full bg-white/6 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                          <meta.Icon className={`w-3 h-3 ${meta.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/80 text-xs font-semibold truncate leading-snug">{event.cardTitle}</p>
                          <p className={`text-[10px] mt-0.5 ${meta.color}`}>
                            {meta.label} by {event.performedBy}
                            {event.reason ? ` — "${event.reason}"` : ''}
                          </p>
                          <p className="text-white/25 text-[10px] mt-0.5">{fmtAgo(event.timestamp)}</p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/6 text-white/30 border border-white/8 capitalize shrink-0 mt-0.5">
                          {PLATFORM_EMOJI[event.platform] ?? '📄'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── Failures tab ── */}
            {tab === 'failures' && (
              <div className="max-h-72 overflow-y-auto">
                {failuresLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white/30" />
                    <span className="text-white/30 text-xs">Loading failures…</span>
                  </div>
                ) : failureCount === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 gap-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-white/60 text-sm font-medium">No publish failures</p>
                    <p className="text-white/30 text-xs text-center">All scheduled auto-publishes are running normally.</p>
                  </div>
                ) : (
                  <>
                    {failures.map((f, i) => {
                      const isLast = i === failures.length - 1;
                      return (
                        <div
                          key={f.cardId}
                          className={`flex items-start gap-3 px-4 py-3 group hover:bg-red-500/4 transition-colors ${!isLast ? 'border-b border-white/6' : ''}`}
                        >
                          {/* Icon */}
                          <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-400/20 flex items-center justify-center shrink-0 mt-0.5">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-white/80 text-[11px] font-semibold truncate leading-snug max-w-[140px]">
                                {f.cardTitle}
                              </p>
                              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-400/20">
                                {PLATFORM_SHORT[f.platform] ?? f.platform.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-red-300/50 text-[10px] truncate mt-0.5 leading-snug">
                              {f.error}
                            </p>
                            <p className="text-white/20 text-[10px] mt-0.5">{fmtFailureAge(f.failedAt)} · {f.attempts} attempt{f.attempts !== 1 ? 's' : ''}</p>

                            {/* Inline actions */}
                            <div className="flex items-center gap-1.5 mt-2">
                              <button
                                onClick={() => handleRetryFromBell(f.cardId, f.cardTitle)}
                                disabled={retrying.has(f.cardId)}
                                className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300/80 hover:text-emerald-200 px-2 py-0.5 rounded-md bg-emerald-500/8 hover:bg-emerald-500/15 border border-emerald-400/20 transition-all disabled:opacity-40"
                              >
                                {retrying.has(f.cardId)
                                  ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  : <RotateCw className="w-2.5 h-2.5" />
                                }
                                Retry
                              </button>
                              <button
                                onClick={() => { setOpen(false); navigate('/app/content'); }}
                                className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                View
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-white/8 text-center">
                      <button
                        onClick={() => { setOpen(false); navigate('/app/content'); }}
                        className="w-full text-center text-xs text-red-300/60 hover:text-red-200 transition-colors py-0.5"
                      >
                        Open Content Board →
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main EmployeeNav component ───────────────────────────────────────────────

export function EmployeeNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login');
  };

  const linkCls = (isActive: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-white/20 text-white border border-white/30'
        : 'text-white/70 hover:text-white hover:bg-white/10'
    }`;

  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-40 w-full"
    >
      <div
        className="backdrop-blur-xl border-b border-white/15 px-4 py-2.5"
        style={{ background: 'rgba(11,164,170,0.08)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          {/* Logo */}
          <img src={brandLogo} alt="Brandtelligence" className="h-6 w-auto shrink-0" />

          {/* Divider */}
          <div className="w-px h-5 bg-white/20 shrink-0" />

          {/* Nav links */}
          <div className="flex items-center gap-1 flex-1">
            {NAV_ITEMS.map(item => (
              <NavLink key={item.path} to={item.path}>
                {({ isActive }) => (
                  <span className={linkCls(isActive)}>
                    {item.icon}
                    <span className="hidden sm:inline">{item.label}</span>
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          {/* Right: approval bell + user avatar + sign out */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Approval bell */}
            <ApprovalBell />

            {/* Divider */}
            <div className="w-px h-5 bg-white/15 hidden sm:block" />

            {/* Avatar + name */}
            <div className="hidden sm:flex items-center gap-2">
              <img
                src={user.profileImage}
                alt={user.firstName}
                className="w-7 h-7 rounded-full border border-white/30 object-cover"
              />
              <span className="text-white/80 text-sm font-medium">{user.firstName}</span>
            </div>

            {/* Sign out */}
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}