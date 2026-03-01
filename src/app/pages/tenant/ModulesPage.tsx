import { useState, useEffect } from 'react';
import { Lock, Zap, ExternalLink, MessageSquare, Bell, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { StatusBadge } from '../../components/saas/StatusBadge';
import { DrawerForm, Field, Textarea } from '../../components/saas/DrawerForm';
import { formatRM } from '../../utils/format';
import { useAuth } from '../../components/AuthContext';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import {
  fetchTenants, fetchModules, fetchFeatures,
  fetchModuleRequests, updateModuleRequest,
  type Module, type ModuleRequest,
} from '../../utils/apiClient';
import { getAuthHeaders } from '../../utils/authHeaders';
import { projectId } from '/utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

export function TenantModulesPage() {
  const t = useDashboardTheme();
  const { user } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [features, setFeatures] = useState([]);
  const [requests, setRequests] = useState<ModuleRequest[]>([]);

  useEffect(() => {
    const fetchTenantData = async () => {
      const tenants = await fetchTenants();
      const tenantData = tenants.find(ten => ten.id === user?.tenantId);
      setTenant(tenantData);
    };
    fetchTenantData();
  }, [user?.tenantId]);

  useEffect(() => {
    const fetchModuleData = async () => {
      const moduleData = await fetchModules();
      setModules(moduleData);
    };
    fetchModuleData();
  }, []);

  useEffect(() => {
    const fetchFeatureData = async () => {
      const featureData = await fetchFeatures();
      setFeatures(featureData);
    };
    fetchFeatureData();
  }, []);

  useEffect(() => {
    if (!user?.tenantId) return;
    fetchModuleRequests(user.tenantId)
      .then(setRequests)
      .catch(err => console.error('[TenantModulesPage] failed to load module requests:', err));
  }, [user?.tenantId]);

  if (!tenant) return null;

  const entitledModules  = modules.filter(m => tenant.moduleIds.includes(m.id));
  const availableModules = modules.filter(m => !tenant.moduleIds.includes(m.id) && m.globalEnabled);
  const featuresForModule = (moduleId: string) => features.filter(f => f.moduleId === moduleId);

  const pendingRequests = requests.filter(r => r.status === 'pending');

  const handleUpgradeRequest = async () => {
    if (!upgradeMsg.trim()) {
      toast.error('Please add a note about your upgrade requirements');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/upgrade-requests`, {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          tenantId: user?.tenantId,
          tenantName: tenant?.name ?? '',
          message: upgradeMsg,
          currentModules: entitledModules.map(m => ({ id: m.id, name: m.name })),
          availableModules: availableModules.map(m => ({ id: m.id, name: m.name })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit upgrade request');
      toast.success('Upgrade request sent to your account manager!');
      setUpgradeOpen(false);
      setUpgradeMsg('');
    } catch (err: any) {
      console.error('[TenantModulesPage] upgrade-request error:', err);
      toast.error(`Request failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (req: ModuleRequest, status: 'approved' | 'dismissed') => {
    try {
      await updateModuleRequest(req.id, { status });
      setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status } : r));
      toast.success(status === 'approved'
        ? `Request for "${req.moduleName}" approved — contact Brandtelligence to activate.`
        : `Request dismissed.`
      );
    } catch (err: any) {
      toast.error(`Failed to update request: ${err.message}`);
    }
  };

  const ModuleCard = ({ m, entitled }: { m: Module; entitled: boolean }) => {
    const feats = featuresForModule(m.id);
    const moduleRequests = requests.filter(r => r.moduleId === m.id && r.status === 'pending');
    return (
      <div className={`rounded-2xl border p-5 transition-all ${
        entitled ? 'bg-teal-500/10 border-teal-500/20' : `${t.s0} ${t.border} opacity-60`
      }`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${entitled ? 'bg-teal-500/20' : t.s1}`}>
              {m.icon}
            </div>
            <div>
              <p className={`${t.text} font-semibold text-sm`}>{m.name}</p>
              <p className={`${t.textFaint} text-xs`}>RM {formatRM(m.basePrice)}/mo</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {moduleRequests.length > 0 && (
              <span className="flex items-center gap-1 text-[0.6rem] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                <Bell className="w-2.5 h-2.5" /> {moduleRequests.length} request{moduleRequests.length > 1 ? 's' : ''}
              </span>
            )}
            {entitled
              ? <StatusBadge status="enabled" />
              : <div className={`flex items-center gap-1.5 ${t.textFaint} text-xs`}><Lock className="w-3 h-3" /> Not Entitled</div>
            }
          </div>
        </div>

        <p className={`${t.textMd} text-xs mb-4 leading-relaxed`}>{m.description}</p>

        {entitled && feats.length > 0 && (
          <div className={`border-t ${t.border} pt-3 space-y-1.5`}>
            <p className={`${t.textFaint} text-[0.65rem] uppercase tracking-wider mb-2`}>Features</p>
            {feats.map(f => (
              <div key={f.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Zap className={`w-3.5 h-3.5 ${f.globalEnabled ? 'text-teal-500' : t.textFaint}`} />
                  <span className={`${t.textSm} text-xs`}>{f.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`${t.textFaint} text-[0.6rem]`}>{f.rolloutNote}</span>
                  <StatusBadge status={f.globalEnabled ? 'enabled' : 'disabled'} dot={false} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Modules & Entitlements"
        subtitle={`${entitledModules.length} active module${entitledModules.length !== 1 ? 's' : ''} · ${tenant.plan} Plan`}
        actions={
          <PrimaryBtn variant="teal" onClick={() => setUpgradeOpen(true)}>
            <ExternalLink className="w-4 h-4" /> Request Upgrade
          </PrimaryBtn>
        }
      />

      {/* ── Employee Module Requests ────────────────────────────────────────── */}
      {pendingRequests.length > 0 && (
        <Card
          title={`Staff Module Requests (${pendingRequests.length})`}
          className="mb-6"
          actions={
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <Bell className="w-3.5 h-3.5" /> {pendingRequests.length} pending
            </span>
          }
        >
          <div className="space-y-3">
            {pendingRequests.map(req => (
              <div key={req.id} className={`flex items-start gap-3 p-3 rounded-xl ${t.s0} border ${t.border}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${t.s1} shrink-0`}>
                  {req.moduleIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className={`${t.text} text-sm font-medium`}>{req.moduleName}</p>
                    <span className="flex items-center gap-1 text-[0.6rem] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                      <Clock className="w-2.5 h-2.5" /> Pending
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <User className={`w-3 h-3 ${t.textFaint}`} />
                    <span className={`${t.textFaint} text-xs`}>{req.requesterName} · {req.requesterEmail}</span>
                  </div>
                  {req.useCase && (
                    <p className={`${t.textMd} text-xs italic leading-relaxed`}>"{req.useCase}"</p>
                  )}
                  <p className={`${t.textFaint} text-[0.65rem] mt-1`}>{new Date(req.createdAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleRequestAction(req, 'approved')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-500 text-xs hover:bg-teal-500/30 transition-colors"
                  >
                    <CheckCircle className="w-3 h-3" /> Approve
                  </button>
                  <button
                    onClick={() => handleRequestAction(req, 'dismissed')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
                  >
                    <XCircle className="w-3 h-3" /> Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Active modules ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className={`${t.textMd} text-xs uppercase tracking-wider mb-3 flex items-center gap-2`}>
          <StatusBadge status="enabled" dot /> Your Active Modules ({entitledModules.length})
        </h2>
        {entitledModules.length === 0 ? (
          <Card><p className={`${t.textFaint} text-sm text-center py-8`}>No modules assigned yet. Contact your account manager.</p></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entitledModules.map(m => <ModuleCard key={m.id} m={m} entitled />)}
          </div>
        )}
      </div>

      {availableModules.length > 0 && (
        <div>
          <h2 className={`${t.textMd} text-xs uppercase tracking-wider mb-3 flex items-center gap-2`}>
            <Lock className="w-3 h-3" /> Available Upgrades ({availableModules.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableModules.map(m => <ModuleCard key={m.id} m={m} entitled={false} />)}
          </div>
          <div className="mt-4 text-center">
            <PrimaryBtn variant="ghost" onClick={() => setUpgradeOpen(true)}>
              <MessageSquare className="w-4 h-4" /> Request access to additional modules →
            </PrimaryBtn>
          </div>
        </div>
      )}

      <DrawerForm
        open={upgradeOpen} onClose={() => setUpgradeOpen(false)} width="sm"
        title="Request Module Upgrade"
        subtitle={`For ${tenant.name} — ${tenant.plan} Plan`}
        footer={
          <>
            <PrimaryBtn variant="ghost" onClick={() => setUpgradeOpen(false)}>Cancel</PrimaryBtn>
            <PrimaryBtn variant="teal" onClick={handleUpgradeRequest} loading={loading}>
              <MessageSquare className="w-4 h-4" /> Send Request
            </PrimaryBtn>
          </>
        }
      >
        <div className={`${t.s1} border ${t.border} rounded-xl p-4 text-sm`}>
          <p className={`${t.textMd} text-xs mb-3`}>Currently active</p>
          <div className="flex flex-wrap gap-2">
            {entitledModules.map(m => (
              <span key={m.id} className="px-2 py-1 bg-teal-500/20 border border-teal-500/30 rounded-full text-teal-600 text-xs">
                {m.icon} {m.name}
              </span>
            ))}
          </div>
        </div>

        <Field label="Which modules are you interested in?" required>
          <div className="space-y-2">
            {availableModules.map(m => (
              <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl ${t.s0} border ${t.border} cursor-pointer ${t.hoverBorder} transition-colors`}>
                <span className="text-lg">{m.icon}</span>
                <div className="flex-1">
                  <p className={`${t.text} text-sm font-medium`}>{m.name}</p>
                  <p className={`${t.textFaint} text-xs`}>RM {formatRM(m.basePrice)}/mo</p>
                </div>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Additional notes">
          <Textarea value={upgradeMsg} onChange={e => setUpgradeMsg(e.target.value)} placeholder="Tell us about your use case or special requirements…" rows={3} />
        </Field>

        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 text-xs text-sky-600">
          📧 Your request will be reviewed by the Brandtelligence team within 1 business day.
        </div>
      </DrawerForm>
    </div>
  );
}