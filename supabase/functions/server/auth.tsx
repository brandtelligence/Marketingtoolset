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

// ─── RBAC Cache (Performance Tuning) ─────────────────────────────────────────
// Caches JWT -> AuthIdentity to avoid redundant supabase.auth.getUser calls
// in short-lived Edge Function execution contexts.
const IDENTITY_CACHE = new Map<string, { identity: AuthIdentity; expires: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds (short for security, long enough for perf)

// ─── Security Audit Log (ISO 27001 A.12.4.1) ─────────────────────────────────

interface SecurityAuditEntry {
  ts:        string;
  userId?:   string;
  action:    string;
  route:     string;
  ip?:       string;
  detail?:   string;
}

let _auditBuffer: SecurityAuditEntry[] = [];
const AUDIT_FLUSH_INTERVAL_MS = 5_000;
const AUDIT_MAX_BUFFER = 50;

async function flushAuditBuffer() {
  if (_auditBuffer.length === 0) return;
  const batch = _auditBuffer.splice(0);
  const dayKey = new Date().toISOString().slice(0, 10);
  const kvKey  = `security_audit_log:${dayKey}`;
  try {
    const kv = await import('./kv_store.tsx');
    const existing = await kv.get(kvKey);
    const entries: SecurityAuditEntry[] = existing ? JSON.parse(existing as string) : [];
    entries.push(...batch);
    await kv.set(kvKey, JSON.stringify(entries.slice(-2000)));
  } catch (err) {
    console.log(`[security-audit] flush error: ${(err as Error)?.message ?? err}`);
  }
}

setInterval(flushAuditBuffer, AUDIT_FLUSH_INTERVAL_MS);

function logSecurityEvent(entry: SecurityAuditEntry) {
  _auditBuffer.push(entry);
  if (_auditBuffer.length >= AUDIT_MAX_BUFFER) {
    flushAuditBuffer();
  }
}

export { logSecurityEvent };

// ─── CSRF Double-Submit Protection ──────────────────────────────────────────

const _csrfSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! + ':csrf:v1';
const _signingSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! + ':hmac:v1';

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

export async function generateSigningKey(userId: string): Promise<string> {
  return hmacSha256Hex(`signing:${userId}`, _signingSecret);
}

let _enforcementMode: 'soft' | 'hard' = 'soft';

(async () => {
  try {
    const kv = await import('./kv_store.tsx');
    const raw = await kv.get('security:enforcement_mode') ?? await kv.get('security:csrf_mode');
    if (raw === 'hard') _enforcementMode = 'hard';
    console.log(`[auth] Security enforcement mode: ${_enforcementMode}`);
  } catch { /* default to soft */ }
})();

export async function validateCsrf(c: any, auth: AuthIdentity): Promise<Response | null> {
  const header = c.req.header('X-CSRF-Token');
  if (!header) {
    if (_enforcementMode === 'hard') {
      logSecurityEvent({ ts: new Date().toISOString(), userId: auth.userId, action: 'CSRF_MISSING', route: routePath(c), ip: clientIp(c) });
      return c.json({ error: 'CSRF token required' }, 403);
    }
    return null;
  }
  const expected = await generateCsrfToken(auth.userId);
  if (header !== expected) {
    logSecurityEvent({ ts: new Date().toISOString(), userId: auth.userId, action: 'CSRF_INVALID', route: routePath(c), ip: clientIp(c) });
    if (_enforcementMode === 'hard') return c.json({ error: 'Invalid CSRF token' }, 403);
    return null;
  }
  return null;
}

// ─── HMAC Request Signing ──────────────────────────────────────────────────

const HMAC_TIMESTAMP_WINDOW_MS = 5 * 60 * 1000;

export async function validateRequestSignature(c: any, auth: AuthIdentity, bodyString: string): Promise<Response | null> {
  const signature = c.req.header('X-Request-Signature');
  const timestamp = c.req.header('X-Request-Timestamp');
  if (!signature || !timestamp) {
    if (_enforcementMode === 'hard') {
      logSecurityEvent({ ts: new Date().toISOString(), userId: auth.userId, action: 'HMAC_MISSING', route: routePath(c), ip: clientIp(c) });
      return c.json({ error: 'Request signature required' }, 403);
    }
    return null;
  }
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() - ts) > HMAC_TIMESTAMP_WINDOW_MS) {
    return c.json({ error: 'Request signature expired' }, 403);
  }
  const signingKey = await generateSigningKey(auth.userId);
  const expected = await hmacSha256Hex(`${bodyString}:${timestamp}`, signingKey);
  if (signature !== expected) {
    logSecurityEvent({ ts: new Date().toISOString(), userId: auth.userId, action: 'HMAC_INVALID', route: routePath(c), ip: clientIp(c) });
    return c.json({ error: 'Invalid request signature' }, 403);
  }
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function routePath(c: any): string {
  try { return c.req.path ?? c.req.url ?? 'unknown'; } catch { return 'unknown'; }
}

function clientIp(c: any): string | undefined {
  try { return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? undefined; } catch { return undefined; }
}

// ─── Core: Verify JWT ─────────────────────────────────────────────────────────

export async function requireAuth(c: any): Promise<AuthIdentity | Response> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    logSecurityEvent({ ts: new Date().toISOString(), action: 'AUTH_FAIL', route: routePath(c), ip: clientIp(c), detail: 'missing bearer token' });
    return c.json({ error: 'Authentication required' }, 401);
  }

  const token = authHeader.split(' ')[1];
  
  // RBAC Cache lookup
  const cached = IDENTITY_CACHE.get(token);
  if (cached && cached.expires > Date.now()) {
    return cached.identity;
  }

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

  if (error || !user) {
    logSecurityEvent({ ts: new Date().toISOString(), action: 'AUTH_FAIL', route: routePath(c), ip: clientIp(c), detail: 'invalid token' });
    return c.json({ error: 'Authentication failed' }, 401);
  }

  const identity: AuthIdentity = {
    userId:   user.id,
    email:    user.email ?? '',
    role:     user.user_metadata?.role ?? 'EMPLOYEE',
    tenantId: user.user_metadata?.tenant_id,
  };

  // Cache identity
  IDENTITY_CACHE.set(token, { identity, expires: Date.now() + CACHE_TTL_MS });
  
  // Limit cache size
  if (IDENTITY_CACHE.size > 500) {
    const firstKey = IDENTITY_CACHE.keys().next().value;
    if (firstKey) IDENTITY_CACHE.delete(firstKey);
  }

  logSecurityEvent({ ts: new Date().toISOString(), userId: identity.userId, action: 'AUTH_SUCCESS', route: routePath(c), ip: clientIp(c) });
  return identity;
}

export async function requireRole(c: any, ...allowedRoles: ValidRole[]): Promise<AuthIdentity | Response> {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;
  if (auth.role === 'SUPER_ADMIN') return auth;
  if (!allowedRoles.includes(auth.role as ValidRole)) {
    logSecurityEvent({ ts: new Date().toISOString(), userId: auth.userId, action: 'ROLE_DENIED', route: routePath(c), ip: clientIp(c), detail: `role=${auth.role}` });
    return c.json({ error: 'Permission denied' }, 403);
  }
  return auth;
}

export async function requireTenantScope(c: any, requestedTenantId: string): Promise<AuthIdentity | Response> {
  const auth = await requireAuth(c);
  if (auth instanceof Response) return auth;
  if (auth.role === 'SUPER_ADMIN') return auth;
  if (!auth.tenantId || auth.tenantId !== requestedTenantId) {
    logSecurityEvent({ ts: new Date().toISOString(), userId: auth.userId, action: 'TENANT_MISMATCH', route: routePath(c), ip: clientIp(c) });
    return c.json({ error: 'Organisation mismatch' }, 403);
  }
  return auth;
}

export function rateLimit(c: any, bucket: string, maxRequests: number, windowMs: number = 60_000): Response | null {
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
    logSecurityEvent({ ts: new Date().toISOString(), action: 'RATE_LIMITED', route: routePath(c), ip });
    return c.json({ error: 'Too many requests' }, 429);
  }
  return null;
}

const _rateBuckets = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of _rateBuckets) { if (bucket.resetAt <= now) _rateBuckets.delete(key); }
}, 60_000);
