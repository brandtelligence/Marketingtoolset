/**
 * apiClient.ts — Shared Data Access Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * PRODUCTION SAFETY GATE — single point of truth.
 *
 *   IS_PRODUCTION (default) → all functions fetch from the Supabase edge function
 *   IS_DEMO_MODE (VITE_APP_ENV=demo) → functions return MOCK_* data from mockSaasData
 *
 * STRICT RULES
 *   • No component may import from mockSaasData.ts for data display purposes.
 *     They must call these functions instead.
 *   • Mock data is ONLY imported here, in this file.
 *   • Do not add business logic here — only data fetching and the mode branch.
 */

import { IS_PRODUCTION } from '../config/appConfig';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import type {
  Tenant, PendingRequest, TenantUser, Invoice,
  AuditLog, Module, Feature, UsageDataPoint, ModuleRequest,
  RoleType,
} from '../data/mockSaasData';

// ── Demo-only mock imports (never rendered when IS_PRODUCTION is true) ─────────
import {
  MOCK_TENANTS, MOCK_REQUESTS, MOCK_TENANT_USERS, MOCK_INVOICES,
  MOCK_AUDIT_LOGS, MOCK_MODULES, MOCK_FEATURES, MOCK_USAGE_DATA,
  MOCK_TENANT_USAGE, MOCK_MODULE_REQUESTS,
} from '../data/mockSaasData';

// ─── Server base ──────────────────────────────────────────────────────────────

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const res  = await fetch(`${SERVER}${path}`, { headers: H, ...opts });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}: ${path}`);
  return json as T;
}

// ─── Tenants ──────────────────────────────────────────────────────────────────

export async function fetchTenants(): Promise<Tenant[]> {
  if (!IS_PRODUCTION) return [...MOCK_TENANTS];
  const { tenants } = await api<{ tenants: Tenant[] }>('/tenants');
  return tenants ?? [];
}

export async function createTenant(data: Partial<Tenant>): Promise<Tenant> {
  if (!IS_PRODUCTION) {
    const t: Tenant = { id: crypto.randomUUID(), ...data } as Tenant;
    MOCK_TENANTS.push(t);
    return t;
  }
  const { tenant } = await api<{ tenant: Tenant }>('/tenants', {
    method: 'POST', body: JSON.stringify(data),
  });
  return tenant;
}

export async function updateTenant(id: string, patch: Partial<Tenant>): Promise<void> {
  if (!IS_PRODUCTION) {
    const i = MOCK_TENANTS.findIndex(t => t.id === id);
    if (i >= 0) MOCK_TENANTS[i] = { ...MOCK_TENANTS[i], ...patch };
    return;
  }
  await api(`/tenants/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

export async function deleteTenant(id: string): Promise<void> {
  if (!IS_PRODUCTION) {
    const i = MOCK_TENANTS.findIndex(t => t.id === id);
    if (i >= 0) MOCK_TENANTS.splice(i, 1);
    return;
  }
  await api(`/tenants/${id}`, { method: 'DELETE' });
}

// ─── Pending Requests ─────────────────────────────────────────────────────────

export async function fetchRequests(): Promise<PendingRequest[]> {
  if (!IS_PRODUCTION) return [...MOCK_REQUESTS];
  const { requests } = await api<{ requests: PendingRequest[] }>('/requests');
  return requests ?? [];
}

export async function createRequest(data: Partial<PendingRequest>): Promise<PendingRequest> {
  if (!IS_PRODUCTION) {
    const r: PendingRequest = { id: crypto.randomUUID(), status: 'pending', ...data } as PendingRequest;
    MOCK_REQUESTS.push(r);
    return r;
  }
  const { request } = await api<{ request: PendingRequest }>('/requests', {
    method: 'POST', body: JSON.stringify(data),
  });
  return request;
}

export async function updateRequest(id: string, patch: Partial<PendingRequest>): Promise<void> {
  if (!IS_PRODUCTION) {
    const i = MOCK_REQUESTS.findIndex(r => r.id === id);
    if (i >= 0) MOCK_REQUESTS[i] = { ...MOCK_REQUESTS[i], ...patch };
    return;
  }
  await api(`/requests/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

// ─── Tenant Users ─────────────────────────────────────────────────────────────

export async function fetchTenantUsers(tenantId?: string): Promise<TenantUser[]> {
  if (!IS_PRODUCTION) {
    return tenantId
      ? MOCK_TENANT_USERS.filter(u => u.tenantId === tenantId)
      : [...MOCK_TENANT_USERS];
  }
  const qs = tenantId ? `?tenantId=${tenantId}` : '';
  const { users } = await api<{ users: TenantUser[] }>(`/tenant-users${qs}`);
  return users ?? [];
}

export async function createTenantUser(data: Partial<TenantUser>): Promise<TenantUser> {
  if (!IS_PRODUCTION) {
    const u: TenantUser = { id: crypto.randomUUID(), status: 'pending_invite', ...data } as TenantUser;
    MOCK_TENANT_USERS.push(u);
    return u;
  }
  const { user } = await api<{ user: TenantUser }>('/tenant-users', {
    method: 'POST', body: JSON.stringify(data),
  });
  return user;
}

export async function updateTenantUser(id: string, patch: Partial<TenantUser>): Promise<void> {
  if (!IS_PRODUCTION) {
    const i = MOCK_TENANT_USERS.findIndex(u => u.id === id);
    if (i >= 0) MOCK_TENANT_USERS[i] = { ...MOCK_TENANT_USERS[i], ...patch };
    return;
  }
  await api(`/tenant-users/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

export async function deleteTenantUser(id: string): Promise<void> {
  if (!IS_PRODUCTION) {
    const i = MOCK_TENANT_USERS.findIndex(u => u.id === id);
    if (i >= 0) MOCK_TENANT_USERS.splice(i, 1);
    return;
  }
  await api(`/tenant-users/${id}`, { method: 'DELETE' });
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function fetchInvoices(tenantId?: string): Promise<Invoice[]> {
  if (!IS_PRODUCTION) {
    return tenantId
      ? MOCK_INVOICES.filter(i => i.tenantId === tenantId)
      : [...MOCK_INVOICES];
  }
  const qs = tenantId ? `?tenantId=${tenantId}` : '';
  const { invoices } = await api<{ invoices: Invoice[] }>(`/invoices${qs}`);
  return invoices ?? [];
}

export async function createInvoice(data: Partial<Invoice>): Promise<Invoice> {
  if (!IS_PRODUCTION) {
    const inv: Invoice = { id: crypto.randomUUID(), ...data } as Invoice;
    MOCK_INVOICES.push(inv);
    return inv;
  }
  const { invoice } = await api<{ invoice: Invoice }>('/invoices', {
    method: 'POST', body: JSON.stringify(data),
  });
  return invoice;
}

export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<void> {
  if (!IS_PRODUCTION) {
    const i = MOCK_INVOICES.findIndex(inv => inv.id === id);
    if (i >= 0) MOCK_INVOICES[i] = { ...MOCK_INVOICES[i], ...patch };
    return;
  }
  await api(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

// ─── Modules ──────────────────────────────────────────────────────────────────

export async function fetchModules(): Promise<Module[]> {
  if (!IS_PRODUCTION) return [...MOCK_MODULES];
  const { modules } = await api<{ modules: Module[] }>('/modules');
  return modules ?? [];
}

export async function fetchFeatures(): Promise<Feature[]> {
  if (!IS_PRODUCTION) return [...MOCK_FEATURES];
  const { features } = await api<{ features: Feature[] }>('/features');
  return features ?? [];
}

export async function updateModule(id: string, patch: Partial<Module>): Promise<void> {
  if (!IS_PRODUCTION) {
    const i = MOCK_MODULES.findIndex(m => m.id === id);
    if (i >= 0) MOCK_MODULES[i] = { ...MOCK_MODULES[i], ...patch };
    return;
  }
  await api(`/modules/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

export async function updateFeature(id: string, patch: Partial<Feature>): Promise<void> {
  if (!IS_PRODUCTION) {
    const i = MOCK_FEATURES.findIndex(f => f.id === id);
    if (i >= 0) MOCK_FEATURES[i] = { ...MOCK_FEATURES[i], ...patch };
    return;
  }
  await api(`/features/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export async function fetchAuditLogs(filters?: {
  severity?: string; role?: string; limit?: number;
}): Promise<AuditLog[]> {
  if (!IS_PRODUCTION) {
    let logs = [...MOCK_AUDIT_LOGS];
    if (filters?.severity && filters.severity !== 'all') logs = logs.filter(a => a.severity === filters.severity);
    if (filters?.role && filters.role !== 'all') logs = logs.filter(a => a.actorRole === filters.role);
    return logs;
  }
  const params = new URLSearchParams();
  if (filters?.severity && filters.severity !== 'all') params.set('severity', filters.severity);
  if (filters?.role     && filters.role     !== 'all') params.set('role',     filters.role);
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString() ? `?${params}` : '';
  const { logs } = await api<{ logs: AuditLog[] }>(`/audit-logs${qs}`);
  return logs ?? [];
}

export async function appendAuditLog(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
  if (!IS_PRODUCTION) return; // demo: skip KV writes
  await api('/audit-logs', {
    method: 'POST', body: JSON.stringify(entry),
  });
}

// ─── Usage Stats ──────────────────────────────────────────────────────────────

export async function fetchUsageData(tenantId?: string): Promise<UsageDataPoint[]> {
  if (!IS_PRODUCTION) {
    if (tenantId && tenantId !== 'all') return MOCK_TENANT_USAGE[tenantId] ?? MOCK_USAGE_DATA;
    return MOCK_USAGE_DATA;
  }
  const qs = tenantId && tenantId !== 'all' ? `?tenantId=${tenantId}` : '';
  const { data } = await api<{ data: UsageDataPoint[] }>(`/usage${qs}`);
  return data ?? [];
}

// ─── Module Requests (employee → tenant admin) ────────────────────────────────

export async function fetchModuleRequests(tenantId: string): Promise<ModuleRequest[]> {
  if (!IS_PRODUCTION) return MOCK_MODULE_REQUESTS.filter(r => r.tenantId === tenantId);
  const { requests } = await api<{ requests: ModuleRequest[] }>(`/module-requests?tenantId=${tenantId}`);
  return requests ?? [];
}

export async function createModuleRequest(data: Omit<ModuleRequest, 'id' | 'createdAt' | 'status'>): Promise<ModuleRequest> {
  if (!IS_PRODUCTION) {
    const r: ModuleRequest = {
      ...data,
      id: crypto.randomUUID(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    MOCK_MODULE_REQUESTS.push(r);
    return r;
  }
  const { request } = await api<{ request: ModuleRequest }>('/module-requests', {
    method: 'POST', body: JSON.stringify(data),
  });
  return request;
}

export async function updateModuleRequest(id: string, patch: { status: ModuleRequest['status'] }): Promise<void> {
  if (!IS_PRODUCTION) {
    const i = MOCK_MODULE_REQUESTS.findIndex(r => r.id === id);
    if (i >= 0) MOCK_MODULE_REQUESTS[i] = { ...MOCK_MODULE_REQUESTS[i], ...patch };
    return;
  }
  await api(`/module-requests/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
}

// ─── AI Content Generation ────────────────────────────────────────────────────
//
// These functions require the caller to pass the user's Supabase access_token
// so the server can verify identity and resolve the tenantId server-side.
// Always obtain it via: supabase.auth.getSession() → session.access_token
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerationRecord {
  id:         string;
  tenantId:   string;
  userId:     string;
  userName:   string;
  template:   string;
  platform:   string;
  tone:       string;
  prompt:     string;
  output:     string;
  tokensUsed: number;
  model:      string;
  createdAt:  string;
}

export interface ContentGenUsageSummary {
  tokens:   number;
  requests: number;
  limit:    number;
  period:   string;
}

export interface GenerateContentParams {
  template?:           string; // 'social_caption' | 'ad_copy' | 'blog_intro' | 'hashtag_set' | 'campaign_brief' | 'custom'
  platform?:           string; // 'instagram' | 'facebook' | 'twitter' | 'linkedin' | etc.
  tone?:               string; // 'professional' | 'conversational' | 'creative' | 'authoritative' | 'humorous' | 'inspirational'
  prompt:              string; // the user's request / instruction
  projectName?:        string;
  projectDescription?: string;
  targetAudience?:     string;
  charLimit?:          number;
}

export interface GenerateContentResult {
  id:         string;
  output:     string;
  tokensUsed: number;
  model:      string;
  usage:      ContentGenUsageSummary;
}

// Helper: build auth header using the user's access token
function authHeader(accessToken: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
}

export async function generateContent(
  params: GenerateContentParams,
  accessToken: string,
): Promise<GenerateContentResult> {
  const res  = await fetch(`${SERVER}/ai/generate-content`, {
    method:  'POST',
    headers: authHeader(accessToken),
    body:    JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}: /ai/generate-content`);
  return json as GenerateContentResult;
}

export async function fetchContentHistory(
  tenantId: string,
  accessToken: string,
  limit = 20,
): Promise<GenerationRecord[]> {
  const res  = await fetch(`${SERVER}/ai/content-history?tenantId=${encodeURIComponent(tenantId)}&limit=${limit}`, {
    headers: authHeader(accessToken),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}: /ai/content-history`);
  return (json.history ?? []) as GenerationRecord[];
}

export async function deleteContentHistory(
  id: string,
  tenantId: string,
  accessToken: string,
): Promise<void> {
  const res  = await fetch(`${SERVER}/ai/content-history/${id}`, {
    method:  'DELETE',
    headers: authHeader(accessToken),
    body:    JSON.stringify({ tenantId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}: delete /ai/content-history`);
}

export async function fetchContentGenUsage(
  tenantId: string,
  accessToken: string,
  period?: string,
): Promise<ContentGenUsageSummary> {
  const qs   = `tenantId=${encodeURIComponent(tenantId)}${period ? `&period=${period}` : ''}`;
  const res  = await fetch(`${SERVER}/ai/content-usage?${qs}`, {
    headers: authHeader(accessToken),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}: /ai/content-usage`);
  return json.usage as ContentGenUsageSummary;
}

// ─── Platform-wide AI Usage (Super Admin) ────────────────────────────────────

export interface TenantAIUsageSummary {
  id:          string;
  name:        string;
  plan:        string;
  status:      string;
  usage:       Record<string, { tokens: number; requests: number }>;
  /** null = using platform default (AI_TOKEN_MONTHLY_LIMIT) */
  tokenLimit?: number | null;
}

export interface TenantAIBudget {
  limit:        number;   // effective limit (custom or default)
  isCustom:     boolean;  // true if a custom override is stored in KV
  defaultLimit: number;   // platform default (100,000)
  period:       string;   // YYYY-MM
  tokensUsed:   number;   // current month usage
  requests:     number;   // current month requests
}

export interface PlatformAIUsageResult {
  tenants:       TenantAIUsageSummary[];
  periods:       string[];
  platformTotal: Record<string, { tokens: number; requests: number }>;
  limit:         number;
}

function buildMockPlatformAI(): PlatformAIUsageResult {
  const periods: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(d.toISOString().slice(0, 7));
  }

  // Deterministic per-tenant token trajectories
  const seeds: Record<string, [number[], number[]]> = {
    't1': [[12400,28900,35200,41800,58400,67200], [23,51,67,78,94,112]],  // Acme Corp — rising hero
    't2': [[4200,8900,12300,15800,21400,24600],   [8,17,23,29,39,45]],   // TechStart — steady
    't3': [[18600,31200,38400,29100,12800,5400],  [34,57,70,53,23,10]],  // GlobalRetail — declining (suspended)
    't4': [[800,1900,3100,4200,5800,7100],         [2,4,6,8,11,13]],     // SmallBiz HQ — nascent
  };

  const platformTotal: Record<string, { tokens: number; requests: number }> = {};
  for (const p of periods) platformTotal[p] = { tokens: 0, requests: 0 };

  // Per-tenant custom limits for rich demo data (null = use platform default 100k)
  const mockLimits: Record<string, number | null> = {
    't1': 80_000,   // Acme Corp — tighter budget, nearly at limit
    't2': 200_000,  // TechStart — generous budget, lots of headroom
    't3': 50_000,   // GlobalRetail — small limit (suspended anyway)
    't4': null,     // SmallBiz HQ — default
  };

  const tenants: TenantAIUsageSummary[] = MOCK_TENANTS.map(t => {
    const [tokSeeds, reqSeeds] = seeds[t.id] ?? [[0,0,0,0,0,0],[0,0,0,0,0,0]];
    const usage: Record<string, { tokens: number; requests: number }> = {};
    periods.forEach((p, i) => {
      const u = { tokens: tokSeeds[i] ?? 0, requests: reqSeeds[i] ?? 0 };
      usage[p] = u;
      platformTotal[p].tokens   += u.tokens;
      platformTotal[p].requests += u.requests;
    });
    return { id: t.id, name: t.name, plan: t.plan, status: t.status, usage, tokenLimit: mockLimits[t.id] ?? null };
  });

  return { tenants, periods, platformTotal, limit: 100_000 };
}

export async function fetchPlatformAIUsage(accessToken: string): Promise<PlatformAIUsageResult> {
  if (!IS_PRODUCTION) return buildMockPlatformAI();
  const res  = await fetch(`${SERVER}/ai/platform-ai-usage`, {
    headers: authHeader(accessToken),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}: /ai/platform-ai-usage`);
  return json as PlatformAIUsageResult;
}

// ─── Per-tenant AI token budget (Super Admin) ─────────────────────────────────

/** Default limit shown in demo mode (mirrors the server constant) */
const DEMO_DEFAULT_LIMIT = 100_000;

const DEMO_BUDGETS: Record<string, Partial<TenantAIBudget>> = {
  't1': { limit: 80_000,  isCustom: true,  tokensUsed: 67_200, requests: 112 },
  't2': { limit: 200_000, isCustom: true,  tokensUsed: 24_600, requests: 45 },
  't3': { limit: 50_000,  isCustom: true,  tokensUsed: 5_400,  requests: 10 },
  't4': { limit: DEMO_DEFAULT_LIMIT, isCustom: false, tokensUsed: 7_100, requests: 13 },
};

export async function fetchTenantAIBudget(
  tenantId: string,
  accessToken: string,
): Promise<TenantAIBudget> {
  if (!IS_PRODUCTION) {
    const d = DEMO_BUDGETS[tenantId];
    return {
      limit:        d?.limit        ?? DEMO_DEFAULT_LIMIT,
      isCustom:     d?.isCustom     ?? false,
      defaultLimit: DEMO_DEFAULT_LIMIT,
      period:       new Date().toISOString().slice(0, 7),
      tokensUsed:   d?.tokensUsed   ?? 0,
      requests:     d?.requests     ?? 0,
    };
  }
  const res  = await fetch(`${SERVER}/ai/token-limit/${encodeURIComponent(tenantId)}`, {
    headers: authHeader(accessToken),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}: /ai/token-limit`);
  return json as TenantAIBudget;
}

export async function updateTenantAILimit(
  tenantId: string,
  limit: number | null,
  accessToken: string,
): Promise<void> {
  if (!IS_PRODUCTION) {
    const d = DEMO_BUDGETS[tenantId] ?? {};
    if (limit === null) {
      d.limit    = DEMO_DEFAULT_LIMIT;
      d.isCustom = false;
    } else {
      d.limit    = limit;
      d.isCustom = true;
    }
    DEMO_BUDGETS[tenantId] = d;
    return;
  }
  const res  = await fetch(`${SERVER}/ai/token-limit/${encodeURIComponent(tenantId)}`, {
    method:  'PUT',
    headers: authHeader(accessToken),
    body:    JSON.stringify({ limit }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}: PUT /ai/token-limit`);
}

// ─── Re-export types so pages import from here, not from mockSaasData ─────────
export type {
  Tenant, PendingRequest, TenantUser, Invoice,
  AuditLog, Module, Feature, UsageDataPoint, ModuleRequest,
  RoleType,
};

// ─── Email availability check (public, no auth required) ──────────────────────
export type EmailCheckStatus = 'available' | 'tenant' | 'pending' | 'rejected';
export interface EmailCheckResult {
  status: EmailCheckStatus;
  submittedAt?: string;
}
export async function checkAccessEmail(email: string): Promise<EmailCheckResult> {
  const encoded = encodeURIComponent(email.toLowerCase().trim());
  const res  = await fetch(`${SERVER}/check-access-email?email=${encoded}`, { headers: H });
  const json = await res.json();
  return json as EmailCheckResult;
}