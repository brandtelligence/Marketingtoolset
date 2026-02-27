/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * APPLICATION CONFIGURATION — PRODUCTION SAFETY GATE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * THIS IS A PRODUCTION APPLICATION.
 * ─────────────────────────────────
 * The default mode is PRODUCTION. Demo mode must be explicitly opted in to.
 *
 * HOW MODES WORK
 * ──────────────
 * Production mode  (DEFAULT — no env var needed):
 *   • Auth uses real Supabase signInWithPassword()
 *   • MFA enforced via Supabase TOTP (must enable in Supabase Dashboard)
 *   • Dashboard data fetched from live Supabase KV / edge function
 *   • No demo ribbon, no mock credentials shown
 *
 * Demo mode  (opt-in — set VITE_APP_ENV=demo in .env):
 *   • Auth uses MOCK_AUTH_USERS from mockSaasData.ts
 *   • MFA is simulated (any 6-digit code accepted)
 *   • Dashboard data comes from mockSaasData.ts
 *   • Demo ribbon + credential hint shown for internal testing only
 *
 * WHAT IS LIVE RIGHT NOW
 * ──────────────────────
 *   ✅ Supabase edge function (server/index.tsx) — always runs against your
 *      real Supabase project. KV saves, Auth admin calls, email — all real.
 *   ✅ Super Admin seeded — it@brandtelligence.com.my exists in Supabase Auth.
 *   ✅ MFA server routes — /mfa/policy, /mfa-recovery/*, /security/policy
 *
 * REQUIRED ONE-TIME SUPABASE DASHBOARD SETUP
 * ──────────────────────────────────────────
 *   1. Enable TOTP MFA:
 *      Supabase Dashboard → Authentication → Sign In Methods → MFA → TOTP ✅
 *   2. All tenant users need `user_metadata.role` set to:
 *      "SUPER_ADMIN" | "TENANT_ADMIN" | "EMPLOYEE"
 *      (the server /auth/signup and /tenants/invite routes handle this)
 *
 * STRICT RULES (do not violate)
 * ──────────────────────────────
 *  1. NEVER write demo/mock content directly into component .tsx files.
 *     All demo content lives exclusively in src/app/data/mockSaasData.ts.
 *
 *  2. Components that need data MUST import IS_PRODUCTION from this file
 *     and branch accordingly:
 *        const data = IS_PRODUCTION ? await fetchFromServer() : MOCK_DATA;
 *
 *  3. Do NOT modify the hardcoded UI structure (layout, navigation, component
 *     hierarchy) unless the user explicitly requests a layout change.
 *
 *  4. This file is static configuration — no business logic here.
 */

// ─── Core gate flag ───────────────────────────────────────────────────────────

/**
 * PRODUCTION is the default.
 * Demo mode must be explicitly opted in via VITE_APP_ENV=demo.
 * Setting no env var = production mode.
 */
export const IS_DEMO_MODE: boolean =
  (import.meta as any).env?.VITE_APP_ENV === 'demo' ||
  // ── FIGMA MAKE PREVIEW ────────────────────────────────────────────────────
  // Hardcoded true so every dashboard is previewable without real Supabase
  // credentials. Flip this back to `false` (or remove the `|| true`) before
  // deploying to marketingtool.brandtelligence.my.
  true;

/** Convenience inverse alias. */
export const IS_PRODUCTION: boolean = !IS_DEMO_MODE;

// ─── Feature flags (derived from gate) ────────────────────────────────────────

/**
 * Show demo credentials on the login page.
 * FALSE in production — real users must never see mock passwords.
 */
export const SHOW_DEMO_CREDENTIALS: boolean = IS_DEMO_MODE;

/**
 * Show the "Demo Mode" ribbon in the SaaS top nav bar.
 * FALSE in production.
 */
export const SHOW_DEMO_RIBBON: boolean = IS_DEMO_MODE;

// ─── MFA configuration ────────────────────────────────────────────────────────

/**
 * Roles that ALWAYS require MFA regardless of the Tenant Admin policy toggle.
 * SUPER_ADMIN cannot opt out — they have access to all tenant data.
 */
export const MFA_ALWAYS_REQUIRED_ROLES: string[] = ['SUPER_ADMIN'];

/** Number of one-time recovery codes generated on TOTP enrollment. */
export const MFA_RECOVERY_CODE_COUNT = 8;

/**
 * Issuer label shown in the authenticator app next to the account entry.
 * Format: "Brandtelligence (user@example.com)"
 */
export const TOTP_ISSUER = 'Brandtelligence';

// ─── Session storage keys (MFA pending state) ─────────────────────────────────
// Passed between LoginPage → MFAEnrollPage. Cleared immediately after use.

export const SS_MFA_PENDING_USER    = 'btl_mfa_pending_user';    // JSON UserProfile
export const SS_MFA_FACTOR_ID       = 'btl_mfa_factor_id';       // Supabase factorId
export const SS_MFA_ENROLL_REQUIRED = 'btl_mfa_enroll_required'; // 'true' | absent
export const SS_MFA_TARGET_ROUTE    = 'btl_mfa_target_route';    // post-auth route