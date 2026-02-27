import { useState } from 'react';
import { Save, Lock, Bell, Shield, Eye, EyeOff, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { Field, Input } from '../../components/saas/DrawerForm';
import { useAuth } from '../../components/AuthContext';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { useSlaConfig } from '../../hooks/useSlaConfig';

export function TenantSettingsPage() {
  const t = useDashboardTheme();
  const { user } = useAuth();
  const { warningHours, breachHours, isLoading: slaLoading, isSaving: slaSaving, saveConfig } = useSlaConfig(user?.tenantId ?? undefined);

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) { toast.error('Enter your current password'); return; }
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (newPassword !== confirmNewPassword) { toast.error('New passwords do not match'); return; }
    setPasswordLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setPasswordLoading(false);
    setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
    toast.success('Password updated successfully');
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
              <PrimaryBtn size="sm" variant="teal" onClick={() => toast.success('Security settings saved')}>
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
              <PrimaryBtn size="sm" variant="teal" onClick={() => toast.success('Notification preferences saved')}>
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

      {/* Danger Zone */}
      <Card title="⚠️ Danger Zone" className="mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div>
            <p className="text-red-600 font-medium text-sm">Export My Data</p>
            <p className="text-red-600/60 text-xs mt-0.5">Download a complete export of your account data (GDPR-compliant)</p>
          </div>
          <PrimaryBtn size="sm" variant="ghost" onClick={() => toast.info('Data export requested — you will receive an email within 24h')}>
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