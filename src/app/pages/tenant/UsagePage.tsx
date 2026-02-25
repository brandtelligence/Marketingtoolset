import { useState, useEffect } from 'react';
import { BarChart2, Activity } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PageHeader, Card, StatCard } from '../../components/saas/SaasLayout';
import { formatRM } from '../../utils/format';
import { useAuth } from '../../components/AuthContext';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { fetchUsageData, fetchTenants, type UsageDataPoint } from '../../utils/apiClient';

export function TenantUsagePage() {
  const t = useDashboardTheme();
  const { user } = useAuth();
  const [period,    setPeriod]    = useState('Recent');
  const [chartData, setChartData] = useState<UsageDataPoint[]>([]);
  const [tenant,    setTenant]    = useState<any>(null);

  useEffect(() => {
    if (!user?.tenantId) return;
    Promise.all([
      fetchUsageData(user.tenantId),
      fetchTenants(),
    ]).then(([data, tenants]) => {
      setChartData(data);
      setTenant(tenants.find(ten => ten.id === user.tenantId) ?? null);
    });
  }, [user?.tenantId]);

  const latest = chartData[chartData.length - 1];

  const featureBreakdown = [
    { feature: 'Post Scheduling', calls: Math.round((latest?.posts ?? 0) * 0.6) },
    { feature: 'Caption AI',      calls: Math.round((latest?.posts ?? 0) * 0.25) },
    { feature: 'Content Gen',     calls: Math.round((latest?.content ?? 0) * 0.7) },
    { feature: 'Analytics',       calls: Math.round((latest?.api ?? 0) * 0.15) },
    { feature: 'vCard View',      calls: Math.round((latest?.api ?? 0) * 0.1) },
  ].filter(d => d.calls > 0);

  const kpis = [
    { label: 'Posts Published', value: latest?.posts ?? 0,                    delta: '+18% vs last month', color: 'teal' as const },
    { label: 'Content Pieces',  value: latest?.content ?? 0,                  delta: '+12% vs last month', color: 'purple' as const },
    { label: 'API Calls',       value: (latest?.api ?? 0).toLocaleString(),   delta: '+24% vs last month', color: 'sky' as const },
    { label: 'Active Users',    value: latest?.users ?? 0,                    delta: `${tenant?.size ?? '—'} team`, color: 'emerald' as const },
  ];

  const tooltipStyle = {
    backgroundColor: t.chart.tooltipBg,
    border: t.chart.tooltipBorder,
    borderRadius: 12,
    color: t.chart.tooltipColor,
    fontSize: 12,
  };

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
          className={`border rounded-lg px-3 py-2 text-sm focus:outline-none ${t.selectCls}`}
        >
          {['Recent', 'Feb 2025', 'Jan 2025', 'Dec 2024', 'Nov 2024', 'Oct 2024'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {kpis.map(k => (
          <StatCard key={k.label} label={k.label} value={k.value} delta={k.delta} color={k.color} icon={<BarChart2 className="w-8 h-8" />} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Activity Trend */}
        <Card title="Activity Trend (Last 7 Months)">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tenGradPosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="tenGradContent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={t.chart.gridStroke} />
              <XAxis dataKey="period" tick={{ fill: t.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: t.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: t.chart.legendColor, fontSize: 12 }} />
              <Area type="monotone" dataKey="posts" name="Posts" stroke="#14b8a6" fill="url(#tenGradPosts)" strokeWidth={2} />
              <Area type="monotone" dataKey="content" name="Content" stroke="#a855f7" fill="url(#tenGradContent)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* API Calls */}
        <Card title="API Calls Trend">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.chart.gridStroke} />
              <XAxis dataKey="period" tick={{ fill: t.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: t.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="api" name="API Calls" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Feature breakdown */}
      {featureBreakdown.length > 0 && (
        <Card title="Top Features Used (Current Month)">
          <div className="space-y-3">
            {featureBreakdown.sort((a, b) => b.calls - a.calls).map((f, i) => {
              const max = Math.max(...featureBreakdown.map(d => d.calls));
              const pct = max > 0 ? Math.round((f.calls / max) * 100) : 0;
              const colors = ['bg-teal-500', 'bg-purple-500', 'bg-sky-500', 'bg-indigo-500', 'bg-emerald-500'];
              return (
                <div key={f.feature} className="flex items-center gap-3">
                  <Activity className={`w-4 h-4 ${t.textFaint} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`${t.textSm} text-xs font-medium`}>{f.feature}</span>
                      <span className={`${t.textMd} text-xs`}>{f.calls.toLocaleString()} calls</span>
                    </div>
                    <div className={`h-1.5 ${t.s1} rounded-full overflow-hidden`}>
                      <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Usage summary */}
      <Card title="Period Summary" className="mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { label: 'Billing Period', value: period },
            { label: 'Plan',           value: tenant?.plan ?? '—' },
            { label: 'Monthly Cost',   value: `RM ${formatRM(tenant?.mrr ?? 0)}/mo` },
            { label: 'Active Since',   value: tenant?.createdAt ?? '—' },
          ].map(s => (
            <div key={s.label} className={`${t.s1} rounded-xl p-3`}>
              <p className={`${t.textFaint} text-[0.65rem] uppercase tracking-wider mb-1`}>{s.label}</p>
              <p className={`${t.text} font-semibold text-sm`}>{s.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}