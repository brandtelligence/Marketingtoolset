// ─── Central Mock Data Store for Multi-Tenant SaaS RBAC Portal ──────────────

export type RoleType = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'EMPLOYEE';
export type TenantStatus = 'active' | 'suspended' | 'pending' | 'cancelled';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'suspended';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type PaymentMethod = 'gateway' | 'bank_transfer' | 'none';
export type UserStatus = 'active' | 'inactive' | 'pending_invite';
export type ModuleStatus = 'enabled' | 'disabled';

// ── Permissions ───────────────────────────────────────────────────────────────
export const PERMISSIONS = {
  TENANT_READ_ALL: 'tenant.read_all',
  TENANT_CREATE: 'tenant.create',
  TENANT_UPDATE: 'tenant.update',
  TENANT_MODULES_MANAGE: 'tenant.modules.manage',
  TENANT_IMPERSONATE: 'tenant.impersonate',
  BILLING_INVOICE_GENERATE: 'billing.invoice.generate',
  BILLING_INVOICE_READ_ALL: 'billing.invoice.read_all',
  BILLING_PAYMENT_CONFIRM_BANK: 'billing.payment.confirm_bank_transfer',
  MODULE_GLOBAL_TOGGLE: 'module.global.toggle',
  FEATURE_GLOBAL_TOGGLE: 'feature.global.toggle',
  TENANT_SELF_PROFILE_READ: 'tenant.self.profile.read',
  TENANT_SELF_PROFILE_UPDATE: 'tenant.self.profile.update',
  TENANT_USERS_MANAGE: 'tenant.users.manage',
  BILLING_INVOICE_READ_SELF: 'billing.invoice.read_self',
  BILLING_INVOICE_PAY_GATEWAY: 'billing.invoice.pay_gateway',
  BILLING_INVOICE_PAY_BANK: 'billing.invoice.pay_bank_transfer',
  MODULE_ACCESS: 'module.access',
} as const;

export const ROLE_PERMISSIONS: Record<RoleType, string[]> = {
  SUPER_ADMIN: [
    PERMISSIONS.TENANT_READ_ALL, PERMISSIONS.TENANT_CREATE, PERMISSIONS.TENANT_UPDATE,
    PERMISSIONS.TENANT_MODULES_MANAGE, PERMISSIONS.TENANT_IMPERSONATE,
    PERMISSIONS.BILLING_INVOICE_GENERATE, PERMISSIONS.BILLING_INVOICE_READ_ALL,
    PERMISSIONS.BILLING_PAYMENT_CONFIRM_BANK, PERMISSIONS.MODULE_GLOBAL_TOGGLE,
    PERMISSIONS.FEATURE_GLOBAL_TOGGLE, PERMISSIONS.MODULE_ACCESS,
  ],
  TENANT_ADMIN: [
    PERMISSIONS.TENANT_SELF_PROFILE_READ, PERMISSIONS.TENANT_SELF_PROFILE_UPDATE,
    PERMISSIONS.TENANT_USERS_MANAGE, PERMISSIONS.BILLING_INVOICE_READ_SELF,
    PERMISSIONS.BILLING_INVOICE_PAY_GATEWAY, PERMISSIONS.BILLING_INVOICE_PAY_BANK,
    PERMISSIONS.MODULE_ACCESS,
  ],
  EMPLOYEE: [PERMISSIONS.MODULE_ACCESS],
};

// ── Modules ───────────────────────────────────────────────────────────────────
export interface Module {
  id: string; key: string; name: string; description: string;
  globalEnabled: boolean; basePrice: number; icon: string;
  category: 'core' | 'marketing' | 'analytics' | 'communication';
}

export const MOCK_MODULES: Module[] = [
  { id: 'm1',  key: 'social_media',        name: 'Social Media Management',      description: 'Schedule, publish, and analyse social posts across all platforms.',                    globalEnabled: true, basePrice: 200, icon: '📱', category: 'marketing' },
  { id: 'm2',  key: 'content_studio',      name: 'AI Content Studio',             description: 'Generate and manage AI-powered marketing content with approval workflow.',              globalEnabled: true, basePrice: 300, icon: '✨', category: 'marketing' },
  { id: 'm3',  key: 'analytics',           name: 'Analytics Dashboard',           description: 'Real-time engagement analytics, audience insights, and ROI tracking.',                 globalEnabled: true, basePrice: 150, icon: '📊', category: 'analytics' },
  { id: 'm4',  key: 'vcard',               name: 'Digital vCard Generator',       description: 'Create and manage professional digital business cards.',                                globalEnabled: true, basePrice: 100, icon: '🪪', category: 'core' },
  { id: 'm5',  key: 'email_marketing',     name: 'Email Marketing',               description: 'Campaign builder, automation, drip sequences, and deliverability tools.',               globalEnabled: true, basePrice: 250, icon: '📧', category: 'communication' },
  { id: 'm6',  key: 'seo_toolkit',         name: 'SEO Toolkit',                   description: 'Keyword research, rank tracking, and on-page optimisation audit.',                     globalEnabled: true, basePrice: 200, icon: '🔍', category: 'marketing' },
  { id: 'm7',  key: 'sem',                 name: 'Search Engine Marketing (SEM)', description: 'Paid search advertising campaigns on Google, Bing, and more.',                        globalEnabled: true, basePrice: 350, icon: '💰', category: 'marketing' },
  { id: 'm8',  key: 'content_marketing',   name: 'Content Marketing',             description: 'Blog posts, articles, whitepapers, case studies, and infographics.',                   globalEnabled: true, basePrice: 180, icon: '📝', category: 'marketing' },
  { id: 'm9',  key: 'display_advertising', name: 'Display Advertising',           description: 'Banner ads, rich media ads, and programmatic display campaigns.',                       globalEnabled: true, basePrice: 280, icon: '🖼️', category: 'marketing' },
  { id: 'm10', key: 'affiliate_marketing', name: 'Affiliate Marketing',           description: 'Partner and affiliate programme management and content creation.',                       globalEnabled: true, basePrice: 220, icon: '🤝', category: 'marketing' },
  { id: 'm11', key: 'video_marketing',     name: 'Video Marketing',               description: 'YouTube, Vimeo, and OTT platform video content strategy and production.',               globalEnabled: true, basePrice: 320, icon: '🎬', category: 'marketing' },
  { id: 'm12', key: 'mobile_marketing',    name: 'Mobile Marketing',              description: 'SMS, push notifications, in-app advertising, and mobile-first campaigns.',              globalEnabled: true, basePrice: 200, icon: '📲', category: 'communication' },
  { id: 'm13', key: 'programmatic_ads',    name: 'Programmatic Advertising',      description: 'Automated ad buying across networks using DSPs and real-time bidding.',                 globalEnabled: true, basePrice: 400, icon: '🤖', category: 'marketing' },
  { id: 'm14', key: 'influencer',          name: 'Influencer Marketing',          description: 'Influencer partnerships, UGC campaigns, and brand ambassador programmes.',               globalEnabled: true, basePrice: 280, icon: '⭐', category: 'marketing' },
  { id: 'm15', key: 'podcast_audio',       name: 'Podcast & Audio Marketing',     description: 'Podcast production, audio ads, and Spotify / Apple Music campaigns.',                   globalEnabled: true, basePrice: 250, icon: '🎙️', category: 'marketing' },
  { id: 'm16', key: 'webinars_events',     name: 'Webinars & Virtual Events',     description: 'Live webinars, virtual conferences, and online workshop content.',                      globalEnabled: true, basePrice: 300, icon: '🎥', category: 'marketing' },
  { id: 'm17', key: 'pr_media',            name: 'Public Relations & Media',      description: 'Press releases, media outreach, and brand reputation management.',                      globalEnabled: true, basePrice: 350, icon: '📰', category: 'communication' },
  { id: 'm18', key: 'content_scrapper',    name: 'Content Scrapper',              description: 'Scrape, curate, and repurpose content from the web to fuel your marketing pipeline.',   globalEnabled: true, basePrice: 180, icon: '🕷️', category: 'marketing' },
];

// ── Features ──────────────────────────────────────────────────────────────────
export interface Feature {
  id: string; key: string; name: string; moduleId: string;
  globalEnabled: boolean; rolloutNote: string;
}
export const MOCK_FEATURES: Feature[] = [
  { id: 'f1', key: 'ai_caption', name: 'AI Caption Generator', moduleId: 'm1', globalEnabled: true, rolloutNote: '100% rollout' },
  { id: 'f2', key: 'bulk_schedule', name: 'Bulk Post Scheduler', moduleId: 'm1', globalEnabled: true, rolloutNote: '100% rollout' },
  { id: 'f3', key: 'telegram_support', name: 'Telegram Channel Support', moduleId: 'm1', globalEnabled: true, rolloutNote: 'Beta – 50%' },
  { id: 'f4', key: 'content_approval', name: 'Multi-step Approval Workflow', moduleId: 'm2', globalEnabled: true, rolloutNote: '100% rollout' },
  { id: 'f5', key: 'gpt4_gen', name: 'GPT-4 Content Generation', moduleId: 'm2', globalEnabled: false, rolloutNote: 'Staged – 20%' },
  { id: 'f6', key: 'custom_reports', name: 'Custom Report Builder', moduleId: 'm3', globalEnabled: true, rolloutNote: '100% rollout' },
];

// ── Tenants ───────────────────────────────────────────────────────────────────
export interface Tenant {
  id: string; name: string; email: string; country: string; size: string;
  status: TenantStatus; plan: string; moduleIds: string[]; createdAt: string;
  mrr: number; adminName: string; adminEmail: string; taxId: string;
  billingAddress: string; logoUrl?: string; suspendedReason?: string;
}
export let MOCK_TENANTS: Tenant[] = [
  { id: 't1', name: 'Acme Corp', email: 'admin@acme.com', country: 'Malaysia', size: '51-200', status: 'active', plan: 'Growth', moduleIds: ['m1', 'm2', 'm3'], createdAt: '2024-03-15', mrr: 650, adminName: 'James Lim', adminEmail: 'james@acme.com', taxId: 'MY-123456789', billingAddress: 'Level 8, Menara Acme, KL, Malaysia', logoUrl: 'https://ui-avatars.com/api/?name=Acme+Corp&background=6366f1&color=fff' },
  { id: 't2', name: 'TechStart Sdn Bhd', email: 'admin@techstart.my', country: 'Malaysia', size: '11-50', status: 'active', plan: 'Starter', moduleIds: ['m1', 'm4'], createdAt: '2024-05-02', mrr: 300, adminName: 'Priya Nair', adminEmail: 'priya@techstart.my', taxId: 'MY-987654321', billingAddress: 'Unit 3A, TTDI, KL, Malaysia' },
  { id: 't3', name: 'GlobalRetail Pte Ltd', email: 'admin@globalretail.sg', country: 'Singapore', size: '201-500', status: 'suspended', plan: 'Enterprise', moduleIds: ['m1', 'm2', 'm3', 'm6'], createdAt: '2024-01-10', mrr: 850, adminName: 'David Tan', adminEmail: 'david@globalretail.sg', taxId: 'SG-G12345678J', billingAddress: '10 Anson Road, Singapore', suspendedReason: 'Overdue invoice — 45 days past due' },
  { id: 't4', name: 'SmallBiz HQ', email: 'admin@smallbizhq.com', country: 'Philippines', size: '1-10', status: 'active', plan: 'Starter', moduleIds: ['m4'], createdAt: '2024-08-20', mrr: 100, adminName: 'Maria Santos', adminEmail: 'maria@smallbizhq.com', taxId: 'PH-123-456-789', billingAddress: 'Makati City, Philippines' },
  { id: 't5', name: 'InnovateCo', email: 'admin@innovateco.io', country: 'Australia', size: '11-50', status: 'active', plan: 'Growth', moduleIds: ['m1', 'm2', 'm5', 'm6'], createdAt: '2024-06-30', mrr: 950, adminName: 'Lisa Chen', adminEmail: 'lisa@innovateco.io', taxId: 'AU-ABN123456', billingAddress: 'Level 12, 120 Collins St, Melbourne, VIC 3000' },
];

// ── Pending Requests ──────────────────────────────────────────────────────────
export interface PendingRequest {
  id: string; companyName: string; contactName: string; contactEmail: string;
  country: string; size: string; requestedModules: string[]; notes: string;
  status: RequestStatus; createdAt: string; rejectedReason?: string;
}
export let MOCK_REQUESTS: PendingRequest[] = [
  { id: 'req1', companyName: 'FutureFin Group', contactName: 'Ahmad Rashid', contactEmail: 'ahmad@futurefin.com', country: 'Malaysia', size: '51-200', requestedModules: ['m1', 'm2', 'm3'], notes: 'Looking to streamline our entire digital marketing pipeline.', status: 'pending', createdAt: '2025-02-20' },
  { id: 'req2', companyName: 'NexaHealth', contactName: 'Tan Wei Ming', contactEmail: 'weiming@nexahealth.sg', country: 'Singapore', size: '11-50', requestedModules: ['m4', 'm3'], notes: 'Need digital vCard for sales team + analytics.', status: 'pending', createdAt: '2025-02-22' },
  { id: 'req3', companyName: 'CloudPivot', contactName: 'Sarah Williams', contactEmail: 'sarah@cloudpivot.io', country: 'Australia', size: '1-10', requestedModules: ['m1'], notes: '', status: 'approved', createdAt: '2025-02-10' },
  { id: 'req4', companyName: 'SpamBots Inc', contactName: 'Robot', contactEmail: 'bot@spam.net', country: 'Unknown', size: '1-10', requestedModules: [], notes: 'Buy cheap followers!!!', status: 'rejected', createdAt: '2025-02-05', rejectedReason: 'Suspected spam / invalid business info' },
];

// ── Tenant Users ──────────────────────────────────────────────────────────────
export interface TenantUser {
  id: string; tenantId: string; name: string; email: string;
  role: RoleType; status: UserStatus; joinedAt: string; lastLogin?: string;
  avatar?: string;
}
export let MOCK_TENANT_USERS: TenantUser[] = [
  { id: 'u1', tenantId: 't1', name: 'James Lim', email: 'james@acme.com', role: 'TENANT_ADMIN', status: 'active', joinedAt: '2024-03-15', lastLogin: '2025-02-23', avatar: 'https://ui-avatars.com/api/?name=James+Lim&background=14b8a6&color=fff' },
  { id: 'u2', tenantId: 't1', name: 'Mei Ling', email: 'mei@acme.com', role: 'EMPLOYEE', status: 'active', joinedAt: '2024-04-01', lastLogin: '2025-02-24' },
  { id: 'u3', tenantId: 't1', name: 'Ravi Kumar', email: 'ravi@acme.com', role: 'EMPLOYEE', status: 'active', joinedAt: '2024-04-15', lastLogin: '2025-02-20' },
  { id: 'u4', tenantId: 't1', name: 'Siti Nur', email: 'siti@acme.com', role: 'EMPLOYEE', status: 'pending_invite', joinedAt: '2025-02-22' },
  { id: 'u5', tenantId: 't2', name: 'Priya Nair', email: 'priya@techstart.my', role: 'TENANT_ADMIN', status: 'active', joinedAt: '2024-05-02', lastLogin: '2025-02-24' },
  { id: 'u6', tenantId: 't2', name: 'Dev Team', email: 'dev@techstart.my', role: 'EMPLOYEE', status: 'active', joinedAt: '2024-05-10' },
  { id: 'u7', tenantId: 't3', name: 'David Tan', email: 'david@globalretail.sg', role: 'TENANT_ADMIN', status: 'inactive', joinedAt: '2024-01-10', lastLogin: '2025-01-05' },
];

// ── Invoices ──────────────────────────────────────────────────────────────────
export interface InvoiceLine {
  id: string; description: string; quantity: number; unitPrice: number; total: number;
}
export interface Invoice {
  id: string; invoiceNumber: string; tenantId: string; tenantName: string;
  period: string; status: InvoiceStatus; subtotal: number; tax: number; total: number;
  dueDate: string; issuedAt: string; paidAt?: string;
  paymentMethod: PaymentMethod; receiptUrl?: string; notes?: string;
  lines: InvoiceLine[];
}
export let MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv1', invoiceNumber: 'INV-2025-001', tenantId: 't1', tenantName: 'Acme Corp',
    period: '2025-02', status: 'sent', subtotal: 650, tax: 65, total: 715,
    dueDate: '2025-03-15', issuedAt: '2025-03-01', paymentMethod: 'none',
    lines: [
      { id: 'l1', description: 'Social Media Management', quantity: 1, unitPrice: 200, total: 200 },
      { id: 'l2', description: 'AI Content Studio', quantity: 1, unitPrice: 300, total: 300 },
      { id: 'l3', description: 'Analytics Dashboard', quantity: 1, unitPrice: 150, total: 150 },
    ]
  },
  {
    id: 'inv2', invoiceNumber: 'INV-2025-002', tenantId: 't1', tenantName: 'Acme Corp',
    period: '2025-01', status: 'paid', subtotal: 650, tax: 65, total: 715,
    dueDate: '2025-02-15', issuedAt: '2025-02-01', paidAt: '2025-02-10',
    paymentMethod: 'gateway',
    lines: [
      { id: 'l4', description: 'Social Media Management', quantity: 1, unitPrice: 200, total: 200 },
      { id: 'l5', description: 'AI Content Studio', quantity: 1, unitPrice: 300, total: 300 },
      { id: 'l6', description: 'Analytics Dashboard', quantity: 1, unitPrice: 150, total: 150 },
    ]
  },
  {
    id: 'inv3', invoiceNumber: 'INV-2025-003', tenantId: 't2', tenantName: 'TechStart Sdn Bhd',
    period: '2025-02', status: 'paid', subtotal: 300, tax: 18, total: 318,
    dueDate: '2025-03-15', issuedAt: '2025-03-01', paidAt: '2025-03-08',
    paymentMethod: 'bank_transfer', receiptUrl: '/mock-receipt.pdf',
    lines: [
      { id: 'l7', description: 'Social Media Management', quantity: 1, unitPrice: 200, total: 200 },
      { id: 'l8', description: 'Digital vCard Generator', quantity: 1, unitPrice: 100, total: 100 },
    ]
  },
  {
    id: 'inv4', invoiceNumber: 'INV-2025-004', tenantId: 't3', tenantName: 'GlobalRetail Pte Ltd',
    period: '2025-02', status: 'overdue', subtotal: 850, tax: 85, total: 935,
    dueDate: '2025-02-28', issuedAt: '2025-02-01', paymentMethod: 'none',
    lines: [
      { id: 'l9', description: 'Social Media Management', quantity: 1, unitPrice: 200, total: 200 },
      { id: 'l10', description: 'AI Content Studio', quantity: 1, unitPrice: 300, total: 300 },
      { id: 'l11', description: 'Analytics Dashboard', quantity: 1, unitPrice: 150, total: 150 },
      { id: 'l12', description: 'SEO Toolkit', quantity: 1, unitPrice: 200, total: 200 },
    ]
  },
  {
    id: 'inv5', invoiceNumber: 'INV-2025-005', tenantId: 't4', tenantName: 'SmallBiz HQ',
    period: '2025-02', status: 'sent', subtotal: 100, tax: 6, total: 106,
    dueDate: '2025-03-15', issuedAt: '2025-03-01', paymentMethod: 'none',
    lines: [
      { id: 'l13', description: 'Digital vCard Generator', quantity: 1, unitPrice: 100, total: 100 },
    ]
  },
  {
    id: 'inv6', invoiceNumber: 'INV-2025-006', tenantId: 't5', tenantName: 'InnovateCo',
    period: '2025-02', status: 'sent', subtotal: 950, tax: 95, total: 1045,
    dueDate: '2025-03-15', issuedAt: '2025-03-01', paymentMethod: 'bank_transfer',
    notes: 'Bank transfer proof uploaded — awaiting Super Admin confirmation.',
    lines: [
      { id: 'l14', description: 'Social Media Management', quantity: 1, unitPrice: 200, total: 200 },
      { id: 'l15', description: 'AI Content Studio', quantity: 1, unitPrice: 300, total: 300 },
      { id: 'l16', description: 'Email Marketing', quantity: 1, unitPrice: 250, total: 250 },
      { id: 'l17', description: 'SEO Toolkit', quantity: 1, unitPrice: 200, total: 200 },
    ]
  },
];

// ── Audit Logs ────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string; actorId: string; actorName: string; actorRole: RoleType;
  tenantId?: string; tenantName?: string; action: string; resource: string;
  detail: string; ip: string; createdAt: string; severity: 'info' | 'warning' | 'critical';
}
export const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: 'a1', actorId: 'sa1', actorName: 'Super Admin', actorRole: 'SUPER_ADMIN', tenantId: 't3', tenantName: 'GlobalRetail Pte Ltd', action: 'TENANT_SUSPENDED', resource: 'tenant', detail: 'Tenant suspended due to 45-day overdue invoice INV-2025-004', ip: '103.16.72.1', createdAt: '2025-02-24T09:15:00Z', severity: 'critical' },
  { id: 'a2', actorId: 'sa1', actorName: 'Super Admin', actorRole: 'SUPER_ADMIN', action: 'REQUEST_APPROVED', resource: 'pending_tenant', detail: 'Approved access request for CloudPivot; assigned Starter plan', ip: '103.16.72.1', createdAt: '2025-02-10T14:22:00Z', severity: 'info' },
  { id: 'a3', actorId: 'sa1', actorName: 'Super Admin', actorRole: 'SUPER_ADMIN', tenantId: 't5', tenantName: 'InnovateCo', action: 'MODULE_TOGGLE', resource: 'module', detail: 'Disabled Email Marketing module globally', ip: '103.16.72.1', createdAt: '2025-02-18T11:05:00Z', severity: 'warning' },
  { id: 'a4', actorId: 'u1', actorName: 'James Lim', actorRole: 'TENANT_ADMIN', tenantId: 't1', tenantName: 'Acme Corp', action: 'USER_INVITED', resource: 'user', detail: 'Invited siti@acme.com as EMPLOYEE', ip: '180.247.123.45', createdAt: '2025-02-22T16:40:00Z', severity: 'info' },
  { id: 'a5', actorId: 'u5', actorName: 'Priya Nair', actorRole: 'TENANT_ADMIN', tenantId: 't2', tenantName: 'TechStart Sdn Bhd', action: 'INVOICE_BANK_TRANSFER', resource: 'invoice', detail: 'Uploaded bank transfer proof for INV-2025-003', ip: '60.53.88.12', createdAt: '2025-03-05T10:30:00Z', severity: 'info' },
  { id: 'a6', actorId: 'sa1', actorName: 'Super Admin', actorRole: 'SUPER_ADMIN', tenantId: 't2', tenantName: 'TechStart Sdn Bhd', action: 'BANK_TRANSFER_CONFIRMED', resource: 'invoice', detail: 'Confirmed bank transfer for INV-2025-003; marked paid', ip: '103.16.72.1', createdAt: '2025-03-08T09:00:00Z', severity: 'info' },
  { id: 'a7', actorId: 'sa1', actorName: 'Super Admin', actorRole: 'SUPER_ADMIN', action: 'REQUEST_REJECTED', resource: 'pending_tenant', detail: 'Rejected request from SpamBots Inc — suspected spam', ip: '103.16.72.1', createdAt: '2025-02-05T08:45:00Z', severity: 'warning' },
  { id: 'a8', actorId: 'sa1', actorName: 'Super Admin', actorRole: 'SUPER_ADMIN', tenantId: 't1', tenantName: 'Acme Corp', action: 'IMPERSONATE_START', resource: 'session', detail: 'Started impersonation session for Acme Corp', ip: '103.16.72.1', createdAt: '2025-02-19T14:10:00Z', severity: 'warning' },
];

// ── Usage Stats ───────────────────────────────────────────────────────────────
export interface UsageDataPoint { period: string; posts: number; content: number; api: number; users: number; }
export const MOCK_USAGE_DATA: UsageDataPoint[] = [
  { period: 'Aug', posts: 420, content: 180, api: 3200, users: 45 },
  { period: 'Sep', posts: 580, content: 240, api: 4100, users: 52 },
  { period: 'Oct', posts: 710, content: 310, api: 5800, users: 61 },
  { period: 'Nov', posts: 650, content: 290, api: 5100, users: 58 },
  { period: 'Dec', posts: 890, content: 420, api: 7200, users: 74 },
  { period: 'Jan', posts: 760, content: 380, api: 6400, users: 68 },
  { period: 'Feb', posts: 920, content: 460, api: 8100, users: 82 },
];
export const MOCK_TENANT_USAGE: { [tenantId: string]: UsageDataPoint[] } = {
  t1: MOCK_USAGE_DATA.map(d => ({ ...d, posts: Math.round(d.posts * 0.35), content: Math.round(d.content * 0.4), api: Math.round(d.api * 0.3), users: 4 })),
  t2: MOCK_USAGE_DATA.map(d => ({ ...d, posts: Math.round(d.posts * 0.2), content: 0, api: Math.round(d.api * 0.15), users: 2 })),
};

// ── Mock Users for Login ──────────────────────────────────────────────────────
export const MOCK_AUTH_USERS = [
  { email: 'it@brandtelligence.com.my', password: 'Th1l155a@2506', role: 'SUPER_ADMIN' as RoleType, name: 'IT Admin',    tenantId: null },
  { email: 'james@acme.com',            password: 'tenant123',      role: 'TENANT_ADMIN' as RoleType, name: 'James Lim',  tenantId: 't1' },
  { email: 'sarah.chen@brandtelligence.my', password: 'emp123',     role: 'EMPLOYEE' as RoleType,    name: 'Sarah Chen', tenantId: 't1' },
];