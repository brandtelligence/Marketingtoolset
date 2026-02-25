import { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Puzzle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card } from '../../components/saas/SaasLayout';
import { StatusBadge } from '../../components/saas/StatusBadge';
import { formatRM } from '../../utils/format';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { fetchModules, fetchFeatures, updateModule, updateFeature, type Module, type Feature } from '../../utils/apiClient';

export function ModulesPage() {
  const t = useDashboardTheme();
  const [modules,  setModules]  = useState<Module[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    Promise.all([fetchModules(), fetchFeatures()]).then(([m, f]) => {
      setModules(m); setFeatures(f);
    }).catch(err => toast.error(`Failed to load modules: ${err.message}`));
  }, []);

  const toggleModule = async (id: string) => {
    const m = modules.find(m => m.id === id);
    if (!m) return;
    const next = !m.globalEnabled;
    try {
      await updateModule(id, { globalEnabled: next });
      setModules(prev => prev.map(m => m.id === id ? { ...m, globalEnabled: next } : m));
      toast.success(`Module "${m.name}" ${next ? 'enabled' : 'disabled'} globally`);
    } catch (err: any) { toast.error(`Update failed: ${err.message}`); }
  };

  const toggleFeature = async (id: string) => {
    const f = features.find(f => f.id === id);
    if (!f) return;
    const next = !f.globalEnabled;
    try {
      await updateFeature(id, { globalEnabled: next });
      setFeatures(prev => prev.map(f => f.id === id ? { ...f, globalEnabled: next } : f));
      toast.success(`Feature "${f.name}" ${next ? 'enabled' : 'disabled'} globally`);
    } catch (err: any) { toast.error(`Update failed: ${err.message}`); }
  };

  const categoryLabels: Record<string, string> = { core: '🏗 Core', marketing: '📢 Marketing', analytics: '📊 Analytics', communication: '📬 Communication' };
  const categories = Array.from(new Set(modules.map(m => m.category)));

  return (
    <div>
      <PageHeader
        title="Modules & Features"
        subtitle="Global toggles apply to all tenants. Per-tenant overrides are managed from Tenant Detail."
      />

      {/* Modules */}
      <Card title="Global Module Toggles" className="mb-6">
        <div className="space-y-1">
          {categories.map(cat => (
            <div key={cat}>
              <p className={`${t.textFaint} text-xs uppercase tracking-wider px-1 py-2 mt-3 first:mt-0`}>{categoryLabels[cat] ?? cat}</p>
              {modules.filter(m => m.category === cat).map(m => (
                <div key={m.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all mb-2 ${m.globalEnabled ? 'bg-purple-500/10 border-purple-500/20' : `${t.s0} ${t.border} opacity-70`}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{m.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`${t.text} font-medium`}>{m.name}</p>
                        <StatusBadge status={m.globalEnabled ? 'enabled' : 'disabled'} dot />
                      </div>
                      <p className={`${t.textMd} text-xs mt-0.5`}>{m.description}</p>
                      <p className={`${t.textFaint} text-xs mt-1`}>Base price: RM {formatRM(m.basePrice)}/mo · Key: <code className="font-mono">{m.key}</code></p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleModule(m.id)}
                    className={`p-1 rounded-lg ${t.hover} transition-colors ml-4 shrink-0`}
                    title={m.globalEnabled ? 'Disable globally' : 'Enable globally'}
                  >
                    {m.globalEnabled
                      ? <ToggleRight className="w-9 h-9 text-purple-500" />
                      : <ToggleLeft className={`w-9 h-9 ${t.textFaint}`} />}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      {/* Features */}
      <Card title="Feature Flags (Per-Module)">
        <div className="space-y-2">
          {modules.map(m => {
            const mFeatures = features.filter(f => f.moduleId === m.id);
            if (mFeatures.length === 0) return null;
            return (
              <div key={m.id}>
                <p className={`${t.textFaint} text-xs uppercase tracking-wider flex items-center gap-2 px-1 py-2`}>
                  <Puzzle className="w-3.5 h-3.5" />{m.icon} {m.name}
                </p>
                {mFeatures.map(f => (
                  <div key={f.id} className={`flex items-center justify-between p-3 rounded-xl border ml-4 mb-1.5 transition-all ${f.globalEnabled ? 'bg-teal-500/10 border-teal-500/20' : `${t.s0} ${t.border} opacity-60`}`}>
                    <div className="flex items-center gap-3">
                      <Zap className={`w-4 h-4 ${f.globalEnabled ? 'text-teal-500' : t.textFaint}`} />
                      <div>
                        <p className={`${t.text} text-sm font-medium`}>{f.name}</p>
                        <p className={`${t.textFaint} text-xs`}>Rollout: {f.rolloutNote} · Key: <code className="font-mono">{f.key}</code></p>
                      </div>
                    </div>
                    <button onClick={() => toggleFeature(f.id)} className={`p-1 rounded-lg ${t.hover} transition-colors ml-4 shrink-0`}>
                      {f.globalEnabled
                        ? <ToggleRight className="w-7 h-7 text-teal-500" />
                        : <ToggleLeft className={`w-7 h-7 ${t.textFaint}`} />}
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}