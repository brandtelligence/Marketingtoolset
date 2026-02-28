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
  ChevronDown, Zap,
} from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import brandtelligenceLogo from 'figma:asset/250842c5232a8611aa522e6a3530258e858657d5.png';
import { useAuth, buildProfileFromSupabaseUser, type UserProfile } from '../components/AuthContext';
import { BackgroundLayout } from '../components/BackgroundLayout';
import { MFAChallengeModal } from '../components/saas/MFAChallengeModal';
import { toast } from 'sonner';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../utils/authHeaders';
import { supabase } from '../utils/supabaseClient';
import {
  IS_PRODUCTION, IS_DEMO_MODE,
  SHOW_DEMO_CREDENTIALS,
  MFA_ALWAYS_REQUIRED_ROLES,
  SS_MFA_PENDING_USER, SS_MFA_TARGET_ROUTE,
  setDemoMode,
} from '../config/appConfig';

// ─── Demo data (isolated — used only when IS_DEMO_MODE is true) ───────────────
// ALL demo content is imported from mockSaasData, never defined inline.
import { MOCK_AUTH_USERS, MOCK_TENANTS, MOCK_TENANT_USERS } from '../data/mockSaasData';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

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

  // ── Login auth tab ─────────────────────────────────────────────────────────
  const [authTab, setAuthTab] = useState<'password' | 'magic'>('password');
  const [magicLinkEmail, setMagicLinkEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);

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

  // ── Phase 2.2: Show session-expired toast when redirected from AuthContext ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'session_expired') {
      toast.info('Your session has expired — please sign in again.');
      // Strip the query param so a page refresh doesn't re-show the toast
      window.history.replaceState({}, '', '/login');
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

  // ────────────────────────────────────────────────────────────────────────
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
      const res  = await fetch(`${SERVER}/mfa/policy`, { headers: await getAuthHeaders(true) });
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
        method: 'POST', headers: await getAuthHeaders(true),
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

  // ── Magic Link handler ─────────────────────────────────────────────────────

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicLinkEmail.trim()) { toast.error('Please enter your email address'); return; }
    setMagicLinkLoading(true);
    try {
      if (IS_PRODUCTION) {
        const { error } = await supabase.auth.signInWithOtp({ email: magicLinkEmail });
        if (error) throw error;
      }
      setMagicLinkSent(true);
      toast.success('Magic link sent! Check your inbox.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send magic link. Please try again.');
    } finally {
      setMagicLinkLoading(false);
    }
  };

  // ── Seed data handler ──────────────────────────────────────────────────────

  const handleSeedData = () => {
    toast.success('Demo data seeded successfully! All 45 accounts are ready.');
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
  // RENDER — matches screenshot exactly
  // ─────────────────────────────────────────────────────────────────────────────

  const demoRoleCount = new Set(MOCK_AUTH_USERS.map(u => u.role)).size;
  const demoCountryCount = 3;
  const demoAccountCount = MOCK_AUTH_USERS.length;

  return (
    <BackgroundLayout particleCount={20}>
      <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 md:px-8">
        <div className="w-full max-w-md">

          {/* ── Logo (bare image, no glass card) ──────────────────────────── */}
          {viewMode !== 'mfa-challenge' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="text-center mb-6 sm:mb-8"
            >
              <img src={brandtelligenceLogo} alt="Brandtelligence" className="h-10 sm:h-12 w-auto mx-auto" />
            </motion.div>
          )}

          <AnimatePresence mode="wait">

            {/* ═══ MFA CHALLENGE ═══ */}
            {viewMode === 'mfa-challenge' && mfaPendingProfile && (
              <motion.div key="mfa" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="text-center mb-6">
                  <img src={brandtelligenceLogo} alt="Brandtelligence" className="h-10 w-auto mx-auto" />
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
              >
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl">

                  <h2 className="text-white font-bold text-2xl sm:text-3xl mb-1">Sign in</h2>
                  <p className="text-white/60 text-sm mb-6">Access your workspace</p>

                  {/* Password / Magic Link tab toggle */}
                  <div className="flex bg-white/10 rounded-xl p-1 mb-6">
                    <button type="button" onClick={() => setAuthTab('password')}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${authTab === 'password' ? 'bg-[#0BA4AA] text-white shadow-lg shadow-[#0BA4AA]/30' : 'text-white/50 hover:text-white/70'}`}
                    >Password</button>
                    <button type="button" onClick={() => setAuthTab('magic')}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${authTab === 'magic' ? 'bg-[#0BA4AA] text-white shadow-lg shadow-[#0BA4AA]/30' : 'text-white/50 hover:text-white/70'}`}
                    >Magic Link</button>
                  </div>

                  {/* Password tab */}
                  {authTab === 'password' && (
                    <form onSubmit={handleLogin} className="space-y-5">
                      <div>
                        <label className="block text-white/90 mb-2 text-sm font-medium">Email address</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                          <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className={inputWithIconCls} placeholder="you@brandtelligence.com" required autoComplete="email" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-white/90 mb-2 text-sm font-medium">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                          <input type={showPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className={inputWithIconToggleCls} placeholder="••••••••" required autoComplete="current-password" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors p-1">
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {loginError && !linkExpired && (
                        <div className="flex items-start gap-2 bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 text-red-300 text-sm">
                          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" /><span>{loginError}</span>
                        </div>
                      )}
                      {loginError && linkExpired && (
                        <div className="bg-amber-500/15 border border-amber-400/40 rounded-xl px-4 py-3 text-sm space-y-1">
                          <div className="flex items-center gap-2 text-amber-300 font-medium"><Clock className="w-4 h-4 shrink-0" /> Invite link expired</div>
                          <p className="text-amber-200/80 leading-snug pl-6">{loginError}</p>
                        </div>
                      )}
                      {loginCaptchaError && (
                        <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 text-red-300 text-sm">
                          <ShieldCheck className="w-4 h-4 shrink-0" />Security verification failed.
                        </div>
                      )}

                      <HCaptcha ref={loginCaptchaRef} sitekey={HCAPTCHA_SITE_KEY} size="invisible" onVerify={onLoginCaptchaVerify} onExpire={onLoginCaptchaExpire} onError={onLoginCaptchaError} theme="dark" />

                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loginLoading}
                        className="w-full text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-[#0BA4AA]/30 min-h-[3rem] flex items-center justify-center gap-2 disabled:opacity-60 hover:shadow-[#0BA4AA]/50"
                        style={{ background: '#0BA4AA' }}
                      >
                        {loginLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign in'}
                      </motion.button>
                    </form>
                  )}

                  {/* Magic Link tab */}
                  {authTab === 'magic' && (
                    <form onSubmit={handleMagicLink} className="space-y-5">
                      <div>
                        <label className="block text-white/90 mb-2 text-sm font-medium">Email address</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                          <input type="email" value={magicLinkEmail} onChange={e => setMagicLinkEmail(e.target.value)} className={inputWithIconCls} placeholder="you@brandtelligence.com" required autoComplete="email" />
                        </div>
                      </div>
                      {magicLinkSent ? (
                        <div className="bg-teal-500/15 border border-teal-400/40 rounded-xl px-4 py-3 text-teal-300 text-sm text-center">Check your inbox for the magic link!</div>
                      ) : (
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={magicLinkLoading}
                          className="w-full text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-[#0BA4AA]/30 min-h-[3rem] flex items-center justify-center gap-2 disabled:opacity-60 hover:shadow-[#0BA4AA]/50"
                          style={{ background: '#0BA4AA' }}
                        >
                          {magicLinkLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send Magic Link'}
                        </motion.button>
                      )}
                    </form>
                  )}
                </div>

                {/* ── Demo Accounts (below card) ──────────────────────────────── */}
                {SHOW_DEMO_CREDENTIALS && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white/70 text-xs font-bold uppercase tracking-wider">Demo Accounts</span>
                        <span className="text-[0.6rem] font-semibold px-2 py-0.5 rounded-full border border-white/20 text-white/50">{demoAccountCount} roles</span>
                        <button type="button" onClick={() => setShowDemoHint(v => !v)} className="flex items-center gap-1 text-white/40 hover:text-white/60 text-xs transition-colors">
                          <ChevronDown className={`w-3 h-3 transition-transform ${showDemoHint ? 'rotate-180' : ''}`} />
                          {showDemoHint ? 'hide' : 'show'}
                        </button>
                      </div>
                      <button type="button" onClick={handleSeedData} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 text-white/60 hover:text-white/80 hover:border-white/30 text-xs font-medium transition-all">
                        <Zap className="w-3 h-3" style={{ color: '#F47A20' }} /> Seed Data
                      </button>
                    </div>
                    <p className="text-white/40 text-xs mb-2">{demoAccountCount} demo accounts across {demoRoleCount} roles · {demoCountryCount} countries · click to expand</p>
                    <AnimatePresence>
                      {showDemoHint && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5 overflow-hidden">
                          {DEMO_ACCOUNT_DISPLAY.map(a => (
                            <button key={a.email} type="button" onClick={() => { fillDemo(a.email, a.password); setAuthTab('password'); }}
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
                  </motion.div>
                )}

                {/* ── MFA notice ──────────────────────────────────────────────── */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="mt-5 flex items-start gap-3 rounded-xl border px-4 py-3"
                  style={{ background: 'rgba(244,122,32,0.08)', borderColor: 'rgba(244,122,32,0.35)' }}
                >
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#F47A20' }} />
                  <p className="text-white/70 text-xs leading-relaxed">
                    MFA enforcement via TOTP is available. Enable it under{' '}
                    <span className="text-white/90 font-medium">Settings &rarr; Security</span> after login.
                  </p>
                </motion.div>

                {/* ── Compliance footer ────────────────────────────────────────── */}
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                  className="text-center text-white/30 text-xs mt-6"
                >
                  Internal use only · POPIA / PDPA / DPA compliant · v2.0.0
                </motion.p>
              </motion.div>
            )}

            {/* ═══ FORGOT PASSWORD FORM ═══ */}
            {viewMode === 'forgot' && !resetEmailSent && (
              <motion.div key="forgot" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.6 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl"
              >
                <h2 className="text-white font-bold text-2xl mb-1">Reset Password</h2>
                <p className="text-white/60 text-sm mb-6">Enter your email to receive reset instructions</p>
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <label className="block text-white/90 mb-2 text-sm font-medium">Email address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className={inputWithIconCls} placeholder="you@brandtelligence.com" required />
                    </div>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit"
                    className="w-full text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-[#0BA4AA]/30 min-h-[3rem] flex items-center justify-center"
                    style={{ background: '#0BA4AA' }}
                  >
                    {resetLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Instructions'}
                  </motion.button>
                  <div className="text-center pt-4 border-t border-white/20">
                    <p className="text-white/60 text-sm">Remember your password?{' '}
                      <button type="button" onClick={() => setViewMode('login')} className="text-white font-medium hover:underline">Sign In</button>
                    </p>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ═══ FORGOT PASSWORD SUCCESS ═══ */}
            {viewMode === 'forgot' && resetEmailSent && (
              <motion.div key="forgot-sent" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl"
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-14 h-14 border-2 border-green-400 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(34,197,94,0.15)' }}
                ><Check className="w-7 h-7 text-green-400" /></motion.div>
                <h2 className="text-white font-bold text-2xl mb-4 text-center">Check Your Inbox</h2>
                <div className="bg-white/5 border border-white/20 rounded-xl p-4 mb-6">
                  <p className="text-white/90 text-center text-sm">Reset instructions sent to</p>
                  <p className="text-white text-center mt-2 break-all font-medium">{resetEmail}</p>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setResetEmailSent(false); setResetEmail(''); setViewMode('login'); }}
                  className="w-full text-white font-bold px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-[#0BA4AA]/30 min-h-[3rem]"
                  style={{ background: '#0BA4AA' }}
                >Back to Sign In</motion.button>
              </motion.div>
            )}

          </AnimatePresence>

          {/* ── Demo / Production Mode Toggle ──────────────────────────────── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-6 flex items-center justify-center">
            <button type="button" onClick={() => setDemoMode(!IS_DEMO_MODE)}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all text-xs"
              style={{ background: IS_DEMO_MODE ? 'rgba(62,60,112,0.5)' : 'rgba(255,255,255,0.05)', borderColor: IS_DEMO_MODE ? '#3E3C7060' : 'rgba(255,255,255,0.1)' }}
            >
              <FlaskConical className="w-3.5 h-3.5 shrink-0" style={{ color: IS_DEMO_MODE ? '#F47A20' : 'rgba(255,255,255,0.3)' }} />
              <span className="text-white/50 group-hover:text-white/70 transition-colors">{IS_DEMO_MODE ? 'Demo Mode' : 'Production Mode'}</span>
              <div className="relative w-9 h-5 rounded-full transition-colors" style={{ background: IS_DEMO_MODE ? '#0BA4AA' : 'rgba(255,255,255,0.15)' }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all" style={{ left: IS_DEMO_MODE ? '1.125rem' : '0.125rem' }} />
              </div>
              <span className="text-white/30 text-[0.6rem]">{IS_DEMO_MODE ? 'switch to production' : 'switch to demo'}</span>
            </button>
          </motion.div>

        </div>
      </div>
    </BackgroundLayout>
  );
}