import { useState, useEffect } from 'react';
import { Building2, Users, CreditCard, ToggleLeft, ToggleRight, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn, StatCard } from '../../components/saas/SaasLayout';
import { DataTable, Column } from '../../components/saas/DataTable';
import { StatusBadge } from '../../components/saas/StatusBadge';
import { DrawerForm, Field, Select, ConfirmDialog } from '../../components/saas/DrawerForm';
import { RoleBadge } from '../../components/saas/StatusBadge';
import { useOutletContext } from 'react-router';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { formatRM } from '../../utils/format';
import {
  fetchTenants, updateTenant, fetchModules, fetchTenantUsers, fetchInvoices,
  type Tenant, type TenantStatus,
} from '../../utils/apiClient';

type TabKey = 'overview' | 'modules' | 'users' | 'invoices';

export function TenantsPage() {
  const t = useDashboardTheme();
  const [tenants,      setTenants]      = useState<Tenant[]>([]);
  const [allModules,   setAllModules]   = useState<any[]>([]);
  const [drawerUsers,  setDrawerUsers]  = useState<any[]>([]);
  const [drawerInvoices, setDrawerInvoices] = useState<any[]>([]);
  const [selected,     setSelected]     = useState<Tenant | null>(null);
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [activeTab,    setActiveTab]    = useState<TabKey>('overview');
  const [suspendDialog, setSuspendDialog] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const { setImpersonating } = useOutletContext<{ impersonating: string | null; setImpersonating: (v: string | null) => void }>();

  useEffect(() => {
    Promise.all([fetchTenants(), fetchModules()]).then(([t, m]) => {
      setTenants(t); setAllModules(m);
    });
  }, []);

  const openTenant = async (ten: Tenant) => {
    setSelected(ten); setActiveTab('overview'); setDrawerOpen(true);
    const [users, invoices] = await Promise.all([
      fetchTenantUsers(ten.id), fetchInvoices(ten.id),
    ]);
    setDrawerUsers(users); setDrawerInvoices(invoices);
  };

  const handleToggleModule = async (tenantId: string, moduleId: string) => {
    const ten = tenants.find(t => t.id === tenantId);
    if (!ten) return;
    const has = ten.moduleIds.includes(moduleId);
    const newIds = has ? ten.moduleIds.filter(m => m !== moduleId) : [...ten.moduleIds, moduleId];
    try {
      await updateTenant(tenantId, { moduleIds: newIds });
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, moduleIds: newIds } : t));
      setSelected(prev => prev?.id === tenantId ? { ...prev, moduleIds: newIds } : prev);
      const m = allModules.find(m => m.id === moduleId);
      toast.success(`Module "${m?.name}" ${has ? 'disabled' : 'enabled'} for ${ten.name}`);
    } catch (err: any) { toast.error(`Toggle failed: ${err.message}`); }
  };

  const handleSuspend = async () => {
    if (!selected) return;
    setLoading(true);
    const newStatus: TenantStatus = selected.status === 'suspended' ? 'active' : 'suspended';
    try {
      await updateTenant(selected.id, { status: newStatus });
      setTenants(prev => prev.map(ten => ten.id === selected.id ? { ...ten, status: newStatus } : ten));
      setSelected(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Tenant ${selected.name} ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}`);
      setSuspendDialog(false);
    } catch (err: any) { toast.error(`Update failed: ${err.message}`); }
    finally { setLoading(false); }
  };

  const columns: Column<Tenant>[] = [
    {
      key: 'name', header: 'Tenant', sortable: true,
      render: ten => (
        <div className="flex items-center gap-3">
          {ten.logoUrl
            ? <img src={ten.logoUrl} alt={ten.name} className="w-7 h-7 rounded-lg object-cover" />
            : <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-600">{ten.name[0]}</div>
          }
          <div>
            <p className={`font-medium ${t.text}`}>{ten.name}</p>
            <p className={`${t.textFaint} text-xs`}>{ten.country} · {ten.size}</p>
          </div>
        </div>
      ),
    },
    { key: 'plan', header: 'Plan', sortable: true, render: ten => <span className={t.textSm}>{ten.plan}</span> },
    { key: 'mrr', header: 'MRR', sortable: true, render: ten => <span className="text-emerald-600 font-medium">RM {formatRM(ten.mrr)}/mo</span> },
    { key: 'status', header: 'Status', render: ten => <StatusBadge status={ten.status} /> },
    { key: 'createdAt', header: 'Since', sortable: true, render: ten => <span className={`${t.textFaint} text-xs`}>{ten.createdAt}</span> },
    {
      key: 'actions', header: '',
      render: ten => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => openTenant(ten)} className={`p-1.5 rounded-lg ${t.hover} ${t.textMd}`} title="View"><Eye className="w-4 h-4" /></button>
          <button onClick={() => { setSelected(ten); setImpersonating(ten.name); toast.info(`Impersonating ${ten.name} (read-only)`); }}
            className="p-1.5 rounded-lg hover:bg-amber-500/20 text-amber-500" title="Impersonate">
            <Users className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const tenantUsers    = drawerUsers;
  const tenantInvoices = drawerInvoices;
  const totalMRR = tenants.filter(ten => ten.status === 'active').reduce((s, ten) => s + ten.mrr, 0);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'modules', label: 'Modules' },
    { key: 'users', label: `Users (${tenantUsers.length})` },
    { key: 'invoices', label: `Invoices (${tenantInvoices.length})` },
  ];

  return (
    <div>
      <PageHeader title="Tenants" subtitle="Manage all tenant accounts across the platform" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Tenants" value={tenants.length} icon={<Building2 className="w-8 h-8" />} />
        <StatCard label="Active" value={tenants.filter(ten => ten.status === 'active').length} color="emerald" icon={<Building2 className="w-8 h-8" />} />
        <StatCard label="Suspended" value={tenants.filter(ten => ten.status === 'suspended').length} color="orange" icon={<AlertTriangle className="w-8 h-8" />} />
        <StatCard label="Total MRR" value={`RM ${formatRM(totalMRR)}`} color="teal" icon={<CreditCard className="w-8 h-8" />} />
      </div>

      <Card>
        <DataTable
          columns={columns} data={tenants} keyField="id"
          onRowClick={openTenant}
          searchPlaceholder="Search tenants…"
          searchFields={['name', 'country', 'plan', 'adminEmail']}
        />
      </Card>

      {/* Tenant Detail Drawer */}
      <DrawerForm
        open={drawerOpen} onClose={() => setDrawerOpen(false)} width="lg"
        title={selected?.name ?? ''}
        subtitle={`${selected?.plan} Plan · ${selected?.country} · ${selected?.size} employees`}
        footer={
          <div className="flex gap-2 w-full">
            <PrimaryBtn variant={selected?.status === 'suspended' ? 'teal' : 'danger'} onClick={() => setSuspendDialog(true)}>
              {selected?.status === 'suspended' ? '✅ Reactivate' : '⏸ Suspend'}
            </PrimaryBtn>
            <div className="flex-1" />
            <PrimaryBtn variant="ghost" onClick={() => setDrawerOpen(false)}>Close</PrimaryBtn>
          </div>
        }
      >
        {selected && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className={`flex gap-1 ${t.tabBg} rounded-xl p-1`}>
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === tab.key ? t.tabActive : t.tabInactive}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-3">
                <StatusBadge status={selected.status} size="md" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Admin', selected.adminName], ['Admin Email', selected.adminEmail],
                    ['MRR', `RM ${formatRM(selected.mrr)}/mo`], ['Created', selected.createdAt],
                    ['Tax ID', selected.taxId || '—'], ['Address', selected.billingAddress],
                  ].map(([k, v]) => (
                    <div key={k} className={`${t.s1} rounded-xl p-3`}>
                      <p className={`${t.textFaint} text-xs mb-1`}>{k}</p>
                      <p className={`${t.text} text-sm font-medium break-all`}>{v}</p>
                    </div>
                  ))}
                </div>
                {selected.suspendedReason && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                    <p className="text-orange-500 text-xs mb-1">Suspension Reason</p>
                    <p className="text-orange-600 text-sm">{selected.suspendedReason}</p>
                  </div>
                )}
              </div>
            )}

            {/* Modules */}
            {activeTab === 'modules' && (
              <div className="space-y-2">
                {allModules.map(m => {
                  const enabled = selected.moduleIds.includes(m.id);
                  return (
                    <div key={m.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${enabled ? 'bg-purple-500/10 border-purple-500/30' : `${t.s0} ${t.border}`}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{m.icon}</span>
                        <div>
                          <p className={`${t.text} text-sm font-medium`}>{m.name}</p>
                          <p className={`${t.textFaint} text-xs`}>RM {formatRM(m.basePrice)}/mo</p>
                        </div>
                      </div>
                      <button onClick={() => handleToggleModule(selected.id, m.id)} className="transition-colors">
                        {enabled
                          ? <ToggleRight className="w-7 h-7 text-purple-500" />
                          : <ToggleLeft className={`w-7 h-7 ${t.textFaint}`} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Users */}
            {activeTab === 'users' && (
              <div className="space-y-2">
                {tenantUsers.length === 0 && <p className={`${t.textFaint} text-sm text-center py-8`}>No users found</p>}
                {tenantUsers.map(u => (
                  <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl ${t.s1} border ${t.border}`}>
                    <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-xs font-bold text-teal-600">
                      {u.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`${t.text} text-sm font-medium truncate`}>{u.name}</p>
                      <p className={`${t.textFaint} text-xs truncate`}>{u.email}</p>
                    </div>
                    <RoleBadge role={u.role} />
                    <StatusBadge status={u.status} />
                  </div>
                ))}
              </div>
            )}

            {/* Invoices */}
            {activeTab === 'invoices' && (
              <div className="space-y-2">
                {tenantInvoices.length === 0 && <p className={`${t.textFaint} text-sm text-center py-8`}>No invoices yet</p>}
                {tenantInvoices.map(inv => (
                  <div key={inv.id} className={`flex items-center justify-between p-3 rounded-xl ${t.s1} border ${t.border}`}>
                    <div>
                      <p className={`${t.text} text-sm font-medium`}>{inv.invoiceNumber}</p>
                      <p className={`${t.textFaint} text-xs`}>{inv.period} · Due {inv.dueDate}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`${t.text} font-bold`}>RM {formatRM(inv.total)}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DrawerForm>

      <ConfirmDialog
        open={suspendDialog} onClose={() => setSuspendDialog(false)} onConfirm={handleSuspend}
        title={selected?.status === 'suspended' ? `Reactivate ${selected?.name}?` : `Suspend ${selected?.name}?`}
        description={selected?.status === 'suspended'
          ? 'This will restore the tenant\'s access to all subscribed modules.'
          : 'All users will lose access immediately. Invoices will continue to accrue.'}
        confirmLabel={selected?.status === 'suspended' ? 'Reactivate' : 'Suspend'}
        confirmVariant={selected?.status === 'suspended' ? 'primary' : 'danger'}
        loading={loading}
      />
    </div>
  );
}