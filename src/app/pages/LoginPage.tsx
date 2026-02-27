/**
 * LoginPage
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles three views: login · signup/request-access · forgot-password
 * plus a fourth inline view: mfa-challenge (shown post-password in production
 * when TOTP MFA is required and the user has an enrolled factor).
 *
 * PRODUCTION SAFETY GATE
 *   IS_PRODUCTION → real Supabase signInWithPassword → MFA challenge / enroll
 *   IS_DEMO_MODE  → MOCK_AUTH_USERS lookup (no Supabase calls)
 *
 * Demo credentials hint is ONLY rendered when SHOW_DEMO_CREDENTIALS is true.
 * That flag is false whenever VITE_APP_ENV=production.
 *
 * UI STRUCTURE — HARDCODED (do not modify layout unless explicitly requested)
 *   BackgroundLayout wraps everything.
 *   Max-width card: max-w-md, centred vertically.
 *   Views switch via local `viewMode` state (no routing between views).
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Eye, EyeOff, Upload, Check, X,
  Mail, Lock, User, Building2, Phone,
  ShieldCheck, Info, Loader2, FlaskConical, Clock,
} from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import brandtelligenceLogo from 'figma:asset/250842c5232a8611aa522e6a3530258e858657d5.png';
import { useAuth, buildProfileFromSupabaseUser, type UserProfile } from '../components/AuthContext';
import { BackgroundLayout } from '../components/BackgroundLayout';
import { MFAChallengeModal } from '../components/saas/MFAChallengeModal';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from '../utils/supabaseClient';
import {
  IS_PRODUCTION, IS_DEMO_MODE,
  SHOW_DEMO_CREDENTIALS,
  MFA_ALWAYS_REQUIRED_ROLES,
  SS_MFA_PENDING_USER, SS_MFA_TARGET_ROUTE,
} from '../config/appConfig';

// ─── Demo data (isolated — used only when IS_DEMO_MODE is true) ───────────────
// ALL demo content is imported from mockSaasData, never defined inline.
import { MOCK_AUTH_USERS, MOCK_TENANTS, MOCK_TENANT_USERS } from '../data/mockSaasData';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;
const AUTH_H = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };
const HCAPTCHA_SITE_KEY = 'c4c493ae-610a-4666-9400-7cf45358637c';

// Demo accounts chip list — rendered ONLY when SHOW_DEMO_CREDENTIALS is true
// ⚠️  NEVER hardcode passwords into component JSX. They live in mockSaasData.ts.
const DEMO_ACCOUNT_DISPLAY = [
  { label: 'Super Admin',  email: 'it@brandtelligence.com.my',  password: 'super123',  badge: 'bg-orange-500/30 text-orange-300 border-orange-500/40' },
  { label: 'Tenant Admin', email: 'james@acme.com',              password: 'tenant123', badge: 'bg-purple-500/30 text-purple-300 border-purple-500/40' },
  { label: 'Employee',     email: 'sarah.chen@brandtelligence.my', password: 'emp123', badge: 'bg-teal-500/30 text-teal-300 border-teal-500/40' },
];

// ─── Route helper ─────────────────────────────────────────────────────────────
function roleToRoute(role?: string) {
  if (role === 'SUPER_ADMIN')  return '/super/requests';
  if (role === 'TENANT_ADMIN') return '/tenant/overview';
  return '/projects';
}

type ViewMode = 'login' | 'signup' | 'forgot' | 'mfa-challenge';

// ─── Component ────────────────────────────────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate();
  const { login, user, sessionLoading } = useAuth();

  // ── View state ─────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('login');

  // ── Login fields ───────────────────────────────────────────────────────────
  const [loginEmail,    setLoginEmail]    = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError,    setLoginError]    = useState('');
  const [linkExpired,   setLinkExpired]   = useState(false); // true when Supabase returns otp_expired
  const [loginLoading,  setLoginLoading]  = useState(false);
  const [showPassword,  setShowPassword]  = useState(false);
  const [showDemoHint,  setShowDemoHint]  = useState(false);
  const [rememberMe,    setRememberMe]    = useState(false);

  // ── Redirect already-authenticated users straight to their dashboard ───────
  // Runs after sessionLoading is done so we don't flash a redirect before we
  // know whether a session actually exists.
  useEffect(() => {
    if (!sessionLoading && user) {
      navigate(roleToRoute(user.role), { replace: true });
    }
  }, [user, sessionLoading, navigate]);

  // Pre-fill remembered email on mount
  useEffect(() => {
    const saved = localStorage.getItem('bt_remembered_email');
    if (saved) {
      setLoginEmail(saved);
      setRememberMe(true);
    }
  }, []);

  // ── Handle Supabase auth-callback error fragments ──────────────────────────
  // When an invite / magic-link / recovery token is expired or invalid, Supabase
  // redirects back to the app with a URL fragment like:
  //   #error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
  // We parse this on mount, show a clear in-page message, and strip the hash
  // so a page refresh doesn't re-show it.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === '#') return;

    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const error      = params.get('error');
    const errorCode  = params.get('error_code');
    const errorDesc  = params.get('error_description');

    if (!error) return;

    // Clean the hash from the address bar immediately
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    if (errorCode === 'otp_expired' || error === 'access_denied') {
      setLinkExpired(true);
      setLoginError(
        'Your activation link has expired or has already been used. ' +
        'Please ask your administrator to resend the invite.',
      );
    } else {
      const readable = errorDesc ? errorDesc.replace(/\+/g, ' ') : error;
      setLoginError(`Authentication error: ${readable}. Please try again or contact support.`);
    }

    console.warn('[LoginPage] Supabase auth error from URL hash:', { error, errorCode, errorDesc });
  }, []);

  // ── MFA challenge state (production) ───────────────────────────────────────
  const [mfaPendingProfile,  setMfaPendingProfile]  = useState<UserProfile | null>(null);
  const [mfaPendingFactorId, setMfaPendingFactorId] = useState<string | null>(null);
  const [mfaTargetRoute,     setMfaTargetRoute]     = useState('/super/requests');

  // ── Signup fields ──────────────────────────────────────────────────────────
  const [profilePicture,       setProfilePicture]       = useState<string | null>(null);
  const [firstName,            setFirstName]            = useState('');
  const [lastName,             setLastName]             = useState('');
  const [company,              setCompany]              = useState('');
  const [signupEmail,          setSignupEmail]          = useState('');
  const [countryCode,          setCountryCode]          = useState('+60');
  const [mobileNumber,         setMobileNumber]         = useState('');
  const [signupPassword,       setSignupPassword]       = useState('');
  const [confirmPassword,      setConfirmPassword]      = useState('');
  const [showSignupPassword,   setShowSignupPassword]   = useState(false);
  const [showConfirmPassword,  setShowConfirmPassword]  = useState(false);

  // ── Forgot password fields ─────────────────────────────────────────────────
  const [resetEmail,    setResetEmail]    = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetLoading,  setResetLoading]  = useState(false);

  // ── hCaptcha ───────────────────────────────────────────────────────────────
  const loginCaptchaRef  = useRef<HCaptcha>(null);
  const signupCaptchaRef = useRef<HCaptcha>(null);
  const [loginCaptchaToken,  setLoginCaptchaToken]  = useState<string | null>(null);
  const [signupCaptchaToken, setSignupCaptchaToken] = useState<string | null>(null);
  const [loginCaptchaError,  setLoginCaptchaError]  = useState(false);
  const [signupCaptchaError, setSignupCaptchaError] = useState(false);

  // ─────────────────────────────────────────────────���───────────────────────
  // PRODUCTION AUTH FLOW
  // ─────────────────────────────────────────────────────────────────────────

  const performLoginProduction = async (captchaToken: string) => {
    setLoginLoading(true);
    setLoginError('');
    setLinkExpired(false);
    try {
      // 1. Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
        options: { captchaToken },
      });

      if (error) {
        setLoginError(
          error.message.includes('Invalid login')
            ? 'Invalid email or password.'
            : error.message,
        );
        loginCaptchaRef.current?.resetCaptcha();
        return;
      }

      const supabaseUser = data.user!;
      const role  = (supabaseUser.user_metadata?.role ?? 'EMPLOYEE') as string;
      const route = roleToRoute(role);
      const profile = buildProfileFromSupabaseUser(supabaseUser);

      // 2. Check if MFA is required for this role
      const mfaRequired =
        MFA_ALWAYS_REQUIRED_ROLES.includes(role) ||
        (role === 'TENANT_ADMIN' && (await fetchTenantAdminMfaPolicy()));

      if (!mfaRequired) {
        // No MFA — commit login and navigate
        login({ ...profile, mfaVerified: false });
        navigate(route, { replace: true });
        return;
      }

      // 3. MFA is required — check enrolled factors
      const { data: factorData } = await supabase.auth.mfa.listFactors();
      const verifiedFactor = factorData?.totp?.find(f => f.status === 'verified');

      if (verifiedFactor) {
        // User has a verified TOTP — show inline challenge
        setMfaPendingProfile(profile);
        setMfaPendingFactorId(verifiedFactor.id);
        setMfaTargetRoute(route);
        setViewMode('mfa-challenge');
      } else {
        // No factor enrolled → redirect to enrolment page
        sessionStorage.setItem(SS_MFA_PENDING_USER, JSON.stringify(profile));
        sessionStorage.setItem(SS_MFA_TARGET_ROUTE, route);
        navigate('/mfa-enroll', { replace: true });
      }
    } catch (err: any) {
      setLoginError(`Authentication error: ${err.message ?? 'Please try again.'}`);
      console.error('[LoginPage] Production login error:', err);
      loginCaptchaRef.current?.resetCaptcha();
    } finally {
      setLoginLoading(false);
    }
  };

  // Fetch the MFA policy for TENANT_ADMIN from the server (cached in module var)
  let _mfaPolicyCache: boolean | null = null;
  const fetchTenantAdminMfaPolicy = async (): Promise<boolean> => {
    if (_mfaPolicyCache !== null) return _mfaPolicyCache;
    try {
      const res  = await fetch(`${SERVER}/mfa/policy`, { headers: AUTH_H });
      const json = await res.json();
      _mfaPolicyCache = json.requireTenantAdminMfa ?? false;
      return _mfaPolicyCache!;
    } catch {
      return false; // default: not required if server unreachable
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DEMO AUTH FLOW (IS_DEMO_MODE only — uses MOCK_AUTH_USERS from mockSaasData)
  // ─────────────────────────────────────────────────────────────────────────

  const performLoginDemo = (_captchaToken: string) => {
    setLoginLoading(true);
    setLoginError('');
    setLinkExpired(false);

    const authUser = MOCK_AUTH_USERS.find(
      u => u.email.toLowerCase() === loginEmail.toLowerCase() && u.password === loginPassword,
    );

    if (!authUser) {
      setLoginError('Invalid email or password.');
      loginCaptchaRef.current?.resetCaptcha();
      setLoginLoading(false);
      return;
    }

    const tenant     = authUser.tenantId ? MOCK_TENANTS.find(t => t.id === authUser.tenantId) : null;
    const tenantUser = MOCK_TENANT_USERS.find(u => u.email.toLowerCase() === authUser.email.toLowerCase());
    const [first, ...rest] = authUser.name.split(' ');

    login({
      firstName:    first,
      lastName:     rest.join(' ') || '',
      jobTitle:
        authUser.role === 'SUPER_ADMIN'  ? 'Platform Administrator' :
        authUser.role === 'TENANT_ADMIN' ? 'Tenant Administrator'   :
        'Team Member',
      company:      tenant?.name ?? 'Brandtelligence',
      email:        authUser.email,
      profileImage:
        tenantUser?.avatar ??
        `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.name)}&background=0BA4AA&color=fff`,
      userLevel:
        authUser.role === 'SUPER_ADMIN'  ? 'superadmin' :
        authUser.role === 'TENANT_ADMIN' ? 'admin'       : 'employee',
      role:       authUser.role,
      tenantId:   authUser.tenantId,
      tenantName: tenant?.name ?? null,
      mfaVerified: false,
    });

    loginCaptchaRef.current?.resetCaptcha();

    if (authUser.role === 'SUPER_ADMIN')  navigate('/super/requests');
    else if (authUser.role === 'TENANT_ADMIN') navigate('/tenant/overview');
    else navigate('/projects');

    setLoginLoading(false);
  };

  // ── MFA challenge callbacks ────────────────────────────────────────────────

  const onMfaSuccess = () => {
    if (!mfaPendingProfile) { navigate('/login', { replace: true }); return; }
    login({ ...mfaPendingProfile, mfaVerified: true });
    navigate(mfaTargetRoute, { replace: true });
    toast.success('🔐 Signed in securely with two-factor authentication');
  };

  const onMfaCancel = () => {
    supabase.auth.signOut().catch(() => {});
    setMfaPendingProfile(null);
    setMfaPendingFactorId(null);
    setViewMode('login');
    setLoginPassword('');
  };

  // ── hCaptcha handlers ──────────────────────────────────────────────────────

  const onLoginCaptchaVerify = (token: string) => {
    setLoginCaptchaToken(token);
    setLoginCaptchaError(false);
    IS_PRODUCTION ? performLoginProduction(token) : performLoginDemo(token);
  };
  const onLoginCaptchaExpire  = () => { setLoginCaptchaToken(null); loginCaptchaRef.current?.resetCaptcha(); };
  const onLoginCaptchaError   = () => { setLoginCaptchaError(true); setLoginCaptchaToken(null); loginCaptchaRef.current?.resetCaptcha(); };

  const onSignupCaptchaVerify = (token: string) => { setSignupCaptchaToken(token); setSignupCaptchaError(false); performSignup(token); };
  const onSignupCaptchaExpire = () => { setSignupCaptchaToken(null); signupCaptchaRef.current?.resetCaptcha(); };
  const onSignupCaptchaError  = () => { setSignupCaptchaError(true); setSignupCaptchaToken(null); signupCaptchaRef.current?.resetCaptcha(); };

  // ── Form submit handlers ───────────────────────────────────────────────────

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginCaptchaError(false);
    setLoginError('');
    // Persist or clear remembered email
    if (rememberMe) {
      localStorage.setItem('bt_remembered_email', loginEmail);
    } else {
      localStorage.removeItem('bt_remembered_email');
    }
    loginCaptchaRef.current?.execute();
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword !== confirmPassword) { toast.error('Passwords do not match!'); return; }
    setSignupCaptchaError(false);
    signupCaptchaRef.current?.execute();
  };

  const performSignup = (_captchaToken: string) => {
    console.log('[LoginPage] Access Request submitted:', { firstName, lastName, company, signupEmail });
    signupCaptchaRef.current?.resetCaptcha();
    toast.success('Access request sent! An admin will review and email you within 24h.');
    setViewMode('login');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) { toast.error('Please enter your email address'); return; }
    setResetLoading(true);
    try {
      const res  = await fetch(`${SERVER}/auth/reset-password`, {
        method: 'POST', headers: AUTH_H,
        body: JSON.stringify({ email: resetEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send reset email');
      setResetEmailSent(true);
    } catch (err: any) {
      if (err.message?.includes('SMTP not configured')) {
        toast.warning('Email delivery is not yet configured — contact your administrator.');
      } else {
        toast.error(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  // ── Password strength ──────────────────────────────────────────────────────

  const getPasswordStrength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^a-zA-Z\d]/.test(pw)) s++;
    return s;
  };
  const pwStrength = getPasswordStrength(signupPassword);
  const pwLabels   = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const pwColors   = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-teal-500', 'bg-green-500'];

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfilePicture(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const fillDemo = (email: string, password: string) => {
    setLoginEmail(email);
    setLoginPassword(password);
    setLoginError('');
    setShowDemoHint(false);
  };

  // ── Shared input classes ────────────────────────────────────────────────────
  const inputCls               = 'w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all min-h-[2.75rem]';
  const inputWithIconCls       = 'w-full bg-white/10 border border-white/20 rounded-xl pl-11 pr-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all min-h-[2.75rem]';
  const inputWithIconToggleCls = 'w-full bg-white/10 border border-white/20 rounded-xl pl-11 pr-12 py-3 text-white placeholder-white/50 focus:outline-none focus:border-white/40 transition-all min-h-[2.75rem]';

  const HCaptchaDisclosure = () => (
    <p className="text-white/40 text-[0.65rem] text-center leading-relaxed pt-1">
      Protected by hCaptcha —{' '}
      <a href="https://www.hcaptcha.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60 transition-colors">Privacy Policy</a>{' '}
      &amp;{' '}
      <a href="https://www.hcaptcha.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60 transition-colors">Terms of Service</a>{' '}
      apply.
    </p>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // UI STRUCTURE — HARDCODED. Do not modify layout unless explicitly requested.
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <BackgroundLayout particleCount={20}>
      <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <div className="w-full max-w-md">

          {/* ── Demo Mode Ribbon ─────────────────────────────────────────────── */}
          {IS_DEMO_MODE && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 mb-4 px-4 py-2.5 rounded-xl border"
              style={{ background: 'rgba(62,60,112,0.7)', borderColor: '#0BA4AA40', backdropFilter: 'blur(8px)' }}
            >
              <FlaskConical className="w-3.5 h-3.5 shrink-0" style={{ color: '#0BA4AA' }} />
              <span className="text-xs font-semibold text-white/80">
                Demo Mode —{' '}
                <span style={{ color: '#0BA4AA' }}>mock data active</span>
                {' '}· set{' '}
                <code className="font-mono text-[0.65rem] bg-white/10 px-1 rounded">VITE_APP_ENV=production</code>
                {' '}for live Supabase
              </span>
            </motion.div>
          )}

          {/* Back Button */}
          {viewMode !== 'mfa-challenge' && (
            <motion.button
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
              onClick={() => navigate('/')}
              className="text-white/80 hover:text-white mb-4 sm:mb-6 inline-flex items-center gap-2 text-sm transition-colors min-h-[2.75rem]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </motion.button>
          )}

          {/* Logo */}
          {viewMode !== 'mfa-challenge' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="text-center mb-6 sm:mb-8"
            >
              <div className="inline-block bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/20 shadow-2xl">
                <img src={brandtelligenceLogo} alt="Brandtelligence" className="w-full max-w-[14rem] sm:max-w-xs h-auto mx-auto" />
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">

            {/* ═══ MFA CHALLENGE (inline — replaces login card post-password) ═══ */}
            {viewMode === 'mfa-challenge' && mfaPendingProfile && (
              <motion.div key="mfa" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Small logo for MFA screen */}
                <div className="text-center mb-6">
                  <div className="inline-block bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                    <img src={brandtelligenceLogo} alt="Brandtelligence" className="w-32 h-auto mx-auto" />
                  </div>
                </div>
                <MFAChallengeModal
                  factorId={mfaPendingFactorId}
                  userEmail={mfaPendingProfile.email}
                  supabaseUid={mfaPendingProfile.supabaseUid}
                  onSuccess={onMfaSuccess}
                  onCancel={onMfaCancel}
                />
              </motion.div>
            )}

            {/* ═══ LOGIN FORM ═══ */}
            {viewMode === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.6 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl"
              >
                <h2 className="text-white mb-2" style={{ fontSize: 'clamp(1.5rem, 4vw, 1.875rem)' }}>Welcome Back</h2>
                <p className="text-white/70 mb-5 sm:mb-6 text-sm sm:text-base">Sign in to continue to your account</p>

                {/* Demo credentials hint — ONLY shown when SHOW_DEMO_CREDENTIALS is true */}
                {SHOW_DEMO_CREDENTIALS && (
                  <div className="mb-5">
                    <button
                      type="button"
                      onClick={() => setShowDemoHint(v => !v)}
                      className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/70 transition-colors"
                    >
                      <Info className="w-3.5 h-3.5" />
                      {showDemoHint ? 'Hide' : 'Show'} demo credentials
                    </button>
                    <AnimatePresence>
                      {showDemoHint && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="mt-2 space-y-1.5 overflow-hidden"
                        >
                          {DEMO_ACCOUNT_DISPLAY.map(a => (
                            <button
                              key={a.email} type="button" onClick={() => fillDemo(a.email, a.password)}
                              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/25 transition-all text-left"
                            >
                              <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full border ${a.badge}`}>{a.label}</span>
                              <span className="text-white/60 text-xs font-mono truncate flex-1">{a.email}</span>
                              <span className="text-white/30 text-[0.65rem] shrink-0">click to fill</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
                  <div>
                    <label className="block text-white/90 mb-2 text-sm">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                      <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className={inputWithIconCls} placeholder="Enter your email" required autoComplete="email" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-white/90 text-sm">Password</label>
                      <button type="button" onClick={() => setViewMode('forgot')} className="text-white/60 hover:text-white text-xs transition-colors">
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                      <input
                        type={showPassword ? 'text' : 'password'} value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)} className={inputWithIconToggleCls}
                        placeholder="Enter your password" required autoComplete="current-password"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors p-1 min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setRememberMe(v => !v)}
                      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all shrink-0 ${
                        rememberMe
                          ? 'bg-teal-500 border-teal-500'
                          : 'bg-white/10 border-white/30 hover:border-white/50'
                      }`}
                      aria-checked={rememberMe}
                      role="checkbox"
                    >
                      {rememberMe && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </button>
                    <span
                      className="text-white/70 text-sm cursor-pointer select-none"
                      onClick={() => setRememberMe(v => !v)}
                    >
                      Remember me
                    </span>
                  </div>

                  {/* Auth error — two visual variants */}
                  {loginError && !linkExpired && (
                    <div className="flex items-start gap-2 bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 text-red-300 text-sm">
                      <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}
                  {loginError && linkExpired && (
                    <div className="bg-amber-500/15 border border-amber-400/40 rounded-xl px-4 py-3 text-sm space-y-1">
                      <div className="flex items-center gap-2 text-amber-300 font-medium">
                        <Clock className="w-4 h-4 shrink-0" />
                        Invite link expired
                      </div>
                      <p className="text-amber-200/80 leading-snug pl-6">
                        {loginError}
                      </p>
                    </div>
                  )}
                  {loginCaptchaError && (
                    <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 text-red-300 text-sm">
                      <ShieldCheck className="w-4 h-4 shrink-0" />Security verification failed. Please try again.
                    </div>
                  )}

                  {/* Invisible hCaptcha */}
                  <HCaptcha ref={loginCaptchaRef} sitekey={HCAPTCHA_SITE_KEY} size="invisible" onVerify={onLoginCaptchaVerify} onExpire={onLoginCaptchaExpire} onError={onLoginCaptchaError} theme="dark" />

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit"
                    disabled={loginLoading}
                    className="w-full backdrop-blur-md border-2 text-white px-6 py-3 rounded-xl transition-all shadow-lg min-h-[3rem] flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: 'rgba(11,164,170,0.25)', borderColor: '#0BA4AA80' }}
                  >
                    {loginLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign In'}
                  </motion.button>

                  <HCaptchaDisclosure />

                  <div className="text-center pt-4 border-t border-white/20">
                    <p className="text-white/70 text-sm">
                      Don't have an account?{' '}
                      <Link to="/request-access" className="text-white hover:underline">Request Access</Link>
                    </p>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ═══ SIGNUP FORM ═══ */}
            {viewMode === 'signup' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.6 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl"
              >
                <h2 className="text-white mb-2" style={{ fontSize: 'clamp(1.5rem, 4vw, 1.875rem)' }}>Request Access</h2>
                <p className="text-white/70 mb-6 sm:mb-8 text-sm sm:text-base">Submit your details for approval</p>

                <form onSubmit={handleSignup} className="space-y-4 sm:space-y-5">
                  <div className="flex flex-col items-center mb-2 sm:mb-4">
                    <div className="relative">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center overflow-hidden">
                        {profilePicture ? <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-8 h-8 sm:w-10 sm:h-10 text-white/50" />}
                      </div>
                      <label className="absolute bottom-0 right-0 p-2.5 rounded-full cursor-pointer transition-colors shadow-lg min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center" style={{ background: '#0BA4AA' }}>
                        <Upload className="w-4 h-4 text-white" />
                        <input type="file" accept="image/*" onChange={handleProfilePictureUpload} className="hidden" />
                      </label>
                    </div>
                    <p className="text-white/60 text-xs mt-2">Upload Profile Picture</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-white/90 mb-2 text-sm">First Name</label>
                      <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} placeholder="John" required />
                    </div>
                    <div>
                      <label className="block text-white/90 mb-2 text-sm">Last Name</label>
                      <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} placeholder="Doe" required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/90 mb-2 text-sm">Company</label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                      <input type="text" value={company} onChange={e => setCompany(e.target.value)} className={inputWithIconCls} placeholder="Your company name" required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/90 mb-2 text-sm">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                      <input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} className={inputWithIconCls} placeholder="your.email@company.com" required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/90 mb-2 text-sm">Mobile Number</label>
                    <div className="flex gap-2">
                      <div className="relative w-24 sm:w-28 shrink-0">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                        <select value={countryCode} onChange={e => setCountryCode(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl pl-8 pr-2 py-3 text-white focus:outline-none focus:border-white/40 transition-all appearance-none text-sm min-h-[2.75rem]">
                          {['+60', '+65', '+1', '+44', '+61', '+91'].map(c => <option key={c} value={c} className="bg-gray-800">{c}</option>)}
                        </select>
                      </div>
                      <input type="tel" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} className={`flex-1 ${inputCls}`} placeholder="123456789" required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/90 mb-2 text-sm">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                      <input type={showSignupPassword ? 'text' : 'password'} value={signupPassword} onChange={e => setSignupPassword(e.target.value)} className={inputWithIconToggleCls} placeholder="Create a strong password" required />
                      <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors p-1 min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center">
                        {showSignupPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {signupPassword && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < pwStrength ? pwColors[pwStrength - 1] : 'bg-white/20'}`} />
                          ))}
                        </div>
                        <p className="text-xs text-white/70">Strength: {pwLabels[pwStrength - 1] || 'Very Weak'}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-white/90 mb-2 text-sm">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                      <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputWithIconToggleCls} placeholder="Re-enter your password" required />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors p-1 min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center">
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {confirmPassword && (
                      <div className="mt-2 flex items-center gap-2">
                        {signupPassword === confirmPassword
                          ? <><Check className="w-4 h-4 text-green-400" /><p className="text-xs text-green-400">Passwords match</p></>
                          : <><X className="w-4 h-4 text-red-400" /><p className="text-xs text-red-400">Passwords do not match</p></>}
                      </div>
                    )}
                  </div>

                  {signupCaptchaError && (
                    <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 text-red-300 text-sm">
                      <ShieldCheck className="w-4 h-4 shrink-0" />Security verification failed. Please try again.
                    </div>
                  )}

                  <HCaptcha ref={signupCaptchaRef} sitekey={HCAPTCHA_SITE_KEY} size="invisible" onVerify={onSignupCaptchaVerify} onExpire={onSignupCaptchaExpire} onError={onSignupCaptchaError} theme="dark" />

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit"
                    className="w-full bg-white/20 backdrop-blur-md border-2 border-white/40 text-white px-6 py-3 rounded-xl hover:bg-white/30 hover:border-white/60 transition-all shadow-lg min-h-[3rem]"
                  >
                    Request Access
                  </motion.button>

                  <HCaptchaDisclosure />

                  <div className="text-center pt-4 border-t border-white/20">
                    <p className="text-white/70 text-sm">
                      Already have an account?{' '}
                      <button type="button" onClick={() => setViewMode('login')} className="text-white hover:underline min-h-[2.75rem] inline-flex items-center">Sign In</button>
                    </p>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ═══ FORGOT PASSWORD FORM ═══ */}
            {viewMode === 'forgot' && !resetEmailSent && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.6 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl"
              >
                <h2 className="text-white mb-2" style={{ fontSize: 'clamp(1.5rem, 4vw, 1.875rem)' }}>Reset Password</h2>
                <p className="text-white/70 mb-6 sm:mb-8 text-sm sm:text-base">Enter your email to receive reset instructions</p>
                <form onSubmit={handleForgotPassword} className="space-y-5 sm:space-y-6">
                  <div>
                    <label className="block text-white/90 mb-2 text-sm">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                      <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className={inputWithIconCls} placeholder="Enter your email" required />
                    </div>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit"
                    className="w-full bg-white/20 backdrop-blur-md border-2 border-white/40 text-white px-6 py-3 rounded-xl hover:bg-white/30 hover:border-white/60 transition-all shadow-lg min-h-[3rem] flex items-center justify-center"
                  >
                    {resetLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Instructions'}
                  </motion.button>
                  <div className="text-center pt-4 border-t border-white/20">
                    <p className="text-white/70 text-sm">
                      Remember your password?{' '}
                      <button type="button" onClick={() => setViewMode('login')} className="text-white hover:underline min-h-[2.75rem] inline-flex items-center">Sign In</button>
                    </p>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ═══ FORGOT PASSWORD SUCCESS ═══ */}
            {viewMode === 'forgot' && resetEmailSent && (
              <motion.div
                key="forgot-sent"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl"
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-green-400 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6"
                  style={{ background: 'rgba(34,197,94,0.15)' }}
                >
                  <Check className="w-7 h-7 sm:w-8 sm:h-8 text-green-400" />
                </motion.div>
                <h2 className="text-white mb-4 text-center" style={{ fontSize: 'clamp(1.5rem, 4vw, 1.875rem)' }}>Check Your Inbox</h2>
                <div className="bg-white/5 border border-white/20 rounded-xl p-4 mb-4 sm:mb-6">
                  <p className="text-white/90 text-center text-sm">Reset instructions sent to</p>
                  <p className="text-white text-center mt-2 break-all font-medium">{resetEmail}</p>
                </div>
                <p className="text-white/70 text-sm text-center mb-4 sm:mb-6">Check your inbox and follow the link to reset your password.</p>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setResetEmailSent(false); setResetEmail(''); setViewMode('login'); }}
                  className="w-full bg-white/20 backdrop-blur-md border-2 border-white/40 text-white px-6 py-3 rounded-xl hover:bg-white/30 hover:border-white/60 transition-all shadow-lg min-h-[3rem]"
                >
                  Back to Sign In
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </BackgroundLayout>
  );
}