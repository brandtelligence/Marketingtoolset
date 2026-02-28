/**
 * AuthCallbackPage
 * ─────────────────────────────────────────────────────────────────────────────
 * Landing page for every Supabase auth email link:
 *   • Invite links   (new tenant onboarding)  → "Set Your Password" form
 *   • Recovery links (password reset)         → "Reset Your Password" form
 *   • Expired/invalid tokens                  → clear error + CTA
 *
 * HOW IT WORKS — TWO SUPPORTED FLOWS
 * ───────────────────────────────────
 * 1. PKCE flow (default for new Supabase projects, recommended):
 *    Supabase redirects to /auth/callback?code=xxx (query param).
 *    We call supabase.auth.exchangeCodeForSession(code) explicitly.
 *    This works for admin-generated recovery/invite links WITHOUT needing
 *    a client-side code_verifier (Supabase accepts the one-time code as-is).
 *
 * 2. Implicit flow (legacy):
 *    Supabase redirects to /auth/callback#access_token=xxx&type=recovery
 *    detectSessionInUrl:true on the Supabase client auto-processes the hash.
 *    We pick up the session via getSession() + onAuthStateChange.
 *
 * Error hashes (otp_expired, access_denied) are NOT consumed by the Supabase
 * client, so we read them directly from window.location.hash.
 *
 * IMPORTANT: onAuthStateChange is set up FIRST so USER_UPDATED (fired after
 * supabase.auth.updateUser({ password })) is always caught regardless of path.
 *
 * PRODUCTION ONLY — demo mode is not applicable here.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router';
import { motion } from 'motion/react';
import { Eye, EyeOff, Lock, CheckCircle2, Clock, AlertTriangle, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import brandtelligenceLogo from 'figma:asset/250842c5232a8611aa522e6a3530258e858657d5.png';
import { BackgroundLayout } from '../components/BackgroundLayout';
import { supabase } from '../utils/supabaseClient';
import { buildProfileFromSupabaseUser, useAuth } from '../components/AuthContext';
import { toast } from 'sonner';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../utils/authHeaders';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// ─── Route helper (matches LoginPage) ────────────────────────────────────────
function roleToRoute(role?: string) {
  if (role === 'SUPER_ADMIN')  return '/super/requests';
  if (role === 'TENANT_ADMIN') return '/tenant/overview';
  return '/app/projects';
}

// ─── Phase types ─────────────────────────────────────────────────────────────
type Phase =
  | 'loading'       // waiting for Supabase auth event / code exchange
  | 'set-password'  // invite/recovery: user must set/reset their password
  | 'success'       // password set, about to redirect
  | 'expired'       // otp_expired / access_denied / already-used
  | 'error';        // other server-side error

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [phase,           setPhase]           = useState<Phase>('loading');
  const [flowLabel,       setFlowLabel]       = useState<'invite' | 'recovery'>('invite');
  const [authError,       setAuthError]       = useState('');

  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [showConfirmPw,   setShowConfirmPw]   = useState(false);
  const [pwLoading,       setPwLoading]       = useState(false);
  const [pwError,         setPwError]         = useState('');

  // Prevent double-navigation from concurrent auth events
  const navigated = useRef(false);

  // ── Password strength ──────────────────────────────────────────────────────
  const pwStrength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)                 s++;
    if (/[A-Z]/.test(password))               s++;
    if (/[0-9]/.test(password))               s++;
    if (/[^A-Za-z0-9]/.test(password))        s++;
    return s; // 0–4
  })();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][pwStrength];
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-400'][pwStrength];

  // ── Mount: handle both PKCE and implicit auth flows ────────────────────────
  useEffect(() => {
    let resolved = false;

    // Shared resolver — called by whichever path detects a valid session first
    const resolve = (label: 'invite' | 'recovery') => {
      if (resolved || navigated.current) return;
      resolved = true;
      setFlowLabel(label);
      setPhase('set-password');
    };

    // ── STEP 1: Subscribe to auth state changes (MUST be first) ──────────
    // This subscription must be set up before any async work so USER_UPDATED
    // (fired after supabase.auth.updateUser({ password })) is never missed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthCallback] event:', event, '| user:', session?.user?.id ?? 'none');

      if (navigated.current) return;

      if (event === 'PASSWORD_RECOVERY') {
        // Fired by implicit-flow recovery links — always label as recovery
        resolved = true;
        setFlowLabel('recovery');
        setPhase('set-password');

      } else if (
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user
      ) {
        // INITIAL_SESSION: fires immediately on subscribe with current session.
        // SIGNED_IN: fires if Supabase processed the token after we subscribed.
        resolve('invite');

      } else if (event === 'USER_UPDATED' && session?.user) {
        // Fired after supabase.auth.updateUser({ password }) succeeds.
        if (navigated.current) return;
        navigated.current = true;
        const profile = buildProfileFromSupabaseUser(session.user);
        login(profile);
        setPhase('success');
        setTimeout(() => navigate(roleToRoute(profile.role), { replace: true }), 1000);
      }
    });

    // ── STEP 2: PKCE flow — ?code= in query params ────────────────────────
    // When the Supabase project uses PKCE (the default for new projects),
    // the recovery/invite link redirects to /auth/callback?code=xxx.
    // The implicit-mode detectSessionInUrl does NOT handle this — we must
    // call exchangeCodeForSession() explicitly.
    const searchParams = new URLSearchParams(window.location.search);
    const pkceCode = searchParams.get('code');

    if (pkceCode) {
      // Strip code from address bar immediately (prevents reuse on page refresh)
      window.history.replaceState(null, '', window.location.pathname);

      console.log('[AuthCallback] PKCE code detected — attempting exchange…');

      supabase.auth.exchangeCodeForSession(pkceCode)
        .then(({ data, error }) => {
          if (error) {
            console.error('[AuthCallback] PKCE exchange error:', error.message);
            const msg = (error.message ?? '').toLowerCase();
            // Classify as expired/used or generic error
            if (
              msg.includes('expired') ||
              msg.includes('invalid') ||
              msg.includes('already') ||
              msg.includes('used') ||
              msg.includes('not found') ||
              error.status === 400 ||
              error.status === 401 ||
              error.status === 422
            ) {
              setPhase('expired');
            } else {
              setAuthError(error.message);
              setPhase('error');
            }
            return;
          }

          if (data.session?.user) {
            // exchangeCodeForSession will also fire SIGNED_IN via onAuthStateChange.
            // Call resolve() here too as a safety net in case the event fires first.
            // Recovery links are the primary source of ?code= redirects.
            resolve('recovery');
          }
        })
        .catch((err: any) => {
          console.error('[AuthCallback] PKCE exchange exception:', err);
          setAuthError(err.message ?? 'Failed to verify the link. Please try again.');
          setPhase('error');
        });

      // Timeout — shorter for PKCE since the exchange is a direct API call
      const timer = setTimeout(() => {
        setPhase(prev => {
          if (prev !== 'loading') return prev;
          setAuthError(
            'The link verification timed out. The link may have expired or already been used. ' +
            'Please request a new password reset from the sign-in page.'
          );
          return 'error';
        });
      }, 15_000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timer);
      };
    }

    // ── STEP 3: Implicit flow — check URL hash for errors ─────────────────
    // Error hashes (otp_expired, etc.) are NOT consumed by the Supabase client.
    const raw = window.location.hash;
    if (raw && raw !== '#') {
      const params    = new URLSearchParams(raw.replace(/^#/, ''));
      const error     = params.get('error');
      const errorCode = params.get('error_code');
      const errorDesc = params.get('error_description');
      window.history.replaceState(null, '', window.location.pathname);

      if (error) {
        if (errorCode === 'otp_expired' || error === 'access_denied') {
          setPhase('expired');
        } else {
          setPhase('error');
          setAuthError(errorDesc?.replace(/\+/g, ' ') ?? error);
        }
        // Error hashes mean: no valid session, nothing more to do
        const timer = setTimeout(() => {}, 0); // dummy so cleanup is consistent
        return () => {
          subscription.unsubscribe();
          clearTimeout(timer);
        };
      }
    }

    // ── STEP 4: Implicit flow — eager getSession() ────────────────────────
    // By the time useEffect runs, detectSessionInUrl:true has already processed
    // the implicit-flow hash token and saved the session to localStorage.
    // getSession() retrieves it. PASSWORD_RECOVERY will still fire via the
    // onAuthStateChange subscription and override the label to 'recovery'.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        resolve('invite'); // label may be overridden to 'recovery' by PASSWORD_RECOVERY event
      }
    });

    // ── STEP 5: Timeout fallback ──────────────────────────────────────────
    const timer = setTimeout(() => {
      setPhase(prev => {
        if (prev !== 'loading') return prev;
        setAuthError(
          'Verification timed out. The link may have expired or already been used. ' +
          'For password resets, request a new link from the sign-in page.'
        );
        return 'error';
      });
    }, 12_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Set / reset password submission ───────────────────────────────────────
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');

    if (password.length < 8) {
      setPwError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }

    setPwLoading(true);
    try {
      // ── Get the current session (established by the PKCE exchange) ────────
      // We need session.user.id — we do NOT use the access_token because
      // Supabase invite-flow PKCE tokens are rejected by the REST /auth/v1/user
      // endpoint with "Invalid JWT" (they are only trusted by the client SDK).
      // The server instead verifies identity via a time-bounded check on the
      // user's invited_at / recovery_sent_at fields (set server-side).
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setPwError('Your session has expired. Please click the link in your email again.');
        return;
      }

      // ── Use server-side admin API to bypass AAL2 requirement ──────────────
      const res = await fetch(`${SERVER}/auth/activate-account`, {
        method: 'POST',
        headers: {
          ...(await getAuthHeaders(true)),
        },
        body: JSON.stringify({ userId, password }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? json.message ?? 'Failed to update password. Please try again.');

      toast.success('Password updated! Redirecting to your dashboard…');
      setPhase('success');

      // Session is still valid — build profile and navigate
      if (session.user && !navigated.current) {
        navigated.current = true;
        const profile = buildProfileFromSupabaseUser(session.user);
        login(profile);
        setTimeout(() => navigate(roleToRoute(profile.role), { replace: true }), 1000);
      }
    } catch (err: any) {
      setPwError(err.message ?? 'Failed to update password. Please try again.');
    } finally {
      setPwLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const inputCls =
    'w-full bg-white/10 border border-white/20 rounded-xl pl-11 pr-12 py-3 text-white ' +
    'placeholder-white/50 focus:outline-none focus:border-white/40 transition-all min-h-[2.75rem]';

  return (
    <BackgroundLayout particleCount={20}>
      <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <img src={brandtelligenceLogo} alt="Brandtelligence" className="h-10 w-auto mx-auto mb-3" />
            <p className="text-white/50 text-xs tracking-widest uppercase">Marketing Intelligence Platform</p>
          </motion.div>

          {/* ── LOADING ─────────────────────────────────────────────────── */}
          {phase === 'loading' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/15 p-8 text-center"
              style={{ background: 'rgba(20,15,55,0.75)', backdropFilter: 'blur(20px)' }}
            >
              <Loader2 className="w-10 h-10 text-[#0BA4AA] animate-spin mx-auto mb-4" />
              <h2 className="text-white text-lg font-semibold mb-2">Verifying your link…</h2>
              <p className="text-white/50 text-sm">Please wait while we confirm your identity.</p>
            </motion.div>
          )}

          {/* ── SET / RESET PASSWORD ────────────────────────────────────── */}
          {phase === 'set-password' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/15 p-6 sm:p-8"
              style={{ background: 'rgba(20,15,55,0.75)', backdropFilter: 'blur(20px)' }}
            >
              {/* Header */}
              <div className="text-center mb-6">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'rgba(11,164,170,0.2)', border: '1px solid rgba(11,164,170,0.4)' }}
                >
                  <Lock className="w-5 h-5" style={{ color: '#0BA4AA' }} />
                </div>
                <h2 className="text-white text-xl font-bold">
                  {flowLabel === 'recovery' ? 'Reset Your Password' : 'Set Your Password'}
                </h2>
                <p className="text-white/50 text-sm mt-1">
                  {flowLabel === 'recovery'
                    ? 'Enter a new password to regain access to your account.'
                    : 'Choose a password to activate your Brandtelligence account.'}
                </p>
              </div>

              <form onSubmit={handleSetPassword} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="text-white/70 text-sm mb-1.5 block">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(n => (
                          <div
                            key={n}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${pwStrength >= n ? strengthColor : 'bg-white/10'}`}
                          />
                        ))}
                      </div>
                      {strengthLabel && (
                        <p className={`text-xs ${['', 'text-red-400', 'text-amber-400', 'text-lime-400', 'text-emerald-400'][pwStrength]}`}>
                          {strengthLabel} password
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="text-white/70 text-sm mb-1.5 block">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    >
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>

                {/* Requirements */}
                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 space-y-1">
                  {[
                    { ok: password.length >= 8,          label: 'At least 8 characters'   },
                    { ok: /[A-Z]/.test(password),         label: 'One uppercase letter'     },
                    { ok: /[0-9]/.test(password),         label: 'One number'               },
                  ].map(({ ok, label }) => (
                    <div key={label} className={`flex items-center gap-2 text-xs transition-colors ${ok ? 'text-emerald-400' : 'text-white/40'}`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${ok ? 'opacity-100' : 'opacity-30'}`} />
                      {label}
                    </div>
                  ))}
                </div>

                {/* Error */}
                {pwError && (
                  <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 text-red-300 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {pwError}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all min-h-[2.75rem] flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #0BA4AA, #0d8f94)' }}
                >
                  {pwLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Updating password…</>
                  ) : (
                    flowLabel === 'recovery' ? 'Reset Password' : 'Activate Account'
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* ── SUCCESS ─────────────────────────────────────────────────── */}
          {phase === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-white/15 p-8 text-center"
              style={{ background: 'rgba(20,15,55,0.75)', backdropFilter: 'blur(20px)' }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)' }}
              >
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-white text-xl font-bold mb-2">Password updated!</h2>
              <p className="text-white/50 text-sm">Redirecting you to your dashboard…</p>
              <Loader2 className="w-5 h-5 text-[#0BA4AA] animate-spin mx-auto mt-4" />
            </motion.div>
          )}

          {/* ── EXPIRED LINK ────────────────────────────────────────────── */}
          {phase === 'expired' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-amber-500/30 p-6 sm:p-8"
              style={{ background: 'rgba(20,15,55,0.75)', backdropFilter: 'blur(20px)' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)' }}
              >
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-white text-xl font-bold text-center mb-3">
                This link has expired
              </h2>
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-200/80 leading-relaxed text-center mb-6">
                Password reset and invite links are <strong>single-use</strong> and expire after{' '}
                <strong>1 hour</strong>. This link has already been used or has expired.
              </div>
              <div className="space-y-3">
                {/* Primary: request a new reset */}
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #0BA4AA, #0d8f94)' }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Request a New Password Reset
                </Link>

                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white/70 leading-relaxed">
                  <strong className="text-white">Already set a password?</strong>{' '}
                  <Link to="/login" className="text-[#0BA4AA] underline hover:text-[#0d8f94] transition-colors">
                    Sign in here
                  </Link>
                  {' '}using your email and password.
                </div>

                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white/70 leading-relaxed">
                  <strong className="text-white">New account invite?</strong>{' '}
                  Contact your Brandtelligence administrator and ask them to click{' '}
                  <span className="text-[#0BA4AA] font-medium">Resend Invite</span>{' '}
                  on the Tenants page.
                </div>
              </div>
              <Link
                to="/login"
                className="mt-5 flex items-center justify-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </motion.div>
          )}

          {/* ── GENERIC ERROR ────────────────────────────────────────────── */}
          {phase === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-red-500/30 p-6 sm:p-8"
              style={{ background: 'rgba(20,15,55,0.75)', backdropFilter: 'blur(20px)' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}
              >
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-white text-xl font-bold text-center mb-3">
                Verification Failed
              </h2>
              {authError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 mb-4 text-center leading-relaxed">
                  {authError}
                </div>
              )}
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #0BA4AA, #0d8f94)' }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Request a New Password Reset
                </Link>
                <p className="text-white/40 text-xs text-center">
                  If this keeps happening, contact{' '}
                  <a href="mailto:it@brandtelligence.com.my" className="text-[#0BA4AA] underline">
                    it@brandtelligence.com.my
                  </a>
                </p>
              </div>
              <Link
                to="/login"
                className="mt-5 flex items-center justify-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </motion.div>
          )}

        </div>
      </div>
    </BackgroundLayout>
  );
}