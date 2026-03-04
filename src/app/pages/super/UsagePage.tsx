/**
 * Super Admin — Usage Analytics  (/super/usage)
 * ─────────────────────────────────────────────────────────────────────────────
 * Platform-wide usage across all tenants plus a dedicated
 * AI Content Studio cross-tenant overview.
 *
 * Sections:
 *   1.  Tenant / Period filters
 *   2.  KPI row  (Posts · Content · API Calls · Active Users · AI Tokens MTD)
 *   3.  Activity Trend + API Calls Trend charts (existing)
 *   4.  ── AI Content Studio — Platform Overview ──
 *         • Platform token trend (6-month area chart)
 *         • AI Requests trend (6-month area chart)
 *         • Tenant AI Usage Leaderboard (ranked table with mini sparklines)
 *   5.  Posts by Tenant horizontal bar (existing)
 *
 * Production → server route GET /ai/platform-ai-usage (SUPER_ADMIN gated)
 * Demo mode  → buildMockPlatformAI() in apiClient.ts (deterministic, always rich)
 */

import { useState, useEffect, useCallback } from 'react';
import { BarChart2, Sparkles, TrendingUp, TrendingDown, Minus, Building2, Zap, Settings2, Clock, Send, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PageHeader, Card, StatCard } from '../../components/saas/SaasLayout';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { useSEO } from '../../hooks/useSEO';
import {
  fetchUsageData, fetchTenants, fetchPlatformAIUsage, fetchCronStats,
  type UsageDataPoint, type PlatformAIUsageResult, type TenantAIUsageSummary,
  type CronStatsResult,
} from '../../utils/apiClient';


// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function shortMonth(period: string): string {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const m = parseInt(period.split('-')[1], 10) - 1;
  return MONTHS[m] ?? period;
}

/** Plan badge colours */
function planStyle(plan: string, isDark: boolean): string {
  const p = plan?.toLowerCase();
  if (p === 'enterprise') return isDark
    ? 'bg-purple-500/15 text-purple-400 border-purple-500/25'
    : 'bg-purple-50 text-purple-700 border-purple-200';
  if (p === 'growth') return isDark
    ? 'bg-[#0BA4AA]/15 text-[#0BA4AA] border-[#0BA4AA]/25'
    : 'bg-teal-50 text-teal-700 border-teal-200';
  return isDark
    ? 'bg-gray-500/15 text-gray-400 border-gray-500/25'
    : 'bg-gray-100 text-gray-600 border-gray-200';
}

/** Status dot */
function statusDot(status: string) {
  if (status === 'active')    return 'bg-emerald-400';
  if (status === 'suspended') return 'bg-red-400';
  if (status === 'pending')   return 'bg-amber-400';
  return 'bg-gray-400';
}

// ─── AI section separator ─────────────────────────────────────────────────────

function AISectionHeader({ loading, isDark }: { loading: boolean; isDark: boolean }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className={`h-px flex-1 bg-gradient-to-r ${isDark ? 'from-transparent to-[#0BA4AA]/30' : 'from-transparent to-[#0BA4AA]/20'}`} />
      <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${isDark ? '' : 'shadow-sm'}`}
        style={{ background: isDark ? 'rgba(11,164,170,0.08)' : 'rgba(11,164,170,0.06)', borderColor: isDark ? 'rgba(11,164,170,0.3)' : 'rgba(11,164,170,0.25)' }}>
        <Sparkles className="w-3.5 h-3.5" style={{ color: '#0BA4AA' }} />
        <span className="text-[0.7rem] font-bold uppercase tracking-widest" style={{ color: '#0BA4AA' }}>
          AI Content Studio — Platform Overview
        </span>
        {loading && (
          <span className="w-2.5 h-2.5 rounded-full border-2 border-[#0BA4AA] border-t-transparent animate-spin" />
        )}
      </div>
      <div className={`h-px flex-1 bg-gradient-to-l ${isDark ? 'from-transparent to-[#0BA4AA]/30' : 'from-transparent to-[#0BA4AA]/20'}`} />
    </div>
  );
}

// ─── Micro sparkline (inline recharts, no axes) ───────────────────────────────

function Sparkline({ data, color = '#0BA4AA', id }: { data: number[]; color?: string; id: string }) {
  const pts = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width={72} height={28}>
      <AreaChart data={pts} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
          fill={`url(#sg-${id})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Trend arrow ──────────────────────────────────────────────────────────────

function TrendBadge({ cur, prev, isDark }: { cur: number; prev: number; isDark?: boolean }) {
  if (cur === 0 && prev === 0) return <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>—</span>;
  if (prev === 0) return (
    <span className="flex items-center gap-0.5 text-[10px] text-emerald-400">
      <TrendingUp className="w-2.5 h-2.5" />new
    </span>
  );
  const pct = Math.round(((cur - prev) / prev) * 100);
  const up  = pct >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${up ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
      {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {up ? '+' : ''}{pct}%
    </span>
  );
}

// ─── Leaderboard row ─────────────────────────────────────────────────────────

function LeaderboardRow({
  rank, tenant, periods, limit, th,
}: {
  rank:    number;
  tenant:  TenantAIUsageSummary;
  periods: string[];
  limit:   number;
  th:      ReturnType<typeof useDashboardTheme>;
}) {
  const curPeriod  = periods[periods.length - 1];
  const prevPeriod = periods[periods.length - 2];
  const curUsage   = tenant.usage[curPeriod]  ?? { tokens: 0, requests: 0 };
  const prevUsage  = tenant.usage[prevPeriod] ?? { tokens: 0, requests: 0 };

  const sparkData  = periods.map(p => tenant.usage[p]?.tokens ?? 0);
  // Use per-tenant custom limit if set, otherwise fall back to platform default
  const effectiveLimit = (tenant.tokenLimit != null && tenant.tokenLimit > 0) ? tenant.tokenLimit : limit;
  const isCustomLimit  = tenant.tokenLimit != null && tenant.tokenLimit > 0;
  const pct        = Math.min((curUsage.tokens / effectiveLimit) * 100, 100);
  const barColor   = pct > 85 ? '#ef4444' : pct > 65 ? '#F47A20' : '#0BA4AA';
  const totalTokens = Object.values(tenant.usage).reduce((s, u) => s + u.tokens, 0);

  const MEDALS = ['🥇', '🥈', '🥉'];
  const rankLabel = rank <= 3 ? MEDALS[rank - 1] : `#${rank}`;

  return (
    <tr className={`${th.trBorder} border-b last:border-b-0 ${th.trHover} transition-colors`}>
      {/* Rank */}
      <td className="px-4 py-3 text-center">
        <span className={`text-sm ${rank <= 3 ? '' : th.textFaint}`}>{rankLabel}</span>
      </td>

      {/* Tenant name + plan + status */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(tenant.status)}`} />
          <div className="min-w-0">
            <p className={`${th.text} text-sm font-semibold truncate max-w-[140px]`}>{tenant.name}</p>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${planStyle(tenant.plan, th.isDark)}`}>
                {tenant.plan}
              </span>
              {isCustomLimit && (
                <span className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border ${th.isDark ? 'bg-[#3E3C70]/20 text-[#a78bfa] border-[#3E3C70]/40' : 'bg-purple-50 text-purple-600 border-purple-200'}`}
                  title={`Custom limit: ${effectiveLimit.toLocaleString()} tokens/mo`}>
                  <Settings2 className="w-2.5 h-2.5" />
                  {fmtK(effectiveLimit)}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* 6-month sparkline */}
      <td className="px-4 py-3">
        <Sparkline
          data={sparkData}
          color={pct > 85 ? '#ef4444' : '#0BA4AA'}
          id={tenant.id}
        />
      </td>

      {/* Tokens this month + bar */}
      <td className="px-4 py-3 min-w-[140px]">
        <div className="flex items-center justify-between mb-1">
          <span className={`${th.text} text-xs font-semibold tabular-nums`}>
            {curUsage.tokens.toLocaleString()}
          </span>
          <span className={`${th.textFaint} text-[10px]`}>{pct.toFixed(0)}%</span>
        </div>
        <div className={`h-1.5 ${th.s1} rounded-full overflow-hidden`}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
        <p className={`${th.textFaint} text-[9px] mt-0.5 tabular-nums`}>
          of {fmtK(effectiveLimit)} limit
        </p>
      </td>

      {/* Requests */}
      <td className={`${th.textMd} px-4 py-3 text-sm tabular-nums text-right`}>
        {curUsage.requests}
      </td>

      {/* Trend vs prev month */}
      <td className="px-4 py-3 text-right">
        <TrendBadge cur={curUsage.tokens} prev={prevUsage.tokens} isDark={th.isDark} />
      </td>

      {/* 6-month total */}
      <td className={`${th.textMd} px-4 py-3 text-sm tabular-nums text-right`}>
        {fmtK(totalTokens)}
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function UsagePage() {
  const th = useDashboardTheme();

  useSEO({ title: 'Platform Usage', description: 'Monitor AI token consumption, API usage, and storage across all tenants.', noindex: true });

  // Existing state
  const [period,       setPeriod]       = useState('Recent');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [tenants,      setTenants]      = useState<any[]>([]);
  const [chartData,    setChartData]    = useState<UsageDataPoint[]>([]);

  // AI state
  const [aiData,    setAiData]    = useState<PlatformAIUsageResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState<string | null>(null);

  // Cron stats state
  const [cronStats,   setCronStats]   = useState<CronStatsResult | null>(null);
  const [cronLoading, setCronLoading] = useState(false);

  // Load existing platform usage
  useEffect(() => { fetchTenants().then(setTenants); }, []);
  useEffect(() => {
    fetchUsageData(tenantFilter === 'all' ? undefined : tenantFilter).then(setChartData);
  }, [tenantFilter]);

  // Load cron stats
  useEffect(() => {
    setCronLoading(true);
    fetchCronStats()
      .then(setCronStats)
      .catch(err => console.error('[SuperUsagePage] Cron stats load error:', err))
      .finally(() => setCronLoading(false));
  }, []);

  // Load AI platform overview
  useEffect(() => {
    const load = async () => {
      setAiLoading(true);
      setAiError(null);
      try {
        const result = await fetchPlatformAIUsage();
        setAiData(result);
      } catch (err: any) {
        console.error('[SuperUsagePage] AI data load error:', err);
        setAiError(err?.message ?? 'Failed to load AI usage data');
      } finally {
        setAiLoading(false);
      }
    };
    load();
  }, []);

  // ── Derived values ──────────────────────────────────────────────────────────
  const latest        = chartData[chartData.length - 1];
  const activeTenants = tenants.filter(t => t.status === 'active');

  const byTenantData = tenants.map(ten => ({
    name:  ten.name.split(' ')[0],
    posts: tenantFilter === 'all' ? Math.round(chartData.find(dp => dp.tenantId === ten.id)?.posts ?? 0) : 0,
    users: chartData.find(dp => dp.tenantId === ten.id)?.users ?? 0,
  }));

  // AI-derived KPIs
  const curPeriod     = aiData?.periods[aiData.periods.length - 1];
  const prevPeriod    = aiData?.periods[aiData.periods.length - 2];
  const curTotal      = curPeriod  ? (aiData?.platformTotal[curPeriod]  ?? { tokens: 0, requests: 0 }) : { tokens: 0, requests: 0 };
  const prevTotal     = prevPeriod ? (aiData?.platformTotal[prevPeriod] ?? { tokens: 0, requests: 0 }) : { tokens: 0, requests: 0 };
  const totalPct      = curTotal.tokens > 0 && prevTotal.tokens > 0
    ? Math.round(((curTotal.tokens - prevTotal.tokens) / prevTotal.tokens) * 100)
    : 0;
  const activeAITenants = aiData?.tenants.filter(t =>
    curPeriod ? (t.usage[curPeriod]?.tokens ?? 0) > 0 : false
  ).length ?? 0;

  // Platform trend chart data
  const platformTrendData = aiData
    ? aiData.periods.map(p => ({
        label:    shortMonth(p),
        tokens:   aiData.platformTotal[p]?.tokens   ?? 0,
        requests: aiData.platformTotal[p]?.requests ?? 0,
      }))
    : [];

  // Sorted leaderboard (by current-month tokens, descending)
  const leaderboard = aiData
    ? [...aiData.tenants].sort((a, b) => {
        const ap = curPeriod ? (a.usage[curPeriod]?.tokens ?? 0) : 0;
        const bp = curPeriod ? (b.usage[curPeriod]?.tokens ?? 0) : 0;
        return bp - ap;
      })
    : [];

  const tooltipStyle = {
    backgroundColor: th.chart.tooltipBg,
    border:          th.chart.tooltipBorder,
    borderRadius:    12,
    color:           th.chart.tooltipColor,
    fontSize:        12,
  };

  return (
    <div>
      <PageHeader
        title="Usage Analytics"
        subtitle="Platform-wide usage across all tenants and modules"
      />

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap mb-6">
        <select value={tenantFilter} onChange={e => setTenantFilter(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm focus:outline-none ${th.selectCls}`}>
          <option value="all">All Tenants</option>
          {activeTenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm focus:outline-none ${th.selectCls}`}>
          {['Recent','Feb 2025','Jan 2025','Dec 2024','Nov 2024'].map(p =>
            <option key={p} value={p}>{p}</option>
          )}
        </select>
      </div>

      {/* ── KPI row — 5 cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Posts Published" value={latest?.posts   ?? 0}                   delta="+21% vs last month" color="purple"  icon={<BarChart2 className="w-8 h-8" />} />
        <StatCard label="Content Pieces"  value={latest?.content ?? 0}                   delta="+18% vs last month" color="teal"    icon={<BarChart2 className="w-8 h-8" />} />
        <StatCard label="API Calls"       value={(latest?.api    ?? 0).toLocaleString()}  delta="+27% vs last month" color="sky"     icon={<BarChart2 className="w-8 h-8" />} />
        <StatCard label="Active Users"    value={latest?.users   ?? 0}                   delta="+12 this month"     color="emerald" icon={<BarChart2 className="w-8 h-8" />} />
        <StatCard
          label="AI Tokens (MTD)"
          value={aiData ? fmtK(curTotal.tokens) : '—'}
          delta={aiData
            ? `${totalPct >= 0 ? '+' : ''}${totalPct}% vs last month · ${activeAITenants} active tenant${activeAITenants !== 1 ? 's' : ''}`
            : 'Loading…'}
          color={totalPct > 30 ? 'orange' as any : 'teal'}
          icon={<Sparkles className="w-8 h-8" />}
        />
      </div>

      {/* ── Cron Job Status — Auto-Publish & Engagement Sync ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Auto-Publish Card */}
        <div className={`rounded-xl border p-5 ${th.s1} ${th.border}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(11,164,170,0.12)' }}>
                <Send className="w-4.5 h-4.5" style={{ color: '#0BA4AA' }} />
              </div>
              <div>
                <h3 className={`${th.text} text-sm font-semibold`}>Auto-Publish Cron</h3>
                <p className={`${th.textFaint} text-[10px]`}>Every 5 min via GitHub Actions</p>
              </div>
            </div>
            {cronStats?.autoPublish.latest ? (
              <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${th.isDark ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/25' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            ) : (
              <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${th.isDark ? 'bg-gray-500/12 text-gray-400 border border-gray-500/25' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                <Clock className="w-3 h-3" /> No runs yet
              </span>
            )}
          </div>

          {cronLoading ? (
            <div className={`${th.textFaint} text-xs`}>Loading cron stats...</div>
          ) : cronStats?.autoPublish.latest ? (
            <div className="space-y-3">
              {/* Last run */}
              <div className="flex items-center gap-2">
                <Clock className={`w-3.5 h-3.5 shrink-0 ${th.isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`${th.textMd} text-xs`}>
                  Last run: <span className={`${th.text} font-medium`}>
                    {new Date(cronStats.autoPublish.latest.lastRunAt).toLocaleString()}
                  </span>
                </span>
              </div>
              {/* Today's stats */}
              {cronStats.autoPublish.today && (
                <div className="grid grid-cols-3 gap-3">
                  <div className={`rounded-lg px-3 py-2.5 text-center ${th.isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                    <p className={`${th.text} text-lg font-bold tabular-nums`}>{cronStats.autoPublish.today.runs}</p>
                    <p className={`${th.textFaint} text-[10px]`}>Runs today</p>
                  </div>
                  <div className={`rounded-lg px-3 py-2.5 text-center ${th.isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                    <p className="text-lg font-bold tabular-nums" style={{ color: '#0BA4AA' }}>{cronStats.autoPublish.today.published}</p>
                    <p className={`${th.textFaint} text-[10px]`}>Published</p>
                  </div>
                  <div className={`rounded-lg px-3 py-2.5 text-center ${th.isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                    <p className={`text-lg font-bold tabular-nums ${(cronStats.autoPublish.today.failed ?? 0) > 0 ? 'text-red-500' : th.isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {cronStats.autoPublish.today.failed ?? 0}
                    </p>
                    <p className={`${th.textFaint} text-[10px]`}>Failed</p>
                  </div>
                </div>
              )}
              {/* Yesterday comparison */}
              {cronStats.autoPublish.yesterday && (
                <div className={`flex items-center gap-1.5 ${th.textFaint} text-[10px]`}>
                  <span>Yesterday:</span>
                  <span className={`${th.textMd} font-medium`}>
                    {cronStats.autoPublish.yesterday.published} published
                  </span>
                  <span>/</span>
                  <span className={`${cronStats.autoPublish.yesterday.failed > 0 ? 'text-red-400' : th.textMd} font-medium`}>
                    {cronStats.autoPublish.yesterday.failed} failed
                  </span>
                  <span>across {cronStats.autoPublish.yesterday.runs} runs</span>
                </div>
              )}
              {/* Alert if failures */}
              {cronStats.autoPublish.today && (cronStats.autoPublish.today.failed ?? 0) > 0 && (
                <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${th.isDark ? 'bg-red-500/8 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{cronStats.autoPublish.today.failed} card(s) failed to publish today. Check the Audit Log for details.</span>
                </div>
              )}
            </div>
          ) : (
            <p className={`${th.textFaint} text-xs`}>
              No auto-publish data yet. The cron will start populating stats on its first run.
            </p>
          )}
        </div>

        {/* Engagement Sync Card */}
        <div className={`rounded-xl border p-5 ${th.s1} ${th.border}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244,122,32,0.12)' }}>
                <RefreshCw className="w-4.5 h-4.5" style={{ color: '#F47A20' }} />
              </div>
              <div>
                <h3 className={`${th.text} text-sm font-semibold`}>Engagement Sync</h3>
                <p className={`${th.textFaint} text-[10px]`}>Every 6 hours — pull platform metrics</p>
              </div>
            </div>
            {cronStats?.engagementSync.latest ? (
              <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${th.isDark ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/25' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            ) : (
              <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${th.isDark ? 'bg-gray-500/12 text-gray-400 border border-gray-500/25' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                <Clock className="w-3 h-3" /> No runs yet
              </span>
            )}
          </div>

          {cronLoading ? (
            <div className={`${th.textFaint} text-xs`}>Loading cron stats...</div>
          ) : cronStats?.engagementSync.latest ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className={`w-3.5 h-3.5 shrink-0 ${th.isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`${th.textMd} text-xs`}>
                  Last sync: <span className={`${th.text} font-medium`}>
                    {new Date(cronStats.engagementSync.latest.lastRunAt).toLocaleString()}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className={`rounded-lg px-3 py-2.5 text-center ${th.isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                  <p className={`${th.text} text-lg font-bold tabular-nums`}>{cronStats.engagementSync.latest.tenantsProcessed}</p>
                  <p className={`${th.textFaint} text-[10px]`}>Tenants</p>
                </div>
                <div className={`rounded-lg px-3 py-2.5 text-center ${th.isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                  <p className="text-lg font-bold tabular-nums" style={{ color: '#F47A20' }}>{cronStats.engagementSync.latest.totalSynced ?? 0}</p>
                  <p className={`${th.textFaint} text-[10px]`}>Posts synced</p>
                </div>
                <div className={`rounded-lg px-3 py-2.5 text-center ${th.isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                  <p className={`text-lg font-bold tabular-nums ${(cronStats.engagementSync.latest.totalErrors ?? 0) > 0 ? 'text-red-500' : th.isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {cronStats.engagementSync.latest.totalErrors ?? 0}
                  </p>
                  <p className={`${th.textFaint} text-[10px]`}>Errors</p>
                </div>
              </div>
              {/* Time since last sync */}
              {(() => {
                const elapsed = Date.now() - new Date(cronStats.engagementSync.latest.lastRunAt).getTime();
                const hours = Math.floor(elapsed / 3600000);
                const mins = Math.floor((elapsed % 3600000) / 60000);
                const isOverdue = hours >= 7; // Expected every 6 hours
                return (
                  <div className={`flex items-center gap-1.5 text-[10px] ${isOverdue ? (th.isDark ? 'text-amber-400' : 'text-amber-600') : th.textFaint}`}>
                    {isOverdue && <AlertTriangle className="w-3 h-3" />}
                    <span>{hours}h {mins}m since last sync{isOverdue ? ' (overdue — expected every 6h)' : ''}</span>
                  </div>
                );
              })()}
            </div>
          ) : (
            <p className={`${th.textFaint} text-xs`}>
              No engagement sync data yet. The cron runs every 6 hours to pull platform metrics.
            </p>
          )}
        </div>
      </div>

      {/* ── Existing: Activity + API Trends ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Activity Trend (Last 7 Months)">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gradContent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={th.chart.gridStroke} />
              <XAxis dataKey="period" tick={{ fill: th.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis                  tick={{ fill: th.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: th.chart.legendColor, fontSize: 12 }} />
              <Area type="monotone" dataKey="posts"   name="Posts"   stroke="#a855f7" fill="url(#gradPosts)"   strokeWidth={2} />
              <Area type="monotone" dataKey="content" name="Content" stroke="#14b8a6" fill="url(#gradContent)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="API Calls Trend">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={th.chart.gridStroke} />
              <XAxis dataKey="period" tick={{ fill: th.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis                  tick={{ fill: th.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="api" name="API Calls" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          AI CONTENT STUDIO — PLATFORM OVERVIEW
      ══════════════════════════════════════════════════════════════════════ */}
      <AISectionHeader loading={aiLoading} isDark={th.isDark} />

      {aiError && (
        <div className={`mb-6 px-4 py-3 rounded-xl border ${th.isDark ? 'border-red-500/25 bg-red-500/8 text-red-400' : 'border-red-200 bg-red-50 text-red-600'} text-sm`}>
          {aiError}
        </div>
      )}

      {/* Platform AI trend charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Token trend */}
        <Card
          title="Platform AI Token Burn (6 Months)"
          actions={
            aiData && (
              <span className="text-[0.65rem] font-semibold px-2 py-1 rounded-full"
                style={{ background: 'rgba(11,164,170,0.12)', color: '#0BA4AA', border: '1px solid rgba(11,164,170,0.3)' }}>
                {leaderboard.length} tenant{leaderboard.length !== 1 ? 's' : ''}
              </span>
            )
          }
        >
          {platformTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={platformTrendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="platGradTok" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0BA4AA" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0BA4AA" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={th.chart.gridStroke} />
                <XAxis dataKey="label"  tick={{ fill: th.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: th.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => fmtK(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v.toLocaleString(), 'Tokens']} />
                <Area type="monotone" dataKey="tokens" name="Platform Tokens"
                  stroke="#0BA4AA" fill="url(#platGradTok)" strokeWidth={2.5}
                  dot={{ fill: '#0BA4AA', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center">
              <span className={`${th.textFaint} text-sm`}>
                {aiLoading ? 'Loading AI data…' : 'No AI usage data yet'}
              </span>
            </div>
          )}
        </Card>

        {/* Requests trend */}
        <Card title="Platform AI Requests (6 Months)">
          {platformTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={platformTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="platGradReq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#F47A20" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#F47A20" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={th.chart.gridStroke} />
                <XAxis dataKey="label"    tick={{ fill: th.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: th.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, 'Requests']} />
                <Bar dataKey="requests" name="Requests" fill="url(#platGradReq)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center">
              <span className={`${th.textFaint} text-sm`}>
                {aiLoading ? 'Loading…' : 'No data'}
              </span>
            </div>
          )}
        </Card>
      </div>

      {/* Tenant AI Leaderboard */}
      {leaderboard.length > 0 && (
        <Card
          title="Tenant AI Token Leaderboard"
          className="mb-6"
          actions={
            <div className="flex items-center gap-3">
              <span className={`${th.textFaint} text-[0.65rem]`}>
                Current month · {curPeriod ? shortMonth(curPeriod) : ''}
              </span>
              <span className="text-[0.65rem] px-2 py-0.5 rounded-full border"
                style={{ background: 'rgba(11,164,170,0.08)', borderColor: 'rgba(11,164,170,0.25)', color: '#0BA4AA' }}>
                Limit {fmtK(aiData?.limit ?? 100000)}/tenant
              </span>
            </div>
          }
        >
          <div className="overflow-x-auto -mx-5 px-5">
            <table className={`w-full text-left text-sm border-collapse min-w-[640px]`}>
              <thead>
                <tr className={`${th.theadBg} ${th.theadText} text-[0.65rem] uppercase tracking-wider`}>
                  <th className="px-4 py-2.5 text-center w-12">Rank</th>
                  <th className="px-4 py-2.5">Tenant</th>
                  <th className="px-4 py-2.5 w-24">6-Month</th>
                  <th className="px-4 py-2.5 min-w-[140px]">Tokens (MTD)</th>
                  <th className="px-4 py-2.5 text-right">Requests</th>
                  <th className="px-4 py-2.5 text-right">vs Prev</th>
                  <th className="px-4 py-2.5 text-right">Total (6mo)</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((tenant, i) => (
                  <LeaderboardRow
                    key={tenant.id}
                    rank={i + 1}
                    tenant={tenant}
                    periods={aiData!.periods}
                    limit={aiData!.limit}
                    th={th}
                  />
                ))}
              </tbody>
              {/* Platform totals footer */}
              <tfoot>
                <tr className={`${th.theadBg} border-t-2 ${th.border}`}>
                  <td colSpan={3} className={`${th.textFaint} px-4 py-2.5 text-xs font-semibold`}>
                    Platform Total
                  </td>
                  <td className={`${th.text} px-4 py-2.5 text-sm font-bold tabular-nums`}>
                    {curTotal.tokens.toLocaleString()}
                    <span className={`${th.textFaint} text-xs font-normal ml-1`}>tokens</span>
                  </td>
                  <td className={`${th.text} px-4 py-2.5 text-sm font-bold tabular-nums text-right`}>
                    {curTotal.requests}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <TrendBadge cur={curTotal.tokens} prev={prevTotal.tokens} isDark={th.isDark} />
                  </td>
                  <td className={`${th.text} px-4 py-2.5 text-sm font-bold tabular-nums text-right`}>
                    {fmtK(Object.values(aiData?.platformTotal ?? {}).reduce((s, u) => s + u.tokens, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Heat annotation: any tenant above 80% */}
          {(() => {
            const hotTenants = leaderboard.filter(t => {
              const tok          = curPeriod ? (t.usage[curPeriod]?.tokens ?? 0) : 0;
              const effectiveLim = (t.tokenLimit != null && t.tokenLimit > 0) ? t.tokenLimit : (aiData?.limit ?? 100000);
              return (tok / effectiveLim) > 0.8;
            });
            if (hotTenants.length === 0) return null;
            return (
              <div className={`mt-4 pt-4 border-t border-red-500/15 flex items-start gap-2 ${th.isDark ? 'text-red-400' : 'text-red-600'}`}>
                <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p className="text-xs">
                  <span className="font-semibold">{hotTenants.map(t => t.name).join(', ')}</span>
                  {' '}exceeded 80% of their monthly token limit — consider proactive outreach or limit increase.
                </p>
              </div>
            );
          })()}
        </Card>
      )}

      {/* ── Existing: Posts by Tenant ─────────────────────────────────────── */}
      {tenantFilter === 'all' && (
        <Card title="Posts by Tenant (Current Month)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={byTenantData.filter(d => d.posts > 0)}
              layout="vertical"
              margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={th.chart.gridStroke} horizontal={false} />
              <XAxis type="number"   tick={{ fill: th.chart.tickFill,    fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: th.chart.tickFillAlt, fontSize: 11 }} width={80} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="posts" name="Posts" fill="#a855f7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}