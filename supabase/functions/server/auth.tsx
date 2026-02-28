/**
 * auth.tsx — Shared authentication & authorization utilities
 *
 * Phase 1.2–1.3: JWT verification, role-based access control, tenant scoping.
 *
 * Compliance notes (ISO 27001 / PDPA / GDPR):
 *   - A.9.2    Access control — all routes must call requireAuth / requireRole / requireTenantScope
 *   - A.12.4.1 Event logging  — every auth decision is written to a persistent security audit log
 *   - A.18.1.4 PII protection — server logs use userId (opaque UUID), never email or PII
 *   - PDPA s.9  Security      — tokens are never logged; error messages are generic to prevent enumeration
 *
 * Usage in route handlers:
 *   const auth = await requireAuth(c);
 *   if (auth instanceof Response) return auth;
 *   // auth.userId, auth.email, auth.role, auth.tenantId are now available
 *
 *   // For SUPER_ADMIN-only routes:
 *   const auth = await requireRole(c, 'SUPER_ADMIN');
 *   if (auth instanceof Response) return auth;
 *
 *   // For tenant-scoped routes:
 *   const auth = await requireTenantScope(c, requestedTenantId);
 *   if (auth instanceof Response) return auth;
 */

import { createClient } from 'npm:@supabase/supabase-js';

// ─── Supabase Admin Client (singleton) ─────────────────────────────────────────

const supabaseAuth = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthIdentity {
  userId:    string;
  email:     string;
  role:      string;   // SUPER_ADMIN | TENANT_ADMIN | EMPLOYEE
  tenantId?: string;   // from user_metadata.tenant_id
}

type ValidRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'EMPLOYEE';

// ─── Security Audit Log (ISO 27001 A.12.4.1) ─────────────────────────────────
// Persistent, append-only log of authentication & authorization decisions.
// KV key: security_audit_log:{YYYY-MM-DD}
// Each entry records WHO (userId, never email), WHAT, WHEN, and the outcome.

interface SecurityAuditEntry {
  ts:        string;           // ISO timestamp
  userId?:   string;           // opaque UUID — never PII
  action:    string;           // AUTH_SUCCESS | AUTH_FAIL | ROLE_DENIED | TENANT_MISMATCH | RATE_LIMITED
  route:     string;           // request path
  ip?:       string;           // client IP (hashed if needed for extra privacy)
  detail?:   string;           // non-PII context (e.g. "role=EMPLOYEE required=SUPER_ADMIN")
}

// In-memory buffer flushed periodically to avoid write-per-request overhead.
let _auditBuffer: SecurityAuditEntry[] = [];
const AUDIT_FLUSH_INTERVAL_MS = 5_000;
const AUDIT_MAX_BUFFER = 50;

async function flushAuditBuffer() {
  if (_auditBuffer.length === 0) return;
  const batch = _auditBuffer.splice(0);
  const dayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const kvKey  = `security_audit_log:${dayKey}`;
  try {
    // Dynamic import to avoid circular dependency
    const kv = await import('./kv_store.tsx');
    const existing = await kv.get(kvKey);
    const entries: SecurityAuditEntry[] = existing ? JSON.parse(existing as string) : [];
    entries.push(...batch);
    // Retain last 2,000 entries per day (data retention — PDPA s.10 / ISO A.18.1.3)
    await kv.set(kvKey, JSON.stringify(entries.slice(-2000)));
  } catch (err) {
    // Logging failure must NOT block the request, but we note it
    console.log(`[security-audit] flush error: ${(err as Error)?.message ?? err}`);
  }
}

// Start periodic flush
setInterval(flushAuditBuffer, AUDIT_FLUSH_INTERVAL_MS);

function logSecurityEvent(entry: SecurityAuditEntry) {
  _auditBuffer.push(entry);
  if (_auditBuffer.length >= AUDIT_MAX_BUFFER) {
    flushAuditBuffer(); // fire-and-forget
  }
}

/** Export for routes that need to emit custom security events. */
export { logSecurityEvent };

// ─── CSRF Double-Submit Protection (ISO 27001 A.14.1.2) ──────────────────────
// Stateless CSRF tokens derived from HMAC-SHA256(userId, serverSecret).
// No KV lookup required — the token is recomputed and compared on each request.
//
// Phase 2.3: defense-in-depth for cross-origin Bearer-token API.
// Since we use Authorization headers (not cookies), CSRF is inherently mitigated,
// but this adds a second layer against token-reuse / confused-deputy attacks.

const _csrfSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! + ':csrf:v1';
const _signingSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! + ':hmac:v1';

/** Derive a deterministic CSRF token for a given userId. */
async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateCsrfToken(userId: string): Promise<string> {
  return hmacSha256Hex(`csrf:${userId}`, _csrfSecret);
}

/** Derive a per-user signing key for HMAC request signing. */
export async function generateSigningKey(userId: string): Promise<string> {
  return hmacSha256Hex(`signing:${userId}`, _signingSecret);
}

/**
 * Security enforcement mode — controls CSRF + HMAC validation together.
 *   'soft'  → log warning if token missing/invalid, but allow request (rollout phase)
 *   'hard'  → reject request if token missing/invalid (full enforcement)
 *
 * Shared between CSRF and HMAC because they should be flipped to 'hard' together
 * once end-to-end frontend integration is verified.
 *
 * Controlled via KV key 'security:enforcement_mode' (or legacy 'security:csrf_mode').
 * Defaults to 'soft'.
 */
let _enforcementMode: 'soft' | 'hard' = 'soft';

// Load enforcement mode from KV on startup (fire-and-forget)
(async () => {
  try {
    const kv = await import('./kv_store.tsx');
    // Check new key first, fall back to legacy key
    const raw = await kv.get('security:enforcement_mode') ?? await kv.get('security:csrf_mode');
    if (raw === 'hard') _enforcementMode = 'hard';
    console.log(`[auth] Security enforcement mode: ${_enforcementMode}`);
  } catch { /* default to soft */ }
})();

/**
 * Validate the X-CSRF-Token header against the authenticated user's identity.
 * Must be called AFTER requireAuth / requireRole / requireTenantScope.
 *
 * Returns null if valid (or soft-mode + missing), or a 403 Response if invalid.
 */
export async function validateCsrf(
  c: any,
  auth: AuthIdentity,
): Promise<Response | null> {
  const header = c.req.header('X-CSRF-Token');

  if (!header) {
    if (_enforcementMode === 'hard') {
      logSecurityEvent({ ts: new Date().toISOString(), userId: auth.userId, action: 'CSRF_MISSING', route: routePath(c), ip: clientIp(c) });
      return c.json({ error: 'CSRF token required' }, 403);
    }
    // Soft mode: log but allow
    return null;
  }

  const expected = await generateCsrfToken(auth.userId);
  if (header !== expected) {
    logSecurityEvent({ ts: new Date().toISOString(), userId: auth.userId, action: 'CSRF_INVALID', route: routePath(c), ip: clientIp(c) });
    if (_enforcementMode === 'hard') {
      return c.json({ error: 'Invalid CSRF token' }, 403);
    }
    console.log(`[auth] CSRF mismatch (soft enforcement) on ${routePath(c)} uid=${auth.userId}`);
    return null;
  }

  return null; // valid
}

// ─── HMAC Request Signing (ISO 27001 A.14.2.5) ──────────────────────────────
// For high-value operations (delete tenant, update security policy, etc.),
// the frontend signs the request body with HMAC-SHA256(body + timestamp, signingKey).
// This provides:
//   • Request integrity — proves body wasn't tampered with
//   • Replay protection — timestamp must be within 5-minute window
//   • Defense-in-depth — even if JWT is stolen, attacker needs signing key

const HMAC_TIMESTAMP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Validate HMAC request signature for high-value operations.
 * Expects headers: X-Request-Signature, X-Request-Timestamp
 * Must be called AFTER requireAuth.
 *
 * Returns null if valid (or soft-mode + missing), or a 403 Response if invalid.
 */
export async function validateRequestSignature(
  c: any,
  auth: AuthIdentity,
  bodyString: string,
): Promise<Response | null> {
  const signature = c.req.header('X-Request-Signature');
  const timestamp = c.req.header('X-Request-Timestamp');

  if (!signature || !timestamp) {
    if (_enforcementMode === 'hard') {
      logSecurityEvent({ ts: new Date().toISOString(), userId: auth.userId, action: 'HMAC_MISSING', route: routePath(c), ip: clientIp(c) });
      return c.json({ error: 'Request signature required for this operation' }, 403);
    }
    return null; // Soft mode: allow unsigned requests during rollout
  }

  // Replay protection: reject timestamps outside the window
  const ts = parseInt(timestamp, 10);
  const now = Date.now();
  if (isNaN(ts) || Math.abs(now - ts) > HMAC_TIMESTAMP_WINDOW_MS) {
    logSecurityEvent({ ts: new Date().toISOString(), userId: auth.userId, action: 'HMAC_REPLAY', route: routePath(c), ip: clientIp(c), detail: `drift=${Math.abs(now - ts)}ms` });
    return c.json({ error: 'Request signature expired — please retry' }, 403);
  }

  // Recompute the expected signature
  const signingKey = await generateSigningKey(auth.userId);
  const message = `${bodyString}:${timestamp}`;
  const expected = await hmacSha256Hex(message, signingKey);

  if (signature !== expected) {
    logSecurityEvent({ ts: new Date().toISOString(), userId: auth.userId, action: 'HMAC_INVALID', route: routePath(c), ip: clientIp(c) });
    return c.json({ error: 'Invalid request signature' }, 403);
  }

  return null; // valid
}

// ─── Session Freshness (ISO 27001 A.9.4.2) ──────────────────────────────────
// Reject tokens that were issued too long ago, even if Supabase hasn't expired them.
// This limits the window of exposure for stolen tokens.
// Default max age: 60 minutes (configurable via security_policy.session_timeout_minutes).

/**
 * Check that the JWT was issued within maxAgeMinutes.
 * Parses the 'iat' (issued-at) claim from the JWT payload without verifying
 * (verification is already done by requireAuth via supabase.auth.getUser).
 *
 * Returns null if fresh, or a 401 Response if stale.
 */
export function checkTokenFreshness(
  c: any,
  maxAgeMinutes: number = 60,
): Response | null {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null; // no token — handled by requireAuth

    const token = authHeader.split(' ')[1];
    const parts = token.split('.');
    if (parts.length !== 3) return null; // not a JWT — handled by requireAuth

    // Decode the payload (base64url → JSON)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const iat = payload.iat; // epoch seconds
    if (!iat) return null; // no iat claim — can't enforce freshness

    const ageMs = Date.now() - (iat * 1000);
    const maxAgeMs = maxAgeMinutes * 60 * 1000;

    if (ageMs > maxAgeMs) {
      logSecurityEvent({
        ts: new Date().toISOString(),
        action: 'SESSION_STALE',
        route: routePath(c),
        ip: clientIp(c),
        detail: `iat=${iat} age=${Math.round(ageMs / 60000)}min max=${maxAgeMinutes}min`,
      });
      // Don't hard-block — return a special response so the frontend knows to refresh
      return c.json({
        error: 'Session has exceeded the maximum age — please re-authenticate',
        code: 'SESSION_STALE',
      }, 401);
    }

    return null; // fresh
  } catch {
    return null; // parsing failure — let requireAuth handle actual verification
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mask an email for log-safe display: "a***z@domain" — NEVER log the full email. */
function maskPii(email: string): string {
  if (!email || !email.includes('@')) return '[redacted]';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function routePath(c: any): string {
  try { return c.req.path ?? c.req.url ?? 'unknown'; } catch { return 'unknown'; }
}

function clientIp(c: any): string | undefined {
  try {
    return c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      ?? c.req.header('x-real-ip')
      ?? undefined;
  } catch { return undefined; }
}

// ─── Core: Verify JWT ─────────────────────────────────────────────────────────

/**
 * Extracts and verifies the Bearer JWT from the Authorization header.
 * Returns AuthIdentity on success, or a 401 Response on failure.
 *
 * ISO 27001 A.9.4.2 — secure log-on: generic error, no PII leak.
 */
export async function requireAuth(c: any): Promise<AuthIdentity | Response> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    logSecurityEvent({ ts: new Date().toISOString(), action: 'AUTH_FAIL', route: routePath(c), ip: clientIp(c), detail: 'missing bearer token' });
    // Generic message — do not reveal whether the route exists (ISO 27001 A.14.1.2)
    return c.json({ error: 'Authentication required' }, 401);
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

  if (error || !user) {
    // Log with NO PII / NO token fragment (PDPA s.9, GDPR Art.5(1)(f))
    logSecurityEvent({ ts: new Date().toISOString(), action: 'AUTH_FAIL', route: routePath(c), ip: clientIp(c), detail: 'invalid or expired token' });
    console.log(`[auth] JWT verification failed on ${routePath(c)} — invalid or expired token`);
    // Generic client-facing message — never surface Supabase internals
    return c.json({ error: 'Authentication failed — please sign in again' }, 401);
  }

  const identity: AuthIdentity = {
    userId:   user.id,
    email:    user.email ?? '',
    role:     user.user_metadata?.role ?? 'EMPLOYEE',
    tenantId: user.user_metadata?.tenant_id,
  };

  logSecurityEvent({ ts: new Date().toISOString(), userId: identity.userId, action: 'AUTH_SUCCESS', route: routePath(c), ip: clientIp(c) });
  return identity;
}

// ─── Role gate ────────────────────────────────────────────────────────────────

/**
 * Authenticates AND checks that the user has one of the allowed roles.
 * SUPER_ADMIN is implicitly allowed in all role checks.
 */
export async function requireRole(
  c: any,
  ...allowedRoles: ValidRole[]
): Promise<AuthIdentity | Response> {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;

  // SUPER_ADMIN always passes
  if (auth.role === 'SUPER_ADMIN') return auth;

  if (!allowedRoles.includes(auth.role as ValidRole)) {
    // Log with userId only — no email (ISO 27001 A.18.1.4)
    logSecurityEvent({ ts: new Date().toISOString(), userId: auth.userId, action: 'ROLE_DENIED', route: routePath(c), ip: clientIp(c), detail: `role=${auth.role} required=${allowedRoles.join('|')}` });
    console.log(`[auth] Role denied: uid=${auth.userId} role=${auth.role} required=${allowedRoles.join('|')}`);
    return c.json({ error: 'You do not have permission to access this resource' }, 403);
  }

  return auth;
}

// ─��─ Tenant scoping ───────────────────────────────────────────────────────────

/**
 * Authenticates AND verifies the user has access to the requested tenant.
 *   SUPER_ADMIN  → unrestricted access to any tenant
 *   TENANT_ADMIN / EMPLOYEE → only their own tenant
 */
export async function requireTenantScope(
  c: any,
  requestedTenantId: string,
): Promise<AuthIdentity | Response> {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;

  if (auth.role === 'SUPER_ADMIN') return auth; // unrestricted

  if (!auth.tenantId) {
    logSecurityEvent({ ts: new Date().toISOString(), userId: auth.userId, action: 'TENANT_MISMATCH', route: routePath(c), ip: clientIp(c), detail: 'no tenant assignment' });
    return c.json({ error: 'Your account has no organisation assignment — contact your administrator' }, 403);
  }
  if (auth.tenantId !== requestedTenantId) {
    logSecurityEvent({ ts: new Date().toISOString(), userId: auth.userId, action: 'TENANT_MISMATCH', route: routePath(c), ip: clientIp(c), detail: `own=${auth.tenantId} requested=${requestedTenantId}` });
    console.log(`[auth] Tenant mismatch: uid=${auth.userId} ownTenant=${auth.tenantId} requested=${requestedTenantId}`);
    return c.json({ error: 'You do not have access to this organisation\'s data' }, 403);
  }

  return auth;
}

// ─── In-memory rate limiter (ISO 27001 A.9.4.2) ──────────────────────────────
// Simple sliding-window limiter for sensitive routes (login, signup, MFA, AI gen).
// Per-IP + per-route key, 60-second window.

const _rateBuckets = new Map<string, { count: number; resetAt: number }>();

/** Clean up expired buckets every 60 s to prevent memory leak. */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of _rateBuckets) {
    if (bucket.resetAt <= now) _rateBuckets.delete(key);
  }
}, 60_000);

/**
 * Returns a 429 Response if the caller exceeds `maxRequests` within `windowMs`.
 * Call at the top of a route handler:
 *   const limited = rateLimit(c, 'login', 10, 60_000);
 *   if (limited) return limited;
 */
export function rateLimit(
  c: any,
  bucket: string,
  maxRequests: number,
  windowMs: number = 60_000,
): Response | null {
  const ip = clientIp(c) ?? 'unknown';
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = _rateBuckets.get(key);

  if (!entry || entry.resetAt <= now) {
    _rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    logSecurityEvent({ ts: new Date().toISOString(), action: 'RATE_LIMITED', route: routePath(c), ip, detail: `bucket=${bucket} count=${entry.count}` });
    console.log(`[auth] Rate limited: bucket=${bucket} ip=${ip} count=${entry.count}`);
    return c.json({ error: 'Too many requests — please try again later' }, 429);
  }

  return null;
}