import { useState, useEffect } from 'react';
import { BarChart2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PageHeader, Card, StatCard } from '../../components/saas/SaasLayout';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { fetchUsageData, fetchTenants, type UsageDataPoint } from '../../utils/apiClient';

export function UsagePage() {
  const t = useDashboardTheme();
  const [period,       setPeriod]       = useState('Recent');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [tenants,      setTenants]      = useState<any[]>([]);
  const [chartData,    setChartData]    = useState<UsageDataPoint[]>([]);

  useEffect(() => {
    fetchTenants().then(setTenants);
  }, []);

  useEffect(() => {
    fetchUsageData(tenantFilter === 'all' ? undefined : tenantFilter)
      .then(setChartData);
  }, [tenantFilter]);

  const latest = chartData[chartData.length - 1];
  const activeTenants = tenants.filter(ten => ten.status === 'active');

  const byTenantData = tenants.map(ten => ({
    name: ten.name.split(' ')[0],
    posts: tenantFilter === 'all' ? Math.round((chartData.find(dp => dp.tenantId === ten.id)?.posts ?? 0)) : 0,
    users: chartData.find(dp => dp.tenantId === ten.id)?.users ?? 0,
  }));

  const tooltipStyle = {
    backgroundColor: t.chart.tooltipBg,
    border: t.chart.tooltipBorder,
    borderRadius: 12,
    color: t.chart.tooltipColor,
    fontSize: 12,
  };

  return (
    <div>
      <PageHeader title="Usage Analytics" subtitle="Platform-wide usage across all tenants and modules" />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap mb-6">
        <select
          value={tenantFilter}
          onChange={e => setTenantFilter(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm focus:outline-none ${t.selectCls}`}
        >
          <option value="all">All Tenants</option>
          {activeTenants.map(ten => <option key={ten.id} value={ten.id}>{ten.name}</option>)}
        </select>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm focus:outline-none ${t.selectCls}`}
        >
          {['Recent', 'Feb 2025', 'Jan 2025', 'Dec 2024', 'Nov 2024'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Posts Published" value={latest?.posts ?? 0} delta="+21% vs last month" color="purple" icon={<BarChart2 className="w-8 h-8" />} />
        <StatCard label="Content Pieces" value={latest?.content ?? 0} delta="+18% vs last month" color="teal" icon={<BarChart2 className="w-8 h-8" />} />
        <StatCard label="API Calls" value={(latest?.api ?? 0).toLocaleString()} delta="+27% vs last month" color="sky" icon={<BarChart2 className="w-8 h-8" />} />
        <StatCard label="Active Users" value={latest?.users ?? 0} delta="+12 this month" color="emerald" icon={<BarChart2 className="w-8 h-8" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Activity Trend */}
        <Card title="Activity Trend (Last 7 Months)">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradContent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={t.chart.gridStroke} />
              <XAxis dataKey="period" tick={{ fill: t.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: t.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: t.chart.legendColor, fontSize: 12 }} />
              <Area type="monotone" dataKey="posts" name="Posts" stroke="#a855f7" fill="url(#gradPosts)" strokeWidth={2} />
              <Area type="monotone" dataKey="content" name="Content" stroke="#14b8a6" fill="url(#gradContent)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* API Usage */}
        <Card title="API Calls Trend">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.chart.gridStroke} />
              <XAxis dataKey="period" tick={{ fill: t.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: t.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="api" name="API Calls" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Per-Tenant breakdown */}
      {tenantFilter === 'all' && (
        <Card title="Posts by Tenant (Current Month)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byTenantData.filter(d => d.posts > 0)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.chart.gridStroke} horizontal={false} />
              <XAxis type="number" tick={{ fill: t.chart.tickFill, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: t.chart.tickFillAlt, fontSize: 11 }} width={80} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="posts" name="Posts" fill="#a855f7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}