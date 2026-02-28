/**
 * MFAChallengeModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Rendered inside the LoginPage after a successful password auth when TOTP MFA
 * is required for the user's role.
 *
 * Production mode:
 *   Uses supabase.auth.mfa.challenge() + supabase.auth.mfa.verify()
 *   to upgrade the session to AAL2.
 *
 * Demo mode:
 *   Any valid 6-digit code is accepted without a server call.
 *   A visible "Demo Mode" badge explains this to developers.
 *
 * Also supports a "Use recovery code" fallback via a server-validated
 * one-time code (stored during enrollment).
 */

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, Loader2, Smartphone, RefreshCcw,
  KeyRound, ArrowLeft, CheckCircle2, FlaskConical,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../utils/supabaseClient';
import { IS_DEMO_MODE } from '../../config/appConfig';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHeaders';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface MFAChallengeModalProps {
  /** Supabase TOTP factor ID — null when in demo mode */
  factorId:    string | null;
  /** Display email for greeting */
  userEmail:   string;
  /** Called when challenge passes — caller commits the login */
  onSuccess:   () => void;
  /** Called when the user wants to cancel and go back to login */
  onCancel:    () => void;
  /** Supabase user ID — used for recovery code validation */
  supabaseUid?: string;
}

// ─── 6-Digit OTP input ───────────────────────────────────────────────────────

function OtpInput({
  value, onChange, disabled,
}: {
  value: string[]; onChange: (v: string[]) => void; disabled: boolean;
}) {
  const refs = Array.from({ length: 6 }, () => useRef<HTMLInputElement>(null));

  const focus = (i: number) => refs[i]?.current?.focus();

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (value[i]) {
        const next = [...value];
        next[i] = '';
        onChange(next);
      } else if (i > 0) {
        focus(i - 1);
        const next = [...value];
        next[i - 1] = '';
        onChange(next);
      }
    }
    if (e.key === 'ArrowLeft'  && i > 0) focus(i - 1);
    if (e.key === 'ArrowRight' && i < 5) focus(i + 1);
  };

  const handleInput = (i: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    const next = [...value];
    next[i] = digit;
    onChange(next);
    if (i < 5) focus(i + 1);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    if (!digits.length) return;
    const next = [...value];
    digits.forEach((d, idx) => { if (idx < 6) next[idx] = d; });
    onChange(next);
    focus(Math.min(digits.length, 5));
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {refs.map((ref, i) => (
        <input
          key={i}
          ref={ref}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          disabled={disabled}
          onChange={e => handleInput(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          onFocus={e => e.target.select()}
          className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border-2
            bg-white/10 text-white placeholder-white/30 transition-all focus:outline-none
            ${value[i]
              ? 'border-purple-400 bg-purple-500/20'
              : 'border-white/20 focus:border-white/50'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MFAChallengeModal({
  factorId, userEmail, onSuccess, onCancel, supabaseUid,
}: MFAChallengeModalProps) {
  const [digits,      setDigits]      = useState<string[]>(Array(6).fill(''));
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [mode,        setMode]        = useState<'totp' | 'recovery'>('totp');
  const [recoveryVal, setRecoveryVal] = useState('');
  const [success,     setSuccess]     = useState(false);

  const code = digits.join('');
  const isComplete = code.length === 6;

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (isComplete && mode === 'totp' && !loading && !success) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      if (IS_DEMO_MODE) {
        // ── Demo mode: accept any 6-digit code ─────────────────────────────
        if (!/^\d{6}$/.test(code)) {
          setError('Please enter a valid 6-digit code.');
          return;
        }
        await new Promise(r => setTimeout(r, 800)); // simulate network delay
        setSuccess(true);
        await new Promise(r => setTimeout(r, 600));
        onSuccess();
        return;
      }

      // ── Production mode: real Supabase MFA verify ─────────────────────────
      if (!factorId) {
        setError('MFA factor not found. Please contact support.');
        return;
      }
      const { data, error: mfaErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (mfaErr) {
        setError(
          mfaErr.message.includes('Invalid') || mfaErr.message.includes('expired')
            ? 'Incorrect code — check your authenticator app and try again.'
            : `Verification failed: ${mfaErr.message}`,
        );
        setDigits(Array(6).fill(''));
        return;
      }
      setSuccess(true);
      await new Promise(r => setTimeout(r, 600));
      onSuccess();
    } catch (err: any) {
      setError(`Unexpected error: ${err.message ?? 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async () => {
    if (!recoveryVal.trim()) { setError('Please enter your recovery code.'); return; }
    setError('');
    setLoading(true);
    try {
      if (IS_DEMO_MODE) {
        // Demo: accept any non-empty recovery code
        await new Promise(r => setTimeout(r, 800));
        setSuccess(true);
        await new Promise(r => setTimeout(r, 600));
        onSuccess();
        return;
      }
      // Production: validate via server (server checks KV and marks code used)
      const res  = await fetch(`${SERVER}/mfa-recovery/verify`, {
        method: 'POST', headers: await getAuthHeaders(true),
        body: JSON.stringify({ userId: supabaseUid, code: recoveryVal.trim().toUpperCase() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Invalid or already-used recovery code.');
        return;
      }
      toast.success('Recovery code accepted — please enrol a new authenticator app.');
      setSuccess(true);
      await new Promise(r => setTimeout(r, 600));
      onSuccess();
    } catch (err: any) {
      setError(`Recovery failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
          {success
            ? <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            : <ShieldCheck className="w-8 h-8 text-purple-300" />}
        </div>
        <h2 className="text-white text-xl sm:text-2xl font-bold mb-1">
          {success ? 'Verified!' : 'Two-Factor Authentication'}
        </h2>
        <p className="text-white/60 text-sm">
          {success
            ? 'Identity confirmed — signing you in…'
            : mode === 'totp'
              ? `Enter the 6-digit code from your authenticator app`
              : 'Enter one of your recovery codes'}
        </p>
        <p className="text-white/40 text-xs mt-1 truncate">{userEmail}</p>
      </div>

      {/* ── Demo Mode Badge ─────────────────────────────────────────────────── */}
      {IS_DEMO_MODE && (
        <div className="flex items-center justify-center gap-2 mb-5 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30">
          <FlaskConical className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <p className="text-amber-300 text-xs font-semibold">
            Demo Mode — any 6-digit code is accepted
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!success && (
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === 'totp' ? -10 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {mode === 'totp' ? (
              <>
                {/* Authenticator app hint */}
                <div className="flex items-center gap-2 justify-center text-white/50 text-xs">
                  <Smartphone className="w-3.5 h-3.5" />
                  Open your authenticator app and enter the current code
                </div>

                {/* OTP inputs */}
                <OtpInput value={digits} onChange={setDigits} disabled={loading} />

                {/* Error */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="text-red-300 text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Manual verify button (auto-submits on digit 6 but keep as fallback) */}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleVerify}
                  disabled={!isComplete || loading}
                  className="w-full flex items-center justify-center gap-2 bg-purple-500/30 border-2 border-purple-400/50 text-white px-6 py-3 rounded-xl hover:bg-purple-500/40 transition-all shadow-lg min-h-[3rem] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                    : <><ShieldCheck className="w-4 h-4" /> Verify Code</>}
                </motion.button>
              </>
            ) : (
              <>
                {/* Recovery code input */}
                <div>
                  <label className="block text-white/80 text-sm mb-2">Recovery Code</label>
                  <input
                    type="text"
                    value={recoveryVal}
                    onChange={e => setRecoveryVal(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/50 font-mono tracking-wider text-center text-lg"
                    onKeyDown={e => { if (e.key === 'Enter') handleRecovery(); }}
                  />
                </div>
                <p className="text-white/40 text-xs text-center">
                  Recovery codes are shown once during MFA setup. Each code can only be used once.
                </p>
                {error && (
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-red-300 text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleRecovery}
                  disabled={!recoveryVal.trim() || loading}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500/20 border-2 border-amber-400/40 text-white px-6 py-3 rounded-xl hover:bg-amber-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed min-h-[3rem]"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
                    : <><KeyRound className="w-4 h-4" /> Use Recovery Code</>}
                </motion.button>
              </>
            )}

            {/* Footer links */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1 text-white/40 hover:text-white/70 text-xs transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Back to login
              </button>

              <button
                type="button"
                onClick={() => { setMode(m => m === 'totp' ? 'recovery' : 'totp'); setError(''); }}
                className="flex items-center gap-1 text-white/40 hover:text-white/70 text-xs transition-colors"
              >
                {mode === 'totp'
                  ? <><KeyRound className="w-3 h-3" /> Use recovery code</>
                  : <><RefreshCcw className="w-3 h-3" /> Use authenticator app</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
