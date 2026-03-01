/**
 * ActivityFeedPage
 * ─────────────────────────────────────────────────────────────────────────────
 * Team Activity Feed — real-time collaboration visibility for the employee
 * portal. Shows a chronological timeline of all team actions: content creation,
 * edits, approvals, rejections, publishes, campaign generation, account
 * connections, user invitations, etc.
 *
 * Features:
 *   • Grouped by relative time period (Today, Yesterday, This Week, Earlier)
 *   • Filterable by action type, entity type, platform, team member
 *   • Auto-polls every 30 seconds for new activity
 *   • Rich event cards with avatars, action icons, platform badges
 *   • Load More pagination via cursor
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, RefreshCw, Search, Filter, ChevronDown,
  FileEdit, CheckCircle2, XCircle, Send, CalendarClock,
  Sparkles, Link2, Link2Off, UserPlus, UserCheck,
  MessageSquare, BarChart3, PenTool, Rocket, Clock,
  Instagram, Facebook, Linkedin, Youtube, Twitter,
} from 'lucide-react';
import { BackgroundLayout } from '../../components/BackgroundLayout';
import { EmployeeNav } from '../../components/EmployeeNav';
import {
  fetchActivityFeed,
  type ActivityEvent,
  type ActivityAction,
  type ActivityEntityType,
} from '../../utils/apiClient';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { employeeTheme } from '../../utils/employeeTheme';

// ─── Action metadata ──────────────────────────────────────────────────────────

interface ActionMeta {
  label: string;
  pastTense: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const ACTION_META: Record<ActivityAction, ActionMeta> = {
  content_created:      { label: 'Created',     pastTense: 'created',            icon: <PenTool className="w-4 h-4" />,        color: 'text-sky-400',     bgColor: 'bg-sky-500/15' },
  content_edited:       { label: 'Edited',      pastTense: 'edited',             icon: <FileEdit className="w-4 h-4" />,       color: 'text-violet-400',  bgColor: 'bg-violet-500/15' },
  content_approved:     { label: 'Approved',    pastTense: 'approved',           icon: <CheckCircle2 className="w-4 h-4" />,   color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  content_rejected:     { label: 'Rejected',    pastTense: 'rejected',           icon: <XCircle className="w-4 h-4" />,        color: 'text-red-400',     bgColor: 'bg-red-500/15' },
  content_published:    { label: 'Published',   pastTense: 'published',          icon: <Send className="w-4 h-4" />,           color: 'text-green-400',   bgColor: 'bg-green-500/15' },
  content_scheduled:    { label: 'Scheduled',   pastTense: 'scheduled',          icon: <CalendarClock className="w-4 h-4" />,  color: 'text-amber-400',   bgColor: 'bg-amber-500/15' },
  campaign_created:     { label: 'Campaign',    pastTense: 'created a campaign', icon: <Rocket className="w-4 h-4" />,         color: 'text-orange-400',  bgColor: 'bg-orange-500/15' },
  campaign_generated:   { label: 'AI Gen',      pastTense: 'generated content',  icon: <Sparkles className="w-4 h-4" />,       color: 'text-purple-400',  bgColor: 'bg-purple-500/15' },
  account_connected:    { label: 'Connected',   pastTense: 'connected',          icon: <Link2 className="w-4 h-4" />,          color: 'text-teal-400',    bgColor: 'bg-teal-500/15' },
  account_disconnected: { label: 'Disconnected', pastTense: 'disconnected',      icon: <Link2Off className="w-4 h-4" />,        color: 'text-gray-400',    bgColor: 'bg-gray-500/15' },
  user_invited:         { label: 'Invited',     pastTense: 'invited',            icon: <UserPlus className="w-4 h-4" />,       color: 'text-indigo-400',  bgColor: 'bg-indigo-500/15' },
  user_joined:          { label: 'Joined',      pastTense: 'joined the team',    icon: <UserCheck className="w-4 h-4" />,      color: 'text-cyan-400',    bgColor: 'bg-cyan-500/15' },
  comment_added:        { label: 'Comment',     pastTense: 'commented on',       icon: <MessageSquare className="w-4 h-4" />,  color: 'text-blue-400',    bgColor: 'bg-blue-500/15' },
  engagement_updated:   { label: 'Metrics',     pastTense: 'updated metrics for', icon: <BarChart3 className="w-4 h-4" />,     color: 'text-pink-400',    bgColor: 'bg-pink-500/15' },
};

// ─── Platform icons ───────────────────────────────────────────────────────────

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3.5 h-3.5" />,
  facebook:  <Facebook className="w-3.5 h-3.5" />,
  linkedin:  <Linkedin className="w-3.5 h-3.5" />,
  youtube:   <Youtube className="w-3.5 h-3.5" />,
  twitter:   <Twitter className="w-3.5 h-3.5" />,
  tiktok:    <span className="text-xs font-bold">TT</span>,
};

const PLATFORM_COLOR: Record<string, string> = {
  instagram: 'from-pink-500 to-purple-500',
  facebook:  'from-blue-500 to-blue-600',
  linkedin:  'from-sky-600 to-sky-700',
  youtube:   'from-red-500 to-red-600',
  twitter:   'from-gray-700 to-gray-800',
  tiktok:    'from-gray-800 to-gray-900',
};

// ─── Time helpers ─────────────────────────────────────────────────────────────

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

type TimeGroup = 'Today' | 'Yesterday' | 'This Week' | 'Earlier';

function getTimeGroup(ts: string): TimeGroup {
  const now = new Date();
  const date = new Date(ts);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  if (date >= startOfWeek) return 'This Week';
  return 'Earlier';
}

// ─── Avatar fallback ──────────────────────────────────────────────────────────

function UserAvatar({ name, avatar }: { name: string; avatar?: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  // Deterministic color from name
  const colors = [
    'from-teal-400 to-cyan-500',
    'from-violet-400 to-purple-500',
    'from-orange-400 to-red-500',
    'from-emerald-400 to-green-500',
    'from-sky-400 to-blue-500',
    'from-pink-400 to-rose-500',
    'from-amber-400 to-yellow-500',
  ];
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  if (avatar) {
    return (
      <img src={avatar} alt={name} className="w-9 h-9 rounded-full border-2 border-white/20 object-cover" />
    );
  }
  return (
    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center border-2 border-white/20 shadow-sm`}>
      <span className="text-white text-xs font-bold">{initials}</span>
    </div>
  );
}

// ── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event, index }: { event: ActivityEvent; index: number }) {
  const meta = ACTION_META[event.action];
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      className="group relative"
    >
      <div className={`flex gap-3 py-3 px-4 rounded-xl transition-all ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          <UserAvatar name={event.userName} avatar={event.userAvatar} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Main line */}
          <p className={`text-sm leading-relaxed ${et.textSm}`}>
            <span className={`font-semibold ${et.text}`}>{event.userName}</span>
            {' '}
            <span className={et.textMd}>{meta.pastTense}</span>
            {event.entityTitle && (
              <>
                {' '}
                <span className={`font-medium ${et.textSm}`}>{event.entityTitle}</span>
              </>
            )}
          </p>

          {/* Details */}
          {event.details && (
            <p className={`text-xs mt-0.5 leading-relaxed ${et.textFaint}`}>{event.details}</p>
          )}

          {/* Meta row: timestamp + badges */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[0.65rem] font-medium ${et.textFaint}`}>{relativeTime(event.timestamp)}</span>

            {/* Action badge */}
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[0.6rem] font-semibold ${meta.bgColor} ${meta.color}`}>
              {meta.icon}
              {meta.label}
            </span>

            {/* Platform badge */}
            {event.platform && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[0.6rem] font-semibold text-white bg-gradient-to-r ${PLATFORM_COLOR[event.platform] || 'from-gray-600 to-gray-700'}`}>
                {PLATFORM_ICON[event.platform]}
                {event.platform.charAt(0).toUpperCase() + event.platform.slice(1)}
              </span>
            )}

            {/* Role badge */}
            {event.userRole === 'TENANT_ADMIN' && (
              <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25">
                ADMIN
              </span>
            )}
          </div>
        </div>

        {/* Absolute time on hover */}
        <div className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[0.6rem] mt-1 text-right whitespace-nowrap ${et.textFaint}`}>
          {new Date(event.timestamp).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Filter Types ─────────────────────────────────────────────────────────────

type ActionFilter = ActivityAction | 'all';
type EntityFilter = ActivityEntityType | 'all';

// ─── Main Component ───────────────────────────────────────────────────────────

export function ActivityFeedPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const loadFeed = useCallback(async (append = false, before?: string) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const result = await fetchActivityFeed(50, before);

      if (append) {
        setEvents(prev => {
          const ids = new Set(prev.map(e => e.id));
          const newOnes = result.events.filter(e => !ids.has(e.id));
          return [...prev, ...newOnes];
        });
      } else {
        setEvents(result.events);
      }
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('[ActivityFeed] load error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
    // Poll every 30s
    pollRef.current = setInterval(() => loadFeed(), 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadFeed]);

  // ── Load more ─────────────────────────────────────────────────────────────
  const handleLoadMore = () => {
    if (events.length === 0 || loadingMore) return;
    const oldest = events[events.length - 1].timestamp;
    loadFeed(true, oldest);
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = events;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.userName.toLowerCase().includes(q) ||
        (e.entityTitle?.toLowerCase().includes(q)) ||
        (e.details?.toLowerCase().includes(q)) ||
        (e.platform?.toLowerCase().includes(q))
      );
    }
    if (actionFilter !== 'all') {
      result = result.filter(e => e.action === actionFilter);
    }
    if (entityFilter !== 'all') {
      result = result.filter(e => e.entityType === entityFilter);
    }
    return result;
  }, [events, searchQuery, actionFilter, entityFilter]);

  // ── Group by time period ──────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const groups: { label: TimeGroup; events: ActivityEvent[] }[] = [];
    const order: TimeGroup[] = ['Today', 'Yesterday', 'This Week', 'Earlier'];
    const map = new Map<TimeGroup, ActivityEvent[]>();
    for (const g of order) map.set(g, []);
    for (const e of filtered) {
      const group = getTimeGroup(e.timestamp);
      map.get(group)!.push(e);
    }
    for (const g of order) {
      const evts = map.get(g)!;
      if (evts.length > 0) groups.push({ label: g, events: evts });
    }
    return groups;
  }, [filtered]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const todayCount = useMemo(() => events.filter(e => getTimeGroup(e.timestamp) === 'Today').length, [events]);
  const uniqueMembers = useMemo(() => new Set(events.map(e => e.userId)).size, [events]);

  // ── Select classes ────────────────────────────────────────────────────────
  const selectCls = et.selectCls;

  return (
    <BackgroundLayout>
      <EmployeeNav />

      <div className="min-h-screen px-4 py-6 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-auto">

          {/* ── Header ───────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className={`text-2xl font-bold flex items-center gap-2.5 ${et.text}`}>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0BA4AA] to-[#3E3C70] flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  Team Activity
                </h1>
                <p className={`text-sm mt-1 ${et.textFaint}`}>
                  {todayCount} activities today · {uniqueMembers} team members active
                </p>
              </div>

              <button
                onClick={() => loadFeed()}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${isDark ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* ── Search + Filters ────────────────────────────────────── */}
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search activity…"
                    className={et.inputCls + ' pl-9'}
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    showFilters || actionFilter !== 'all' || entityFilter !== 'all'
                      ? 'bg-[#0BA4AA]/15 border-[#0BA4AA]/30 text-[#0BA4AA]'
                      : isDark ? 'bg-white/5 border-white/15 text-white/60 hover:text-white' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Filter row */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-3 flex-wrap pb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${et.textFaint}`}>Action</span>
                        <select value={actionFilter} onChange={e => setActionFilter(e.target.value as ActionFilter)} className={selectCls}>
                          <option value="all">All Actions</option>
                          {Object.entries(ACTION_META).map(([key, meta]) => (
                            <option key={key} value={key}>{meta.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[0.65rem] font-bold uppercase tracking-wider ${et.textFaint}`}>Type</span>
                        <select value={entityFilter} onChange={e => setEntityFilter(e.target.value as EntityFilter)} className={selectCls}>
                          <option value="all">All Types</option>
                          <option value="content">Content</option>
                          <option value="campaign">Campaign</option>
                          <option value="account">Account</option>
                          <option value="user">User</option>
                        </select>
                      </div>
                      {(actionFilter !== 'all' || entityFilter !== 'all') && (
                        <button
                          onClick={() => { setActionFilter('all'); setEntityFilter('all'); }}
                          className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ── Feed ──────────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className={`w-8 h-8 animate-spin ${et.textFaint}`} />
              <p className={`text-sm ${et.textFaint}`}>Loading activity…</p>
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-3"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <Activity className={`w-7 h-7 ${et.textFaint}`} />
              </div>
              <p className={`font-medium ${et.textMd}`}>No activity found</p>
              <p className={`text-sm ${et.textFaint}`}>
                {searchQuery || actionFilter !== 'all' || entityFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Activity will appear here as your team works'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {grouped.map(group => (
                <div key={group.label}>
                  {/* Time group header */}
                  <div className="flex items-center gap-3 mb-2 px-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className={`w-3 h-3 ${et.textFaint}`} />
                      <span className={`text-[0.65rem] font-bold uppercase tracking-widest ${et.textFaint}`}>
                        {group.label}
                      </span>
                    </div>
                    <div className={`flex-1 h-px ${isDark ? 'bg-white/8' : 'bg-gray-200'}`} />
                    <span className={`text-[0.6rem] font-medium ${et.textFaint}`}>{group.events.length}</span>
                  </div>

                  {/* Events */}
                  <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/8 bg-white/[0.02] divide-y divide-white/5' : 'border-gray-200 bg-white divide-y divide-gray-100 shadow-sm'}`}>
                    {group.events.map((event, i) => (
                      <EventCard key={event.id} event={event} index={i} />
                    ))}
                  </div>
                </div>
              ))}

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${isDark ? 'text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10' : 'text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm'}`}
                  >
                    {loadingMore ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    {loadingMore ? 'Loading…' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Auto-refresh indicator ────────────────────────────────── */}
          <div className="text-center mt-8 mb-4">
            <p className={`text-[0.6rem] font-medium ${et.textFaint}`}>
              Auto-refreshes every 30 seconds
            </p>
          </div>
        </div>
      </div>
    </BackgroundLayout>
  );
}