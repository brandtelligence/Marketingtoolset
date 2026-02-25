import { useState, useEffect } from 'react';
import { Lock, Zap, ExternalLink, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { StatusBadge } from '../../components/saas/StatusBadge';
import { DrawerForm, Field, Textarea } from '../../components/saas/DrawerForm';
import { formatRM } from '../../utils/format';
import { useAuth } from '../../components/AuthContext';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { fetchTenants, fetchModules, fetchFeatures, type Module } from '../../utils/apiClient';

export function TenantModulesPage() {
  const t = useDashboardTheme();
  const { user } = useAuth();
  const [tenant, setTenant] = useState(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [features, setFeatures] = useState([]);

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

  if (!tenant) return null;

  const entitledModules = modules.filter(m => tenant.moduleIds.includes(m.id));
  const availableModules = modules.filter(m => !tenant.moduleIds.includes(m.id) && m.globalEnabled);
  const featuresForModule = (moduleId: string) => features.filter(f => f.moduleId === moduleId);

  const handleUpgradeRequest = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setUpgradeOpen(false);
    setUpgradeMsg('');
    toast.success('Upgrade request sent to your account manager!');
  };

  const ModuleCard = ({ m, entitled }: { m: Module; entitled: boolean }) => {
    const features = featuresForModule(m.id);
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
            {entitled
              ? <StatusBadge status="enabled" />
              : <div className={`flex items-center gap-1.5 ${t.textFaint} text-xs`}><Lock className="w-3 h-3" /> Not Entitled</div>
            }
          </div>
        </div>

        <p className={`${t.textMd} text-xs mb-4 leading-relaxed`}>{m.description}</p>

        {entitled && features.length > 0 && (
          <div className={`border-t ${t.border} pt-3 space-y-1.5`}>
            <p className={`${t.textFaint} text-[0.65rem] uppercase tracking-wider mb-2`}>Features</p>
            {features.map(f => (
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