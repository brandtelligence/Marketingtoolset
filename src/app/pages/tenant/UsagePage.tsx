/**
 * TenantUsagePage — /tenant/usage
 * ─────────────────────────────────────────────────────────────────────────────
 * Platform usage analytics for the Tenant Admin.
 *
 * Sections:
 *   1. KPI row  — Posts · Content · API Calls · Active Users · AI Tokens
 *   2. Activity Trend + API Calls charts  (existing)
 *   3. ── AI Content Studio ──  section  (new)
 *        • 6-month AI token trend area chart
 *        • Template popularity horizontal bars
 *        • Team member AI usage table
 *   4. Top Features Used breakdown
 *   5. Period Summary card
 *
 * Production → real Supabase edge-function calls (auth token required)
 * Demo mode  → deterministic mock data so the UI is always interactive
 */

import { useState, useEffect } from 'react';
import { BarChart2, Activity, Sparkles, Users, Zap, AlertTriangle } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PageHeader, Card, StatCard } from '../../components/saas/SaasLayout';
import { formatRM } from '../../utils/format';
import { useAuth } from '../../components/AuthContext';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import {
  fetchUsageData, fetchTenants, fetchTenantAIBudget, fetchContentGenUsage,
  fetchContentHistory,
  type UsageDataPoint, type TenantAIBudget,
} from '../../utils/apiClient';
import { TenantAIBudgetCard } from '../../components/saas/TenantAIBudgetCard';
import { IS_PRODUCTION } from '../../config/appConfig';

// ─── AI data types ────────────────────────────────────────────────────────────

interface AiMonthPoint  { period: string; label: string; tokens: number; requests: number; }
interface AiTeamMember  { name: string; tokens: number; requests: number; }
interface AiTmplPoint   { template: string; count: number; tokens: number; }

// ─── Template label map ───────────────────────────────────────────────────────

const TMPL_LABELS: Record<string, string> = {
  social_caption: 'Social Caption',
  ad_copy:        'Ad Copy',
  blog_intro:     'Blog Intro',
  hashtag_set:    'Hashtag Set',
  campaign_brief: 'Campaign Brief',
  custom:         'Custom / Chat',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLastNMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

function shortMonth(period: string): string {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const m = parseInt(period.split('-')[1], 10) - 1;
  return MONTHS[m] ?? period;
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

// ─── Mock AI data (deterministic, always matches the 6 most-recent months) ────

const MOCK_TREND_VALS = [12_400, 28_900, 35_200, 41_800, 58_400, 67_200];
const MOCK_REQ_VALS   = [23, 51, 67, 78, 94, 112];

function buildMockTrend(): AiMonthPoint[] {
  return getLastNMonths(6).map((period, i) => ({
    period, label: shortMonth(period),
    tokens: MOCK_TREND_VALS[i] ?? 0, requests: MOCK_REQ_VALS[i] ?? 0,
  }));
}

const MOCK_AI_CURRENT: { tokens: number; requests: number; limit: number } =
  { tokens: 67_200, requests: 112, limit: 100_000 };

const MOCK_AI_TEAM: AiTeamMember[] = [
  { name: 'Sarah Chen',      tokens: 28_400, requests: 47 },
  { name: 'Marcus Johnson',  tokens: 19_200, requests: 31 },
  { name: 'Emily Rodriguez', tokens: 12_800, requests: 22 },
  { name: 'James Wright',    tokens:  4_600, requests:  9 },
  { name: 'Lisa Anderson',   tokens:  2_200, requests:  3 },
];

const MOCK_AI_TEMPLATES: AiTmplPoint[] = [
  { template: 'Social Caption', count: 58, tokens: 29_400 },
  { template: 'Ad Copy',        count: 31, tokens: 19_800 },
  { template: 'Hashtag Set',    count: 24, tokens:  7_200 },
  { template: 'Campaign Brief', count: 12, tokens: 14_400 },
  { template: 'Blog Intro',     count:  9, tokens:  5_400 },
  { template: 'Custom / Chat',  count:  5, tokens:  3_200 },
];

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function TokenTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs shadow-xl" style={{ background: 'rgba(15,10,40,0.95)', border: '1px solid rgba(11,164,170,0.25)', color: '#fff' }}>
      <p className="font-semibold mb-1 text-[#0BA4AA]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-medium">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── AI section header ────────────────────────────────────────────────────────

function AISectionHeader({ loading }: { loading: boolean }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#0BA4AA]/30" />
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border" style={{ background: 'rgba(11,164,170,0.08)', borderColor: 'rgba(11,164,170,0.3)' }}>
        <Sparkles className="w-3.5 h-3.5" style={{ color: '#0BA4AA' }} />
        <span className="text-[0.7rem] font-bold uppercase tracking-widest" style={{ color: '#0BA4AA' }}>AI Content Studio</span>
        {loading && <span className="w-2.5 h-2.5 rounded-full border-2 border-[#0BA4AA] border-t-transparent animate-spin" />}
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#0BA4AA]/30" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TenantUsagePage() {
  const th = useDashboardTheme();
  const { user } = useAuth();

  // Existing state
  const [period,    setPeriod]    = useState('Recent');
  const [chartData, setChartData] = useState<UsageDataPoint[]>([]);
  const [tenant,    setTenant]    = useState<any>(null);

  // AI state
  const [budget,     setBudget]     = useState<TenantAIBudget | null>(null);
  const [aiTrend,    setAiTrend]    = useState<AiMonthPoint[]>([]);
  const [aiTeam,     setAiTeam]     = useState<AiTeamMember[]>([]);
  const [aiTemplates,setAiTemplates]= useState<AiTmplPoint[]>([]);
  const [aiLoading,  setAiLoading]  = useState(false);

  // Load existing platform usage
  useEffect(() => {
    if (!user?.tenantId) return;
    Promise.all([fetchUsageData(user.tenantId), fetchTenants()]).then(([data, tenants]) => {
      setChartData(data);
      setTenant(tenants.find(t => t.id === user.tenantId) ?? null);
    });
  }, [user?.tenantId]);

  // Load AI usage data
  useEffect(() => {
    if (!user?.tenantId) return;
    const tid = user.tenantId;

    const load = async () => {
      setAiLoading(true);
      try {
        if (!IS_PRODUCTION) {
          // Demo mode — load per-tenant budget (respects custom limits set by Super Admin in Step 9)
          const mockBudget = await fetchTenantAIBudget(tid);
          setBudget(mockBudget);
          setAiTrend(buildMockTrend());
          setAiTeam(MOCK_AI_TEAM);
          setAiTemplates(MOCK_AI_TEMPLATES);
          return;
        }

        const months = getLastNMonths(6);

        const [budgetData, history, ...monthlyUsages] = await Promise.all([
          fetchTenantAIBudget(tid),
          fetchContentHistory(tid, 100),
          ...months.map(m =>
            fetchContentGenUsage(tid, m).catch(() => ({ tokens: 0, requests: 0, limit: 100_000, period: m }))
          ),
        ]);

        setBudget(budgetData);

        // Monthly trend from per-period usage calls
        setAiTrend(months.map((m, i) => ({
          period: m,
          label:  shortMonth(m),
          tokens:   (monthlyUsages[i] as any)?.tokens   ?? 0,
          requests: (monthlyUsages[i] as any)?.requests ?? 0,
        })));

        // Team usage: aggregate history by userName
        const teamMap: Record<string, { tokens: number; requests: number }> = {};
        for (const rec of history) {
          const name = rec.userName || 'Unknown';
          if (!teamMap[name]) teamMap[name] = { tokens: 0, requests: 0 };
          teamMap[name].tokens   += rec.tokensUsed;
          teamMap[name].requests += 1;
        }
        setAiTeam(
          Object.entries(teamMap)
            .map(([name, d]) => ({ name, ...d }))
            .sort((a, b) => b.tokens - a.tokens)
            .slice(0, 10)
        );

        // Template breakdown: aggregate history by template
        const tmplMap: Record<string, { count: number; tokens: number }> = {};
        for (const rec of history) {
          const label = TMPL_LABELS[rec.template] ?? rec.template;
          if (!tmplMap[label]) tmplMap[label] = { count: 0, tokens: 0 };
          tmplMap[label].count   += 1;
          tmplMap[label].tokens  += rec.tokensUsed;
        }
        setAiTemplates(
          Object.entries(tmplMap)
            .map(([template, d]) => ({ template, ...d }))
            .sort((a, b) => b.count - a.count)
        );

      } catch (err) {
        console.error('[TenantUsagePage] AI data load error:', err);
      } finally {
        setAiLoading(false);
      }
    };

    load();
  }, [user?.tenantId]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const latest = chartData[chartData.length - 1];

  const aiPct      = budget ? Math.min((budget.tokensUsed / budget.limit) * 100, 100) : 0;
  const aiPctLabel = budget ? `${aiPct.toFixed(0)}% of ${fmtK(budget.limit)} limit` : 'Loading…';

  const featureBreakdown = [
    { feature: 'Post Scheduling', calls: Math.round((latest?.posts    ?? 0) * 0.6)  },
    { feature: 'Caption AI',      calls: Math.round((latest?.posts    ?? 0) * 0.25) },
    { feature: 'Content Gen',     calls: Math.round((latest?.content  ?? 0) * 0.7)  },
    { feature: 'Analytics',       calls: Math.round((latest?.api      ?? 0) * 0.15) },
    { feature: 'vCard View',      calls: Math.round((latest?.api      ?? 0) * 0.1)  },
  ].filter(d => d.calls > 0);

  const kpis = [
    { label: 'Posts Published', value: latest?.posts ?? 0,                  delta: '+18% vs last month', color: 'teal'    as const },
    { label: 'Content Pieces',  value: latest?.content ?? 0,                delta: '+12% vs last month', color: 'purple'  as const },
    { label: 'API Calls',       value: (latest?.api ?? 0).toLocaleString(), delta: '+24% vs last month', color: 'sky'     as const },
    { label: 'Active Users',    value: latest?.users ?? 0,                  delta: `${tenant?.size ?? '—'} team`, color: 'emerald' as const },
    {
      label: 'AI Tokens (MTD)',
      value: budget ? fmtK(budget.tokensUsed) : '—',
      delta: aiPctLabel,
      color: aiPct > 85 ? 'red' as const : 'teal' as const,
    },
  ];

  const tooltipStyle = {
    backgroundColor: th.chart.tooltipBg,
    border: th.chart.tooltipBorder,
    borderRadius: 12,
    color: th.chart.tooltipColor,
    fontSize: 12,
  };

  // ── Colours for template bars ───────────────────────────────────────────────
  const TMPL_COLORS = ['#0BA4AA','#F47A20','#3E3C70','#10b981','#8b5cf6','#f59e0b'];

  // ── Max values for team usage bars ──────────────────────────────────────────
  const teamMax = Math.max(...aiTeam.map(m => m.tokens), 1);

  return (
    <div>
      <PageHeader
        title="Usage Analytics"
        subtitle={`${tenant?.name ?? 'Your Tenant'} · ${tenant?.plan ?? ''} Plan`}
      />

      {/* Period filter */}
      <div className="flex gap-3 mb-6">
        <select
          value={period} onChange={e => setPeriod(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm focus:outline-none ${th.selectCls}`}
        >
          {['Recent', 'Feb 2025', 'Jan 2025', 'Dec 2024', 'Nov 2024', 'Oct 2024'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards — 5-column grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {kpis.map(k => (
          <StatCard
            key={k.label} label={k.label} value={k.value}
            delta={k.delta} color={k.color}
            icon={k.label.startsWith('AI') ? <Sparkles className="w-8 h-8" /> : <BarChart2 className="w-8 h-8" />}
          />
        ))}
      </div>

      {/* AI token progress inline bar (visible when near limit) */}
      {budget && aiPct > 50 && (
        <div className={`flex items-start gap-3 mb-6 px-4 py-3 rounded-xl border text-sm ${
          aiPct > 85
            ? 'bg-red-500/8 border-red-500/20 text-red-400'
            : 'bg-[#F47A20]/8 border-[#F47A20]/20 text-[#F47A20]'
        }`}>
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">
              {aiPct > 85 ? 'AI token limit almost reached' : 'Moderate AI token usage'} —
            </span>{' '}
            {budget.tokensUsed.toLocaleString()} of {budget.limit.toLocaleString()} tokens used this month ({aiPct.toFixed(0)}%).
            {aiPct > 85 && ' Contact Brandtelligence to increase your monthly limit.'}
          </div>
        </div>
      )}

      {/* ── Existing charts ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Activity Trend (Last 7 Months)">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tenGradPosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="tenGradContent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={th.chart.gridStroke} />
              <XAxis dataKey="period" tick={{ fill: th.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis                  tick={{ fill: th.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: th.chart.legendColor, fontSize: 12 }} />
              <Area type="monotone" dataKey="posts"   name="Posts"   stroke="#14b8a6" fill="url(#tenGradPosts)"   strokeWidth={2} />
              <Area type="monotone" dataKey="content" name="Content" stroke="#a855f7" fill="url(#tenGradContent)" strokeWidth={2} />
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
              <Bar dataKey="api" name="API Calls" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          AI CONTENT STUDIO SECTION
      ══════════════════════════════════════════════════════════════════════ */}
      <AISectionHeader loading={aiLoading} />

      {/* ── Tenant AI Budget Gauge — hero card at top of AI section ── */}
      {budget && (
        <div className="mb-6">
          <TenantAIBudgetCard budget={budget} loading={aiLoading} />
        </div>
      )}
      {!budget && aiLoading && (
        <div className={`mb-6 rounded-2xl border ${th.border} flex items-center justify-center py-12 gap-3`}
          style={{ background: th.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
          <span className="w-5 h-5 rounded-full border-2 border-[#0BA4AA] border-t-transparent animate-spin" />
          <span className={`${th.textFaint} text-sm`}>Loading AI budget…</span>
        </div>
      )}

      {/* AI Token Trend + Template Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* AI Token Trend — 6-month area chart */}
        <Card
          title="AI Token Consumption (6 Months)"
          actions={
            budget && (
              <span className="text-[0.65rem] font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(11,164,170,0.12)', color: '#0BA4AA', border: '1px solid rgba(11,164,170,0.3)' }}>
                {budget.requests} generations
              </span>
            )
          }
        >
          {aiTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={aiTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="aiGradTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0BA4AA" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0BA4AA" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="aiGradRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#F47A20" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F47A20" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={th.chart.gridStroke} />
                <XAxis dataKey="label" tick={{ fill: th.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="tokens"   tick={{ fill: th.chart.tickFill, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => fmtK(v)} />
                <YAxis yAxisId="requests" orientation="right" tick={{ fill: th.chart.tickFill, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TokenTooltip />} />
                <Legend wrapperStyle={{ color: th.chart.legendColor, fontSize: 11 }} />
                <Area yAxisId="tokens"   type="monotone" dataKey="tokens"   name="Tokens Used" stroke="#0BA4AA" fill="url(#aiGradTokens)"   strokeWidth={2.5} dot={{ fill: '#0BA4AA', r: 3 }} />
                <Area yAxisId="requests" type="monotone" dataKey="requests" name="Requests"    stroke="#F47A20" fill="url(#aiGradRequests)" strokeWidth={1.5} dot={{ fill: '#F47A20', r: 2 }} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center">
              <p className={`${th.textFaint} text-sm`}>No AI usage data yet</p>
            </div>
          )}
        </Card>

        {/* Template Breakdown */}
        <Card title="Generations by Template">
          {aiTemplates.length > 0 ? (
            <div className="space-y-3 py-1">
              {aiTemplates.map((tmpl, i) => {
                const maxCount = Math.max(...aiTemplates.map(t => t.count), 1);
                const pct = Math.round((tmpl.count / maxCount) * 100);
                const color = TMPL_COLORS[i % TMPL_COLORS.length];
                return (
                  <div key={tmpl.template}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`${th.textSm} text-xs font-medium`}>{tmpl.template}</span>
                      <div className="flex items-center gap-3">
                        <span className={`${th.textFaint} text-[0.65rem]`}>{tmpl.tokens.toLocaleString()} tkns</span>
                        <span className={`${th.textMd} text-xs font-semibold`}>{tmpl.count}×</span>
                      </div>
                    </div>
                    <div className={`h-2 ${th.s1} rounded-full overflow-hidden`}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Totals row */}
              <div className={`flex items-center justify-between pt-3 mt-1 border-t ${th.border}`}>
                <span className={`${th.textFaint} text-[0.65rem] font-semibold uppercase tracking-wider`}>Total</span>
                <div className="flex items-center gap-3">
                  <span className={`${th.textFaint} text-[0.65rem]`}>
                    {aiTemplates.reduce((s, t) => s + t.tokens, 0).toLocaleString()} tokens
                  </span>
                  <span className={`${th.textMd} text-xs font-semibold`}>
                    {aiTemplates.reduce((s, t) => s + t.count, 0)} gens
                  </span>
                </div>
              </div>
            </div>
          ) : aiLoading ? (
            <div className="h-60 flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-[#0BA4AA] border-t-transparent animate-spin" />
              <span className={`${th.textFaint} text-sm`}>Loading AI data…</span>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center">
              <p className={`${th.textFaint} text-sm`}>No generations yet — use the AI Content Studio to get started.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Team AI Usage table */}
      {aiTeam.length > 0 && (
        <Card
          title="Team AI Usage (All Time)"
          className="mb-6"
          actions={
            <span className={`${th.textFaint} text-[0.65rem]`}>
              <Users className="w-3 h-3 inline mr-1" />{aiTeam.length} contributor{aiTeam.length !== 1 ? 's' : ''}
            </span>
          }
        >
          <div className="space-y-3">
            {aiTeam.map((member, i) => {
              const pct  = Math.round((member.tokens / teamMax) * 100);
              const rank = i + 1;
              const rankColor =
                rank === 1 ? 'text-amber-400' :
                rank === 2 ? 'text-gray-400'  :
                rank === 3 ? 'text-[#F47A20]' : th.textFaint;

              return (
                <div key={member.name} className="flex items-center gap-3">
                  {/* Rank badge */}
                  <span className={`text-xs font-bold w-5 text-right shrink-0 ${rankColor}`}>
                    {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
                  </span>

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`${th.textSm} text-xs font-medium truncate`}>{member.name}</span>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className={`${th.textFaint} text-[0.65rem]`}>{member.requests} gens</span>
                        <span className={`${th.textMd} text-xs font-semibold tabular-nums`}>
                          {fmtK(member.tokens)} tokens
                        </span>
                      </div>
                    </div>
                    <div className={`h-2 ${th.s1} rounded-full overflow-hidden`}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: rank === 1
                            ? 'linear-gradient(90deg,#0BA4AA,#F47A20)'
                            : '#0BA4AA',
                          opacity: Math.max(0.4, 1 - i * 0.12),
                        }}
                      />
                    </div>
                  </div>

                  {/* Percentage */}
                  <span className={`${th.textFaint} text-[0.65rem] w-8 text-right shrink-0`}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Existing: Top Features Used ─────────────────────────────────────── */}
      {featureBreakdown.length > 0 && (
        <Card title="Top Features Used (Current Month)">
          <div className="space-y-3">
            {featureBreakdown.sort((a, b) => b.calls - a.calls).map((f, i) => {
              const max  = Math.max(...featureBreakdown.map(d => d.calls));
              const pct  = max > 0 ? Math.round((f.calls / max) * 100) : 0;
              const cols = ['bg-teal-500','bg-purple-500','bg-sky-500','bg-indigo-500','bg-emerald-500'];
              return (
                <div key={f.feature} className="flex items-center gap-3">
                  <Activity className={`w-4 h-4 ${th.textFaint} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`${th.textSm} text-xs font-medium`}>{f.feature}</span>
                      <span className={`${th.textMd} text-xs`}>{f.calls.toLocaleString()} calls</span>
                    </div>
                    <div className={`h-1.5 ${th.s1} rounded-full overflow-hidden`}>
                      <div className={`h-full ${cols[i % cols.length]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Existing: Period Summary ─────────────────────────────────────────── */}
      <Card title="Period Summary" className="mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { label: 'Billing Period', value: period                             },
            { label: 'Plan',           value: tenant?.plan ?? '—'                },
            { label: 'Monthly Cost',   value: `RM ${formatRM(tenant?.mrr ?? 0)}/mo` },
            { label: 'Active Since',   value: tenant?.createdAt ?? '—'           },
          ].map(s => (
            <div key={s.label} className={`${th.s1} rounded-xl p-3`}>
              <p className={`${th.textFaint} text-[0.65rem] uppercase tracking-wider mb-1`}>{s.label}</p>
              <p className={`${th.text} font-semibold text-sm`}>{s.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}