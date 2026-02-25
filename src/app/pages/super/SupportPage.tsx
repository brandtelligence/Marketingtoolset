import { useState, useEffect } from 'react';
import { ShieldAlert, Eye, Search, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { StatusBadge } from '../../components/saas/StatusBadge';
import { useOutletContext } from 'react-router';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { fetchTenants, fetchTenantUsers } from '../../utils/apiClient';

export function SupportPage() {
  const t = useDashboardTheme();
  const { impersonating, setImpersonating } = useOutletContext<{ impersonating: string | null; setImpersonating: (v: string | null) => void }>();
  const [query,   setQuery]   = useState('');
  const [tenants, setTenants] = useState<any[]>([]);
  const [users,   setUsers]   = useState<any[]>([]);

  useEffect(() => {
    Promise.all([fetchTenants(), fetchTenantUsers()]).then(([t, u]) => {
      setTenants(t); setUsers(u);
    });
  }, []);

  const filtered = tenants.filter(ten =>
    ten.name.toLowerCase().includes(query.toLowerCase()) ||
    ten.adminEmail.toLowerCase().includes(query.toLowerCase())
  );

  const startImpersonation = (tenantName: string) => {
    setImpersonating(tenantName);
    toast.warning(`⚠️ Impersonating "${tenantName}" — all actions are read-only and audited`);
  };

  return (
    <div>
      <PageHeader
        title="Support & Impersonation"
        subtitle="Read-only tenant session access for support purposes — all sessions are fully audited"
      />

      {/* Active impersonation */}
      {impersonating && (
        <div className="mb-6 bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-4">
          <ShieldAlert className="w-8 h-8 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-amber-600 font-semibold">Active Impersonation Session</p>
            <p className="text-amber-600/70 text-sm">You are viewing <strong>{impersonating}</strong> as a read-only administrator. All actions are logged.</p>
          </div>
          <PrimaryBtn variant="danger" size="sm" onClick={() => { setImpersonating(null); toast.success('Impersonation session ended'); }}>
            <UserX className="w-4 h-4" /> Exit
          </PrimaryBtn>
        </div>
      )}

      {/* Security Notice */}
      <Card className="mb-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-purple-500 shrink-0 mt-0.5" />
          <div>
            <p className={`${t.text} font-medium text-sm mb-1`}>Impersonation Policy</p>
            <ul className={`${t.textMd} text-xs space-y-1 list-disc list-inside`}>
              <li>Impersonation sessions are fully read-only — no data can be mutated.</li>
              <li>Every session start and end is recorded in the audit log with user, IP, and timestamp.</li>
              <li>Sessions automatically expire after 30 minutes of inactivity.</li>
              <li>The tenant's users are not notified of impersonation sessions.</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Tenant search */}
      <Card title="Select Tenant to View">
        <div className="relative mb-4">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textFaint}`} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search tenants by name or admin email…"
            className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none transition-all ${t.inputCls}`}
          />
        </div>
        <div className="space-y-2">
          {filtered.map(ten => {
            const tenantUsers = users.filter(u => u.tenantId === ten.id);
            const isActive = impersonating === ten.name;
            return (
              <div key={ten.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isActive ? 'bg-amber-500/15 border-amber-500/30' : `${t.s0} ${t.border} ${t.hoverBorder}`}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-600">{ten.name[0]}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`${t.text} font-medium`}>{ten.name}</p>
                      <StatusBadge status={ten.status} />
                      {isActive && <StatusBadge status="warning" label="Viewing Now" />}
                    </div>
                    <p className={`${t.textFaint} text-xs`}>{ten.adminEmail} · {tenantUsers.length} users · {ten.country}</p>
                  </div>
                </div>
                {isActive ? (
                  <PrimaryBtn size="sm" variant="ghost" onClick={() => { setImpersonating(null); toast.success('Session ended'); }}>
                    <UserX className="w-3.5 h-3.5" /> Exit
                  </PrimaryBtn>
                ) : (
                  <PrimaryBtn size="sm" variant="ghost" onClick={() => startImpersonation(ten.name)} disabled={ten.status === 'suspended'}>
                    <Eye className="w-3.5 h-3.5" /> View as Admin
                  </PrimaryBtn>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}