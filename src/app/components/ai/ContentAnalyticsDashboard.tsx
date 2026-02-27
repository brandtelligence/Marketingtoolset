import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp, CheckCircle, Clock,
  FileText, CalendarDays, Check, XCircle,
  Heart, MessageCircle, Repeat2, Eye, Timer,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  SiInstagram, SiFacebook, SiX, SiLinkedin, SiTiktok,
  SiYoutube, SiPinterest, SiSnapchat, SiThreads, SiReddit, SiWhatsapp,
  SiTelegram,
} from 'react-icons/si';
import { type ContentCard, type ContentStatus } from '../../contexts/ContentContext';
import { getSlaStatusWith, SLA_BREACH_HOURS, SLA_WARNING_HOURS } from '../../utils/sla';
import { useAuth } from '../AuthContext';
import { useSlaConfig } from '../../hooks/useSlaConfig';

// ─── Platform metadata ────────────────────────────────────────────────────────

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: SiInstagram, facebook: SiFacebook, twitter: SiX,
  linkedin: SiLinkedin, tiktok: SiTiktok, youtube: SiYoutube,
  pinterest: SiPinterest, snapchat: SiSnapchat, threads: SiThreads,
  reddit: SiReddit, whatsapp: SiWhatsapp, telegram: SiTelegram,
};

const platformNames: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', twitter: 'X (Twitter)',
  linkedin: 'LinkedIn', tiktok: 'TikTok', youtube: 'YouTube',
  pinterest: 'Pinterest', snapchat: 'Snapchat', threads: 'Threads',
  reddit: 'Reddit', whatsapp: 'WhatsApp', telegram: 'Telegram',
};

const platformTailwindColors: Record<string, string> = {
  instagram: 'bg-pink-500',
  facebook:  'bg-blue-600',
  twitter:   'bg-sky-400',
  linkedin:  'bg-blue-500',
  tiktok:    'bg-cyan-400',
  youtube:   'bg-red-500',
  pinterest: 'bg-red-500',
  snapchat:  'bg-yellow-300',
  threads:   'bg-gray-200',
  reddit:    'bg-orange-500',
  whatsapp:  'bg-green-400',
  telegram:  'bg-sky-500',
};

const platformIconColors: Record<string, string> = {
  instagram: 'text-pink-400', facebook: 'text-blue-500', twitter: 'text-sky-300',
  linkedin: 'text-blue-400', tiktok: 'text-cyan-400', youtube: 'text-red-500',
  pinterest: 'text-red-400', snapchat: 'text-yellow-300', threads: 'text-gray-200',
  reddit: 'text-orange-500', whatsapp: 'text-green-400', telegram: 'text-sky-400',
};

// ─── Status metadata ──────────────────────────────────────────────────────────

const statusMeta: Record<ContentStatus, {
  label: string;
  hex: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}> = {
  draft:            { label: 'Draft',    hex: '#6b7280', icon: FileText,    iconColor: 'text-gray-400'  },
  pending_approval: { label: 'Pending',  hex: '#f59e0b', icon: Clock,       iconColor: 'text-amber-400' },
  approved:         { label: 'Approved', hex: '#14b8a6', icon: CheckCircle, iconColor: 'text-teal-400'  },
  scheduled:        { label: 'Scheduled',hex: '#3b82f6', icon: CalendarDays,iconColor: 'text-blue-400'  },
  published:        { label: 'Published',hex: '#22c55e', icon: Check,       iconColor: 'text-green-400' },
  rejected:         { label: 'Rejected', hex: '#ef4444', icon: XCircle,     iconColor: 'text-red-400'   },
};

const STATUS_ORDER: ContentStatus[] = [
  'published', 'scheduled', 'approved', 'pending_approval', 'draft', 'rejected',
];

// ─── Custom recharts tooltip ──────────────────────────────────────────────────

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value, percent } = payload[0];
  return (
    <div
      className="px-3 py-2 rounded-xl border border-white/15 text-xs shadow-2xl"
      style={{ background: 'rgba(15,10,40,0.95)', backdropFilter: 'blur(12px)' }}
    >
      <p className="text-white font-semibold">{name}</p>
      <p className="text-white/60 mt-0.5">{value} cards · {(percent * 100).toFixed(1)}%</p>
    </div>
  );
}

// ─── Engagement bar tooltip ───────────────────────────────────────────────────

function EngagementTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2.5 rounded-xl border border-white/15 text-xs shadow-2xl space-y-1"
      style={{ background: 'rgba(15,10,40,0.95)', backdropFilter: 'blur(12px)' }}
    >
      <p className="text-white font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-white/60">{p.name}:</span>
          <span className="text-white font-semibold">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  accentClass,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub: string;
  accentClass: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2"
    >
      <div className={`w-8 h-8 rounded-lg ${accentClass} flex items-center justify-center`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-white font-bold text-2xl leading-none tracking-tight">{value}</p>
        <p className="text-white/40 text-[10px] mt-1.5 leading-snug">{sub}</p>
      </div>
      <p className="text-white/50 text-xs font-medium mt-auto">{label}</p>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ContentAnalyticsDashboardProps {
  cards: ContentCard[];
}

export function ContentAnalyticsDashboard({ cards }: ContentAnalyticsDashboardProps) {

  // ── Per-tenant SLA thresholds ─────────────────────────────────────────────
  const { user } = useAuth();
  const { warningHours, breachHours } = useSlaConfig(user?.tenantId ?? undefined);

  // ── KPI derivations ──────────────────────────────────────────────────────
  const totalCards = cards.length;

  const { approvalRate, decisionedCount } = useMemo(() => {
    const decisioned  = cards.filter(c => ['approved','scheduled','published','rejected'].includes(c.status));
    const approved    = cards.filter(c => ['approved','scheduled','published'].includes(c.status));
    return {
      approvalRate:    decisioned.length > 0 ? (approved.length / decisioned.length) * 100 : null,
      decisionedCount: decisioned.length,
    };
  }, [cards]);

  const avgTurnaround = useMemo(() => {
    const approvedWithDates = cards.filter(c => c.approvedAt && c.createdAt);
    if (!approvedWithDates.length) return null;
    const avgMs = approvedWithDates.reduce((sum, c) =>
      sum + (c.approvedAt!.getTime() - c.createdAt.getTime()), 0
    ) / approvedWithDates.length;
    const hours = avgMs / (1000 * 60 * 60);
    if (hours < 1)  return '< 1 hr';
    if (hours < 24) return `${hours.toFixed(1)} hrs`;
    return `${(hours / 24).toFixed(1)} days`;
  }, [cards]);

  // ── Platform breakdown ────────────────────────────────────────────────────
  const platformData = useMemo(() => {
    const counts: Record<string, number> = {};
    cards.forEach(c => { counts[c.platform] = (counts[c.platform] || 0) + 1; });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
      .map(([platform, count]) => ({ platform, count }));
  }, [cards]);

  const maxPlatformCount = platformData[0]?.count || 1;

  // ── Status distribution (for PieChart) ───────────────────────────────────
  const statusData = useMemo(() => {
    return STATUS_ORDER
      .map(status => ({
        name:  statusMeta[status].label,
        value: cards.filter(c => c.status === status).length,
        hex:   statusMeta[status].hex,
        status,
      }))
      .filter(d => d.value > 0);
  }, [cards]);

  // ── Published this month ──────────────────────────────────────────────────
  const publishedThisMonth = useMemo(() => {
    const now = new Date();
    return cards.filter(c =>
      c.status === 'published' &&
      c.approvedAt &&
      c.approvedAt.getMonth()    === now.getMonth() &&
      c.approvedAt.getFullYear() === now.getFullYear()
    ).length;
  }, [cards]);

  // ── Engagement aggregates ─────────────────────────────────────────────────
  const { engagementByPlatform, totalLikes, totalReach, avgEngagementRate, hasEngagement } = useMemo(() => {
    const withData = cards.filter(c => c.status === 'published' && c.engagementData);
    const map: Record<string, { likes: number; comments: number; shares: number; reach: number }> = {};

    withData.forEach(c => {
      const p  = c.platform;
      const ed = c.engagementData!;
      if (!map[p]) map[p] = { likes: 0, comments: 0, shares: 0, reach: 0 };
      map[p].likes    += ed.likes    ?? 0;
      map[p].comments += ed.comments ?? 0;
      map[p].shares   += ed.shares   ?? 0;
      map[p].reach    += ed.reach    ?? 0;
    });

    const engagementByPlatform = Object.entries(map)
      .map(([platform, d]) => ({
        name:     (platformNames[platform] ?? platform).replace(' (Twitter)', '').replace('WhatsApp', 'WA').replace('Business', ''),
        platform,
        likes:    d.likes,
        comments: d.comments,
        shares:   d.shares,
        reach:    d.reach,
        total:    d.likes + d.comments + d.shares,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);

    const totalLikes    = withData.reduce((s, c) => s + (c.engagementData?.likes ?? 0), 0);
    const totalReach    = withData.reduce((s, c) => s + (c.engagementData?.reach ?? 0), 0);
    const totalEngage   = withData.reduce((s, c) => s + (c.engagementData?.likes ?? 0) + (c.engagementData?.comments ?? 0) + (c.engagementData?.shares ?? 0), 0);
    const avgEngagementRate = totalReach > 0 ? (totalEngage / totalReach) * 100 : null;

    return { engagementByPlatform, totalLikes, totalReach, avgEngagementRate, hasEngagement: withData.length > 0 };
  }, [cards]);

  // ── SLA snapshot ──────────────────────────────────────────────────────────
  const { slaOk, slaWarning, slaBreached, hasPending } = useMemo(() => {
    const pending = cards.filter(c => c.status === 'pending_approval');
    return {
      slaOk:       pending.filter(c => getSlaStatusWith(c, warningHours, breachHours) === 'ok').length,
      slaWarning:  pending.filter(c => getSlaStatusWith(c, warningHours, breachHours) === 'warning').length,
      slaBreached: pending.filter(c => getSlaStatusWith(c, warningHours, breachHours) === 'breached').length,
      hasPending:  pending.length > 0,
    };
  }, [cards, warningHours, breachHours]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          icon={FileText}
          label="Total Cards"
          value={totalCards}
          sub={`across ${Object.keys(cards.reduce((a, c) => ({ ...a, [c.platform]: 1 }), {})).length} platforms`}
          accentClass="bg-purple-500/50"
          delay={0}
        />
        <KPICard
          icon={TrendingUp}
          label="Approval Rate"
          value={approvalRate !== null ? `${approvalRate.toFixed(1)}%` : '—'}
          sub={`from ${decisionedCount} decisioned card${decisionedCount !== 1 ? 's' : ''}`}
          accentClass="bg-teal-500/50"
          delay={0.05}
        />
        <KPICard
          icon={Clock}
          label="Avg. Turnaround"
          value={avgTurnaround ?? '—'}
          sub="from creation to approval"
          accentClass="bg-blue-500/50"
          delay={0.1}
        />
        <KPICard
          icon={CheckCircle}
          label="Published (mo.)"
          value={publishedThisMonth}
          sub="cards published this month"
          accentClass="bg-green-600/40"
          delay={0.15}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Platform breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3"
        >
          <h4 className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">
            Posts by Platform
          </h4>

          {platformData.length === 0 ? (
            <p className="text-white/25 text-xs py-4 text-center">No platform data yet</p>
          ) : (
            <div className="space-y-2.5">
              {platformData.map(({ platform, count }) => {
                const PIcon      = platformIcons[platform];
                const barPct     = (count / maxPlatformCount) * 100;
                const barCls     = platformTailwindColors[platform] || 'bg-white';
                const iconCls    = platformIconColors[platform] || 'text-white/50';
                const name       = platformNames[platform] || platform;
                return (
                  <div key={platform} className="flex items-center gap-2.5">
                    {/* Icon */}
                    {PIcon ? (
                      <PIcon className={`w-3.5 h-3.5 shrink-0 ${iconCls}`} />
                    ) : (
                      <div className="w-3.5 h-3.5 shrink-0" />
                    )}
                    {/* Name */}
                    <span className="text-white/60 text-xs w-20 shrink-0 truncate">{name}</span>
                    {/* Progress bar */}
                    <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                        className={`h-full rounded-full ${barCls} opacity-80`}
                      />
                    </div>
                    {/* Count */}
                    <span className="text-white/40 text-[10px] w-5 text-right shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Status donut + legend */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4"
        >
          <h4 className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-3">
            Status Distribution
          </h4>

          {statusData.length === 0 ? (
            <p className="text-white/25 text-xs py-4 text-center">No status data yet</p>
          ) : (
            <div className="flex items-center gap-4">
              {/* Donut */}
              <div className="shrink-0 w-[130px] h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={58}
                      dataKey="value"
                      strokeWidth={0}
                      paddingAngle={2}
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.hex} opacity={0.9} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex-1 min-w-0 space-y-1.5">
                {statusData.map(({ status, name, value, hex }) => {
                  const StatusIcon = statusMeta[status].icon;
                  const pct = totalCards > 0 ? ((value / totalCards) * 100).toFixed(0) : '0';
                  return (
                    <div key={status} className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                      <StatusIcon className={`w-3 h-3 shrink-0 ${statusMeta[status].iconColor}`} />
                      <span className="text-white/60 text-[11px] flex-1 min-w-0 truncate">{name}</span>
                      <span className="text-white/35 text-[10px] shrink-0">{value} · {pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Engagement Performance Section ── */}
      {hasEngagement && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="space-y-4"
        >
          {/* Section header */}
          <div className="flex items-center gap-2 border-t border-white/8 pt-4">
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider">
              Engagement Performance — Published Posts
            </h4>
          </div>

          {/* Engagement KPI row */}
          <div className="grid grid-cols-3 gap-3">
            {/* Total Likes */}
            <div className="bg-pink-500/8 border border-pink-400/15 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none">{totalLikes.toLocaleString()}</p>
                <p className="text-white/40 text-[10px] mt-1">Total Likes</p>
              </div>
            </div>
            {/* Total Reach */}
            <div className="bg-purple-500/8 border border-purple-400/15 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                <Eye className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none">{totalReach.toLocaleString()}</p>
                <p className="text-white/40 text-[10px] mt-1">Total Reach</p>
              </div>
            </div>
            {/* Avg Engagement Rate */}
            <div className="bg-teal-500/8 border border-teal-400/15 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none">
                  {avgEngagementRate !== null ? `${avgEngagementRate.toFixed(2)}%` : '—'}
                </p>
                <p className="text-white/40 text-[10px] mt-1">Avg. Engagement Rate</p>
              </div>
            </div>
          </div>

          {/* Stacked bar chart — engagement by platform */}
          {engagementByPlatform.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <h4 className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-4">
                Engagement by Platform (Likes · Comments · Shares)
              </h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={engagementByPlatform} barSize={14} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                  />
                  <Tooltip content={<EngagementTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="likes"    stackId="a" fill="#f472b6" name="Likes"    radius={[0, 0, 0, 0]} />
                  <Bar dataKey="comments" stackId="a" fill="#60a5fa" name="Comments" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="shares"   stackId="a" fill="#4ade80" name="Shares"   radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex items-center justify-center gap-5 mt-2">
                {[
                  { color: '#f472b6', label: 'Likes' },
                  { color: '#60a5fa', label: 'Comments' },
                  { color: '#4ade80', label: 'Shares' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-white/40 text-[10px]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Approval SLA Snapshot ── */}
      {hasPending && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 border-t border-white/8 pt-4">
            <Timer className="w-3.5 h-3.5 text-amber-400" />
            <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider">
              Approval SLA Snapshot — Pending Cards
            </h4>
            <span className="text-white/20 text-[10px]">({warningHours}h warn · {breachHours}h breach)</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* On Time */}
            <div className="bg-green-500/6 border border-green-400/15 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none">{slaOk}</p>
                <p className="text-white/40 text-[10px] mt-1">On Time</p>
              </div>
            </div>
            {/* At Risk */}
            <div className="bg-amber-500/6 border border-amber-400/15 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <Timer className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className={`font-bold text-lg leading-none ${slaWarning > 0 ? 'text-amber-300' : 'text-white'}`}>{slaWarning}</p>
                <p className="text-white/40 text-[10px] mt-1">At Risk (&gt;{warningHours}h)</p>
              </div>
            </div>
            {/* SLA Breached */}
            <div className="bg-red-500/6 border border-red-400/15 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                <XCircle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className={`font-bold text-lg leading-none ${slaBreached > 0 ? 'text-red-300' : 'text-white'}`}>{slaBreached}</p>
                <p className="text-white/40 text-[10px] mt-1">Breached (&gt;{breachHours}h)</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Publishing cadence footer ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex items-center justify-between text-[10px] text-white/25 border-t border-white/8 pt-3"
      >
        <span>Analytics computed from {totalCards} card{totalCards !== 1 ? 's' : ''} in this project · Live, no server call</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400/50 animate-pulse" />
          Real-time
        </span>
      </motion.div>
    </div>
  );
}