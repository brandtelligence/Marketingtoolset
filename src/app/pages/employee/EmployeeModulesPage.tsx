/**
 * Employee Modules Page  —  /app/modules
 * ─────────────────────────────────────────────────────────────────────────────
 * Shows the employee:
 *   1. ACTIVE modules  — modules their tenant has subscribed to (green cards)
 *   2. AVAILABLE modules — globally-enabled modules not yet on their tenant
 *      → each has a "Request" button that opens a short form drawer
 *
 * Request flow:
 *   Employee fills in use-case → createModuleRequest() saves to KV (production)
 *   or mock array (demo) → Tenant Admin sees the request on /tenant/modules
 *
 * Previously submitted pending requests are displayed under each "available"
 * module so the employee knows their request is in review.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Puzzle, Lock, Zap, ChevronDown, ChevronUp, Send,
  CheckCircle, Clock, XCircle, Loader2,
} from 'lucide-react';
import { useAuth } from '../../components/AuthContext';
import { BackgroundLayout } from '../../components/BackgroundLayout';
import { EmployeeNav } from '../../components/EmployeeNav';
import { toast } from 'sonner';
import {
  fetchTenants, fetchModules, fetchFeatures,
  fetchModuleRequests, createModuleRequest,
  type Module, type ModuleRequest,
} from '../../utils/apiClient';
import { formatRM } from '../../utils/format';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { employeeTheme } from '../../utils/employeeTheme';

// ── Tiny RequestDrawer (inline, not using DrawerForm to keep this file self-contained)
function RequestDrawer({
  module: m, onClose, onSubmitted, existingRequest,
}: {
  module: Module;
  onClose: () => void;
  onSubmitted: (r: ModuleRequest) => void;
  existingRequest?: ModuleRequest;
}) {
  const { user } = useAuth();
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);
  const [useCase, setUseCase] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!useCase.trim()) { toast.error('Please describe your use case'); return; }
    if (!user?.tenantId) { toast.error('No tenant associated with your account'); return; }
    setLoading(true);
    try {
      const req = await createModuleRequest({
        tenantId:       user.tenantId,
        tenantName:     user.tenantName ?? user.company,
        moduleId:       m.id,
        moduleName:     m.name,
        moduleIcon:     m.icon,
        requesterId:    user.supabaseUid ?? user.email,
        requesterName:  `${user.firstName} ${user.lastName}`,
        requesterEmail: user.email,
        useCase,
      });
      toast.success(`Request for "${m.name}" sent to your Tenant Admin!`);
      onSubmitted(req);
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-[#1a1a3e] border border-white/20' : 'bg-white border border-gray-200'}`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-xl shrink-0">
            {m.icon}
          </div>
          <div>
            <h3 className={`font-semibold ${et.text}`}>Request {m.name}</h3>
            <p className={`text-xs ${et.textMd}`}>RM {formatRM(m.basePrice)}/mo · Your Tenant Admin will review</p>
          </div>
        </div>

        {existingRequest && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-300">
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            You already have a pending request for this module. Submitting again will create a new one.
          </div>
        )}

        <div className="mb-4">
          <label className={`block text-xs mb-1.5 ${et.textMd}`}>
            Why do you need this module? <span className="text-red-400">*</span>
          </label>
          <textarea
            value={useCase}
            onChange={e => setUseCase(e.target.value)}
            rows={4}
            placeholder={`e.g. "We need ${m.name} to improve our Q3 campaign performance…"`}
            className={et.inputCls + ' resize-none'}
          />
        </div>

        <div className={`rounded-xl p-3 text-xs mb-5 ${isDark ? 'bg-white/5 border border-white/10 text-white/50' : 'bg-gray-50 border border-gray-200 text-gray-500'}`}>
          💡 Your Tenant Admin will receive this request and can escalate to the Brandtelligence team if they decide to upgrade.
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl border text-sm transition-all ${isDark ? 'border-white/20 text-white/60 hover:text-white hover:border-white/40' : 'border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !useCase.trim()}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: '#0BA4AA' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Request
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Module card ────────────────────────────────────────────────────────────────

function ModuleCard({
  m, active, request, features, onRequest,
}: {
  m: Module;
  active: boolean;
  request?: ModuleRequest;
  features: any[];
  onRequest: () => void;
}) {
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);
  const [expanded, setExpanded] = useState(false);
  const moduleFeatures = features.filter(f => f.moduleId === m.id);

  const RequestStatus = () => {
    if (!request) return null;
    if (request.status === 'pending') return (
      <span className={`flex items-center gap-1 text-[0.65rem] px-2 py-0.5 rounded-full ${isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
        <Clock className="w-2.5 h-2.5" /> Pending review
      </span>
    );
    if (request.status === 'approved') return (
      <span className={`flex items-center gap-1 text-[0.65rem] px-2 py-0.5 rounded-full ${isDark ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-teal-50 text-teal-700 border border-teal-200'}`}>
        <CheckCircle className="w-2.5 h-2.5" /> Approved
      </span>
    );
    if (request.status === 'dismissed') return (
      <span className={`flex items-center gap-1 text-[0.65rem] px-2 py-0.5 rounded-full ${isDark ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-red-50 text-red-700 border border-red-200'}`}>
        <XCircle className="w-2.5 h-2.5" /> Not approved
      </span>
    );
    return null;
  };

  return (
    <div className={`rounded-2xl border transition-all ${
      active
        ? 'bg-teal-500/10 border-teal-500/25'
        : isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
            active ? 'bg-teal-500/20' : isDark ? 'bg-white/10' : 'bg-gray-100'
          }`}>
            {m.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <p className={`font-medium text-sm ${et.text}`}>{m.name}</p>
              {active
                ? <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${isDark ? 'bg-teal-500/25 text-teal-300 border border-teal-500/30' : 'bg-teal-50 text-teal-700 border border-teal-200'}`}>Active</span>
                : <span className={`text-[0.6rem] flex items-center gap-0.5 ${et.textFaint}`}><Lock className="w-2.5 h-2.5" /> Not subscribed</span>
              }
              <RequestStatus />
            </div>
            <p className={`text-xs ${et.textMd}`}>{m.description}</p>
            <p className={`text-xs mt-1 ${et.textFaint}`}>RM {formatRM(m.basePrice)}/mo</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!active && !request && (
              <button
                onClick={onRequest}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isDark ? 'text-white' : 'text-teal-700'}`}
                style={{ background: isDark ? 'rgba(11,164,170,0.3)' : 'rgba(11,164,170,0.12)', border: `1px solid ${isDark ? 'rgba(11,164,170,0.4)' : 'rgba(11,164,170,0.3)'}` }}
              >
                Request
              </button>
            )}
            {moduleFeatures.length > 0 && (
              <button
                onClick={() => setExpanded(v => !v)}
                className={`transition-colors p-1 ${isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'}`}
                title={expanded ? 'Hide features' : 'Show features'}
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Expanded feature list */}
        <AnimatePresence>
          {expanded && moduleFeatures.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className={`mt-3 pt-3 space-y-1.5 ${et.border} border-t`}>
                <p className={`text-[0.6rem] uppercase tracking-wider mb-2 ${et.textFaint}`}>Included Features</p>
                {moduleFeatures.map(f => (
                  <div key={f.id} className="flex items-center gap-2">
                    <Zap className={`w-3 h-3 shrink-0 ${f.globalEnabled ? 'text-teal-400' : (isDark ? 'text-white/25' : 'text-gray-300')}`} />
                    <span className={`text-xs flex-1 ${et.textMd}`}>{f.name}</span>
                    <span className={`text-[0.6rem] ${et.textFaint}`}>{f.rolloutNote}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function EmployeeModulesPage() {
  const { user } = useAuth();
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);

  const [modules,   setModules]   = useState<Module[]>([]);
  const [features,  setFeatures]  = useState<any[]>([]);
  const [requests,  setRequests]  = useState<ModuleRequest[]>([]);
  const [tenantModuleIds, setTenantModuleIds] = useState<string[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [requesting, setRequesting] = useState<Module | null>(null);

  useEffect(() => {
    if (!user?.tenantId) return;
    const tid = user.tenantId;
    Promise.all([
      fetchModules(),
      fetchFeatures(),
      fetchModuleRequests(tid),
      fetchTenants(),
    ]).then(([mods, feats, reqs, tenants]) => {
      setModules(mods);
      setFeatures(feats);
      setRequests(reqs);
      const tenant = tenants.find(t => t.id === tid);
      setTenantModuleIds(tenant?.moduleIds ?? []);
    }).catch(err => toast.error(`Failed to load modules: ${err.message}`))
      .finally(() => setLoading(false));
  }, [user?.tenantId]);

  if (!user) return null;

  const activeModules    = modules.filter(m => tenantModuleIds.includes(m.id));
  const availableModules = modules.filter(m => !tenantModuleIds.includes(m.id) && m.globalEnabled);

  // Most-recent request per module for this employee
  const myRequests = requests.filter(r => r.requesterEmail === user.email);
  const requestByModule = (moduleId: string) =>
    myRequests.filter(r => r.moduleId === moduleId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

  const pendingCount = myRequests.filter(r => r.status === 'pending').length;

  const handleRequestSubmitted = (newReq: ModuleRequest) => {
    setRequests(prev => [...prev, newReq]);
  };

  return (
    <BackgroundLayout>
      <EmployeeNav />
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-bold flex items-center gap-2 ${et.text}`}>
              <Puzzle className="w-6 h-6 text-teal-400" /> My Modules
            </h1>
            <p className={`text-sm mt-1 ${et.textMd}`}>
              {activeModules.length} active · {availableModules.length} available
              {pendingCount > 0 && <span className="ml-2 text-amber-400">· {pendingCount} pending request{pendingCount > 1 ? 's' : ''}</span>}
            </p>
          </div>
        </div>

        {loading ? (
          <div className={`flex items-center justify-center py-24 ${et.textFaint}`}>
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading modules…
          </div>
        ) : (
          <>
            {/* ── Active modules ─────────────────────────────────────────── */}
            <section className="mb-8">
              <h2 className={`text-xs uppercase tracking-wider font-semibold mb-3 flex items-center gap-2 ${et.textMd}`}>
                <CheckCircle className="w-3.5 h-3.5 text-teal-400" /> Active Modules ({activeModules.length})
              </h2>
              {activeModules.length === 0 ? (
                <div className={`rounded-2xl p-8 text-center text-sm ${isDark ? 'bg-white/5 border border-white/10 text-white/30' : 'bg-gray-50 border border-gray-200 text-gray-400'}`}>
                  No modules are active for your organisation yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeModules.map(m => (
                    <ModuleCard
                      key={m.id} m={m} active features={features}
                      request={requestByModule(m.id)}
                      onRequest={() => {}}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Available to request ───────────────────────────────────── */}
            {availableModules.length > 0 && (
              <section>
                <h2 className={`text-xs uppercase tracking-wider font-semibold mb-3 flex items-center gap-2 ${et.textMd}`}>
                  <Lock className={`w-3.5 h-3.5 ${et.textFaint}`} /> Available to Request ({availableModules.length})
                </h2>
                <p className={`text-xs mb-4 ${et.textFaint}`}>
                  These modules aren't in your current subscription. Click "Request" to submit a case to your Tenant Admin — they'll review and escalate if approved.
                </p>
                <div className="space-y-3">
                  {availableModules.map(m => (
                    <ModuleCard
                      key={m.id} m={m} active={false} features={features}
                      request={requestByModule(m.id)}
                      onRequest={() => setRequesting(m)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </motion.div>

      {/* Request drawer modal */}
      <AnimatePresence>
        {requesting && (
          <RequestDrawer
            module={requesting}
            existingRequest={requestByModule(requesting.id)}
            onClose={() => setRequesting(null)}
            onSubmitted={handleRequestSubmitted}
          />
        )}
      </AnimatePresence>
    </div>
    </BackgroundLayout>
  );
}