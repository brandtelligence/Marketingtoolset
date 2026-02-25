import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { DataTable, Column } from '../../components/saas/DataTable';
import { StatusBadge, RoleBadge } from '../../components/saas/StatusBadge';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { fetchAuditLogs, type AuditLog } from '../../utils/apiClient';

export function AuditPage() {
  const t = useDashboardTheme();
  const [logs,           setLogs]           = useState<AuditLog[]>([]);
  const [loadingData,    setLoadingData]    = useState(true);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'info' | 'warning' | 'critical'>('all');
  const [roleFilter,     setRoleFilter]     = useState<'all' | 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'EMPLOYEE'>('all');

  useEffect(() => {
    setLoadingData(true);
    fetchAuditLogs().then(setLogs).catch(err => {
      console.error('[AuditPage] load error:', err);
      toast.error(`Failed to load audit logs: ${err.message}`);
    }).finally(() => setLoadingData(false));
  }, []);

  const filtered = logs.filter(a => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (roleFilter !== 'all' && a.actorRole !== roleFilter) return false;
    return true;
  });

  const columns: Column<AuditLog>[] = [
    {
      key: 'createdAt', header: 'Timestamp', sortable: true,
      render: a => <span className={`${t.textMd} text-xs font-mono whitespace-nowrap`}>{new Date(a.createdAt).toLocaleString()}</span>
    },
    {
      key: 'actorName', header: 'User', sortable: true,
      render: a => (
        <div className="flex items-center gap-2.5 min-w-[140px]">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-purple-600">
              {a.actorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <p className={`${t.text} text-sm font-medium leading-tight whitespace-nowrap`}>{a.actorName}</p>
            <RoleBadge role={a.actorRole} />
          </div>
        </div>
      )
    },
    { key: 'action', header: 'Action', render: a => <code className="text-purple-600 text-xs bg-purple-500/10 px-2 py-0.5 rounded">{a.action}</code> },
    { key: 'tenantName', header: 'Tenant', render: a => (
      a.tenantName ? (
        <div className="flex items-center gap-2.5 min-w-[140px]">
          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-orange-600">
              {a.tenantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <p className={`${t.text} text-sm font-medium leading-tight whitespace-nowrap`}>{a.tenantName}</p>
        </div>
      ) : (
        <span className={`${t.textFaint} text-sm`}>—</span>
      )
    )},
    {
      key: 'detail', header: 'Detail',
      render: a => <span className={`${t.textMd} text-xs max-w-[200px] block truncate`} title={a.detail}>{a.detail}</span>
    },
    { key: 'ip', header: 'IP', render: a => <span className={`${t.textFaint} text-xs font-mono`}>{a.ip}</span> },
    { key: 'severity', header: 'Severity', render: a => <StatusBadge status={a.severity} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="All sensitive actions performed by admins and tenant users"
        actions={
          <PrimaryBtn variant="ghost" onClick={() => toast.info('Exported to CSV')}><Download className="w-4 h-4" />Export</PrimaryBtn>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Critical', count: logs.filter(a => a.severity === 'critical').length, cls: 'bg-red-500/20 border-red-500/20 text-red-600' },
          { label: 'Warning',  count: logs.filter(a => a.severity === 'warning').length,  cls: 'bg-amber-500/20 border-amber-500/20 text-amber-600' },
          { label: 'Info',     count: logs.filter(a => a.severity === 'info').length,     cls: 'bg-sky-500/20 border-sky-500/20 text-sky-600' },
        ].map(s => (
          <div key={s.label} className={`${s.cls} border rounded-xl p-4 text-center`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs opacity-80 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap mb-4">
        <div className={`flex gap-1 ${t.tabBg} rounded-xl p-1`}>
          {(['all', 'info', 'warning', 'critical'] as const).map(s => (
            <button key={s} onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${severityFilter === s ? t.tabActive : t.tabInactive}`}
            >{s}</button>
          ))}
        </div>
        <div className={`flex gap-1 ${t.tabBg} rounded-xl p-1`}>
          {(['all', 'SUPER_ADMIN', 'TENANT_ADMIN', 'EMPLOYEE'] as const).map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${roleFilter === r ? t.tabActive : t.tabInactive}`}
            >{r === 'all' ? 'All Roles' : r.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns} data={filtered} keyField="id"
          searchPlaceholder="Search by action, user, tenant…"
          searchFields={['actorName', 'action', 'tenantName', 'detail']}
          pageSize={8}
          emptyTitle="No audit events" emptyDescription="No events match the current filters."
        />
      </Card>
    </div>
  );
}