import { useState, useEffect, useRef } from 'react';
import { ToggleLeft, ToggleRight, Puzzle, Zap, RefreshCw, PackageOpen, Loader2, AlertTriangle, CheckCircle2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { StatusBadge } from '../../components/saas/StatusBadge';
import { formatRM } from '../../utils/format';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { fetchModules, fetchFeatures, updateModule, updateFeature, type Module, type Feature } from '../../utils/apiClient';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHeaders';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// ── Inline price editor ────────────────────────────────────────────────────────
function PriceEditor({
  moduleId, currentPrice, onSaved,
}: { moduleId: string; currentPrice: number; onSaved: (price: number) => void }) {
  const t = useDashboardTheme();
  const [editing, setEditing]   = useState(false);
  const [value,   setValue]     = useState(String(currentPrice));
  const [saving,  setSaving]    = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    setValue(String(currentPrice));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const cancel = () => { setEditing(false); setValue(String(currentPrice)); };

  const save = async () => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Enter a valid price (0 or more).');
      return;
    }
    const rounded = Math.round(parsed * 100) / 100; // 2 d.p.
    if (rounded === currentPrice) { cancel(); return; }
    setSaving(true);
    try {
      await updateModule(moduleId, { basePrice: rounded });
      onSaved(rounded);
      setEditing(false);
      toast.success(`Price updated to RM ${formatRM(rounded)}/mo`);
    } catch (err: any) {
      toast.error(`Failed to update price: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  { e.preventDefault(); save(); }
    if (e.key === 'Escape') cancel();
  };

  if (!editing) {
    return (
      <button
        onClick={open}
        className={`group/price inline-flex items-center gap-1.5 ${t.textFaint} text-xs hover:text-[#0BA4AA] transition-colors`}
        title="Click to edit price"
      >
        <span>Base price: <span className="font-semibold">RM {formatRM(currentPrice)}/mo</span></span>
        <Pencil className="w-3 h-3 opacity-0 group-hover/price:opacity-100 transition-opacity shrink-0" />
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`${t.textFaint} text-xs`}>RM</span>
      <input
        ref={inputRef}
        type="number"
        min="0"
        step="50"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={onKey}
        disabled={saving}
        className={`w-24 text-xs px-2 py-0.5 rounded-lg border ${t.border} ${t.s1} ${t.text}
          focus:outline-none focus:border-[#0BA4AA] focus:ring-1 focus:ring-[#0BA4AA]/30 transition-all`}
      />
      <span className={`${t.textFaint} text-xs`}>/mo</span>
      <button
        onClick={save}
        disabled={saving}
        className="p-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 transition-colors disabled:opacity-50"
        title="Save"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={cancel}
        disabled={saving}
        className={`p-1 rounded-lg ${t.hover} ${t.textFaint} hover:text-red-400 transition-colors disabled:opacity-50`}
        title="Cancel"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ModulesPage() {
  const t = useDashboardTheme();
  const [modules,   setModules]   = useState<Module[]>([]);
  const [features,  setFeatures]  = useState<Feature[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seeding,   setSeeding]   = useState(false);
  const [seedResult, setSeedResult] = useState<{
    modulesInDb: number; featuresInDb: number; error?: string;
  } | null>(null);

  const load = () => {
    setLoading(true);
    setLoadError(null);
    Promise.all([fetchModules(), fetchFeatures()])
      .then(([m, f]) => { setModules(m); setFeatures(f); })
      .catch(err => {
        setLoadError(err.message ?? String(err));
        toast.error(`Failed to load modules: ${err.message}`);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSeedNow = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res  = await fetch(`${SERVER}/seed-modules`, { method: 'POST', headers: await getAuthHeaders(true) });
      const json = await res.json();
      if (!res.ok) {
        setSeedResult({ modulesInDb: 0, featuresInDb: 0, error: json.error ?? `HTTP ${res.status}` });
        toast.error(`Seed failed — see error below`);
        return;
      }
      setSeedResult({ modulesInDb: json.modulesInDb ?? 0, featuresInDb: json.featuresInDb ?? 0 });
      toast.success(`✅ ${json.message}`);
      load();
    } catch (err: any) {
      const msg = err.message ?? String(err);
      setSeedResult({ modulesInDb: 0, featuresInDb: 0, error: msg });
      toast.error(`Seed request failed: ${msg}`);
    } finally {
      setSeeding(false);
    }
  };

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

  // Update a single module's price in local state after save
  const handlePriceSaved = (moduleId: string, newPrice: number) => {
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, basePrice: newPrice } : m));
  };

  const categoryLabels: Record<string, string> = {
    core: '🏗 Core',
    marketing: '📢 Marketing',
    analytics: '📊 Analytics',
    communication: '📬 Communication',
  };
  const categories = Array.from(new Set(modules.map(m => m.category)));

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div>
        <PageHeader
          title="Modules & Features"
          subtitle="Global toggles apply to all tenants. Per-tenant overrides are managed from Tenant Detail."
        />
        <Card title="Global Module Toggles" className="mb-6">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`h-16 rounded-xl ${t.s1} animate-pulse`} />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // ── Error loading (table may not exist yet, or network failure) ──────────────
  if (loadError) {
    return (
      <div>
        <PageHeader title="Modules & Features" subtitle="Global toggles apply to all tenants." />
        <div className={`rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center`}>
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <h3 className={`${t.text} font-bold text-lg mb-2`}>Failed to load modules</h3>
          <p className="text-red-400 text-sm font-mono bg-red-500/10 rounded-lg px-4 py-3 mx-auto max-w-xl mb-6 break-all">
            {loadError}
          </p>
          <PrimaryBtn variant="ghost" onClick={load}>
            <RefreshCw className="w-4 h-4" /> Retry
          </PrimaryBtn>
        </div>
      </div>
    );
  }

  // ── Empty — table exists but no rows ────────────────────────────────────────
  if (modules.length === 0) {
    return (
      <div>
        <PageHeader title="Modules & Features" subtitle="Global toggles apply to all tenants. Per-tenant overrides are managed from Tenant Detail." />

        <div className={`rounded-2xl border ${t.border} ${t.s0} p-12 text-center`}>
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <PackageOpen className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className={`${t.text} font-bold text-lg mb-2`}>Modules table is empty</h3>
          <p className={`${t.textFaint} text-sm max-w-md mx-auto mb-2`}>
            The <code className="font-mono text-purple-400">modules</code> and{' '}
            <code className="font-mono text-purple-400">features</code> tables exist in Postgres
            but contain no rows yet.
          </p>
          <p className={`${t.textFaint} text-xs max-w-sm mx-auto mb-6`}>
            This happens when the tables were created <em>after</em> the server first booted.
            Click <strong>Seed Modules</strong> to populate all 18 modules and 6 feature flags.
          </p>

          {/* Result banner — shown after a seed attempt */}
          {seedResult && (
            <div className={`rounded-xl border px-4 py-3 mb-6 mx-auto max-w-lg text-sm font-mono break-all
              ${seedResult.error
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-teal-500/10 border-teal-500/30 text-teal-400'}`}>
              {seedResult.error ? (
                <>
                  <span className="font-bold">❌ Seed error:</span>{' '}{seedResult.error}
                </>
              ) : (
                <>
                  <CheckCircle2 className="inline w-4 h-4 mr-1" />
                  Postgres verified: <strong>{seedResult.modulesInDb}</strong> modules,{' '}
                  <strong>{seedResult.featuresInDb}</strong> features written.
                  {seedResult.modulesInDb === 0 && (
                    <span className="block mt-1 text-yellow-400">
                      ⚠️ Server returned success but 0 rows in DB — check your DDL and table permissions.
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            <PrimaryBtn onClick={handleSeedNow} loading={seeding} disabled={seeding}>
              {seeding
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Seeding…</>
                : <><Zap className="w-4 h-4" /> Seed Modules Now</>}
            </PrimaryBtn>
            <PrimaryBtn variant="ghost" onClick={load} disabled={seeding}>
              <RefreshCw className="w-4 h-4" /> Refresh
            </PrimaryBtn>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal populated view ────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Modules & Features"
        subtitle="Global toggles apply to all tenants. Per-tenant overrides are managed from Tenant Detail."
        actions={
          <PrimaryBtn variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </PrimaryBtn>
        }
      />

      {/* Modules */}
      <Card title="Global Module Toggles" className="mb-6">
        <div className="space-y-1">
          {categories.map(cat => (
            <div key={cat}>
              <p className={`${t.textFaint} text-xs uppercase tracking-wider px-1 py-2 mt-3 first:mt-0`}>
                {categoryLabels[cat] ?? cat}
              </p>
              {modules.filter(m => m.category === cat).map(m => (
                <div
                  key={m.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all mb-2
                    ${m.globalEnabled
                      ? 'bg-purple-500/10 border-purple-500/20'
                      : `${t.s0} ${t.border} opacity-70`}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{m.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`${t.text} font-medium`}>{m.name}</p>
                        <StatusBadge status={m.globalEnabled ? 'enabled' : 'disabled'} dot />
                      </div>
                      <p className={`${t.textMd} text-xs mt-0.5`}>{m.description}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <PriceEditor
                          moduleId={m.id}
                          currentPrice={m.basePrice}
                          onSaved={(price) => handlePriceSaved(m.id, price)}
                        />
                        <span className={`${t.textFaint} text-xs`}>
                          · Key: <code className="font-mono">{m.key}</code>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleModule(m.id)}
                    className={`p-1 rounded-lg ${t.hover} transition-colors ml-4 shrink-0`}
                    title={m.globalEnabled ? 'Disable globally' : 'Enable globally'}
                  >
                    {m.globalEnabled
                      ? <ToggleRight className="w-9 h-9 text-purple-500" />
                      : <ToggleLeft  className={`w-9 h-9 ${t.textFaint}`} />}
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
                  <div
                    key={f.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ml-4 mb-1.5 transition-all
                      ${f.globalEnabled
                        ? 'bg-teal-500/10 border-teal-500/20'
                        : `${t.s0} ${t.border} opacity-60`}`}
                  >
                    <div className="flex items-center gap-3">
                      <Zap className={`w-4 h-4 ${f.globalEnabled ? 'text-teal-500' : t.textFaint}`} />
                      <div>
                        <p className={`${t.text} text-sm font-medium`}>{f.name}</p>
                        <p className={`${t.textFaint} text-xs`}>
                          Rollout: {f.rolloutNote} · Key:{' '}
                          <code className="font-mono">{f.key}</code>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFeature(f.id)}
                      className={`p-1 rounded-lg ${t.hover} transition-colors ml-4 shrink-0`}
                    >
                      {f.globalEnabled
                        ? <ToggleRight className="w-7 h-7 text-teal-500" />
                        : <ToggleLeft  className={`w-7 h-7 ${t.textFaint}`} />}
                    </button>
                  </div>
                ))}
              </div>
            );
          })}

          {features.length === 0 && (
            <div className={`text-center py-8 ${t.textFaint} text-sm`}>
              No feature flags found.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}