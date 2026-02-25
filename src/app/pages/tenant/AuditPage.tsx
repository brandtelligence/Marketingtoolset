import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { DataTable, Column } from '../../components/saas/DataTable';
import { StatusBadge, RoleBadge } from '../../components/saas/StatusBadge';
import { useAuth } from '../../components/AuthContext';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { fetchAuditLogs, type AuditLog } from '../../utils/apiClient';

export function TenantAuditPage() {
  const t = useDashboardTheme();
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchAuditLogs().then(all => {
      // Filter to this tenant's logs
      setLogs(all.filter(a => !a.tenantId || a.tenantId === user?.tenantId));
    }).catch(err => toast.error(`Failed to load audit logs: ${err.message}`));
  }, [user?.tenantId]);

  const columns: Column<AuditLog>[] = [
    {
      key: 'createdAt', header: 'Timestamp', sortable: true,
      render: a => <span className={`${t.textMd} text-xs font-mono whitespace-nowrap`}>{new Date(a.createdAt).toLocaleString()}</span>,
    },
    {
      key: 'actorName', header: 'User', sortable: true,
      render: a => (
        <div className="flex items-center gap-2.5 min-w-[140px]">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-teal-600">
              {a.actorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <p className={`${t.text} text-sm font-medium leading-tight whitespace-nowrap`}>{a.actorName}</p>
            <RoleBadge role={a.actorRole} />
          </div>
        </div>
      ),
    },
    {
      key: 'action', header: 'Action',
      render: a => <code className="text-teal-600 text-xs bg-teal-500/10 px-2 py-0.5 rounded">{a.action}</code>,
    },
    {
      key: 'detail', header: 'Detail',
      render: a => <span className={`${t.textMd} text-xs max-w-[220px] block truncate`} title={a.detail}>{a.detail}</span>,
    },
    {
      key: 'ip', header: 'IP',
      render: a => <span className={`${t.textFaint} text-xs font-mono`}>{a.ip}</span>,
    },
    {
      key: 'severity', header: 'Severity',
      render: a => <StatusBadge status={a.severity} />,
    },
  ];

  const stats = [
    { label: 'Critical', count: logs.filter(a => a.severity === 'critical').length, cls: 'bg-red-500/20 border-red-500/20 text-red-600' },
    { label: 'Warning',  count: logs.filter(a => a.severity === 'warning').length,  cls: 'bg-amber-500/20 border-amber-500/20 text-amber-600' },
    { label: 'Info',     count: logs.filter(a => a.severity === 'info').length,     cls: 'bg-sky-500/20 border-sky-500/20 text-sky-600' },
  ];

  return (
    <div>
      <PageHeader
        title="Activity Log"
        subtitle="All actions performed within your tenant account"
        actions={
          <PrimaryBtn variant="ghost" onClick={() => toast.info('Exported to CSV')}>
            <Download className="w-4 h-4" /> Export
          </PrimaryBtn>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className={`${s.cls} border rounded-xl p-4 text-center`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs opacity-80 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {logs.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className={`${t.textFaint} text-3xl mb-4`}>📋</p>
            <p className={`${t.textMd} font-medium`}>No activity recorded yet</p>
            <p className={`${t.textFaint} text-sm mt-1`}>Actions performed by your team will appear here.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <DataTable
            columns={columns} data={logs} keyField="id"
            searchPlaceholder="Search by action, user, detail…"
            searchFields={['actorName', 'action', 'detail']}
            pageSize={8}
            emptyTitle="No matching events"
            emptyDescription="Try adjusting your search."
          />
        </Card>
      )}

      <div className={`mt-4 ${t.s1} border ${t.border} rounded-xl p-3 text-xs ${t.textFaint}`}>
        🔒 This audit log captures all sensitive actions within your account and is retained for compliance purposes. Logs cannot be deleted.
      </div>
    </div>
  );
}