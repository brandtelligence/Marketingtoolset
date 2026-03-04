/**
 * DashboardPage  —  /app/dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Employee landing page — at-a-glance overview of content pipeline,
 * upcoming scheduled posts, recent activity, and quick-action shortcuts.
 *
 * Sections:
 *   1. Welcome header + greeting
 *   2. KPI stat cards (Total Content, Pending Approval, Scheduled, Published)
 *   3. Quick Actions row
 *   4. Two-column layout:
 *      - Upcoming Scheduled Posts (next 7 days)
 *      - Recent Activity mini-feed
 *   5. Content Pipeline breakdown (status donut)
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, Send, CalendarDays, FolderKanban, Puzzle,
  TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle,
  FileText, ArrowRight, Activity, Eye, BarChart3,
  Zap, PenTool, Rocket, AlertTriangle, ChevronRight,
  Loader2, Columns3,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BackgroundLayout } from '../../components/BackgroundLayout';
import { EmployeeNav } from '../../components/EmployeeNav';
import { ProfileBanner } from '../../components/ProfileBanner';
import { useAuth } from '../../components/AuthContext';
import { useContent, type ContentCard, type ContentStatus } from '../../contexts/ContentContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { employeeTheme } from '../../utils/employeeTheme';
import { useSEO } from '../../hooks/useSEO';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function relativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; bgDark: string; bgLight: string }> = {
  draft:            { label: 'Draft',    color: '#94a3b8', bgDark: 'bg-gray-500/12',    bgLight: 'bg-gray-100' },
  pending_approval: { label: 'Pending',  color: '#F47A20', bgDark: 'bg-[#F47A20]/12',   bgLight: 'bg-orange-50' },
  approved:         { label: 'Approved', color: '#0BA4AA', bgDark: 'bg-[#0BA4AA]/12',   bgLight: 'bg-teal-50' },
  scheduled:        { label: 'Scheduled',color: '#a855f7', bgDark: 'bg-purple-500/12',  bgLight: 'bg-purple-50' },
  published:        { label: 'Published',color: '#22c55e', bgDark: 'bg-green-500/12',   bgLight: 'bg-green-50' },
  rejected:         { label: 'Rejected', color: '#ef4444', bgDark: 'bg-red-500/12',     bgLight: 'bg-red-50' },
};

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '📘', twitter: '🐦', linkedin: '💼',
  tiktok: '🎵', youtube: '📺', general: '📄', whatsapp: '💬', telegram: '✈️',
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, accent, subtitle, isDark,
}: {
  label: string; value: number | string; icon: React.ReactNode;
  accent: string; subtitle?: string; isDark: boolean;
}) {
  const et = employeeTheme(isDark);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`${et.glass} p-5 flex items-start gap-4`}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${accent}18` }}
      >
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-2xl font-bold tabular-nums ${et.text}`}>{value}</p>
        <p className={`text-xs font-medium ${et.textMd} mt-0.5`}>{label}</p>
        {subtitle && (
          <p className={`text-[10px] ${et.textFaint} mt-1`}>{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Quick Action Button ──────────────────────────────────────────────────────

function QuickAction({
  label, description, icon, accent, onClick, isDark,
}: {
  label: string; description: string; icon: React.ReactNode;
  accent: string; onClick: () => void; isDark: boolean;
}) {
  const et = employeeTheme(isDark);
  return (
    <button
      onClick={onClick}
      className={`${et.glass} p-4 text-left transition-all group ${et.hover} cursor-pointer w-full`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
          style={{ background: `${accent}15` }}
        >
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${et.text}`}>{label}</p>
          <p className={`text-[11px] ${et.textFaint} truncate`}>{description}</p>
        </div>
        <ChevronRight className={`w-4 h-4 ${et.textFaint} transition-transform group-hover:translate-x-1`} />
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth();
  const { cards, recentEvents } = useContent();
  const { projects } = useProjects();
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);
  const navigate = useNavigate();

  useSEO({
    title: 'Dashboard',
    description: 'Your content pipeline at a glance — stats, upcoming posts, and quick actions.',
    noindex: true,
  });

  // ── Derived KPIs ───────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total     = cards.length;
    const pending   = cards.filter(c => c.status === 'pending_approval').length;
    const scheduled = cards.filter(c => c.status === 'scheduled').length;
    const published = cards.filter(c => c.status === 'published').length;
    const drafts    = cards.filter(c => c.status === 'draft').length;
    const approved  = cards.filter(c => c.status === 'approved').length;
    const rejected  = cards.filter(c => c.status === 'rejected').length;

    return { total, pending, scheduled, published, drafts, approved, rejected };
  }, [cards]);

  // ── Upcoming scheduled posts (next 7 days) ────────────────────────────────

  const upcomingPosts = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);
    return cards
      .filter(c => c.status === 'scheduled' && c.scheduledDate)
      .filter(c => {
        const d = new Date(c.scheduledDate!);
        return d >= now && d <= weekFromNow;
      })
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
      .slice(0, 6);
  }, [cards]);

  // ── Pipeline donut data ────────────────────────────────────────────────────

  const pipelineData = useMemo(() => {
    const statuses: ContentStatus[] = ['draft', 'pending_approval', 'approved', 'scheduled', 'published', 'rejected'];
    return statuses
      .map(s => ({ name: STATUS_CONFIG[s].label, value: cards.filter(c => c.status === s).length, color: STATUS_CONFIG[s].color }))
      .filter(d => d.value > 0);
  }, [cards]);

  // ── Recent activity (last 8 events) ────────────────────────────────────────

  const recentActivity = useMemo(() =>
    recentEvents.slice(0, 8),
  [recentEvents]);

  const fmtAgo = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const activityIcon = (action: string) => {
    switch (action) {
      case 'approved':               return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'rejected':               return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case 'published':              return <Send className="w-3.5 h-3.5 text-green-400" />;
      case 'submitted_for_approval': return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      default:                       return <Activity className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const actionLabel = (action: string) => {
    switch (action) {
      case 'approved':               return 'approved';
      case 'rejected':               return 'rejected';
      case 'published':              return 'published';
      case 'submitted_for_approval': return 'submitted for review';
      case 'reverted_to_draft':      return 'reverted to draft';
      default:                       return action.replace(/_/g, ' ');
    }
  };

  return (
    <BackgroundLayout>
      <EmployeeNav />
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">
        <ProfileBanner />

        {/* ── KPI Stats ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Content"
            value={stats.total}
            icon={<FileText className="w-5 h-5" />}
            accent="#0BA4AA"
            subtitle={`${stats.drafts} draft${stats.drafts !== 1 ? 's' : ''}`}
            isDark={isDark}
          />
          <StatCard
            label="Pending Approval"
            value={stats.pending}
            icon={<Clock className="w-5 h-5" />}
            accent="#F47A20"
            subtitle={stats.pending > 0 ? 'Needs attention' : 'All clear'}
            isDark={isDark}
          />
          <StatCard
            label="Scheduled"
            value={stats.scheduled}
            icon={<CalendarDays className="w-5 h-5" />}
            accent="#a855f7"
            subtitle={`${upcomingPosts.length} this week`}
            isDark={isDark}
          />
          <StatCard
            label="Published"
            value={stats.published}
            icon={<CheckCircle2 className="w-5 h-5" />}
            accent="#22c55e"
            subtitle={stats.rejected > 0 ? `${stats.rejected} rejected` : 'Great progress!'}
            isDark={isDark}
          />
        </div>

        {/* ── Quick Actions ──────────────────────────────────────────────── */}
        <div>
          <h2 className={`text-sm font-semibold ${et.textMd} mb-3 flex items-center gap-2`}>
            <Zap className="w-4 h-4" style={{ color: '#F47A20' }} />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <QuickAction
              label="Create Content"
              description="AI Studio wizard"
              icon={<Sparkles className="w-4.5 h-4.5" />}
              accent="#0BA4AA"
              onClick={() => navigate('/app/content')}
              isDark={isDark}
            />
            <QuickAction
              label="Plan Campaign"
              description="Calendar planner"
              icon={<Rocket className="w-4.5 h-4.5" />}
              accent="#a855f7"
              onClick={() => navigate('/app/campaign')}
              isDark={isDark}
            />
            <QuickAction
              label="Publish Hub"
              description="Social publishing"
              icon={<Send className="w-4.5 h-4.5" />}
              accent="#F47A20"
              onClick={() => navigate('/app/publish')}
              isDark={isDark}
            />
            <QuickAction
              label="Content Board"
              description="Kanban overview"
              icon={<Columns3 className="w-4.5 h-4.5" />}
              accent="#6366f1"
              onClick={() => navigate('/app/board')}
              isDark={isDark}
            />
          </div>
        </div>

        {/* ── Two-column: Upcoming + Activity ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Upcoming Scheduled Posts ──────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`${et.glass} p-5`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" style={{ color: '#a855f7' }} />
                <h3 className={`text-sm font-semibold ${et.text}`}>Upcoming Posts</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-purple-500/12 text-purple-400 border border-purple-500/25' : 'bg-purple-50 text-purple-600 border border-purple-200'}`}>
                  Next 7 days
                </span>
              </div>
              <button
                onClick={() => navigate('/app/campaign')}
                className={`text-[11px] ${et.textFaint} hover:text-[#0BA4AA] transition-colors flex items-center gap-1`}
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {upcomingPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-100 border border-gray-200'}`}>
                  <CalendarDays className={`w-5 h-5 ${et.textFaint}`} />
                </div>
                <p className={`text-sm font-medium ${et.textMd}`}>No upcoming posts</p>
                <p className={`text-xs text-center ${et.textFaint}`}>Schedule content in the Campaign Planner to see it here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingPosts.map((card, i) => {
                  const project = projects.find(p => p.id === card.projectId);
                  const emoji = PLATFORM_EMOJI[card.platform] ?? '📄';
                  return (
                    <div
                      key={card.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} ${i < upcomingPosts.length - 1 ? `border-b ${et.border}` : ''}`}
                    >
                      <span className="text-lg shrink-0">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${et.text}`}>{card.title}</p>
                        <p className={`text-[10px] ${et.textFaint} truncate`}>
                          {project?.name ?? 'Unknown project'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[11px] font-medium ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                          {relativeDate(card.scheduledDate!)}
                        </p>
                        {card.scheduledTime && (
                          <p className={`text-[10px] ${et.textFaint}`}>{card.scheduledTime}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* ── Recent Activity ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className={`${et.glass} p-5`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: '#0BA4AA' }} />
                <h3 className={`text-sm font-semibold ${et.text}`}>Recent Activity</h3>
              </div>
              <button
                onClick={() => navigate('/app/activity')}
                className={`text-[11px] ${et.textFaint} hover:text-[#0BA4AA] transition-colors flex items-center gap-1`}
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-100 border border-gray-200'}`}>
                  <Activity className={`w-5 h-5 ${et.textFaint}`} />
                </div>
                <p className={`text-sm font-medium ${et.textMd}`}>No recent activity</p>
                <p className={`text-xs text-center ${et.textFaint}`}>Content events will appear here as your team works.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentActivity.map((event, i) => (
                  <div
                    key={`${event.cardId}-${event.timestamp}-${i}`}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                  >
                    <div className="mt-0.5 shrink-0">{activityIcon(event.action)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${et.text}`}>
                        <span className="font-semibold">{event.performedBy}</span>{' '}
                        <span className={et.textMd}>{actionLabel(event.action)}</span>{' '}
                        <span className="font-medium">{event.cardTitle}</span>
                      </p>
                      <p className={`text-[10px] ${et.textFaint} mt-0.5`}>
                        {fmtAgo(event.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Content Pipeline Breakdown ──────────────────────────────────── */}
        {stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`${et.glass} p-5`}
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4" style={{ color: '#0BA4AA' }} />
              <h3 className={`text-sm font-semibold ${et.text}`}>Content Pipeline</h3>
              <span className={`text-[10px] ${et.textFaint}`}>
                {stats.total} total cards across {projects.length} project{projects.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Donut Chart */}
              <div className="w-48 h-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pipelineData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pipelineData.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? 'rgba(10,8,35,0.95)' : '#fff',
                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
                        borderRadius: 12,
                        color: isDark ? '#fff' : '#111',
                        fontSize: 12,
                      }}
                      formatter={(value: number, name: string) => [`${value} cards`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
                {pipelineData.map(item => (
                  <div
                    key={item.name}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <p className={`text-xs font-semibold ${et.text} tabular-nums`}>{item.value}</p>
                      <p className={`text-[10px] ${et.textFaint}`}>{item.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Overdue / attention alerts */}
            {stats.pending > 3 && (
              <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${isDark ? 'bg-[#F47A20]/8 text-[#F47A20] border border-[#F47A20]/20' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <strong>{stats.pending} cards</strong> are pending approval — consider reviewing to keep the pipeline flowing.
                </span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </BackgroundLayout>
  );
}