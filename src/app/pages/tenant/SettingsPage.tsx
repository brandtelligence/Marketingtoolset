import { useState, useEffect, useCallback } from 'react';
import { Save, Lock, Bell, Shield, Eye, EyeOff, Timer, Sparkles, ImageIcon, Video, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { Field, Input } from '../../components/saas/DrawerForm';
import { useAuth } from '../../components/AuthContext';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { useSlaConfig } from '../../hooks/useSlaConfig';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHeaders';
import { IS_DEMO_MODE } from '../../config/appConfig';
import { supabase } from '../../utils/supabaseClient';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// ─── AI Usage hook ─────────────────────────────────────────────────────────────

interface AiUsage { imageCount: number; videoCount: number; totalCostUsd: number; lastUpdated: string | null; }

function getMonthOptions(n: number): { key: string; label: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return {
      key:   d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' }),
    };
  });
}

function useAiMediaUsage(tenantId: string | undefined) {
  const months = getMonthOptions(3);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [usageMap,    setUsageMap]    = useState<Record<string, AiUsage>>({});
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    if (IS_DEMO_MODE) {
      // Plausible demo data
      const now = new Date().toISOString().slice(0, 7);
      const prev = new Date(); prev.setMonth(prev.getMonth() - 1);
      const p1   = prev.toISOString().slice(0, 7);
      const prev2 = new Date(); prev2.setMonth(prev2.getMonth() - 2);
      const p2    = prev2.toISOString().slice(0, 7);
      setUsageMap({
        [now]: { imageCount: 14, videoCount: 3,  totalCostUsd: 2.62, lastUpdated: new Date().toISOString() },
        [p1]:  { imageCount: 22, videoCount: 7,  totalCostUsd: 5.26, lastUpdated: null },
        [p2]:  { imageCount: 8,  videoCount: 1,  totalCostUsd: 1.14, lastUpdated: null },
      });
      return;
    }
    setLoading(true);
    const keys = months.map(m => m.key).join(',');
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/ai/media-usage?tenantId=${encodeURIComponent(tenantId)}&months=${encodeURIComponent(keys)}`, {
          headers: await getAuthHeaders(),
        });
        const data = await res.json();
        if (data.usage) setUsageMap(data.usage);
      } catch (e) {
        console.error('[AI usage]', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  const currentKey   = months[selectedIdx]?.key ?? '';
  const currentLabel = months[selectedIdx]?.label ?? '';
  const usage        = usageMap[currentKey] ?? { imageCount: 0, videoCount: 0, totalCostUsd: 0, lastUpdated: null };
  const totalItems   = (usage.imageCount ?? 0) + (usage.videoCount ?? 0);
  const maxItems     = Math.max(...months.map(m => {
    const u = usageMap[m.key];
    return u ? (u.imageCount + u.videoCount) : 0;
  }), 1);

  return { months, selectedIdx, setSelectedIdx, usage, currentLabel, currentKey, totalItems, maxItems, loading, usageMap };
}

export function TenantSettingsPage() {
  const t = useDashboardTheme();
  const { user } = useAuth();
  const { warningHours, breachHours, isLoading: slaLoading, isSaving: slaSaving, saveConfig } = useSlaConfig(user?.tenantId ?? undefined);
  const aiUsage = useAiMediaUsage(user?.tenantId ?? undefined);

  // ── SLA local edit state (initialised lazily from hook) ──────────────────
  const [slaWarn,   setSlaWarn]   = useState<string>('');
  const [slaBreach, setSlaBreach] = useState<string>('');
  // Sync once hook resolves
  const [slaSynced, setSlaSynced] = useState(false);
  if (!slaLoading && !slaSynced) {
    setSlaWarn(String(warningHours));
    setSlaBreach(String(breachHours));
    setSlaSynced(true);
  }

  const handleSaveSla = async () => {
    const w = parseInt(slaWarn,   10);
    const b = parseInt(slaBreach, 10);
    if (!Number.isFinite(w) || w < 1)   { toast.error('Warning threshold must be ≥ 1 hour'); return; }
    if (!Number.isFinite(b) || b <= w)  { toast.error('Breach threshold must be greater than the warning threshold'); return; }
    if (b > 720)                         { toast.error('Thresholds cannot exceed 720 hours (30 days)'); return; }
    if (!user?.tenantId) { toast.error('Tenant ID not found — cannot save'); return; }

    const ok = await saveConfig({ warningHours: w, breachHours: b }, user.tenantId);
    if (ok) {
      toast.success('SLA thresholds saved', {
        description: `Warning at ${w}h · Breach at ${b}h — effective immediately across all projects.`,
      });
    } else {
      toast.error('Failed to save SLA thresholds — please try again');
    }
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [emailInvoice, setEmailInvoice] = useState(true);
  const [emailOverdue, setEmailOverdue] = useState(true);
  const [emailUserInvite, setEmailUserInvite] = useState(true);
  const [emailPaymentConfirm, setEmailPaymentConfirm] = useState(true);
  const [emailWeeklyReport, setEmailWeeklyReport] = useState(false);

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('480');
  const [securitySaving, setSecuritySaving] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // ── P3-FIX-25: Load persisted tenant settings from server ──────────────
  const loadTenantSettings = useCallback(async () => {
    if (!user?.tenantId || IS_DEMO_MODE) return;
    try {
      const res = await fetch(
        `${API_BASE}/tenant-settings?tenantId=${encodeURIComponent(user.tenantId)}`,
        { headers: await getAuthHeaders() },
      );
      const data = await res.json();
      if (!res.ok) { console.error('[TenantSettings] load error:', data.error); return; }
      const s = data.settings ?? {};
      // Security
      if (s.mfaEnabled !== undefined) setMfaEnabled(s.mfaEnabled);
      if (s.sessionTimeout !== undefined) setSessionTimeout(String(s.sessionTimeout));
      // Notifications
      if (s.emailInvoice !== undefined) setEmailInvoice(s.emailInvoice);
      if (s.emailOverdue !== undefined) setEmailOverdue(s.emailOverdue);
      if (s.emailUserInvite !== undefined) setEmailUserInvite(s.emailUserInvite);
      if (s.emailPaymentConfirm !== undefined) setEmailPaymentConfirm(s.emailPaymentConfirm);
      if (s.emailWeeklyReport !== undefined) setEmailWeeklyReport(s.emailWeeklyReport);
      setSettingsLoaded(true);
    } catch (err) {
      console.error('[TenantSettings] load error:', err);
    }
  }, [user?.tenantId]);

  useEffect(() => { loadTenantSettings(); }, [loadTenantSettings]);

  const saveTenantSettings = async (section: string, payload: Record<string, any>) => {
    if (!user?.tenantId) { toast.error('Tenant ID not found'); return false; }
    try {
      const res = await fetch(`${API_BASE}/tenant-settings`, {
        method: 'PUT',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({ tenantId: user.tenantId, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to save ${section}`);
      return true;
    } catch (err: any) {
      console.error(`[TenantSettings] save ${section} error:`, err);
      toast.error(`Failed to save ${section}: ${err.message}`);
      return false;
    }
  };

  const handleSaveSecurity = async () => {
    const timeout = parseInt(sessionTimeout, 10);
    if (!Number.isFinite(timeout) || timeout < 30 || timeout > 1440) {
      toast.error('Session timeout must be between 30 and 1440 minutes');
      return;
    }
    setSecuritySaving(true);
    const ok = await saveTenantSettings('security settings', { mfaEnabled, sessionTimeout: timeout });
    setSecuritySaving(false);
    if (ok) toast.success('Security settings saved');
  };

  const handleSaveNotifications = async () => {
    setNotifSaving(true);
    const ok = await saveTenantSettings('notification preferences', {
      emailInvoice, emailOverdue, emailPaymentConfirm, emailUserInvite, emailWeeklyReport,
    });
    setNotifSaving(false);
    if (ok) toast.success('Notification preferences saved');
  };

  const [exportLoading, setExportLoading] = useState(false);
  const handleDataExport = async () => {
    if (!user?.tenantId) { toast.error('Tenant ID not found'); return; }
    setExportLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tenant-data-export`, {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({ tenantId: user.tenantId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brandtelligence-data-export-${user.tenantId}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data export downloaded successfully');
    } catch (err: any) {
      console.error('[DataExport] error:', err);
      toast.error(`Data export failed: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const getStrength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^a-zA-Z\d]/.test(pw)) s++;
    return s;
  };
  const pwStrength = getStrength(newPassword);
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-teal-500', 'bg-green-500'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

  // P3-FIX-18: Actually change password via Supabase Auth (was fake delay no-op)
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) { toast.error('Enter your current password'); return; }
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (newPassword !== confirmNewPassword) { toast.error('New passwords do not match'); return; }
    setPasswordLoading(true);
    try {
      // Step 1: Verify current password by attempting signIn
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: currentPassword,
      });
      if (verifyErr) {
        toast.error('Current password is incorrect');
        return;
      }
      // Step 2: Update to new password
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
      toast.success('Password updated successfully');
    } catch (err: any) {
      toast.error(`Password change failed: ${err.message}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  const Toggle = ({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) => (
    <label className={`flex items-start justify-between gap-4 p-3 ${t.s0} rounded-xl border ${t.border} cursor-pointer ${t.hoverBorder} transition-colors`}>
      <div className="flex-1">
        <p className={`${t.textSm} text-sm font-medium`}>{label}</p>
        {description && <p className={`${t.textFaint} text-xs mt-0.5`}>{description}</p>}
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-all relative shrink-0 mt-0.5 ${checked ? 'bg-teal-500' : t.isDark ? 'bg-white/20' : 'bg-gray-300'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </div>
    </label>
  );

  return (
    <div>
      <PageHeader title="Account Settings" subtitle="Manage your password, security, and notification preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Profile summary */}
        <Card title="👤 Account Info">
          <div className="space-y-3 text-sm">
            {[
              ['Name',   `${user?.firstName} ${user?.lastName}`],
              ['Email',  user?.email ?? '—'],
              ['Role',   user?.role ?? '—'],
              ['Tenant', user?.tenantName ?? '—'],
            ].map(([k, v]) => (
              <div key={k} className={`flex items-center justify-between p-3 ${t.s1} rounded-xl border ${t.border}`}>
                <span className={t.textMd}>{k}</span>
                <span className={`${t.text} font-medium`}>{v}</span>
              </div>
            ))}
            <p className={`${t.textFaint} text-xs pt-1`}>Contact your Super Admin to update account email or role.</p>
          </div>
        </Card>

        {/* Password Change */}
        <Card title="🔐 Change Password">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Field label="Current Password" required>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textFaint}`} />
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                  className="pl-10 pr-10" placeholder="Your current password"
                />
                <button type="button" onClick={() => setShowPasswords(v => !v)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textFaint} hover:${t.textMd}`}
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            <Field label="New Password" required>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
              {newPassword && (
                <div className="mt-1.5">
                  <div className="flex gap-1 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < pwStrength ? strengthColors[pwStrength - 1] : t.s1}`} />
                    ))}
                  </div>
                  <p className={`${t.textFaint} text-xs`}>Strength: {strengthLabels[pwStrength - 1] || 'Very Weak'}</p>
                </div>
              )}
            </Field>

            <Field label="Confirm New Password" required>
              <Input
                type={showPasswords ? 'text' : 'password'}
                value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={confirmNewPassword && newPassword !== confirmNewPassword ? 'border-red-500/50' : ''}
              />
              {confirmNewPassword && newPassword !== confirmNewPassword && (
                <p className="text-red-500 text-xs mt-0.5">Passwords do not match</p>
              )}
            </Field>

            <div className="flex justify-end">
              <PrimaryBtn variant="teal" type="submit" loading={passwordLoading}>
                <Lock className="w-3.5 h-3.5" /> Update Password
              </PrimaryBtn>
            </div>
          </form>
        </Card>

        {/* Security */}
        <Card title="🛡 Security">
          <div className="space-y-3">
            <Toggle checked={mfaEnabled} onChange={setMfaEnabled} label="Two-Factor Authentication (MFA)" description="Require a one-time code on each login" />
            <Field label="Session Timeout (minutes)" hint="You'll be logged out after this period of inactivity">
              <Input type="number" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} min="30" max="1440" />
            </Field>
            <div className="flex justify-end pt-2">
              <PrimaryBtn size="sm" variant="teal" onClick={handleSaveSecurity} loading={securitySaving}>
                <Shield className="w-3.5 h-3.5" /> Save
              </PrimaryBtn>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card title="🔔 Email Notifications">
          <div className="space-y-2">
            <Toggle checked={emailInvoice}        onChange={setEmailInvoice}        label="Invoice Issued"           description="Monthly invoice notification" />
            <Toggle checked={emailOverdue}         onChange={setEmailOverdue}         label="Overdue Invoice Reminder" description="When invoice is past due date" />
            <Toggle checked={emailPaymentConfirm}  onChange={setEmailPaymentConfirm}  label="Payment Confirmed"        description="When payment is received and marked paid" />
            <Toggle checked={emailUserInvite}      onChange={setEmailUserInvite}      label="New User Invite"          description="When you invite a team member" />
            <Toggle checked={emailWeeklyReport}    onChange={setEmailWeeklyReport}    label="Weekly Usage Report"      description="Summary of platform activity every Monday" />
            <div className="flex justify-end pt-2">
              <PrimaryBtn size="sm" variant="teal" onClick={handleSaveNotifications} loading={notifSaving}>
                <Bell className="w-3.5 h-3.5" /> Save
              </PrimaryBtn>
            </div>
          </div>
        </Card>

        {/* Content Approval SLA */}
        <Card title="⏱ Content Approval SLA">
          <div className="space-y-4">
            <p className={`${t.textFaint} text-xs leading-relaxed`}>
              Configure how long pending content cards can wait for approval before
              the platform raises an in-app warning or sends an escalation email.
              Thresholds apply to all projects under this tenant.
            </p>

            {slaLoading ? (
              <div className="flex items-center gap-2 py-4">
                <span className="w-4 h-4 rounded-full border-2 border-teal-400/40 border-t-teal-400 animate-spin" />
                <span className={`${t.textFaint} text-xs`}>Loading current thresholds…</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Warning threshold (hours)"
                  hint="An amber ⏱ badge appears on the card when this many hours have elapsed">
                  <div className="relative">
                    <Timer className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textFaint}`} />
                    <Input
                      type="number"
                      min="1"
                      max="719"
                      value={slaWarn}
                      onChange={e => setSlaWarn(e.target.value)}
                      className="pl-10"
                      placeholder="24"
                    />
                  </div>
                </Field>

                <Field label="Breach threshold (hours)"
                  hint="A red 🔴 badge appears and an escalation email is sent after this many hours">
                  <div className="relative">
                    <Timer className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400/60`} />
                    <Input
                      type="number"
                      min="2"
                      max="720"
                      value={slaBreach}
                      onChange={e => setSlaBreach(e.target.value)}
                      className={`pl-10 ${
                        parseInt(slaBreach) <= parseInt(slaWarn)
                          ? 'border-red-500/50'
                          : ''
                      }`}
                      placeholder="48"
                    />
                  </div>
                  {parseInt(slaBreach) > 0 && parseInt(slaBreach) <= parseInt(slaWarn) && (
                    <p className="text-red-500 text-xs mt-0.5">Must be greater than warning threshold</p>
                  )}
                </Field>
              </div>
            )}

            {/* Live preview */}
            {!slaLoading && (
              <div className={`flex items-center gap-3 p-3 ${t.s1} rounded-xl border ${t.border} text-xs`}>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className={t.textFaint}>
                  Warning at <strong className={t.textMd}>{slaWarn || '—'}h</strong>
                  &nbsp;·&nbsp;
                  Breach at <strong className={t.textMd}>{slaBreach || '—'}h</strong>
                  &nbsp;·&nbsp;Escalation email triggered automatically at breach threshold
                </span>
              </div>
            )}

            <div className="flex justify-end">
              <PrimaryBtn
                size="sm"
                variant="teal"
                loading={slaSaving}
                onClick={handleSaveSla}
                disabled={slaLoading}
              >
                <Timer className="w-3.5 h-3.5" /> Save SLA Thresholds
              </PrimaryBtn>
            </div>
          </div>
        </Card>
      </div>

      {/* ── AI Media Usage ── */}
      <Card title="🤖 AI Media Usage" className="mt-6">
        <div className="space-y-4">
          <p className={`${t.textFaint} text-xs leading-relaxed`}>
            Monthly usage of AI image (DALL-E 3) and video (Replicate minimax/video-01) generation.
            Costs are in USD and reflect approximate API billing.
          </p>

          {/* Month selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => aiUsage.setSelectedIdx(i => Math.min(i + 1, aiUsage.months.length - 1))}
              disabled={aiUsage.selectedIdx >= aiUsage.months.length - 1}
              className={`w-7 h-7 flex items-center justify-center rounded-lg border ${t.border} ${t.s1} ${t.textFaint} hover:${t.textMd} disabled:opacity-30 transition-all`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className={`flex-1 text-center text-sm font-semibold ${t.text}`}>{aiUsage.currentLabel}</span>
            <button
              onClick={() => aiUsage.setSelectedIdx(i => Math.max(i - 1, 0))}
              disabled={aiUsage.selectedIdx <= 0}
              className={`w-7 h-7 flex items-center justify-center rounded-lg border ${t.border} ${t.s1} ${t.textFaint} hover:${t.textMd} disabled:opacity-30 transition-all`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stats row */}
          {aiUsage.loading ? (
            <div className="flex items-center gap-2 py-4">
              <span className="w-4 h-4 rounded-full border-2 border-teal-400/40 border-t-teal-400 animate-spin" />
              <span className={`${t.textFaint} text-xs`}>Loading usage data…</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Images',      value: aiUsage.usage.imageCount,  Icon: ImageIcon, color: 'text-teal-400',   bg: 'bg-teal-500/10',   border: 'border-teal-400/20' },
                { label: 'Videos',      value: aiUsage.usage.videoCount,  Icon: Video,     color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-400/20' },
                { label: 'Total Cost',  value: `$${aiUsage.usage.totalCostUsd.toFixed(2)}`, Icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-400/20' },
              ].map(({ label, value, Icon, color, bg, border }) => (
                <div key={label} className={`flex flex-col gap-2 p-3 ${bg} border ${border} rounded-xl`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                  <p className={`text-xl font-bold ${t.text}`}>{value}</p>
                  <p className={`${t.textFaint} text-xs`}>{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Bar chart across months */}
          <div className="space-y-2">
            <p className={`${t.textFaint} text-[10px] uppercase tracking-wider font-semibold`}>Last 3 months</p>
            {aiUsage.months.map((m, i) => {
              const u    = aiUsage.usageMap[m.key] ?? { imageCount: 0, videoCount: 0, totalCostUsd: 0 };
              const tot  = u.imageCount + u.videoCount;
              const pct  = Math.round((tot / aiUsage.maxItems) * 100);
              const isSel = i === aiUsage.selectedIdx;
              return (
                <button
                  key={m.key}
                  onClick={() => aiUsage.setSelectedIdx(i)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-all text-left
                    ${isSel ? `${t.s1} ${t.border}` : 'border-transparent hover:' + t.s0}`}
                >
                  <span className={`${t.textFaint} text-[10px] w-14 shrink-0 truncate`}>{m.label.split(' ')[0]}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`${t.textFaint} text-[10px] w-12 text-right shrink-0`}>{tot} items</span>
                  <span className={`${isSel ? 'text-teal-400' : t.textFaint} text-[10px] w-10 text-right shrink-0 font-mono`}>${u.totalCostUsd.toFixed(2)}</span>
                </button>
              );
            })}
          </div>

          {/* Last updated note */}
          {aiUsage.usage.lastUpdated && (
            <p className={`${t.textFaint} text-[10px]`}>
              Last generation: {new Date(aiUsage.usage.lastUpdated).toLocaleString('en-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}

          <div className={`flex items-start gap-2 p-3 ${t.s0} border ${t.border} rounded-xl`}>
            <Sparkles className={`w-3.5 h-3.5 ${t.textFaint} shrink-0 mt-0.5`} />
            <p className={`${t.textFaint} text-[10px] leading-relaxed`}>
              AI media generation costs are billed directly by OpenAI (images) and Replicate (videos) to your platform plan.
              Contact your Super Admin to review overall platform AI spend.
            </p>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card title="⚠️ Danger Zone" className="mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div>
            <p className="text-red-600 font-medium text-sm">Export My Data</p>
            <p className="text-red-600/60 text-xs mt-0.5">Download a complete export of your account data (GDPR-compliant)</p>
          </div>
          <PrimaryBtn size="sm" variant="ghost" onClick={handleDataExport} loading={exportLoading}>
            <Save className="w-3.5 h-3.5" /> Request Export
          </PrimaryBtn>
        </div>
        <p className={`${t.textFaint} text-xs mt-3`}>
          To deactivate your tenant account, please contact <span className={t.textMd}>support@brandtelligence.com</span>.
        </p>
      </Card>
    </div>
  );
}