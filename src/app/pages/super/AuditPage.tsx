/**
 * AuditPage — Super Admin Audit & Compliance Dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Four tabs:
 *   1. Compliance Health   – aggregated cron status, integrity checks, overall health
 *   2. Application Audit   – existing admin action log (fetchAuditLogs)
 *   3. Security Audit Log  – Phase 6 ISO 27001 A.12.4 security events with CSV export
 *   4. Data Retention       – Phase 6 PDPA s.10 / ISO 27001 A.18.1.3 retention policy
 *   5. Penetration Test     – Penetration test results and findings
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download, ShieldCheck, Database, BookOpen, Calendar,
  RefreshCw, Loader2, Save, Info, AlertTriangle, Clock,
  ChevronLeft, ChevronRight, BarChart3, Activity,
  CheckCircle2, XCircle, HelpCircle, Timer, Cog,
  Bell, Plus, Trash2, ToggleLeft, ToggleRight, Mail, X,
  ScanSearch, Rocket, ChevronDown, Monitor,
  Lock, Sparkles, ListChecks, SkipForward, RotateCcw, Flag,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { DataTable, Column } from '../../components/saas/DataTable';
import { StatusBadge, RoleBadge } from '../../components/saas/StatusBadge';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { useSEO } from '../../hooks/useSEO';
import { PenTestChecklist } from '../../components/saas/PenTestChecklist';
import { BrowserQAChecklist, QA_TOTAL_ITEMS } from '../../components/saas/BrowserQAChecklist';
import {
  fetchAuditLogs,
  fetchSecurityAuditLog,
  fetchSecurityAuditSummary,
  fetchRetentionPolicy,
  updateRetentionPolicy,
  fetchComplianceStatus,
  runIntegrityCheckNow,
  fetchAlertRecipients,
  updateAlertRecipients,
  runZeroDemoDataCheck,
  fetchLastZeroDemoDataCheck,
  fetchUatSignoff,
  saveUatSignoff,
  fetchCwvEvidence,
  saveCwvEvidence,
  fetchQaResults,
  fetchLastSchemaHealth,
  saveSchemaHealth,
  fetchDeploymentSequence,
  saveDeploymentSequence,
  approveGoLive,
  resetDeploymentSequence,
  type QaResultsPayload,
  type SchemaHealthResult,
  type DeploymentSequencePayload,
  type DeployPhaseData,
  type DeployStepData,
  type AuditLog,
  type SecurityAuditEntry,
  type SecurityAuditDaySummary,
  type RetentionPolicy,
  type ComplianceStatus,
  type AlertRecipient,
  type ZeroDemoDataCheckResult,
  type UatSignoffPayload,
  type UatScenarioEntry,
  type CwvReading,
  type CwvEvidencePayload,
  type CwvRating,
} from '../../utils/apiClient';

import {
  getLocalCwvReadings,
  clearLocalCwvReadings,
  formatCwvValue,
  type CwvStoredReading,
  type CwvMetricName,
} from '../../utils/webVitals';

// ─── CSV Export Utility ───────────────────────────────────────────────────────

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (s: string) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) lines.push(row.map(escape).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Security Event Action Colors ─────────────────────────────────────────────

function actionColor(action: string, isDark: boolean): string {
  const d = isDark;
  const map: Record<string, string> = {
    AUTH_SUCCESS:            d ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    AUTH_FAIL:               d ? 'bg-red-500/15 text-red-400 border-red-500/25'             : 'bg-red-50 text-red-700 border-red-200',
    ROLE_DENIED:             d ? 'bg-red-500/15 text-red-400 border-red-500/25'             : 'bg-red-50 text-red-700 border-red-200',
    TENANT_MISMATCH:         d ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'       : 'bg-amber-50 text-amber-700 border-amber-200',
    RATE_LIMITED:             d ? 'bg-orange-500/15 text-orange-400 border-orange-500/25'    : 'bg-orange-50 text-orange-700 border-orange-200',
    CSRF_INVALID:            d ? 'bg-red-500/15 text-red-400 border-red-500/25'             : 'bg-red-50 text-red-700 border-red-200',
    HMAC_INVALID:            d ? 'bg-red-500/15 text-red-400 border-red-500/25'             : 'bg-red-50 text-red-700 border-red-200',
    SESSION_EXPIRED:         d ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'       : 'bg-amber-50 text-amber-700 border-amber-200',
    SECURITY_LOG_VIEWED:     d ? 'bg-sky-500/15 text-sky-400 border-sky-500/25'             : 'bg-sky-50 text-sky-700 border-sky-200',
    RETENTION_POLICY_CHANGED:d ? 'bg-purple-500/15 text-purple-400 border-purple-500/25'    : 'bg-purple-50 text-purple-700 border-purple-200',
    ALERT_RECIPIENTS_UPDATED:d ? 'bg-orange-500/15 text-orange-400 border-orange-500/25'    : 'bg-orange-50 text-orange-700 border-orange-200',
    AUDIT_INTEGRITY_OK:      d ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    AUDIT_INTEGRITY_WARNING: d ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'       : 'bg-amber-50 text-amber-700 border-amber-200',
    INTEGRITY_CHECK_MANUAL:  d ? 'bg-sky-500/15 text-sky-400 border-sky-500/25'             : 'bg-sky-50 text-sky-700 border-sky-200',
    PENTEST_RESULTS_UPDATED: d ? 'bg-orange-500/15 text-orange-400 border-orange-500/25'    : 'bg-orange-50 text-orange-700 border-orange-200',
    ZERO_DEMO_CHECK_PASS:    d ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ZERO_DEMO_CHECK_FAIL:    d ? 'bg-red-500/15 text-red-400 border-red-500/25'             : 'bg-red-50 text-red-700 border-red-200',
    UAT_SIGNOFF_UPDATED:     d ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    SCHEMA_HEALTH_SAVED:     d ? 'bg-teal-500/15 text-teal-400 border-teal-500/25'          : 'bg-teal-50 text-teal-700 border-teal-200',
    DEPLOYMENT_STEP_UPDATED: d ? 'bg-sky-500/15 text-sky-400 border-sky-500/25'             : 'bg-sky-50 text-sky-700 border-sky-200',
    DEPLOYMENT_GO_LIVE_APPROVED: d ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200',
    DEPLOYMENT_SEQ_RESET:    d ? 'bg-orange-500/15 text-orange-400 border-orange-500/25'    : 'bg-orange-50 text-orange-700 border-orange-200',
  };
  return map[action] ?? (d ? 'bg-gray-500/15 text-gray-400 border-gray-500/25' : 'bg-gray-100 text-gray-600 border-gray-200');
}

type TabKey = 'readiness' | 'compliance' | 'app' | 'security' | 'retention' | 'pentest' | 'qa';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AuditPage() {
  const t = useDashboardTheme();

  useSEO({ title: 'Security Audit', description: 'Platform security audit — readiness checklist, pen-test results, and QA verification.', noindex: true });

  const [activeTab, setActiveTab] = useState<TabKey>('readiness');

  // ── Pen test + QA fail counts from localStorage (lightweight, no API call) ──
  const [penTestFailCount, setPenTestFailCount] = useState(0);
  const [qaFailCount,      setQaFailCount]      = useState(0);

  // Recompute when switching tabs (user may have just changed results)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('btl_pentest_results');
      if (!raw) { setPenTestFailCount(0); return; }
      const results = JSON.parse(raw) as Record<string, { status: string }>;
      setPenTestFailCount(Object.values(results).filter(r => r.status === 'fail').length);
    } catch { setPenTestFailCount(0); }
    try {
      const raw = localStorage.getItem('btl_qa_results');
      if (!raw) { setQaFailCount(0); return; }
      const results = JSON.parse(raw) as Record<string, { status: string }>;
      setQaFailCount(Object.values(results).filter(r => r.status === 'fail').length);
    } catch { setQaFailCount(0); }
  }, [activeTab]);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: number }[] = useMemo(() => [
    { key: 'readiness', label: 'Deployment Readiness', icon: <Rocket className="w-4 h-4" /> },
    { key: 'compliance', label: 'Compliance Health',   icon: <Activity className="w-4 h-4" /> },
    { key: 'app',        label: 'Application Audit',   icon: <BookOpen className="w-4 h-4" /> },
    { key: 'security',   label: 'Security Log',        icon: <ShieldCheck className="w-4 h-4" /> },
    { key: 'retention',  label: 'Data Retention',      icon: <Database className="w-4 h-4" /> },
    { key: 'pentest',    label: 'Penetration Test',    icon: <ShieldCheck className="w-4 h-4" style={{ color: '#F47A20' }} />, badge: penTestFailCount },
    { key: 'qa',         label: 'Browser QA',          icon: <Monitor className="w-4 h-4" style={{ color: '#8b5cf6' }} />, badge: qaFailCount },
  ], [penTestFailCount, qaFailCount]);

  return (
    <div>
      <PageHeader
        title="Audit & Compliance"
        subtitle="Deployment readiness dashboard, audit trail, security event log, and data retention policies — ISO 27001 / PDPA compliant"
      />

      {/* Tab bar */}
      <div className={`flex flex-wrap gap-1 ${t.tabBg} rounded-xl p-1 mb-6 w-fit max-w-full`}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? t.tabActive : t.tabInactive
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[0.625rem] font-bold bg-red-500 text-white leading-none">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'readiness' && (
          <motion.div key="readiness" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <DeploymentReadinessTab onNavigateToTab={setActiveTab} />
          </motion.div>
        )}
        {activeTab === 'compliance' && (
          <motion.div key="compliance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ComplianceHealthTab onNavigateToTab={setActiveTab} />
          </motion.div>
        )}
        {activeTab === 'app' && (
          <motion.div key="app" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ApplicationAuditTab />
          </motion.div>
        )}
        {activeTab === 'security' && (
          <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SecurityAuditTab />
          </motion.div>
        )}
        {activeTab === 'retention' && (
          <motion.div key="retention" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <DataRetentionTab />
          </motion.div>
        )}
        {activeTab === 'pentest' && (
          <motion.div key="pentest" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <PenetrationTestTab />
          </motion.div>
        )}
        {activeTab === 'qa' && (
          <motion.div key="qa" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <BrowserQAChecklist />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 0 — DEPLOYMENT READINESS  (Gate 1-6 aggregated go/no-go dashboard)
// ═══════════════════════════════════════════════════════════════════════════════

type GateStatus = 'passed' | 'blocked' | 'pending';

function gateConfig(isDark: boolean): Record<GateStatus, { cls: string; badge: string; icon: React.ReactNode; label: string }> {
  const d = isDark;
  return {
    passed:  { cls: 'bg-emerald-500/10 border-emerald-500/25', badge: d ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',  icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, label: 'PASSED' },
    blocked: { cls: 'bg-red-500/10 border-red-500/25',         badge: d ? 'bg-red-500/15 text-red-400 border-red-500/30'             : 'bg-red-50 text-red-700 border-red-200',             icon: <XCircle className="w-5 h-5 text-red-500" />,          label: 'BLOCKED' },
    pending: { cls: 'bg-amber-500/8 border-amber-500/20',      badge: d ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'       : 'bg-amber-50 text-amber-700 border-amber-200',       icon: <HelpCircle className="w-5 h-5 text-amber-500" />,     label: 'PENDING' },
  };
}

function roleColor(role: string, isDark: boolean): string {
  const d = isDark;
  const map: Record<string, string> = {
    'SUPER_ADMIN':  d ? 'bg-purple-500/15 text-purple-400 border-purple-500/25' : 'bg-purple-50 text-purple-700 border-purple-200',
    'TENANT_ADMIN': d ? 'bg-sky-500/15 text-sky-400 border-sky-500/25'          : 'bg-sky-50 text-sky-700 border-sky-200',
    'EMPLOYEE':     d ? 'bg-teal-500/15 text-teal-400 border-teal-500/25'       : 'bg-teal-50 text-teal-700 border-teal-200',
    'PUBLIC':       d ? 'bg-gray-500/15 text-gray-400 border-gray-500/25'       : 'bg-gray-100 text-gray-600 border-gray-200',
    'ALL':          d ? 'bg-orange-500/15 text-orange-400 border-orange-500/25'  : 'bg-orange-50 text-orange-700 border-orange-200',
  };
  return map[role] ?? map.ALL;
}

function statusColor(status: string, isDark: boolean): string {
  const d = isDark;
  const map: Record<string, string> = {
    pending: d ? 'bg-gray-500/15 text-gray-400 border-gray-500/25'        : 'bg-gray-100 text-gray-600 border-gray-200',
    pass:    d ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    fail:    d ? 'bg-red-500/15 text-red-400 border-red-500/30'             : 'bg-red-50 text-red-700 border-red-200',
    blocked: d ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'       : 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return map[status] ?? map.pending;
}

function DeploymentReadinessTab({ onNavigateToTab }: { onNavigateToTab: (tab: TabKey) => void }) {
  const t = useDashboardTheme();

  // ── Data loading ───────────────────────────────────────────────────────────
  const [status,         setStatus]         = useState<ComplianceStatus | null>(null);
  const [zeroDemoResult, setZeroDemoResult] = useState<ZeroDemoDataCheckResult | null>(null);
  const [uatPayload,     setUatPayload]     = useState<UatSignoffPayload | null>(null);
  const [cwvEvidence,    setCwvEvidence]    = useState<CwvEvidencePayload | null | undefined>(undefined);
  const [qaResults,      setQaResults]      = useState<QaResultsPayload | null | undefined>(undefined);
  const [schemaHealth,   setSchemaHealth]   = useState<SchemaHealthResult | null | undefined>(undefined);
  const [deploySeq,      setDeploySeq]      = useState<DeploymentSequencePayload | null>(null);
  const [loading,        setLoading]        = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      fetchComplianceStatus(),
      fetchLastZeroDemoDataCheck(),
      fetchUatSignoff(),
      fetchCwvEvidence(),
      fetchQaResults(),
      fetchLastSchemaHealth(),
      fetchDeploymentSequence(),
    ]).then(([s, d, u, c, q, sh, ds]) => {
      if (s.status  === 'fulfilled') setStatus(s.value);
      if (d.status  === 'fulfilled') setZeroDemoResult(d.value);
      if (u.status  === 'fulfilled') setUatPayload(u.value);
      if (c.status  === 'fulfilled') setCwvEvidence(c.value);
      if (q.status  === 'fulfilled') setQaResults(q.value);
      if (sh.status === 'fulfilled') setSchemaHealth(sh.value);
      if (ds.status === 'fulfilled') setDeploySeq(ds.value);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Gate state derivation ──────────────────────────────────────────────────
  const penFails  = status?.penTestProgress?.fail ?? 0;
  const demoPass  = zeroDemoResult?.pass;
  const scenarios = uatPayload?.scenarios ?? {};
  const uatFails  = Object.values(scenarios).filter(s => s.status === 'fail').length;
  const uatPasses = Object.values(scenarios).filter(s => s.status === 'pass').length;
  const UAT_TOTAL = (uatPayload?.definitions ?? []).length || 14;

  const gates: { id: number; label: string; sop: string; status: GateStatus; detail: string; cta?: string; navigateTo?: TabKey }[] = [
    {
      id: 1, label: 'Functional Completeness', sop: 'Gate 1',
      status: 'pending',
      detail: '18 functional areas code-complete — auth, RBAC, tenant CRUD, invoices, content lifecycle, AI, social publish.',
      cta: 'Execute role-based functional testing in staging',
    },
    {
      id: 2, label: 'UI/UX & Responsive Stability', sop: 'Gate 2',
      status: qaResults === undefined || qaResults === null
        ? 'pending'
        : qaResults.failCount > 0
        ? 'blocked'
        : qaResults.passCount >= QA_TOTAL_ITEMS
        ? 'passed'
        : 'pending',
      detail: qaResults == null
        ? 'CSS audit complete; 125-item browser QA matrix built — open Browser QA tab and run all items.'
        : qaResults.failCount > 0
        ? `${qaResults.failCount} failing item${qaResults.failCount !== 1 ? 's' : ''} in QA matrix. Fix in dashboard-light.css / web-light.css then re-run.`
        : qaResults.passCount >= QA_TOTAL_ITEMS
        ? `All ${QA_TOTAL_ITEMS} QA items passed — evidence saved ${new Date(qaResults.updatedAt).toLocaleDateString()}.`
        : `${qaResults.passCount}/${QA_TOTAL_ITEMS} items passed — continue in Browser QA tab.`,
      cta: qaResults?.passCount === QA_TOTAL_ITEMS ? undefined : 'Open Browser QA tab',
      navigateTo: 'qa' as TabKey,
    },
    {
      id: 3, label: 'Compliance & Security', sop: 'Gate 3',
      status: penFails > 0 || schemaHealth?.healthy === false
        ? 'blocked'
        : schemaHealth?.healthy === true && penFails === 0
        ? 'pending'   // still need human pen-test sign-off
        : 'pending',
      detail: penFails > 0 && schemaHealth?.healthy === false
        ? `${penFails} pen test failure${penFails !== 1 ? 's' : ''} + RLS/schema issue detected. Review both tabs.`
        : penFails > 0
        ? `${penFails} penetration test case${penFails !== 1 ? 's' : ''} failed. All must pass before deployment.`
        : schemaHealth?.healthy === false
        ? `Schema/RLS check failed: ${(schemaHealth?.unexpected?.length ?? 0)} unexpected table(s), ${(schemaHealth?.missingRls?.length ?? 0)} table(s) missing RLS.`
        : schemaHealth?.healthy === true
        ? 'Schema & RLS verified ✓. Run PenTestChecklist and sign off to complete Gate 3.'
        : 'Run Schema & RLS Check (Compliance Health tab) and PenTestChecklist to complete Gate 3.',
      cta: schemaHealth == null ? 'Run Schema & RLS Check' : 'Review Penetration Test tab',
      navigateTo: schemaHealth == null ? 'compliance' : 'pentest',
    },
    {
      id: 4, label: 'Performance Thresholds', sop: 'Gate 4',
      status: cwvEvidence === undefined || cwvEvidence === null
        ? 'pending'
        : cwvEvidence.pass
        ? 'passed'
        : cwvEvidence.readings.some(r => r.rating === 'poor')
        ? 'blocked'
        : 'pending',
      detail: cwvEvidence == null
        ? 'CWV instrumented via web-vitals v5. Load the app → metrics fire automatically → save to audit record below.'
        : cwvEvidence.pass
        ? `All ${cwvEvidence.readings.length}/5 metrics in "good" range — CWV evidence saved ${new Date(cwvEvidence.capturedAt).toLocaleDateString()}.`
        : `${cwvEvidence.readings.filter(r => r.rating !== 'good').length} metric(s) not yet in "good" range — see CWV panel below.`,
      cta: cwvEvidence?.pass ? undefined : 'Review CWV Evidence panel below',
    },
    {
      id: 5, label: 'Supabase Alignment + Zero Demo Data', sop: 'Gate 5',
      status: !zeroDemoResult?.pass && zeroDemoResult !== null
        ? 'blocked'
        : schemaHealth?.healthy === false
        ? 'blocked'
        : zeroDemoResult?.pass && schemaHealth?.healthy === true
        ? 'pending'   // still need `supabase db diff --linked` (CLI-only, can't automate)
        : 'pending',
      detail: zeroDemoResult !== null && !zeroDemoResult.pass
        ? `Demo data detected — ${zeroDemoResult.findings.length} finding${zeroDemoResult.findings.length !== 1 ? 's' : ''}. Remediate then re-run check.`
        : schemaHealth?.healthy === false
        ? `Schema issue: ${(schemaHealth?.unexpected?.length ?? 0)} unexpected table(s), ${(schemaHealth?.missingRls?.length ?? 0)} missing RLS. Fix then re-run Schema Check.`
        : zeroDemoResult?.pass && schemaHealth?.healthy === true
        ? `Zero demo data ✓ · Schema & RLS verified ✓. Still run: supabase db diff --linked → 0 drift.`
        : zeroDemoResult?.pass
        ? `Zero demo data ✓. Run Schema & RLS Check and then supabase db diff --linked.`
        : 'Run Zero Demo Data Check and Schema & RLS Check (Compliance Health tab).',
      cta: zeroDemoResult === null ? 'Run Zero Demo Data Check' : 'Review Compliance Health tab',
      navigateTo: 'compliance',
    },
    {
      id: 6, label: 'UAT Sign-off', sop: 'Gate 6',
      status: uatFails > 0 ? 'blocked' : uatPasses >= UAT_TOTAL ? 'passed' : 'pending',
      detail: uatPasses >= UAT_TOTAL
        ? `All ${UAT_TOTAL} UAT scenarios signed off. Gate 6 cleared.`
        : uatFails > 0
        ? `${uatFails} scenario${uatFails !== 1 ? 's' : ''} failed. Fix and re-test before deploying.`
        : `${uatPasses} of ${UAT_TOTAL} scenarios signed off — ${UAT_TOTAL - uatPasses} remaining.`,
      cta: uatPasses < UAT_TOTAL ? 'Complete UAT matrix below' : undefined,
    },
  ];

  const anyBlocked = gates.some(g => g.status === 'blocked');
  const allPassed  = gates.every(g => g.status === 'passed');
  const blockedCnt = gates.filter(g => g.status === 'blocked').length;
  const pendingCnt = gates.filter(g => g.status === 'pending').length;

  const overallStatus: GateStatus = allPassed ? 'passed' : anyBlocked ? 'blocked' : 'pending';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3">
        <Loader2 className={`w-5 h-5 animate-spin ${t.textFaint}`} />
        <span className={`${t.textFaint} text-sm`}>Loading deployment readiness…</span>
      </div>
    );
  }

  return (
    <>
      {/* ── Master deployment banner ─────────────────────────────────────── */}
      <div className={`rounded-2xl border p-6 mb-6 ${
        allPassed  ? 'bg-emerald-500/10 border-emerald-500/25' :
        anyBlocked ? 'bg-red-500/10 border-red-500/25' :
                     t.isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
            allPassed  ? 'bg-emerald-500/20' :
            anyBlocked ? 'bg-red-500/20' :
                         t.isDark ? 'bg-amber-500/10' : 'bg-amber-100'
          }`}>
            {allPassed  ? <Rocket className="w-7 h-7 text-emerald-500" /> :
             anyBlocked ? <XCircle className="w-7 h-7 text-red-500" /> :
                          <AlertTriangle className="w-7 h-7 text-amber-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`text-xl font-bold ${
              allPassed ? 'text-emerald-700' : anyBlocked ? 'text-red-700' : t.isDark ? 'text-amber-300' : 'text-amber-800'
            }`}>
              {allPassed  ? 'DEPLOYMENT READY' :
               anyBlocked ? `DEPLOYMENT BLOCKED — ${blockedCnt} gate${blockedCnt !== 1 ? 's' : ''} failing` :
                            `${pendingCnt} gate${pendingCnt !== 1 ? 's' : ''} awaiting human sign-off`}
            </h2>
            <p className={`text-sm mt-1 ${
              allPassed ? 'text-emerald-700/70' : anyBlocked ? 'text-red-700/70' : t.isDark ? 'text-amber-300/70' : 'text-amber-700'
            }`}>
              {allPassed
                ? 'All 6 readiness gates are satisfied. Proceed with the deployment sequence in gate-status-report.md.'
                : anyBlocked
                ? 'One or more gates are actively failing. All BLOCKED gates must be resolved before deployment.'
                : 'No gates are actively blocked. Complete the pending human sign-off steps to clear remaining gates.'}
            </p>
          </div>
          <button
            onClick={load}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              t.isDark ? 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border-white/10' : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* ── 6 Gate cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {gates.map(gate => {
          const gc = gateConfig(t.isDark)[gate.status];
          return (
            <div key={gate.id} className={`rounded-2xl border p-4 ${gc.cls}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className={`text-[10px] font-mono font-bold uppercase tracking-widest ${t.textFaint}`}>{gate.sop}</p>
                  <p className={`${t.text} text-sm font-semibold mt-0.5 leading-tight`}>{gate.label}</p>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold whitespace-nowrap ${gc.badge}`}>
                  {gc.icon}
                  {gc.label}
                </div>
              </div>
              <p className={`${t.textFaint} text-xs leading-relaxed`}>{gate.detail}</p>
              {gate.cta && (
                <button
                  onClick={() => gate.navigateTo ? onNavigateToTab(gate.navigateTo) : undefined}
                  className={`mt-3 flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${
                    gate.status === 'blocked'
                      ? 'text-red-600 hover:text-red-700'
                      : t.isDark ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'
                  } ${gate.navigateTo ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <ChevronRight className="w-3 h-3" />
                  {gate.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Gate 4: CWV Evidence Card ────────────────────────────────────── */}
      <CwvEvidenceCard
        savedEvidence={cwvEvidence ?? null}
        onSaved={(ev) => { setCwvEvidence(ev); load(); }}
      />

      {/* ── UAT Sign-off Matrix ───────────────────────────────────────────── */}
      {uatPayload && (
        <UatSignoffMatrix
          payload={uatPayload}
          onSave={async (updated) => {
            try {
              const res = await saveUatSignoff(updated);
              setUatPayload(res);
              const passes = Object.values(updated).filter(s => s.status === 'pass').length;
              const fails  = Object.values(updated).filter(s => s.status === 'fail').length;
              toast.success(`UAT sign-off saved — ${passes} passed, ${fails} failed`);
            } catch (err: any) {
              console.error('[UatSignoffMatrix] save error:', err);
              toast.error(`Failed to save UAT sign-off: ${err.message}`);
            }
          }}
        />
      )}

      {/* ── Deployment Sequence Tracker ───────────────────────────────────── */}
      <DeploymentSequenceTracker
        payload={deploySeq}
        anyBlocked={anyBlocked}
        allPassed={allPassed}
        onUpdate={async (steps) => {
          try {
            const res = await saveDeploymentSequence(steps);
            setDeploySeq(res);
          } catch (err: any) {
            console.error('[DeploymentSequenceTracker] save:', err);
            toast.error(`Failed to save step: ${err.message}`);
          }
        }}
        onApprove={async (approvedBy, version) => {
          try {
            const res = await approveGoLive(approvedBy, version);
            setDeploySeq(res);
            toast.success(`Go-Live approved! ${version} deployment recorded.`);
          } catch (err: any) {
            console.error('[DeploymentSequenceTracker] approve:', err);
            toast.error(`Approval failed: ${err.message}`);
          }
        }}
        onReset={async () => {
          try {
            const res = await resetDeploymentSequence();
            setDeploySeq(res);
            toast.success('Deployment sequence reset — all steps cleared.');
          } catch (err: any) {
            console.error('[DeploymentSequenceTracker] reset:', err);
            toast.error(`Reset failed: ${err.message}`);
          }
        }}
      />

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className={`mt-6 flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
        t.isDark ? 'bg-sky-500/5 border-sky-500/20 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-700'
      }`}>
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>Deployment SOP:</strong> All 6 gates must show PASSED before triggering the Deployment Sequence below. The tracker activates when no gates are BLOCKED and records a timestamped Go-Live Certificate on final approval — logged as <code>DEPLOYMENT_GO_LIVE_APPROVED</code> in the ISO 27001 security audit trail.
        </div>
      </div>
    </>
  );
}

// ─── Deployment Sequence Tracker ────────────────────────────────────────────

interface DeploymentSequenceTrackerProps {
  payload:    DeploymentSequencePayload | null;
  anyBlocked: boolean;
  allPassed:  boolean;
  onUpdate:   (steps: Record<string, { status: 'pending' | 'complete' | 'skipped'; completedBy?: string; notes?: string }>) => Promise<void>;
  onApprove:  (approvedBy: string, version: string) => Promise<void>;
  onReset:    () => Promise<void>;
}

function DeploymentSequenceTracker({ payload, anyBlocked, allPassed, onUpdate, onApprove, onReset }: DeploymentSequenceTrackerProps) {
  const t = useDashboardTheme();

  // Local optimistic state so checkboxes feel instant
  const [localPhases, setLocalPhases] = useState<DeployPhaseData[]>(() => payload?.phases ?? []);
  useEffect(() => { if (payload?.phases) setLocalPhases(payload.phases); }, [payload]);

  const [openPhases,    setOpenPhases]    = useState<Set<string>>(new Set(['P1']));
  const [editingNotes,  setEditingNotes]  = useState<Record<string, string>>({});
  const [completedByMap, setCompletedByMap] = useState<Record<string, string>>({});

  // Go-Live approval form
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [approverName,    setApproverName]    = useState('');
  const [versionTag,      setVersionTag]      = useState('v1.0.0-prod');
  const [approving,       setApproving]       = useState(false);
  const [resetting,       setResetting]       = useState(false);
  const [confirmReset,    setConfirmReset]    = useState(false);

  // Aggregate progress
  const allSteps   = localPhases.flatMap(p => p.steps);
  const doneCount  = allSteps.filter(s => s.status !== 'pending').length;
  const totalSteps = allSteps.length;
  const allDone    = totalSteps > 0 && doneCount === totalSteps;
  const pct        = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;

  const isApproved = Boolean(payload?.goLiveApprovedAt);

  const togglePhase = (id: string) =>
    setOpenPhases(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const handleStepToggle = async (phaseIdx: number, stepIdx: number) => {
    if (anyBlocked) return;
    const step    = localPhases[phaseIdx].steps[stepIdx];
    const newStatus: 'pending' | 'complete' = step.status === 'complete' ? 'pending' : 'complete';
    const nowStr  = new Date().toISOString();
    const byName  = completedByMap[step.id] ?? '';

    // Optimistic update
    setLocalPhases(prev => {
      const next = prev.map(p => ({ ...p, steps: [...p.steps] }));
      next[phaseIdx].steps[stepIdx] = {
        ...step,
        status:      newStatus,
        completedBy: newStatus === 'complete' ? byName : undefined,
        completedAt: newStatus === 'complete' ? nowStr : undefined,
      };
      return next;
    });

    await onUpdate({
      [step.id]: {
        status:      newStatus,
        completedBy: byName || undefined,
        notes:       editingNotes[step.id] ?? step.notes,
      },
    });

    // Auto-open next phase
    if (newStatus === 'complete') {
      const currentPhase = localPhases[phaseIdx];
      const phaseAllDone = currentPhase.steps.every((s, i) =>
        i === stepIdx ? true : s.status !== 'pending',
      );
      if (phaseAllDone && phaseIdx + 1 < localPhases.length) {
        setOpenPhases(prev => { const s = new Set(prev); s.add(localPhases[phaseIdx + 1].id); return s; });
      }
    }
  };

  const handleSkip = async (phaseIdx: number, stepIdx: number) => {
    if (anyBlocked) return;
    const step = localPhases[phaseIdx].steps[stepIdx];
    const newStatus: 'pending' | 'skipped' = step.status === 'skipped' ? 'pending' : 'skipped';
    setLocalPhases(prev => {
      const next = prev.map(p => ({ ...p, steps: [...p.steps] }));
      next[phaseIdx].steps[stepIdx] = { ...step, status: newStatus };
      return next;
    });
    await onUpdate({ [step.id]: { status: newStatus, notes: editingNotes[step.id] ?? step.notes } });
  };

  const handleNoteBlur = async (step: DeployStepData) => {
    const note = editingNotes[step.id];
    if (note !== undefined && note !== (step.notes ?? '')) {
      await onUpdate({ [step.id]: { status: step.status as 'pending' | 'complete' | 'skipped', notes: note } });
    }
  };

  const handleApprove = async () => {
    if (!approverName.trim()) { toast.error('Enter approver name'); return; }
    setApproving(true);
    try {
      await onApprove(approverName.trim(), versionTag.trim() || 'v1.0.0-prod');
      setShowApproveForm(false);
    } finally {
      setApproving(false);
    }
  };

  const handleReset = async () => {
    if (!confirmReset) { setConfirmReset(true); return; }
    setResetting(true);
    try {
      await onReset();
      setLocalPhases(prev => prev.map(p => ({ ...p, steps: p.steps.map(s => ({ ...s, status: 'pending' as const, completedBy: undefined, completedAt: undefined, notes: undefined })) })));
      setOpenPhases(new Set(['P1']));
      setConfirmReset(false);
      setShowApproveForm(false);
    } finally {
      setResetting(false);
    }
  };

  const inputCls = `w-full rounded-lg border px-2.5 py-1.5 text-xs transition-all focus:outline-none ${
    t.isDark
      ? 'bg-white/5 border-white/15 text-white placeholder-white/40 focus:border-white/30'
      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-300'
  }`;

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isApproved  ? 'bg-emerald-500/20' :
            anyBlocked  ? 'bg-red-500/10' :
            allDone     ? 'bg-emerald-500/10' :
                          t.isDark ? 'bg-purple-500/15' : 'bg-purple-50'
          }`}>
            {isApproved  ? <Sparkles className="w-5 h-5 text-emerald-500" /> :
             anyBlocked  ? <Lock className="w-5 h-5 text-red-400" /> :
             allDone     ? <Flag className="w-5 h-5 text-emerald-500" /> :
                           <ListChecks className={`w-5 h-5 ${t.isDark ? 'text-purple-400' : 'text-purple-600'}`} />}
          </div>
          <div>
            <h3 className={`${t.text} font-bold text-base`}>Deployment Sequence</h3>
            <p className={`${t.textFaint} text-xs`}>
              {isApproved
                ? `Go-Live approved by ${payload?.goLiveApprovedBy} — ${payload?.approvedVersion} — ${new Date(payload!.goLiveApprovedAt!).toLocaleString()}`
                : anyBlocked
                ? 'Resolve all BLOCKED gates before running the deployment sequence'
                : `${doneCount} / ${totalSteps} steps complete`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isApproved && (
            <button
              onClick={() => { setConfirmReset(false); handleReset(); }}
              disabled={resetting}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                confirmReset
                  ? 'bg-red-500/15 text-red-600 border-red-400/30 hover:bg-red-500/25'
                  : t.isDark
                  ? 'bg-white/5 hover:bg-white/10 text-white/50 border-white/10'
                  : 'bg-white hover:bg-gray-50 text-gray-500 border-gray-200'
              }`}
            >
              {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              {confirmReset ? 'Confirm Reset?' : 'Reset'}
            </button>
          )}
        </div>
      </div>

      {/* Overall progress bar */}
      {!anyBlocked && totalSteps > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-semibold ${t.textFaint}`}>{pct}% complete</span>
            <span className={`text-xs ${t.textFaint}`}>{doneCount}/{totalSteps} steps</span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${t.isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                allDone ? 'bg-emerald-500' : t.isDark ? 'bg-purple-500' : 'bg-purple-600'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Go-Live Certificate (shown when approved) */}
      {isApproved && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-5 text-center"
        >
          <Sparkles className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-emerald-700 font-bold text-lg">Go-Live Certificate</h3>
          <p className={`text-sm mt-1 ${t.isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
            <strong>{payload?.approvedVersion}</strong> approved for production deployment
          </p>
          <p className={`text-xs mt-1 ${t.isDark ? 'text-emerald-400/70' : 'text-emerald-600/80'}`}>
            Approved by <strong>{payload?.goLiveApprovedBy}</strong> on {new Date(payload!.goLiveApprovedAt!).toLocaleString()}
          </p>
          <p className={`text-[10px] mt-2 font-mono ${t.isDark ? 'text-emerald-400/50' : 'text-emerald-600/60'}`}>
            Logged as DEPLOYMENT_GO_LIVE_APPROVED · KV: deployment_sequence:latest
          </p>
        </motion.div>
      )}

      {/* Locked overlay when gates are blocked */}
      {anyBlocked && (
        <div className={`rounded-2xl border p-8 text-center ${
          t.isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'
        }`}>
          <Lock className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className={`font-semibold text-sm ${t.isDark ? 'text-red-400' : 'text-red-700'}`}>
            Deployment Sequence Locked
          </p>
          <p className={`text-xs mt-1 ${t.isDark ? 'text-red-400/70' : 'text-red-500'}`}>
            Resolve all BLOCKED gates above before running the deployment checklist.
          </p>
        </div>
      )}

      {/* Phase accordions */}
      {!anyBlocked && (
        <div className="space-y-3">
          {localPhases.map((phase, phaseIdx) => {
            const phaseDone    = phase.steps.filter(s => s.status !== 'pending').length;
            const phaseTotal   = phase.steps.length;
            const phaseComplete = phaseDone === phaseTotal;
            const isOpen = openPhases.has(phase.id);

            return (
              <div
                key={phase.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  phaseComplete
                    ? t.isDark ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'
                    : t.isDark ? `${t.card} border-white/10` : 'bg-white border-gray-200'
                }`}
              >
                {/* Phase header */}
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">{phase.icon}</span>
                    <div className="min-w-0">
                      <span className={`font-semibold text-sm ${t.text}`}>{phase.label}</span>
                      <span className={`ml-2 text-[10px] font-mono ${t.textFaint}`}>
                        {phaseDone}/{phaseTotal}
                      </span>
                    </div>
                    {phaseComplete && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-400/30 whitespace-nowrap">
                        DONE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Mini progress */}
                    <div className={`w-16 h-1.5 rounded-full overflow-hidden ${t.isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                      <div
                        className={`h-full rounded-full ${phaseComplete ? 'bg-emerald-500' : 'bg-purple-500'}`}
                        style={{ width: `${Math.round((phaseDone / phaseTotal) * 100)}%` }}
                      />
                    </div>
                    <ChevronDown className={`w-4 h-4 ${t.textFaint} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Steps */}
                {isOpen && (
                  <div className={`border-t px-4 pb-3 pt-2 space-y-2 ${t.isDark ? 'border-white/10' : 'border-gray-100'}`}>
                    {phase.steps.map((step, stepIdx) => (
                      <div
                        key={step.id}
                        className={`rounded-xl border px-3 py-2.5 transition-all ${
                          step.status === 'complete'
                            ? t.isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                            : step.status === 'skipped'
                            ? t.isDark ? 'bg-white/3 border-white/8 opacity-60' : 'bg-gray-50 border-gray-100 opacity-70'
                            : t.isDark ? 'bg-white/3 border-white/10' : 'bg-gray-50/50 border-gray-100'
                        }`}
                      >
                        {/* Step row */}
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => handleStepToggle(phaseIdx, stepIdx)}
                            className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
                              step.status === 'complete'
                                ? 'bg-emerald-500 border-emerald-500'
                                : step.status === 'skipped'
                                ? t.isDark ? 'border-white/20 bg-white/5' : 'border-gray-200 bg-gray-100'
                                : t.isDark ? 'border-white/30 bg-transparent hover:border-white/50' : 'border-gray-300 bg-white hover:border-gray-400'
                            }`}
                          >
                            {step.status === 'complete' && <CheckCircle2 className="w-3 h-3 text-white" />}
                            {step.status === 'skipped'  && <X className="w-2.5 h-2.5 text-gray-400" />}
                          </button>

                          {/* Description */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-relaxed ${
                              step.status === 'skipped'
                                ? t.textFaint
                                : step.status === 'complete'
                                ? t.isDark ? 'text-emerald-400' : 'text-emerald-700'
                                : t.text
                            } ${step.status === 'skipped' ? 'line-through' : ''}`}>
                              <span className={`font-mono text-[9px] mr-1.5 ${t.textFaint}`}>{step.id}</span>
                              {step.description}
                            </p>

                            {/* Hint */}
                            {step.hint && step.status !== 'skipped' && (
                              <code className={`text-[10px] mt-1 block font-mono px-2 py-0.5 rounded w-fit ${
                                t.isDark ? 'bg-white/5 text-purple-400' : 'bg-purple-50 text-purple-700'
                              }`}>
                                {step.hint}
                              </code>
                            )}

                            {/* Completed by + timestamp */}
                            {step.status === 'complete' && (
                              <p className={`text-[10px] mt-1 ${t.textFaint}`}>
                                {step.completedBy ? `By ${step.completedBy} · ` : ''}
                                {step.completedAt ? new Date(step.completedAt).toLocaleString() : ''}
                              </p>
                            )}

                            {/* Inline "completed by" input when marking complete */}
                            {step.status === 'pending' && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Your name (optional)"
                                  value={completedByMap[step.id] ?? ''}
                                  onChange={e => setCompletedByMap(prev => ({ ...prev, [step.id]: e.target.value }))}
                                  className={`${inputCls} max-w-[180px]`}
                                />
                              </div>
                            )}

                            {/* Notes */}
                            {step.status !== 'pending' && (
                              <input
                                type="text"
                                placeholder="Notes (optional)"
                                value={editingNotes[step.id] ?? (step.notes ?? '')}
                                onChange={e => setEditingNotes(prev => ({ ...prev, [step.id]: e.target.value }))}
                                onBlur={() => handleNoteBlur(step)}
                                className={`${inputCls} mt-1.5`}
                              />
                            )}
                          </div>

                          {/* Skip button */}
                          <button
                            onClick={() => handleSkip(phaseIdx, stepIdx)}
                            title={step.status === 'skipped' ? 'Un-skip' : 'Mark N/A'}
                            className={`shrink-0 p-1 rounded-lg transition-colors ${
                              step.status === 'skipped'
                                ? t.isDark ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'
                                : t.isDark ? 'text-white/20 hover:text-white/50' : 'text-gray-300 hover:text-gray-500'
                            }`}
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Go-Live Approval Section */}
      {!anyBlocked && !isApproved && (
        <div className={`mt-4 rounded-2xl border p-4 ${
          allDone && allPassed
            ? t.isDark ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-emerald-50 border-emerald-300'
            : t.isDark ? 'bg-white/3 border-white/10' : 'bg-gray-50 border-gray-200'
        }`}>
          {!showApproveForm ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={`font-semibold text-sm ${allDone && allPassed ? (t.isDark ? 'text-emerald-400' : 'text-emerald-700') : t.text}`}>
                  {allDone && allPassed ? '🚀 All steps complete — ready to approve Go-Live' : `Complete all ${totalSteps - doneCount} remaining steps to unlock Go-Live approval`}
                </p>
                <p className={`text-xs mt-0.5 ${t.textFaint}`}>
                  Go-Live approval records a timestamped certificate and logs <code>DEPLOYMENT_GO_LIVE_APPROVED</code> to the ISO 27001 audit trail.
                </p>
              </div>
              <button
                onClick={() => setShowApproveForm(true)}
                disabled={!allDone || !allPassed}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  allDone && allPassed
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                    : t.isDark ? 'bg-white/5 text-white/25 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Rocket className="w-4 h-4" />
                Approve Go-Live
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className={`font-semibold text-sm ${t.isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                🚀 Confirm Go-Live Approval
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold block mb-1 ${t.textFaint}`}>Approver Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ali Hassan"
                    value={approverName}
                    onChange={e => setApproverName(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold block mb-1 ${t.textFaint}`}>Version Tag</label>
                  <input
                    type="text"
                    placeholder="v1.0.0-prod"
                    value={versionTag}
                    onChange={e => setVersionTag(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleApprove}
                  disabled={approving || !approverName.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all disabled:opacity-50"
                >
                  {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {approving ? 'Recording…' : 'Confirm Go-Live'}
                </button>
                <button
                  onClick={() => setShowApproveForm(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    t.isDark ? 'bg-white/5 hover:bg-white/10 text-white/60' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CWV Evidence Card ────────���───────────────────────────────────────────────

const CWV_META: { name: CwvMetricName; label: string; goodThreshold: string; unit: string }[] = [
  { name: 'LCP',  label: 'Largest Contentful Paint',  goodThreshold: '≤ 2500',  unit: 'ms' },
  { name: 'FCP',  label: 'First Contentful Paint',    goodThreshold: '≤ 1800',  unit: 'ms' },
  { name: 'CLS',  label: 'Cumulative Layout Shift',   goodThreshold: '≤ 0.10',  unit: ''   },
  { name: 'INP',  label: 'Interaction to Next Paint', goodThreshold: '≤ 200',   unit: 'ms' },
  { name: 'TTFB', label: 'Time to First Byte',        goodThreshold: '≤ 800',   unit: 'ms' },
];

const RATING_CLS: Record<CwvRating, string> = {
  'good':               'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  'needs-improvement':  'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'poor':               'bg-red-500/15 text-red-700 border-red-500/30',
};
const RATING_EMOJI: Record<CwvRating, string> = {
  'good':               '✅',
  'needs-improvement':  '⚠️',
  'poor':               '❌',
};

interface CwvEvidenceCardProps {
  savedEvidence: CwvEvidencePayload | null;
  onSaved: (evidence: CwvEvidencePayload) => void;
}

function CwvEvidenceCard({ savedEvidence, onSaved }: CwvEvidenceCardProps) {
  const t = useDashboardTheme();

  // ── Live session readings from localStorage ────────────────────────────────
  const [liveReadings, setLiveReadings] = useState<Record<string, CwvStoredReading>>(() =>
    getLocalCwvReadings(),
  );
  const [saving, setSaving] = useState(false);

  // Update live readings whenever web-vitals fires a new metric
  useEffect(() => {
    const handler = (e: Event) => {
      setLiveReadings((e as CustomEvent).detail);
    };
    window.addEventListener('btl:cwv-updated', handler);
    // Also poll localStorage every 3s in case handler missed a metric
    const poll = setInterval(() => setLiveReadings(getLocalCwvReadings()), 3000);
    return () => { window.removeEventListener('btl:cwv-updated', handler); clearInterval(poll); };
  }, []);

  const liveCount  = Object.keys(liveReadings).length;
  const allCaptured = liveCount >= 5;
  const livePass   = allCaptured && Object.values(liveReadings).every(r => r.rating === 'good');

  const handleSave = async () => {
    if (!allCaptured) return;
    setSaving(true);
    try {
      const readings: CwvReading[] = Object.values(liveReadings).map(r => ({
        name:       r.name as CwvReading['name'],
        value:      r.value,
        rating:     r.rating,
        capturedAt: r.capturedAt,
      }));
      const evidence = await saveCwvEvidence(readings, window.location.href);
      onSaved(evidence);
      toast.success('CWV evidence saved to audit record (KV + security log)');
    } catch (err: any) {
      console.error('[CwvEvidenceCard] save error:', err);
      toast.error(`Failed to save CWV evidence: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    clearLocalCwvReadings();
    setLiveReadings({});
    toast('Session CWV readings cleared — reload to re-capture');
  };

  return (
    <Card title="Gate 4 — Core Web Vitals Evidence" className="mt-0 mb-4">
      <div className={`mb-4 text-xs rounded-lg px-3 py-2 border ${
        t.isDark ? 'bg-sky-500/5 border-sky-500/20 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-700'
      }`}>
        <strong>How to capture:</strong> Simply browse the app (any page) — the web-vitals library collects LCP, FCP, CLS, INP and TTFB passively. All 5 should appear within 10–30 s of normal interaction. When all 5 show ✅, click <strong>Save to Audit Record</strong>.
      </div>

      {/* Metric table */}
      <div className="space-y-1.5 mb-4">
        {CWV_META.map(({ name, label, goodThreshold, unit }) => {
          const live   = liveReadings[name];
          const saved  = savedEvidence?.readings.find(r => r.name === name);
          const active = live ?? saved;

          return (
            <div
              key={name}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${t.s1} ${t.border}`}
            >
              {/* Metric name */}
              <span className={`w-12 shrink-0 text-xs font-bold font-mono ${t.textMd}`}>{name}</span>

              {/* Label + threshold */}
              <span className={`flex-1 text-xs ${t.textFaint} hidden sm:block`}>{label}</span>
              <span className={`text-[10px] font-mono ${t.textFaint} shrink-0`}>good {goodThreshold}{unit}</span>

              {/* Live value */}
              {active ? (
                <span className={`shrink-0 text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border ${RATING_CLS[active.rating]}`}>
                  {RATING_EMOJI[active.rating]} {formatCwvValue(name, active.value)}
                </span>
              ) : (
                <span className={`shrink-0 text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                  t.isDark ? 'bg-white/5 border-white/10 text-white/25' : 'bg-gray-50 border-gray-200 text-gray-300'
                }`}>
                  — waiting
                </span>
              )}

              {/* Source badge */}
              {live && !saved && (
                <span className={`hidden md:block shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                  t.isDark ? 'bg-purple-500/15 text-purple-400 border-purple-500/25' : 'bg-purple-50 text-purple-600 border-purple-200'
                }`}>live</span>
              )}
              {saved && (
                <span className={`hidden md:block shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                  t.isDark ? 'bg-teal-500/15 text-teal-400 border-teal-500/25' : 'bg-teal-50 text-teal-600 border-teal-200'
                }`}>saved</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Capture progress */}
      <div className={`flex items-center gap-2 mb-4 text-xs ${t.textFaint}`}>
        <div className={`h-1.5 flex-1 rounded-full overflow-hidden ${t.isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
          <div
            className="h-full bg-purple-500 transition-all duration-500"
            style={{ width: `${(liveCount / 5) * 100}%` }}
          />
        </div>
        <span>{liveCount}/5 metrics captured this session</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <PrimaryBtn
          onClick={handleSave}
          loading={saving}
          disabled={!allCaptured || saving}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : allCaptured ? (livePass ? '✅ Save to Audit Record' : '⚠️ Save to Audit Record') : `Waiting for ${5 - liveCount} more metric${5 - liveCount !== 1 ? 's' : ''}…`}
        </PrimaryBtn>
        {liveCount > 0 && (
          <button
            onClick={handleClear}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              t.isDark ? 'text-white/40 border-white/10 hover:text-white/60 hover:border-white/20' : 'text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-300'
            }`}
          >
            Clear session readings
          </button>
        )}
      </div>

      {/* Last saved evidence */}
      {savedEvidence && (
        <div className={`mt-4 pt-4 border-t ${t.border}`}>
          <div className="flex items-center gap-2 mb-1">
            {savedEvidence.pass
              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              : <AlertTriangle className="w-4 h-4 text-amber-500" />}
            <span className={`text-xs font-semibold ${savedEvidence.pass ? 'text-emerald-600' : 'text-amber-600'}`}>
              {savedEvidence.pass ? 'Audit record: all metrics GOOD' : 'Audit record: some metrics not yet GOOD'}
            </span>
          </div>
          <p className={`${t.textFaint} text-[10px] font-mono`}>
            Saved {new Date(savedEvidence.capturedAt).toLocaleString()}
            {savedEvidence.sessionUrl && ` · ${savedEvidence.sessionUrl}`}
          </p>
          <p className={`${t.textFaint} text-[10px] font-mono mt-0.5`}>
            Audit event: <code>CWV_REPORT_SUBMITTED</code> — ISO 27001 A.12.4.1
          </p>
        </div>
      )}
    </Card>
  );
}

// ─── UAT Sign-off Matrix ──────────────────────────────────────────────────────

interface UatSignoffMatrixProps {
  payload: UatSignoffPayload;
  onSave: (scenarios: Record<string, UatScenarioEntry>) => Promise<void>;
}

function UatSignoffMatrix({ payload, onSave }: UatSignoffMatrixProps) {
  const t = useDashboardTheme();
  const [scenarios, setScenarios] = useState<Record<string, UatScenarioEntry>>({ ...payload.scenarios });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Track dirty state for save button
  const isDirty = JSON.stringify(scenarios) !== JSON.stringify(payload.scenarios);

  const update = (id: string, patch: Partial<UatScenarioEntry>) => {
    setScenarios(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(scenarios); } finally { setSaving(false); }
  };

  const passCnt  = Object.values(scenarios).filter(s => s.status === 'pass').length;
  const failCnt  = Object.values(scenarios).filter(s => s.status === 'fail').length;
  const total    = payload.definitions.length;

  return (
    <Card title="Gate 6 — UAT Sign-off Matrix" className="mt-0">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className={`${t.textFaint} text-xs`}>{passCnt}/{total} scenarios passed</p>
          <div className="flex items-center gap-3 text-xs font-semibold">
            {passCnt  > 0 && <span className="text-emerald-500">{passCnt} Pass</span>}
            {failCnt  > 0 && <span className="text-red-500">{failCnt} Fail</span>}
            {total - passCnt - failCnt > 0 && <span className={t.textFaint}>{total - passCnt - failCnt} Pending</span>}
          </div>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${t.isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
          {passCnt > 0 && <div className="h-full bg-emerald-500 float-left transition-all" style={{ width: `${(passCnt / total) * 100}%` }} />}
          {failCnt > 0 && <div className="h-full bg-red-500 float-left transition-all" style={{ width: `${(failCnt / total) * 100}%` }} />}
        </div>
      </div>

      {/* Scenario rows */}
      <div className="space-y-2">
        {payload.definitions.map(def => {
          const entry = scenarios[def.id] ?? { status: 'pending', tester: '', note: '', signedAt: null };
          const isExpanded = expandedId === def.id;
          const rc = roleColor(def.role, t.isDark);
          const sc = statusColor(entry.status, t.isDark);

          return (
            <div key={def.id} className={`rounded-xl border transition-all ${t.s1} ${t.border}`}>
              {/* Row header */}
              <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : def.id)}
              >
                <span className={`shrink-0 text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${sc}`}>
                  {entry.status.toUpperCase()}
                </span>
                <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded border ${rc}`}>
                  {def.role}
                </span>
                <span className={`${t.textMd} text-xs font-medium flex-1 min-w-0`}>
                  <strong className={`${t.textFaint} font-mono mr-1`}>{def.id}</strong>
                  {def.label}
                </span>
                {entry.status !== 'pending' && entry.tester && (
                  <span className={`${t.textFaint} text-[10px] shrink-0 hidden sm:block`}>
                    {entry.tester}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 ${t.textFaint} shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>

              {/* Expanded controls */}
              {isExpanded && (
                <div className={`border-t ${t.border} p-3 space-y-3`}>
                  {/* Status selector */}
                  <div className="flex flex-wrap gap-2">
                    {(['pending', 'pass', 'fail', 'blocked'] as UatScenarioEntry['status'][]).map(s => (
                      <button
                        key={s}
                        onClick={() => update(def.id, { status: s, signedAt: s !== 'pending' ? new Date().toISOString() : null })}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                          entry.status === s ? statusColor(s, t.isDark) + ' ring-2 ring-offset-1 ring-current' : t.isDark ? 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Tester name */}
                  <input
                    type="text"
                    placeholder="Tester name / initials"
                    value={entry.tester}
                    onChange={e => update(def.id, { tester: e.target.value })}
                    className={`w-full text-xs rounded-lg px-3 py-2 border outline-none transition-colors ${t.inputCls}`}
                  />

                  {/* Notes */}
                  <textarea
                    rows={2}
                    placeholder="Notes / observations (optional)"
                    value={entry.note}
                    onChange={e => update(def.id, { note: e.target.value })}
                    className={`w-full text-xs rounded-lg px-3 py-2 border outline-none transition-colors resize-none ${t.inputCls}`}
                  />

                  {entry.signedAt && (
                    <p className={`${t.textFaint} text-[10px] font-mono`}>
                      Signed: {new Date(entry.signedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save bar */}
      <div className={`flex items-center justify-between mt-4 pt-4 border-t ${t.border}`}>
        <div>
          {payload.updatedAt && (
            <p className={`${t.textFaint} text-[10px] font-mono`}>
              Last saved: {new Date(payload.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <PrimaryBtn
          onClick={handleSave}
          loading={saving}
          disabled={!isDirty || saving}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Sign-off'}
        </PrimaryBtn>
      </div>

      {/* UAT gate note */}
      <p className={`${t.textFaint} text-[10px] mt-2`}>
        Sign-off persisted to Supabase KV · Audit event <code>UAT_SIGNOFF_UPDATED</code> logged (ISO 27001 A.12.4.1)
      </p>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — COMPLIANCE HEALTH  (aggregated cron status, integrity checks, overall health)
// ═══════════════════════════════════════════════════════════════════════════════

function ComplianceHealthTab({ onNavigateToTab }: { onNavigateToTab: (tab: TabKey) => void }) {
  const t = useDashboardTheme();
  const [status, setStatus] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  // ── Zero Demo Data Check state ─────────────────────────────────────────────
  const [zeroDemoResult, setZeroDemoResult] = useState<ZeroDemoDataCheckResult | null>(null);
  const [zeroDemoLoading, setZeroDemoLoading] = useState(false);
  const [zeroDemoRunning, setZeroDemoRunning] = useState(false);

  // ── Schema & RLS Health state ──────────────────────────────────────────────
  const [schemaHealth,     setSchemaHealth]     = useState<SchemaHealthResult | null>(null);
  const [schemaLoading,    setSchemaLoading]    = useState(false);
  const [schemaRunning,    setSchemaRunning]    = useState(false);

  const loadStatus = useCallback(() => {
    setLoading(true);
    fetchComplianceStatus()
      .then(setStatus)
      .catch(err => {
        console.error('[ComplianceHealthTab] load error:', err);
        toast.error(`Failed to load compliance status: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  // Load last persisted zero-demo-check result on mount (non-blocking)
  useEffect(() => {
    setZeroDemoLoading(true);
    fetchLastZeroDemoDataCheck()
      .then(r => setZeroDemoResult(r))
      .catch(() => {/* network error — silently ignore, UI shows "not yet run" */})
      .finally(() => setZeroDemoLoading(false));
  }, []);

  // Load last persisted schema health result on mount (non-blocking)
  useEffect(() => {
    setSchemaLoading(true);
    fetchLastSchemaHealth()
      .then(r => setSchemaHealth(r))
      .catch(err => console.error('[ComplianceHealthTab] schema load:', err))
      .finally(() => setSchemaLoading(false));
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleRunCheck = async () => {
    setRunning(true);
    try {
      const result = await runIntegrityCheckNow();
      if (result.health === 'ok') {
        toast.success(`Integrity check passed — all ${result.checked} days have audit log entries`);
      } else {
        toast.warning(`Integrity check found ${result.gaps.length} missing day${result.gaps.length !== 1 ? 's' : ''}: ${result.gaps.join(', ')}`);
      }
      // Reload compliance status to reflect the new check
      loadStatus();
    } catch (err: any) {
      console.error('[ComplianceHealthTab] manual check error:', err);
      toast.error(`Integrity check failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 className={`w-5 h-5 animate-spin ${t.textFaint}`} />
        <span className={`${t.textFaint} text-sm`}>Loading compliance status…</span>
      </div>
    );
  }

  if (!status) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <XCircle className={`w-10 h-10 ${t.textFaint}`} />
          <p className={`${t.text} font-medium`}>Failed to load compliance status</p>
        </div>
      </Card>
    );
  }

  // Derive composite health: escalate to 'warning' for pen test failures OR demo data found
  const penFails      = status.penTestProgress?.fail ?? 0;
  const demoDataFail  = zeroDemoResult !== null && !zeroDemoResult.pass;
  const schemaFail    = schemaHealth !== null && schemaHealth?.healthy === false;
  const compositeHealth: 'healthy' | 'warning' | 'unknown' =
    status.health === 'unknown'   ? 'unknown' :
    status.health === 'warning'   ? 'warning' :
    penFails > 0                  ? 'warning' :
    demoDataFail                  ? 'warning' :
    schemaFail                    ? 'warning' :
    /* all OK */                    'healthy';

  const integrityWarning = status.health === 'warning';
  const penTestOnly  = penFails > 0 && !integrityWarning && !demoDataFail;
  const bothWarnings = penFails > 0 && integrityWarning;

  const warningDesc =
    schemaFail
      ? `Schema / RLS issue: ${(schemaHealth?.unexpected?.length ?? 0)} unexpected table(s), ${(schemaHealth?.missingRls?.length ?? 0)} table(s) missing RLS. Run Schema & RLS Check below, fix, re-save.`
    : demoDataFail && (integrityWarning || penFails > 0)
      ? `Demo data detected in production AND ${integrityWarning ? 'missing audit log days' : `${penFails} pen test failure${penFails !== 1 ? 's' : ''}`}. Deployment is blocked.`
    : demoDataFail
      ? `Demo/test data found in the production database. Gate 5 is blocked — run the Zero Demo Data Check below and remediate all findings.`
    : bothWarnings
      ? `Missing audit log days detected AND ${penFails} penetration test case${penFails !== 1 ? 's' : ''} failed. Review both the integrity history and Penetration Test tab.`
    : penTestOnly
      ? `${penFails} penetration test case${penFails !== 1 ? 's' : ''} failed. Review the Penetration Test tab for details.`
    : /* integrity */ 'Missing audit log days detected in recent integrity checks. Review the integrity history below.';

  const healthConfig = {
    healthy: { icon: <CheckCircle2 className="w-8 h-8 text-emerald-500" />, label: 'All Systems Healthy', cls: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600', desc: 'All integrity checks passed. No missing audit log days detected.' },
    warning: { icon: <AlertTriangle className="w-8 h-8 text-amber-500" />, label: 'Warnings Detected', cls: 'bg-amber-500/10 border-amber-500/25 text-amber-600', desc: warningDesc },
    unknown: { icon: <HelpCircle className="w-8 h-8 text-gray-400" />, label: 'No Data Yet', cls: t.isDark ? 'bg-white/5 border-white/10 text-white/50' : 'bg-gray-50 border-gray-200 text-gray-500', desc: 'The weekly integrity check has not run yet. It is scheduled to run every Sunday at 04:00 UTC.' },
  };

  const hc = healthConfig[compositeHealth];

  return (
    <>
      {/* Overall health banner */}
      <div className={`rounded-2xl border p-6 mb-6 ${hc.cls}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {hc.icon}
            <div>
              <h3 className="text-lg font-bold">{hc.label}</h3>
              <p className="text-sm opacity-80 mt-1">{hc.desc}</p>
            </div>
          </div>
          <PrimaryBtn
            variant="ghost"
            onClick={handleRunCheck}
            loading={running}
            disabled={running}
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {running ? 'Running…' : 'Run Check Now'}
          </PrimaryBtn>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Last Integrity Check */}
        <Card title="Last Integrity Check">
          {status.lastCheck ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {status.lastCheck.action === 'AUDIT_INTEGRITY_OK'
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  : <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
                <div>
                  <p className={`${t.text} text-sm font-semibold`}>
                    {status.lastCheck.action === 'AUDIT_INTEGRITY_OK' ? 'Passed' : 'Warning'}
                  </p>
                  <p className={`${t.textFaint} text-xs font-mono`}>
                    {new Date(status.lastCheck.ts).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className={`p-3 rounded-xl border ${t.s1} ${t.border}`}>
                <p className={`${t.textMd} text-xs font-mono`}>{status.lastCheck.detail}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-4">
              <HelpCircle className={`w-5 h-5 ${t.textFaint}`} />
              <p className={`${t.textFaint} text-sm`}>No integrity checks have run yet</p>
            </div>
          )}
        </Card>

        {/* Next Scheduled Check */}
        <Card title="Next Scheduled Check">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              t.isDark ? 'bg-purple-500/15 border border-purple-500/25' : 'bg-purple-50 border border-purple-200'
            }`}>
              <Timer className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className={`${t.text} text-sm font-semibold`}>
                {new Date(status.nextScheduledCheck).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <p className={`${t.textFaint} text-xs`}>
                at {new Date(status.nextScheduledCheck).toLocaleTimeString()} (Sunday 04:00 UTC)
              </p>
            </div>
          </div>
          <div className={`mt-3 p-3 rounded-xl border ${t.s1} ${t.border}`}>
            <p className={`${t.textFaint} text-xs`}>
              The integrity check verifies that every day in the preceding 7 days has at least one security audit log entry.
              Missing days are flagged as <code className="text-amber-500">AUDIT_INTEGRITY_WARNING</code>.
            </p>
          </div>
        </Card>

        {/* Integrity Check History */}
        <Card title="Integrity Check History" className="lg:col-span-2">
          {status.integrityResults.length > 0 ? (
            <div className="space-y-2">
              {status.integrityResults.map((r, i) => (
                <div key={`${r.ts}-${i}`} className={`flex items-center gap-3 p-3 rounded-xl border ${t.s1} ${t.border}`}>
                  {r.action === 'AUDIT_INTEGRITY_OK'
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        r.action === 'AUDIT_INTEGRITY_OK'
                          ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25'
                          : 'bg-amber-500/15 text-amber-600 border-amber-500/25'
                      }`}>
                        {r.action === 'AUDIT_INTEGRITY_OK' ? 'PASSED' : 'WARNING'}
                      </span>
                      <span className={`${t.textFaint} text-xs font-mono`}>{new Date(r.ts).toLocaleString()}</span>
                    </div>
                    {r.detail && (
                      <p className={`${t.textMd} text-xs font-mono mt-1`}>{r.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 py-6">
              <HelpCircle className={`w-5 h-5 ${t.textFaint}`} />
              <p className={`${t.textFaint} text-sm`}>No integrity check results found in the last 14 days</p>
            </div>
          )}
        </Card>

        {/* Registered Cron Jobs */}
        <Card title="Registered Cron Jobs" className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Cog className={`w-4 h-4 ${t.textFaint}`} />
            <span className={`${t.textFaint} text-xs`}>5 cron jobs registered — all managed by Deno.cron</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {status.crons.map(cron => (
              <div key={cron.name} className={`p-3 rounded-xl border ${t.s1} ${t.border}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-2 h-2 rounded-full bg-emerald-500 animate-pulse`} />
                  <p className={`${t.text} text-xs font-semibold truncate`}>{cron.name}</p>
                </div>
                <p className={`${t.textFaint} text-xs mb-2`}>{cron.description}</p>
                <code className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  t.isDark ? 'bg-white/5 text-purple-400' : 'bg-purple-50 text-purple-600'
                }`}>
                  {cron.schedule}
                </code>
              </div>
            ))}
          </div>
        </Card>

        {/* Retention Policy Status */}
        <Card title="Retention Policy Status" className="lg:col-span-2">
          <div className="flex items-center gap-3">
            {status.retentionConfigured
              ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              : <Info className="w-5 h-5 text-sky-500 shrink-0" />}
            <div>
              <p className={`${t.text} text-sm font-semibold`}>
                {status.retentionConfigured ? 'Custom policy configured' : 'Using default retention values'}
              </p>
              <p className={`${t.textFaint} text-xs`}>
                {status.retentionConfigured
                  ? 'A Super Admin has customised the data retention windows. Visit the Data Retention tab to review.'
                  : 'No changes have been made to retention defaults. Visit the Data Retention tab to customise.'}
              </p>
            </div>
          </div>
          {status.retentionPolicy && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
              {[
                { label: 'Audit Logs', value: `${status.retentionPolicy.auditLogDays}d` },
                { label: 'OAuth State', value: `${status.retentionPolicy.oauthStateMinutes}m` },
                { label: 'SLA Dedup', value: `${status.retentionPolicy.slaDedupDays}d` },
                { label: 'Usage Records', value: `${status.retentionPolicy.usageRecordMonths}mo` },
                { label: 'Review Tokens', value: `${status.retentionPolicy.reviewTokenDays}d` },
              ].map(item => (
                <div key={item.label} className={`text-center p-2 rounded-xl border ${t.s1} ${t.border}`}>
                  <p className={`${t.text} text-lg font-bold font-mono`}>{item.value}</p>
                  <p className={`${t.textFaint} text-[10px]`}>{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Penetration Test Readiness */}
      <PenTestReadinessCard progress={status.penTestProgress} onViewDetails={() => onNavigateToTab('pentest')} />

      {/* Zero Demo Data Check (Gate 5) */}
      <ZeroDemoDataCard
        result={zeroDemoResult}
        loading={zeroDemoLoading}
        running={zeroDemoRunning}
        onRun={async () => {
          setZeroDemoRunning(true);
          try {
            const res = await runZeroDemoDataCheck();
            setZeroDemoResult(res);
            if (res.pass) {
              toast.success(`Zero demo data check passed — ${res.summary.authUsersChecked + res.summary.tenantRowsChecked + res.summary.userRowsChecked} records scanned, 0 findings.`);
            } else {
              toast.error(`Zero demo data check FAILED — ${res.findings.length} finding${res.findings.length !== 1 ? 's' : ''} detected. Deployment blocked.`);
            }
          } catch (err: any) {
            console.error('[ZeroDemoDataCard] run error:', err);
            toast.error(`Zero demo data check error: ${err.message}`);
          } finally {
            setZeroDemoRunning(false);
          }
        }}
      />

      {/* Schema & RLS Health Check (Gates 3 + 5) */}
      <SchemaHealthCard
        result={schemaHealth}
        loading={schemaLoading}
        running={schemaRunning}
        onRun={async () => {
          setSchemaRunning(true);
          try {
            const res = await saveSchemaHealth();
            setSchemaHealth(res);
            if (res.healthy) {
              toast.success('Schema & RLS check passed — all tables verified.');
            } else {
              toast.error(
                `Schema check found issues: ${res.unexpected.length} unexpected table(s), ${res.missingRls.length} missing RLS.`,
              );
            }
          } catch (err: any) {
            console.error('[SchemaHealthCard] run error:', err);
            toast.error(`Schema check failed: ${err.message}`);
          } finally {
            setSchemaRunning(false);
          }
        }}
      />

      {/* Alert Recipients */}
      <AlertRecipientsCard />

      {/* ISO / PDPA compliance footer */}
      <div className={`mt-6 flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
        t.isDark ? 'bg-sky-500/5 border-sky-500/20 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-700'
      }`}>
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>Compliance Coverage:</strong> ISO 27001 A.9.2.3 (RLS / access control), A.12.4.1 (event logging), A.12.4.2 (log protection), A.14.1.2 (CSRF/HMAC defence), A.18.1.3 (retention), A.18.1.4 (zero demo data scan); Malaysia PDPA s.9 (data protection safeguards), s.10 (data retention limits). All 5 cron jobs run via Deno.cron. Gate 4 CWV instrumented via web-vitals (DevTools Console). Gate 3+5 Schema & RLS evidence saved to KV <code>schema_health:latest</code>.
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PENETRATION TEST READINESS CARD  (summary from server-stored pen test results)
// ═══════════════════════════════════════════════════════════════════════════════

interface PenTestProgress {
  total: number;
  pass: number;
  fail: number;
  partial: number;
  notTested: number;
  na: number;
  updatedAt: string | null;
}

function PenTestReadinessCard({ progress, onViewDetails }: { progress?: PenTestProgress; onViewDetails: () => void }) {
  const t = useDashboardTheme();

  // Total expected test cases (from the checklist definition)
  const TOTAL_DEFINED = 51; // 9 categories × avg ~5.7 items

  const p = progress ?? { total: 0, pass: 0, fail: 0, partial: 0, notTested: 0, na: 0, updatedAt: null };
  const assessed = p.pass + p.fail + p.partial + p.na;
  const assessedPct = p.total > 0 ? Math.round((assessed / TOTAL_DEFINED) * 100) : 0;
  const passRate = assessed > 0 ? Math.round((p.pass / (p.pass + p.fail + p.partial)) * 100) : 0;

  // Determine readiness level
  const readiness: 'not_started' | 'in_progress' | 'needs_attention' | 'ready' =
    p.total === 0           ? 'not_started' :
    p.fail > 0              ? 'needs_attention' :
    assessedPct < 80        ? 'in_progress' :
    /* 80%+ assessed, 0 fails */ 'ready';

  const readinessConfig = {
    not_started:     { label: 'Not Started',     cls: t.isDark ? 'bg-white/5 border-white/10 text-white/50' : 'bg-gray-50 border-gray-200 text-gray-500',       icon: <HelpCircle className="w-5 h-5" /> },
    in_progress:     { label: 'In Progress',     cls: 'bg-sky-500/10 border-sky-500/25 text-sky-600',       icon: <ShieldCheck className="w-5 h-5" /> },
    needs_attention: { label: 'Needs Attention', cls: 'bg-red-500/10 border-red-500/25 text-red-600',       icon: <XCircle className="w-5 h-5" /> },
    ready:           { label: 'Ready',           cls: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600', icon: <CheckCircle2 className="w-5 h-5" /> },
  };

  const rc = readinessConfig[readiness];

  return (
    <Card title="Penetration Test Readiness" className="mt-6">
      <div className="flex items-start gap-4">
        {/* Status badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${rc.cls}`}>
          {rc.icon}
          {rc.label}
        </div>

        <div className="flex-1 min-w-0">
          {readiness === 'not_started' ? (
            <p className={`${t.textFaint} text-sm`}>
              No pen test results have been recorded yet. Visit the <strong className={t.text}>Penetration Test</strong> tab to begin assessing the {TOTAL_DEFINED} test cases.
            </p>
          ) : (
            <>
              <p className={`${t.textMd} text-sm`}>
                {assessedPct}% assessed ({assessed} of {TOTAL_DEFINED} test cases)
                {p.fail > 0 && <span className="text-red-500 font-bold"> · {p.fail} failed</span>}
              </p>
              {p.updatedAt && (
                <p className={`${t.textFaint} text-xs mt-1`}>
                  Last updated: {new Date(p.updatedAt).toLocaleString()}
                </p>
              )}
            </>
          )}
        </div>

        {/* View Details button */}
        <button
          onClick={onViewDetails}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            t.isDark
              ? 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
              : 'bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-200'
          }`}
        >
          View Details
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress breakdown */}
      {p.total > 0 && (
        <div className="mt-4">
          {/* Mini bar */}
          <div className={`h-2.5 rounded-full overflow-hidden flex ${t.isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
            {p.pass > 0    && <div className="bg-emerald-500 transition-all" style={{ width: `${(p.pass / TOTAL_DEFINED) * 100}%` }} />}
            {p.partial > 0 && <div className="bg-amber-500 transition-all"   style={{ width: `${(p.partial / TOTAL_DEFINED) * 100}%` }} />}
            {p.fail > 0    && <div className="bg-red-500 transition-all"     style={{ width: `${(p.fail / TOTAL_DEFINED) * 100}%` }} />}
            {p.na > 0      && <div className={`${t.isDark ? 'bg-white/20' : 'bg-gray-300'} transition-all`} style={{ width: `${(p.na / TOTAL_DEFINED) * 100}%` }} />}
          </div>

          {/* Stat chips */}
          <div className="flex flex-wrap gap-3 mt-3">
            {([
              ['Pass', p.pass, 'text-emerald-500'],
              ['Partial', p.partial, 'text-amber-500'],
              ['Fail', p.fail, 'text-red-500'],
              ['Not Tested', TOTAL_DEFINED - assessed, t.textFaint],
              ['N/A', p.na, t.textFaint],
            ] as const).filter(([, count]) => count > 0).map(([label, count, cls]) => (
              <span key={label} className={`text-xs font-semibold ${cls}`}>
                {count} {label}
              </span>
            ))}
            {assessed > 0 && p.fail === 0 && (
              <span className="text-xs font-semibold text-emerald-500 ml-auto">
                {passRate}% pass rate
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZERO DEMO DATA CARD  (Gate 5 — SOP §12 automated check)
// ═══════════════════════════════════════════════════════════════════════════════

interface ZeroDemoDataCardProps {
  result:  ZeroDemoDataCheckResult | null;
  loading: boolean;
  running: boolean;
  onRun:   () => void;
}

function ZeroDemoDataCard({ result, loading, running, onRun }: ZeroDemoDataCardProps) {
  const t = useDashboardTheme();

  // Status derivation
  const status: 'pass' | 'fail' | 'never_run' =
    loading         ? 'never_run' :
    result === null ? 'never_run' :
    result.pass     ? 'pass'      :
    /* fail */        'fail';

  const statusConfig = {
    pass: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      badge: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
      label: 'PASSED — No demo data found',
    },
    fail: {
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      badge: 'bg-red-500/15 text-red-700 border-red-500/30',
      label: `FAILED — ${result?.findings.length ?? 0} finding${(result?.findings.length ?? 0) !== 1 ? 's' : ''} detected`,
    },
    never_run: {
      icon: <HelpCircle className={`w-5 h-5 ${t.textFaint}`} />,
      badge: t.isDark ? 'bg-white/5 border-white/10 text-white/50' : 'bg-gray-50 border-gray-200 text-gray-500',
      label: 'Not yet run — click "Run Check" to scan production data',
    },
  };

  const sc = statusConfig[status];

  return (
    <Card title="Zero Demo Data Check" className="mt-6">
      {/* Header row */}
      <div className="flex items-start gap-4">
        {/* Status indicator */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${sc.badge}`}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : sc.icon}
          {loading ? 'Loading last result…' : sc.label}
        </div>

        <div className="flex-1 min-w-0" />

        {/* Run button */}
        <button
          onClick={onRun}
          disabled={running || loading}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            running || loading
              ? t.isDark ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/10 text-white/40' : 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
              : t.isDark ? 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 border-gray-200'
          }`}
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanSearch className="w-3.5 h-3.5" />}
          {running ? 'Scanning…' : 'Run Check'}
        </button>
      </div>

      {/* Description */}
      <p className={`${t.textFaint} text-xs mt-3`}>
        Scans <strong className={t.textMd}>auth.users</strong>, <strong className={t.textMd}>tenants</strong>, <strong className={t.textMd}>tenant_users</strong>, and <strong className={t.textMd}>storage</strong> for demo/test email domains (@test, @example, @demo), placeholder names (e.g. John Doe), placeholder company names (e.g. Acme Corp), and sample file names. A <strong>FAIL</strong> result blocks Gate 5 and deployment.
      </p>

      {/* Scan summary (only after a run) */}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Auth Users',  value: result.summary.authUsersChecked  },
            { label: 'Tenants',     value: result.summary.tenantRowsChecked },
            { label: 'Users',       value: result.summary.userRowsChecked   },
            { label: 'Storage Files', value: result.summary.storageFilesFound },
          ].map(item => (
            <div key={item.label} className={`text-center p-2 rounded-xl border ${t.s1} ${t.border}`}>
              <p className={`${t.text} text-lg font-bold font-mono`}>{item.value}</p>
              <p className={`${t.textFaint} text-[10px]`}>{item.label} scanned</p>
            </div>
          ))}
        </div>
      )}

      {/* Findings list */}
      {result && result.findings.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-red-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {result.findings.length} finding{result.findings.length !== 1 ? 's' : ''} — must be remediated before deployment
          </p>
          {result.findings.map((f, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
              t.isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'
            }`}>
              <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className={`${t.text} text-xs font-semibold`}>
                  <code className={`${t.isDark ? 'text-red-400' : 'text-red-600'} font-mono`}>{f.table}</code>
                  <span className={t.textFaint}> → </span>
                  <code className={`${t.isDark ? 'text-orange-300' : 'text-orange-700'} font-mono`}>{f.field}</code>
                </p>
                <p className={`${t.textMd} text-xs mt-0.5`}>
                  Value: <code className="font-mono">{f.value}</code> — {f.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clean pass detail */}
      {result && result.pass && (
        <div className={`mt-3 flex items-center gap-2 p-3 rounded-xl border ${
          t.isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-xs text-emerald-700">
            All records are clean. Gate 5 zero-demo-data requirement is satisfied. ✅
          </p>
        </div>
      )}

      {/* Last run timestamp */}
      {result && (
        <p className={`${t.textFaint} text-[10px] mt-3 font-mono`}>
          Last checked: {new Date(result.checkedAt).toLocaleString()} · SOP §12 · ISO 27001 A.18.1.4
        </p>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMA & RLS HEALTH CARD  (Gates 3 + 5 — SOP §13 automated check)
// ═══════════════════════════════════════════════════════════════════════════════
// Queries pg_tables.rowsecurity for all public-schema tables via SUPABASE_DB_URL.
// A healthy schema has ONLY expected tables, ALL with RLS enabled.
// ═══════════════════════════════════════════════════════════════════════════════

interface SchemaHealthCardProps {
  result:  SchemaHealthResult | null;
  loading: boolean;
  running: boolean;
  onRun:   () => void;
}

function SchemaHealthCard({ result, loading, running, onRun }: SchemaHealthCardProps) {
  const t = useDashboardTheme();

  const status: 'healthy' | 'unhealthy' | 'never_run' =
    loading         ? 'never_run' :
    result === null ? 'never_run' :
    result.healthy  ? 'healthy'   :
    /* else */        'unhealthy';

  const statusConfig = {
    healthy: {
      icon:  <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      badge: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
      label: 'PASSED — Schema & RLS verified',
    },
    unhealthy: {
      icon:  <XCircle className="w-5 h-5 text-red-500" />,
      badge: 'bg-red-500/15 text-red-700 border-red-500/30',
      label: 'FAILED — Issues detected',
    },
    never_run: {
      icon:  <HelpCircle className="w-5 h-5 text-gray-400" />,
      badge: t.isDark ? 'bg-white/5 text-white/40 border-white/10' : 'bg-gray-50 text-gray-400 border-gray-200',
      label: 'NOT YET RUN',
    },
  };

  const sc = statusConfig[status];

  return (
    <Card title="Schema & RLS Health Check" className="mt-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {loading ? <Loader2 className={`w-5 h-5 animate-spin ${t.textFaint}`} /> : sc.icon}
          <div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${sc.badge}`}>{sc.label}</span>
            {result?.savedAt && (
              <p className={`text-[10px] mt-1 ${t.textFaint}`}>
                Last saved {new Date(result.savedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <PrimaryBtn onClick={onRun} loading={running} disabled={running || loading}>
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          {running ? 'Checking…' : 'Run Schema & RLS Check'}
        </PrimaryBtn>
      </div>

      {/* Context note */}
      <p className={`text-xs mb-4 leading-relaxed ${t.textFaint}`}>
        Queries <code className={t.isDark ? 'text-purple-400' : 'text-purple-600'}>pg_tables</code> and <code className={t.isDark ? 'text-purple-400' : 'text-purple-600'}>pg_policies</code> directly via <code className={t.isDark ? 'text-purple-400' : 'text-purple-600'}>SUPABASE_DB_URL</code>.
        Expected tables: <code className={t.isDark ? 'text-teal-400' : 'text-teal-600'}>kv_store_309fe679</code>.
        Any unexpected table or missing RLS policy blocks Gates 3 and 5.
      </p>

      {/* Results table */}
      {result && result.tables.length > 0 ? (
        <div className="space-y-2">
          {result.tables.map(tbl => {
            const isOk = tbl.isExpected && tbl.rlsEnabled;
            return (
              <div
                key={tbl.name}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border ${
                  isOk
                    ? t.isDark ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-emerald-50 border-emerald-200'
                    : t.isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isOk
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  <code className={`text-xs font-mono truncate ${t.text}`}>{tbl.name}</code>
                  {!tbl.isExpected && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-700 border border-orange-400/30 whitespace-nowrap">
                      UNEXPECTED
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    tbl.rlsEnabled
                      ? 'bg-emerald-500/15 text-emerald-700 border-emerald-400/30'
                      : 'bg-red-500/15 text-red-700 border-red-400/30'
                  }`}>
                    RLS {tbl.rlsEnabled ? 'ON' : 'OFF'}
                  </span>
                  <span className={`text-[10px] ${t.textFaint}`}>
                    {tbl.policyCount} {tbl.policyCount === 1 ? 'policy' : 'policies'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : !loading && result !== null ? (
        <div className={`flex items-center gap-3 py-4 ${t.textFaint}`}>
          <Info className="w-4 h-4 shrink-0" />
          <p className="text-sm">No tables found in the public schema.</p>
        </div>
      ) : !loading ? (
        <div className={`flex items-center gap-3 py-6 ${t.textFaint}`}>
          <HelpCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">Click <strong>Run Schema &amp; RLS Check</strong> to query the live database.</p>
        </div>
      ) : null}

      {/* Failure guidance */}
      {status === 'unhealthy' && (
        <div className={`mt-4 p-3 rounded-xl border text-xs space-y-1 ${
          t.isDark ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {(result?.unexpected ?? []).length > 0 && (
            <p>⚠️ <strong>Unexpected tables:</strong> {result!.unexpected.map(x => x.name).join(', ')} — verify these were intentionally created; enable RLS via Supabase Dashboard → Table Editor → Row Level Security.</p>
          )}
          {(result?.missingRls ?? []).length > 0 && (
            <p>⚠️ <strong>Tables missing RLS:</strong> {result!.missingRls.map(x => x.name).join(', ')} — enable RLS and add at least one policy before deploying.</p>
          )}
        </div>
      )}

      {/* ISO / PDPA reference */}
      <p className={`mt-4 text-[10px] ${t.textFaint}`}>
        ISO 27001 A.9.2.3 (access control) · A.14.1.2 (secure configuration) · Malaysia PDPA s.9 (data protection safeguards) — Evidence saved to KV key <code>schema_health:latest</code> and logged as <code>SCHEMA_HEALTH_SAVED</code>.
      </p>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT RECIPIENTS CARD  (configurable stakeholder email list for integrity alerts)
// ═══════════════════════════════════════════════════════════════════════════════

const ROLE_OPTIONS = ['IT Admin', 'CISO', 'DPO', 'CTO', 'Compliance Officer', 'CEO', 'Custom'];

function AlertRecipientsCard() {
  const t = useDashboardTheme();

  const [recipients, setRecipients] = useState<AlertRecipient[]>([]);
  const [savedRecipients, setSavedRecipients] = useState<AlertRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add new recipient form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('IT Admin');

  const isDirty = JSON.stringify(recipients) !== JSON.stringify(savedRecipients);

  useEffect(() => {
    fetchAlertRecipients()
      .then(r => { setRecipients(r); setSavedRecipients(r); })
      .catch(err => {
        console.error('[AlertRecipientsCard] load error:', err);
        toast.error(`Failed to load alert recipients: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (id: string) => {
    setRecipients(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleRemove = (id: string) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  };

  const handleAdd = () => {
    if (!newName.trim() || !newEmail.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error('Invalid email format');
      return;
    }
    if (recipients.some(r => r.email.toLowerCase() === newEmail.toLowerCase())) {
      toast.error('This email is already in the recipient list');
      return;
    }
    const nr: AlertRecipient = {
      id: crypto.randomUUID(),
      email: newEmail.trim(),
      name: newName.trim(),
      role: newRole,
      enabled: true,
      addedAt: new Date().toISOString(),
    };
    setRecipients(prev => [...prev, nr]);
    setNewName('');
    setNewEmail('');
    setNewRole('IT Admin');
    setShowAddForm(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateAlertRecipients(recipients);
      setRecipients(updated);
      setSavedRecipients(updated);
      toast.success(`Alert recipients saved — ${updated.filter(r => r.enabled).length} active`);
    } catch (err: any) {
      console.error('[AlertRecipientsCard] save error:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setRecipients(savedRecipients);
    setShowAddForm(false);
    setNewName('');
    setNewEmail('');
    setNewRole('IT Admin');
  };

  const enabledCount = recipients.filter(r => r.enabled).length;

  const inputCls = `w-full rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none ${
    t.isDark
      ? 'bg-white/5 border-white/15 text-white placeholder-white/40 focus:border-white/30'
      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-300'
  }`;
  const selectCls = `rounded-xl border px-3 py-2 text-sm transition-all focus:outline-none ${
    t.isDark
      ? 'bg-white/5 border-white/15 text-white focus:border-white/30'
      : 'bg-white border-gray-200 text-gray-900 focus:border-gray-300'
  }`;

  if (loading) {
    return (
      <Card title="Integrity Alert Recipients" className="mt-6">
        <div className="flex items-center justify-center py-10 gap-3">
          <Loader2 className={`w-4 h-4 animate-spin ${t.textFaint}`} />
          <span className={`${t.textFaint} text-sm`}>Loading recipients…</span>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" style={{ color: '#F47A20' }} />
          <span>Integrity Alert Recipients</span>
          <span className={`text-[0.65rem] font-semibold px-2 py-0.5 rounded-full border ${
            t.isDark ? 'border-white/15 text-white/50' : 'border-gray-200 text-gray-500'
          }`}>
            {enabledCount} active
          </span>
        </div>
      }
      className="mt-6"
    >
      <p className={`${t.textFaint} text-xs mb-4`}>
        When the weekly or on-demand integrity check detects missing audit log days, an alert email is sent to all enabled recipients below.
      </p>

      {/* Recipients list */}
      {recipients.length === 0 ? (
        <div className={`flex items-center gap-3 py-6 justify-center ${t.textFaint}`}>
          <Mail className="w-5 h-5" />
          <span className="text-sm">No recipients configured — add at least one stakeholder</span>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {recipients.map(r => (
            <div key={r.id} className={`flex items-center gap-3 p-3 rounded-xl border ${t.s1} ${t.border}`}>
              {/* Toggle */}
              <button
                type="button"
                onClick={() => handleToggle(r.id)}
                className="shrink-0 transition-colors"
                title={r.enabled ? 'Disable this recipient' : 'Enable this recipient'}
              >
                {r.enabled
                  ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                  : <ToggleLeft className={`w-6 h-6 ${t.textFaint}`} />}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-semibold ${r.enabled ? t.text : t.textFaint} truncate`}>{r.name}</span>
                  <span className={`text-[0.6rem] font-semibold px-2 py-0.5 rounded-full border ${
                    t.isDark ? 'border-white/15 text-white/40' : 'border-gray-200 text-gray-400'
                  }`}>{r.role}</span>
                </div>
                <p className={`${t.textFaint} text-xs font-mono truncate`}>{r.email}</p>
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => handleRemove(r.id)}
                className={`p-1.5 rounded-lg transition-colors ${
                  t.isDark ? 'hover:bg-red-500/15 text-white/30 hover:text-red-400' : 'hover:bg-red-50 text-gray-300 hover:text-red-500'
                }`}
                title="Remove recipient"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new recipient form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className={`p-4 rounded-xl border ${t.isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`${t.text} text-sm font-semibold`}>Add Recipient</span>
                <button type="button" onClick={() => setShowAddForm(false)} className={`${t.textFaint} hover:${t.text} transition-colors`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <input
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Full name" className={inputCls}
                />
                <input
                  type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  placeholder="email@company.com" className={inputCls}
                />
                <select value={newRole} onChange={e => setNewRole(e.target.value)} className={selectCls}>
                  {ROLE_OPTIONS.map(ro => <option key={ro} value={ro}>{ro}</option>)}
                </select>
              </div>
              <button
                type="button" onClick={handleAdd}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: '#0BA4AA' }}
              >
                <Plus className="w-3.5 h-3.5" /> Add Recipient
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
            t.isDark
              ? 'border-white/15 text-white/60 hover:text-white hover:border-white/25 disabled:opacity-40'
              : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 disabled:opacity-40'
          }`}
        >
          <Plus className="w-3.5 h-3.5" /> Add Stakeholder
        </button>

        {isDirty && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            <span className={`text-xs ${t.isDark ? 'text-amber-400' : 'text-amber-600'}`}>Unsaved changes</span>
            <button
              type="button" onClick={handleDiscard}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                t.isDark ? 'border-white/15 text-white/60 hover:text-white' : 'border-gray-200 text-gray-500 hover:text-gray-700'
              }`}
            >
              Discard
            </button>
            <button
              type="button" onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: '#0BA4AA' }}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {saving ? 'Saving…' : 'Save Recipients'}
            </button>
          </motion.div>
        )}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — APPLICATION AUDIT  (existing functionality, enhanced with CSV export)
// ═══════════════════════════════════════════════════════════════════════════════

function ApplicationAuditTab() {
  const t = useDashboardTheme();
  const [logs,           setLogs]           = useState<AuditLog[]>([]);
  const [loadingData,    setLoadingData]    = useState(true);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'info' | 'warning' | 'critical'>('all');
  const [roleFilter,     setRoleFilter]     = useState<'all' | 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'EMPLOYEE'>('all');

  useEffect(() => {
    setLoadingData(true);
    fetchAuditLogs().then(setLogs).catch(err => {
      console.error('[AuditPage] load error:', err);
      toast.error(`Failed to load audit logs: ${err.message}`);
    }).finally(() => setLoadingData(false));
  }, []);

  const filtered = logs.filter(a => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (roleFilter !== 'all' && a.actorRole !== roleFilter) return false;
    return true;
  });

  const exportCsv = () => {
    if (!filtered.length) { toast.error('No data to export'); return; }
    downloadCsv(
      `app-audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Timestamp', 'User', 'Role', 'Action', 'Tenant', 'Detail', 'IP', 'Severity'],
      filtered.map(a => [a.createdAt, a.actorName, a.actorRole, a.action, a.tenantName ?? '', a.detail, a.ip, a.severity]),
    );
    toast.success(`Exported ${filtered.length} rows to CSV`);
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'createdAt', header: 'Timestamp', sortable: true,
      render: a => <span className={`${t.textMd} text-xs font-mono whitespace-nowrap`}>{new Date(a.createdAt).toLocaleString()}</span>
    },
    {
      key: 'actorName', header: 'User', sortable: true,
      render: a => (
        <div className="flex items-center gap-2.5 min-w-[140px]">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-purple-600">
              {a.actorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <p className={`${t.text} text-sm font-medium leading-tight whitespace-nowrap`}>{a.actorName}</p>
            <RoleBadge role={a.actorRole} />
          </div>
        </div>
      )
    },
    { key: 'action', header: 'Action', render: a => <code className="text-purple-600 text-xs bg-purple-500/10 px-2 py-0.5 rounded">{a.action}</code> },
    { key: 'tenantName', header: 'Tenant', render: a => (
      a.tenantName ? (
        <div className="flex items-center gap-2.5 min-w-[140px]">
          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-orange-600">
              {a.tenantName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <p className={`${t.text} text-sm font-medium leading-tight whitespace-nowrap`}>{a.tenantName}</p>
        </div>
      ) : (
        <span className={`${t.textFaint} text-sm`}>—</span>
      )
    )},
    {
      key: 'detail', header: 'Detail',
      render: a => <span className={`${t.textMd} text-xs max-w-[200px] block truncate`} title={a.detail}>{a.detail}</span>
    },
    { key: 'ip', header: 'IP', render: a => <span className={`${t.textFaint} text-xs font-mono`}>{a.ip}</span> },
    { key: 'severity', header: 'Severity', render: a => <StatusBadge status={a.severity} /> },
  ];

  return (
    <>
      {/* Actions bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex gap-3 flex-wrap">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Critical', count: logs.filter(a => a.severity === 'critical').length, cls: 'bg-red-500/20 border-red-500/20 text-red-600' },
              { label: 'Warning',  count: logs.filter(a => a.severity === 'warning').length,  cls: 'bg-amber-500/20 border-amber-500/20 text-amber-600' },
              { label: 'Info',     count: logs.filter(a => a.severity === 'info').length,     cls: 'bg-sky-500/20 border-sky-500/20 text-sky-600' },
            ].map(s => (
              <div key={s.label} className={`${s.cls} border rounded-xl px-4 py-3 text-center`}>
                <p className="text-xl font-bold">{s.count}</p>
                <p className="text-xs opacity-80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <PrimaryBtn variant="ghost" onClick={exportCsv}>
          <Download className="w-4 h-4" /> Export CSV
        </PrimaryBtn>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap mb-4">
        <div className={`flex gap-1 ${t.tabBg} rounded-xl p-1`}>
          {(['all', 'info', 'warning', 'critical'] as const).map(s => (
            <button key={s} onClick={() => setSeverityFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${severityFilter === s ? t.tabActive : t.tabInactive}`}
            >{s}</button>
          ))}
        </div>
        <div className={`flex gap-1 ${t.tabBg} rounded-xl p-1`}>
          {(['all', 'SUPER_ADMIN', 'TENANT_ADMIN', 'EMPLOYEE'] as const).map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${roleFilter === r ? t.tabActive : t.tabInactive}`}
            >{r === 'all' ? 'All Roles' : r.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns} data={filtered} keyField="id"
          searchPlaceholder="Search by action, user, tenant…"
          searchFields={['actorName', 'action', 'tenantName', 'detail']}
          pageSize={8}
          emptyTitle="No audit events" emptyDescription="No events match the current filters."
        />
      </Card>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — SECURITY AUDIT LOG  (Phase 6 — ISO 27001 A.12.4.1 / A.12.4.2)
// ═══════════════════════════════════════════════════════════════════════════════

function SecurityAuditTab() {
  const t = useDashboardTheme();
  const today = new Date().toISOString().slice(0, 10);

  const [date,        setDate]        = useState(today);
  const [entries,     setEntries]     = useState<SecurityAuditEntry[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [summary,     setSummary]     = useState<SecurityAuditDaySummary[]>([]);
  const [summaryDays, setSummaryDays] = useState(14);
  const [actionFilter, setActionFilter] = useState<string>('all');

  const loadDay = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetchSecurityAuditLog(d);
      setEntries(res.entries);
    } catch (err: any) {
      console.error('[SecurityAuditTab] load error:', err);
      toast.error(`Failed to load security log: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetchSecurityAuditSummary(summaryDays);
      setSummary(res.summary);
    } catch (err: any) {
      console.error('[SecurityAuditTab] summary error:', err);
    }
  }, [summaryDays]);

  useEffect(() => { loadDay(date); }, [date, loadDay]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  // Unique actions from current entries for filter dropdown
  const allActions = [...new Set(entries.map(e => e.action))].sort();
  const filtered = actionFilter === 'all' ? entries : entries.filter(e => e.action === actionFilter);

  const navigateDay = (delta: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    const next = d.toISOString().slice(0, 10);
    if (next <= today) setDate(next);
  };

  const exportSecurityCsv = () => {
    if (!filtered.length) { toast.error('No data to export'); return; }
    downloadCsv(
      `security-audit-log-${date}.csv`,
      ['Timestamp', 'User ID', 'Action', 'Route', 'IP', 'Detail'],
      filtered.map(e => [e.ts, e.userId ?? '', e.action, e.route, e.ip ?? '', e.detail ?? '']),
    );
    toast.success(`Exported ${filtered.length} security events to CSV`);
  };

  // Summary chart — bar chart using simple divs
  const maxCount = Math.max(...summary.map(s => s.count), 1);

  const columns: Column<SecurityAuditEntry>[] = [
    {
      key: 'ts', header: 'Timestamp', sortable: true,
      render: e => <span className={`${t.textMd} text-xs font-mono whitespace-nowrap`}>{new Date(e.ts).toLocaleTimeString()}</span>,
    },
    {
      key: 'action', header: 'Action',
      render: e => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${actionColor(e.action, t.isDark)}`}>
          {e.action}
        </span>
      ),
    },
    {
      key: 'route', header: 'Route',
      render: e => <code className={`${t.textMd} text-xs bg-white/5 px-1.5 py-0.5 rounded`}>{e.route}</code>,
    },
    {
      key: 'userId', header: 'User ID',
      render: e => <span className={`${t.textFaint} text-xs font-mono`}>{e.userId ?? '—'}</span>,
    },
    {
      key: 'ip', header: 'IP',
      render: e => <span className={`${t.textFaint} text-xs font-mono`}>{e.ip ?? '—'}</span>,
    },
    {
      key: 'detail', header: 'Detail',
      render: e => <span className={`${t.textMd} text-xs max-w-[200px] block truncate`} title={e.detail}>{e.detail ?? '—'}</span>,
    },
  ];

  return (
    <>
      {/* Summary bar chart */}
      <Card title="Event Volume (last 14 days)">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className={`w-4 h-4 ${t.textFaint}`} />
          <span className={`${t.textFaint} text-xs`}>Events per day — click a bar to jump to that date</span>
        </div>
        <div className="flex items-end gap-1 h-24">
          {[...summary].reverse().map(s => {
            const pct = Math.max((s.count / maxCount) * 100, 4);
            const isSelected = s.date === date;
            return (
              <button
                key={s.date}
                onClick={() => setDate(s.date)}
                className="flex-1 flex flex-col items-center gap-1 group"
                title={`${s.date}: ${s.count} events`}
              >
                <span className={`text-[9px] font-mono ${isSelected ? 'text-purple-500 font-bold' : t.textFaint} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  {s.count}
                </span>
                <div
                  className={`w-full rounded-t-md transition-all ${
                    isSelected
                      ? 'bg-purple-500'
                      : s.count === 0
                        ? t.isDark ? 'bg-white/5' : 'bg-gray-100'
                        : t.isDark ? 'bg-white/15 hover:bg-white/25' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  style={{ height: `${pct}%`, minHeight: 2 }}
                />
                <span className={`text-[8px] font-mono ${isSelected ? 'text-purple-500 font-bold' : t.textFaint}`}>
                  {s.date.slice(5)}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Date picker + filters + export */}
      <div className="flex items-center justify-between flex-wrap gap-3 mt-4 mb-4">
        <div className="flex items-center gap-3">
          {/* Date navigator */}
          <div className={`flex items-center gap-1 ${t.s0} border ${t.border} rounded-xl px-1 py-1`}>
            <button onClick={() => navigateDay(-1)} className={`p-1.5 rounded-lg ${t.tabInactive} hover:${t.tabActive} transition-all`}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-2">
              <Calendar className={`w-4 h-4 ${t.textFaint}`} />
              <input
                type="date"
                value={date}
                max={today}
                onChange={e => setDate(e.target.value)}
                className={`bg-transparent ${t.text} text-sm font-mono border-none outline-none`}
              />
            </div>
            <button
              onClick={() => navigateDay(1)}
              disabled={date >= today}
              className={`p-1.5 rounded-lg ${t.tabInactive} hover:${t.tabActive} transition-all disabled:opacity-30`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action filter */}
          {allActions.length > 0 && (
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border ${t.border} ${t.s0} ${t.text} outline-none`}
            >
              <option value="all">All Actions ({entries.length})</option>
              {allActions.map(a => (
                <option key={a} value={a}>{a} ({entries.filter(e => e.action === a).length})</option>
              ))}
            </select>
          )}

          <button onClick={() => loadDay(date)} className={`p-2 rounded-xl border ${t.border} ${t.tabInactive} hover:${t.tabActive} transition-all`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className={`${t.textFaint} text-xs`}>
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
          </span>
          <PrimaryBtn variant="ghost" onClick={exportSecurityCsv}>
            <Download className="w-4 h-4" /> Export CSV
          </PrimaryBtn>
        </div>
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className={`w-5 h-5 animate-spin ${t.textFaint}`} />
            <span className={`${t.textFaint} text-sm`}>Loading security events…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <ShieldCheck className={`w-10 h-10 ${t.textFaint}`} />
            <p className={`${t.text} font-medium`}>No security events</p>
            <p className={`${t.textFaint} text-sm`}>No events recorded for {date}</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyField="ts"
            searchPlaceholder="Search by action, route, user ID…"
            searchFields={['action', 'route', 'userId', 'detail'] as any}
            pageSize={12}
            emptyTitle="No matching events"
            emptyDescription="Try adjusting your filters."
          />
        )}
      </Card>

      {/* ISO 27001 compliance note */}
      <div className={`mt-4 flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
        t.isDark ? 'bg-sky-500/5 border-sky-500/20 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-700'
      }`}>
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>ISO 27001 A.12.4.1 / A.12.4.2</strong> — Security events are logged immutably per day. A weekly integrity check runs Sundays at 04:00 UTC to detect missing log days. Logs are retained per the Data Retention policy (default 90 days).
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — DATA RETENTION POLICY  (Phase 6 — PDPA s.10 / ISO 27001 A.18.1.3)
// ═══════════════════════════════════════════════════════════════════════════════

interface RetentionField {
  key: keyof RetentionPolicy;
  label: string;
  hint: string;
  unit: string;
  min: number;
  max: number;
  icon: React.ReactNode;
  complianceRef: string;
}

const RETENTION_FIELDS: RetentionField[] = [
  {
    key: 'auditLogDays', label: 'Audit Log Retention', hint: 'Security and application audit logs are purged after this many days.',
    unit: 'days', min: 30, max: 365, icon: <BookOpen className="w-4 h-4" />, complianceRef: 'ISO 27001 A.12.4.1',
  },
  {
    key: 'oauthStateMinutes', label: 'OAuth State TTL', hint: 'OAuth CSRF state tokens expire after this many minutes.',
    unit: 'minutes', min: 5, max: 1440, icon: <ShieldCheck className="w-4 h-4" />, complianceRef: 'ISO 27001 A.14.1.2',
  },
  {
    key: 'slaDedupDays', label: 'SLA Dedup Window', hint: 'Duplicate SLA alerts are suppressed within this window.',
    unit: 'days', min: 1, max: 90, icon: <Clock className="w-4 h-4" />, complianceRef: 'Operational',
  },
  {
    key: 'usageRecordMonths', label: 'Usage Record Retention', hint: 'Usage statistics retained for billing and analytics.',
    unit: 'months', min: 3, max: 60, icon: <BarChart3 className="w-4 h-4" />, complianceRef: 'PDPA s.10',
  },
  {
    key: 'reviewTokenDays', label: 'Review Token TTL', hint: 'Client review tokens expire after this many days.',
    unit: 'days', min: 7, max: 365, icon: <Calendar className="w-4 h-4" />, complianceRef: 'PDPA s.10',
  },
];

function DataRetentionTab() {
  const t = useDashboardTheme();
  const [policy,  setPolicy]  = useState<RetentionPolicy | null>(null);
  const [draft,   setDraft]   = useState<Partial<RetentionPolicy>>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchRetentionPolicy()
      .then(p => { setPolicy(p); setDraft({}); })
      .catch(err => {
        console.error('[DataRetentionTab] load error:', err);
        toast.error(`Failed to load retention policy: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

  const getValue = (key: keyof RetentionPolicy) => {
    return (draft[key] ?? policy?.[key] ?? 0) as number;
  };

  const hasChanges = Object.keys(draft).length > 0;

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const updated = await updateRetentionPolicy(draft);
      setPolicy(updated);
      setDraft({});
      toast.success('Data retention policy saved successfully');
    } catch (err: any) {
      console.error('[DataRetentionTab] save error:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setDraft({});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3">
        <Loader2 className={`w-5 h-5 animate-spin ${t.textFaint}`} />
        <span className={`${t.textFaint} text-sm`}>Loading retention policy…</span>
      </div>
    );
  }

  return (
    <>
      {/* PDPA / ISO notice */}
      <div className={`mb-6 flex items-start gap-2.5 p-4 rounded-xl border text-sm ${
        t.isDark ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
      }`}>
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <strong>PDPA s.10 / ISO 27001 A.18.1.3 — Personal data retention limits.</strong>
          <p className="mt-1 opacity-80">
            Data is automatically purged by a daily cron job at 03:00 UTC. Changing these values takes effect on the next cron run.
            Reducing retention windows may cause irreversible data loss — review carefully before saving.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {RETENTION_FIELDS.map(field => {
          const val = getValue(field.key);
          const isDirty = field.key in draft;
          return (
            <Card key={field.key}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  t.isDark ? 'bg-purple-500/15 border border-purple-500/25' : 'bg-purple-50 border border-purple-200'
                }`}>
                  <span className="text-purple-500">{field.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`${t.text} text-sm font-semibold`}>{field.label}</h4>
                    {isDirty && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 border border-amber-500/25">
                        MODIFIED
                      </span>
                    )}
                  </div>
                  <p className={`${t.textFaint} text-xs mb-3`}>{field.hint}</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      value={val}
                      onChange={e => {
                        const num = parseInt(e.target.value, 10);
                        if (!isNaN(num)) {
                          setDraft(prev => ({ ...prev, [field.key]: Math.max(field.min, Math.min(field.max, num)) }));
                        }
                      }}
                      className={`w-24 px-3 py-2 rounded-xl text-sm font-mono border outline-none transition-all ${
                        isDirty
                          ? 'border-amber-500/50 bg-amber-500/5'
                          : `${t.border} ${t.s0}`
                      } ${t.text}`}
                    />
                    <span className={`${t.textFaint} text-xs`}>{field.unit}</span>
                    <span className={`ml-auto text-[9px] font-medium px-2 py-0.5 rounded-full border ${
                      t.isDark ? 'bg-white/5 border-white/10 text-white/40' : 'bg-gray-100 border-gray-200 text-gray-500'
                    }`}>
                      {field.complianceRef}
                    </span>
                  </div>
                  <p className={`${t.textFaint} text-[10px] mt-1.5`}>
                    Range: {field.min}–{field.max} {field.unit}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Last updated + Save */}
      <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
        <div className={`${t.textFaint} text-xs`}>
          {policy?.updatedAt ? (
            <>Last updated: <strong className={t.textMd}>{new Date(policy.updatedAt).toLocaleString()}</strong></>
          ) : (
            'Using default retention values — never modified'
          )}
        </div>
        <div className="flex gap-3">
          {hasChanges && (
            <PrimaryBtn variant="ghost" onClick={handleReset}>
              Discard Changes
            </PrimaryBtn>
          )}
          <PrimaryBtn onClick={handleSave} disabled={!hasChanges} loading={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Policy
          </PrimaryBtn>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 5 — PENETRATION TEST CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════════

function PenetrationTestTab() {
  return <PenTestChecklist />;
}