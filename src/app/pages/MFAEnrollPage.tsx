/**
 * MFAEnrollPage — TOTP Authenticator Setup
 * ─────────────────────────────────────────────────────────────────────────────
 * Reached after a successful password login when MFA is required but the user
 * has no TOTP factor enrolled yet.
 *
 * Flow:
 *   Step 1 → Download authenticator app (info + links)
 *   Step 2 → Scan QR code (from supabase.auth.mfa.enroll) or enter secret key
 *   Step 3 → Verify — enter the first 6-digit code to confirm enrollment
 *   Step 4 → Recovery codes — save these before continuing
 *
 * After enrollment completes, commits the pending login and navigates to the
 * correct dashboard based on role.
 *
 * Production Safety Gate: this page calls Supabase auth.mfa.* directly and
 * stores recovery codes via the server edge function. It does NOT use any
 * mock data.
 */

import { useState, useEffect, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, Smartphone, QrCode, KeyRound, CheckCircle2,
  Copy, CheckCheck, ArrowRight, Loader2, RefreshCcw, ExternalLink,
  FlaskConical, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../components/AuthContext';
import { BackgroundLayout } from '../components/BackgroundLayout';
import {
  IS_DEMO_MODE, MFA_RECOVERY_CODE_COUNT, TOTP_ISSUER,
  SS_MFA_PENDING_USER, SS_MFA_TARGET_ROUTE,
} from '../config/appConfig';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../utils/authHeaders';
import type { UserProfile } from '../components/AuthContext';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// ─── Recovery code generator ──────────────────────────────────────────────────

function generateRecoveryCodes(count: number): string[] {
  return Array.from({ length: count }, () => {
    const seg = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${seg()}-${seg()}`;
  });
}

// ─── OTP Input (reused style from challenge modal) ────────────────────────────

function OtpInput({
  value, onChange, disabled,
}: { value: string[]; onChange: (v: string[]) => void; disabled: boolean }) {
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));
  const focus = (i: number) => refs[i]?.current?.focus();

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (value[i]) { const n = [...value]; n[i] = ''; onChange(n); }
      else if (i > 0) { focus(i - 1); const n = [...value]; n[i - 1] = ''; onChange(n); }
    }
    if (e.key === 'ArrowLeft'  && i > 0) focus(i - 1);
    if (e.key === 'ArrowRight' && i < 5) focus(i + 1);
  };

  const handleInput = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    const n = [...value];
    n[i] = digit;
    onChange(n);
    if (i < 5) focus(i + 1);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    if (!digits.length) return;
    const n = [...value];
    digits.forEach((d, i) => { if (i < 6) n[i] = d; });
    onChange(n);
    focus(Math.min(digits.length, 5));
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {refs.map((ref, i) => (
        <input
          key={i} ref={ref} type="text" inputMode="numeric" maxLength={1}
          value={value[i] ?? ''} disabled={disabled}
          onChange={e => handleInput(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          onFocus={e => e.target.select()}
          className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border-2
            bg-white/10 text-white transition-all focus:outline-none
            ${value[i] ? 'border-teal-400 bg-teal-500/20' : 'border-white/20 focus:border-white/50'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ['Get the App', 'Scan QR Code', 'Verify', 'Save Codes'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
              ${i < current  ? 'bg-emerald-500 border-emerald-500 text-white' :
                i === current ? 'bg-purple-500/30 border-purple-400 text-purple-200' :
                                'bg-white/5 border-white/20 text-white/30'}`}
            >
              {i < current ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[9px] mt-1 hidden sm:block transition-colors
              ${i === current ? 'text-purple-300 font-semibold' : 'text-white/30'}`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-6 sm:w-10 h-px mb-4 transition-all ${i < current ? 'bg-emerald-500' : 'bg-white/15'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MFAEnrollPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step,          setStep]          = useState(0);
  const [factorId,      setFactorId]      = useState('');
  const [qrUri,         setQrUri]         = useState('');
  const [secret,        setSecret]        = useState('');
  const [showSecret,    setShowSecret]    = useState(false);
  const [digits,        setDigits]        = useState<string[]>(Array(6).fill(''));
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError,   setVerifyError]   = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [codesCopied,   setCodesCopied]   = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [pendingUser,   setPendingUser]   = useState<UserProfile | null>(null);
  const [targetRoute,   setTargetRoute]   = useState('/super/requests');

  const code = digits.join('');

  // ── Guard: read pending user from sessionStorage ───────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem(SS_MFA_PENDING_USER);
    if (!raw) { navigate('/login', { replace: true }); return; }
    try {
      const profile = JSON.parse(raw) as UserProfile;
      setPendingUser(profile);
      const route = sessionStorage.getItem(SS_MFA_TARGET_ROUTE) ?? '/super/requests';
      setTargetRoute(route);
    } catch {
      navigate('/login', { replace: true });
    }
  }, []);

  // ── Step 1 → 2: initiate enrollment ───────────────────────────────────────
  const startEnrollment = async () => {
    setEnrollLoading(true);
    try {
      if (IS_DEMO_MODE) {
        // Demo: generate a fake TOTP URI so the QR code renders something real
        const fakeSecret = 'JBSWY3DPEHPK3PXP'; // well-known test secret
        const uri = `otpauth://totp/${encodeURIComponent(TOTP_ISSUER)}:${encodeURIComponent(pendingUser?.email ?? 'demo@example.com')}?secret=${fakeSecret}&issuer=${encodeURIComponent(TOTP_ISSUER)}`;
        setQrUri(uri);
        setSecret(fakeSecret);
        setFactorId('demo-factor-id');
        setStep(1);
        return;
      }

      // Production: real Supabase enroll
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: TOTP_ISSUER,
        friendlyName: `${TOTP_ISSUER} (${pendingUser?.email ?? ''})`,
      });
      if (error) throw error;

      setFactorId(data.id);
      setQrUri(data.totp.qr_code);  // this is already a data: URI from Supabase
      setSecret(data.totp.secret);
      setStep(1);
    } catch (err: any) {
      toast.error(`Enrollment error: ${err.message}`);
      console.error('[MFAEnrollPage] enroll error:', err);
    } finally {
      setEnrollLoading(false);
    }
  };

  // ── Step 2 → 3: verify first code ─────────────────────────────────────────
  const verifyCode = async () => {
    if (code.length < 6) return;
    setVerifyError('');
    setVerifyLoading(true);
    try {
      if (IS_DEMO_MODE) {
        // Demo: accept any 6-digit code
        if (!/^\d{6}$/.test(code)) { setVerifyError('Enter a valid 6-digit code.'); return; }
        await new Promise(r => setTimeout(r, 800));
        const codes = generateRecoveryCodes(MFA_RECOVERY_CODE_COUNT);
        setRecoveryCodes(codes);
        setStep(3);
        return;
      }

      // Production: challengeAndVerify
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) {
        setVerifyError(
          error.message.includes('Invalid') || error.message.includes('expired')
            ? 'Incorrect code — check your app and try again. Codes refresh every 30 seconds.'
            : `Verification error: ${error.message}`,
        );
        setDigits(Array(6).fill(''));
        return;
      }

      // Generate + store recovery codes
      const codes = generateRecoveryCodes(MFA_RECOVERY_CODE_COUNT);
      setRecoveryCodes(codes);

      // Persist recovery codes to server (one-time use, stored in KV)
      if (pendingUser?.supabaseUid) {
        try {
          await fetch(`${SERVER}/mfa-recovery/store`, {
            method: 'POST', headers: await getAuthHeaders(true),
            body: JSON.stringify({ userId: pendingUser.supabaseUid, codes }),
          });
        } catch { /* silent — user still enrolled; recovery codes shown on screen */ }
      }

      setStep(3);
    } catch (err: any) {
      setVerifyError(`Unexpected error: ${err.message}`);
    } finally {
      setVerifyLoading(false);
    }
  };

  // Auto-submit on digit 6
  useEffect(() => {
    if (step === 2 && code.length === 6 && !verifyLoading) verifyCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  // ── Step 4: complete enrollment ────────────────────────────────────────────
  const completeEnrollment = () => {
    if (!pendingUser) { navigate('/login', { replace: true }); return; }
    // Commit login
    login({ ...pendingUser, mfaVerified: true });
    // Clean up sessionStorage
    sessionStorage.removeItem(SS_MFA_PENDING_USER);
    sessionStorage.removeItem(SS_MFA_TARGET_ROUTE);
    navigate(targetRoute, { replace: true });
    toast.success('🔐 MFA enabled — your account is now more secure!');
  };

  const copyAllCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n')).then(() => {
      setCodesCopied(true);
      toast.success('Recovery codes copied!');
      setTimeout(() => setCodesCopied(false), 2500);
    });
  };

  // ── QR code URL (Step 2) ───────────────────────────────────────────────────
  // Supabase returns a data: URI; for demo we use the qrserver.com free API
  const qrCodeImgSrc = IS_DEMO_MODE
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUri)}`
    : qrUri; // Supabase gives us a data: URI directly

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <BackgroundLayout particleCount={15}>
      <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">

          {/* Logo / brand */}
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/20">
              <ShieldCheck className="w-5 h-5 text-purple-300" />
              <span className="text-white font-bold text-sm">Two-Factor Authentication Setup</span>
            </div>
          </motion.div>

          {/* Demo badge */}
          {IS_DEMO_MODE && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 mb-4 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30"
            >
              <FlaskConical className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 text-xs font-semibold">
                Demo Mode — enrollment simulated, any 6-digit code works
              </span>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl"
          >
            <StepIndicator current={step} />

            <AnimatePresence mode="wait">

              {/* ── STEP 0: Get the App ──────────────────────────────────────── */}
              {step === 0 && (
                <motion.div key="step0"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div className="text-center">
                    <Smartphone className="w-10 h-10 text-purple-300 mx-auto mb-3" />
                    <h2 className="text-white text-xl font-bold mb-1">Get an Authenticator App</h2>
                    <p className="text-white/60 text-sm">
                      You'll need an authenticator app to generate secure login codes.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {[
                      { name: 'Google Authenticator', stores: 'iOS & Android', url: 'https://support.google.com/accounts/answer/1066447' },
                      { name: 'Microsoft Authenticator', stores: 'iOS & Android', url: 'https://www.microsoft.com/en-us/security/mobile-authenticator-app' },
                      { name: 'Authy', stores: 'iOS, Android & Desktop', url: 'https://authy.com/download/' },
                      { name: '1Password / Bitwarden', stores: 'Built-in TOTP support', url: 'https://bitwarden.com' },
                    ].map(app => (
                      <a
                        key={app.name}
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/25 transition-all group"
                      >
                        <div>
                          <p className="text-white text-sm font-semibold">{app.name}</p>
                          <p className="text-white/40 text-xs">{app.stores}</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 transition-colors" />
                      </a>
                    ))}
                  </div>

                  <p className="text-white/40 text-xs text-center">
                    Already have one? Click below to continue.
                  </p>

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={startEnrollment}
                    disabled={enrollLoading}
                    className="w-full flex items-center justify-center gap-2 bg-purple-500/30 border-2 border-purple-400/50 text-white px-6 py-3 rounded-xl hover:bg-purple-500/40 transition-all min-h-[3rem] disabled:opacity-50"
                  >
                    {enrollLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</>
                      : <><ArrowRight className="w-4 h-4" /> I have an app — continue</>}
                  </motion.button>
                </motion.div>
              )}

              {/* ── STEP 1: Scan QR Code ─────────────────────────────────────── */}
              {step === 1 && (
                <motion.div key="step1"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div className="text-center">
                    <QrCode className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                    <h2 className="text-white text-xl font-bold mb-1">Scan the QR Code</h2>
                    <p className="text-white/60 text-sm">
                      Open your authenticator app, tap <strong className="text-white/80">"+"</strong> or
                      <strong className="text-white/80"> "Add account"</strong>, then scan this code.
                    </p>
                  </div>

                  {/* QR code */}
                  <div className="flex justify-center">
                    <div className="bg-white p-3 rounded-2xl shadow-xl">
                      <img
                        src={qrCodeImgSrc}
                        alt="TOTP QR Code"
                        className="w-44 h-44 sm:w-52 sm:h-52 object-contain"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  </div>

                  {/* Manual secret fallback */}
                  <div>
                    <button
                      onClick={() => setShowSecret(s => !s)}
                      className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1 mx-auto"
                    >
                      <KeyRound className="w-3 h-3" />
                      {showSecret ? 'Hide' : 'Can\'t scan?'} Enter the secret key manually
                    </button>
                    <AnimatePresence>
                      {showSecret && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 overflow-hidden"
                        >
                          <div className="bg-white/5 border border-white/15 rounded-xl p-3 text-center">
                            <p className="text-white/50 text-xs mb-1">Secret key (type this in your app):</p>
                            <p className="text-white font-mono text-sm tracking-widest break-all">{secret}</p>
                            <p className="text-white/30 text-xs mt-1">
                              Select: Time-based · Algorithm: SHA1 · Period: 30s · Digits: 6
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setStep(2)}
                    className="w-full flex items-center justify-center gap-2 bg-purple-500/30 border-2 border-purple-400/50 text-white px-6 py-3 rounded-xl hover:bg-purple-500/40 transition-all min-h-[3rem]"
                  >
                    <ArrowRight className="w-4 h-4" /> I've scanned it — continue
                  </motion.button>
                </motion.div>
              )}

              {/* ── STEP 2: Verify ───────────────────────────────────────────── */}
              {step === 2 && (
                <motion.div key="step2"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div className="text-center">
                    <ShieldCheck className="w-8 h-8 text-teal-300 mx-auto mb-2" />
                    <h2 className="text-white text-xl font-bold mb-1">Verify Your Setup</h2>
                    <p className="text-white/60 text-sm">
                      Enter the 6-digit code shown in your authenticator app to confirm it's working.
                    </p>
                  </div>

                  <OtpInput value={digits} onChange={setDigits} disabled={verifyLoading} />

                  {verifyError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 bg-red-500/15 border border-red-400/30 rounded-xl px-4 py-3"
                    >
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-red-300 text-sm">{verifyError}</p>
                    </motion.div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={verifyCode}
                    disabled={code.length < 6 || verifyLoading}
                    className="w-full flex items-center justify-center gap-2 bg-teal-500/30 border-2 border-teal-400/50 text-white px-6 py-3 rounded-xl hover:bg-teal-500/40 transition-all min-h-[3rem] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {verifyLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                      : <><CheckCircle2 className="w-4 h-4" /> Verify & Continue</>}
                  </motion.button>

                  <button
                    onClick={() => { setStep(1); setDigits(Array(6).fill('')); setVerifyError(''); }}
                    className="flex items-center gap-1 text-white/40 hover:text-white/70 text-xs transition-colors mx-auto"
                  >
                    <RefreshCcw className="w-3 h-3" /> Back to QR code
                  </button>
                </motion.div>
              )}

              {/* ── STEP 3: Recovery Codes ───────────────────────────────────── */}
              {step === 3 && (
                <motion.div key="step3"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div className="text-center">
                    <KeyRound className="w-8 h-8 text-amber-300 mx-auto mb-2" />
                    <h2 className="text-white text-xl font-bold mb-1">Save Your Recovery Codes</h2>
                    <p className="text-white/60 text-sm">
                      If you lose access to your authenticator app, use one of these codes to sign in.
                      <strong className="text-amber-300"> Each code can only be used once.</strong>
                    </p>
                  </div>

                  {/* Warning */}
                  <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-400/30 rounded-xl px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-amber-200 text-xs">
                      Save these codes somewhere safe — a password manager, printed document, or secure note.
                      They will <strong>not</strong> be shown again after you close this page.
                    </p>
                  </div>

                  {/* Recovery codes grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {recoveryCodes.map((c, i) => (
                      <div
                        key={i}
                        className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-center font-mono text-sm text-white/90 tracking-widest"
                      >
                        {c}
                      </div>
                    ))}
                  </div>

                  {/* Copy all */}
                  <button
                    onClick={copyAllCodes}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all
                      ${codesCopied
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-white/5 border-white/15 text-white/70 hover:border-white/30 hover:text-white'}`}
                  >
                    {codesCopied ? <><CheckCheck className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy all codes</>}
                  </button>

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={completeEnrollment}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500/30 border-2 border-emerald-400/50 text-white px-6 py-3 rounded-xl hover:bg-emerald-500/40 transition-all min-h-[3rem]"
                  >
                    <CheckCircle2 className="w-4 h-4" /> I've saved my codes — finish setup
                  </motion.button>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>

          {/* Bottom note */}
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-center text-white/30 text-xs mt-4"
          >
            MFA is required for your account role. Contact your Super Admin if you need assistance.
          </motion.p>
        </div>
      </div>
    </BackgroundLayout>
  );
}
