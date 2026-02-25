import { Field, Input, Select } from '../../components/saas/DrawerForm';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { useNavigate } from 'react-router';
import { MALAYSIA_GATEWAYS, getGatewayById } from '../../data/paymentGateways';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;
const AUTH   = { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' };

// ─── Shared Toggle ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const t = useDashboardTheme();
  return (
    <label className={`flex items-center justify-between p-3 ${t.s0} rounded-xl border ${t.border} cursor-pointer ${t.hoverBorder} transition-colors`}>
      <span className={`${t.textSm} text-sm`}>{label}</span>
      <div
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-all relative ${checked ? 'bg-purple-500' : t.isDark ? 'bg-white/20' : 'bg-gray-300'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </div>
    </label>
  );
}

// ─── Payment Gateway Method Badge ─────────────────────────────────────────────
function MethodBadge({ method }: { method: string }) {
  const t = useDashboardTheme();
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${t.s1} ${t.border} ${t.textMd}`}>
      {method}
    </span>
  );
}

// ─── Gateway Dropdown ─────────────────────────────────────────────────────────
function GatewayDropdown({
  value, onChange,
}: { value: string; onChange: (id: string) => void }) {
  const t = useDashboardTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = getGatewayById(value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all text-left
          ${t.s0} ${open ? `border-purple-500/60 ring-1 ring-purple-500/20` : `${t.border} ${t.hoverBorder}`}`}
      >
        {selected ? (
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: selected.accentColor }}
            >
              {selected.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className={`${t.text} text-sm font-semibold truncate`}>{selected.name}</p>
              <p className={`${t.textFaint} text-xs truncate`}>{selected.tagline}</p>
            </div>
          </div>
        ) : (
          <span className={`${t.textFaint} text-sm`}>— Select a payment gateway —</span>
        )}
        <ChevronDown className={`w-4 h-4 ${t.textFaint} shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 top-full mt-2 left-0 right-0 rounded-xl border shadow-2xl overflow-hidden
              ${t.isDark ? 'bg-[#12091e] border-white/10' : 'bg-white border-gray-200'}`}
            style={{ maxHeight: 340, overflowY: 'auto' }}
          >
            {MALAYSIA_GATEWAYS.map((gw) => (
              <button
                key={gw.id}
                type="button"
                onClick={() => { onChange(gw.id); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b last:border-b-0
                  ${gw.id === value
                    ? t.isDark ? 'bg-purple-500/15 border-white/5' : 'bg-purple-50 border-purple-100'
                    : t.isDark ? 'hover:bg-white/5 border-white/5' : 'hover:bg-gray-50 border-gray-100'
                  }`}
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: gw.accentColor }}
                >
                  {gw.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`${t.text} text-sm font-semibold`}>{gw.name}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${gw.badgeCls}`}>
                      {gw.country}
                    </span>
                  </div>
                  <p className={`${t.textFaint} text-xs truncate`}>{gw.tagline}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {gw.methods.slice(0, 2).map(m => (
                    <span key={m} className={`hidden sm:inline px-1.5 py-0.5 rounded text-[9px] border ${t.s1} ${t.border} ${t.textFaint}`}>{m}</span>
                  ))}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Settings Page ────────────────────────────────────────────────────────
export function SettingsPage() {
  const t = useDashboardTheme();
  const navigate = useNavigate();

  // ── SMTP ────────────────────────────────────────────────────────────────────
  const [smtpHost,    setSmtpHost]    = useState('smtp.sendgrid.net');
  const [smtpPort,    setSmtpPort]    = useState('587');
  const [smtpUser,    setSmtpUser]    = useState('apikey');
  const [smtpPass,    setSmtpPass]    = useState('');
  const [fromEmail,   setFromEmail]   = useState('noreply@brandtelligence.com.my');
  const [fromName,    setFromName]    = useState('Brandtelligence Platform');
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [smtpSaved,   setSmtpSaved]   = useState(false);

  // ── Payment Gateway ─────────────────────────────────────────────────────────
  const [gatewayId,      setGatewayId]      = useState('');
  const [sandboxMode,    setSandboxMode]     = useState(false);
  // Separate live / sandbox credential buckets per gateway
  const [liveCreds,      setLiveCreds]      = useState<Record<string, Record<string, string>>>({});
  const [sandboxCreds,   setSandboxCreds]   = useState<Record<string, Record<string, string>>>({});
  const [gracePeriod,    setGracePeriod]    = useState('7');
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [gatewaySaved,   setGatewaySaved]   = useState(false);
  const [testGwLoading,  setTestGwLoading]  = useState(false);
  const [webhookCopied,  setWebhookCopied]  = useState(false);

  const selectedGw = getGatewayById(gatewayId);
  const webhookUrl = gatewayId
    ? `${SERVER}/webhooks/${gatewayId}`
    : `${SERVER}/webhooks/{gateway}`;

  const currentCreds   = sandboxMode ? sandboxCreds   : liveCreds;
  const setCurrentCreds = sandboxMode ? setSandboxCreds : setLiveCreds;

  const setCred = (field: string, value: string) => {
    setCurrentCreds(prev => ({
      ...prev,
      [gatewayId]: { ...(prev[gatewayId] ?? {}), [field]: value },
    }));
  };
  const getCred = (field: string) => currentCreds[gatewayId]?.[field] ?? '';

  // ── Security ────────────────────────────────────────────────────────────────
  const [minPasswordLen, setMinPasswordLen] = useState('8');
  const [mfaRequired,    setMfaRequired]    = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('480');
  const [inviteTtl,      setInviteTtl]      = useState('24');
  const [secLoading,     setSecLoading]     = useState(false);
  const [secSaved,       setSecSaved]       = useState(false);

  // ── Dunning ─────────────────────────────────────────────────────────────────
  const [dunning7,   setDunning7]   = useState(true);
  const [dunningDue, setDunningDue] = useState(true);
  const [dunning3,   setDunning3]   = useState(true);

  // ── Load persisted configs on mount ─────────────────────────────────────────
  useEffect(() => {
    // SMTP
    (async () => {
      try {
        const res  = await fetch(`${SERVER}/smtp/config`, { headers: AUTH });
        const json = await res.json();
        if (json.config) {
          const c = json.config;
          if (c.host)      setSmtpHost(c.host);
          if (c.port)      setSmtpPort(c.port);
          if (c.user)      setSmtpUser(c.user);
          if (c.pass)      setSmtpPass(c.pass);
          if (c.fromEmail) setFromEmail(c.fromEmail);
          if (c.fromName)  setFromName(c.fromName);
          setSmtpSaved(true);
        }
      } catch { /* silent */ }
    })();

    // Payment Gateway
    (async () => {
      try {
        const res  = await fetch(`${SERVER}/payment-gateway/config`, { headers: AUTH });
        const json = await res.json();
        if (json.config) {
          const c = json.config;
          if (c.gatewayId)    setGatewayId(c.gatewayId);
          if (c.sandboxMode != null) setSandboxMode(c.sandboxMode);
          if (c.liveCreds)    setLiveCreds(c.liveCreds);
          if (c.sandboxCreds) setSandboxCreds(c.sandboxCreds);
          if (c.gracePeriod)  setGracePeriod(c.gracePeriod);
          setGatewaySaved(true);
        }
      } catch { /* silent */ }
    })();

    // Security Policy + MFA Policy (load both, merge)
    (async () => {
      try {
        const [secRes, mfaRes] = await Promise.all([
          fetch(`${SERVER}/security/policy`, { headers: AUTH }),
          fetch(`${SERVER}/mfa/policy`,      { headers: AUTH }),
        ]);
        const secJson = await secRes.json();
        const mfaJson = await mfaRes.json();
        if (secJson.policy) {
          const p = secJson.policy;
          if (p.minPasswordLen) setMinPasswordLen(p.minPasswordLen);
          if (p.sessionTimeout) setSessionTimeout(p.sessionTimeout);
          if (p.inviteTtl)      setInviteTtl(p.inviteTtl);
          if (p.mfaRequired != null) setMfaRequired(p.mfaRequired);
          setSecSaved(true);
        }
        // MFA policy overrides the security policy mfaRequired flag if present
        if (mfaJson.requireTenantAdminMfa != null) {
          setMfaRequired(mfaJson.requireTenantAdminMfa);
        }
      } catch { /* silent */ }
    })();
  }, []);

  // ── SMTP handlers ────────────────────────────────────────────────────────────
  const saveSmtp = async () => {
    setSmtpLoading(true);
    try {
      const res  = await fetch(`${SERVER}/smtp/config`, {
        method: 'POST', headers: AUTH,
        body: JSON.stringify({ host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, fromEmail, fromName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setSmtpSaved(true);
      toast.success('SMTP settings saved');
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSmtpLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!smtpSaved) { toast.error('Please save your SMTP settings first.'); return; }
    setTestLoading(true);
    try {
      const res  = await fetch(`${SERVER}/smtp/test`, {
        method: 'POST', headers: AUTH,
        body: JSON.stringify({ to: 'it@brandtelligence.com.my', config: { host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, fromEmail, fromName } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Send failed');
      toast.success(`✅ Test email sent to it@brandtelligence.com.my`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTestLoading(false);
    }
  };

  // ── Payment Gateway handlers ─────────────────────────────────────────────────
  const saveGateway = async () => {
    if (!gatewayId) { toast.error('Please select a payment gateway first.'); return; }
    setGatewayLoading(true);
    try {
      const res  = await fetch(`${SERVER}/payment-gateway/config`, {
        method: 'POST', headers: AUTH,
        body: JSON.stringify({ gatewayId, sandboxMode, liveCreds, sandboxCreds, gracePeriod }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setGatewaySaved(true);
      toast.success(`✅ ${selectedGw?.name ?? 'Payment Gateway'} settings saved`);
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
      console.error('[SettingsPage] Gateway save error:', err);
    } finally {
      setGatewayLoading(false);
    }
  };

  const testGatewaySandbox = async () => {
    if (!gatewayId) { toast.error('No gateway selected.'); return; }
    const sandboxBucket = sandboxCreds[gatewayId] ?? {};
    const primaryField  = selectedGw?.sandboxKeyField ?? '';
    const primaryValue  = sandboxBucket[primaryField] ?? '';
    if (!primaryValue.trim()) {
      toast.error(`Please fill in the Sandbox ${selectedGw?.fields.find(f => f.key === primaryField)?.sandboxLabel ?? 'credentials'} first.`);
      return;
    }
    setTestGwLoading(true);
    try {
      const res  = await fetch(`${SERVER}/payment-gateway/test`, {
        method: 'POST', headers: AUTH,
        body: JSON.stringify({ gateway: gatewayId, sandboxCreds: sandboxBucket }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Test failed');
      toast.success(`🧪 ${selectedGw?.name} sandbox: ${json.message}`);
    } catch (err: any) {
      toast.error(`Sandbox test failed: ${err.message}`);
      console.error('[SettingsPage] Gateway test error:', err);
    } finally {
      setTestGwLoading(false);
    }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setWebhookCopied(true);
      toast.success('Webhook URL copied!');
      setTimeout(() => setWebhookCopied(false), 2000);
    });
  };

  const handleSave = (section: string) => toast.success(`${section} settings saved`);

  // ── Save Security Policy (wires MFA toggle + security fields to KV) ─────────
  const saveSecurity = async () => {
    setSecLoading(true);
    try {
      // Save security policy fields
      const [secRes, mfaRes] = await Promise.all([
        fetch(`${SERVER}/security/policy`, {
          method: 'POST', headers: AUTH,
          body: JSON.stringify({ minPasswordLen, sessionTimeout, inviteTtl, mfaRequired }),
        }),
        fetch(`${SERVER}/mfa/policy`, {
          method: 'POST', headers: AUTH,
          body: JSON.stringify({ requireTenantAdminMfa: mfaRequired }),
        }),
      ]);
      if (!secRes.ok) { const j = await secRes.json(); throw new Error(j.error || 'Save failed'); }
      if (!mfaRes.ok) { const j = await mfaRes.json(); throw new Error(j.error || 'MFA policy save failed'); }
      setSecSaved(true);
      toast.success(`🔐 Security policy saved — MFA for Tenant Admins: ${mfaRequired ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      toast.error(`Security save failed: ${err.message}`);
      console.error('[SettingsPage] Security save error:', err);
    } finally {
      setSecLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Platform Settings" subtitle="Global configuration for email, payments, security, and notifications" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Email / SMTP ───────────────────────────────────────────────── */}
        <Card title="📧 Email / SMTP">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="SMTP Host">
                <Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.sendgrid.net" />
              </Field>
              <Field label="Port">
                <Input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="SMTP Username" hint='For SendGrid, use "apikey"'>
                <Input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="apikey" autoComplete="off" />
              </Field>
              <Field label="SMTP Password / API Key">
                <Input value={smtpPass} onChange={e => setSmtpPass(e.target.value)} type="password" placeholder="••••••••••••" autoComplete="new-password" />
              </Field>
            </div>
            <Field label="From Email" required>
              <Input value={fromEmail} onChange={e => setFromEmail(e.target.value)} type="email" placeholder="noreply@brandtelligence.com.my" />
            </Field>
            <Field label="From Name">
              <Input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Brandtelligence Platform" />
            </Field>
            {smtpSaved && (
              <div className="flex items-center gap-2 text-xs text-emerald-600">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SMTP configuration saved — test or update anytime
              </div>
            )}
            <div className="pt-1 flex flex-wrap justify-between items-center gap-2">
              <button onClick={() => navigate('/super/email-templates')} className="text-xs text-purple-500 hover:text-purple-600 flex items-center gap-1 transition-colors">
                <Mail className="w-3 h-3" /> Manage Email Templates →
              </button>
              <div className="flex gap-2">
                <PrimaryBtn size="sm" variant="ghost" onClick={sendTestEmail} loading={testLoading}>
                  {testLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  Send Test
                </PrimaryBtn>
                <PrimaryBtn size="sm" onClick={saveSmtp} loading={smtpLoading}>
                  <Save className="w-3.5 h-3.5" /> Save
                </PrimaryBtn>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Security Policy ─────────────────────────────────────────────── */}
        <Card title="🔐 Security Policy">
          <div className="space-y-4">
            <Field label="Minimum Password Length">
              <Select value={minPasswordLen} onChange={e => setMinPasswordLen(e.target.value)}>
                {['6', '8', '10', '12', '16'].map(v => <option key={v} value={v}>{v} characters</option>)}
              </Select>
            </Field>
            <Field label="Session Timeout (minutes)" hint="Users are signed out after this period of inactivity">
              <Input value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} type="number" min="30" max="1440" />
            </Field>
            <Field label="Invite Link TTL (hours)" hint="Invitation links expire after this many hours">
              <Input value={inviteTtl} onChange={e => setInviteTtl(e.target.value)} type="number" min="1" max="72" />
            </Field>

            {/* MFA toggle — now actually wired to /mfa/policy */}
            <Toggle checked={mfaRequired} onChange={v => { setMfaRequired(v); setSecSaved(false); }} label="Require MFA for Tenant Admins" />

            {/* MFA enforcement note */}
            <div className={`flex items-start gap-2 text-xs p-3 rounded-xl border ${
              mfaRequired
                ? t.isDark ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : t.isDark ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div>
                {mfaRequired
                  ? <>Tenant Admins will be required to enrol a TOTP authenticator app on next login. <strong>Super Admin always requires MFA regardless of this setting.</strong></>
                  : <>MFA is optional for Tenant Admins. <strong>Super Admin always requires MFA.</strong> Enable this to enforce TOTP for all Tenant Admin accounts.</>
                }
              </div>
            </div>

            {secSaved && (
              <div className="flex items-center gap-2 text-xs text-emerald-600">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Security policy saved and active
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <PrimaryBtn size="sm" onClick={saveSecurity} loading={secLoading}>
                {secLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                Save
              </PrimaryBtn>
            </div>
          </div>
        </Card>

        {/* ── Payment Gateway ─────────────────────────────────────────── (full width) */}
        <div className="lg:col-span-2">
          <div className={`rounded-2xl border ${t.border} ${t.s0} overflow-visible`}>
            {/* Card header */}
            <div className={`flex items-center justify-between px-6 py-5 border-b ${t.border}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <h3 className={`${t.text} font-semibold text-sm`}>💳 Payment Gateway</h3>
                  <p className={`${t.textFaint} text-xs`}>Configure your Malaysian payment provider and sandbox testing</p>
                </div>
              </div>
              {gatewaySaved && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Saved
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">

              {/* ── Gateway Selector + Mode Toggle Row ─────────────────────── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">

                {/* Gateway Dropdown */}
                <div>
                  <label className={`block ${t.textSm} text-xs font-semibold mb-2`}>
                    Payment Gateway Provider <span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <GatewayDropdown value={gatewayId} onChange={id => { setGatewayId(id); setGatewaySaved(false); }} />
                </div>

                {/* Mode Toggle */}
                <div>
                  <label className={`block ${t.textSm} text-xs font-semibold mb-2`}>
                    Operating Mode
                  </label>
                  <div className={`flex rounded-xl border overflow-hidden ${t.border} ${t.s1}`}>
                    {/* LIVE */}
                    <button
                      onClick={() => setSandboxMode(false)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold transition-all
                        ${!sandboxMode
                          ? 'bg-emerald-500 text-white'
                          : `${t.textFaint} hover:${t.textSm}`}`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Live
                    </button>
                    {/* SANDBOX */}
                    <button
                      onClick={() => setSandboxMode(true)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-semibold transition-all border-l ${t.border}
                        ${sandboxMode
                          ? 'bg-amber-500 text-white'
                          : `${t.textFaint} hover:${t.textSm}`}`}
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      Sandbox
                    </button>
                  </div>
                  {/* Mode pill description */}
                  <AnimatePresence mode="wait">
                    {sandboxMode ? (
                      <motion.div key="sandbox-hint"
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 mt-2 text-xs text-amber-600"
                      >
                        <FlaskConical className="w-3 h-3" />
                        Sandbox mode — no real transactions will be charged
                      </motion.div>
                    ) : (
                      <motion.div key="live-hint"
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600"
                      >
                        <Zap className="w-3 h-3" />
                        Live mode — real transactions enabled
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── Gateway Info Card (shown when gateway selected) ─────────────── */}
              <AnimatePresence>
                {selectedGw && (
                  <motion.div
                    key={selectedGw.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className={`rounded-xl border p-4 ${sandboxMode
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-emerald-500/5 border-emerald-500/20'}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      {/* Left: logo + name + methods */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ background: selectedGw.accentColor }}
                        >
                          {selectedGw.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`${t.text} font-bold text-sm`}>{selectedGw.name}</p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${selectedGw.badgeCls}`}>
                              {selectedGw.country}
                            </span>
                            {sandboxMode && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-amber-500/15 text-amber-600 border-amber-500/30">
                                SANDBOX
                              </span>
                            )}
                          </div>
                          <p className={`${t.textFaint} text-xs`}>{selectedGw.tagline}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {selectedGw.methods.map(m => <MethodBadge key={m} method={m} />)}
                          </div>
                        </div>
                      </div>

                      {/* Right: doc links */}
                      <div className="flex gap-2 shrink-0">
                        <a
                          href={sandboxMode ? selectedGw.sandboxDocsUrl : selectedGw.docsUrl}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {sandboxMode ? 'Sandbox Docs' : 'Documentation'}
                        </a>
                      </div>
                    </div>

                    {/* Gateway-specific notes */}
                    {selectedGw.notes && (
                      <div className={`mt-3 flex items-start gap-2 text-xs ${t.textFaint} bg-white/5 rounded-lg p-2`}>
                        <Info className="w-3 h-3 mt-0.5 shrink-0 text-sky-500" />
                        <span>{selectedGw.notes}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Credential Fields ────────────────────────────────────────── */}
              <AnimatePresence mode="wait">
                {selectedGw ? (
                  <motion.div key={`${selectedGw.id}-${sandboxMode ? 'sandbox' : 'live'}`}
                    initial={{ opacity: 0, x: sandboxMode ? 12 : -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    {selectedGw.fields.map(f => (
                      <Field
                        key={f.key}
                        label={sandboxMode ? f.sandboxLabel : f.label}
                        hint={sandboxMode ? f.sandboxHint : f.hint}
                        required={!f.optional}
                      >
                        <Input
                          type={f.type ?? 'password'}
                          value={getCred(f.key)}
                          onChange={e => setCred(f.key, e.target.value)}
                          placeholder={sandboxMode ? (f.sandboxPlaceholder ?? f.placeholder ?? '••••••••••••') : (f.placeholder ?? '••••••••••••')}
                          autoComplete="off"
                        />
                      </Field>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="no-gateway"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`rounded-xl border ${t.border} ${t.s1} p-8 text-center`}
                  >
                    <CreditCard className={`w-8 h-8 ${t.textFaint} mx-auto mb-2 opacity-40`} />
                    <p className={`${t.textFaint} text-sm`}>Select a payment gateway above to configure credentials</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Webhook URL (always shown) ───────────────────────────────── */}
              {selectedGw && (
                <div>
                  <label className={`block ${t.textSm} text-xs font-semibold mb-1`}>
                    Webhook Endpoint URL
                  </label>
                  <p className={`${t.textFaint} text-xs mb-2`}>
                    Register this URL in your {selectedGw.name} dashboard to receive payment event notifications.
                  </p>
                  <div className="flex gap-2">
                    <div className={`flex-1 flex items-center px-3 py-2.5 rounded-xl border ${t.border} ${t.s1} min-w-0`}>
                      <span className={`${t.textMd} text-xs font-mono truncate`}>{webhookUrl}</span>
                    </div>
                    <button
                      onClick={copyWebhook}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all text-xs font-semibold shrink-0
                        ${webhookCopied
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600'
                          : `${t.s1} ${t.border} ${t.textSm} ${t.hoverBorder}`}`}
                    >
                      {webhookCopied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {webhookCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Grace Period ─────────────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Grace Period After Due Date (days)" hint="Tenant access is suspended after this many days overdue. Set to 0 to suspend immediately.">
                  <Input value={gracePeriod} onChange={e => setGracePeriod(e.target.value)} type="number" min="0" max="30" />
                </Field>
              </div>

              {/* ── Sandbox warning banner ───────────────────────────────────── */}
              {sandboxMode && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/8">
                  <TriangleAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-600 text-xs font-semibold mb-0.5">You are in Sandbox Mode</p>
                    <p className={`${t.textFaint} text-xs`}>
                      Credentials entered here are your sandbox/test keys only. Switch to <strong>Live</strong> mode to enter production keys.
                      No real payments will be processed while sandbox mode is active.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Actions Row ──────────────────────────────────────────────── */}
              <div className={`flex flex-wrap items-center justify-between gap-3 pt-2 border-t ${t.border}`}>
                {/* Sandbox Test button */}
                <div>
                  {sandboxMode && selectedGw ? (
                    <PrimaryBtn
                      size="sm"
                      variant="ghost"
                      onClick={testGatewaySandbox}
                      loading={testGwLoading}
                    >
                      {testGwLoading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <FlaskConical className="w-3.5 h-3.5" />}
                      Test Sandbox Connection
                    </PrimaryBtn>
                  ) : (
                    <p className={`${t.textFaint} text-xs`}>
                      Switch to Sandbox mode to test your credentials
                    </p>
                  )}
                </div>

                {/* Save */}
                <PrimaryBtn size="sm" onClick={saveGateway} loading={gatewayLoading}>
                  <Save className="w-3.5 h-3.5" />
                  Save {sandboxMode ? 'Sandbox' : 'Live'} Settings
                </PrimaryBtn>
              </div>
            </div>
          </div>
        </div>

        {/* ── Dunning & Notifications ─────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card title="🔔 Dunning & Notifications">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Toggle checked={dunning7}   onChange={setDunning7}   label="Email reminder — 7 days before due date" />
              <Toggle checked={dunningDue} onChange={setDunningDue} label="Email reminder — on due date (if unpaid)" />
              <Toggle checked={dunning3}   onChange={setDunning3}   label="Overdue notice — 3 days after due date" />
            </div>
            <div className="pt-4 flex items-center justify-between">
              <button onClick={() => navigate('/super/email-templates')} className="text-xs text-purple-500 hover:text-purple-600 flex items-center gap-1 transition-colors">
                <Mail className="w-3 h-3" /> Edit dunning email templates →
              </button>
              <PrimaryBtn size="sm" onClick={() => handleSave('Dunning')}><Bell className="w-3.5 h-3.5" /> Save</PrimaryBtn>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}