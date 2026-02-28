import { useState, useEffect } from 'react';
import { Building2, Users, CreditCard, ToggleLeft, ToggleRight, Eye, AlertTriangle, Send, Sparkles, Zap, RotateCcw, Timer, CheckCircle2, AlertOctagon, Shield } from 'lucide-react';
import { useSlaConfig, type SlaConfig } from '../../hooks/useSlaConfig';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn, StatCard } from '../../components/saas/SaasLayout';
import { DataTable, Column } from '../../components/saas/DataTable';
import { StatusBadge } from '../../components/saas/StatusBadge';
import { DrawerForm, ConfirmDialog } from '../../components/saas/DrawerForm';
import { RoleBadge } from '../../components/saas/StatusBadge';
import { useOutletContext } from 'react-router';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { formatRM } from '../../utils/format';
import { useAuth } from '../../components/AuthContext';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHeaders';

import {
  fetchTenants, updateTenant, fetchModules, fetchTenantUsers, fetchInvoices,
  fetchTenantAIBudget, updateTenantAILimit,
  type Tenant, type TenantStatus, type TenantAIBudget,
} from '../../utils/apiClient';

type TabKey = 'overview' | 'modules' | 'users' | 'invoices' | 'ai_budget' | 'sla';

// ─── Preset token limit options ────────────────────────────────────────────────

const LIMIT_PRESETS = [
  { label: '25k',  value: 25_000  },
  { label: '50k',  value: 50_000  },
  { label: '100k', value: 100_000 },
  { label: '200k', value: 200_000 },
  { label: '500k', value: 500_000 },
];
const DEFAULT_LIMIT = 100_000;

// ─── AI Budget tab ─────────────────────────────────────────────────────────────

function AIBudgetTab({
  tenant, t,
}: {
  tenant: Tenant;
  t: ReturnType<typeof useDashboardTheme>;
}) {
  const [budget,       setBudget]       = useState<TenantAIBudget | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [resetting,    setResetting]    = useState(false);
  const [inputValue,   setInputValue]   = useState('');
  const [customMode,   setCustomMode]   = useState(false);

  // Load current budget on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const b = await fetchTenantAIBudget(tenant.id);
        if (!cancelled) {
          setBudget(b);
          setInputValue(String(b.limit));
          setCustomMode(b.isCustom);
        }
      } catch (err: any) {
        if (!cancelled) toast.error(`Failed to load AI budget: ${err.message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [tenant.id]);

  const handleSave = async () => {
    const n = Number(inputValue.replace(/,/g, ''));
    if (!Number.isFinite(n) || n < 1_000) {
      toast.error('Minimum token limit is 1,000');
      return;
    }
    setSaving(true);
    try {
      await updateTenantAILimit(tenant.id, n);
      setBudget(prev => prev ? { ...prev, limit: n, isCustom: true } : null);
      toast.success(`AI token budget updated to ${n.toLocaleString()} tokens/mo for ${tenant.name}`);
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await updateTenantAILimit(tenant.id, null);
      setBudget(prev => prev ? { ...prev, limit: DEFAULT_LIMIT, isCustom: false } : null);
      setInputValue(String(DEFAULT_LIMIT));
      setCustomMode(false);
      toast.success(`${tenant.name} AI budget reset to platform default (${DEFAULT_LIMIT.toLocaleString()} tokens/mo)`);
    } catch (err: any) {
      toast.error(`Reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full border-2 border-[#0BA4AA] border-t-transparent animate-spin" />
          <p className={`${t.textFaint} text-sm`}>Loading AI budget…</p>
        </div>
      </div>
    );
  }

  const used    = budget?.tokensUsed ?? 0;
  const limit   = budget?.limit      ?? DEFAULT_LIMIT;
  const pct     = Math.min((used / limit) * 100, 100);
  const barColor = pct > 85 ? '#ef4444' : pct > 65 ? '#F47A20' : '#0BA4AA';
  const period  = budget?.period ?? new Date().toISOString().slice(0, 7);
  const monthLabel = new Date(period + '-15').toLocaleString('en-MY', { month: 'long', year: 'numeric' });

  const fmtK = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `${(n / 1_000).toFixed(1)}k`
    : n.toString();

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(11,164,170,0.12)', border: '1px solid rgba(11,164,170,0.25)' }}>
          <Sparkles className="w-4 h-4" style={{ color: '#0BA4AA' }} />
        </div>
        <div>
          <p className={`${t.text} text-sm font-semibold`}>Monthly AI Token Budget</p>
          <p className={`${t.textFaint} text-xs`}>
            Controls how many AI tokens this tenant can consume per calendar month
          </p>
        </div>
      </div>

      {/* Usage gauge */}
      <div className={`${t.s1} rounded-2xl p-4 border ${t.border} space-y-3`}>
        <div className="flex items-start justify-between">
          <div>
            <p className={`${t.textFaint} text-xs mb-0.5`}>Current period — {monthLabel}</p>
            <p className={`${t.text} text-lg font-bold tabular-nums`}>
              {used.toLocaleString()}
              <span className={`${t.textFaint} text-xs font-normal ml-1`}>/ {limit.toLocaleString()} tokens</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums" style={{ color: barColor }}>{pct.toFixed(0)}%</p>
            <p className={`${t.textFaint} text-xs`}>{budget?.requests ?? 0} requests</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className={`h-3 ${t.s0} rounded-full overflow-hidden`}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}99, ${barColor})` }}
          />
        </div>

        {/* Remaining */}
        <p className={`${t.textFaint} text-xs`}>
          {Math.max(0, limit - used).toLocaleString()} tokens remaining this month
          {pct > 85 && (
            <span className="ml-2 text-red-400 font-medium">⚠ Near limit — consider increasing budget</span>
          )}
        </p>
      </div>

      {/* Custom limit badge */}
      {budget?.isCustom ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
          style={{ background: 'rgba(62,60,112,0.08)', borderColor: 'rgba(62,60,112,0.3)' }}>
          <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <p className="text-purple-300 text-xs font-medium">
            Custom limit active — platform default is {DEFAULT_LIMIT.toLocaleString()} tokens/mo
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/8"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <Zap className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <p className={`${t.textFaint} text-xs`}>
            Using platform default — {DEFAULT_LIMIT.toLocaleString()} tokens/mo
          </p>
        </div>
      )}

      {/* Preset buttons */}
      <div>
        <p className={`${t.textFaint} text-xs mb-2 font-medium uppercase tracking-wider`}>Monthly limit</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {LIMIT_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => { setInputValue(String(p.value)); setCustomMode(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                Number(inputValue) === p.value
                  ? 'border-[#0BA4AA] text-[#0BA4AA] bg-[#0BA4AA]/10'
                  : `${t.border} ${t.textSm} ${t.hover}`
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setCustomMode(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              customMode
                ? 'border-[#F47A20] text-[#F47A20] bg-[#F47A20]/10'
                : `${t.border} ${t.textSm} ${t.hover}`
            }`}
          >
            Custom
          </button>
        </div>

        {/* Token input */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1000}
            step={1000}
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); setCustomMode(true); }}
            className={`flex-1 px-3 py-2 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0BA4AA]/30 transition-all ${t.inputCls ?? `${t.s1} ${t.border} ${t.text}`}`}
            placeholder="e.g. 150000"
          />
          <span className={`${t.textFaint} text-xs shrink-0`}>tokens/mo</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <PrimaryBtn
          variant="teal"
          onClick={handleSave}
          loading={saving}
          className="flex-1"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Save Budget
        </PrimaryBtn>
        <PrimaryBtn
          variant="ghost"
          onClick={handleReset}
          loading={resetting}
          title={`Reset to platform default (${DEFAULT_LIMIT.toLocaleString()} tokens/mo)`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Default
        </PrimaryBtn>
      </div>

      {/* Info note */}
      <div className={`${t.s0} rounded-xl p-3 border ${t.border}`}>
        <p className={`${t.textFaint} text-xs leading-relaxed`}>
          <span className="font-semibold">How it works:</span> This limit applies to all users within <span className="font-medium">{tenant.name}</span> combined.
          When reached, AI content generation is blocked until the next calendar month.
          Usage resets on the 1st of each month at midnight UTC.
        </p>
      </div>
    </div>
  );
}

// ─── SLA Config Tab ────────────────────────────────────────────────────────────

const PLATFORM_DEFAULTS: SlaConfig = { warningHours: 24, breachHours: 48 };

function SLATab({ tenant, t }: { tenant: Tenant; t: ReturnType<typeof useDashboardTheme> }) {
  const { warningHours, breachHours, isLoading, isSaving, saveConfig } = useSlaConfig(tenant.id);
  const [warnInput,   setWarnInput]   = useState('');
  const [breachInput, setBreachInput] = useState('');
  const [dirty,       setDirty]       = useState(false);

  // Sync inputs when remote config loads
  useEffect(() => {
    if (!isLoading) {
      setWarnInput(String(warningHours));
      setBreachInput(String(breachHours));
      setDirty(false);
    }
  }, [isLoading, warningHours, breachHours]);

  const isCustom  = warningHours !== PLATFORM_DEFAULTS.warningHours || breachHours !== PLATFORM_DEFAULTS.breachHours;
  const warnNum   = parseInt(warnInput,   10);
  const breachNum = parseInt(breachInput, 10);
  const canSave   = dirty && !isNaN(warnNum) && !isNaN(breachNum) && warnNum >= 1 && breachNum > warnNum;

  const handleSave = async () => {
    if (!canSave) return;
    const ok = await saveConfig({ warningHours: warnNum, breachHours: breachNum }, tenant.id);
    if (ok) {
      toast.success(`SLA thresholds updated for ${tenant.name}`);
      setDirty(false);
    } else {
      toast.error('Failed to save SLA config — check server logs');
    }
  };

  const handleReset = async () => {
    const ok = await saveConfig(PLATFORM_DEFAULTS, tenant.id);
    if (ok) {
      setWarnInput(String(PLATFORM_DEFAULTS.warningHours));
      setBreachInput(String(PLATFORM_DEFAULTS.breachHours));
      setDirty(false);
      toast.success(`SLA thresholds reset to platform defaults for ${tenant.name}`);
    } else {
      toast.error('Reset failed — check server logs');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="w-7 h-7 rounded-full border-2 border-[#0BA4AA] border-t-transparent animate-spin" />
      </div>
    );
  }

  const segments = [
    { label: 'On Time',  sub: `0 – ${warningHours}h`,          color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.2)',  icon: CheckCircle2 },
    { label: 'At Risk',  sub: `${warningHours} – ${breachHours}h`, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: Timer },
    { label: 'Breached', sub: `> ${breachHours}h`,              color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',  icon: AlertOctagon },
  ];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <Shield className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className={`${t.text} text-sm font-semibold`}>SLA Thresholds</p>
          <p className={`${t.textFaint} text-xs`}>
            Configure approval SLA timers for <span className="font-medium">{tenant.name}</span>
          </p>
        </div>
        {isCustom && (
          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: 'rgba(62,60,112,0.15)', border: '1px solid rgba(62,60,112,0.3)', color: '#a78bfa' }}>
            Custom
          </span>
        )}
      </div>

      {/* Traffic-light overview */}
      <div className="grid grid-cols-3 gap-2.5">
        {segments.map(({ label, sub, color, bg, border, icon: Icon }) => (
          <div key={label} className="rounded-xl p-3 flex flex-col gap-1"
            style={{ background: bg, border: `1px solid ${border}` }}>
            <Icon className="w-4 h-4" style={{ color }} />
            <p className={`${t.text} text-xs font-semibold mt-1`}>{label}</p>
            <p className={`${t.textFaint} text-[10px] font-mono`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Editable fields */}
      <div className="space-y-3">
        <p className={`${t.textFaint} text-xs font-semibold uppercase tracking-wider`}>Override Thresholds</p>

        <div className="grid grid-cols-2 gap-3">
          {/* Warning */}
          <div>
            <label className={`${t.textFaint} text-xs mb-1.5 block`}>
              <span className="text-amber-400">⚠</span> Warning after (hours)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={1} max={719}
                value={warnInput}
                onChange={e => { setWarnInput(e.target.value); setDirty(true); }}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all ${t.inputCls ?? `${t.s1} ${t.border} ${t.text}`}`}
              />
              <span className={`${t.textFaint} text-xs shrink-0`}>h</span>
            </div>
          </div>
          {/* Breach */}
          <div>
            <label className={`${t.textFaint} text-xs mb-1.5 block`}>
              <span className="text-red-400">🔴</span> Breach after (hours)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={2} max={720}
                value={breachInput}
                onChange={e => { setBreachInput(e.target.value); setDirty(true); }}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400/30 transition-all ${t.inputCls ?? `${t.s1} ${t.border} ${t.text}`}`}
              />
              <span className={`${t.textFaint} text-xs shrink-0`}>h</span>
            </div>
          </div>
        </div>

        {/* Validation hint */}
        {dirty && !canSave && (
          <p className="text-red-400 text-xs">
            Warning must be ≥ 1h and Breach must be greater than Warning.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <PrimaryBtn
          variant="teal"
          onClick={handleSave}
          loading={isSaving}
          className="flex-1"
        >
          <Shield className="w-3.5 h-3.5" />
          Save Thresholds
        </PrimaryBtn>
        <PrimaryBtn
          variant="ghost"
          onClick={handleReset}
          loading={isSaving}
          title={`Reset to platform defaults (${PLATFORM_DEFAULTS.warningHours}h / ${PLATFORM_DEFAULTS.breachHours}h)`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </PrimaryBtn>
      </div>

      {/* Info note */}
      <div className={`${t.s0} rounded-xl p-3 border ${t.border}`}>
        <p className={`${t.textFaint} text-xs leading-relaxed`}>
          <span className="font-semibold">Platform defaults:</span>{' '}
          {PLATFORM_DEFAULTS.warningHours}h warning · {PLATFORM_DEFAULTS.breachHours}h breach.
          Changes take effect immediately — the Tenant Admin can also adjust these in their own Settings page.
          SLA escalation emails are sent automatically when the breach threshold is exceeded.
        </p>
      </div>
    </div>
  );
}

export function TenantsPage() {
  const t = useDashboardTheme();
  const { user } = useAuth();
  const [tenants,        setTenants]        = useState<Tenant[]>([]);
  const [allModules,     setAllModules]     = useState<any[]>([]);
  const [drawerUsers,    setDrawerUsers]    = useState<any[]>([]);
  const [drawerInvoices, setDrawerInvoices] = useState<any[]>([]);
  const [selected,       setSelected]       = useState<Tenant | null>(null);
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [activeTab,      setActiveTab]      = useState<TabKey>('overview');
  const [suspendDialog,  setSuspendDialog]  = useState(false);
  const [resendDialog,   setResendDialog]   = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [resendLoading,  setResendLoading]  = useState(false);
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

  const handleResendInvite = async () => {
    if (!selected?.adminEmail) return;
    setResendLoading(true);
    try {
      const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;
      const res = await fetch(`${SERVER}/auth/resend-tenant-invite`, {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          email:      selected.adminEmail,
          tenantId:   selected.id,
          tenantName: selected.name,
          adminName:  selected.adminName,
          plan:       selected.plan,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Resend failed');
      toast.success(`Invite resent to ${selected.adminEmail}`, {
        description: 'A new 24-hour activation link has been delivered.',
      });
      setResendDialog(false);
    } catch (err: any) {
      toast.error(`Resend failed: ${err.message}`);
    } finally {
      setResendLoading(false);
    }
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
          <button
            onClick={() => { setSelected(ten); setResendDialog(true); }}
            className="p-1.5 rounded-lg hover:bg-teal-500/20 text-teal-500 transition-colors"
            title="Resend invite"
          >
            <Send className="w-4 h-4" />
          </button>
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
    { key: 'overview',   label: 'Overview' },
    { key: 'modules',    label: 'Modules' },
    { key: 'users',      label: `Users (${tenantUsers.length})` },
    { key: 'invoices',   label: `Invoices (${tenantInvoices.length})` },
    { key: 'ai_budget',  label: '🤖 AI Budget' },
    { key: 'sla',        label: '⏱ SLA Config' },
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

                {/* Resend invite action */}
                {selected.adminEmail && (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-teal-500/20 bg-teal-500/5">
                    <div>
                      <p className={`${t.text} text-sm font-medium`}>Resend Activation Invite</p>
                      <p className={`${t.textFaint} text-xs`}>
                        Generates a new 24-hour invite link and emails it to <span className="font-medium">{selected.adminEmail}</span>
                      </p>
                    </div>
                    <PrimaryBtn
                      variant="teal"
                      onClick={() => setResendDialog(true)}
                      loading={resendLoading}
                    >
                      <Send className="w-3.5 h-3.5" />
                      Resend
                    </PrimaryBtn>
                  </div>
                )}

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

            {/* AI Budget */}
            {activeTab === 'ai_budget' && selected && (
              <AIBudgetTab tenant={selected} t={t} />
            )}

            {/* SLA Config */}
            {activeTab === 'sla' && selected && (
              <SLATab tenant={selected} t={t} />
            )}
          </div>
        )}
      </DrawerForm>

      {/* Suspend / Reactivate dialog */}
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

      {/* Resend invite confirmation dialog */}
      <ConfirmDialog
        open={resendDialog} onClose={() => setResendDialog(false)} onConfirm={handleResendInvite}
        title={`Resend invite to ${selected?.adminName ?? selected?.adminEmail}?`}
        description={`A new 24-hour activation link will be emailed to ${selected?.adminEmail}. Any previously sent invite links will be invalidated.`}
        confirmLabel="Resend Invite"
        confirmVariant="primary"
        loading={resendLoading}
      />
    </div>
  );
}