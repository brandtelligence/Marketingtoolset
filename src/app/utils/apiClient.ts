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
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders, signRequest } from './authHeaders';
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

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  // Include CSRF token on any mutating request (POST/PUT/DELETE/PATCH).
  // GET requests omit Content-Type to avoid unnecessary CORS preflight.
  const isMutating = !!opts?.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(opts.method);
  const headers = await getAuthHeaders(isMutating);
  const res  = await fetch(`${SERVER}${path}`, { headers, ...opts });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}: ${path}`);
  return json as T;
}

/**
 * Phase 2.4: Signed API call for high-value operations.
 * Adds HMAC-SHA256 request signature headers (X-Request-Signature, X-Request-Timestamp)
 * on top of the standard auth + CSRF headers.
 *
 * Used for: DELETE tenants, security policy changes, AI budget limit changes.
 */
async function signedApi<T>(path: string, opts?: RequestInit): Promise<T> {
  // Signed operations are always mutating — include CSRF + Content-Type
  const headers = await getAuthHeaders(true);

  // Sign the request body (or the path for bodyless requests like DELETE)
  const bodyStr = typeof opts?.body === 'string' ? opts.body : path;
  const sigHeaders = await signRequest(bodyStr);
  if (sigHeaders) {
    Object.assign(headers, sigHeaders);
  }

  const res  = await fetch(`${SERVER}${path}`, { headers, ...opts });
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
  // Phase 2.4: HMAC-signed destructive operation
  await signedApi(`/tenants/${id}`, { method: 'DELETE' });
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
  // Phase 2.3: CSRF-protected (via getAuthHeaders), no HMAC needed for this route
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

// ─── Projects (tenant-scoped, KV-backed) ──────────────────────────────────────

import type { Project } from '../contexts/ProjectsContext';

export async function fetchProjects(tenantId: string): Promise<Project[]> {
  if (!IS_PRODUCTION) return []; // Demo mode seeds projects locally in context
  const { projects } = await api<{ projects: Project[] }>(`/projects?tenantId=${encodeURIComponent(tenantId)}`);
  return projects ?? [];
}

export async function createProject(project: Project, tenantId: string): Promise<Project> {
  if (!IS_PRODUCTION) return project;
  const { project: created } = await api<{ project: Project }>('/projects', {
    method: 'POST',
    body: JSON.stringify({ ...project, tenantId }),
  });
  return created;
}

export async function updateProjectApi(id: string, patch: Partial<Project>, tenantId: string): Promise<Project> {
  if (!IS_PRODUCTION) return patch as Project;
  const { project } = await api<{ project: Project }>(`/projects/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ ...patch, tenantId }),
  });
  return project;
}

export async function syncProjects(projects: Project[], tenantId: string): Promise<void> {
  if (!IS_PRODUCTION) return;
  await api('/projects/sync', {
    method: 'POST',
    body: JSON.stringify({ projects, tenantId }),
  });
}

// ─── Content Cards Backfill ───────────────────────────────────────────────────

export async function backfillContentCardsTenant(): Promise<{ updated: number }> {
  if (!IS_PRODUCTION) return { updated: 0 };
  return api<{ updated: number }>('/content-cards/backfill-tenant', { method: 'POST' });
}

// ─── Approval Events ─────────────────────────────────────────────────────────

export interface ServerApprovalEvent {
  id: string;
  cardId: string;
  cardTitle: string;
  platform: string;
  eventType: string;     // approved | rejected | submitted_for_approval | reverted_to_draft
  performedBy: string;
  performedByEmail: string;
  reason?: string;
  createdAt: string;     // ISO
}

export async function fetchRecentApprovalEvents(tenantId: string, limit = 20): Promise<ServerApprovalEvent[]> {
  if (!IS_PRODUCTION) return [];
  try {
    const { events } = await api<{ events: ServerApprovalEvent[] }>(
      `/approval-events?tenantId=${encodeURIComponent(tenantId)}&limit=${limit}`,
    );
    return events ?? [];
  } catch (err) {
    console.error('[apiClient] fetchRecentApprovalEvents error:', err);
    return [];
  }
}

// ─── AI Content Generation ────────────────────────────────────────────────────
//
// Phase 2.1: all AI functions now use the centralised getAuthHeaders() utility
// (which includes automatic token refresh). Callers no longer pass accessToken.
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

export async function generateContent(
  params: GenerateContentParams,
): Promise<GenerateContentResult> {
  return api<GenerateContentResult>('/ai/generate-content', {
    method: 'POST',
    body:   JSON.stringify(params),
  });
}

// ── Dedicated Brief & Platform Copy endpoints (Steps 5 & 6 of wizard) ────────

export interface GenerateBriefParams {
  initialContent: string;
  actionName?:    string;
  platforms?:     string[];
  channel?:       string;
  tone?:          string;
}

export async function generateBrief(
  params: GenerateBriefParams,
): Promise<GenerateContentResult> {
  return api<GenerateContentResult>('/ai/generate-brief', {
    method: 'POST',
    body:   JSON.stringify(params),
  });
}

export interface GeneratePlatformCopyParams {
  briefContent:    string;
  initialContent?: string;
  platforms:       string[];
  channel?:        string;
  tone?:           string;
}

export async function generatePlatformCopy(
  params: GeneratePlatformCopyParams,
): Promise<GenerateContentResult> {
  return api<GenerateContentResult>('/ai/generate-platform-copy', {
    method: 'POST',
    body:   JSON.stringify(params),
  });
}

// ── AI Image Generation (DALL-E 3) ──────────────────────────────────────────

export interface GenerateImageParams {
  prompt:       string;
  size?:        '1024x1024' | '1024x1792' | '1792x1024';
  quality?:     'standard' | 'hd';
  assetId?:     string;
  projectName?: string;
}

export interface GenerateImageResult {
  success:       boolean;
  imageUrl:      string;
  revisedPrompt: string;
  storagePath:   string;
  usage:         ContentGenUsageSummary;
}

export async function generateImage(
  params: GenerateImageParams,
): Promise<GenerateImageResult> {
  return api<GenerateImageResult>('/ai/generate-image', {
    method: 'POST',
    body:   JSON.stringify(params),
  });
}

// ── AI Content Refinement ───────────────────────────────────────────────────

export interface RefineContentParams {
  instruction:     string;
  currentContent?: string;
  captions?:       Record<string, string>;
  platforms?:      string[];
  projectName?:    string;
}

export interface RefineContentResult {
  success:    boolean;
  output:     string;
  tokensUsed: number;
  usage:      ContentGenUsageSummary;
}

export async function refineContent(
  params: RefineContentParams,
): Promise<RefineContentResult> {
  return api<RefineContentResult>('/ai/refine-content', {
    method: 'POST',
    body:   JSON.stringify(params),
  });
}

export async function fetchContentHistory(
  tenantId: string,
  limit = 20,
): Promise<GenerationRecord[]> {
  const { history } = await api<{ history: GenerationRecord[] }>(
    `/ai/content-history?tenantId=${encodeURIComponent(tenantId)}&limit=${limit}`,
  );
  return history ?? [];
}

export async function deleteContentHistory(
  id: string,
  tenantId: string,
): Promise<void> {
  await api(`/ai/content-history/${id}`, {
    method: 'DELETE',
    body:   JSON.stringify({ tenantId }),
  });
}

export async function fetchContentGenUsage(
  tenantId: string,
  period?: string,
): Promise<ContentGenUsageSummary> {
  const qs = `tenantId=${encodeURIComponent(tenantId)}${period ? `&period=${period}` : ''}`;
  const { usage } = await api<{ usage: ContentGenUsageSummary }>(`/ai/content-usage?${qs}`);
  return usage;
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

export async function fetchPlatformAIUsage(): Promise<PlatformAIUsageResult> {
  if (!IS_PRODUCTION) return buildMockPlatformAI();
  return api<PlatformAIUsageResult>('/ai/platform-ai-usage');
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
  return api<TenantAIBudget>(`/ai/token-limit/${encodeURIComponent(tenantId)}`);
}

export async function updateTenantAILimit(
  tenantId: string,
  limit: number | null,
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
  // Phase 2.4: HMAC-signed budget change
  await signedApi(`/ai/token-limit/${encodeURIComponent(tenantId)}`, {
    method: 'PUT',
    body:   JSON.stringify({ limit }),
  });
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
  const headers = await getAuthHeaders(false); // GET request — no JSON body
  const res  = await fetch(`${SERVER}/check-access-email?email=${encoded}`, { headers });
  const json = await res.json();
  return json as EmailCheckResult;
}

// ─── Security Audit Log (Phase 6 — ISO 27001 A.12.4.1) ───────────────────────

export interface SecurityAuditEntry {
  ts:        string;
  userId?:   string;
  action:    string;
  route:     string;
  ip?:       string;
  detail?:   string;
}

export interface SecurityAuditDaySummary {
  date:  string;
  count: number;
}

/** Fetch security audit entries for a specific date. */
export async function fetchSecurityAuditLog(date: string): Promise<{ date: string; entries: SecurityAuditEntry[]; count: number }> {
  if (!IS_PRODUCTION) {
    // Demo mode — generate plausible mock entries
    const actions = ['AUTH_SUCCESS', 'AUTH_FAIL', 'ROLE_DENIED', 'RATE_LIMITED', 'CSRF_INVALID', 'TENANT_MISMATCH', 'SECURITY_LOG_VIEWED'];
    const routes = ['/auth/login', '/tenants', '/audit-logs', '/mfa/policy', '/security/policy', '/smtp/config', '/data-retention-policy'];
    const entries: SecurityAuditEntry[] = Array.from({ length: 12 }, (_, i) => ({
      ts:     new Date(new Date(date).getTime() + i * 3_600_000 + Math.random() * 3_600_000).toISOString(),
      userId: `usr-${String(i % 5 + 1).padStart(3, '0')}`,
      action: actions[i % actions.length],
      route:  routes[i % routes.length],
      ip:     `103.16.72.${10 + i}`,
      detail: i % 3 === 0 ? 'role=EMPLOYEE required=SUPER_ADMIN' : undefined,
    }));
    return { date, entries, count: entries.length };
  }
  return api<{ date: string; entries: SecurityAuditEntry[]; count: number }>(`/security-audit-log?date=${date}`);
}

/** Fetch security audit log summary (event count per day for N days). */
export async function fetchSecurityAuditSummary(days = 7): Promise<{ days: number; summary: SecurityAuditDaySummary[] }> {
  if (!IS_PRODUCTION) {
    const summary: SecurityAuditDaySummary[] = [];
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      summary.push({ date: d.toISOString().slice(0, 10), count: Math.floor(Math.random() * 45) + 5 });
    }
    return { days, summary };
  }
  return api<{ days: number; summary: SecurityAuditDaySummary[] }>(`/security-audit-log/summary?days=${days}`);
}

// ─── Data Retention Policy (Phase 6 — PDPA s.10 / ISO 27001 A.18.1.3) ────────

export interface RetentionPolicy {
  auditLogDays:       number;
  oauthStateMinutes:  number;
  slaDedupDays:       number;
  usageRecordMonths:  number;
  reviewTokenDays:    number;
  updatedAt:          string | null;
  updatedBy:          string | null;
}

const DEFAULT_RETENTION: RetentionPolicy = {
  auditLogDays: 90, oauthStateMinutes: 60, slaDedupDays: 7,
  usageRecordMonths: 12, reviewTokenDays: 30, updatedAt: null, updatedBy: null,
};

export async function fetchRetentionPolicy(): Promise<RetentionPolicy> {
  if (!IS_PRODUCTION) return { ...DEFAULT_RETENTION };
  const { policy } = await api<{ policy: RetentionPolicy }>('/data-retention-policy');
  return policy;
}

export async function updateRetentionPolicy(patch: Partial<RetentionPolicy>): Promise<RetentionPolicy> {
  if (!IS_PRODUCTION) {
    return { ...DEFAULT_RETENTION, ...patch, updatedAt: new Date().toISOString(), updatedBy: 'demo-user' };
  }
  const { policy } = await api<{ success: boolean; policy: RetentionPolicy }>('/data-retention-policy', {
    method: 'PUT', body: JSON.stringify(patch),
  });
  return policy;
}

// ─── Compliance Status (Phase 6 — aggregated health dashboard) ────────────────

export interface IntegrityCheckResult {
  date:   string;
  action: string;
  detail: string;
  ts:     string;
}

export interface ComplianceCron {
  name:        string;
  schedule:    string;
  description: string;
}

export interface ComplianceStatus {
  health:              'healthy' | 'warning' | 'unknown';
  lastCheck:           IntegrityCheckResult | null;
  integrityResults:    IntegrityCheckResult[];
  nextScheduledCheck:  string;
  crons:               ComplianceCron[];
  retentionConfigured: boolean;
  retentionPolicy:     RetentionPolicy | null;
  alertRecipientsCount?: number;
  penTestProgress?: {
    total: number;
    pass: number;
    fail: number;
    partial: number;
    notTested: number;
    na: number;
    updatedAt: string | null;
  };
}

export async function fetchComplianceStatus(): Promise<ComplianceStatus> {
  if (!IS_PRODUCTION) {
    // Demo mode — generate plausible mock data
    const now = new Date();
    const lastSunday = new Date(now);
    lastSunday.setDate(lastSunday.getDate() - lastSunday.getDay());
    lastSunday.setHours(4, 0, 0, 0);
    const nextSunday = new Date(lastSunday);
    nextSunday.setDate(nextSunday.getDate() + 7);

    return {
      health: 'healthy',
      lastCheck: {
        date: lastSunday.toISOString().slice(0, 10),
        action: 'AUDIT_INTEGRITY_OK',
        detail: 'last7days=complete',
        ts: lastSunday.toISOString(),
      },
      integrityResults: [
        { date: lastSunday.toISOString().slice(0, 10), action: 'AUDIT_INTEGRITY_OK', detail: 'last7days=complete', ts: lastSunday.toISOString() },
        { date: new Date(lastSunday.getTime() - 7 * 86400000).toISOString().slice(0, 10), action: 'AUDIT_INTEGRITY_OK', detail: 'last7days=complete', ts: new Date(lastSunday.getTime() - 7 * 86400000).toISOString() },
      ],
      nextScheduledCheck: nextSunday.toISOString(),
      crons: [
        { name: 'auto-publish-scheduled-cards', schedule: '* * * * *', description: 'Auto-publish scheduled social media cards' },
        { name: 'daily-autopublish-failure-digest', schedule: '0 8 * * *', description: 'Daily failure digest email at 08:00 UTC' },
        { name: 'analytics-engagement-sync', schedule: '0 */6 * * *', description: 'Sync engagement metrics every 6 hours' },
        { name: 'data-retention-purge', schedule: '0 3 * * *', description: 'Purge expired data daily at 03:00 UTC' },
        { name: 'audit-log-integrity-check', schedule: '0 4 * * 0', description: 'Weekly audit log gap detection (Sundays 04:00 UTC)' },
      ],
      retentionConfigured: false,
      retentionPolicy: null,
      alertRecipientsCount: 2,
      penTestProgress: { total: 18, pass: 12, fail: 1, partial: 3, notTested: 33, na: 2, updatedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
    };
  }
  return api<ComplianceStatus>('/compliance-status');
}

// ─── Manual Integrity Check (Phase 6 — on-demand) ─────────────────────────────

export interface IntegrityCheckOnDemandResult {
  success: boolean;
  health:  'ok' | 'warning';
  gaps:    string[];
  checked: number;
  ts:      string;
  trigger: string;
}

export async function runIntegrityCheckNow(): Promise<IntegrityCheckOnDemandResult> {
  if (!IS_PRODUCTION) {
    // Demo mode — simulate a successful check
    return {
      success: true,
      health: 'ok',
      gaps: [],
      checked: 7,
      ts: new Date().toISOString(),
      trigger: 'manual',
    };
  }
  return api<IntegrityCheckOnDemandResult>('/compliance/run-integrity-check', { method: 'POST' });
}

// ─── Compliance Alert Recipients ──────────────────────────────────────────────

export interface AlertRecipient {
  id: string;
  email: string;
  name: string;
  role: string;
  enabled: boolean;
  addedAt: string;
  addedBy?: string;
}

export async function fetchAlertRecipients(): Promise<AlertRecipient[]> {
  if (!IS_PRODUCTION) {
    return [
      { id: 'ar-1', email: 'it@brandtelligence.com.my', name: 'IT Admin', role: 'IT Admin', enabled: true, addedAt: new Date().toISOString() },
      { id: 'ar-2', email: 'ciso@brandtelligence.com.my', name: 'Ahmad Razak', role: 'CISO', enabled: true, addedAt: new Date().toISOString() },
      { id: 'ar-3', email: 'dpo@brandtelligence.com.my', name: 'Siti Aminah', role: 'DPO', enabled: false, addedAt: new Date().toISOString() },
    ];
  }
  const res = await api<{ success: boolean; recipients: AlertRecipient[] }>('/compliance/alert-recipients');
  return res.recipients;
}

export async function updateAlertRecipients(recipients: AlertRecipient[]): Promise<AlertRecipient[]> {
  if (!IS_PRODUCTION) {
    return recipients;
  }
  const res = await api<{ success: boolean; recipients: AlertRecipient[] }>('/compliance/alert-recipients', {
    method: 'PUT',
    body: JSON.stringify({ recipients }),
  });
  return res.recipients;
}

// ─── Penetration Test Results (server-side persistence) ───────────────────────

export interface PenTestResultEntry {
  status: 'not_tested' | 'pass' | 'fail' | 'partial' | 'na';
  notes: string;
  testedAt?: string;
  tester?: string;
}

export interface PenTestResultsPayload {
  results: Record<string, PenTestResultEntry>;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function fetchPenTestResults(): Promise<PenTestResultsPayload> {
  if (!IS_PRODUCTION) {
    return { results: {}, updatedAt: null, updatedBy: null };
  }
  return api<PenTestResultsPayload & { success: boolean }>('/compliance/pentest-results');
}

export async function savePenTestResults(results: Record<string, PenTestResultEntry>): Promise<PenTestResultsPayload> {
  if (!IS_PRODUCTION) {
    return { results, updatedAt: new Date().toISOString(), updatedBy: 'demo-user' };
  }
  return api<PenTestResultsPayload & { success: boolean }>('/compliance/pentest-results', {
    method: 'PUT',
    body: JSON.stringify({ results }),
  });
}

// ─── Team Activity Feed ─────────────────────────────────────────────────────

export type ActivityAction =
  | 'content_created' | 'content_edited' | 'content_approved' | 'content_rejected'
  | 'content_published' | 'content_scheduled' | 'campaign_created' | 'campaign_generated'
  | 'account_connected' | 'account_disconnected' | 'user_invited' | 'user_joined'
  | 'comment_added' | 'engagement_updated';

export type ActivityEntityType = 'content' | 'campaign' | 'account' | 'user' | 'system';

export interface ActivityEvent {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole?: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string;
  entityTitle?: string;
  platform?: string;
  details?: string;
  timestamp: string;
}

interface ActivityFeedResponse {
  events: ActivityEvent[];
  hasMore: boolean;
}

// ── Demo fallback data ────────────────────────────────────────────────────────
function demoActivityFeed(): ActivityFeedResponse {
  const now = Date.now();
  const h = (hours: number) => new Date(now - hours * 3600_000).toISOString();
  const DEMO_EVENTS: ActivityEvent[] = [
    { id: 'demo-01', tenantId: 'demo', userId: 'u1', userName: 'Sarah Chen', userRole: 'TENANT_ADMIN', action: 'content_approved', entityType: 'content', entityTitle: 'March Product Launch — Instagram Carousel', platform: 'instagram', timestamp: h(0.2), details: 'Approved with minor caption edits' },
    { id: 'demo-02', tenantId: 'demo', userId: 'u2', userName: 'Amir Hassan', userRole: 'EMPLOYEE', action: 'content_created', entityType: 'content', entityTitle: 'Hari Raya Greeting Post', platform: 'facebook', timestamp: h(0.8) },
    { id: 'demo-03', tenantId: 'demo', userId: 'u3', userName: 'Priya Nair', userRole: 'EMPLOYEE', action: 'campaign_generated', entityType: 'campaign', entityTitle: 'Q2 Brand Awareness Campaign', timestamp: h(1.5), details: 'AI generated 24 posts across 4 platforms' },
    { id: 'demo-04', tenantId: 'demo', userId: 'u1', userName: 'Sarah Chen', userRole: 'TENANT_ADMIN', action: 'content_rejected', entityType: 'content', entityTitle: 'Weekend Flash Sale Banner', platform: 'instagram', timestamp: h(2.3), details: 'Brand colors need adjustment — see comments' },
    { id: 'demo-05', tenantId: 'demo', userId: 'u4', userName: 'Daniel Lim', userRole: 'EMPLOYEE', action: 'content_published', entityType: 'content', entityTitle: 'Tech Tuesday — AI in Marketing', platform: 'linkedin', timestamp: h(3.0) },
    { id: 'demo-06', tenantId: 'demo', userId: 'u2', userName: 'Amir Hassan', userRole: 'EMPLOYEE', action: 'content_scheduled', entityType: 'content', entityTitle: 'Friday Motivation Quote', platform: 'twitter', timestamp: h(4.5), details: 'Scheduled for 2026-03-06 09:00 MYT' },
    { id: 'demo-07', tenantId: 'demo', userId: 'u5', userName: 'Li Wei', userRole: 'EMPLOYEE', action: 'account_connected', entityType: 'account', entityTitle: 'TikTok Business Account', platform: 'tiktok', timestamp: h(6.0) },
    { id: 'demo-08', tenantId: 'demo', userId: 'u3', userName: 'Priya Nair', userRole: 'EMPLOYEE', action: 'content_edited', entityType: 'content', entityTitle: 'World Water Day Infographic', platform: 'instagram', timestamp: h(8.0), details: 'Updated hashtags and call-to-action' },
    { id: 'demo-09', tenantId: 'demo', userId: 'u1', userName: 'Sarah Chen', userRole: 'TENANT_ADMIN', action: 'user_invited', entityType: 'user', entityTitle: 'maya.tang@example.com', timestamp: h(10.0), details: 'Invited as EMPLOYEE to the content team' },
    { id: 'demo-10', tenantId: 'demo', userId: 'u6', userName: 'Maya Tang', userRole: 'EMPLOYEE', action: 'user_joined', entityType: 'user', entityTitle: 'Content Team', timestamp: h(11.0) },
    { id: 'demo-11', tenantId: 'demo', userId: 'u4', userName: 'Daniel Lim', userRole: 'EMPLOYEE', action: 'engagement_updated', entityType: 'content', entityTitle: 'Chinese New Year Campaign Recap', platform: 'facebook', timestamp: h(24.0), details: '+2.4K reach, 156 likes, 23 shares' },
    { id: 'demo-12', tenantId: 'demo', userId: 'u2', userName: 'Amir Hassan', userRole: 'EMPLOYEE', action: 'campaign_created', entityType: 'campaign', entityTitle: 'Ramadan Content Calendar', timestamp: h(28.0) },
    { id: 'demo-13', tenantId: 'demo', userId: 'u1', userName: 'Sarah Chen', userRole: 'TENANT_ADMIN', action: 'content_approved', entityType: 'content', entityTitle: 'Earth Hour 2026 Awareness Post', platform: 'instagram', timestamp: h(48.0) },
    { id: 'demo-14', tenantId: 'demo', userId: 'u3', userName: 'Priya Nair', userRole: 'EMPLOYEE', action: 'content_published', entityType: 'content', entityTitle: 'Client Testimonial Video — TechVentures', platform: 'youtube', timestamp: h(72.0) },
    { id: 'demo-15', tenantId: 'demo', userId: 'u5', userName: 'Li Wei', userRole: 'EMPLOYEE', action: 'account_disconnected', entityType: 'account', entityTitle: 'Old Twitter Account', platform: 'twitter', timestamp: h(96.0) },
  ];
  return { events: DEMO_EVENTS, hasMore: false };
}

export async function fetchActivityFeed(limit = 50, before?: string): Promise<ActivityFeedResponse> {
  if (!IS_PRODUCTION) return demoActivityFeed();
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set('before', before);
  return api<ActivityFeedResponse & { success: boolean }>(`/activity-feed?${params}`);
}

export async function postActivityEvent(event: {
  action: ActivityAction;
  entityType: ActivityEntityType;
  userName: string;
  userAvatar?: string;
  userRole?: string;
  entityId?: string;
  entityTitle?: string;
  platform?: string;
  details?: string;
}): Promise<ActivityEvent | null> {
  if (!IS_PRODUCTION) return null; // Demo mode — no-op
  try {
    const res = await api<{ success: boolean; event: ActivityEvent }>('/activity-feed', {
      method: 'POST',
      body: JSON.stringify(event),
    });
    return res.event;
  } catch (err) {
    console.error('[apiClient] postActivityEvent error:', err);
    return null;
  }
}