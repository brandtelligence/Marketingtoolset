import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { CreditCard, Users, Puzzle, AlertTriangle, UserPlus, FileText } from 'lucide-react';
import { PageHeader, Card, StatCard, PrimaryBtn } from '../../components/saas/SaasLayout';
import { StatusBadge } from '../../components/saas/StatusBadge';
import { useAuth } from '../../components/AuthContext';
import { formatRM } from '../../utils/format';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import {
  fetchTenants, fetchInvoices, fetchTenantUsers, fetchModules,
  type Tenant, type Invoice,
} from '../../utils/apiClient';

export function TenantOverviewPage() {
  const t = useDashboardTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tenant,   setTenant]   = useState<Tenant | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users,    setUsers]    = useState<any[]>([]);
  const [modules,  setModules]  = useState<any[]>([]);

  useEffect(() => {
    if (!user?.tenantId) return;
    const tid = user.tenantId;
    Promise.all([
      fetchTenants(),
      fetchInvoices(tid),
      fetchTenantUsers(tid),
      fetchModules(),
    ]).then(([tenants, invs, usrs, mods]) => {
      setTenant(tenants.find(ten => ten.id === tid) ?? null);
      setInvoices(invs);
      setUsers(usrs);
      setModules(mods);
    });
  }, [user?.tenantId]);

  if (!tenant) return (
    <div className="flex items-center justify-center h-64">
      <p className={`${t.textFaint} text-sm`}>Loading…</p>
    </div>
  );

  const unpaid    = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const entitledModules = modules.filter(m => tenant.moduleIds.includes(m.id));

  const quickActions = [
    { label: 'Invite User', icon: <UserPlus className="w-5 h-5" />, path: '/tenant/users', color: 'teal' },
    { label: 'Pay Invoice', icon: <CreditCard className="w-5 h-5" />, path: '/tenant/invoices', color: 'purple', badge: unpaid.length },
    { label: 'View Usage',  icon: <FileText className="w-5 h-5" />,  path: '/tenant/usage',    color: 'sky' },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.firstName} 👋`}
        subtitle={`${tenant.name} · ${tenant.plan} Plan`}
      />

      {/* Overdue warning */}
      {unpaid.some(i => i.status === 'overdue') && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-red-500/15 border border-red-500/30 rounded-2xl p-4 flex items-center gap-4"
        >
          <AlertTriangle className="w-7 h-7 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-red-600 font-semibold">⚠️ Overdue Invoice</p>
            <p className="text-red-600/70 text-sm">You have an overdue invoice. Please pay to avoid account suspension.</p>
          </div>
          <PrimaryBtn variant="danger" size="sm" onClick={() => navigate('/tenant/invoices')}>Pay Now</PrimaryBtn>
        </motion.div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Modules"  value={entitledModules.length}                                        color="teal"                                    icon={<Puzzle className="w-8 h-8" />} />
        <StatCard label="Team Members"    value={users.filter(u => u.status === 'active').length}       color="purple"                                  icon={<Users className="w-8 h-8" />} />
        <StatCard label="Unpaid Invoices" value={unpaid.length}                                         color={unpaid.length > 0 ? 'orange' : 'emerald'} icon={<CreditCard className="w-8 h-8" />} />
        <StatCard label="Monthly Cost"    value={`RM ${formatRM(tenant.mrr)}`}                                      color="sky"                                     icon={<CreditCard className="w-8 h-8" />} delta="/month" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card title="Quick Actions">
          <div className="space-y-2">
            {quickActions.map(a => (
              <button key={a.label} onClick={() => navigate(a.path)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl ${t.s0} border ${t.border} hover:border-teal-500/30 hover:bg-teal-500/10 transition-all text-left`}
              >
                <span className="text-teal-500">{a.icon}</span>
                <span className={`${t.text} text-sm font-medium flex-1`}>{a.label}</span>
                {a.badge ? <span className="px-1.5 py-0.5 bg-red-500/80 text-white text-[0.6rem] font-bold rounded-full">{a.badge}</span> : null}
              </button>
            ))}
          </div>
        </Card>

        {/* Active Modules */}
        <Card title="Your Modules">
          <div className="space-y-2">
            {entitledModules.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <span className="text-xl">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`${t.text} text-sm font-medium truncate`}>{m.name}</p>
                  <p className={`${t.textFaint} text-xs`}>RM {formatRM(m.basePrice)}/mo</p>
                </div>
                <StatusBadge status="enabled" />
              </div>
            ))}
            <button onClick={() => navigate('/tenant/modules')} className="w-full text-xs text-teal-500 hover:text-teal-600 transition-colors text-center py-1">
              Request module upgrade →
            </button>
          </div>
        </Card>

        {/* Recent Invoices */}
        <Card title="Recent Invoices">
          <div className="space-y-2">
            {invoices.slice(0, 4).map(inv => (
              <div key={inv.id} className={`flex items-center justify-between p-2.5 rounded-xl border ${inv.status === 'overdue' ? 'bg-red-500/10 border-red-500/20' : `${t.s0} ${t.border}`}`}>
                <div>
                  <p className={`${t.text} text-xs font-medium`}>{inv.invoiceNumber}</p>
                  <p className={`${t.textFaint} text-xs`}>{inv.period}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`${t.text} text-sm font-bold`}>RM {formatRM(inv.total)}</span>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
            <button onClick={() => navigate('/tenant/invoices')} className="w-full text-xs text-teal-500 hover:text-teal-600 transition-colors text-center py-1">
              View all invoices →
            </button>
          </div>
        </Card>
      </div>

      {/* Team */}
      <Card title="Team Members" className="mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {users.map(u => (
            <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl ${t.s0} border ${t.border}`}>
              <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-xs font-bold text-teal-600 shrink-0">{u.name[0]}</div>
              <div className="flex-1 min-w-0">
                <p className={`${t.text} text-sm font-medium truncate`}>{u.name}</p>
                <p className={`${t.textFaint} text-xs truncate`}>{u.email}</p>
              </div>
              <StatusBadge status={u.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}