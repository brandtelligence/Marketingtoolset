/**
 * AuditPage — Super Admin Audit & Compliance Dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Four tabs:
 *   1. Compliance Health   – aggregated cron status, integrity checks, overall health
 *   2. Application Audit   – existing admin action log (fetchAuditLogs)
 *   3. Security Audit Log  – Phase 6 ISO 27001 A.12.4 security events with CSV export
 *   4. Data Retention       – Phase 6 PDPA s.10 / ISO 27001 A.18.1.3 retention policy
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download, ShieldCheck, Database, BookOpen, Calendar,
  RefreshCw, Loader2, Save, Info, AlertTriangle, Clock,
  ChevronLeft, ChevronRight, BarChart3, Activity,
  CheckCircle2, XCircle, HelpCircle, Timer, Cog,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { DataTable, Column } from '../../components/saas/DataTable';
import { StatusBadge, RoleBadge } from '../../components/saas/StatusBadge';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import {
  fetchAuditLogs,
  fetchSecurityAuditLog,
  fetchSecurityAuditSummary,
  fetchRetentionPolicy,
  updateRetentionPolicy,
  fetchComplianceStatus,
  runIntegrityCheckNow,
  type AuditLog,
  type SecurityAuditEntry,
  type SecurityAuditDaySummary,
  type RetentionPolicy,
  type ComplianceStatus,
} from '../../utils/apiClient';

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

const ACTION_COLORS: Record<string, string> = {
  AUTH_SUCCESS:           'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
  AUTH_FAIL:              'bg-red-500/15 text-red-600 border-red-500/25',
  ROLE_DENIED:            'bg-red-500/15 text-red-600 border-red-500/25',
  TENANT_MISMATCH:        'bg-amber-500/15 text-amber-600 border-amber-500/25',
  RATE_LIMITED:            'bg-orange-500/15 text-orange-600 border-orange-500/25',
  CSRF_INVALID:            'bg-red-500/15 text-red-600 border-red-500/25',
  HMAC_INVALID:            'bg-red-500/15 text-red-600 border-red-500/25',
  SESSION_EXPIRED:         'bg-amber-500/15 text-amber-600 border-amber-500/25',
  SECURITY_LOG_VIEWED:     'bg-sky-500/15 text-sky-600 border-sky-500/25',
  RETENTION_POLICY_CHANGED:'bg-purple-500/15 text-purple-600 border-purple-500/25',
};

const DEFAULT_ACTION_CLS = 'bg-gray-500/15 text-gray-600 border-gray-500/25';

type TabKey = 'compliance' | 'app' | 'security' | 'retention';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AuditPage() {
  const t = useDashboardTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('app');

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'compliance', label: 'Compliance Health', icon: <Activity className="w-4 h-4" /> },
    { key: 'app',       label: 'Application Audit', icon: <BookOpen className="w-4 h-4" /> },
    { key: 'security',  label: 'Security Log',      icon: <ShieldCheck className="w-4 h-4" /> },
    { key: 'retention', label: 'Data Retention',     icon: <Database className="w-4 h-4" /> },
  ];

  return (
    <div>
      <PageHeader
        title="Audit & Compliance"
        subtitle="Application audit trail, security event log, and data retention policies — ISO 27001 / PDPA compliant"
      />

      {/* Tab bar */}
      <div className={`flex gap-1 ${t.tabBg} rounded-xl p-1 mb-6 w-fit`}>
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
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'compliance' && (
          <motion.div key="compliance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ComplianceHealthTab />
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
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — COMPLIANCE HEALTH  (aggregated cron status, integrity checks, overall health)
// ═══════════════════════════════════════════════════════════════════════════════

function ComplianceHealthTab() {
  const t = useDashboardTheme();
  const [status, setStatus] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

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

  const healthConfig = {
    healthy: { icon: <CheckCircle2 className="w-8 h-8 text-emerald-500" />, label: 'All Systems Healthy', cls: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600', desc: 'All integrity checks passed. No missing audit log days detected.' },
    warning: { icon: <AlertTriangle className="w-8 h-8 text-amber-500" />, label: 'Warnings Detected', cls: 'bg-amber-500/10 border-amber-500/25 text-amber-600', desc: 'Missing audit log days detected in recent integrity checks. Review the integrity history below.' },
    unknown: { icon: <HelpCircle className="w-8 h-8 text-gray-400" />, label: 'No Data Yet', cls: t.isDark ? 'bg-white/5 border-white/10 text-white/50' : 'bg-gray-50 border-gray-200 text-gray-500', desc: 'The weekly integrity check has not run yet. It is scheduled to run every Sunday at 04:00 UTC.' },
  };

  const hc = healthConfig[status.health];

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

      {/* ISO / PDPA compliance footer */}
      <div className={`mt-6 flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
        t.isDark ? 'bg-sky-500/5 border-sky-500/20 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-700'
      }`}>
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <strong>Compliance Coverage:</strong> ISO 27001 A.12.4.1 (event logging), A.12.4.2 (log protection), A.14.1.2 (CSRF/HMAC defence), A.18.1.3 (retention); Malaysia PDPA s.10 (data retention limits). All 5 cron jobs are registered via Deno.cron and run automatically.
        </div>
      </div>
    </>
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
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ACTION_COLORS[e.action] ?? DEFAULT_ACTION_CLS}`}>
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