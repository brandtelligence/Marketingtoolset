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
  AuditLog, Module, Feature, UsageDataPoint,
} from '../data/mockSaasData';

// ── Demo-only mock imports (never rendered when IS_PRODUCTION is true) ─────────
import {
  MOCK_TENANTS, MOCK_REQUESTS, MOCK_TENANT_USERS, MOCK_INVOICES,
  MOCK_AUDIT_LOGS, MOCK_MODULES, MOCK_FEATURES, MOCK_USAGE_DATA,
  MOCK_TENANT_USAGE,
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

// ─── Re-export types so pages import from here, not from mockSaasData ─────────
export type {
  Tenant, PendingRequest, TenantUser, Invoice,
  AuditLog, Module, Feature, UsageDataPoint,
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