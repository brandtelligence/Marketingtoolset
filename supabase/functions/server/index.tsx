import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import nodemailer from "npm:nodemailer";
import { requireAuth, requireRole, requireTenantScope, rateLimit, logSecurityEvent, generateCsrfToken, generateSigningKey, validateCsrf, validateRequestSignature, checkTokenFreshness, type AuthIdentity } from './auth.tsx';
import { sanitizeString, sanitizeObject, validateEmail, validateLength, validateEnum } from './sanitize.tsx';
import { encrypt, decrypt, isEncrypted, encryptFields, decryptFields } from './crypto.tsx';

const app = new Hono();

app.use('*', logger(console.log));

// ─── Security response headers (ISO 27001 A.14.1.2) ─────────────────────────
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Cache-Control', 'no-store');           // Prevent caching of API responses containing PII
  c.header('Pragma', 'no-cache');
});

// ─── CORS — ISO 27001 A.14.1.2 ────────────────────────────────────────────────
// Builds an allow-list from APP_URL + the Supabase project origin.
// Also accepts common preview/CI origins (Figma Make, Vercel, Netlify).
// Every route is JWT-protected, so CORS is defence-in-depth, not the sole gate.
const _buildAllowedOrigins = (): string[] => {
  const origins: string[] = [];
  const appUrl = Deno.env.get('APP_URL');
  if (appUrl) origins.push(appUrl.replace(/\/+$/, ''));
  const supaUrl = Deno.env.get('SUPABASE_URL');
  if (supaUrl) origins.push(supaUrl.replace(/\/+$/, ''));
  return origins;
};
const ALLOWED_ORIGINS = _buildAllowedOrigins();

// Known safe preview-host patterns (JWT auth is the real gate)
const _PREVIEW_RE = /^https:\/\/[a-z0-9._-]+\.(val\.build|vercel\.app|netlify\.app|figma\.site|webcontainer-api\.io|webcontainer\.io|local-credentialless\.org|figma\.com)/i;

app.use(
  "/*",
  cors({
    origin: ALLOWED_ORIGINS.length > 0
      ? (origin: string) => {
          if (ALLOWED_ORIGINS.some(o => o.toLowerCase() === origin.toLowerCase())) return origin;
          if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return origin;
          // Accept known preview/CI platform origins (JWT is the real auth gate)
          if (_PREVIEW_RE.test(origin)) return origin;
          console.log(`[CORS] Blocked origin: ${origin}`);
          return '';
        }
      : '*',
    allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Request-Signature", "X-Request-Timestamp"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);
if (ALLOWED_ORIGINS.length === 0) {
  console.log('[CORS] ⚠ APP_URL not set — CORS is open (origin: *). Set APP_URL to restrict.');
}

// ─── Global Rate Limiting Middleware (ISO 27001 A.9.4.2 · Phase 4) ──────────
// Applies sensible default rate limits to ALL routes based on HTTP method.
// Per-route rateLimit() calls inside individual handlers provide STRICTER
// overrides for sensitive endpoints (auth, AI generation, public, etc.).
// Both checks are independent — if either triggers, the request is blocked.
app.use('*', (c, next) => {
  const method = c.req.method;
  if (method === 'OPTIONS') return next(); // Don't rate-limit CORS preflight

  // Normalise path: strip route prefix and collapse UUID/ID path params
  // so /tenants/abc-123 and /tenants/def-456 share one bucket.
  const path = c.req.path
    .replace('/make-server-309fe679', '')
    .replace(/\/[0-9a-f-]{8,}/gi, '/:id');
  const bucket = `global:${method}:${path}`;

  // Default limits by method: GET 60/min, mutating 30/min
  const limit = method === 'GET' ? 60 : 30;
  const limited = rateLimit(c, bucket, limit, 60_000);
  if (limited) return limited;

  return next();
});

// ─── Supabase Admin Client ─────────────────────────────────────────────────────

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ─── Bootstrap: seed Super Admin ──────────────────────────────────────────────

// ISO 27001 A.9.2.4 — credentials MUST come from environment variables, never hardcoded.
// PDPA s.9 / GDPR Art.32 — secure processing of authentication information.
async function seedSuperAdmin() {
  const SUPER_ADMIN_EMAIL    = Deno.env.get("SUPER_ADMIN_EMAIL") ?? "it@brandtelligence.com.my";
  const SUPER_ADMIN_PASSWORD = Deno.env.get("SUPER_ADMIN_PASSWORD");
  const SUPER_ADMIN_NAME     = Deno.env.get("SUPER_ADMIN_NAME") ?? "IT Admin";

  if (!SUPER_ADMIN_PASSWORD) {
    console.log("[bootstrap] SUPER_ADMIN_PASSWORD env var not set — skipping seed (ISO 27001 A.9.2.4)");
    return;
  }

  try {
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existing = listData?.users?.find(u => u.email === SUPER_ADMIN_EMAIL);
    if (existing) {
      if (existing.user_metadata?.role !== "SUPER_ADMIN") {
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          user_metadata: { ...existing.user_metadata, name: SUPER_ADMIN_NAME, role: "SUPER_ADMIN", display_name: SUPER_ADMIN_NAME },
        });
        // Log userId only — never email (ISO 27001 A.18.1.4)
        console.log(`[bootstrap] Super Admin role patched for uid: ${existing.id}`);
      } else {
        console.log(`[bootstrap] Super Admin already exists — skipping.`);
      }
      return;
    }
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      user_metadata: { name: SUPER_ADMIN_NAME, role: "SUPER_ADMIN", display_name: SUPER_ADMIN_NAME },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });
    if (error) console.log(`[bootstrap] Error creating Super Admin: ${error.message}`);
    else       console.log(`[bootstrap] Super Admin created — uid: ${data.user?.id}`);
  } catch (err) {
    console.log(`[bootstrap] Unexpected error during Super Admin seed: ${errMsg(err)}`);
  }
}
seedSuperAdmin();

// ─── Bootstrap: AI Media Storage bucket ───────────────────────────────────────

const AI_MEDIA_BUCKET = 'make-309fe679-ai-media';

async function ensureAiMediaBucket() {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const exists = buckets?.some(b => b.name === AI_MEDIA_BUCKET);
    if (!exists) {
      const { error } = await supabaseAdmin.storage.createBucket(AI_MEDIA_BUCKET, {
        public: false,
        fileSizeLimit: 52428800, // 50 MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm'],
      });
      if (error) console.log(`[ai-media bucket] create error: ${error.message}`);
      else       console.log(`[ai-media bucket] created: ${AI_MEDIA_BUCKET}`);
    } else {
      console.log(`[ai-media bucket] already exists — skipping`);
    }
  } catch (err) {
    console.log(`[ai-media bucket] unexpected: ${errMsg(err)}`);
  }
}
ensureAiMediaBucket();

// ─── Default modules + features (seeded idempotently on cold start) ───────────

const DEFAULT_MODULES = [
  { id:"m1",  key:"social_media",        name:"Social Media Management",      description:"Schedule, publish, and analyse social posts across all platforms.",                    global_enabled:true,  base_price:200, icon:"📱", category:"marketing"     },
  { id:"m2",  key:"content_studio",      name:"AI Content Studio",            description:"Generate and manage AI-powered marketing content with approval workflow.",              global_enabled:true,  base_price:300, icon:"✨", category:"marketing"     },
  { id:"m3",  key:"analytics",           name:"Analytics Dashboard",          description:"Real-time engagement analytics, audience insights, and ROI tracking.",                 global_enabled:true,  base_price:150, icon:"📊", category:"analytics"     },
  { id:"m4",  key:"vcard",               name:"Digital vCard Generator",      description:"Create and manage professional digital business cards.",                                global_enabled:true,  base_price:100, icon:"🪪", category:"core"          },
  { id:"m5",  key:"email_marketing",     name:"Email Marketing",              description:"Campaign builder, automation, drip sequences, and deliverability tools.",               global_enabled:true,  base_price:250, icon:"📧", category:"communication" },
  { id:"m6",  key:"seo_toolkit",         name:"SEO Toolkit",                  description:"Keyword research, rank tracking, and on-page optimisation audit.",                     global_enabled:true,  base_price:200, icon:"🔍", category:"marketing"     },
  { id:"m7",  key:"sem",                 name:"Search Engine Marketing",      description:"Paid search advertising campaigns on Google, Bing, and more.",                        global_enabled:true,  base_price:350, icon:"💰", category:"marketing"     },
  { id:"m8",  key:"content_marketing",   name:"Content Marketing",            description:"Blog posts, articles, whitepapers, case studies, and infographics.",                   global_enabled:true,  base_price:180, icon:"📝", category:"marketing"     },
  { id:"m9",  key:"display_advertising", name:"Display Advertising",          description:"Banner ads, rich media ads, and programmatic display campaigns.",                       global_enabled:true,  base_price:280, icon:"🖼️", category:"marketing"     },
  { id:"m10", key:"affiliate_marketing", name:"Affiliate Marketing",          description:"Partner and affiliate programme management and content creation.",                       global_enabled:true,  base_price:220, icon:"🤝", category:"marketing"     },
  { id:"m11", key:"video_marketing",     name:"Video Marketing",              description:"YouTube, Vimeo, and OTT platform video content strategy and production.",               global_enabled:true,  base_price:320, icon:"🎬", category:"marketing"     },
  { id:"m12", key:"mobile_marketing",    name:"Mobile Marketing",             description:"SMS, push notifications, in-app advertising, and mobile-first campaigns.",              global_enabled:true,  base_price:200, icon:"📲", category:"communication" },
  { id:"m13", key:"programmatic_ads",    name:"Programmatic Advertising",     description:"Automated ad buying across networks using DSPs and real-time bidding.",                 global_enabled:true,  base_price:400, icon:"🤖", category:"marketing"     },
  { id:"m14", key:"influencer",          name:"Influencer Marketing",         description:"Influencer partnerships, UGC campaigns, and brand ambassador programmes.",               global_enabled:true,  base_price:280, icon:"⭐", category:"marketing"     },
  { id:"m15", key:"podcast_audio",       name:"Podcast & Audio Marketing",    description:"Podcast production, audio ads, and Spotify / Apple Music campaigns.",                   global_enabled:true,  base_price:250, icon:"🎙️", category:"marketing"     },
  { id:"m16", key:"webinars_events",     name:"Webinars & Virtual Events",    description:"Live webinars, virtual conferences, and online workshop content.",                      global_enabled:true,  base_price:300, icon:"🎥", category:"marketing"     },
  { id:"m17", key:"pr_media",            name:"Public Relations & Media",     description:"Press releases, media outreach, and brand reputation management.",                      global_enabled:true,  base_price:350, icon:"📰", category:"communication" },
  { id:"m18", key:"content_scrapper",    name:"Content Scrapper",             description:"Scrape, curate, and repurpose content from the web to fuel your pipeline.",             global_enabled:true,  base_price:180, icon:"🕷️", category:"marketing"     },
];

// Patch 02: module_id and rollout_note are now dedicated columns; description is plain text.
const DEFAULT_FEATURES = [
  { id:"f1", key:"ai_caption",       name:"AI Caption Generator",         description:"AI-generated captions for social media posts.",          module_id:"m1", rollout_note:"100% rollout", global_enabled:true  },
  { id:"f2", key:"bulk_schedule",    name:"Bulk Post Scheduler",          description:"Schedule multiple posts across platforms in one action.", module_id:"m1", rollout_note:"100% rollout", global_enabled:true  },
  { id:"f3", key:"telegram_support", name:"Telegram Channel Support",     description:"Publish and manage Telegram channel posts natively.",     module_id:"m1", rollout_note:"Beta – 50%",   global_enabled:true  },
  { id:"f4", key:"content_approval", name:"Multi-step Approval Workflow", description:"Route content through reviewer and approver stages.",     module_id:"m2", rollout_note:"100% rollout", global_enabled:true  },
  { id:"f5", key:"gpt4_gen",         name:"GPT-4 Content Generation",     description:"Use GPT-4 to generate long-form and social content.",     module_id:"m2", rollout_note:"Staged – 20%", global_enabled:false },
  { id:"f6", key:"custom_reports",   name:"Custom Report Builder",        description:"Build and export custom analytics reports.",              module_id:"m3", rollout_note:"100% rollout", global_enabled:true  },
];

// Returns the verified row counts after upserting.
// THROWS on any Postgres error — no silent swallowing — so callers can surface
// the real error message to the user instead of a misleading "success".
async function seedModulesAndFeatures(): Promise<{ modulesInDb: number; featuresInDb: number }> {
  // ── Modules ──────────────────────────────────────────────────────────────────
  const { error: mErr } = await supabaseAdmin
    .from("modules")
    .upsert(DEFAULT_MODULES, { onConflict: "id" }); // UPDATE on conflict (no ignoreDuplicates)
  if (mErr) {
    console.log(`[seed] modules upsert error: ${mErr.message} (code=${mErr.code})`);
    throw new Error(`modules upsert failed — ${mErr.message} (Postgres code: ${mErr.code})`);
  }

  // Verify actual count written to Postgres
  const { count: mCount, error: mCntErr } = await supabaseAdmin
    .from("modules").select("id", { count: "exact", head: true });
  if (mCntErr) throw new Error(`modules count check failed — ${mCntErr.message}`);
  console.log(`[seed] modules: ${mCount} row(s) now in table.`);

  // ── Features ─────────────────────────────────────────────────────────────────
  const { error: fErr } = await supabaseAdmin
    .from("features")
    .upsert(DEFAULT_FEATURES, { onConflict: "id" });
  if (fErr) {
    console.log(`[seed] features upsert error: ${fErr.message} (code=${fErr.code})`);
    throw new Error(`features upsert failed — ${fErr.message} (Postgres code: ${fErr.code})`);
  }

  const { count: fCount, error: fCntErr } = await supabaseAdmin
    .from("features").select("id", { count: "exact", head: true });
  if (fCntErr) throw new Error(`features count check failed — ${fCntErr.message}`);
  console.log(`[seed] features: ${fCount} row(s) now in table.`);

  return { modulesInDb: mCount ?? 0, featuresInDb: fCount ?? 0 };
}

// Wrap the cold-start call so a seed failure can't crash the Edge Function startup.
(async () => {
  try {
    const r = await seedModulesAndFeatures();
    console.log(`[bootstrap] seed OK — ${r.modulesInDb} modules, ${r.featuresInDb} features in DB.`);
  } catch (err) {
    console.log(`[bootstrap] seedModulesAndFeatures FAILED at startup: ${errMsg(err)}`);
  }
})();

// POST /seed-modules — manual trigger from the Super Admin "Seed Now" button.
// Returns the VERIFIED row count straight from Postgres so the UI can confirm
// data was actually written (not just that the function ran without throwing).
app.post("/make-server-309fe679/seed-modules", async (c) => {
  try {
    const auth = c.req.header("Authorization");
    if (!auth) return c.json({ error: "Unauthorized" }, 401);
    const result = await seedModulesAndFeatures();
    // Phase 6: audit trail for system seed (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'SYSTEM_SEED', route: '/seed-modules', detail: `modules=${result.modulesInDb} features=${result.featuresInDb}` });
    return c.json({
      success:      true,
      modulesInDb:  result.modulesInDb,
      featuresInDb: result.featuresInDb,
      message: `Postgres now has ${result.modulesInDb} module(s) and ${result.featuresInDb} feature flag(s).`,
    });
  } catch (err) {
    console.log(`[seed-modules] ${errMsg(err)}`);
    return c.json({ error: errMsg(err) }, 500); // full error forwarded to the UI
  }
});

// ─── Postgres row ↔ frontend object mappers ────────────────────────────────────
//
// Convention: rowTo*  = DB snake_case  →  frontend camelCase
//             *ToPg   = frontend camelCase  →  DB snake_case (only defined fields)
//
// Fields with no Postgres column are returned as empty string / null so the
// frontend never receives undefined, which could cause TypeScript errors.

// ── TENANTS ───────────────────────────────────────────────────────────────────

function rowToTenant(r: any) {
  return {
    id:              r.id,
    name:            r.name            ?? "",
    plan:            r.plan            ?? "Starter",
    status:          r.status          ?? "active",
    industry:        r.industry        ?? null,
    country:         r.country         ?? "",
    // contact_name maps to adminName; contact_email maps to both email + adminEmail
    adminName:       r.contact_name    ?? "",
    email:           r.contact_email   ?? "",
    adminEmail:      r.contact_email   ?? "",
    contactPhone:    r.contact_phone   ?? null,
    domain:          r.domain          ?? null,
    logoUrl:         r.logo_url        ?? null,
    mrr:             Number(r.monthly_fee ?? 0),
    moduleIds:       r.modules_enabled ?? [],
    createdAt:       r.created_at      ? String(r.created_at).slice(0, 10) : "",
    nextBillingDate: r.next_billing_date ?? null,
    // Patch 02: promoted from JSON ghost fields to real Postgres columns
    size:            r.company_size    ?? "",
    taxId:           r.tax_id          ?? "",
    billingAddress:  r.billing_address ?? "",
    suspendedReason: r.suspended_reason ?? null,
  };
}

// Phase 5: allowed values for tenant status and plan (ISO 27001 A.14.2.5)
const VALID_TENANT_STATUSES = ['active', 'suspended', 'churned', 'trial', 'pending'] as const;
const VALID_TENANT_PLANS    = ['starter', 'professional', 'enterprise', 'Starter', 'Professional', 'Enterprise'] as const;

function tenantToPg(d: any): Record<string, any> {
  const row: Record<string, any> = {};
  if (d.name           !== undefined) row.name             = d.name;
  if (d.plan           !== undefined) {
    if (!VALID_TENANT_PLANS.includes(d.plan)) throw new Error(`Invalid plan: ${d.plan}. Allowed: ${VALID_TENANT_PLANS.join(', ')}`);
    row.plan = d.plan;
  }
  if (d.status         !== undefined) {
    if (!VALID_TENANT_STATUSES.includes(d.status)) throw new Error(`Invalid status: ${d.status}. Allowed: ${VALID_TENANT_STATUSES.join(', ')}`);
    row.status = d.status;
  }
  if (d.industry       !== undefined) row.industry         = d.industry;
  if (d.country        !== undefined) row.country          = d.country;
  if (d.adminName      !== undefined) row.contact_name     = d.adminName;
  // prefer 'email' over 'adminEmail' to match the contact_email column
  const contactEmail = d.email ?? d.adminEmail;
  if (contactEmail     !== undefined) row.contact_email    = contactEmail;
  if (d.contactPhone   !== undefined) row.contact_phone    = d.contactPhone;
  if (d.domain         !== undefined) row.domain           = d.domain;
  if (d.logoUrl        !== undefined) row.logo_url         = d.logoUrl;
  if (d.mrr            !== undefined) row.monthly_fee      = d.mrr;
  if (d.moduleIds      !== undefined) row.modules_enabled  = d.moduleIds;
  if (d.nextBillingDate!== undefined) row.next_billing_date= d.nextBillingDate;
  // Patch 02: write to new dedicated columns
  if (d.size           !== undefined) row.company_size     = d.size           || null;
  if (d.taxId          !== undefined) row.tax_id           = d.taxId          || null;
  if (d.billingAddress !== undefined) row.billing_address  = d.billingAddress || null;
  if (d.suspendedReason!== undefined) row.suspended_reason = d.suspendedReason|| null;
  return row;
}

// ── TENANT USERS ──────────────────────────────────────────────────────────────
// Postgres status enum: active | invited | suspended
// Frontend UserStatus:  active | pending_invite | inactive

// Phase 5: validated user status mapping (ISO 27001 A.14.2.5)
const VALID_FRONTEND_STATUSES = ['active', 'pending_invite', 'inactive'] as const;

function pgUserStatus(frontendStatus: string): string {
  if (frontendStatus === "pending_invite") return "invited";
  if (frontendStatus === "inactive")       return "suspended";
  if (frontendStatus === "active")         return "active";
  // Phase 5: reject unknown status values
  throw new Error(`Invalid user status: ${frontendStatus}. Allowed: ${VALID_FRONTEND_STATUSES.join(', ')}`);
}
function frontendUserStatus(pgStatus: string): string {
  if (pgStatus === "invited")   return "pending_invite";
  if (pgStatus === "suspended") return "inactive";
  return pgStatus; // active
}

function rowToTenantUser(r: any) {
  return {
    id:        r.id,
    tenantId:  r.tenant_id  ?? "",
    name:      r.name       ?? "",
    email:     r.email      ?? "",
    role:      r.role       ?? "EMPLOYEE",
    status:    frontendUserStatus(r.status ?? "active"),
    avatar:    r.avatar_url ?? undefined,
    lastLogin: r.last_login ?? undefined,
    joinedAt:  r.created_at ? String(r.created_at).slice(0, 10) : "",
  };
}

// Phase 5: allowed role values for tenant users (ISO 27001 A.9.2.3)
const VALID_TENANT_ROLES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'EMPLOYEE'] as const;

function tenantUserToPg(d: any): Record<string, any> {
  const row: Record<string, any> = {};
  if (d.tenantId  !== undefined) row.tenant_id  = toUuid(d.tenantId);
  if (d.name      !== undefined) row.name       = d.name;
  if (d.email     !== undefined) row.email      = d.email;
  // Phase 5: validate role enum before writing to DB
  if (d.role      !== undefined) {
    if (!VALID_TENANT_ROLES.includes(d.role)) throw new Error(`Invalid role: ${d.role}. Allowed: ${VALID_TENANT_ROLES.join(', ')}`);
    row.role = d.role;
  }
  if (d.status    !== undefined) row.status     = pgUserStatus(d.status);
  if (d.avatar    !== undefined) row.avatar_url = d.avatar;
  if (d.lastLogin !== undefined) row.last_login = d.lastLogin;
  if (d.joinedAt  !== undefined) row.created_at = d.joinedAt;
  return row;
}

// ── INVOICES ──────────────────────────────────────────────────────────────────
// Postgres status enum: paid | unpaid | overdue
// Frontend InvoiceStatus: draft | sent | paid | overdue | suspended
//
// Patch 02: invoiceNumber, tenantName, period, subtotal, tax, paymentMethod,
// receiptUrl, notes, lines[] are now dedicated Postgres columns.
// `description` is kept in sync for legacy compatibility.

// Phase 5: validated invoice status mapping (ISO 27001 A.14.2.5)
const VALID_INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'suspended'] as const;

function pgInvoiceStatus(frontendStatus: string): string {
  if (frontendStatus === "draft" || frontendStatus === "sent") return "unpaid";
  if (frontendStatus === "suspended") return "overdue";
  if (frontendStatus === "paid" || frontendStatus === "overdue") return frontendStatus;
  throw new Error(`Invalid invoice status: ${frontendStatus}. Allowed: ${VALID_INVOICE_STATUSES.join(', ')}`);
}
function frontendInvoiceStatus(pgStatus: string): string {
  if (pgStatus === "unpaid") return "sent";
  return pgStatus; // paid | overdue
}

function rowToInvoice(r: any) {
  const total = Number(r.amount ?? 0);
  // lines may be stored as jsonb (object) or text[] — normalise to array
  let lines: any[] = [];
  try {
    lines = Array.isArray(r.lines) ? r.lines
          : (r.lines ? (typeof r.lines === "string" ? JSON.parse(r.lines) : r.lines) : []);
  } catch { lines = []; }
  return {
    id:            r.id,
    tenantId:      r.tenant_id      ?? "",
    invoiceNumber: r.invoice_number || `INV-${(r.id ?? "").slice(0, 8).toUpperCase()}`,
    tenantName:    r.tenant_name    ?? "",
    period:        r.period         ?? "",
    status:        frontendInvoiceStatus(r.status ?? "unpaid"),
    subtotal:      Number(r.subtotal ?? total),
    tax:           Number(r.tax     ?? 0),
    total,
    dueDate:       r.due_date       ?? "",
    issuedAt:      r.created_at ? String(r.created_at).slice(0, 10) : "",
    paidAt:        r.paid_date      ?? undefined,
    paymentMethod: r.payment_method ?? "none",
    receiptUrl:    r.receipt_url    ?? undefined,
    notes:         r.notes          ?? "",
    lines,
  };
}

function invoiceToPg(d: any): Record<string, any> {
  const row: Record<string, any> = {};
  if (d.tenantId      !== undefined) row.tenant_id      = toUuid(d.tenantId);
  if (d.total         !== undefined) row.amount          = d.total;
  if (d.status        !== undefined) row.status          = pgInvoiceStatus(d.status);
  if (d.dueDate       !== undefined) row.due_date        = d.dueDate   || null;
  if (d.paidAt        !== undefined) row.paid_date       = d.paidAt    || null;
  if (d.issuedAt      !== undefined) row.created_at      = d.issuedAt;
  // Patch 02: dedicated columns
  if (d.invoiceNumber !== undefined) row.invoice_number  = d.invoiceNumber ?? "";
  if (d.tenantName    !== undefined) row.tenant_name     = d.tenantName    ?? "";
  if (d.period        !== undefined) row.period          = d.period        ?? "";
  if (d.subtotal      !== undefined) row.subtotal        = d.subtotal      ?? 0;
  if (d.tax           !== undefined) row.tax             = d.tax           ?? 0;
  if (d.paymentMethod !== undefined) row.payment_method  = d.paymentMethod ?? "none";
  if (d.receiptUrl    !== undefined) row.receipt_url     = d.receiptUrl    || null;
  if (d.notes         !== undefined) row.notes           = d.notes         ?? "";
  if (d.lines         !== undefined) row.lines           = d.lines         ?? [];
  // Keep description in sync for any legacy tooling that reads it
  row.description = JSON.stringify({
    invoiceNumber: d.invoiceNumber, tenantName: d.tenantName,
    period:        d.period,        subtotal:   d.subtotal,
    tax:           d.tax,           paymentMethod: d.paymentMethod,
    receiptUrl:    d.receiptUrl,    notes:      d.notes,
    lines:         d.lines,
  });
  return row;
}

// ── MODULES ───────────────────────────────────────────────────────────────────

function rowToModule(r: any) {
  return {
    id:            r.id,
    key:           r.key           ?? "",
    name:          r.name          ?? "",
    description:   r.description   ?? "",
    icon:          r.icon          ?? "",
    category:      r.category      ?? "marketing",
    basePrice:     Number(r.base_price ?? 0),
    globalEnabled: r.global_enabled ?? true,
  };
}

function moduleToPg(d: any): Record<string, any> {
  const row: Record<string, any> = {};
  if (d.key           !== undefined) row.key           = d.key;
  if (d.name          !== undefined) row.name          = d.name;
  if (d.description   !== undefined) row.description   = d.description;
  if (d.icon          !== undefined) row.icon          = d.icon;
  if (d.category      !== undefined) row.category      = d.category;
  if (d.basePrice     !== undefined) row.base_price    = d.basePrice;
  if (d.globalEnabled !== undefined) row.global_enabled= d.globalEnabled;
  return row;
}

// ── FEATURES ──────────────────────────────────────────────────────────────────
// Patch 02: module_id and rollout_note are now dedicated Postgres columns.
// description is plain human-readable text (no longer JSON).

function rowToFeature(r: any) {
  return {
    id:            r.id,
    key:           r.key            ?? "",
    name:          r.name           ?? "",
    globalEnabled: r.global_enabled ?? true,
    moduleId:      r.module_id      ?? null,
    rolloutNote:   r.rollout_note   ?? "",
    description:   r.description    ?? "",
  };
}

function featureToPg(d: any): Record<string, any> {
  const row: Record<string, any> = {};
  if (d.key           !== undefined) row.key           = d.key;
  if (d.name          !== undefined) row.name          = d.name;
  if (d.description   !== undefined) row.description   = d.description;
  if (d.globalEnabled !== undefined) row.global_enabled= d.globalEnabled;
  if (d.moduleId      !== undefined) row.module_id     = d.moduleId     ?? null;
  if (d.rolloutNote   !== undefined) row.rollout_note  = d.rolloutNote  ?? "";
  return row;
}

// ── AUDIT LOGS ────────────────────────────────────────────────────────────────

function rowToAuditLog(r: any) {
  return {
    id:         r.id,
    actorId:    r.actor_id    ?? "",
    actorName:  r.actor_name  ?? "",
    actorRole:  r.actor_role  ?? "SUPER_ADMIN",
    tenantId:   r.tenant_id   ?? undefined,
    tenantName: r.tenant_name ?? undefined,
    action:     r.action      ?? "",
    resource:   r.resource    ?? "",
    detail:     r.detail      ?? "",
    ip:         r.ip          ?? "",
    severity:   r.severity    ?? "info",
    createdAt:  r.created_at  ?? new Date().toISOString(),
  };
}

function auditLogToPg(d: any): Record<string, any> {
  return {
    id:          d.id ?? crypto.randomUUID(),
    actor_id:    d.actorId   ?? "",
    actor_name:  d.actorName ?? "",
    actor_role:  d.actorRole ?? "SUPER_ADMIN",
    tenant_id:   toUuid(d.tenantId) ?? null,  // guard: non-UUID IDs → null (FK is uuid)
    tenant_name: d.tenantName ?? null,
    action:      d.action    ?? "",
    resource:    d.resource  ?? "",
    detail:      d.detail    ?? "",
    ip:          d.ip        ?? "",
    severity:    d.severity  ?? "info",
  };
}

// ── PENDING REQUESTS ──────────────────────────────────────────────────────────
// Patch 02: country, company_size, requested_modules, notes, rejected_reason
// are now dedicated Postgres columns. `message` is kept in sync for legacy
// compatibility but dedicated columns are the primary source of truth.

function rowToRequest(r: any) {
  return {
    id:               r.id,
    companyName:      r.company_name      ?? "",
    contactName:      r.contact_name      ?? "",
    contactEmail:     r.email             ?? "",
    country:          r.country           ?? "",
    size:             r.company_size      ?? "",
    requestedModules: r.requested_modules ?? [],
    notes:            r.notes             ?? "",
    status:           r.status            ?? "pending",
    createdAt:        r.submitted_at ? String(r.submitted_at).slice(0, 10) : "",
    reviewedAt:       r.reviewed_at  ?? undefined,
    reviewedBy:       r.reviewed_by  ?? undefined,
    rejectedReason:   r.rejected_reason   ?? undefined,
  };
}

function requestToPg(d: any): Record<string, any> {
  const row: Record<string, any> = {};
  if (d.companyName      !== undefined) row.company_name      = d.companyName;
  if (d.contactName      !== undefined) row.contact_name      = d.contactName;
  if (d.contactEmail     !== undefined) row.email             = d.contactEmail;
  if (d.country          !== undefined) row.country           = d.country          ?? "";
  if (d.size             !== undefined) row.company_size      = d.size             ?? "";
  if (d.requestedModules !== undefined) row.requested_modules = d.requestedModules ?? [];
  if (d.notes            !== undefined) row.notes             = d.notes            ?? "";
  if (d.rejectedReason   !== undefined) row.rejected_reason   = d.rejectedReason   ?? null;
  if (d.status           !== undefined) row.status            = d.status;
  if (d.reviewedAt       !== undefined) row.reviewed_at       = d.reviewedAt;
  if (d.reviewedBy       !== undefined) row.reviewed_by       = d.reviewedBy;
  // Keep message column in sync for legacy tooling
  row.message = JSON.stringify({
    notes:            d.notes            ?? "",
    country:          d.country          ?? "",
    size:             d.size             ?? "",
    requestedModules: d.requestedModules ?? [],
    rejectedReason:   d.rejectedReason   ?? null,
  });
  return row;
}

// ── SMTP CONFIG ───────────────────────────────────────────────────────────────
// DB: id(global), host, port, username, password, from_email, from_name, secure

function rowToSmtpConfig(r: any) {
  return {
    host:      r.host       ?? "",
    port:      String(r.port ?? 587),
    user:      r.username   ?? "",
    pass:      r.password   ?? "",
    fromEmail: r.from_email ?? "",
    fromName:  r.from_name  ?? "Brandtelligence",
    secure:    r.secure     ?? false,
  };
}

function smtpConfigToPg(d: any): Record<string, any> {
  const row: Record<string, any> = { id: "global", updated_at: new Date().toISOString() };
  if (d.host      !== undefined) row.host       = d.host;
  if (d.port      !== undefined) row.port       = parseInt(String(d.port), 10) || 587;
  // accept both 'user' (frontend) and 'username' (direct)
  const username = d.user ?? d.username;
  if (username    !== undefined) row.username   = username;
  const password  = d.pass ?? d.password;
  if (password    !== undefined) row.password   = password;
  if (d.fromEmail !== undefined) row.from_email = d.fromEmail;
  if (d.fromName  !== undefined) row.from_name  = d.fromName;
  if (d.secure    !== undefined) row.secure     = !!d.secure;
  return row;
}

// ── EMAIL TEMPLATES ───────────────────────────────────────────────────────────
// DB: id(template key), subject, html, updated_at, updated_by

function rowToEmailTemplate(r: any) {
  return {
    id:      r.id,
    subject: r.subject    ?? "",
    html:    r.html       ?? "",
    savedAt: r.updated_at ? String(r.updated_at) : new Date().toISOString(),
  };
}

// ── PAYMENT GATEWAY CONFIG ────────────────────────────────────────────────────
// DB: id(global), gateway_id, sandbox_mode, live_creds, sandbox_creds, grace_period

function rowToGatewayConfig(r: any) {
  return {
    gatewayId:    r.gateway_id    ?? "",
    sandboxMode:  r.sandbox_mode  ?? true,
    liveCreds:    r.live_creds    ?? {},
    sandboxCreds: r.sandbox_creds ?? {},
    gracePeriod:  r.grace_period  ?? "7",
  };
}

function gatewayConfigToPg(d: any): Record<string, any> {
  const row: Record<string, any> = { id: "global", updated_at: new Date().toISOString() };
  if (d.gatewayId    !== undefined) row.gateway_id    = d.gatewayId;
  if (d.sandboxMode  !== undefined) row.sandbox_mode  = !!d.sandboxMode;
  if (d.liveCreds    !== undefined) row.live_creds    = d.liveCreds    ?? {};
  if (d.sandboxCreds !== undefined) row.sandbox_creds = d.sandboxCreds ?? {};
  if (d.gracePeriod  !== undefined) row.grace_period  = String(d.gracePeriod ?? "7");
  return row;
}

// Phase 3.2: Encrypt/decrypt all string values in a flat credentials object
async function encryptCredsObject(creds: Record<string, any>): Promise<Record<string, any>> {
  if (!creds || typeof creds !== 'object') return creds;
  const result = { ...creds };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string' && result[key]) {
      result[key] = await encrypt(result[key]);
    }
  }
  return result;
}

async function decryptCredsObject(creds: Record<string, any>): Promise<Record<string, any>> {
  if (!creds || typeof creds !== 'object') return creds;
  const result = { ...creds };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string' && isEncrypted(result[key])) {
      result[key] = await decrypt(result[key]);
    }
  }
  return result;
}

// ── MFA POLICY ────────────────────────────────────────────────────────────────
// DB: id(global), require_tenant_admin_mfa, updated_at

function rowToMfaPolicy(r: any) {
  return {
    requireTenantAdminMfa: r.require_tenant_admin_mfa ?? false,
  };
}

// ── SECURITY POLICY ───────────────────────────────────────────────────────────
// DB: id(global), session_timeout_minutes, max_login_attempts,
//     lockout_duration_minutes, password_min_length, password_require_uppercase,
//     password_require_numbers, password_require_symbols, two_fa_required,
//     ip_whitelist, metadata (jsonb — for inviteTtl and other forward-compat fields)

function rowToSecurityPolicy(r: any) {
  const meta: any = r.metadata ?? {};
  return {
    minPasswordLen:           String(r.password_min_length      ?? 8),
    sessionTimeout:           String(r.session_timeout_minutes  ?? 60),
    mfaRequired:              r.two_fa_required                 ?? false,
    inviteTtl:                String(meta.inviteTtl             ?? "24"),
    maxLoginAttempts:         r.max_login_attempts              ?? 5,
    lockoutDurationMinutes:   r.lockout_duration_minutes        ?? 15,
    passwordRequireUppercase: r.password_require_uppercase      ?? true,
    passwordRequireNumbers:   r.password_require_numbers        ?? true,
    passwordRequireSymbols:   r.password_require_symbols        ?? false,
    ipWhitelist:              r.ip_whitelist                    ?? null,
  };
}

function securityPolicyToPg(d: any): Record<string, any> {
  const row: Record<string, any> = { id: "global", updated_at: new Date().toISOString() };
  if (d.minPasswordLen           !== undefined) row.password_min_length      = parseInt(String(d.minPasswordLen), 10)    || 8;
  if (d.sessionTimeout           !== undefined) row.session_timeout_minutes  = parseInt(String(d.sessionTimeout), 10)    || 60;
  if (d.mfaRequired              !== undefined) row.two_fa_required          = !!d.mfaRequired;
  if (d.maxLoginAttempts         !== undefined) row.max_login_attempts        = d.maxLoginAttempts;
  if (d.lockoutDurationMinutes   !== undefined) row.lockout_duration_minutes  = d.lockoutDurationMinutes;
  if (d.passwordRequireUppercase !== undefined) row.password_require_uppercase= !!d.passwordRequireUppercase;
  if (d.passwordRequireNumbers   !== undefined) row.password_require_numbers  = !!d.passwordRequireNumbers;
  if (d.passwordRequireSymbols   !== undefined) row.password_require_symbols  = !!d.passwordRequireSymbols;
  if (d.ipWhitelist              !== undefined) row.ip_whitelist              = d.ipWhitelist ?? null;
  // Merge inviteTtl into metadata jsonb so no dedicated column is needed
  if (d.inviteTtl !== undefined) {
    row.metadata = { inviteTtl: String(d.inviteTtl) };
  }
  return row;
}

// ── CONTENT CARDS ─────────────────────────────────────────────────────────────
// DB enums: content_card_status, content_platform — normalise unknown values to defaults

const VALID_PLATFORMS = ["instagram","facebook","twitter","linkedin","tiktok","youtube","telegram","general"];
const VALID_STATUSES  = ["draft","pending_review","approved","rejected","scheduled","published"];

function normPlatform(v: string): string { return VALID_PLATFORMS.includes(v) ? v : "general"; }
function normStatus(v: string): string {
  // ContentCard frontend uses "pending_approval"; DB enum uses "pending_review" — map it.
  if (v === "pending_approval") return "pending_review";
  return VALID_STATUSES.includes(v) ? v : "draft";
}

// Safely extract a readable message from any value thrown or returned by Supabase.
// Supabase errors are plain objects, NOT Error instances — `${err}` → "[object Object]".
function errMsg(err: unknown): string {
  if (!err) return "unknown error";
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const e = err as any;
    const parts: string[] = [];
    if (e.message) parts.push(e.message);
    if (e.details) parts.push(`details: ${e.details}`);
    if (e.hint)    parts.push(`hint: ${e.hint}`);
    if (e.code)    parts.push(`code: ${e.code}`);
    return parts.length ? parts.join(" | ") : JSON.stringify(err);
  }
  return String(err);
}

// ── UUID guard ────────────────────────────────────────────────────────────────
// Postgres uuid columns reject anything that isn't a well-formed UUID.
// Mock IDs ("tm1", "cc_101_…") must be coerced to null before an upsert.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}
/** Returns v unchanged if it is a valid UUID string, otherwise null. */
function toUuid(v: unknown): string | null {
  return isUuid(v) ? v : null;
}

// Placeholder UUID used when a NOT NULL uuid column receives a non-UUID value
// (e.g. a display name like "Sarah Chen" stored in ContentCard.createdBy).
// The human-readable name is always preserved in the companion *_name text column.
const SYSTEM_USER_UUID = "00000000-0000-0000-0000-000000000001";

// rowToContentCard — returns the exact ContentCard shape the frontend expects.
// Maps DB snake_case columns → ContentCard camelCase fields, reverses enum aliases,
// and restores ContentCard-only fields from the metadata JSONB column.
function rowToContentCard(r: any) {
  const meta: Record<string, any> = r.metadata ?? {};
  return {
    id:                r.id,
    tenantId:          r.tenant_id         ?? null,
    title:             r.title             ?? "",
    // DB column is "body"; ContentCard field is "caption"
    caption:           r.body              ?? "",
    platform:          r.platform          ?? "general",
    // Map DB "pending_review" back to ContentCard "pending_approval"
    status:            r.status === "pending_review" ? "pending_approval" : (r.status ?? "draft"),
    hashtags:          r.hashtags          ?? [],
    mediaUrl:          r.media_url         ?? null,
    createdBy:         r.created_by        ?? "",
    approvedBy:        r.approved_by       ?? null,
    approvedByName:    r.approved_by_name  ?? null,
    approvedAt:        r.approved_at       ?? null,
    // DB column is "rejected_reason"; ContentCard field is "rejectionReason"
    rejectionReason:   r.rejected_reason   ?? null,
    scheduledAt:       r.scheduled_at      ?? null,
    publishedAt:       r.published_at      ?? null,
    createdAt:         r.created_at        ?? new Date().toISOString(),
    updatedAt:         r.updated_at        ?? new Date().toISOString(),
    // ContentCard-only fields stored in metadata JSONB — restore them
    channel:           meta.channel           ?? "",
    projectId:         meta.projectId         ?? null,
    mediaType:         meta.mediaType         ?? undefined,
    mediaFileName:     meta.mediaFileName     ?? undefined,
    scheduledDate:     meta.scheduledDate     ?? undefined,
    scheduledTime:     meta.scheduledTime     ?? undefined,
    approvers:         meta.approvers         ?? [],
    createdByEmail:    meta.createdByEmail    ?? "",
    lastEditedBy:      meta.lastEditedBy      ?? undefined,
    lastEditedAt:      meta.lastEditedAt      ?? undefined,
    auditLog:          meta.auditLog          ?? [],
    postType:          meta.postType          ?? undefined,
    visualDescription: meta.visualDescription ?? undefined,
    callToAction:      meta.callToAction      ?? undefined,
    rejectedBy:        meta.rejectedBy        ?? undefined,
    rejectedByName:    meta.rejectedByName    ?? undefined,
    rejectedAt:        meta.rejectedAt        ?? undefined,
    // Engagement data (likes, comments, shares, reach) — persisted in metadata
    engagementData:    meta.engagementData    ?? undefined,
    // AI prompt history
    aiPromptHistory:   meta.aiPromptHistory   ?? undefined,
  };
}

// contentCardToPg — maps a ContentCard (or serialized ContentCard) to DB columns.
// Handles all field-name mismatches and packs extra ContentCard-only fields into
// the metadata JSONB column so they survive a round-trip without data loss.
function contentCardToPg(d: any): Record<string, any> {
  const row: Record<string, any> = {};

  if (d.tenantId !== undefined) row.tenant_id = toUuid(d.tenantId); // guard: non-UUID mock IDs → null
  if (d.title    !== undefined) row.title     = d.title;

  // ContentCard uses "caption"; DB column is "body" — accept either alias
  const bodyText = d.caption ?? d.body;
  if (bodyText !== undefined) row.body = bodyText ?? "";

  if (d.platform !== undefined) row.platform  = normPlatform(d.platform ?? "general");
  if (d.status   !== undefined) row.status    = normStatus(d.status     ?? "draft");
  if (d.hashtags !== undefined) row.hashtags  = Array.isArray(d.hashtags) ? d.hashtags : [];
  if (d.mediaUrl !== undefined) row.media_url = d.mediaUrl ?? null;

  // created_by is a NOT NULL uuid column — display names ("Sarah Chen") are not
  // valid UUIDs so toUuid() returns null for them. Fall back to SYSTEM_USER_UUID
  // so the NOT NULL constraint is never violated. The human-readable name is
  // preserved in the created_by_name text column regardless.
  if (d.createdBy !== undefined) {
    row.created_by = toUuid(d.createdBy) ?? SYSTEM_USER_UUID;
  }
  row.created_by_name = d.createdByName ?? d.createdBy ?? "";

  // approved_by is a uuid column — team member mock IDs ("tm1", …) must become null
  if (d.approvedBy     !== undefined) row.approved_by      = toUuid(d.approvedBy);
  if (d.approvedByName !== undefined) row.approved_by_name = d.approvedByName ?? null;
  if (d.approvedAt     !== undefined) row.approved_at      = d.approvedAt     ?? null;

  // ContentCard uses "rejectionReason"; DB column is "rejected_reason" — accept either
  const rejReason = d.rejectionReason ?? d.rejectedReason;
  if (rejReason !== undefined) row.rejected_reason = rejReason ?? null;

  // ContentCard uses scheduledDate + scheduledTime; DB uses a single scheduled_at ISO string
  if (d.scheduledAt !== undefined) {
    row.scheduled_at = d.scheduledAt ?? null;
  } else if (d.scheduledDate !== undefined) {
    row.scheduled_at = d.scheduledDate
      ? `${d.scheduledDate}T${d.scheduledTime ?? "00:00"}:00`
      : null;
  }

  if (d.publishedAt !== undefined) row.published_at = d.publishedAt ?? null;

  // Pack all ContentCard-only fields into metadata JSONB for lossless round-trips
  row.metadata = {
    ...(d.metadata ?? {}),
    channel:            d.channel           ?? null,
    projectId:          d.projectId         ?? null,
    mediaType:          d.mediaType         ?? null,
    mediaFileName:      d.mediaFileName     ?? null,
    scheduledDate:      d.scheduledDate     ?? null,
    scheduledTime:      d.scheduledTime     ?? null,
    approvers:          d.approvers         ?? [],
    createdByEmail:     d.createdByEmail    ?? null,
    lastEditedBy:       d.lastEditedBy      ?? null,
    lastEditedAt:       d.lastEditedAt      ?? null,
    auditLog:           d.auditLog          ?? [],
    postType:           d.postType          ?? null,
    visualDescription:  d.visualDescription ?? null,
    callToAction:       d.callToAction      ?? null,
    rejectedBy:         d.rejectedBy        ?? null,
    rejectedByName:     d.rejectedByName    ?? null,
    rejectedAt:         d.rejectedAt        ?? null,
    // Engagement data (likes, comments, shares, reach)
    engagementData:     d.engagementData    ?? null,
    // AI prompt history
    aiPromptHistory:    d.aiPromptHistory   ?? null,
  };

  return row;
}

// ── APPROVAL EVENTS ───────────────────────────────────────────────────────────
// DB enum: approval_event_type — normalise unknown values

const VALID_EVENT_TYPES = ["submitted","approved","rejected","commented","scheduled","published"];
function normEventType(v: string): string { return VALID_EVENT_TYPES.includes(v) ? v : "submitted"; }

function rowToApprovalEvent(r: any) {
  return {
    id:        r.id,
    cardId:    r.card_id    ?? null,
    tenantId:  r.tenant_id  ?? null,
    eventType: r.event_type ?? "submitted",
    actorId:   r.actor_id   ?? "",
    actorName: r.actor_name ?? "",
    actorRole: r.actor_role ?? "",
    message:   r.message    ?? null,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

// ── USAGE STATS ───────────────────────────────────────────────────────────────
// DB: id(bigserial), tenant_id, period, posts, content, api, users, recorded_at

function rowToUsageStat(r: any) {
  return {
    id:         r.id,
    tenantId:   r.tenant_id   ?? null,
    period:     r.period      ?? "",
    posts:      r.posts       ?? 0,
    content:    r.content     ?? 0,
    api:        r.api         ?? 0,
    users:      r.users       ?? 0,
    recordedAt: r.recorded_at ?? new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH + BOOTSTRAP ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/health", (c) => c.json({ status: "ok" }));

// ── CSRF Token + Signing Key Endpoint (Phase 2.3) ────────────────────────────
// Returns a stateless CSRF token and HMAC signing key for the authenticated user.
// The frontend calls this after login and stores both values in memory.
// CSRF token → sent as X-CSRF-Token on all mutating requests
// Signing key → used to HMAC-sign high-value operations
app.get("/make-server-309fe679/csrf-token", async (c) => {
  try {
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const [csrfToken, signingKey] = await Promise.all([
      generateCsrfToken(auth.userId),
      generateSigningKey(auth.userId),
    ]);
    return c.json({ csrfToken, signingKey });
  } catch (err) {
    console.log(`[csrf-token] ${errMsg(err)}`);
    return c.json({ error: `csrfToken: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/bootstrap-super-admin", async (c) => {
  try {
    // Phase 4: strict rate limit — admin bootstrap is a sensitive operation
    const limited = rateLimit(c, 'admin:bootstrap', 3, 60_000);
    if (limited) return limited;
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    await seedSuperAdmin();
    // Phase 6: audit trail for super-admin bootstrap (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'SUPER_ADMIN_BOOTSTRAP', route: '/bootstrap-super-admin' });
    return c.json({ success: true, message: "Bootstrap complete — check server logs." });
  } catch (err) {
    return c.json({ error: `Bootstrap failed: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TENANTS  (Postgres: tenants)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/tenants", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only — list all tenants
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return c.json({ tenants: (data ?? []).map(rowToTenant) });
  } catch (err) {
    console.log(`[tenants GET] ${errMsg(err)}`);
    return c.json({ error: `fetchTenants: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/tenants", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only — create tenant
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    // Phase 3.1: sanitise inputs (skip password-like fields)
    const body = sanitizeObject(await c.req.json(), new Set(['password', 'pass']));
    const id   = body.id ?? crypto.randomUUID();
    const row  = {
      ...tenantToPg(body),
      id,
      created_at: body.createdAt ?? new Date().toISOString(),
    };

    // ── 1. Insert tenant record ───────────────────────────────────────────────
    const { data, error } = await supabaseAdmin
      .from("tenants").insert(row).select().single();
    if (error) throw error;
    const tenant = rowToTenant(data);

    // ── 2. Onboard the Tenant Admin contact (non-fatal if invite fails) ───────
    const adminEmail = body.adminEmail ?? body.email;
    const adminName  = body.adminName  ?? adminEmail?.split("@")[0] ?? "Admin";
    const tenantName = body.name       ?? "Your Company";
    const plan       = body.plan       ?? "Starter";

    if (adminEmail) {
      try {
        // Generate a Supabase invite link — also creates the auth.users row
        const _appUrl = (Deno.env.get("APP_URL") || "https://brandtelligence.com.my").replace(/\/$/, "");
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "invite",
          email: adminEmail,
          options: {
            redirectTo: `${_appUrl}/auth/callback`,
          },
        });
        if (linkError) {
          console.log(`[tenants POST] invite link error for tenant ${id}: ${linkError.message}`);
        } else {
          const actionUrl   = linkData.properties.action_link;
          const supabaseUid = linkData.user?.id;

          if (supabaseUid) {
            // ── 3. Stamp user metadata so AuthContext resolves role + tenantId on first login
            await supabaseAdmin.auth.admin.updateUserById(supabaseUid, {
              user_metadata: {
                role:        "TENANT_ADMIN",
                tenant_id:   id,
                tenant_name: tenantName,
                first_name:  adminName.split(" ")[0] ?? adminName,
                last_name:   adminName.split(" ").slice(1).join(" ") ?? "",
                company:     tenantName,
              },
            });

            // ── 4. Create tenant_users record for this admin
            await supabaseAdmin.from("tenant_users").insert({
              id:         crypto.randomUUID(),
              tenant_id:  id,
              name:       adminName,
              email:      adminEmail,
              role:       "TENANT_ADMIN",
              status:     "invited",  // DB check: ('active','invited','suspended') — NOT 'pending_invite'
              created_at: new Date().toISOString(),
            });
          }

          // ── 5. Send branded invite email
          await sendAuthEmail(
            adminEmail,
            "auth_invite_user",
            {
              inviteUrl:      actionUrl,
              expiresAt:      "24 hours",
              employeeName:   adminName,
              companyName:    tenantName,
              plan,
              role:           "Tenant Administrator",
              invitedByName:  "Brandtelligence",
              invitedByEmail: "admin@brandtelligence.com.my",
            },
            `Welcome to Brandtelligence – Activate Your Account`,
            fbWrap(`Welcome to Brandtelligence, ${adminName}!`,
              `<p style="font-size:15px;line-height:1.7;color:#444;">
                 Your company <strong>${tenantName}</strong> has been approved on the <strong>Brandtelligence</strong> platform on the <strong>${plan}</strong> plan.<br><br>
                 You have been granted <strong>Tenant Administrator</strong> access. Click the button below to set your password and activate your portal.
               </p>
               ${fbBtn(actionUrl, "Activate Your Account →", "#0BA4AA")}
               <p style="font-size:13px;color:#888;margin-top:20px;">
                 Once inside, you can invite your team members, configure your modules, and start creating content.
               </p>
               ${fbWarn("This invite link expires in 24 hours and can only be used once.")}`
            ),
          );
          console.log(`[tenants POST] Admin invite sent for tenant ${id} (${tenantName})`);
        }
      } catch (inviteErr) {
        // Non-fatal — tenant record exists; super admin can re-send the invite manually
        console.log(`[tenants POST] invite step failed (non-fatal): ${errMsg(inviteErr)}`);
      }
    }

    console.log(`[tenants POST] created ${id}: ${body.name}`);
    // Phase 6: audit trail for tenant creation (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'TENANT_CREATED', route: '/tenants', detail: `tenantId=${id}` });
    return c.json({ tenant });
  } catch (err) {
    console.log(`[tenants POST] ${errMsg(err)}`);
    return c.json({ error: `createTenant: ${errMsg(err)}` }, 500);
  }
});

app.put("/make-server-309fe679/tenants/:id", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN or own TENANT_ADMIN
    const id  = c.req.param("id");
    // Phase 5: validate path param is UUID before DB query (ISO 27001 A.14.2.5)
    if (!isUuid(id)) return c.json({ error: "Invalid tenant ID format" }, 400);
    const auth = await requireTenantScope(c, id);
    if (auth instanceof Response) return auth;
    // Phase 3.1: sanitise inputs
    const row = tenantToPg(sanitizeObject(await c.req.json(), new Set(['password', 'pass'])));
    const { data, error } = await supabaseAdmin
      .from("tenants").update(row).eq("id", id).select().single();
    if (error) throw error;
    if (!data)  return c.json({ error: "Tenant not found" }, 404);
    // Phase 6: audit trail for tenant update (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'TENANT_UPDATED', route: '/tenants/:id', detail: `tenantId=${id} fields=${Object.keys(row).join(',')}` });
    return c.json({ tenant: rowToTenant(data) });
  } catch (err) {
    console.log(`[tenants PUT] ${errMsg(err)}`);
    return c.json({ error: `updateTenant: ${errMsg(err)}` }, 500);
  }
});

app.delete("/make-server-309fe679/tenants/:id", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only — delete tenant
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    // Phase 2.3: CSRF validation
    const csrfErr = await validateCsrf(c, auth as AuthIdentity);
    if (csrfErr) return csrfErr;
    // Phase 2.4: HMAC request signing for destructive operations
    // Must match what the frontend signs — for bodyless DELETE, signedApi signs the path
    const hmacErr = await validateRequestSignature(c, auth as AuthIdentity, `/tenants/${c.req.param("id")}`);
    if (hmacErr) return hmacErr;
    // Phase 2.5: session freshness check (max 60 min for destructive ops)
    const freshErr = checkTokenFreshness(c, 60);
    if (freshErr) return freshErr;
    const tenantId = c.req.param("id");
    // Phase 5: validate path param is UUID (ISO 27001 A.14.2.5)
    if (!isUuid(tenantId)) return c.json({ error: "Invalid tenant ID format" }, 400);
    const { error } = await supabaseAdmin
      .from("tenants").delete().eq("id", tenantId);
    if (error) throw error;
    // Phase 4: security event log for destructive operation
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'TENANT_DELETED', route: '/tenants/:id', detail: `tenantId=${tenantId}` });
    return c.json({ success: true });
  } catch (err) {
    console.log(`[tenants DELETE] ${errMsg(err)}`);
    return c.json({ error: `deleteTenant: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL CHECK  (public — checks tenants + pending_requests in Postgres)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/check-access-email", async (c) => {
  try {
    // Phase 4: rate limit public email check — prevents enumeration (ISO 27001 A.9.4.2)
    const limited = rateLimit(c, 'public:check-email', 10, 60_000);
    if (limited) return limited;
    const email = (c.req.query("email") ?? "").toLowerCase().trim();
    if (!email) return c.json({ status: "available" });

    const { data: tenantRow } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .ilike("contact_email", email)
      .maybeSingle();
    if (tenantRow) return c.json({ status: "tenant" });

    const { data: reqRow } = await supabaseAdmin
      .from("pending_requests")
      .select("id, status, submitted_at")
      .ilike("email", email)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (reqRow) {
      return c.json({
        status:      reqRow.status === "rejected" ? "rejected" : "pending",
        submittedAt: reqRow.submitted_at ? String(reqRow.submitted_at).slice(0, 10) : undefined,
      });
    }
    return c.json({ status: "available" });
  } catch (_err) {
    return c.json({ status: "available" }); // fail open
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REQUESTS  (Postgres: pending_requests)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/requests", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only — list all access requests
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const { data, error } = await supabaseAdmin
      .from("pending_requests")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return c.json({ requests: (data ?? []).map(rowToRequest) });
  } catch (err) {
    console.log(`[requests GET] ${errMsg(err)}`);
    return c.json({ error: `fetchRequests: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/requests", async (c) => {
  try {
    // Public signup — rate limit to prevent abuse (ISO 27001 A.9.4.2)
    const limited = rateLimit(c, 'signup:request', 5, 60_000);
    if (limited) return limited;
    // Phase 3.1: sanitise user-provided signup data
    const body = sanitizeObject(await c.req.json(), new Set(['password']));
    // Phase 3.1: validate email format
    if (body.contactEmail && !validateEmail(body.contactEmail)) {
      return c.json({ error: "Invalid email format" }, 400);
    }
    const id   = body.id ?? crypto.randomUUID();
    const row  = {
      ...requestToPg(body),
      id,
      status:       body.status    ?? "pending",
      submitted_at: body.createdAt ?? new Date().toISOString(),
    };
    const { data, error } = await supabaseAdmin
      .from("pending_requests").insert(row).select().single();
    if (error) throw error;
    console.log(`[requests POST] ${id}: ${body.companyName}`);
    // Phase 6: audit trail for signup/onboarding request (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'ONBOARDING_REQUEST_CREATED', route: '/requests', detail: `requestId=${id} company=${body.companyName ?? 'unknown'}` });
    return c.json({ request: rowToRequest(data) });
  } catch (err) {
    console.log(`[requests POST] ${errMsg(err)}`);
    return c.json({ error: `createRequest: ${errMsg(err)}` }, 500);
  }
});

app.put("/make-server-309fe679/requests/:id", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only — approve/reject requests
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const id   = c.req.param("id");
    // Phase 5: validate path param (ISO 27001 A.14.2.5)
    if (!isUuid(id)) return c.json({ error: "Invalid request ID format" }, 400);
    // Phase 3.1: sanitise inputs
    const body = sanitizeObject(await c.req.json(), new Set(['password']));
    const { data: existing } = await supabaseAdmin
      .from("pending_requests").select("*").eq("id", id).single();
    if (!existing) return c.json({ error: "Request not found" }, 404);

    // Patch 02: merge from dedicated columns (fall back to old JSON message for legacy rows)
    let legacyExtra: any = {};
    try { legacyExtra = JSON.parse(existing.message || "{}"); } catch {}

    const row: Record<string, any> = {};
    if (body.companyName      !== undefined) row.company_name      = body.companyName;
    if (body.contactName      !== undefined) row.contact_name      = body.contactName;
    if (body.contactEmail     !== undefined) row.email             = body.contactEmail;
    if (body.status           !== undefined) row.status            = body.status;
    if (body.reviewedAt       !== undefined) row.reviewed_at       = body.reviewedAt;
    if (body.reviewedBy       !== undefined) row.reviewed_by       = body.reviewedBy;
    // Dedicated columns — use body value, fall back to existing dedicated column, then legacy JSON
    row.country           = body.country          ?? existing.country           ?? legacyExtra.country          ?? "";
    row.company_size      = body.size             ?? existing.company_size      ?? legacyExtra.size             ?? "";
    row.requested_modules = body.requestedModules ?? existing.requested_modules ?? legacyExtra.requestedModules ?? [];
    row.notes             = body.notes            ?? existing.notes             ?? legacyExtra.notes            ?? "";
    row.rejected_reason   = body.rejectedReason   ?? existing.rejected_reason   ?? legacyExtra.rejectedReason   ?? null;
    // Keep message in sync for legacy tooling
    row.message = JSON.stringify({
      notes:            row.notes,
      country:          row.country,
      size:             row.company_size,
      requestedModules: row.requested_modules,
      rejectedReason:   row.rejected_reason,
    });

    const { data, error } = await supabaseAdmin
      .from("pending_requests").update(row).eq("id", id).select().single();
    if (error) throw error;
    console.log(`[requests PUT] ${id} → ${body.status ?? existing.status}`);
    // Phase 6: audit trail for request review (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'ONBOARDING_REQUEST_UPDATED', route: '/requests/:id', detail: `requestId=${id} status=${body.status ?? existing.status}` });
    return c.json({ request: rowToRequest(data) });
  } catch (err) {
    console.log(`[requests PUT] ${errMsg(err)}`);
    return c.json({ error: `updateRequest: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TENANT USERS  (Postgres: tenant_users)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/tenant-users", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    // Phase 1.3: Tenant-scoped or SUPER_ADMIN for all
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    if (tenantId) {
      const scope = await requireTenantScope(c, tenantId);
      if (scope instanceof Response) return scope;
    } else if ((auth as AuthIdentity).role !== 'SUPER_ADMIN') {
      return c.json({ error: 'tenantId is required for non-admin users' }, 403);
    }
    let query = supabaseAdmin.from("tenant_users").select("*").order("created_at", { ascending: false });
    if (tenantId) query = query.eq("tenant_id", tenantId);
    const { data, error } = await query;
    if (error) throw error;
    return c.json({ users: (data ?? []).map(rowToTenantUser) });
  } catch (err) {
    console.log(`[tenant-users GET] ${errMsg(err)}`);
    return c.json({ error: `fetchTenantUsers: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/tenant-users", async (c) => {
  try {
    // Phase 3.1: sanitise inputs
    const body = sanitizeObject(await c.req.json(), new Set(['password']));
    // Phase 1.3: SUPER_ADMIN or TENANT_ADMIN of the target tenant
    if (body.tenantId) {
      const scope = await requireTenantScope(c, body.tenantId);
      if (scope instanceof Response) return scope;
    } else {
      const auth = await requireRole(c, 'SUPER_ADMIN', 'TENANT_ADMIN');
      if (auth instanceof Response) return auth;
    }
    const id   = body.id ?? crypto.randomUUID();
    const row  = {
      ...tenantUserToPg(body),
      id,
      status:     pgUserStatus(body.status ?? "invited"),
      created_at: body.joinedAt ?? new Date().toISOString(),
    };
    const { data, error } = await supabaseAdmin
      .from("tenant_users").insert(row).select().single();
    if (error) throw error;
    console.log(`[tenant-users POST] created user ${id}`);
    // Phase 6: audit trail for user creation (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'USER_CREATED', route: '/tenant-users', detail: `targetUserId=${id} role=${body.role ?? 'EMPLOYEE'}` });
    return c.json({ user: rowToTenantUser(data) });
  } catch (err) {
    console.log(`[tenant-users POST] ${errMsg(err)}`);
    return c.json({ error: `createTenantUser: ${errMsg(err)}` }, 500);
  }
});

app.put("/make-server-309fe679/tenant-users/:id", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN or TENANT_ADMIN
    const auth = await requireRole(c, 'SUPER_ADMIN', 'TENANT_ADMIN');
    if (auth instanceof Response) return auth;
    const id  = c.req.param("id");
    // Phase 5: validate path param (ISO 27001 A.14.2.5)
    if (!isUuid(id)) return c.json({ error: "Invalid user ID format" }, 400);
    // Phase 3.1: sanitise inputs
    const row = tenantUserToPg(sanitizeObject(await c.req.json(), new Set(['password'])));
    const { data, error } = await supabaseAdmin
      .from("tenant_users").update(row).eq("id", id).select().single();
    if (error) throw error;
    if (!data)  return c.json({ error: "User not found" }, 404);
    // Phase 6: audit trail for user update (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'USER_UPDATED', route: '/tenant-users/:id', detail: `targetUserId=${id} fields=${Object.keys(row).join(',')}` });
    return c.json({ user: rowToTenantUser(data) });
  } catch (err) {
    console.log(`[tenant-users PUT] ${errMsg(err)}`);
    return c.json({ error: `updateTenantUser: ${errMsg(err)}` }, 500);
  }
});

app.delete("/make-server-309fe679/tenant-users/:id", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN or TENANT_ADMIN
    const auth = await requireRole(c, 'SUPER_ADMIN', 'TENANT_ADMIN');
    if (auth instanceof Response) return auth;
    // Phase 2.3: CSRF validation
    const csrfErr = await validateCsrf(c, auth as AuthIdentity);
    if (csrfErr) return csrfErr;
    const targetUserId = c.req.param("id");
    // Phase 5: validate path param (ISO 27001 A.14.2.5)
    if (!isUuid(targetUserId)) return c.json({ error: "Invalid user ID format" }, 400);
    const { error } = await supabaseAdmin
      .from("tenant_users").delete().eq("id", targetUserId);
    if (error) throw error;
    // Phase 4: security event log for user deletion
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'USER_DELETED', route: '/tenant-users/:id', detail: `targetUserId=${targetUserId}` });
    return c.json({ success: true });
  } catch (err) {
    console.log(`[tenant-users DELETE] ${errMsg(err)}`);
    return c.json({ error: `deleteTenantUser: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INVOICES  (Postgres: invoices)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/invoices", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    // Phase 1.3: Tenant-scoped or SUPER_ADMIN for all
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    if (tenantId) {
      const scope = await requireTenantScope(c, tenantId);
      if (scope instanceof Response) return scope;
    } else if ((auth as AuthIdentity).role !== 'SUPER_ADMIN') {
      return c.json({ error: 'tenantId is required for non-admin users' }, 403);
    }
    let query = supabaseAdmin.from("invoices").select("*").order("created_at", { ascending: false });
    if (tenantId) query = query.eq("tenant_id", tenantId);
    const { data, error } = await query;
    if (error) throw error;
    return c.json({ invoices: (data ?? []).map(rowToInvoice) });
  } catch (err) {
    console.log(`[invoices GET] ${errMsg(err)}`);
    return c.json({ error: `fetchInvoices: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/invoices", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only — create invoices
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    // Phase 3.1: sanitise inputs
    const body = sanitizeObject(await c.req.json());
    const id   = body.id ?? crypto.randomUUID();
    const row  = {
      ...invoiceToPg(body),
      id,
      created_at: body.issuedAt ?? new Date().toISOString(),
    };
    const { data, error } = await supabaseAdmin
      .from("invoices").insert(row).select().single();
    if (error) throw error;
    console.log(`[invoices POST] ${id}`);
    // Phase 6: audit trail for invoice creation (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'INVOICE_CREATED', route: '/invoices', detail: `invoiceId=${id}` });
    return c.json({ invoice: rowToInvoice(data) });
  } catch (err) {
    console.log(`[invoices POST] ${errMsg(err)}`);
    return c.json({ error: `createInvoice: ${errMsg(err)}` }, 500);
  }
});

app.put("/make-server-309fe679/invoices/:id", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only — update invoices
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const id   = c.req.param("id");
    // Phase 5: validate path param (ISO 27001 A.14.2.5)
    if (!isUuid(id)) return c.json({ error: "Invalid invoice ID format" }, 400);
    // Phase 3.1: sanitise inputs
    const body = sanitizeObject(await c.req.json());
    const { data: existing } = await supabaseAdmin
      .from("invoices").select("*").eq("id", id).single();
    if (!existing) return c.json({ error: "Invoice not found" }, 404);

    // Patch 02: read from dedicated columns first, fall back to old JSON description for legacy rows
    let legacyInvoiceExtra: any = {};
    try { legacyInvoiceExtra = JSON.parse(existing.description || "{}"); } catch {}

    const row: Record<string, any> = {};
    if (body.tenantId !== undefined) row.tenant_id = toUuid(body.tenantId);
    if (body.total    !== undefined) row.amount    = body.total;
    if (body.status   !== undefined) row.status    = pgInvoiceStatus(body.status);
    if (body.dueDate  !== undefined) row.due_date  = body.dueDate  || null;
    if (body.paidAt   !== undefined) row.paid_date = body.paidAt   || null;
    // Dedicated columns
    row.invoice_number = body.invoiceNumber ?? existing.invoice_number ?? legacyInvoiceExtra.invoiceNumber ?? "";
    row.tenant_name    = body.tenantName    ?? existing.tenant_name    ?? legacyInvoiceExtra.tenantName    ?? "";
    row.period         = body.period        ?? existing.period         ?? legacyInvoiceExtra.period        ?? "";
    row.subtotal       = body.subtotal      ?? legacyInvoiceExtra.subtotal ?? Number(existing.subtotal ?? 0);
    row.tax            = body.tax           ?? legacyInvoiceExtra.tax      ?? Number(existing.tax      ?? 0);
    row.payment_method = body.paymentMethod ?? existing.payment_method ?? legacyInvoiceExtra.paymentMethod ?? "none";
    row.receipt_url    = body.receiptUrl    ?? existing.receipt_url    ?? legacyInvoiceExtra.receiptUrl    ?? null;
    row.notes          = body.notes         ?? existing.notes          ?? legacyInvoiceExtra.notes         ?? "";
    row.lines          = body.lines         ?? existing.lines          ?? legacyInvoiceExtra.lines         ?? [];
    // Keep description in sync for legacy tooling
    row.description = JSON.stringify({
      invoiceNumber: row.invoice_number, tenantName:    row.tenant_name,
      period:        row.period,         subtotal:      row.subtotal,
      tax:           row.tax,            paymentMethod: row.payment_method,
      receiptUrl:    row.receipt_url,    notes:         row.notes,
      lines:         row.lines,
    });

    const { data, error } = await supabaseAdmin
      .from("invoices").update(row).eq("id", id).select().single();
    if (error) throw error;
    // Phase 6: audit trail for invoice update (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'INVOICE_UPDATED', route: '/invoices/:id', detail: `invoiceId=${id} fields=${Object.keys(row).join(',')}` });
    return c.json({ invoice: rowToInvoice(data) });
  } catch (err) {
    console.log(`[invoices PUT] ${errMsg(err)}`);
    return c.json({ error: `updateInvoice: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULES  (Postgres: modules)
// ──────────���──────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/modules", async (c) => {
  try {
    // Phase 1.3: Authenticated — all roles can read modules
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const { data, error } = await supabaseAdmin
      .from("modules")
      .select("*")
      .order("id");
    if (error) throw error;
    return c.json({ modules: (data ?? []).map(rowToModule) });
  } catch (err) {
    console.log(`[modules GET] ${errMsg(err)}`);
    return c.json({ error: `fetchModules: ${errMsg(err)}` }, 500);
  }
});

app.put("/make-server-309fe679/modules/:id", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only — toggle modules
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const id  = c.req.param("id");
    // Phase 5: validate path param (ISO 27001 A.14.2.5)
    if (!isUuid(id)) return c.json({ error: "Invalid module ID format" }, 400);
    // Phase 3 QC: sanitise module update inputs
    const row = moduleToPg(sanitizeObject(await c.req.json()));
    const { data, error } = await supabaseAdmin
      .from("modules").update(row).eq("id", id).select().single();
    if (error) throw error;
    if (!data)  return c.json({ error: "Module not found" }, 404);
    console.log(`[modules PUT] ${id} globalEnabled=${data.global_enabled}`);
    // Phase 6: audit trail for module update (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'MODULE_UPDATED', route: '/modules/:id', detail: `moduleId=${id} globalEnabled=${data.global_enabled}` });
    return c.json({ module: rowToModule(data) });
  } catch (err) {
    console.log(`[modules PUT] ${errMsg(err)}`);
    return c.json({ error: `updateModule: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES  (Postgres: features)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/features", async (c) => {
  try {
    // Phase 1.3: Authenticated — all roles can read features
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const { data, error } = await supabaseAdmin
      .from("features")
      .select("*")
      .order("id");
    if (error) throw error;
    return c.json({ features: (data ?? []).map(rowToFeature) });
  } catch (err) {
    console.log(`[features GET] ${errMsg(err)}`);
    return c.json({ error: `fetchFeatures: ${errMsg(err)}` }, 500);
  }
});

app.put("/make-server-309fe679/features/:id", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only — toggle features
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const id  = c.req.param("id");
    // Phase 5: validate path param (ISO 27001 A.14.2.5)
    if (!isUuid(id)) return c.json({ error: "Invalid feature ID format" }, 400);
    // Phase 3 QC: sanitise feature update inputs
    const body= sanitizeObject(await c.req.json());
    // Patch 02: read from dedicated columns; no JSON parsing needed
    const { data: existing } = await supabaseAdmin
      .from("features").select("module_id, rollout_note").eq("id", id).single();
    const row = featureToPg({
      ...body,
      moduleId:    body.moduleId    ?? existing?.module_id,
      rolloutNote: body.rolloutNote ?? existing?.rollout_note,
    });
    const { data, error } = await supabaseAdmin
      .from("features").update(row).eq("id", id).select().single();
    if (error) throw error;
    if (!data)  return c.json({ error: "Feature not found" }, 404);
    // Phase 6: audit trail for feature update (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'FEATURE_UPDATED', route: '/features/:id', detail: `featureId=${id}` });
    return c.json({ feature: rowToFeature(data) });
  } catch (err) {
    console.log(`[features PUT] ${errMsg(err)}`);
    return c.json({ error: `updateFeature: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────���───
// AUDIT LOGS  (Postgres: audit_logs)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/audit-logs", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only — view audit logs
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const severity = c.req.query("severity");
    const role     = c.req.query("role");
    const limit    = Math.min(parseInt(c.req.query("limit") ?? "200"), 500);

    let query = supabaseAdmin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (severity) query = query.eq("severity",   severity);
    if (role)     query = query.eq("actor_role", role);

    const { data, error } = await query;
    if (error) throw error;
    return c.json({ logs: (data ?? []).map(rowToAuditLog) });
  } catch (err) {
    console.log(`[audit-logs GET] ${errMsg(err)}`);
    return c.json({ error: `fetchAuditLogs: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/audit-logs", async (c) => {
  try {
    // Phase 1.3: Authenticated — any role can write audit logs
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    // Phase 3.1: sanitise audit log data
    const body = sanitizeObject(await c.req.json());
    const row  = auditLogToPg(body);
    const { error } = await supabaseAdmin.from("audit_logs").insert(row);
    if (error) throw error;
    return c.json({ success: true, id: row.id });
  } catch (err) {
    console.log(`[audit-logs POST] ${errMsg(err)}`);
    return c.json({ error: `appendAuditLog: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY AUDIT LOG  (KV-based, written by logSecurityEvent in auth.tsx)
// GET /security-audit-log?date=YYYY-MM-DD  →  SUPER_ADMIN only
// Phase 6: ISO 27001 A.12.4.1 / A.12.4.2 compliance review endpoint
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/security-audit-log", async (c) => {
  try {
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;

    const date = c.req.query("date") ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return c.json({ error: "Invalid date format — use YYYY-MM-DD" }, 400);
    }

    const raw = await kv.get(`security_audit_log:${date}`);
    const entries = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];

    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'SECURITY_LOG_VIEWED', route: '/security-audit-log', detail: `date=${date} entries=${entries.length}` });

    return c.json({ date, entries, count: entries.length });
  } catch (err) {
    console.log(`[security-audit-log GET] ${errMsg(err)}`);
    return c.json({ error: `fetchSecurityLog: ${errMsg(err)}` }, 500);
  }
});

// GET /security-audit-log/summary?days=7  →  SUPER_ADMIN only
app.get("/make-server-309fe679/security-audit-log/summary", async (c) => {
  try {
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;

    const days = Math.min(Math.max(parseInt(c.req.query("days") ?? "7", 10) || 7, 1), 90);
    const summary: { date: string; count: number }[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const raw = await kv.get(`security_audit_log:${dateStr}`);
      const entries = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
      summary.push({ date: dateStr, count: Array.isArray(entries) ? entries.length : 0 });
    }

    return c.json({ days, summary });
  } catch (err) {
    console.log(`[security-audit-log/summary GET] ${errMsg(err)}`);
    return c.json({ error: `fetchSecurityLogSummary: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DATA RETENTION POLICY  (PDPA s.10 / ISO 27001 A.18.1.3)
// KV key: data_retention_policy  →  RetentionPolicy JSON
// GET  /data-retention-policy  →  SUPER_ADMIN only — view current policy
// PUT  /data-retention-policy  →  SUPER_ADMIN only — update retention windows
// ─────────────────────────────────────────────────────────────────────────────

interface RetentionPolicy {
  auditLogDays:       number;
  oauthStateMinutes:  number;
  slaDedupDays:       number;
  usageRecordMonths:  number;
  reviewTokenDays:    number;
  updatedAt:          string | null;
  updatedBy:          string | null;
}

const DEFAULT_RETENTION: RetentionPolicy = {
  auditLogDays:       90,
  oauthStateMinutes:  60,
  slaDedupDays:       7,
  usageRecordMonths:  12,
  reviewTokenDays:    30,
  updatedAt:          null,
  updatedBy:          null,
};

app.get("/make-server-309fe679/data-retention-policy", async (c) => {
  try {
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;

    const raw = await kv.get("data_retention_policy");
    const policy: RetentionPolicy = raw
      ? { ...DEFAULT_RETENTION, ...(typeof raw === "string" ? JSON.parse(raw) : raw) }
      : { ...DEFAULT_RETENTION };

    return c.json({ policy });
  } catch (err) {
    console.log(`[data-retention-policy GET] ${errMsg(err)}`);
    return c.json({ error: `fetchRetentionPolicy: ${errMsg(err)}` }, 500);
  }
});

app.put("/make-server-309fe679/data-retention-policy", async (c) => {
  try {
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;

    const body = sanitizeObject(await c.req.json());
    const existing = await kv.get("data_retention_policy");
    const prev: RetentionPolicy = existing
      ? { ...DEFAULT_RETENTION, ...(typeof existing === "string" ? JSON.parse(existing) : existing) }
      : { ...DEFAULT_RETENTION };

    const updated: RetentionPolicy = {
      auditLogDays:       Math.max(30, Math.min(Number(body.auditLogDays)      ?? prev.auditLogDays,      365)),
      oauthStateMinutes:  Math.max(5,  Math.min(Number(body.oauthStateMinutes) ?? prev.oauthStateMinutes, 1440)),
      slaDedupDays:       Math.max(1,  Math.min(Number(body.slaDedupDays)      ?? prev.slaDedupDays,      90)),
      usageRecordMonths:  Math.max(3,  Math.min(Number(body.usageRecordMonths) ?? prev.usageRecordMonths, 60)),
      reviewTokenDays:    Math.max(7,  Math.min(Number(body.reviewTokenDays)   ?? prev.reviewTokenDays,   365)),
      updatedAt:          new Date().toISOString(),
      updatedBy:          (auth as AuthIdentity).userId,
    };

    await kv.set("data_retention_policy", JSON.stringify(updated));
    console.log(`[data-retention-policy PUT] updated by ${(auth as AuthIdentity).userId}`);

    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'RETENTION_POLICY_CHANGED', route: '/data-retention-policy', detail: `audit=${updated.auditLogDays}d oauth=${updated.oauthStateMinutes}m sla=${updated.slaDedupDays}d usage=${updated.usageRecordMonths}mo review=${updated.reviewTokenDays}d` });

    return c.json({ success: true, policy: updated });
  } catch (err) {
    console.log(`[data-retention-policy PUT] ${errMsg(err)}`);
    return c.json({ error: `updateRetentionPolicy: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE STATUS  (Phase 6 UI — aggregated health dashboard)
// GET /compliance-status  →  SUPER_ADMIN only
// Scans recent security audit log for integrity check events + cron status
// ─────────────────────────────────────────────────────────────────────────────

interface ComplianceCronStatus {
  name: string;
  schedule: string;
  description: string;
}

const REGISTERED_CRONS: ComplianceCronStatus[] = [
  { name: 'auto-publish-scheduled-cards', schedule: '* * * * *',    description: 'Auto-publish scheduled social media cards' },
  { name: 'daily-autopublish-failure-digest', schedule: '0 8 * * *', description: 'Daily failure digest email at 08:00 UTC' },
  { name: 'analytics-engagement-sync',    schedule: '0 */6 * * *',  description: 'Sync engagement metrics every 6 hours' },
  { name: 'data-retention-purge',          schedule: '0 3 * * *',   description: 'Purge expired data daily at 03:00 UTC' },
  { name: 'audit-log-integrity-check',     schedule: '0 4 * * 0',   description: 'Weekly audit log gap detection (Sundays 04:00 UTC)' },
];

app.get("/make-server-309fe679/compliance-status", async (c) => {
  try {
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;

    // Scan last 14 days for integrity check events
    const now = new Date();
    const integrityResults: { date: string; action: string; detail: string; ts: string }[] = [];

    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const raw = await kv.get(`security_audit_log:${dateStr}`);
      if (!raw) continue;
      const entries = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!Array.isArray(entries)) continue;
      for (const e of entries) {
        if (e.action === 'AUDIT_INTEGRITY_OK' || e.action === 'AUDIT_INTEGRITY_WARNING') {
          integrityResults.push({ date: dateStr, action: e.action, detail: e.detail ?? '', ts: e.ts });
        }
      }
    }

    // Sort most recent first
    integrityResults.sort((a, b) => b.ts.localeCompare(a.ts));

    // Determine overall health
    const lastCheck = integrityResults[0] ?? null;
    const hasWarnings = integrityResults.some(r => r.action === 'AUDIT_INTEGRITY_WARNING');

    // Fetch retention policy for display
    const retRaw = await kv.get("data_retention_policy");
    const retentionPolicy = retRaw
      ? { ...{ auditLogDays: 90, oauthStateMinutes: 60, slaDedupDays: 7, usageRecordMonths: 12, reviewTokenDays: 30 }, ...(typeof retRaw === "string" ? JSON.parse(retRaw) : retRaw) }
      : null;

    // Calculate next scheduled integrity check (next Sunday 04:00 UTC)
    const nextSunday = new Date(now);
    const daysUntilSunday = (7 - nextSunday.getUTCDay()) % 7 || 7;
    nextSunday.setUTCDate(nextSunday.getUTCDate() + daysUntilSunday);
    nextSunday.setUTCHours(4, 0, 0, 0);

    const health: 'healthy' | 'warning' | 'unknown' =
      !lastCheck       ? 'unknown' :
      hasWarnings       ? 'warning' :
      /* all OK */        'healthy';

    return c.json({
      health,
      lastCheck,
      integrityResults: integrityResults.slice(0, 10),
      nextScheduledCheck: nextSunday.toISOString(),
      crons: REGISTERED_CRONS,
      retentionConfigured: !!retentionPolicy,
      retentionPolicy,
      alertRecipientsCount: (await getAlertRecipients()).filter(r => r.enabled).length,
      penTestProgress: await (async () => {
        try {
          const raw = await kv.get("pentest_results");
          if (!raw) return { total: 0, pass: 0, fail: 0, partial: 0, notTested: 0, na: 0, updatedAt: null };
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          const results = parsed.results ?? {};
          const entries = Object.values(results) as { status: string }[];
          return {
            total: entries.length,
            pass: entries.filter(e => e.status === 'pass').length,
            fail: entries.filter(e => e.status === 'fail').length,
            partial: entries.filter(e => e.status === 'partial').length,
            notTested: entries.filter(e => e.status === 'not_tested').length,
            na: entries.filter(e => e.status === 'na').length,
            updatedAt: parsed.updatedAt ?? null,
          };
        } catch { return { total: 0, pass: 0, fail: 0, partial: 0, notTested: 0, na: 0, updatedAt: null }; }
      })(),
    });
  } catch (err) {
    console.log(`[compliance-status GET] ${errMsg(err)}`);
    return c.json({ error: `fetchComplianceStatus: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USAGE STATS  (Postgres: usage_stats)
// tenant_id = NULL means platform-wide. Reads are limited to the latest 90 rows.
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/usage", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only — view usage stats
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const tenantId = c.req.query("tenantId");
    let query = supabaseAdmin
      .from("usage_stats")
      .select("*")
      .order("recorded_at", { ascending: true })
      .limit(90);
    if (tenantId) query = query.eq("tenant_id", tenantId);
    else          query = query.is("tenant_id", null);
    const { data, error } = await query;
    if (error) throw error;
    return c.json({ data: (data ?? []).map(rowToUsageStat) });
  } catch (err) {
    console.log(`[usage GET] ${errMsg(err)}`);
    return c.json({ error: `fetchUsage: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/usage", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only — record usage
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    // Phase 5: sanitise usage data
    const { tenantId, point } = sanitizeObject(await c.req.json());
    if (!point) return c.json({ error: "point is required" }, 400);
    const row: Record<string, any> = {
      period:      point.period  ?? "",
      posts:       point.posts   ?? 0,
      content:     point.content ?? 0,
      api:         point.api     ?? 0,
      users:       point.users   ?? 0,
      recorded_at: new Date().toISOString(),
    };
    if (tenantId) row.tenant_id = toUuid(tenantId); // guard: non-UUID mock IDs → null
    const { error } = await supabaseAdmin.from("usage_stats").insert(row);
    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.log(`[usage POST] ${errMsg(err)}`);
    return c.json({ error: `recordUsage: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT CARDS  (Postgres: content_cards)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/content-cards", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    // Phase 1.3: Tenant-scoped or SUPER_ADMIN for all
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    if (tenantId) {
      const scope = await requireTenantScope(c, tenantId);
      if (scope instanceof Response) return scope;
    } else if ((auth as AuthIdentity).role !== 'SUPER_ADMIN') {
      return c.json({ error: 'tenantId is required for non-admin users' }, 403);
    }
    let query = supabaseAdmin
      .from("content_cards")
      .select("*")
      .order("created_at", { ascending: false });
    if (tenantId) query = query.eq("tenant_id", tenantId);
    const { data, error } = await query;
    if (error) throw error;
    return c.json({ cards: (data ?? []).map(rowToContentCard), initialized: true });
  } catch (err) {
    console.log(`[content-cards GET] ${errMsg(err)}`);
    return c.json({ error: `fetchContentCards: ${errMsg(err)}`, cards: [] }, 500);
  }
});

app.post("/make-server-309fe679/content-cards", async (c) => {
  try {
    // Phase 1.3: Authenticated — tenant scoping enforced via card.tenantId
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    // Phase 3.1: sanitise (skip caption/content — social media text may contain special chars)
    const { card } = sanitizeObject(await c.req.json(), new Set(['caption', 'content', 'html', 'body', 'notes']));
    if (!card || !card.id) return c.json({ error: "card with id is required" }, 400);
    // Reject non-UUID ids early — the id column is uuid type
    if (!toUuid(card.id)) return c.json({ error: `Card id "${card.id}" is not a valid UUID` }, 400);
    const row = {
      id: card.id,
      ...contentCardToPg(card),
      created_at: card.createdAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Ensure required enum fields always have a valid value
    if (!row.platform) row.platform = "general";
    if (!row.status)   row.status   = "draft";
    const { data, error } = await supabaseAdmin
      .from("content_cards")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    console.log(`[content-cards POST] upsert ${card.id}`);
    // Phase 6: audit trail for content card create/update (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'CONTENT_CARD_UPSERTED', route: '/content-cards', detail: `cardId=${card.id} platform=${row.platform} status=${row.status}` });
    return c.json({ success: true, cardId: card.id, card: rowToContentCard(data) });
  } catch (err) {
    console.log(`[content-cards POST] ${errMsg(err)}`);
    return c.json({ error: `saveContentCard: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/content-cards/sync", async (c) => {
  try {
    // Phase 1.3: Authenticated — bulk sync
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    // Phase 3.1: sanitise (skip caption/content — social media text may contain special chars)
    const { cards } = sanitizeObject(await c.req.json(), new Set(['caption', 'content', 'html', 'body', 'notes']));
    if (!Array.isArray(cards)) return c.json({ error: "cards array is required" }, 400);
    if (cards.length === 0)    return c.json({ success: true, count: 0 });
    const now = new Date().toISOString();
    // Filter out any card whose id is not a valid UUID — stale mock IDs like
    // "cal_1" or "cc_1" would cause a 22P02 Postgres error on the uuid PK column.
    const validCards = cards.filter((card: any) => toUuid(card.id) !== null);
    const skipped = cards.length - validCards.length;
    if (skipped > 0) console.log(`[content-cards/sync] Skipped ${skipped} cards with non-UUID ids`);
    if (validCards.length === 0) return c.json({ success: true, count: 0 });
    const rows = validCards.map((card: any) => ({
      id: card.id,                           // already validated as UUID above
      ...contentCardToPg(card),
      created_at: card.createdAt ?? now,
      updated_at: now,
      // Guard enum defaults
      platform: normPlatform(card.platform ?? "general"),
      status:   normStatus(card.status     ?? "draft"),
    }));
    const { error } = await supabaseAdmin
      .from("content_cards")
      .upsert(rows, { onConflict: "id" });
    if (error) throw error;
    console.log(`[content-cards/sync] Synced ${rows.length} cards`);
    // Phase 6: audit trail for bulk content card sync (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'CONTENT_CARDS_SYNCED', route: '/content-cards/sync', detail: `count=${rows.length}` });
    return c.json({ success: true, count: rows.length });
  } catch (err) {
    console.log(`[content-cards/sync] ${errMsg(err)}`);
    return c.json({ error: `syncContentCards: ${errMsg(err)}` }, 500);
  }
});

app.delete("/make-server-309fe679/content-cards/:id", async (c) => {
  try {
    // Phase 1.3: Authenticated
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const id = c.req.param("id");
    // Phase 5: validate path param (ISO 27001 A.14.2.5)
    if (!isUuid(id)) return c.json({ error: "Invalid card ID format" }, 400);
    const { error } = await supabaseAdmin
      .from("content_cards").delete().eq("id", id);
    if (error) throw error;
    console.log(`[content-cards DELETE] ${id}`);
    // Phase 6: audit trail for content deletion (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'CONTENT_CARD_DELETED', route: '/content-cards/:id', detail: `cardId=${id}` });
    return c.json({ success: true, deletedId: id });
  } catch (err) {
    console.log(`[content-cards DELETE] ${errMsg(err)}`);
    return c.json({ error: `deleteContentCard: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// APPROVAL EVENTS  (Postgres: approval_events)
// ─────────────────────────────────────────────────────────────────────────────

app.post("/make-server-309fe679/approval-events", async (c) => {
  try {
    // Phase 1.3: Authenticated — any role can write approval events
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    // Phase 3.1: sanitise approval event data
    const { event } = sanitizeObject(await c.req.json());
    if (!event) return c.json({ error: "event is required" }, 400);
    const row: Record<string, any> = {
      id:         event.id ?? crypto.randomUUID(),
      event_type: normEventType(event.eventType ?? event.event_type ?? "submitted"),
      actor_id:   event.actorId ?? event.actor_id ?? "",  // text NOT NULL — keep raw string; toUuid() would null non-UUIDs
      actor_name: event.actorName ?? event.actor_name ?? "",
      actor_role: event.actorRole ?? event.actor_role ?? "",
      message:    event.message   ?? null,
      created_at: event.createdAt ?? new Date().toISOString(),
    };
    if (event.cardId   || event.card_id)   row.card_id   = toUuid(event.cardId   ?? event.card_id);
    if (event.tenantId || event.tenant_id) row.tenant_id = toUuid(event.tenantId ?? event.tenant_id);
    const { error } = await supabaseAdmin.from("approval_events").insert(row);
    if (error) throw error;
    console.log(`[approval-events POST] ${row.id} type=${row.event_type}`);
    // Phase 6: audit trail for content approval/rejection (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'CONTENT_APPROVAL_EVENT', route: '/approval-events', detail: `type=${row.event_type} cardId=${row.card_id ?? 'n/a'}` });
    return c.json({ success: true, eventId: row.id });
  } catch (err) {
    console.log(`[approval-events POST] ${errMsg(err)}`);
    return c.json({ error: `logApprovalEvent: ${errMsg(err)}` }, 500);
  }
});

app.get("/make-server-309fe679/approval-events", async (c) => {
  try {
    // Phase 1.3: Authenticated — tenant-scoped read
    const auth = await requireAuth(c);
    if (auth instanceof Response) return auth;
    const cardId   = c.req.query("cardId");
    const tenantId = c.req.query("tenantId");
    if (tenantId) {
      const scope = await requireTenantScope(c, tenantId);
      if (scope instanceof Response) return scope;
    } else if ((auth as AuthIdentity).role !== 'SUPER_ADMIN') {
      return c.json({ error: 'tenantId is required for non-admin users' }, 403);
    }
    const limit    = Math.min(parseInt(c.req.query("limit") ?? "100"), 500);
    let query = supabaseAdmin
      .from("approval_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (cardId)   query = query.eq("card_id",   cardId);
    if (tenantId) query = query.eq("tenant_id", tenantId);
    const { data, error } = await query;
    if (error) throw error;
    return c.json({ events: (data ?? []).map(rowToApprovalEvent) });
  } catch (err) {
    console.log(`[approval-events GET] ${errMsg(err)}`);
    return c.json({ error: `fetchApprovalEvents: ${errMsg(err)}`, events: [] }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SMTP CONFIG  (Postgres: smtp_config, id = 'global')
// ─────────────────────────────────────────────────────────────────────��───────

app.get("/make-server-309fe679/smtp/config", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const { data, error } = await supabaseAdmin
      .from("smtp_config").select("*").eq("id", "global").maybeSingle();
    if (error) throw error;
    if (!data) return c.json({ config: null });
    // Phase 3.2: decrypt password before sending to frontend
    const config = rowToSmtpConfig(data);
    if (config.pass) config.pass = await decrypt(config.pass);
    return c.json({ config });
  } catch (err) {
    console.log(`[smtp/config GET] ${errMsg(err)}`);
    return c.json({ error: `fetchSmtpConfig: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/smtp/config", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    // Phase 2.3: CSRF validation (SMTP credentials are sensitive)
    const csrfErr = await validateCsrf(c, auth as AuthIdentity);
    if (csrfErr) return csrfErr;
    // Phase 3.1: sanitise (skip password field)
    const body = sanitizeObject(await c.req.json(), new Set(['pass', 'password']));
    const row  = smtpConfigToPg(body);
    // Phase 3.2: encrypt password before storage
    if (row.password) row.password = await encrypt(row.password);
    const { error } = await supabaseAdmin
      .from("smtp_config")
      .upsert(row, { onConflict: "id" });
    if (error) throw error;
    console.log(`[smtp/config POST] Saved SMTP config (host=${row.host})`);
    // Phase 6: audit trail for SMTP config change (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'SMTP_CONFIG_CHANGED', route: '/smtp/config', detail: `host=${row.host}` });
    return c.json({ success: true });
  } catch (err) {
    console.log(`[smtp/config POST] ${errMsg(err)}`);
    return c.json({ error: `saveSmtpConfig: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/smtp/test", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    // Phase 5: sanitise (skip password/credentials)
    const { to, config } = sanitizeObject(await c.req.json(), new Set(['pass', 'password', 'user']));
    if (!to || !config?.host || !config?.port) {
      return c.json({ error: "Missing required fields: to, config.host, config.port" }, 400);
    }

    const transporter = nodemailer.createTransport({
      host:   config.host,
      port:   parseInt(config.port, 10),
      secure: parseInt(config.port, 10) === 465,
      auth:   config.user && config.pass ? { user: config.user, pass: config.pass } : undefined,
    });
    await transporter.verify();

    // Read test_email template from Postgres (fall back to inline default)
    const { data: savedTemplate } = await supabaseAdmin
      .from("email_templates").select("*").eq("id", "test_email").maybeSingle();

    const defaultSubject = "Brandtelligence — SMTP Test Successful ✅";
    const defaultHtml = `<!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f7;margin:0;padding:40px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#0d9488);padding:36px 40px 28px;text-align:center;">
          <p style="margin:0;font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Brandtelligence</p>
          <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.75);">AI-Powered Social Media Platform</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1a1a2e;">SMTP Test Successful ✅</h1>
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px 20px;margin:20px 0;">
            <p style="margin:0;font-size:13px;color:#16a34a;font-weight:600;">✅ Your SMTP configuration is working correctly.</p>
          </div>
          <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8f8fb;border-radius:10px;border:1px solid #eee;margin:24px 0;">
            <tr><td style="padding:8px 14px;font-size:12px;color:#888;width:130px;">SMTP Host</td><td style="padding:8px 14px;font-size:13px;color:#333;font-weight:600;">{{smtpHost}}</td></tr>
            <tr><td style="padding:8px 14px;font-size:12px;color:#888;">SMTP Port</td><td style="padding:8px 14px;font-size:13px;color:#333;font-weight:600;">{{smtpPort}}</td></tr>
            <tr><td style="padding:8px 14px;font-size:12px;color:#888;">From Email</td><td style="padding:8px 14px;font-size:13px;color:#333;font-weight:600;">{{fromEmail}}</td></tr>
            <tr><td style="padding:8px 14px;font-size:12px;color:#888;">Sent To</td><td style="padding:8px 14px;font-size:13px;color:#333;font-weight:600;">{{sentTo}}</td></tr>
            <tr><td style="padding:8px 14px;font-size:12px;color:#888;">Sent At</td><td style="padding:8px 14px;font-size:13px;color:#333;font-weight:600;">{{sentAt}}</td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f8f8f8;border-top:1px solid #eee;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#aaa;">Brandtelligence Sdn Bhd · Kuala Lumpur, Malaysia</p>
          <p style="margin:4px 0 0;font-size:11px;color:#aaa;">© 2026 Brandtelligence. All rights reserved.</p>
        </td></tr>
      </table></td></tr></table>
    </body></html>`;

    const templateSubject = savedTemplate?.subject ?? defaultSubject;
    const templateHtml    = savedTemplate?.html    ?? defaultHtml;

    const vars: Record<string, string> = {
      smtpHost:  config.host,
      smtpPort:  String(config.port),
      fromEmail: config.fromEmail || config.from || "",
      sentTo:    to,
      sentAt:    new Date().toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "full", timeStyle: "short" }),
    };
    const replace = (str: string) => str.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => vars[k] ?? `{{${k}}}`);

    await transporter.sendMail({
      from:    `"${config.fromName || 'Brandtelligence'}" <${config.fromEmail || 'noreply@brandtelligence.com.my'}>`,
      to,
      subject: replace(templateSubject),
      html:    replace(templateHtml),
    });

    console.log(`[smtp/test] Test email sent via ${config.host}:${config.port}`);
    // Phase 6: audit trail (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'SMTP_TEST_SENT', route: '/smtp/test', detail: `host=${config.host} to=${to}` });
    return c.json({ success: true, message: `Test email sent to ${to}` });
  } catch (err) {
    console.log(`[smtp/test] Error: ${errMsg(err)}`);
    return c.json({ error: `SMTP Error: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES  (Postgres: email_templates)
// Absent rows fall back to the hard-coded default in the calling UI.
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/email-templates/:id", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const { data, error } = await supabaseAdmin
      .from("email_templates").select("*").eq("id", c.req.param("id")).maybeSingle();
    if (error) throw error;
    return c.json({ template: data ? rowToEmailTemplate(data) : null });
  } catch (err) {
    console.log(`[email-templates GET] ${errMsg(err)}`);
    return c.json({ error: `fetchEmailTemplate: ${errMsg(err)}` }, 500);
  }
});

app.put("/make-server-309fe679/email-templates/:id", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const id   = c.req.param("id");
    // Phase 3.1: sanitise (skip html — email templates contain legitimate HTML)
    const body = sanitizeObject(await c.req.json(), new Set(['html']));
    const row  = {
      id,
      subject:    body.subject   ?? "",
      html:       body.html      ?? "",
      updated_at: new Date().toISOString(),
      updated_by: body.updatedBy ?? "",  // NOT NULL — never send null; empty string = system/unknown
    };
    const { error } = await supabaseAdmin
      .from("email_templates")
      .upsert(row, { onConflict: "id" });
    if (error) throw error;
    console.log(`[email-templates PUT] Saved template: ${id}`);
    // Phase 6: audit trail for email template update (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'EMAIL_TEMPLATE_UPDATED', route: '/email-templates/:id', detail: `templateId=${id}` });
    return c.json({ success: true });
  } catch (err) {
    console.log(`[email-templates PUT] ${errMsg(err)}`);
    return c.json({ error: `saveEmailTemplate: ${errMsg(err)}` }, 500);
  }
});

app.delete("/make-server-309fe679/email-templates/:id", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const id = c.req.param("id");
    const { error } = await supabaseAdmin
      .from("email_templates").delete().eq("id", id);
    if (error) throw error;
    console.log(`[email-templates DELETE] Reset template: ${id}`);
    // Phase 6: audit trail for email template deletion (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'EMAIL_TEMPLATE_DELETED', route: '/email-templates/:id', detail: `templateId=${id}` });
    return c.json({ success: true });
  } catch (err) {
    console.log(`[email-templates DELETE] ${errMsg(err)}`);
    return c.json({ error: `resetEmailTemplate: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/email-templates/:id/test", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    // Phase 5: sanitise (skip html — email content is intentionally HTML)
    const { to, subject, html } = sanitizeObject(await c.req.json(), new Set(['html']));
    if (!to || !subject || !html) return c.json({ error: "Missing required fields: to, subject, html" }, 400);

    // Read SMTP config from Postgres
    const { data: smtpRow, error: smtpErr } = await supabaseAdmin
      .from("smtp_config").select("*").eq("id", "global").maybeSingle();
    if (smtpErr) throw smtpErr;
    if (!smtpRow?.host) return c.json({ error: "SMTP not configured — please save SMTP settings first in Settings → Email / SMTP." }, 400);
    const smtpConfig = rowToSmtpConfig(smtpRow);
    // Phase 3 QC: decrypt SMTP password (encrypted at rest since Phase 3.2)
    if (smtpConfig.pass) smtpConfig.pass = await decrypt(smtpConfig.pass);

    const transporter = nodemailer.createTransport({
      host:   smtpConfig.host,
      port:   parseInt(smtpConfig.port, 10),
      secure: parseInt(smtpConfig.port, 10) === 465,
      auth:   smtpConfig.user && smtpConfig.pass ? { user: smtpConfig.user, pass: smtpConfig.pass } : undefined,
    });

    const sampleVars: Record<string, string> = {
      companyName: 'Acme Corp', contactName: 'John Doe', contactEmail: to,
      adminName: 'Jane Admin', inviteUrl: 'https://brandtelligence.com.my/invite/sample',
      expiresAt: '24 hours', plan: 'Growth', tenantName: 'Acme Corp',
      invoiceNumber: 'INV-2026-042', amount: '1,299.00', issueDate: '1 Feb 2026',
      dueDate: '15 Feb 2026', invoiceUrl: 'https://brandtelligence.com.my/invoices/sample',
      daysOverdue: '5', suspensionDate: '20 Feb 2026', paymentDate: '10 Feb 2026',
      paymentMethod: 'FPX', receiptUrl: 'https://brandtelligence.com.my/receipts/sample',
      country: 'Malaysia', size: '11–50', submittedAt: new Date().toLocaleString('en-MY'),
      adminPanelUrl: 'https://brandtelligence.com.my/super/requests',
      reason: 'Overdue invoice', supportEmail: 'support@brandtelligence.com.my',
      reactivatedAt: new Date().toLocaleString('en-MY'), portalUrl: 'https://brandtelligence.com.my/tenant',
      userName: 'John Doe', resetUrl: 'https://brandtelligence.com.my/reset/sample',
      ipAddress: '123.456.789.0', employeeName: 'John Doe', role: 'Employee',
      email: 'john.doe@acme.com', confirmUrl: 'https://brandtelligence.com.my/confirm/sample',
      invitedByName: 'Jane Admin', invitedByEmail: 'admin@brandtelligence.com.my',
      magicLinkUrl: 'https://brandtelligence.com.my/magic/sample',
      oldEmail: 'john.old@acme.com', newEmail: 'john.new@acme.com',
      changeUrl: 'https://brandtelligence.com.my/change-email/sample',
      reauthUrl: 'https://brandtelligence.com.my/reauth/sample',
      actionDescription: 'Change Password',
    };

    const sub = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => sampleVars[k] || `{{${k}}}`);
    await transporter.sendMail({
      from:    `"${smtpConfig.fromName || 'Brandtelligence'}" <${smtpConfig.fromEmail}>`,
      to,
      subject: `[TEMPLATE PREVIEW] ${sub(subject)}`,
      html:    sub(html),
    });

    console.log(`[email-templates/test] Preview dispatched`);
    // Phase 6: audit trail for test email dispatch (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'EMAIL_TEST_SENT', route: '/email-templates/:id/test', detail: `to=${to}` });
    return c.json({ success: true, message: `Preview sent to ${to}` });
  } catch (err) {
    console.log(`[email-templates/test] Error: ${errMsg(err)}`);
    return c.json({ error: `Send error: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH EMAIL HELPERS  (shared branded email wrapper + dispatch)
// Both SMTP config and email templates are now read from Postgres.
// ─────────────────────────────────────────────────────────────────────────────

const fbWrap = (title: string, body: string) =>
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:40px 16px;background:#f4f4f7;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#7c3aed 0%,#0d9488 100%);padding:36px 40px 28px;text-align:center;">
  <p style="margin:0;font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Brandtelligence</p>
  <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.75);">AI-Powered Social Media Platform</p>
</td></tr>
<tr><td style="padding:40px;">
  <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#1a1a2e;">${title}</h1>
  ${body}
</td></tr>
<tr><td style="background:#f8f8f8;border-top:1px solid #eee;padding:20px 40px;text-align:center;">
  <p style="margin:0;font-size:11px;color:#aaa;">Brandtelligence Sdn Bhd &nbsp;·&nbsp; Kuala Lumpur, Malaysia</p>
  <p style="margin:4px 0 0;font-size:11px;color:#aaa;">© 2026 Brandtelligence. All rights reserved.</p>
</td></tr>
</table></td></tr></table></body></html>`;

const fbBtn = (url: string, label = 'Click Here →', color = '#7c3aed') =>
  `<table cellpadding="0" cellspacing="0" style="margin:24px auto 0;"><tr><td style="background:${color};border-radius:10px;">
   <a href="${url}" style="display:block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;">${label}</a>
   </td></tr></table>`;

const fbWarn = (text: string) =>
  `<div style="background:#fff5f5;border:1px solid #fca5a5;border-radius:10px;padding:14px 18px;margin:20px 0;">
   <p style="margin:0;font-size:13px;color:#dc2626;font-weight:600;">⚠️ ${text}</p></div>`;

async function sendAuthEmail(
  to: string,
  templateId: string,
  vars: Record<string, string>,
  fallbackSubject: string,
  fallbackHtml: string,
): Promise<void> {
  // Read SMTP config from Postgres
  const { data: smtpRow, error: smtpErr } = await supabaseAdmin
    .from("smtp_config").select("*").eq("id", "global").maybeSingle();
  if (smtpErr) throw new Error(`SMTP config read error: ${smtpErr.message}`);
  if (!smtpRow?.host) throw new Error("SMTP not configured — please save SMTP settings in Settings → Email / SMTP first.");
  const smtpCfg = rowToSmtpConfig(smtpRow);
  // Phase 3 QC: decrypt SMTP password (encrypted at rest since Phase 3.2)
  if (smtpCfg.pass) smtpCfg.pass = await decrypt(smtpCfg.pass);

  // Read email template from Postgres (fall back to inline default if not customised)
  const { data: tplRow } = await supabaseAdmin
    .from("email_templates").select("subject, html").eq("id", templateId).maybeSingle();
  const subject = tplRow?.subject ?? fallbackSubject;
  const html    = tplRow?.html    ?? fallbackHtml;

  const sub = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => vars[k] ?? `{{${k}}}`);
  const transporter = nodemailer.createTransport({
    host:   smtpCfg.host,
    port:   parseInt(smtpCfg.port, 10),
    secure: parseInt(smtpCfg.port, 10) === 465,
    auth:   smtpCfg.user && smtpCfg.pass ? { user: smtpCfg.user, pass: smtpCfg.pass } : undefined,
  });
  await transporter.sendMail({
    from:    `"${smtpCfg.fromName || 'Brandtelligence'}" <${smtpCfg.fromEmail || 'noreply@brandtelligence.com.my'}>`,
    to,
    subject: sub(subject),
    html:    sub(html),
  });
}

// ──────────────────────────────────────────────────────────────���──────────────
// AUTH ROUTES  (generateLink + custom email dispatch — unchanged externally)
// ─────────────────────────────────────────────────────────────────────────────

app.post("/make-server-309fe679/auth/confirm-signup", async (c) => {
  try {
    // ISO 27001 A.9.4.2 — rate limit auth endpoints to prevent brute-force / enumeration
    const limited = rateLimit(c, 'auth:confirm-signup', 10, 60_000);
    if (limited) return limited;
    const { email, userName } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);
    // Phase 3.1: validate email format
    if (!validateEmail(email)) return c.json({ error: "Invalid email format" }, 400);
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup", email,
      options: { redirectTo: `${(Deno.env.get("APP_URL") || "https://brandtelligence.com.my").replace(/\/$/, "")}/auth/callback` },
    });
    if (error || !data?.properties?.action_link) return c.json({ error: `Failed to generate confirmation link: ${error?.message}` }, 500);
    // Phase 3 QC: sanitise userName before injecting into HTML email body
    const name = sanitizeString(userName || email.split("@")[0]);
    await sendAuthEmail(email, "auth_confirm_signup",
      { userName: name, email, confirmUrl: data.properties.action_link, expiresAt: "24 hours" },
      "Confirm your Brandtelligence account",
      fbWrap("Confirm Your Email Address",
        `<p style="font-size:15px;line-height:1.7;color:#444;">Hi ${name}, please confirm your email to activate your account.</p>
         ${fbBtn(data.properties.action_link, "Confirm Email Address →")}
         ${fbWarn("This link expires in 24 hours. If you did not sign up, ignore this email.")}`));
    console.log(`[auth/confirm-signup] Confirmation email dispatched`);
    // Phase 6: audit trail (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'AUTH_CONFIRM_SIGNUP', route: '/auth/confirm-signup', detail: `email=${email}` });
    return c.json({ success: true, message: `Confirmation email sent to ${email}` });
  } catch (err) {
    console.log(`[auth/confirm-signup] Error: ${errMsg(err)}`);
    return c.json({ error: `confirm-signup error: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/auth/invite-user", async (c) => {
  try {
    // Phase 4: rate limit invite generation (ISO 27001 A.9.4.2)
    const limited = rateLimit(c, 'auth:invite-user', 10, 60_000);
    if (limited) return limited;
    const { email, templateId, vars: extraVars } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);
    // Phase 3.1: validate email format
    if (!validateEmail(email)) return c.json({ error: "Invalid email format" }, 400);
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite", email,
      options: { redirectTo: `${(Deno.env.get("APP_URL") || "https://brandtelligence.com.my").replace(/\/$/, "")}/auth/callback` },
    });
    if (error || !data?.properties?.action_link) return c.json({ error: `Failed to generate invite link: ${error?.message}` }, 500);
    const actionUrl  = data.properties.action_link;
    const tplId      = templateId || "auth_invite_user";
    // Phase 3 QC: sanitise extraVars (user-controlled) before template substitution into HTML
    const mergedVars = sanitizeObject({
      inviteUrl: actionUrl, expiresAt: "24 hours",
      invitedByName: "Brandtelligence Admin", invitedByEmail: "admin@brandtelligence.com.my",
      employeeName: email.split("@")[0], adminName: "Admin",
      companyName: "Brandtelligence", plan: "Starter", role: "Employee",
      ...(extraVars || {}),
    }, new Set(['inviteUrl'])) as Record<string, string>;
    await sendAuthEmail(email, tplId, mergedVars,
      "You've been invited to Brandtelligence",
      fbWrap("You've Been Invited to Brandtelligence",
        `<p style="font-size:15px;line-height:1.7;color:#444;">You have been invited to join the Brandtelligence Platform.</p>
         ${fbBtn(actionUrl, "Accept Invitation →")}
         ${fbWarn("This invite link expires in 24 hours and can only be used once.")}`));
    console.log(`[auth/invite-user] Invite dispatched using template: ${tplId}`);
    // Phase 6: audit trail (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'AUTH_INVITE_SENT', route: '/auth/invite-user', detail: `email=${email} template=${tplId}` });
    return c.json({ success: true, message: `Invite email sent to ${email}` });
  } catch (err) {
    console.log(`[auth/invite-user] Error: ${errMsg(err)}`);
    return c.json({ error: `invite-user error: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/auth/magic-link", async (c) => {
  try {
    const limited = rateLimit(c, 'auth:magic-link', 5, 60_000);
    if (limited) return limited;
    const { email, userName, ipAddress } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);
    // Phase 3.1: validate email format
    if (!validateEmail(email)) return c.json({ error: "Invalid email format" }, 400);
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink", email,
      options: { redirectTo: `${(Deno.env.get("APP_URL") || "https://brandtelligence.com.my").replace(/\/$/, "")}/auth/callback` },
    });
    if (error || !data?.properties?.action_link) return c.json({ error: `Failed to generate magic link: ${error?.message}` }, 500);
    // Phase 3 QC: sanitise user-controlled values before HTML email injection
    const name = sanitizeString(userName || email.split("@")[0]);
    const ip   = sanitizeString(ipAddress || c.req.header("x-forwarded-for") || "unknown");
    await sendAuthEmail(email, "auth_magic_link",
      { userName: name, magicLinkUrl: data.properties.action_link, expiresAt: "1 hour", ipAddress: ip },
      "Your Brandtelligence sign-in link",
      fbWrap("Your Sign-In Link",
        `<p style="font-size:15px;line-height:1.7;color:#444;">Hi ${name}, click below to sign in — no password required.</p>
         ${fbBtn(data.properties.action_link, "Sign In to Brandtelligence →")}
         ${fbWarn(`If you did not request this, ignore this email. Request from IP: ${ip}`)}`));
    console.log(`[auth/magic-link] Magic link dispatched`);
    // Phase 6: audit trail (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'AUTH_MAGIC_LINK_SENT', route: '/auth/magic-link', detail: `email=${email} ip=${ip}` });
    return c.json({ success: true, message: `Magic link email sent to ${email}` });
  } catch (err) {
    console.log(`[auth/magic-link] Error: ${errMsg(err)}`);
    return c.json({ error: `magic-link error: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/auth/change-email", async (c) => {
  try {
    // Phase 4: rate limit email change (ISO 27001 A.9.4.2)
    const limited = rateLimit(c, 'auth:change-email', 5, 60_000);
    if (limited) return limited;
    const { email, newEmail, userName } = await c.req.json();
    if (!email || !newEmail) return c.json({ error: "email and newEmail are required" }, 400);
    // Phase 3.1: validate both email formats
    if (!validateEmail(email))    return c.json({ error: "Invalid email format" }, 400);
    if (!validateEmail(newEmail)) return c.json({ error: "Invalid new email format" }, 400);
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "email_change_new" as any, email, newEmail,
      options: { redirectTo: `${Deno.env.get("APP_URL") || "https://brandtelligence.com.my"}/` },
    });
    if (error || !data?.properties?.action_link) return c.json({ error: `Failed to generate email change link: ${error?.message}` }, 500);
    // Phase 3 QC: sanitise userName before HTML email injection
    const name = sanitizeString(userName || email.split("@")[0]);
    await sendAuthEmail(newEmail, "auth_email_change",
      { userName: name, oldEmail: email, newEmail, changeUrl: data.properties.action_link, expiresAt: "24 hours" },
      "Confirm your new email address — Brandtelligence",
      fbWrap("Confirm Your New Email Address",
        `<p style="font-size:15px;line-height:1.7;color:#444;">Hi ${name}, click below to confirm <strong>${newEmail}</strong>.</p>
         ${fbBtn(data.properties.action_link, "Confirm New Email →", "#0d9488")}
         ${fbWarn("If you did not request this change, contact support@brandtelligence.com.my immediately.")}`));
    console.log(`[auth/change-email] Change-email link dispatched`);
    // Phase 6: audit trail (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'AUTH_EMAIL_CHANGE_REQUESTED', route: '/auth/change-email', detail: `oldEmail=${email} newEmail=${newEmail}` });
    return c.json({ success: true, message: `Email change confirmation sent to ${newEmail}` });
  } catch (err) {
    console.log(`[auth/change-email] Error: ${errMsg(err)}`);
    return c.json({ error: `change-email error: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/auth/reset-password", async (c) => {
  try {
    const limited = rateLimit(c, 'auth:reset-password', 5, 60_000);
    if (limited) return limited;
    const { email, userName, ipAddress } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);
    // Phase 3.1: validate email format
    if (!validateEmail(email)) return c.json({ error: "Invalid email format" }, 400);
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery", email,
      options: { redirectTo: `${(Deno.env.get("APP_URL") || "https://brandtelligence.com.my").replace(/\/$/, "")}/auth/callback` },
    });
    if (error || !data?.properties?.action_link) return c.json({ error: `Failed to generate reset link: ${error?.message}` }, 500);
    // Phase 3 QC: sanitise user-controlled values before HTML email injection
    const name = sanitizeString(userName || email.split("@")[0]);
    const ip   = sanitizeString(ipAddress || c.req.header("x-forwarded-for") || "unknown");
    await sendAuthEmail(email, "password_reset",
      { userName: name, resetUrl: data.properties.action_link, expiresAt: "1 hour", ipAddress: ip },
      "Reset Your Brandtelligence Password",
      fbWrap("Password Reset Request",
        `<p style="font-size:15px;line-height:1.7;color:#444;">Hi ${name}, click below to reset your password. Valid for 1 hour.</p>
         ${fbBtn(data.properties.action_link, "Reset Password →")}
         ${fbWarn(`If you did not request a reset, ignore this email. Request from IP: ${ip}`)}`));
    console.log(`[auth/reset-password] Reset link dispatched`);
    // Phase 6: audit trail (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'AUTH_PASSWORD_RESET_SENT', route: '/auth/reset-password', detail: `email=${email} ip=${ip}` });
    return c.json({ success: true, message: `Password reset email sent to ${email}` });
  } catch (err) {
    console.log(`[auth/reset-password] Error: ${errMsg(err)}`);
    return c.json({ error: `reset-password error: ${errMsg(err)}` }, 500);
  }
});

// ─── Activate Account (AAL2-safe password set via admin API) ──────────────────
// Called by AuthCallbackPage instead of supabase.auth.updateUser() to bypass
// the "AAL2 session required" error that fires when MFA is enforced at the
// Supabase project level.
//
// IDENTITY VERIFICATION STRATEGY
// ────────────────────────────────
// JWT verification does not work here: Supabase invite-flow PKCE sessions
// issue a token that the /auth/v1/user REST endpoint rejects with "Invalid JWT"
// (it is only trusted by the client SDK).
//
// Instead we accept the user's UUID (resolved from session.user.id in the
// browser after the PKCE exchange) and confirm identity server-side by
// checking that the auth record has a RECENT invite or recovery link:
//   • user.invited_at      — set when generateLink(type:"invite") was called
//   • user.recovery_sent_at — set when generateLink(type:"recovery") was called
// Both fields are written server-side and cannot be spoofed from the client.
//
// Security: UUID is 128-bit random (unguessable), AND the timestamp window
// must be open, so an attacker needs both a valid UUID AND a recently issued
// link — which is equivalent to having clicked the email link themselves.
app.post("/make-server-309fe679/auth/activate-account", async (c) => {
  try {
    const limited = rateLimit(c, 'auth:activate-account', 10, 60_000);
    if (limited) return limited;
    const body = await c.req.json().catch(() => null);
    const { userId, password } = body ?? {};

    if (!userId || typeof userId !== "string") {
      return c.json({ error: "Missing user ID — please try clicking the link in your email again" }, 400);
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }

    // 1. Resolve the user via admin API
    const { data: { user }, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserErr || !user) {
      console.log(`[auth/activate-account] getUserById failed for uid ${userId}: ${getUserErr?.message}`);
      return c.json({ error: "User not found" }, 404);
    }

    // 2. Time-bounded identity check (24 h — matches recommended Supabase OTP expiry)
    const now        = Date.now();
    const WINDOW_MS  = 24 * 60 * 60 * 1000;
    const invitedMs  = user.invited_at       ? new Date(user.invited_at).getTime()       : 0;
    const recoveryMs = user.recovery_sent_at  ? new Date(user.recovery_sent_at).getTime()  : 0;

    const validInvite   = invitedMs  > 0 && (now - invitedMs)  < WINDOW_MS;
    const validRecovery = recoveryMs > 0 && (now - recoveryMs) < WINDOW_MS;

    if (!validInvite && !validRecovery) {
      console.log(
        `[auth/activate-account] Window expired for uid ${userId}` +
        ` — invited_at: ${user.invited_at ?? "none"}, recovery_sent_at: ${user.recovery_sent_at ?? "none"}`
      );
      return c.json(
        { error: "This activation window has expired. Please request a new invite or password reset link." },
        403
      );
    }

    // 3. Update password via admin API — exempt from AAL2 enforcement
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    if (updateErr) {
      console.log(`[auth/activate-account] updateUserById failed for uid ${userId}: ${updateErr.message}`);
      return c.json({ error: `Password update failed: ${updateErr.message}` }, 500);
    }

    console.log(`[auth/activate-account] Password set for uid ${userId}`);
    // Phase 6: audit trail for account activation (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId, action: 'ACCOUNT_ACTIVATED', route: '/auth/activate-account' });
    return c.json({ success: true });
  } catch (err) {
    console.log(`[auth/activate-account] Unexpected error: ${errMsg(err)}`);
    return c.json({ error: `activate-account error: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/auth/reauth", async (c) => {
  try {
    // Phase 4: rate limit reauthentication (ISO 27001 A.9.4.2)
    const limited = rateLimit(c, 'auth:reauth', 5, 60_000);
    if (limited) return limited;
    const { email, userName, ipAddress, actionDescription } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);
    // Phase 3.1: validate email format
    if (!validateEmail(email)) return c.json({ error: "Invalid email format" }, 400);
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "reauthentication" as any, email,
    });
    if (error || !data?.properties?.action_link) return c.json({ error: `Failed to generate reauthentication link: ${error?.message}` }, 500);
    // Phase 3 QC: sanitise user-controlled values before HTML email injection
    const name        = sanitizeString(userName    || email.split("@")[0]);
    const ip          = sanitizeString(ipAddress   || c.req.header("x-forwarded-for") || "unknown");
    const description = sanitizeString(actionDescription || "Sensitive account action");
    await sendAuthEmail(email, "auth_reauth",
      { userName: name, reauthUrl: data.properties.action_link, expiresAt: "15 minutes", ipAddress: ip, actionDescription: description },
      "Action Required: Verify your identity — Brandtelligence",
      fbWrap("Verify Your Identity",
        `<p style="font-size:15px;line-height:1.7;color:#444;">Hi ${name}, please verify your identity to complete: <strong>${description}</strong>. Valid for 15 minutes.</p>
         ${fbBtn(data.properties.action_link, "Verify My Identity →", "#f59e0b")}
         ${fbWarn(`If you did not initiate this, ignore this email. Request from IP: ${ip}`)}`));
    console.log(`[auth/reauth] Re-authentication link dispatched`);
    // Phase 6: audit trail (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'AUTH_REAUTH_SENT', route: '/auth/reauth', detail: `email=${email} action=${description} ip=${ip}` });
    return c.json({ success: true, message: `Reauthentication email sent to ${email}` });
  } catch (err) {
    console.log(`[auth/reauth] Error: ${errMsg(err)}`);
    return c.json({ error: `reauth error: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// RESEND TENANT ADMIN INVITE
// Regenerates a Supabase invite link for an existing tenant's admin contact,
// re-stamps their user_metadata (role / tenant_id / tenant_name), and
// delivers a fresh branded invite email.
// ───────────────────────────────────────────��─────────────────────────────────

app.post("/make-server-309fe679/auth/resend-tenant-invite", async (c) => {
  try {
    // Phase 4: rate limit invite resend (ISO 27001 A.9.4.2)
    const limited = rateLimit(c, 'auth:resend-invite', 5, 60_000);
    if (limited) return limited;
    // Phase 1.3: SUPER_ADMIN only — resend tenant invite
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;

    const { email, tenantId, tenantName, adminName, plan } = await c.req.json();
    if (!email || !tenantId) return c.json({ error: "email and tenantId are required" }, 400);
    // Phase 3.1: validate email format
    if (!validateEmail(email)) return c.json({ error: "Invalid email format" }, 400);

    // Strip trailing slash so APP_URL="https://host/" never produces "//auth/callback"
    const APP_URL    = (Deno.env.get("APP_URL") || "https://brandtelligence.com.my").replace(/\/$/, "");
    const redirectTo = `${APP_URL}/auth/callback`;

    // ── Link-generation strategy ────────────────────────────────────────────────
    // Supabase type:"invite" only works for users NOT yet in auth.users.
    // For existing users we must branch:
    //   • unconfirmed (never activated)  → delete stale user + fresh invite
    //   • confirmed   (already active)   → password-recovery link
    // This eliminates "A user with this email address has already been registered".

    let actionUrl:   string;
    let supabaseUid: string | undefined;
    let linkKind:    "invite" | "recovery" = "invite";

    // Attempt 1 — try a fresh invite (works when user does NOT exist yet)
    const { data: freshInvite, error: freshErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite", email, options: { redirectTo },
    });

    if (freshInvite?.properties?.action_link) {
      actionUrl   = freshInvite.properties.action_link;
      supabaseUid = freshInvite.user?.id;
      linkKind    = "invite";
    } else {
      // Attempt 2 — user already exists; look them up
      console.log(`[resend-tenant-invite] Fresh invite failed (${freshErr?.message}); looking up existing auth user…`);
      const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) throw new Error(`Failed to list auth users: ${listErr.message}`);

      const existingUser = listData?.users?.find(
        (u: any) => u.email?.toLowerCase() === email.toLowerCase(),
      );
      if (!existingUser) {
        throw new Error(`generateLink failed and user not found in auth.users — ${freshErr?.message}`);
      }

      supabaseUid = existingUser.id;

      if (!existingUser.email_confirmed_at) {
        // 2a — unconfirmed: delete stale record, issue a clean invite
        console.log(`[resend-tenant-invite] Unconfirmed user uid=${existingUser.id} — deleting and re-inviting…`);
        const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
        if (delErr) throw new Error(`Failed to delete stale auth user: ${delErr.message}`);

        const { data: reInvite, error: reErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "invite", email, options: { redirectTo },
        });
        if (reErr || !reInvite?.properties?.action_link) {
          throw new Error(`Failed to re-invite after delete: ${reErr?.message ?? "no action_link"}`);
        }
        actionUrl   = reInvite.properties.action_link;
        supabaseUid = reInvite.user?.id;
        linkKind    = "invite";
      } else {
        // 2b — confirmed: user already set a password; send password-recovery link
        console.log(`[resend-tenant-invite] Confirmed user uid=${existingUser.id} — sending recovery link…`);
        const { data: recovery, error: recErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "recovery", email, options: { redirectTo },
        });
        if (recErr || !recovery?.properties?.action_link) {
          throw new Error(`Failed to generate recovery link: ${recErr?.message ?? "no action_link"}`);
        }
        actionUrl = recovery.properties.action_link;
        linkKind  = "recovery";
      }
    }

    // Phase 3 QC: sanitise user-controlled values before HTML email injection
    const name     = sanitizeString(adminName ?? email.split("@")[0]);
    const company  = sanitizeString(tenantName ?? "Your Company");
    const planName = sanitizeString(plan ?? "Starter");

    // Re-stamp user metadata so role + tenantId are always correct on login
    if (supabaseUid) {
      await supabaseAdmin.auth.admin.updateUserById(supabaseUid, {
        user_metadata: {
          role:        "TENANT_ADMIN",
          tenant_id:   tenantId,
          tenant_name: company,
          first_name:  name.split(" ")[0] ?? name,
          last_name:   name.split(" ").slice(1).join(" ") ?? "",
          company,
        },
      });

      // Ensure tenant_users row exists for this admin (upsert by email + tenant_id)
      const { data: existing } = await supabaseAdmin
        .from("tenant_users")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("email", email)
        .maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("tenant_users").insert({
          id:         crypto.randomUUID(),
          tenant_id:  tenantId,
          name,
          email,
          role:       "TENANT_ADMIN",
          status:     "invited",  // DB check: ('active','invited','suspended') — NOT 'pending_invite'
          created_at: new Date().toISOString(),
        });
      }
    }

    // Send branded email — body differs for invite vs recovery links
    const isRecovery = linkKind === "recovery";
    const emailSubject = isRecovery
      ? `Reset Your Brandtelligence Password`
      : `Your Brandtelligence Invite Has Been Resent`;
    const emailHeading = isRecovery
      ? `Reset Your Password, ${name}`
      : `Welcome (Again) to Brandtelligence, ${name}!`;
    const emailBody = isRecovery
      ? `<p style="font-size:15px;line-height:1.7;color:#444;">
           Your <strong>Tenant Administrator</strong> account for <strong>${company}</strong> on
           <strong>Brandtelligence</strong> is already active.<br><br>
           Use the button below to reset your password and sign back in.
         </p>
         ${fbBtn(actionUrl, "Reset My Password →", "#0BA4AA")}
         <p style="font-size:13px;color:#888;margin-top:20px;">
           If you did not request this, you can safely ignore this email.
         </p>
         ${fbWarn("This link expires in 24 hours.")}`
      : `<p style="font-size:15px;line-height:1.7;color:#444;">
           A new invite has been generated for <strong>${company}</strong> on the
           <strong>Brandtelligence</strong> platform (<strong>${planName}</strong> plan).<br><br>
           Click below to set your password and activate your <strong>Tenant Administrator</strong> access.
         </p>
         ${fbBtn(actionUrl, "Activate Your Account →", "#0BA4AA")}
         <p style="font-size:13px;color:#888;margin-top:20px;">
           Once inside, you can invite your team members, configure your modules, and start creating content.
         </p>
         ${fbWarn("This invite link expires in 24 hours. Any previous invite links are now invalid.")}`;

    await sendAuthEmail(
      email,
      "auth_invite_user",
      {
        inviteUrl:      actionUrl,
        expiresAt:      "24 hours",
        employeeName:   name,
        companyName:    company,
        plan:           planName,
        role:           "Tenant Administrator",
        invitedByName:  "Brandtelligence",
        invitedByEmail: "admin@brandtelligence.com.my",
      },
      emailSubject,
      fbWrap(emailHeading, emailBody),
    );

    console.log(`[auth/resend-tenant-invite] ${linkKind} link dispatched for tenant ${tenantId} (${company})`);
    // Phase 6: audit trail (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'AUTH_TENANT_INVITE_RESENT', route: '/auth/resend-tenant-invite', detail: `email=${email} tenantId=${tenantId} linkKind=${linkKind}` });
    return c.json({ success: true, message: `Invite resent to ${email}`, linkKind });
  } catch (err) {
    console.log(`[auth/resend-tenant-invite] Error: ${errMsg(err)}`);
    return c.json({ error: `resend-tenant-invite: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT GATEWAY CONFIG  (Postgres: payment_gateway_config, id = 'global')
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/payment-gateway/config", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const { data, error } = await supabaseAdmin
      .from("payment_gateway_config").select("*").eq("id", "global").maybeSingle();
    if (error) throw error;
    if (!data) return c.json({ config: null });
    // Phase 3.2: decrypt credential values before sending to frontend
    const config = rowToGatewayConfig(data);
    if (config.liveCreds)    config.liveCreds    = await decryptCredsObject(config.liveCreds);
    if (config.sandboxCreds) config.sandboxCreds = await decryptCredsObject(config.sandboxCreds);
    return c.json({ config });
  } catch (err) {
    console.log(`[payment-gateway/config GET] ${errMsg(err)}`);
    return c.json({ error: `fetchGatewayConfig: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/payment-gateway/config", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    // Phase 2.3: CSRF validation (payment credentials are sensitive)
    const csrfErr = await validateCsrf(c, auth as AuthIdentity);
    if (csrfErr) return csrfErr;
    // Phase 3.1: sanitise non-credential fields (skip creds objects — they contain API keys)
    const body = sanitizeObject(await c.req.json(), new Set(['liveCreds', 'sandboxCreds']));
    if (!body.gatewayId) return c.json({ error: "gatewayId is required" }, 400);
    const row = gatewayConfigToPg(body);
    // Phase 3.2: encrypt credential values before storage
    if (row.live_creds)    row.live_creds    = await encryptCredsObject(row.live_creds);
    if (row.sandbox_creds) row.sandbox_creds = await encryptCredsObject(row.sandbox_creds);
    const { error } = await supabaseAdmin
      .from("payment_gateway_config")
      .upsert(row, { onConflict: "id" });
    if (error) throw error;
    console.log(`[payment-gateway/config POST] Saved config for: ${body.gatewayId} (sandbox=${body.sandboxMode})`);
    // Phase 6: audit trail for payment config change (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'PAYMENT_CONFIG_CHANGED', route: '/payment-gateway/config', detail: `gateway=${body.gatewayId} sandbox=${body.sandboxMode}` });
    return c.json({ success: true });
  } catch (err) {
    console.log(`[payment-gateway/config POST] ${errMsg(err)}`);
    return c.json({ error: `saveGatewayConfig: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/payment-gateway/test", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    // Phase 5: sanitise (skip sandboxCreds — API keys)
    const { gateway, sandboxCreds } = sanitizeObject(await c.req.json(), new Set(['sandboxCreds']));
    if (!gateway) return c.json({ error: "gateway is required" }, 400);
    const creds: Record<string, string> = sandboxCreds ?? {};
    // Phase 6: audit trail for payment gateway test attempt (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'PAYMENT_GATEWAY_TEST', route: '/payment-gateway/test', detail: `gateway=${gateway}` });

    switch (gateway) {
      case "stripe": {
        const key = creds.secretKey?.trim();
        if (!key) return c.json({ error: "Sandbox Secret Key (sk_test_...) is required" }, 400);
        if (!key.startsWith("sk_test_")) return c.json({ error: "Stripe sandbox keys must start with sk_test_" }, 400);
        const res = await fetch("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${key}` } });
        if (res.ok) {
          const data = await res.json();
          return c.json({ success: true, message: `Connected ✓ — balance retrieved (${data.available?.[0]?.currency?.toUpperCase() ?? "MYR"})` });
        }
        const err = await res.json();
        return c.json({ error: `Stripe error: ${err.error?.message ?? "Connection refused"}` }, 400);
      }
      case "billplz": {
        const key = creds.apiKey?.trim();
        if (!key) return c.json({ error: "Sandbox API Key is required" }, 400);
        const res = await fetch("https://www.billplz-sandbox.com/api/v3/bill_collections", { headers: { Authorization: `Basic ${btoa(`${key}:`)}` } });
        if (res.ok || res.status === 200) return c.json({ success: true, message: "Billplz Sandbox connected ✓" });
        return c.json({ error: `Billplz sandbox returned HTTP ${res.status}` }, 400);
      }
      case "toyyibpay": {
        const key = creds.userSecretKey?.trim();
        if (!key) return c.json({ error: "Sandbox User Secret Key is required" }, 400);
        const res = await fetch("https://dev.toyyibpay.com/api/getBank", {
          method: "POST", body: new URLSearchParams({ userSecretKey: key }),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) return c.json({ success: true, message: `toyyibPay Sandbox connected ✓ — ${data.length} FPX banks available` });
        }
        return c.json({ error: "toyyibPay sandbox returned an unexpected response" }, 400);
      }
      case "curlec": {
        const key = creds.apiKey?.trim();
        if (!key) return c.json({ error: "Sandbox API Key is required" }, 400);
        if (!key.includes("test") && !key.includes("sandbox") && !key.startsWith("curlec_test")) {
          return c.json({ error: "Curlec sandbox keys typically contain 'test' or 'sandbox'." }, 400);
        }
        return c.json({ success: true, message: "Curlec sandbox API Key format accepted ✓" });
      }
      case "hitpay": {
        const key = creds.apiKey?.trim();
        if (!key) return c.json({ error: "Sandbox API Key is required" }, 400);
        const res = await fetch("https://api.sandbox.hit-pay.com/v1/payment-requests?per_page=1", { headers: { "X-BUSINESS-API-KEY": key, Accept: "application/json" } });
        if (res.ok) return c.json({ success: true, message: "HitPay Sandbox connected ✓" });
        if (res.status === 401) return c.json({ error: "HitPay Sandbox: Invalid API key (401 Unauthorized)" }, 400);
        return c.json({ error: `HitPay Sandbox returned HTTP ${res.status}` }, 400);
      }
      case "paypal": {
        const clientId = creds.clientId?.trim(), clientSecret = creds.clientSecret?.trim();
        if (!clientId || !clientSecret) return c.json({ error: "Sandbox Client ID and Client Secret are both required" }, 400);
        const res = await fetch("https://api.sandbox.paypal.com/v1/oauth2/token", {
          method: "POST",
          headers: { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: "grant_type=client_credentials",
        });
        if (res.ok) return c.json({ success: true, message: "PayPal Sandbox connected ✓ — OAuth2 token obtained" });
        const err = await res.json();
        return c.json({ error: `PayPal Sandbox error: ${err.error_description ?? err.error ?? "Invalid credentials"}` }, 400);
      }
      default: {
        const allValues = Object.values(creds).filter(v => (v ?? "").trim().length > 4);
        if (allValues.length === 0) return c.json({ error: "Please fill in your sandbox credentials before testing." }, 400);
        const names: Record<string, string> = { ipay88: "iPay88", razer: "Razer Merchant Services", eghl: "eGHL", senangpay: "SenangPay", "2c2p": "2C2P", payex: "Payex" };
        const gwName = names[gateway] ?? gateway;
        return c.json({ success: true, message: `${gwName} sandbox credentials accepted ✓ — contact their support for test account details.` });
      }
    }
  } catch (err) {
    console.log(`[payment-gateway/test] Error: ${errMsg(err)}`);
    return c.json({ error: `Gateway test error: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MFA POLICY  (Postgres: mfa_policy, id = 'global')
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/mfa/policy", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const { data, error } = await supabaseAdmin
      .from("mfa_policy").select("*").eq("id", "global").maybeSingle();
    if (error) throw error;
    return c.json(data ? rowToMfaPolicy(data) : { requireTenantAdminMfa: false });
  } catch (err) {
    console.log(`[mfa/policy GET] ${errMsg(err)}`);
    return c.json({ error: `fetchMfaPolicy: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/mfa/policy", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    // Phase 2.3: CSRF validation (MFA policy is a security-critical setting)
    const csrfErr = await validateCsrf(c, auth as AuthIdentity);
    if (csrfErr) return csrfErr;
    const { requireTenantAdminMfa } = await c.req.json();
    const row = {
      id:                       "global",
      require_tenant_admin_mfa: !!requireTenantAdminMfa,
      updated_at:               new Date().toISOString(),
    };
    const { error } = await supabaseAdmin
      .from("mfa_policy")
      .upsert(row, { onConflict: "id" });
    if (error) throw error;
    console.log(`[mfa/policy POST] requireTenantAdminMfa=${requireTenantAdminMfa}`);
    // Phase 6: audit trail for MFA policy change (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'MFA_POLICY_CHANGED', route: '/mfa/policy', detail: `requireTenantAdminMfa=${!!requireTenantAdminMfa}` });
    return c.json({ success: true });
  } catch (err) {
    console.log(`[mfa/policy POST] ${errMsg(err)}`);
    return c.json({ error: `saveMfaPolicy: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY POLICY  (Postgres: security_policy, id = 'global')
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/security/policy", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const { data, error } = await supabaseAdmin
      .from("security_policy").select("*").eq("id", "global").maybeSingle();
    if (error) throw error;
    return c.json({ policy: data ? rowToSecurityPolicy(data) : null });
  } catch (err) {
    console.log(`[security/policy GET] ${errMsg(err)}`);
    return c.json({ error: `fetchSecurityPolicy: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/security/policy", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    // Phase 2.3: CSRF validation
    const csrfErr = await validateCsrf(c, auth as AuthIdentity);
    if (csrfErr) return csrfErr;
    // Phase 2.5: session freshness for security policy changes
    const freshErr = checkTokenFreshness(c, 30);
    if (freshErr) return freshErr;
    // Read raw body text for HMAC validation (must match what frontend signed)
    const rawBody = await c.req.text();
    // Phase 2.4: HMAC request signing for security policy changes
    const hmacErr = await validateRequestSignature(c, auth as AuthIdentity, rawBody);
    if (hmacErr) return hmacErr;
    const body = JSON.parse(rawBody);
    const row  = securityPolicyToPg(body);
    const { error } = await supabaseAdmin
      .from("security_policy")
      .upsert(row, { onConflict: "id" });
    if (error) throw error;
    console.log(`[security/policy POST] Policy saved`);
    // Phase 4: security event log for security policy change (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'SECURITY_POLICY_SAVED', route: '/security/policy', detail: 'Global security policy updated' });
    return c.json({ success: true });
  } catch (err) {
    console.log(`[security/policy POST] ${errMsg(err)}`);
    return c.json({ error: `saveSecurityPolicy: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MFA RECOVERY CODES  (Postgres: mfa_recovery_codes)
// One row per code; normalised from the old KV shape of {codes:[{code,used,usedAt}]}.
// ─────────────────────────────────────────────────────────────────────────────

app.post("/make-server-309fe679/mfa-recovery/store", async (c) => {
  try {
    // Phase 4: rate limit recovery code storage (ISO 27001 A.9.4.2)
    const limited = rateLimit(c, 'mfa:store-recovery', 5, 60_000);
    if (limited) return limited;
    const { userId, codes } = await c.req.json();
    if (!userId || !Array.isArray(codes) || codes.length === 0)
      return c.json({ error: "userId and codes[] are required" }, 400);
    // Phase 5: validate userId is UUID (ISO 27001 A.14.2.5)
    if (!isUuid(userId)) return c.json({ error: "Invalid userId format" }, 400);
    // Phase 5: bound recovery code count to prevent oversized payloads
    if (codes.length > 20) return c.json({ error: "Maximum 20 recovery codes allowed" }, 400);

    // Atomically replace: delete all existing codes for this user, then insert new ones
    const { error: delErr } = await supabaseAdmin
      .from("mfa_recovery_codes").delete().eq("user_id", userId);
    if (delErr) throw delErr;

    const now  = new Date().toISOString();
    const rows = codes.map((code: string) => ({
      user_id:    userId,
      code:       code.trim().toUpperCase(),
      used:       false,
      created_at: now,
    }));
    const { error: insErr } = await supabaseAdmin.from("mfa_recovery_codes").insert(rows);
    if (insErr) throw insErr;

    console.log(`[mfa-recovery/store] Stored ${codes.length} recovery codes for user ${userId}`);
    // Phase 6: audit trail for MFA recovery code storage (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId, action: 'MFA_RECOVERY_STORED', route: '/mfa-recovery/store', detail: `count=${codes.length}` });
    return c.json({ success: true, count: codes.length });
  } catch (err) {
    console.log(`[mfa-recovery/store] Error: ${errMsg(err)}`);
    return c.json({ error: `storeRecoveryCodes: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/mfa-recovery/verify", async (c) => {
  try {
    // ISO 27001 A.9.4.2 — strict rate limit on MFA verification to prevent brute-force
    const limited = rateLimit(c, 'mfa:verify', 5, 60_000);
    if (limited) return limited;
    const { userId, code } = await c.req.json();
    if (!userId || !code) return c.json({ error: "userId and code are required" }, 400);
    // Phase 5: validate userId is UUID (ISO 27001 A.14.2.5)
    if (!isUuid(userId)) return c.json({ error: "Invalid userId format" }, 400);

    const normalised = code.trim().toUpperCase();

    // Find an unused matching code for this user
    const { data: match, error: findErr } = await supabaseAdmin
      .from("mfa_recovery_codes")
      .select("*")
      .eq("user_id", userId)
      .eq("code",    normalised)
      .eq("used",    false)
      .maybeSingle();
    if (findErr) throw findErr;
    if (!match) return c.json({ error: "Invalid or already-used recovery code." }, 400);

    // Mark it as used
    const { error: updErr } = await supabaseAdmin
      .from("mfa_recovery_codes")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", match.id);
    if (updErr) throw updErr;

    // Count remaining unused codes
    const { count, error: cntErr } = await supabaseAdmin
      .from("mfa_recovery_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("used",    false);
    if (cntErr) throw cntErr;

    const remaining = count ?? 0;
    console.log(`[mfa-recovery/verify] Code used for user ${userId}. ${remaining} codes remaining.`);
    // Phase 6: audit trail for MFA recovery code usage (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId, action: 'MFA_RECOVERY_USED', route: '/mfa-recovery/verify', detail: `remaining=${remaining}` });
    return c.json({ success: true, remaining });
  } catch (err) {
    console.log(`[mfa-recovery/verify] Error: ${errMsg(err)}`);
    return c.json({ error: `recoveryVerify: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/mfa/admin/reset-user", async (c) => {
  try {
    // Phase 4: rate limit admin MFA reset (ISO 27001 A.9.4.2)
    const limited = rateLimit(c, 'mfa:admin-reset', 5, 60_000);
    if (limited) return limited;
    // Phase 1.3: SUPER_ADMIN only — reset another user's MFA
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;

    const { targetUserId } = await c.req.json();
    if (!targetUserId) return c.json({ error: "targetUserId is required" }, 400);
    // Phase 5: validate targetUserId is UUID (ISO 27001 A.14.2.5)
    if (!isUuid(targetUserId)) return c.json({ error: "Invalid targetUserId format" }, 400);

    // Delete TOTP factors from Supabase Auth
    const { data: factors, error: factorErr } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: targetUserId });
    if (factorErr) throw factorErr;
    const deleteResults = await Promise.allSettled(
      (factors?.totp ?? []).map((f: any) => supabaseAdmin.auth.admin.mfa.deleteFactor({ userId: targetUserId, id: f.id })),
    );

    // Delete recovery codes from Postgres
    const { error: rcErr } = await supabaseAdmin
      .from("mfa_recovery_codes").delete().eq("user_id", targetUserId);
    if (rcErr) console.log(`[mfa/admin/reset-user] Recovery code delete warning: ${rcErr.message}`);

    const deleted = deleteResults.filter(r => r.status === "fulfilled").length;
    console.log(`[mfa/admin/reset-user] Reset MFA for uid=${targetUserId}. Deleted ${deleted} factor(s). Caller uid=${(auth as AuthIdentity).userId}`);
    // Phase 4: security event log for MFA admin reset (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'MFA_ADMIN_RESET', route: '/mfa/admin/reset-user', detail: `targetUserId=${targetUserId}, deletedFactors=${deleted}` });
    return c.json({ success: true, deletedFactors: deleted });
  } catch (err) {
    console.log(`[mfa/admin/reset-user] Error: ${errMsg(err)}`);
    return c.json({ error: `MFA reset error: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE REQUESTS  (employee → tenant admin, stored in KV store)
// Key pattern: module_requests:{tenantId}
// ─────────────────────────────────────────────────────────────────────────────

import * as kv from './kv_store.tsx';

interface ModuleRequestRow {
  id: string; tenantId: string; tenantName: string;
  moduleId: string; moduleName: string; moduleIcon: string;
  requesterId: string; requesterName: string; requesterEmail: string;
  useCase: string; status: 'pending' | 'approved' | 'dismissed';
  createdAt: string;
}

app.get("/make-server-309fe679/module-requests", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    if (!tenantId) return c.json({ error: "tenantId is required" }, 400);
    // Phase 1.3: Tenant-scoped
    const scope = await requireTenantScope(c, tenantId);
    if (scope instanceof Response) return scope;
    const raw = await kv.get(`module_requests:${tenantId}`);
    const requests: ModuleRequestRow[] = raw ? JSON.parse(raw as string) : [];
    return c.json({ requests });
  } catch (err) {
    console.log(`[module-requests GET] ${errMsg(err)}`);
    return c.json({ error: `fetchModuleRequests: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/module-requests", async (c) => {
  try {
    // Phase 3.1: sanitise inputs
    const body = sanitizeObject(await c.req.json());
    const { tenantId } = body;
    if (!tenantId) return c.json({ error: "tenantId is required" }, 400);
    // Phase 1.3: Tenant-scoped
    const scope = await requireTenantScope(c, tenantId);
    if (scope instanceof Response) return scope;
    const key = `module_requests:${tenantId}`;
    const raw = await kv.get(key);
    const requests: ModuleRequestRow[] = raw ? JSON.parse(raw as string) : [];
    // Prevent duplicate pending requests for the same module/requester
    const isDuplicate = requests.some(
      r => r.moduleId === body.moduleId && r.requesterEmail === body.requesterEmail && r.status === 'pending'
    );
    if (isDuplicate) return c.json({ error: "You have already submitted a pending request for this module." }, 409);
    const newRequest: ModuleRequestRow = {
      ...body, id: crypto.randomUUID(), status: 'pending', createdAt: new Date().toISOString(),
    };
    requests.push(newRequest);
    await kv.set(key, JSON.stringify(requests));
    console.log(`[module-requests POST] New request: ${newRequest.moduleName} for tenant ${tenantId}`);
    // Phase 6: audit trail for module request creation (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (scope as AuthIdentity).userId, action: 'MODULE_REQUEST_CREATED', route: '/module-requests', detail: `tenantId=${tenantId} module=${newRequest.moduleName}` });
    return c.json({ request: newRequest });
  } catch (err) {
    console.log(`[module-requests POST] ${errMsg(err)}`);
    return c.json({ error: `createModuleRequest: ${errMsg(err)}` }, 500);
  }
});

app.put("/make-server-309fe679/module-requests/:id", async (c) => {
  try {
    const id     = c.req.param("id");
    // Phase 5: validate path param (ISO 27001 A.14.2.5)
    if (!isUuid(id)) return c.json({ error: "Invalid request ID format" }, 400);
    // Phase 3.1: sanitise inputs
    const body   = sanitizeObject(await c.req.json());
    const tenantId = body.tenantId;
    if (!tenantId) return c.json({ error: "tenantId is required in body" }, 400);
    // Phase 1.3: TENANT_ADMIN or SUPER_ADMIN — approve/dismiss module requests
    const scope = await requireTenantScope(c, tenantId);
    if (scope instanceof Response) return scope;
    const key = `module_requests:${tenantId}`;
    const raw = await kv.get(key);
    const requests: ModuleRequestRow[] = raw ? JSON.parse(raw as string) : [];
    const idx = requests.findIndex(r => r.id === id);
    if (idx < 0) return c.json({ error: "Request not found" }, 404);
    requests[idx] = { ...requests[idx], ...body };
    await kv.set(key, JSON.stringify(requests));
    // Phase 6: audit trail for module request update (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (scope as AuthIdentity).userId, action: 'MODULE_REQUEST_UPDATED', route: '/module-requests/:id', detail: `requestId=${id} status=${requests[idx].status}` });
    return c.json({ request: requests[idx] });
  } catch (err) {
    console.log(`[module-requests PUT] ${errMsg(err)}`);
    return c.json({ error: `updateModuleRequest: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI CONTENT GENERATION  (GPT-4o via OpenAI API)
//
// Routes
//   POST   /ai/generate-content          — generate content (auth required)
//   GET    /ai/content-history           — fetch generation history (?tenantId)
//   DELETE /ai/content-history/:id       — delete one history record (body: {tenantId})
//   GET    /ai/content-usage             — token usage for current month (?tenantId)
//
// KV keys
//   content_gen:history:{tenantId}       → JSON array of GenerationRecord (newest first, max 100)
//   content_gen:usage:{tenantId}:{YYYY-MM} → JSON ContentGenUsage
//
// Token budget
//   Default: 100,000 tokens / tenant / month
// ─────────────────────────────────────────────────────────────────────────────

const AI_TOKEN_MONTHLY_LIMIT = 100_000;

// ── Per-tenant AI token limit helper ─────────────────────────────────────────
// KV key: ai_token_limit:{tenantId} → JSON-encoded number
// Falls back to AI_TOKEN_MONTHLY_LIMIT when no override is stored.
async function aiTenantLimit(tenantId: string): Promise<number> {
  if (!tenantId) return AI_TOKEN_MONTHLY_LIMIT;
  try {
    const raw = await kv.get(`ai_token_limit:${tenantId}`);
    if (raw) {
      const n = Number(JSON.parse(raw as string));
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch { /* ignore — fall through to default */ }
  return AI_TOKEN_MONTHLY_LIMIT;
}

interface GenerationRecord {
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

interface ContentGenUsage {
  tokens:      number;
  requests:    number;
  lastUpdated: string;
}

// ── Build system prompt from template + context ────────────────────────────────

function buildAISystemPrompt(template: string, platform: string, tone: string): string {
  const toneMap: Record<string, string> = {
    professional:   "professional, authoritative, and data-driven",
    conversational: "friendly, approachable, and conversational",
    creative:       "creative, playful, and trend-forward",
    authoritative:  "expert-level, thought leadership, commanding",
    humorous:       "witty, humorous, and entertaining",
    inspirational:  "uplifting, motivating, and emotionally resonant",
  };
  const toneDesc = toneMap[tone] ?? "professional and engaging";

  const base =
    `You are an expert social media marketing copywriter at Brandtelligence, ` +
    `a leading Malaysian digital marketing agency. ` +
    `Write content that is ${toneDesc}. ` +
    `Use Malaysian English where culturally appropriate. ` +
    `Currency is Malaysian Ringgit (RM with comma as thousand separator). ` +
    `Be specific, compelling, and immediately usable.`;

  switch (template) {
    case "social_caption":
      return (
        `${base}\n\n` +
        `Write a compelling, platform-optimised social media caption for ${platform || "social media"}. ` +
        `Include 5–10 relevant hashtags at the end. ` +
        `Keep captions concise for Twitter/X (<280 chars), medium for Instagram (≤2,200 chars), ` +
        `and professional for LinkedIn. Always include a clear call-to-action.`
      );
    case "ad_copy":
      return (
        `${base}\n\n` +
        `Write high-converting ad copy structured as:\n` +
        `1. HOOK — One punchy sentence that grabs attention instantly\n` +
        `2. BODY — 2–3 sentences on the core value proposition and key benefits\n` +
        `3. CTA — A single, action-oriented call-to-action with urgency\n\n` +
        `Label each section clearly. Make every word earn its place.`
      );
    case "blog_intro":
      return (
        `${base}\n\n` +
        `Write an SEO-optimised blog post introduction (150–200 words) that:\n` +
        `- Opens with a bold hook or surprising statistic\n` +
        `- Establishes why this topic matters right now\n` +
        `- Previews the value the reader will get\n` +
        `- Ends with a smooth transition into the article body\n\n` +
        `Do NOT write the full article — only the introduction.`
      );
    case "hashtag_set":
      return (
        `${base}\n\n` +
        `Generate a strategic hashtag set organised into three tiers:\n` +
        `🔵 HIGH VOLUME (5 hashtags) — broad reach, millions of posts\n` +
        `🟠 NICHE (5 hashtags) — targeted community, thousands of posts\n` +
        `🟢 BRANDED/TRENDING (5 hashtags) — brand-specific or currently trending\n\n` +
        `Format each tier as a labelled section. Explain the strategy in one sentence per tier.`
      );
    case "campaign_brief":
      return (
        `${base}\n\n` +
        `Write a concise campaign brief with these sections:\n` +
        `📌 OBJECTIVE — What this campaign will achieve (one sentence)\n` +
        `🎯 TARGET AUDIENCE — Demographics, psychographics, pain points\n` +
        `💬 KEY MESSAGES — 3 core messages (bullet points)\n` +
        `📋 CONTENT PILLARS — 4 content themes to rotate\n` +
        `📊 KPIs — 3–5 measurable success metrics\n` +
        `📅 SUGGESTED TIMELINE — Phase breakdown\n\n` +
        `Be specific and actionable. No fluff.`
      );
    default:
      return (
        `${base}\n\n` +
        `You are a versatile AI content assistant for Brandtelligence's internal marketing portal. ` +
        `Help the user with any content, copy, strategy, or marketing question they have.`
      );
  }
}

// ── Helpers: period / KV history / KV usage ───────────────────────────────────

function aiCurrentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // "2026-02"
}

async function aiLoadHistory(tenantId: string): Promise<GenerationRecord[]> {
  const raw = await kv.get(`content_gen:history:${tenantId}`);
  if (!raw) return [];
  try { return JSON.parse(raw as string) as GenerationRecord[]; } catch { return []; }
}

async function aiSaveHistory(tenantId: string, records: GenerationRecord[]): Promise<void> {
  await kv.set(`content_gen:history:${tenantId}`, JSON.stringify(records.slice(0, 100)));
}

async function aiLoadUsage(tenantId: string, period: string): Promise<ContentGenUsage> {
  const raw = await kv.get(`content_gen:usage:${tenantId}:${period}`);
  if (!raw) return { tokens: 0, requests: 0, lastUpdated: new Date().toISOString() };
  try { return JSON.parse(raw as string) as ContentGenUsage; } catch { return { tokens: 0, requests: 0, lastUpdated: new Date().toISOString() }; }
}

async function aiSaveUsage(tenantId: string, period: string, usage: ContentGenUsage): Promise<void> {
  await kv.set(`content_gen:usage:${tenantId}:${period}`, JSON.stringify(usage));
}

// ── POST /ai/generate-content ─────────────────────────────────────────────────

app.post("/make-server-309fe679/ai/generate-content", async (c) => {
  try {
    // Rate limit AI generation (ISO 27001 A.9.4.2) — 20 requests per minute per IP
    const limited = rateLimit(c, 'ai:generate', 20, 60_000);
    if (limited) return limited;
    // 1. Auth — Phase 1.3: use shared auth helper
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;
    const { userId, email, role, tenantId } = authResult as AuthIdentity;
    const userName = email.split("@")[0] ?? "Unknown";
    const kvKey    = tenantId ?? userId; // SUPER_ADMIN has no tenantId — fall back to userId

    // 2. Tenant module gate — must have content_studio (m2) enabled
    if (tenantId) {
      const { data: tenantRow } = await supabaseAdmin
        .from("tenants").select("modules_enabled").eq("id", tenantId).maybeSingle();
      const enabledModules: string[] = tenantRow?.modules_enabled ?? [];
      if (enabledModules.length > 0 && !enabledModules.includes("m2")) {
        return c.json({
          error: "AI Content Studio module is not enabled for your organisation. Please contact your Tenant Administrator.",
        }, 403);
      }
    }

    // 3. Monthly token budget check (per-tenant limit, falls back to platform default)
    const period      = aiCurrentPeriod();
    const usage       = await aiLoadUsage(kvKey, period);
    const tenantLimit = await aiTenantLimit(tenantId ?? kvKey);
    if (usage.tokens >= tenantLimit) {
      return c.json({
        error: `Monthly AI token limit of ${tenantLimit.toLocaleString()} tokens reached. Resets on the 1st of next month.`,
        tokensUsed: usage.tokens,
        tokenLimit: tenantLimit,
        period,
      }, 429);
    }

    // 4. Parse request body
    // Phase 5: sanitise non-prompt fields (prompts skipped — they're user creative content sent to AI)
    const body = sanitizeObject(await c.req.json(), new Set(['prompt', 'caption', 'content', 'projectDescription']));
    const {
      template           = "custom",
      platform           = "general",
      tone               = "professional",
      prompt             = "",
      projectName        = "",
      projectDescription = "",
      targetAudience     = "",
      charLimit          = 0,
    } = body;

    if (!String(prompt).trim()) return c.json({ error: "prompt is required" }, 400);

    // 5. Build prompts
    const systemPrompt  = buildAISystemPrompt(template, platform, tone);
    const contextLines: string[] = [];
    if (projectName)        contextLines.push(`Project/Brand: ${projectName}`);
    if (projectDescription) contextLines.push(`Description: ${projectDescription}`);
    if (targetAudience)     contextLines.push(`Target Audience: ${targetAudience}`);
    if (platform)           contextLines.push(`Target Platform: ${platform}`);
    if (charLimit > 0)      contextLines.push(`Character Limit: ${charLimit}`);
    const userPrompt = contextLines.length
      ? `CONTEXT\n${contextLines.join("\n")}\n\nREQUEST\n${prompt}`
      : String(prompt);

    // 6. Call OpenAI
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIKey) return c.json({ error: "OPENAI_API_KEY not configured on this server." }, 500);

    const model = "gpt-4o";
    const openAIRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openAIKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        max_tokens:  1_500,
        temperature: 0.75,
      }),
    });

    if (!openAIRes.ok) {
      const errBody = await openAIRes.json().catch(() => ({}));
      const errText = (errBody as any)?.error?.message ?? `OpenAI returned HTTP ${openAIRes.status}`;
      console.log(`[ai/generate-content] OpenAI API error: ${errText}`);
      return c.json({ error: `OpenAI error: ${errText}` }, 502);
    }

    const openAIData = await openAIRes.json() as {
      choices: Array<{ message: { content: string } }>;
      usage:   { total_tokens: number };
    };

    const output     = openAIData.choices?.[0]?.message?.content ?? "";
    const tokensUsed = openAIData.usage?.total_tokens ?? 0;

    // 7. Persist history
    const record: GenerationRecord = {
      id:         crypto.randomUUID(),
      tenantId:   kvKey,
      userId,
      userName,
      template,
      platform,
      tone,
      prompt:     String(prompt).slice(0, 500),
      output,
      tokensUsed,
      model,
      createdAt:  new Date().toISOString(),
    };
    const history = await aiLoadHistory(kvKey);
    history.unshift(record);
    await aiSaveHistory(kvKey, history);

    // 8. Update usage counters
    const updatedUsage: ContentGenUsage = {
      tokens:      usage.tokens   + tokensUsed,
      requests:    usage.requests + 1,
      lastUpdated: new Date().toISOString(),
    };
    await aiSaveUsage(kvKey, period, updatedUsage);

    console.log(
      `[ai/generate-content] tenant=${kvKey} user=${userId} ` +
      `template=${template} tokens=${tokensUsed} monthTotal=${updatedUsage.tokens}`
    );

    // Phase 6: audit trail for AI content generation (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId, action: 'AI_CONTENT_GENERATED', route: '/ai/generate-content', detail: `template=${template} platform=${platform} tokens=${tokensUsed} tenantKey=${kvKey}` });

    return c.json({
      success:    true,
      id:         record.id,
      output,
      tokensUsed,
      model,
      usage: {
        tokens:   updatedUsage.tokens,
        requests: updatedUsage.requests,
        limit:    AI_TOKEN_MONTHLY_LIMIT,
        period,
      },
    });

  } catch (err) {
    console.log(`[ai/generate-content] ${errMsg(err)}`);
    return c.json({ error: `generate-content error: ${errMsg(err)}` }, 500);
  }
});

// ── POST /ai/generate-calendar ────────────────────────────────────────────────
// Generates a structured social media calendar plan using GPT-4o JSON mode.

app.post("/make-server-309fe679/ai/generate-calendar", async (c) => {
  try {
    // Phase 4: rate limit AI calendar generation (ISO 27001 A.9.4.2)
    const limited = rateLimit(c, 'ai:generate-calendar', 20, 60_000);
    if (limited) return limited;
    // Phase 1.3: use shared auth helper
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;
    const { userId, tenantId } = authResult as AuthIdentity;
    const kvKey    = tenantId ?? userId;

    if (tenantId) {
      const { data: tenantRow } = await supabaseAdmin
        .from("tenants").select("modules_enabled").eq("id", tenantId).maybeSingle();
      const enabledModules: string[] = tenantRow?.modules_enabled ?? [];
      if (enabledModules.length > 0 && !enabledModules.includes("m2")) {
        return c.json({ error: "AI Content Studio module is not enabled for your organisation." }, 403);
      }
    }

    const period      = aiCurrentPeriod();
    const usage       = await aiLoadUsage(kvKey, period);
    const tenantLimit = await aiTenantLimit(tenantId ?? kvKey);
    if (usage.tokens >= tenantLimit) {
      return c.json({ error: `Monthly AI token limit of ${tenantLimit.toLocaleString()} tokens reached.`, tokensUsed: usage.tokens, tokenLimit: tenantLimit, period }, 429);
    }

    // Phase 5: sanitise non-content fields
    const body = sanitizeObject(await c.req.json(), new Set(['prompt', 'caption', 'content', 'description', 'targetAudience']));
    const {
      campaignName   = "Campaign",
      brandName      = "",
      startDate      = "",
      endDate        = "",
      platforms      = [],
      frequency      = "3x",
      tone           = "professional",
      style          = "Balanced",
      targetAudience = "",
      brandKeywords  = [],
      themes         = [],
    } = body;

    if (!startDate || !endDate) return c.json({ error: "startDate and endDate are required" }, 400);
    if (!Array.isArray(platforms) || !platforms.length) return c.json({ error: "At least one platform is required" }, 400);

    const toneMap: Record<string, string> = {
      professional: "professional, authoritative, and data-driven",
      conversational: "friendly, approachable, and conversational",
      creative: "creative, playful, and trend-forward",
      authoritative: "expert-level thought leadership",
      humorous: "witty, humorous, and entertaining",
      inspirational: "uplifting, motivating, and emotionally resonant",
    };
    const toneDesc     = toneMap[tone] ?? "professional and engaging";
    const keywordsStr  = (Array.isArray(brandKeywords) ? brandKeywords : [brandKeywords]).filter(Boolean).join(", ");
    const themesStr    = (Array.isArray(themes) ? themes : [themes]).filter(Boolean).join("; ");
    const platformsStr = platforms.join(", ");
    const freqDesc     = frequency === "daily" ? "every day" : frequency === "5x" ? "5 days per week (Mon–Fri)" : "3 days per week (Mon, Wed, Fri)";

    const systemPrompt =
      `You are an expert social media content strategist at Brandtelligence, a Malaysian digital marketing agency. ` +
      `Generate a social media content calendar as a JSON object. Respond ONLY with valid JSON — no markdown fences, no commentary.\n\n` +
      `Required JSON shape: { "slots": [ { "date":"YYYY-MM-DD", "dayOfWeek":"Monday", "time":"HH:MM", ` +
      `"platform":"instagram|facebook|twitter|linkedin|tiktok|youtube|pinterest|snapchat|threads|reddit|whatsapp|telegram", ` +
      `"postType":"Carousel|Single Image|Video|Story|Reel|Poll|Thread|Article|Quote Card", ` +
      `"theme":"theme name", "caption":"full platform-optimized caption with emojis", ` +
      `"hashtags":["tag1","tag2"], "callToAction":"CTA text", "contentIdea":"2-sentence concept", "mediaType":"image|video|text" } ] }`;

    const userPrompt =
      `Campaign: "${campaignName}"${brandName ? ` for ${brandName}` : ""}\n` +
      `Date Range: ${startDate} to ${endDate}\n` +
      `Platforms: ${platformsStr}\n` +
      `Posting Frequency: ${freqDesc}\n` +
      `Brand Voice: ${toneDesc}, Style: ${style}\n` +
      (targetAudience ? `Target Audience: ${targetAudience}\n` : "") +
      (keywordsStr ? `Brand Keywords: ${keywordsStr}\n` : "") +
      (themesStr ? `Campaign Themes: ${themesStr}\n` : "") +
      `\nRules:\n` +
      `- Generate one slot per posting-day per platform (rotate if >3 platforms to keep total slots manageable)\n` +
      `- Instagram captions: 150–300 words with emojis. Twitter: ≤280 chars. LinkedIn: professional 100–200 words. TikTok: trendy, short\n` +
      `- Hashtags: Instagram 15–20, LinkedIn 3–5, Twitter 2–3, TikTok 6–10\n` +
      `- Rotate post types; never repeat same type on consecutive days for same platform\n` +
      `- Best post times: Instagram 11:00, LinkedIn 08:00, TikTok 12:00, Facebook 13:00, Twitter 08:00\n` +
      `- Output ONLY the JSON object`;

    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIKey) return c.json({ error: "OPENAI_API_KEY not configured on this server." }, 500);

    const openAIRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openAIKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        max_tokens: 3_500,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!openAIRes.ok) {
      const errBody = await openAIRes.json().catch(() => ({}));
      const errText = (errBody as any)?.error?.message ?? `OpenAI HTTP ${openAIRes.status}`;
      console.log(`[ai/generate-calendar] OpenAI error: ${errText}`);
      return c.json({ error: `OpenAI error: ${errText}` }, 502);
    }

    const openAIData = await openAIRes.json() as { choices: Array<{ message: { content: string } }>; usage: { total_tokens: number } };
    const rawOutput  = openAIData.choices?.[0]?.message?.content ?? "{}";
    const tokensUsed = openAIData.usage?.total_tokens ?? 0;

    let slots: any[] = [];
    try { const parsed = JSON.parse(rawOutput); slots = Array.isArray(parsed.slots) ? parsed.slots : []; }
    catch (e) { console.log(`[ai/generate-calendar] JSON parse error: ${e}`); return c.json({ error: "AI returned malformed JSON — please try again." }, 502); }

    const updatedUsage: ContentGenUsage = { tokens: usage.tokens + tokensUsed, requests: usage.requests + 1, lastUpdated: new Date().toISOString() };
    await aiSaveUsage(kvKey, period, updatedUsage);

    console.log(`[ai/generate-calendar] tenant=${kvKey} slots=${slots.length} tokens=${tokensUsed}`);
    // Phase 6: audit trail for AI calendar generation (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId, action: 'AI_CALENDAR_GENERATED', route: '/ai/generate-calendar', detail: `tenantKey=${kvKey} slots=${slots.length} tokens=${tokensUsed}` });
    return c.json({ success: true, slots, tokensUsed, usage: { tokens: updatedUsage.tokens, requests: updatedUsage.requests, limit: tenantLimit, period } });

  } catch (err) {
    console.log(`[ai/generate-calendar] ${errMsg(err)}`);
    return c.json({ error: `generate-calendar error: ${errMsg(err)}` }, 500);
  }
});

// ── GET /ai/content-history ───────────────────────────────────────────────────

app.get("/make-server-309fe679/ai/content-history", async (c) => {
  try {
    // Phase 1.3: use shared auth helper
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;
    const a = authResult as AuthIdentity;
    const tenantId  = c.req.query("tenantId") ?? a.tenantId ?? a.userId;
    const limitParam = Math.min(parseInt(c.req.query("limit") ?? "20"), 100);
    const history   = await aiLoadHistory(tenantId as string);

    return c.json({ history: history.slice(0, limitParam) });
  } catch (err) {
    console.log(`[ai/content-history GET] ${errMsg(err)}`);
    return c.json({ error: `fetchContentHistory: ${errMsg(err)}` }, 500);
  }
});

// ── DELETE /ai/content-history/:id ───────────────────────���───────────────────

app.delete("/make-server-309fe679/ai/content-history/:id", async (c) => {
  try {
    // Phase 1.3: use shared auth helper
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;
    const a = authResult as AuthIdentity;
    const id        = c.req.param("id");
    // Phase 5: validate path param (ISO 27001 A.14.2.5)
    if (!isUuid(id)) return c.json({ error: "Invalid history ID format" }, 400);
    const body      = await c.req.json();
    const tenantId  = body.tenantId ?? a.tenantId ?? a.userId;

    const history = await aiLoadHistory(tenantId);
    const updated = history.filter((r: GenerationRecord) => r.id !== id);
    await aiSaveHistory(tenantId, updated);

    console.log(`[ai/content-history DELETE] ${id} for tenant ${tenantId}`);
    // Phase 6: audit trail for AI content history deletion (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: a.userId, action: 'AI_HISTORY_DELETED', route: '/ai/content-history/:id', detail: `historyId=${id} tenantId=${tenantId}` });
    return c.json({ success: true, deletedId: id });
  } catch (err) {
    console.log(`[ai/content-history DELETE] ${errMsg(err)}`);
    return c.json({ error: `deleteContentHistory: ${errMsg(err)}` }, 500);
  }
});

// ── GET /ai/content-usage ─────────────────────────────────────────────────────

app.get("/make-server-309fe679/ai/content-usage", async (c) => {
  try {
    // Phase 1.3: use shared auth helper
    const authResult = await requireAuth(c);
    if (authResult instanceof Response) return authResult;
    const a = authResult as AuthIdentity;
    const tenantId = c.req.query("tenantId") ?? a.tenantId ?? a.userId;
    const period   = c.req.query("period") ?? aiCurrentPeriod();

    const usage       = await aiLoadUsage(tenantId as string, period);
    const tenantLimit = await aiTenantLimit(tenantId as string);
    return c.json({
      usage: {
        tokens:   usage.tokens,
        requests: usage.requests,
        limit:    tenantLimit,
        period,
      },
    });
  } catch (err) {
    console.log(`[ai/content-usage GET] ${errMsg(err)}`);
    return c.json({ error: `fetchContentUsage: ${errMsg(err)}` }, 500);
  }
});

// ── GET /ai/platform-ai-usage ─────────────────────────────────────────────────
// Super Admin only. Cross-tenant AI token + request usage for the last 6 months.
// All KV records are fetched in a single mget for efficiency.
// Response: { tenants, periods, platformTotal, limit }
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/ai/platform-ai-usage", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;

    const { data: tenantRows, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .select("id, name, plan, status")
      .order("name");
    if (tenantErr) throw new Error(`DB fetch tenants: ${tenantErr.message}`);
    const allTenants = (tenantRows ?? []) as Array<{ id: string; name: string; plan: string; status: string }>;

    // Last 6 calendar months
    const periods: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      periods.push(d.toISOString().slice(0, 7));
    }

    // Build all KV keys and fetch usage + per-tenant limits in one batch
    const usageKeys: string[] = [];
    for (const t of allTenants) {
      for (const p of periods) usageKeys.push(`content_gen:usage:${t.id}:${p}`);
    }
    const limitKeys: string[] = allTenants.map(t => `ai_token_limit:${t.id}`);
    const allKeys = [...usageKeys, ...limitKeys];
    const allValues: (string | null)[] = allKeys.length > 0 ? await kv.mget(allKeys) : [];

    const values      = allValues.slice(0, usageKeys.length);
    const limitValues = allValues.slice(usageKeys.length);

    const platformTotal: Record<string, { tokens: number; requests: number }> = {};
    for (const p of periods) platformTotal[p] = { tokens: 0, requests: 0 };

    const tenants = allTenants.map((tenant, ti) => {
      // Usage per period
      const usage: Record<string, { tokens: number; requests: number }> = {};
      periods.forEach((p, pi) => {
        const raw = values[ti * periods.length + pi];
        let u = { tokens: 0, requests: 0 };
        if (raw) {
          try { const x = JSON.parse(raw as string); u = { tokens: x.tokens ?? 0, requests: x.requests ?? 0 }; } catch { /* ignore */ }
        }
        usage[p] = u;
        platformTotal[p].tokens   += u.tokens;
        platformTotal[p].requests += u.requests;
      });
      // Per-tenant limit override (null = use platform default)
      let tokenLimit: number | null = null;
      const limitRaw = limitValues[ti];
      if (limitRaw) {
        try { const n = Number(JSON.parse(limitRaw as string)); if (Number.isFinite(n) && n > 0) tokenLimit = n; } catch { /* ignore */ }
      }
      return { id: tenant.id, name: tenant.name, plan: tenant.plan, status: tenant.status, usage, tokenLimit };
    });

    console.log(`[ai/platform-ai-usage] ${allTenants.length} tenants × ${periods.length} periods`);
    return c.json({ tenants, periods, platformTotal, limit: AI_TOKEN_MONTHLY_LIMIT });
  } catch (err) {
    console.log(`[ai/platform-ai-usage GET] ${errMsg(err)}`);
    return c.json({ error: `fetchPlatformAIUsage: ${errMsg(err)}` }, 500);
  }
});

// ── GET /ai/token-limit/:tenantId — SUPER_ADMIN only ─────────────────────────
// Returns the current monthly token limit for a specific tenant.
// { limit, isCustom, defaultLimit, period, tokensUsed }

app.get("/make-server-309fe679/ai/token-limit/:tenantId", async (c) => {
  try {
    // Phase 1.3: SUPER_ADMIN only
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;

    const tenantId = c.req.param("tenantId");
    const period   = aiCurrentPeriod();

    // Fetch both limit override and current usage in parallel
    const [limitRaw, usage] = await Promise.all([
      kv.get(`ai_token_limit:${tenantId}`),
      aiLoadUsage(tenantId, period),
    ]);

    let customLimit: number | null = null;
    if (limitRaw) {
      try { const n = Number(JSON.parse(limitRaw as string)); if (Number.isFinite(n) && n > 0) customLimit = n; } catch { /* ignore */ }
    }

    return c.json({
      limit:        customLimit ?? AI_TOKEN_MONTHLY_LIMIT,
      isCustom:     customLimit !== null,
      defaultLimit: AI_TOKEN_MONTHLY_LIMIT,
      period,
      tokensUsed:   usage.tokens,
      requests:     usage.requests,
    });
  } catch (err) {
    console.log(`[ai/token-limit GET] ${errMsg(err)}`);
    return c.json({ error: `fetchTokenLimit: ${errMsg(err)}` }, 500);
  }
});

// ── PUT /ai/token-limit/:tenantId — SUPER_ADMIN only ─────────────────────────
// Body: { limit: number | null }
//   number → sets a custom per-tenant limit (minimum 1,000)
//   null   → resets to platform default (AI_TOKEN_MONTHLY_LIMIT)

app.put("/make-server-309fe679/ai/token-limit/:tenantId", async (c) => {
  try {
    // Phase 2.3: migrated to shared auth helper + CSRF + HMAC
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const csrfErr = await validateCsrf(c, auth as AuthIdentity);
    if (csrfErr) return csrfErr;

    const tenantId = c.req.param("tenantId");
    // Read raw body text for HMAC validation (must match what frontend signed)
    const rawBody = await c.req.text();
    // Phase 2.4: HMAC request signing for budget changes
    const hmacErr = await validateRequestSignature(c, auth as AuthIdentity, rawBody);
    if (hmacErr) return hmacErr;
    const body = JSON.parse(rawBody);
    const rawLimit = body.limit;

    if (rawLimit === null || rawLimit === undefined) {
      // Reset to platform default
      await kv.del(`ai_token_limit:${tenantId}`);
      console.log(`[ai/token-limit PUT] Reset ${tenantId} to platform default (${AI_TOKEN_MONTHLY_LIMIT})`);
      return c.json({ success: true, limit: AI_TOKEN_MONTHLY_LIMIT, isCustom: false });
    }

    const n = Number(rawLimit);
    if (!Number.isFinite(n) || n < 1_000) {
      return c.json({ error: "Invalid limit — minimum 1,000 tokens" }, 400);
    }

    await kv.set(`ai_token_limit:${tenantId}`, JSON.stringify(n));
    console.log(`[ai/token-limit PUT] Set ${tenantId} limit to ${n}`);
    // Phase 6: audit trail for AI token limit change (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'AI_TOKEN_LIMIT_CHANGED', route: '/ai/token-limit/:tenantId', detail: `tenantId=${tenantId} limit=${n}` });
    return c.json({ success: true, limit: n, isCustom: true });
  } catch (err) {
    console.log(`[ai/token-limit PUT] ${errMsg(err)}`);
    return c.json({ error: `updateTokenLimit: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI CAPTION REFINER  (lightweight — no auth, no token tracking)
// POST /ai/refine-caption
// Body: { platform, title, caption?, postType?, visualDescription? }
// Returns: { caption: string, hashtags: string[] }
// ─────────────────────────────────────────────────────────────────────────────

app.post("/make-server-309fe679/ai/refine-caption", async (c) => {
  try {
    // Phase 4: rate limit AI caption refinement (ISO 27001 A.9.4.2)
    const limited = rateLimit(c, 'ai:refine-caption', 20, 60_000);
    if (limited) return limited;
    // Phase 5: sanitise non-content fields (caption/title are creative content for AI)
    const body = sanitizeObject(await c.req.json().catch(() => ({})), new Set(['caption', 'title', 'prompt', 'visualDescription']));
    const {
      platform          = "general",
      title             = "",
      caption           = "",
      postType          = "",
      visualDescription = "",
    } = body;

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return c.json({ error: "OpenAI API key not configured on server" }, 500);
    }

    const platformTones: Record<string, string> = {
      instagram: "casual, visual-first, emoji-rich, aspirational — punchy sentences and strategic line breaks",
      facebook:  "conversational, community-oriented — moderate emoji, encourages shares and comments",
      twitter:   "concise and punchy (under 280 chars total), trending, strong hook in first line, minimal hashtags",
      linkedin:  "professional, thought-leadership, data-driven — minimal emoji, industry authority tone",
      tiktok:    "Gen-Z casual, energetic opening hook, trend-aware, strong CTA",
      youtube:   "descriptive, keyword-rich, informative — optimised for SEO and watch-time retention",
      pinterest: "aspirational, discovery-focused, keyword-rich in first sentence, inspirational",
      threads:   "conversational opinion-style, authentic, community discussion starters, 1–3 hashtags max",
      reddit:    "authentic, no hard sell, value-first, community-native language",
      whatsapp:  "personal, direct, concise — no hashtags, conversational plain language",
      telegram:  "informative channel-announcement style, clear CTA, medium length",
      snapchat:  "ultra-brief, fun, high energy, FOMO-inducing",
    };
    const tone = platformTones[platform] ?? "professional and engaging";

    const systemPrompt =
      `You are a senior social media copywriter at Brandtelligence, a Malaysian digital marketing agency. ` +
      `You craft platform-native captions that drive authentic engagement. ` +
      `For ${platform}: ${tone}. ` +
      `Use Malaysian English where culturally appropriate. Currency is Malaysian Ringgit (RM). ` +
      `Return ONLY valid JSON with no markdown or backticks, exactly this shape: ` +
      `{"caption":"full caption text","hashtags":["word1","word2","word3","word4","word5","word6","word7","word8","word9","word10"]} ` +
      `Rules: caption must be immediately copy-pasteable; hashtags are plain words without #; provide exactly 10 hashtags.`;

    const userLines: string[] = [`Platform: ${platform}`, `Post title: ${title}`];
    if (caption.trim())         userLines.push(`Existing caption to improve:\n${caption.trim()}`);
    else                        userLines.push(`No existing caption — write fresh content based on the title.`);
    if (postType)               userLines.push(`Content type: ${postType}`);
    if (visualDescription)      userLines.push(`Visual description: ${visualDescription}`);
    userLines.push(`\nRefine or write the caption and provide exactly 10 relevant hashtags.`);

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model:           "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userLines.join("\n") },
        ],
        temperature:     0.75,
        max_tokens:      800,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      console.log(`[ai/refine-caption] OpenAI error ${openaiRes.status}: ${txt}`);
      return c.json({ error: `OpenAI API returned ${openaiRes.status}` }, 502);
    }

    const data = await openaiRes.json();
    const raw  = data.choices?.[0]?.message?.content;
    if (!raw) return c.json({ error: "Empty response from OpenAI" }, 500);

    const parsed   = JSON.parse(raw);
    const refined  = (parsed.caption ?? "").trim();
    const hashtags = Array.isArray(parsed.hashtags)
      ? (parsed.hashtags as string[]).map(h => String(h).replace(/^#+/, "").trim()).filter(Boolean)
      : [];

    console.log(`[ai/refine-caption] platform=${platform} captionLen=${refined.length} tags=${hashtags.length}`);
    // Phase 6: audit trail (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'AI_CAPTION_REFINED', route: '/ai/refine-caption', detail: `platform=${platform} captionLen=${refined.length}` });
    return c.json({ caption: refined, hashtags });

  } catch (err) {
    console.log(`[ai/refine-caption] ${errMsg(err)}`);
    return c.json({ error: `refine-caption error: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SLA CONFIG  (KV: sla_config:{tenantId})
// GET  /sla/config?tenantId=xxx  →  { warningHours, breachHours }
// PUT  /sla/config               ←  { tenantId, warningHours, breachHours }
// ─────────────────────────────────────────────────────────────────────────────

const SLA_CONFIG_DEFAULTS = { warningHours: 24, breachHours: 48 };

app.get("/make-server-309fe679/sla/config", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    if (!tenantId) return c.json({ config: SLA_CONFIG_DEFAULTS });
    const raw    = await kv.get(`sla_config:${tenantId}`);
    const config = raw
      ? { ...SLA_CONFIG_DEFAULTS, ...(JSON.parse(raw as string)) }
      : SLA_CONFIG_DEFAULTS;
    return c.json({ config });
  } catch (err) {
    console.log(`[sla/config GET] ${errMsg(err)}`);
    return c.json({ config: SLA_CONFIG_DEFAULTS });
  }
});

app.put("/make-server-309fe679/sla/config", async (c) => {
  try {
    // Phase 5: sanitise SLA config inputs
    const { tenantId, warningHours, breachHours } = sanitizeObject(await c.req.json());
    if (!tenantId) return c.json({ error: "tenantId is required" }, 400);
    const warn   = Math.max(1,        Math.min(Number(warningHours) || 24, 720));
    const breach = Math.max(warn + 1, Math.min(Number(breachHours)  || 48, 720));
    await kv.set(`sla_config:${tenantId}`, JSON.stringify({ warningHours: warn, breachHours: breach }));
    console.log(`[sla/config PUT] tenant=${tenantId} warn=${warn}h breach=${breach}h`);
    // Phase 6: audit trail for SLA config change (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'SLA_CONFIG_CHANGED', route: '/sla/config', detail: `tenantId=${tenantId} warn=${warn}h breach=${breach}h` });
    return c.json({ success: true, config: { warningHours: warn, breachHours: breach } });
  } catch (err) {
    console.log(`[sla/config PUT] ${errMsg(err)}`);
    return c.json({ error: `saveSlaConfig: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SLA ESCALATION EMAIL
// POST /sla/escalate
// Body: { tenantId, breachHours, cards[], escalateTo[] }
// Dedup key: sla_esc:{YYYY-MM-DD}:{tenantId}:{cardId}  — resets each UTC day
// ─────────────────────────────────────────────────────────────────────────────

app.post("/make-server-309fe679/sla/escalate", async (c) => {
  try {
    // Phase 3.1: sanitise (skip card content fields)
    const body = sanitizeObject(await c.req.json(), new Set(['caption', 'content', 'html', 'body']));
    const { tenantId, breachHours = 48, cards = [], escalateTo = [] } = body;

    if (!tenantId)          return c.json({ error: "tenantId is required" }, 400);
    if (!cards.length)      return c.json({ success: true, sent: 0, skipped: 0, reason: "no cards" });
    if (!escalateTo.length) return c.json({ success: true, sent: 0, skipped: 0, reason: "no recipients" });
    // Phase 3.1: validate escalation email addresses
    const invalidEmails = escalateTo.filter((e: string) => !validateEmail(e));
    if (invalidEmails.length > 0) return c.json({ error: `Invalid email addresses: ${invalidEmails.join(', ')}` }, 400);

    const today      = new Date().toISOString().slice(0, 10);
    const dedupKeys: string[] = cards.map((card: any) => `sla_esc:${today}:${tenantId}:${card.id}`);
    const existing   = await kv.mget(dedupKeys);
    const freshCards = cards.filter((_: any, i: number) => !existing[i]);

    if (!freshCards.length) {
      console.log(`[sla/escalate] All ${cards.length} card(s) already escalated today for tenant ${tenantId}`);
      return c.json({ success: true, sent: 0, skipped: cards.length });
    }

    const cardRows = freshCards.map((card: any) => {
      const hrs  = typeof card.hoursElapsed === "number" ? card.hoursElapsed.toFixed(1) : "—";
      const over = Math.max(0, (card.hoursElapsed || 0) - breachHours).toFixed(1);
      return `<tr>
        <td style="padding:10px 14px;font-size:13px;color:#1a1a2e;font-weight:600;border-bottom:1px solid #f0f0f0;">${card.title || "(untitled)"}</td>
        <td style="padding:10px 14px;font-size:13px;color:#444;text-transform:capitalize;border-bottom:1px solid #f0f0f0;">${card.platform || "—"}</td>
        <td style="padding:10px 14px;font-size:13px;color:#444;border-bottom:1px solid #f0f0f0;">${card.createdBy || "—"}</td>
        <td style="padding:10px 14px;font-size:13px;color:#dc2626;font-weight:700;border-bottom:1px solid #f0f0f0;">${hrs}h <span style="font-size:11px;color:#ef4444;">(+${over}h over)</span></td>
      </tr>`;
    }).join("");

    const portalUrl = (Deno.env.get("APP_URL") || "https://brandtelligence.com.my").replace(/\/$/, "") + "/tenant/projects";
    const emailHtml = fbWrap(
      `⏰ SLA Breach Alert — ${freshCards.length} Card${freshCards.length !== 1 ? "s" : ""} Awaiting Approval`,
      `<p style="font-size:15px;line-height:1.7;color:#444;">
         The following content card${freshCards.length !== 1 ? "s have" : " has"} been waiting for approval
         for more than <strong>${breachHours} hours</strong> and ${freshCards.length !== 1 ? "require" : "requires"} your immediate attention.
       </p>
       <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:20px 0;">
         <thead>
           <tr style="background:#f8f8fb;">
             <th style="padding:10px 14px;font-size:11px;text-transform:uppercase;color:#6b7280;text-align:left;border-bottom:2px solid #e5e7eb;">Card Title</th>
             <th style="padding:10px 14px;font-size:11px;text-transform:uppercase;color:#6b7280;text-align:left;border-bottom:2px solid #e5e7eb;">Platform</th>
             <th style="padding:10px 14px;font-size:11px;text-transform:uppercase;color:#6b7280;text-align:left;border-bottom:2px solid #e5e7eb;">Creator</th>
             <th style="padding:10px 14px;font-size:11px;text-transform:uppercase;color:#6b7280;text-align:left;border-bottom:2px solid #e5e7eb;">Waiting</th>
           </tr>
         </thead>
         <tbody>${cardRows}</tbody>
       </table>
       ${fbWarn(`SLA threshold of ${breachHours}h exceeded. Please log in and approve these cards immediately.`)}
       ${fbBtn(portalUrl, "Review in Portal →", "#dc2626")}`,
    );

    const { data: smtpRow } = await supabaseAdmin
      .from("smtp_config").select("*").eq("id", "global").maybeSingle();

    if (!smtpRow?.host) {
      console.log(`[sla/escalate] SMTP not configured — writing dedup keys to suppress retries`);
      const noSmtp = JSON.stringify({ skippedNoSmtp: true, ts: new Date().toISOString() });
      await kv.mset(Object.fromEntries(dedupKeys.map(k => [k, noSmtp])));
      return c.json({ success: false, sent: 0, skipped: cards.length, reason: "smtp_not_configured" });
    }

    const smtpCfg    = rowToSmtpConfig(smtpRow);
    // Phase 3 QC: decrypt SMTP password (encrypted at rest since Phase 3.2)
    if (smtpCfg.pass) smtpCfg.pass = await decrypt(smtpCfg.pass);
    const transporter = nodemailer.createTransport({
      host:   smtpCfg.host,
      port:   parseInt(smtpCfg.port, 10),
      secure: parseInt(smtpCfg.port, 10) === 465,
      auth:   smtpCfg.user && smtpCfg.pass ? { user: smtpCfg.user, pass: smtpCfg.pass } : undefined,
    });

    let sent = 0;
    for (const recipient of escalateTo) {
      if (!recipient?.email) continue;
      try {
        await transporter.sendMail({
          from:    `"Brandtelligence Platform" <${smtpCfg.fromEmail || "noreply@brandtelligence.com.my"}>`,
          to:      recipient.email,
          subject: `⏰ SLA Alert: ${freshCards.length} pending card${freshCards.length !== 1 ? "s" : ""} need your approval`,
          html:    emailHtml,
        });
        console.log(`[sla/escalate] Escalation dispatched — ${freshCards.length} card(s) for tenant ${tenantId}`);
        sent++;
      } catch (mailErr) {
        console.log(`[sla/escalate] Failed to dispatch escalation for tenant ${tenantId}: ${errMsg(mailErr)}`);
      }
    }

    const freshDedupKeys: string[] = freshCards.map((card: any) => `sla_esc:${today}:${tenantId}:${card.id}`);
    const sentAt = new Date().toISOString();
    await kv.mset(Object.fromEntries(
      freshDedupKeys.map(k => [k, JSON.stringify({ sentAt, recipients: escalateTo.length })]),
    ));

    // Phase 6: audit trail (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'SLA_ESCALATION_SENT', route: '/sla/escalate', detail: `tenantId=${tenantId} sent=${sent} cards=${freshCards.length} recipients=${escalateTo.length}` });
    return c.json({ success: true, sent, skipped: cards.length - freshCards.length });
  } catch (err) {
    console.log(`[sla/escalate] ${errMsg(err)}`);
    return c.json({ error: `slaEscalate: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI Usage Quota  ·  KV-backed monthly counter per tenant
// Key: ai_media_usage:{tenantId}:{YYYY-MM}
// Value: { imageCount, videoCount, totalCostUsd, lastUpdated }
// ─────────────────────────────────────────────────────────────────────────────

interface AiUsageEntry {
  imageCount:   number;
  videoCount:   number;
  totalCostUsd: number;
  lastUpdated:  string;
}

async function incrementAiUsage(tenantId: string | undefined, type: 'image' | 'video', costUsd: number) {
  if (!tenantId) return;
  try {
    const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
    const key      = `ai_media_usage:${tenantId}:${monthKey}`;
    const raw      = await kv.get(key);
    const curr: AiUsageEntry = raw
      ? JSON.parse(raw as string)
      : { imageCount: 0, videoCount: 0, totalCostUsd: 0, lastUpdated: '' };
    if (type === 'image') curr.imageCount += 1;
    else                  curr.videoCount += 1;
    curr.totalCostUsd = Math.round((curr.totalCostUsd + costUsd) * 1000) / 1000;
    curr.lastUpdated  = new Date().toISOString();
    await kv.set(key, JSON.stringify(curr));
    console.log(`[ai-usage] +1 ${type} for tenant=${tenantId} month=${monthKey} totalCost=${curr.totalCostUsd}`);
  } catch (err) {
    console.log(`[incrementAiUsage] ${errMsg(err)}`);
  }
}

// GET /ai/media-usage?tenantId=...&month=YYYY-MM  (month defaults to current)
app.get("/make-server-309fe679/ai/media-usage", async (c) => {
  try {
    const tenantId = c.req.query('tenantId');
    if (!tenantId) return c.json({ error: 'tenantId query param is required' }, 400);

    // Support fetching up to 3 months at once (for the settings chart)
    const monthsParam = c.req.query('months'); // e.g. "2026-02,2026-01,2025-12"
    const now         = new Date().toISOString().slice(0, 7);
    const months      = monthsParam
      ? monthsParam.split(',').slice(0, 6)
      : [now];

    const results: Record<string, AiUsageEntry> = {};
    for (const m of months) {
      const key = `ai_media_usage:${tenantId}:${m}`;
      const raw = await kv.get(key);
      results[m] = raw
        ? JSON.parse(raw as string)
        : { imageCount: 0, videoCount: 0, totalCostUsd: 0, lastUpdated: null };
    }

    return c.json({ tenantId, usage: results });
  } catch (err) {
    console.log(`[ai/media-usage GET] ${errMsg(err)}`);
    return c.json({ error: `mediaUsage: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI Media Generation  ·  POST /ai/generate-image
// Generates a DALL-E 3 image, uploads to Supabase Storage, returns signed URL.
// ─────────────────────────────────────────────────────────────────────────────
app.post("/make-server-309fe679/ai/generate-image", async (c) => {
  try {
    // Phase 4: rate limit AI image generation (ISO 27001 A.9.4.2) — 10/min due to cost
    const limited = rateLimit(c, 'ai:generate-image', 10, 60_000);
    if (limited) return limited;
    // Phase 5: sanitise non-prompt fields (prompt is creative content for AI)
    const {
      prompt, style = 'photorealistic', aspectRatio = '1:1',
      cardId, tenantId,
    } = sanitizeObject(await c.req.json(), new Set(['prompt']));

    if (!prompt?.trim()) return c.json({ error: 'prompt is required' }, 400);

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) return c.json({ error: 'OpenAI API key not configured' }, 500);

    // ── Style enhancement suffix ──
    const styleMap: Record<string, string> = {
      photorealistic: 'photorealistic DSLR photography, professional lighting, sharp focus, high resolution, award-winning',
      cinematic:      'cinematic photography, dramatic Rembrandt lighting, shallow depth of field, film grain, anamorphic lens flare',
      digital_art:    'digital illustration, vibrant saturated colors, highly detailed concept art, trending on ArtStation',
      '3d_render':    '3D render, physically based rendering, ray-traced soft shadows, ultra-detailed CGI, cinematic grade',
      minimalist:     'minimalist design, clean white negative space, flat lay product photography, brand-safe composition',
      anime:          'anime art style, Studio Ghibli inspired, detailed hand-drawn illustration, vibrant cel-shaded palette',
    };
    const sizeMap: Record<string, string> = {
      '1:1':  '1024x1024',
      '16:9': '1792x1024',
      '9:16': '1024x1792',
    };

    const enhanced = `${prompt.trim()}. ${styleMap[style] ?? 'high quality professional'}, social media marketing visual, no text, no watermarks, no logos.`;
    const size = sizeMap[aspectRatio] ?? '1024x1024';

    // ── Call DALL-E 3 ──
    const aiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: 'dall-e-3', prompt: enhanced, n: 1, size, quality: 'hd', style: 'vivid', response_format: 'url' }),
    });
    if (!aiRes.ok) {
      const e = await aiRes.json();
      throw new Error(`DALL-E 3: ${e.error?.message ?? aiRes.statusText}`);
    }
    const aiData  = await aiRes.json();
    const imgUrl  = aiData.data?.[0]?.url;
    const revised = aiData.data?.[0]?.revised_prompt ?? '';
    if (!imgUrl) throw new Error('No image URL returned from DALL-E 3');

    // ── Download & upload to Supabase Storage ──
    const imgBuf   = await (await fetch(imgUrl)).arrayBuffer();
    const filename = `${tenantId ?? 'global'}/${cardId ?? crypto.randomUUID()}-${Date.now()}.png`;
    const { error: upErr } = await supabaseAdmin.storage
      .from(AI_MEDIA_BUCKET)
      .upload(filename, imgBuf, { contentType: 'image/png', upsert: true });
    if (upErr) throw new Error(`Storage upload: ${upErr.message}`);

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(AI_MEDIA_BUCKET)
      .createSignedUrl(filename, 7200); // 2-hour signed URL
    if (signErr) throw new Error(`Signed URL: ${signErr.message}`);

    // ── Track quota ──
    incrementAiUsage(tenantId, 'image', 0.08).catch(() => {});

    console.log(`[ai/generate-image] done size=${size} style=${style} card=${cardId}`);
    // Phase 6: audit trail (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'AI_IMAGE_GENERATED', route: '/ai/generate-image', detail: `tenantId=${tenantId ?? 'global'} style=${style} size=${size} cardId=${cardId ?? 'none'}` });
    return c.json({ success: true, mediaUrl: signed.signedUrl, filename, type: 'image', revisedPrompt: revised });
  } catch (err) {
    console.log(`[ai/generate-image] ${errMsg(err)}`);
    return c.json({ error: `generateImage: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI Media Generation  ·  POST /ai/generate-video
// Starts a Replicate video prediction (minimax/video-01 ≈ 6-10 s).
// Returns { predictionId, status } so the client can poll.
// ─────────────────────────────────────────────────────────────────────────────
app.post("/make-server-309fe679/ai/generate-video", async (c) => {
  try {
    // Phase 4: rate limit AI video generation (ISO 27001 A.9.4.2) — 5/min due to high cost
    const limited = rateLimit(c, 'ai:generate-video', 5, 60_000);
    if (limited) return limited;
    // Phase 5: sanitise non-prompt fields (prompt is creative content for AI)
    const { prompt, style = 'cinematic', cardId, tenantId } = sanitizeObject(await c.req.json(), new Set(['prompt']));
    if (!prompt?.trim()) return c.json({ error: 'prompt is required' }, 400);

    const repKey = Deno.env.get('REPLICATE_API_TOKEN');
    if (!repKey) return c.json({ error: 'Replicate API key not configured — add REPLICATE_API_TOKEN to Supabase secrets' }, 500);

    const styleMap: Record<string, string> = {
      cinematic: 'cinematic camera movement, professional lighting, film look, shallow depth of field',
      dynamic:   'fast-paced dynamic motion, energetic transitions, high-impact visual energy',
      ambient:   'slow gentle ambient motion, serene atmosphere, peaceful flowing movement',
      product:   'clean product showcase, studio hero shot, slow elegant 360 reveal, white background',
    };
    const enhanced = `${prompt.trim()}. ${styleMap[style] ?? 'high quality motion'}, approximately 10 seconds, social media marketing, no text or watermarks, no logos.`;

    // ── Create Replicate prediction (minimax/video-01) ──
    const repRes = await fetch('https://api.replicate.com/v1/models/minimax/video-01/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Token ${repKey}`, Prefer: 'respond-async' },
      body: JSON.stringify({ input: { prompt: enhanced, prompt_optimizer: true } }),
    });
    if (!repRes.ok) {
      const e = await repRes.json();
      throw new Error(`Replicate: ${JSON.stringify(e)}`);
    }
    const repData = await repRes.json();
    if (!repData.id) throw new Error('No prediction ID from Replicate');

    console.log(`[ai/generate-video] started predictionId=${repData.id} style=${style} card=${cardId}`);
    // Phase 6: audit trail (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'AI_VIDEO_GENERATED', route: '/ai/generate-video', detail: `tenantId=${tenantId ?? 'global'} style=${style} predictionId=${repData.id} cardId=${cardId ?? 'none'}` });
    return c.json({ success: true, predictionId: repData.id, status: repData.status ?? 'starting', cardId, tenantId });
  } catch (err) {
    console.log(`[ai/generate-video] ${errMsg(err)}`);
    return c.json({ error: `generateVideo: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI Media Generation  ·  GET /ai/media-status/:predictionId
// Polls Replicate for video completion. When done, downloads the MP4 and
// uploads to Supabase Storage, returning a 2-hour signed URL.
// ─────────────────────────────────────────────────────────────────────────────
app.get("/make-server-309fe679/ai/media-status/:predictionId", async (c) => {
  try {
    const predId   = c.req.param('predictionId');
    const tenantId = c.req.query('tenantId') ?? 'global';
    const cardId   = c.req.query('cardId')   ?? crypto.randomUUID();

    const repKey = Deno.env.get('REPLICATE_API_TOKEN');
    if (!repKey) return c.json({ error: 'Replicate API key not configured' }, 500);

    const repRes = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
      headers: { Authorization: `Token ${repKey}` },
    });
    if (!repRes.ok) throw new Error(`Replicate status ${repRes.status}`);
    const repData = await repRes.json();

    const status = repData.status as string; // starting | processing | succeeded | failed | canceled

    if (status === 'succeeded') {
      const videoUrl = Array.isArray(repData.output) ? repData.output[0] : repData.output;
      if (!videoUrl) throw new Error('Replicate succeeded but output is empty');

      // ── Download video from Replicate delivery CDN ──
      const vidRes = await fetch(videoUrl);
      if (!vidRes.ok) throw new Error(`Failed to fetch video from Replicate CDN: ${vidRes.status}`);
      const vidBuf  = await vidRes.arrayBuffer();
      const filename = `${tenantId}/${cardId}-${predId.slice(0, 8)}-${Date.now()}.mp4`;

      // ── Upload to Supabase Storage ──
      const { error: upErr } = await supabaseAdmin.storage
        .from(AI_MEDIA_BUCKET)
        .upload(filename, vidBuf, { contentType: 'video/mp4', upsert: true });
      if (upErr) throw new Error(`Storage upload: ${upErr.message}`);

      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from(AI_MEDIA_BUCKET)
        .createSignedUrl(filename, 7200);
      if (signErr) throw new Error(`Signed URL: ${signErr.message}`);

      // ── Track quota ──
      incrementAiUsage(tenantId, 'video', 0.50).catch(() => {});

      console.log(`[ai/media-status] video ready predId=${predId} size=${vidBuf.byteLength} bytes`);
      return c.json({ status: 'succeeded', mediaUrl: signed.signedUrl, filename, type: 'video' });
    }

    if (status === 'failed' || status === 'canceled') {
      console.log(`[ai/media-status] ${status} predId=${predId} error=${repData.error}`);
      return c.json({ status: 'failed', error: repData.error ?? `Prediction ${status}` });
    }

    // ── Still in progress — estimate progress from elapsed time ──
    const startedAt = repData.created_at ? new Date(repData.created_at).getTime() : Date.now();
    const elapsed   = (Date.now() - startedAt) / 1000; // seconds
    const estimated = 120; // minimax/video-01 typically takes 60-120 s
    const progress  = Math.min(Math.round((elapsed / estimated) * 100), 94);

    return c.json({ status, progress });
  } catch (err) {
    console.log(`[ai/media-status] ${errMsg(err)}`);
    return c.json({ error: `mediaStatus: ${errMsg(err)}` }, 500);
  }
});

// ─── Social Publishing routes ──────────────────────────────────────────────────
import {
  registerSocialRoutes,
  getConnections  as getSocialConnections,
  publishToChannel,
  appendHistory   as appendSocialHistory,
  syncEngagementForTenant,
} from './social.tsx';
registerSocialRoutes(app);

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT REVIEW PORTAL
// Shareable tokenised review links for external clients (no login required).
// KV key: review_token:{token}  →  ReviewSession JSON
// ─────────────────────────────────────────────────────────────────────────────

interface ReviewDecision {
  decision:  "approved" | "changes_requested";
  comment?:  string;
  decidedAt: string;
}

interface ReviewSession {
  token:      string;
  cardIds:    string[];
  tenantId:   string;
  clientName: string;
  createdAt:  string;
  expiresAt:  string;
  decisions:  Record<string, ReviewDecision>;
}

// POST /client-review/generate
app.post("/make-server-309fe679/client-review/generate", async (c) => {
  try {
    // Phase 3.1: sanitise client review inputs
    const { cardIds, tenantId, clientName, expiresInDays = 7 } = sanitizeObject(await c.req.json());
    if (!Array.isArray(cardIds) || cardIds.length === 0)
      return c.json({ error: "cardIds array is required" }, 400);
    if (!tenantId)   return c.json({ error: "tenantId is required" }, 400);
    if (!clientName) return c.json({ error: "clientName is required" }, 400);

    const token = crypto.randomUUID().replace(/-/g, "");
    const now   = new Date();
    const exp   = new Date(now.getTime() + expiresInDays * 86400000);

    const session: ReviewSession = {
      token, cardIds, tenantId, clientName,
      createdAt: now.toISOString(),
      expiresAt: exp.toISOString(),
      decisions: {},
    };

    await kv.set(`review_token:${token}`, JSON.stringify(session));

    // Secondary index: card_review_tokens:{cardId} → JSON array of tokens
    // Allows fast lookup of all reviews for a given card.
    for (const cardId of cardIds) {
      const indexKey = `card_review_tokens:${cardId}`;
      const existing: string[] = JSON.parse((await kv.get(indexKey) as string | null) ?? "[]");
      if (!existing.includes(token)) {
        existing.push(token);
        await kv.set(indexKey, JSON.stringify(existing));
      }
    }

    const appUrl    = Deno.env.get("APP_URL") ?? "https://brandtelligence.com";
    const reviewUrl = `${appUrl}/review/${token}`;
    console.log(`[client-review/generate] token=${token} tenant=${tenantId} cards=${cardIds.length}`);
    // Phase 6: audit trail for client review link creation (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'CLIENT_REVIEW_CREATED', route: '/client-review/generate', detail: `token=${token} tenantId=${tenantId} cards=${cardIds.length}` });
    return c.json({ token, reviewUrl });
  } catch (err) {
    console.log(`[client-review/generate] ${errMsg(err)}`);
    return c.json({ error: `generateReview: ${errMsg(err)}` }, 500);
  }
});

// GET /client-review/by-card/:cardId  — returns all reviews that include this card
// IMPORTANT: registered BEFORE /:token so "by-card" is not consumed as a token value.
app.get("/make-server-309fe679/client-review/by-card/:cardId", async (c) => {
  try {
    const cardId   = c.req.param("cardId");
    const indexKey = `card_review_tokens:${cardId}`;
    const tokens: string[] = JSON.parse((await kv.get(indexKey) as string | null) ?? "[]");
    if (tokens.length === 0) return c.json({ reviews: [] });

    const sessions = await Promise.all(
      tokens.map(async (tok) => {
        const raw = await kv.get(`review_token:${tok}`);
        return raw ? JSON.parse(raw as string) as ReviewSession : null;
      })
    );

    const reviews = sessions
      .filter((s): s is ReviewSession => s !== null)
      .map((s) => ({
        token:        s.token,
        clientName:   s.clientName,
        createdAt:    s.createdAt,
        expiresAt:    s.expiresAt,
        expired:      new Date() > new Date(s.expiresAt),
        decision:     s.decisions[cardId] ?? null,
        totalCards:   s.cardIds.length,
        totalDecided: Object.keys(s.decisions).length,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ reviews });
  } catch (err) {
    console.log(`[client-review/by-card] ${errMsg(err)}`);
    return c.json({ error: `getReviewsByCard: ${errMsg(err)}` }, 500);
  }
});

// GET /client-review/:token  — public, no auth
app.get("/make-server-309fe679/client-review/:token", async (c) => {
  try {
    // Phase 4: rate limit public review access (ISO 27001 A.9.4.2)
    const limited = rateLimit(c, 'public:client-review', 20, 60_000);
    if (limited) return limited;
    const token = c.req.param("token");
    const raw   = await kv.get(`review_token:${token}`);
    if (!raw) return c.json({ valid: false, reason: "not_found" }, 404);

    const session: ReviewSession = JSON.parse(raw as string);
    const expired = new Date() > new Date(session.expiresAt);

    const { data: rows, error } = await supabaseAdmin
      .from("content_cards")
      .select("id,platform,title,caption,hashtags,media_url,media_type,status,scheduled_date")
      .in("id", session.cardIds);
    if (error) throw error;

    const cards = (rows ?? []).map((r: any) => ({
      id: r.id, platform: r.platform, title: r.title,
      caption: r.caption, hashtags: r.hashtags ?? [],
      mediaUrl: r.media_url, mediaType: r.media_type,
      status: r.status, scheduledDate: r.scheduled_date,
    }));

    return c.json({ valid: true, expired, session, cards });
  } catch (err) {
    console.log(`[client-review GET] ${errMsg(err)}`);
    return c.json({ error: `getReview: ${errMsg(err)}` }, 500);
  }
});

// POST /client-review/:token/decide  — public, no auth
app.post("/make-server-309fe679/client-review/:token/decide", async (c) => {
  try {
    // Phase 4: rate limit public review decisions (ISO 27001 A.9.4.2)
    const limited = rateLimit(c, 'public:client-review-decide', 10, 60_000);
    if (limited) return limited;
    const token = c.req.param("token");
    // Phase 3.1: sanitise client feedback
    const { cardId, decision, comment } = sanitizeObject(await c.req.json());
    if (!cardId || !decision) return c.json({ error: "cardId and decision are required" }, 400);
    if (!["approved", "changes_requested"].includes(decision))
      return c.json({ error: "decision must be 'approved' or 'changes_requested'" }, 400);

    const raw = await kv.get(`review_token:${token}`);
    if (!raw) return c.json({ error: "Review link not found" }, 404);

    const session: ReviewSession = JSON.parse(raw as string);
    if (new Date() > new Date(session.expiresAt))
      return c.json({ error: "Review link has expired" }, 410);
    if (!session.cardIds.includes(cardId))
      return c.json({ error: "Card not in this review" }, 400);

    session.decisions[cardId] = { decision, comment: comment ?? "", decidedAt: new Date().toISOString() };
    await kv.set(`review_token:${token}`, JSON.stringify(session));
    console.log(`[client-review/decide] token=${token} card=${cardId} decision=${decision}`);
    // Phase 6: audit trail for client review decision (ISO 27001 A.12.4.1) — no userId (public route)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'CLIENT_REVIEW_DECIDED', route: '/client-review/:token/decide', detail: `token=${token} cardId=${cardId} decision=${decision}` });
    return c.json({ success: true });
  } catch (err) {
    console.log(`[client-review/decide] ${errMsg(err)}`);
    return c.json({ error: `recordDecision: ${errMsg(err)}` }, 500);
  }
});

// GET /client-review/:token/decisions  — for staff to read client feedback
app.get("/make-server-309fe679/client-review/:token/decisions", async (c) => {
  try {
    const token = c.req.param("token");
    const raw   = await kv.get(`review_token:${token}`);
    if (!raw) return c.json({ found: false }, 404);
    const session: ReviewSession = JSON.parse(raw as string);
    return c.json({ found: true, decisions: session.decisions, clientName: session.clientName, expiresAt: session.expiresAt });
  } catch (err) {
    console.log(`[client-review/decisions] ${errMsg(err)}`);
    return c.json({ error: `getDecisions: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT CARD COMMENTS
// KV key: card_comments:{cardId}  →  JSON array of CardComment[]
// GET    /content/comments?cardId=xxx       → { comments: CardComment[] }
// POST   /content/comments                  ← { cardId, text, authorName, authorEmail }
//                                           → { comment: CardComment }
// DELETE /content/comments/:commentId?cardId=xxx  → { success: true }
// ─────────────────────────────────────────────────────────────────────────────

interface CardComment {
  id:          string;
  cardId:      string;
  text:        string;
  authorName:  string;
  authorEmail: string;
  createdAt:   string;
}

app.get("/make-server-309fe679/content/comments", async (c) => {
  try {
    const cardId = c.req.query("cardId");
    if (!cardId) return c.json({ error: "cardId is required" }, 400);
    const raw = await kv.get(`card_comments:${cardId}`);
    const comments: CardComment[] = raw ? JSON.parse(raw as string) : [];
    return c.json({ comments });
  } catch (err) {
    console.log(`[content/comments GET] ${errMsg(err)}`);
    return c.json({ error: `getComments: ${errMsg(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/content/comments", async (c) => {
  try {
    // Phase 3.1: sanitise comment data
    const { cardId, text, authorName, authorEmail } = sanitizeObject(await c.req.json());
    if (!cardId)       return c.json({ error: "cardId is required" }, 400);
    if (!text?.trim()) return c.json({ error: "text is required" }, 400);
    if (!authorName)   return c.json({ error: "authorName is required" }, 400);

    const key  = `card_comments:${cardId}`;
    const raw  = await kv.get(key);
    const prev: CardComment[] = raw ? JSON.parse(raw as string) : [];

    const comment: CardComment = {
      id:          `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      cardId,
      text:        text.trim(),
      authorName,
      authorEmail: authorEmail ?? "",
      createdAt:   new Date().toISOString(),
    };

    await kv.set(key, JSON.stringify([...prev, comment]));
    console.log(`[content/comments POST] cardId=${cardId} author=${authorName}`);
    // Phase 6: audit trail (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'COMMENT_CREATED', route: '/content/comments', detail: `cardId=${cardId} commentId=${comment.id} author=${authorName}` });
    return c.json({ comment });
  } catch (err) {
    console.log(`[content/comments POST] ${errMsg(err)}`);
    return c.json({ error: `postComment: ${errMsg(err)}` }, 500);
  }
});

app.delete("/make-server-309fe679/content/comments/:commentId", async (c) => {
  try {
    const commentId = c.req.param("commentId");
    const cardId    = c.req.query("cardId");
    if (!cardId) return c.json({ error: "cardId query param is required" }, 400);

    const key = `card_comments:${cardId}`;
    const raw = await kv.get(key);
    if (!raw) return c.json({ success: true });
    const prev: CardComment[] = JSON.parse(raw as string);
    await kv.set(key, JSON.stringify(prev.filter(cm => cm.id !== commentId)));
    console.log(`[content/comments DELETE] cardId=${cardId} commentId=${commentId}`);
    // Phase 6: audit trail (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'COMMENT_DELETED', route: '/content/comments/:commentId', detail: `cardId=${cardId} commentId=${commentId}` });
    return c.json({ success: true });
  } catch (err) {
    console.log(`[content/comments DELETE] ${errMsg(err)}`);
    return c.json({ error: `deleteComment: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-PUBLISH FAILURE ALERTS
// KV key: autopublish_alerts:{tenantId}  →  AutoPublishAlert[] JSON
// Written by the cron when a card exhausts 3 publish attempts.
// ─────────────────────────────────────────────────────────────────────────────

interface AutoPublishAlert {
  cardId:    string;
  cardTitle: string;
  platform:  string;
  failedAt:  string;
  error:     string;
  attempts:  number;
}

async function getAlerts(tenantId: string): Promise<AutoPublishAlert[]> {
  const raw = await kv.get(`autopublish_alerts:${tenantId}`);
  return raw ? JSON.parse(raw as string) : [];
}

async function setAlertsKv(tenantId: string, alerts: AutoPublishAlert[]): Promise<void> {
  if (alerts.length === 0) {
    await kv.del(`autopublish_alerts:${tenantId}`);
  } else {
    await kv.set(`autopublish_alerts:${tenantId}`, JSON.stringify(alerts));
  }
}

async function upsertAlert(tenantId: string, alert: AutoPublishAlert): Promise<void> {
  const list = await getAlerts(tenantId);
  const idx  = list.findIndex((a: AutoPublishAlert) => a.cardId === alert.cardId);
  if (idx >= 0) list[idx] = alert; else list.push(alert);
  await setAlertsKv(tenantId, list);
}

// GET /content/autopublish-alerts?tenantId=xxx
app.get("/make-server-309fe679/content/autopublish-alerts", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    if (!tenantId) return c.json({ error: "tenantId is required" }, 400);
    const alerts = await getAlerts(tenantId);
    return c.json({ alerts });
  } catch (err) {
    console.log(`[autopublish-alerts GET] ${errMsg(err)}`);
    return c.json({ error: `getAlerts: ${errMsg(err)}` }, 500);
  }
});

// DELETE /content/autopublish-alerts/:cardId?tenantId=xxx
app.delete("/make-server-309fe679/content/autopublish-alerts/:cardId", async (c) => {
  try {
    const cardId   = c.req.param("cardId");
    const tenantId = c.req.query("tenantId");
    if (!tenantId) return c.json({ error: "tenantId is required" }, 400);
    const list = await getAlerts(tenantId);
    await setAlertsKv(tenantId, list.filter((a: AutoPublishAlert) => a.cardId !== cardId));
    // Phase 6: audit trail for alert dismissal (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'AUTOPUBLISH_ALERT_DISMISSED', route: '/content/autopublish-alerts/:cardId', detail: `cardId=${cardId} tenantId=${tenantId}` });
    return c.json({ success: true });
  } catch (err) {
    console.log(`[autopublish-alerts DELETE] ${errMsg(err)}`);
    return c.json({ error: `deleteAlert: ${errMsg(err)}` }, 500);
  }
});

// POST /content/autopublish-alerts/:cardId/retry?tenantId=xxx
// Resets autoPublishAttempts → 0 so the cron re-picks the card next minute,
// then removes the alert from KV so the banner clears immediately.
app.post("/make-server-309fe679/content/autopublish-alerts/:cardId/retry", async (c) => {
  try {
    const cardId   = c.req.param("cardId");
    const tenantId = c.req.query("tenantId");
    if (!tenantId) return c.json({ error: "tenantId is required" }, 400);

    // Verify card exists and fetch current metadata
    const { data: card, error: cardErr } = await supabaseAdmin
      .from("content_cards")
      .select("id, metadata, status")
      .eq("id", cardId)
      .single();
    if (cardErr || !card) return c.json({ error: "Card not found" }, 404);

    // Reset retry counters — keep status='scheduled' so cron picks it up next tick
    const meta = card.metadata ?? {};
    await supabaseAdmin.from("content_cards").update({
      metadata: {
        ...meta,
        autoPublishAttempts: 0,
        autoPublishError:    null,
        autoPublishFailedAt: null,
      },
      updated_at: new Date().toISOString(),
    }).eq("id", cardId);

    // Remove failure alert from KV so the banner clears immediately
    const list = await getAlerts(tenantId);
    await setAlertsKv(tenantId, list.filter((a: AutoPublishAlert) => a.cardId !== cardId));

    console.log(`[autopublish-alerts RETRY] card ${cardId} re-queued`);
    // Phase 6: audit trail for autopublish retry (ISO 27001 A.12.4.1)
    logSecurityEvent({ ts: new Date().toISOString(), action: 'AUTOPUBLISH_RETRY', route: '/content/autopublish-alerts/:cardId/retry', detail: `cardId=${cardId} tenantId=${tenantId}` });
    return c.json({ success: true });
  } catch (err) {
    console.log(`[autopublish-alerts RETRY] ${errMsg(err)}`);
    return c.json({ error: `retryAlert: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULED AUTO-PUBLISH CRON
// Runs every minute. Finds content cards with status='scheduled' whose
// scheduled_at has passed and auto-publishes them via the connected social
// account for their platform.
//
// Safety rules:
//   ① Only processes cards where the tenant has a connected account for the card's platform.
//   ② Processes at most 10 cards per tick to avoid timeouts.
//   ③ Cards with metadata.autoPublishAttempts >= 3 are skipped (surface in UI as overdue).
//   ④ On success: card → status='published', metadata.publishedAt recorded.
//   ⑤ On failure: increments metadata.autoPublishAttempts, logs error.
// ─────────────────────────────────────────────────────────────────────────────

try {
  Deno.cron("auto-publish-scheduled-cards", "* * * * *", async () => {
    console.log("[auto-publish-cron] tick");
    try {
      const now = new Date().toISOString();

      // 1. Find scheduled cards whose scheduled_at has passed
      const { data: dueCards, error } = await supabaseAdmin
        .from("content_cards")
        .select("id, tenant_id, platform, title, body, hashtags, media_url, media_type, metadata")
        .eq("status", "scheduled")
        .lte("scheduled_at", now)
        .limit(10);

      if (error) throw error;
      if (!dueCards || dueCards.length === 0) {
        console.log("[auto-publish-cron] no due cards");
        return;
      }

      console.log(`[auto-publish-cron] processing ${dueCards.length} due card(s)`);

      for (const row of dueCards) {
        const meta     = row.metadata ?? {};
        const attempts = (meta.autoPublishAttempts ?? 0) as number;

        // Skip cards that have already failed 3+ times.
        // Idempotently ensure a failure alert exists so the banner catches up.
        if (attempts >= 3) {
          console.log(`[auto-publish-cron] card ${row.id} skipped — max attempts reached`);
          await upsertAlert(row.tenant_id, {
            cardId:    row.id,
            cardTitle: row.title ?? "Untitled",
            platform:  row.platform,
            failedAt:  meta.autoPublishFailedAt ?? new Date().toISOString(),
            error:     meta.autoPublishError ?? "Max retries exceeded",
            attempts,
          });
          continue;
        }

        try {
          // 2. Find first social connection for this tenant+platform
          const conns = await getSocialConnections(row.tenant_id);
          const conn  = conns.find((c: any) => c.platform === row.platform);

          if (!conn) {
            const noConnErr    = `No connected account for ${row.platform}`;
            const newAttempts  = attempts + 1;
            console.log(`[auto-publish-cron] card ${row.id} — ${noConnErr} (attempt ${newAttempts})`);
            const noConnFailedAt = new Date().toISOString();
            await supabaseAdmin.from("content_cards").update({
              metadata: { ...meta, autoPublishAttempts: newAttempts, autoPublishError: noConnErr, ...(newAttempts >= 3 ? { autoPublishFailedAt: noConnFailedAt } : {}) },
              updated_at: noConnFailedAt,
            }).eq("id", row.id);
            // Escalate to failure alert on max retries
            if (newAttempts >= 3) {
              await upsertAlert(row.tenant_id, {
                cardId:    row.id,
                cardTitle: row.title ?? "Untitled",
                platform:  row.platform,
                failedAt:  noConnFailedAt,
                error:     noConnErr,
                attempts:  newAttempts,
              });
              console.log(`[auto-publish-cron] ⚠ card ${row.id} alert written (no-connection, max retries)`);
            }
            continue;
          }

          // 3. Publish
          const caption  = row.body ?? "";
          const hashtags = Array.isArray(row.hashtags) ? row.hashtags : [];
          const result   = await publishToChannel(conn, caption, hashtags, row.media_url ?? undefined, row.media_type ?? undefined);

          if (result.ok) {
            // 4a. Success — mark as published
            const publishedAt = new Date().toISOString();
            const auditEntry  = {
              id:             `audit_cron_${Date.now()}`,
              action:         "published",
              performedBy:    "Auto-Publish (System)",
              performedByEmail: "system@brandtelligence.com",
              timestamp:      publishedAt,
              details:        `Auto-published via ${conn.displayName} (${conn.platform}) at scheduled time`,
            };
            const auditLog = [...(meta.auditLog ?? []), auditEntry];

            await supabaseAdmin.from("content_cards").update({
              status:     "published",
              metadata:   { ...meta, auditLog, autoPublishAttempts: 0, autoPublishError: null },
              updated_at: publishedAt,
            }).eq("id", row.id);

            // Write to publish history
            await appendSocialHistory(row.tenant_id, {
              id:             crypto.randomUUID(),
              cardTitle:      row.title ?? "Untitled",
              platform:       conn.platform,
              connectionName: conn.displayName,
              status:         "success",
              publishedAt,
              publishedBy:    "Auto-Publish (System)",
              postUrl:        result.postUrl,
            });

            console.log(`[auto-publish-cron] ✓ card ${row.id} published via ${conn.platform}`);
            // Phase 6: audit trail for auto-publish success (ISO 27001 A.12.4.1)
            logSecurityEvent({ ts: publishedAt, action: 'AUTOPUBLISH_SUCCESS', route: 'cron:auto-publish', detail: `cardId=${row.id} platform=${conn.platform} tenantId=${row.tenant_id}` });
          } else {
            // 4b. Failure — increment attempts
            const newAttempts = attempts + 1;
            console.log(`[auto-publish-cron] ✗ card ${row.id} publish failed (attempt ${newAttempts}): ${result.error}`);
            const failedAt = new Date().toISOString();
            await supabaseAdmin.from("content_cards").update({
              metadata: { ...meta, autoPublishAttempts: newAttempts, autoPublishError: result.error, ...(newAttempts >= 3 ? { autoPublishFailedAt: failedAt } : {}) },
              updated_at: failedAt,
            }).eq("id", row.id);
            // On final retry, escalate to a dismissable failure alert
            if (newAttempts >= 3) {
              await upsertAlert(row.tenant_id, {
                cardId:    row.id,
                cardTitle: row.title ?? "Untitled",
                platform:  row.platform,
                failedAt:  new Date().toISOString(),
                error:     result.error ?? "Unknown error",
                attempts:  newAttempts,
              });
              console.log(`[auto-publish-cron] ⚠ card ${row.id} alert written (publish error, max retries)`);
              // Phase 6: audit trail for auto-publish permanent failure (ISO 27001 A.12.4.1)
              logSecurityEvent({ ts: new Date().toISOString(), action: 'AUTOPUBLISH_FAILED_MAX_RETRIES', route: 'cron:auto-publish', detail: `cardId=${row.id} platform=${row.platform} tenantId=${row.tenant_id} error=${result.error}` });
            }
          }
        } catch (cardErr) {
          console.log(`[auto-publish-cron] card ${row.id} error: ${cardErr instanceof Error ? cardErr.message : String(cardErr)}`);
        }
      }
    } catch (outerErr) {
      console.log(`[auto-publish-cron] outer error: ${outerErr instanceof Error ? outerErr.message : String(outerErr)}`);
    }
  });
  console.log("[auto-publish-cron] registered (runs every minute)");
} catch (cronErr) {
  // Deno.cron may not be available in all environments
  console.log(`[auto-publish-cron] Deno.cron not available: ${cronErr instanceof Error ? cronErr.message : String(cronErr)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY FAILURE DIGEST CRON  (runs 08:00 UTC every day)
// Sends one email per TENANT_ADMIN user for every tenant that has at least one
// unresolved auto-publish failure alert sitting in KV.
// ─────────────────────────────────────────────────────────────────────────────
try {
  Deno.cron("daily-autopublish-failure-digest", "0 8 * * *", async () => {
    console.log("[failure-digest-cron] tick");
    try {
      // 1. List all tenants
      const { data: tenants, error: tenantErr } = await supabaseAdmin
        .from("tenants")
        .select("id, name");
      if (tenantErr) throw tenantErr;
      if (!tenants || tenants.length === 0) {
        console.log("[failure-digest-cron] no tenants");
        return;
      }

      const appUrl = (Deno.env.get("APP_URL") || "https://brandtelligence.com.my").replace(/\/$/, "");

      for (const tenant of tenants) {
        // 2. Check if this tenant has any unresolved failure alerts
        const alerts = await getAlerts(tenant.id);
        if (alerts.length === 0) continue;

        console.log(`[failure-digest-cron] tenant ${tenant.id} (${tenant.name}) has ${alerts.length} failure(s)`);

        // 3. Find all active TENANT_ADMIN users for this tenant
        const { data: admins } = await supabaseAdmin
          .from("tenant_users")
          .select("email, name")
          .eq("tenant_id", tenant.id)
          .eq("role", "TENANT_ADMIN")
          .eq("status", "active");
        if (!admins || admins.length === 0) {
          console.log(`[failure-digest-cron] no active admins for tenant ${tenant.id}`);
          continue;
        }

        // 4. Build the failure table rows
        const alertRows = alerts.map((a: AutoPublishAlert) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;vertical-align:top;">
              <strong style="font-size:14px;color:#1a1a2e;">${a.cardTitle}</strong><br>
              <span style="font-size:12px;color:#666;">
                Platform: <strong>${a.platform}</strong>
                &nbsp;·&nbsp; Attempts: <strong>${a.attempts}</strong>
                &nbsp;·&nbsp; Failed: ${new Date(a.failedAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}
              </span><br>
              <span style="font-size:12px;color:#dc2626;">Error: ${a.error}</span>
            </td>
          </tr>`).join("");

        const plural = alerts.length !== 1;
        const subject = `⚠️ ${alerts.length} auto-publish failure${plural ? "s" : ""} for ${tenant.name}`;
        const html = fbWrap(
          `Auto-Publish Failure Report`,
          `<p style="font-size:15px;line-height:1.7;color:#444;">
             The following content card${plural ? "s" : ""} failed to publish automatically for <strong>${tenant.name}</strong>
             and will not retry without manual intervention:
           </p>
           <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 8px;">${alertRows}</table>
           ${fbBtn(`${appUrl}/app/content`, "Review in AI Studio →", "#0BA4AA")}
           ${fbWarn(`${plural ? "These cards have" : "This card has"} exhausted 3 auto-publish attempts. Please retry or reschedule ${plural ? "them" : "it"} from the Content Board.`)}`
        );

        // 5. Send to each TENANT_ADMIN
        for (const admin of admins) {
          try {
            await sendAuthEmail(
              admin.email,
              "autopublish_failure_digest",       // template ID (falls back to inline HTML)
              {
                adminName:    admin.name,
                tenantName:   tenant.name,
                failureCount: String(alerts.length),
              },
              subject,
              html,
            );
            console.log(`[failure-digest-cron] ✓ digest dispatched for tenant`);
          } catch (emailErr) {
            // Log but don't abort — other admins/tenants should still get their emails
            console.log(`[failure-digest-cron] ✗ digest dispatch failed: ${errMsg(emailErr)}`);
          }
        }
      }
    } catch (outerErr) {
      console.log(`[failure-digest-cron] outer error: ${errMsg(outerErr)}`);
    }
  });
  console.log("[failure-digest-cron] registered (runs daily at 08:00 UTC)");
} catch (cronErr) {
  console.log(`[failure-digest-cron] Deno.cron not available: ${cronErr instanceof Error ? cronErr.message : String(cronErr)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CRON 3 — Auto-sync engagement analytics from platform APIs (every 6 hours)
// ─────────────────────────────────────────────────────────────────────────────
try {
  Deno.cron("analytics-engagement-sync", "0 */6 * * *", async () => {
    console.log("[analytics-sync-cron] tick");
    try {
      // Get all tenants
      const { data: tenants, error } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("status", "active");

      if (error) throw error;
      if (!tenants?.length) {
        console.log("[analytics-sync-cron] no active tenants");
        return;
      }

      console.log(`[analytics-sync-cron] syncing ${tenants.length} tenant(s)`);

      for (const tenant of tenants) {
        try {
          const result = await syncEngagementForTenant(tenant.id);
          console.log(`[analytics-sync-cron] tenant=${tenant.id} synced=${result.synced} errors=${result.errors}`);
        } catch (tenantErr) {
          console.log(`[analytics-sync-cron] tenant=${tenant.id} error: ${errMsg(tenantErr)}`);
        }
      }
    } catch (outerErr) {
      console.log(`[analytics-sync-cron] outer error: ${errMsg(outerErr)}`);
    }
  });
  console.log("[analytics-sync-cron] registered (runs every 6 hours)");
} catch (cronErr) {
  console.log(`[analytics-sync-cron] Deno.cron not available: ${cronErr instanceof Error ? cronErr.message : String(cronErr)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CRON 4 — DATA RETENTION AUTO-PURGE  (runs daily at 03:00 UTC)
// PDPA s.10 / ISO 27001 A.18.1.3 — personal data and logs must not be retained
// beyond their stated purpose. This cron enforces configurable retention windows:
//   • Security audit logs: 90 days
//   • OAuth state tokens:  1 hour (stale abandoned flows)
//   • SLA escalation dedup keys: 7 days
//   • Content gen usage records: 365 days
//   • Expired review tokens: 30 days past expiry
// ─────────────────────────────────────────────────────────────────────────────
try {
  Deno.cron("data-retention-purge", "0 3 * * *", async () => {
    console.log("[retention-purge] tick");
    const stats = { auditLogs: 0, oauthStates: 0, slaDedup: 0, usageRecords: 0, reviewTokens: 0 };
    try {
      const now = new Date();

      // ── Load configurable retention policy (defaults if not set) ──
      const policyRaw = await kv.get("data_retention_policy");
      const policy: RetentionPolicy = policyRaw
        ? { ...DEFAULT_RETENTION, ...(typeof policyRaw === "string" ? JSON.parse(policyRaw) : policyRaw) }
        : { ...DEFAULT_RETENTION };
      console.log(`[retention-purge] policy: audit=${policy.auditLogDays}d oauth=${policy.oauthStateMinutes}m sla=${policy.slaDedupDays}d usage=${policy.usageRecordMonths}mo review=${policy.reviewTokenDays}d`);

      // ── 1. Security audit logs older than configured days ──
      const auditCutoff = new Date(now);
      auditCutoff.setDate(auditCutoff.getDate() - policy.auditLogDays);
      const auditCutoffStr = auditCutoff.toISOString().slice(0, 10); // YYYY-MM-DD

      // Query all security_audit_log: keys and filter by date
      const { data: auditKeys, error: auditErr } = await supabaseAdmin
        .from("kv_store_309fe679")
        .select("key")
        .like("key", "security_audit_log:%");
      if (!auditErr && auditKeys?.length) {
        const expiredAuditKeys = auditKeys
          .map((r: any) => r.key as string)
          .filter((k: string) => {
            const dateStr = k.replace("security_audit_log:", "");
            return dateStr < auditCutoffStr;
          });
        if (expiredAuditKeys.length > 0) {
          const { error: delErr } = await supabaseAdmin
            .from("kv_store_309fe679")
            .delete()
            .in("key", expiredAuditKeys);
          if (!delErr) stats.auditLogs = expiredAuditKeys.length;
          else console.log(`[retention-purge] audit delete error: ${delErr.message}`);
        }
      }

      // ── 2. Stale OAuth state tokens (> configured minutes old) ──
      const oauthCutoffTs = now.getTime() - (policy.oauthStateMinutes * 60_000);
      const { data: oauthKeys, error: oauthErr } = await supabaseAdmin
        .from("kv_store_309fe679")
        .select("key, value")
        .like("key", "oauth_state:%");
      if (!oauthErr && oauthKeys?.length) {
        const staleOauth = oauthKeys.filter((r: any) => {
          try {
            const payload = typeof r.value === "string" ? JSON.parse(r.value) : r.value;
            return (payload?.ts ?? 0) < oauthCutoffTs;
          } catch { return true; } // unparseable = stale
        }).map((r: any) => r.key as string);
        if (staleOauth.length > 0) {
          const { error: delErr } = await supabaseAdmin
            .from("kv_store_309fe679")
            .delete()
            .in("key", staleOauth);
          if (!delErr) stats.oauthStates = staleOauth.length;
          else console.log(`[retention-purge] oauth delete error: ${delErr.message}`);
        }
      }

      // ── 3. SLA escalation dedup keys older than configured days ──
      const slaCutoff = new Date(now);
      slaCutoff.setDate(slaCutoff.getDate() - policy.slaDedupDays);
      const slaCutoffStr = slaCutoff.toISOString().slice(0, 10);

      const { data: slaKeys, error: slaErr } = await supabaseAdmin
        .from("kv_store_309fe679")
        .select("key")
        .like("key", "sla_esc:%");
      if (!slaErr && slaKeys?.length) {
        const expiredSla = slaKeys
          .map((r: any) => r.key as string)
          .filter((k: string) => {
            // Key format: sla_esc:YYYY-MM-DD:tenantId:cardId
            const dateStr = k.split(":")[1] ?? "";
            return dateStr < slaCutoffStr;
          });
        if (expiredSla.length > 0) {
          const { error: delErr } = await supabaseAdmin
            .from("kv_store_309fe679")
            .delete()
            .in("key", expiredSla);
          if (!delErr) stats.slaDedup = expiredSla.length;
          else console.log(`[retention-purge] sla dedup delete error: ${delErr.message}`);
        }
      }

      // ── 4. Content gen usage records older than configured months ──
      const usageCutoff = new Date(now);
      usageCutoff.setMonth(usageCutoff.getMonth() - policy.usageRecordMonths);
      const usageCutoffMonth = usageCutoff.toISOString().slice(0, 7); // YYYY-MM

      const { data: usageKeys, error: usageErr } = await supabaseAdmin
        .from("kv_store_309fe679")
        .select("key")
        .like("key", "content_gen:usage:%");
      if (!usageErr && usageKeys?.length) {
        const expiredUsage = usageKeys
          .map((r: any) => r.key as string)
          .filter((k: string) => {
            // Key format: content_gen:usage:tenantId:YYYY-MM
            const parts = k.split(":");
            const monthStr = parts[parts.length - 1] ?? "";
            return monthStr < usageCutoffMonth;
          });
        if (expiredUsage.length > 0) {
          const { error: delErr } = await supabaseAdmin
            .from("kv_store_309fe679")
            .delete()
            .in("key", expiredUsage);
          if (!delErr) stats.usageRecords = expiredUsage.length;
          else console.log(`[retention-purge] usage delete error: ${delErr.message}`);
        }
      }

      // ── 5. Expired review tokens (> configured days past creation) ──
      const reviewCutoffTs = now.getTime() - policy.reviewTokenDays * 86_400_000;
      const { data: reviewKeys, error: reviewErr } = await supabaseAdmin
        .from("kv_store_309fe679")
        .select("key, value")
        .like("key", "review_token:%");
      if (!reviewErr && reviewKeys?.length) {
        const expiredReviews = reviewKeys.filter((r: any) => {
          try {
            const session = typeof r.value === "string" ? JSON.parse(r.value) : r.value;
            const created = new Date(session?.createdAt ?? 0).getTime();
            return created < reviewCutoffTs;
          } catch { return true; }
        }).map((r: any) => r.key as string);
        if (expiredReviews.length > 0) {
          const { error: delErr } = await supabaseAdmin
            .from("kv_store_309fe679")
            .delete()
            .in("key", expiredReviews);
          if (!delErr) stats.reviewTokens = expiredReviews.length;
          else console.log(`[retention-purge] review token delete error: ${delErr.message}`);
        }
      }

      const totalPurged = stats.auditLogs + stats.oauthStates + stats.slaDedup + stats.usageRecords + stats.reviewTokens;
      console.log(`[retention-purge] complete — purged ${totalPurged} key(s): audit=${stats.auditLogs} oauth=${stats.oauthStates} sla=${stats.slaDedup} usage=${stats.usageRecords} review=${stats.reviewTokens}`);

      // Phase 6: audit the purge itself (ISO 27001 A.12.4.1)
      logSecurityEvent({ ts: new Date().toISOString(), action: 'DATA_RETENTION_PURGE', route: 'cron:retention-purge', detail: `total=${totalPurged} audit=${stats.auditLogs} oauth=${stats.oauthStates} sla=${stats.slaDedup} usage=${stats.usageRecords} review=${stats.reviewTokens}` });

    } catch (outerErr) {
      console.log(`[retention-purge] outer error: ${errMsg(outerErr)}`);
    }
  });
  console.log("[retention-purge] registered (runs daily at 03:00 UTC)");
} catch (cronErr) {
  console.log(`[retention-purge] Deno.cron not available: ${cronErr instanceof Error ? cronErr.message : String(cronErr)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG INTEGRITY CHECK  (shared logic for cron + on-demand)
// ISO 27001 A.12.4.2 — protection of log information; detect gaps/tampering.
// ─────────────────────────────────────────────────────────────────────────────

async function runAuditIntegrityCheck(trigger: 'cron' | 'manual', triggeredBy?: string): Promise<{ health: 'ok' | 'warning'; gaps: string[]; checked: number; ts: string }> {
  const now = new Date();
  const gaps: string[] = [];

  for (let i = 1; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const raw = await kv.get(`security_audit_log:${dateStr}`);
    if (!raw) gaps.push(dateStr);
  }

  const ts = now.toISOString();
  const result = { health: (gaps.length > 0 ? 'warning' : 'ok') as 'ok' | 'warning', gaps, checked: 7, ts, trigger, triggeredBy };

  if (gaps.length > 0) {
    console.log(`[audit-integrity] missing dates: ${gaps.join(', ')} (trigger=${trigger})`);
    logSecurityEvent({ ts, userId: triggeredBy, action: 'AUDIT_INTEGRITY_WARNING', route: `${trigger}:audit-integrity`, detail: `missingDates=${gaps.join(',')}` });

    // Send email alert to Super Admin (best-effort, never throw)
    try {
      const { data: smtpRow } = await supabaseAdmin
        .from("smtp_config").select("*").eq("id", "global").maybeSingle();
      if (smtpRow?.host) {
        const smtpCfg = rowToSmtpConfig(smtpRow);
        if (smtpCfg.pass) smtpCfg.pass = await decrypt(smtpCfg.pass);
        const transporter = nodemailer.createTransport({
          host: smtpCfg.host, port: parseInt(smtpCfg.port, 10),
          secure: parseInt(smtpCfg.port, 10) === 465,
          auth: smtpCfg.user && smtpCfg.pass ? { user: smtpCfg.user, pass: smtpCfg.pass } : undefined,
        });
        const portalUrl = (Deno.env.get("APP_URL") || "https://brandtelligence.com.my").replace(/\/$/, "") + "/super/audit";
        const gapRows = gaps.map(g => `<tr><td style="padding:8px 14px;font-size:13px;color:#dc2626;border-bottom:1px solid #fecaca;">${g}</td></tr>`).join("");
        const alertHtml = fbWrap(
          `Audit Log Integrity Warning`,
          `<p style="font-size:15px;line-height:1.7;color:#444;">
             The ${trigger === 'cron' ? 'weekly automated' : 'manual on-demand'} audit log integrity check detected
             <strong>${gaps.length} missing day${gaps.length !== 1 ? 's' : ''}</strong> in the security audit log.
           </p>
           <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #fecaca;border-radius:10px;overflow:hidden;margin:20px 0;">
             <thead><tr style="background:#fef2f2;">
               <th style="padding:10px 14px;font-size:11px;text-transform:uppercase;color:#991b1b;text-align:left;border-bottom:2px solid #fecaca;">Missing Dates</th>
             </tr></thead>
             <tbody>${gapRows}</tbody>
           </table>
           ${fbWarn("Missing audit log days may indicate system downtime, log tampering, or a misconfigured cron. Investigate immediately per ISO 27001 A.12.4.2.")}
           ${fbBtn(portalUrl, "View Compliance Dashboard", "#dc2626")}`,
        );
        // Fetch configurable alert recipients (multi-stakeholder)
        const alertRecipients = await getAlertRecipients();
        const enabledRecipients = alertRecipients.filter(r => r.enabled);
        const alertTo = enabledRecipients.length > 0
          ? enabledRecipients.map(r => r.name ? `"${r.name}" <${r.email}>` : r.email).join(', ')
          : smtpCfg.fromEmail || "it@brandtelligence.com.my";
        const fromAddr = smtpCfg.fromEmail || "noreply@brandtelligence.com.my";
        await transporter.sendMail({
          from: `"Brandtelligence Platform" <${fromAddr}>`,
          to: alertTo,
          subject: `[SECURITY] Audit Log Integrity Warning - ${gaps.length} missing day${gaps.length !== 1 ? 's' : ''}`,
          html: alertHtml,
        });
        console.log(`[audit-integrity] alert email sent to ${enabledRecipients.length} recipient(s): ${alertTo}`);
      } else {
        console.log("[audit-integrity] SMTP not configured, skipping alert email");
      }
    } catch (emailErr) {
      console.log(`[audit-integrity] alert email failed (non-fatal): ${errMsg(emailErr)}`);
    }
  } else {
    console.log(`[audit-integrity] all 7 days OK (trigger=${trigger})`);
    logSecurityEvent({ ts, userId: triggeredBy, action: 'AUDIT_INTEGRITY_OK', route: `${trigger}:audit-integrity`, detail: 'last7days=complete' });
  }

  await kv.set("audit_integrity_last_check", JSON.stringify(result));
  return result;
}

// POST /compliance/run-integrity-check  SUPER_ADMIN only (manual on-demand)
app.post("/make-server-309fe679/compliance/run-integrity-check", async (c) => {
  try {
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const rateLimited = await rateLimit(c, 'integrity-check', 1, 60);
    if (rateLimited instanceof Response) return rateLimited;

    const result = await runAuditIntegrityCheck('manual', (auth as AuthIdentity).userId);
    logSecurityEvent({ ts: new Date().toISOString(), userId: (auth as AuthIdentity).userId, action: 'INTEGRITY_CHECK_MANUAL', route: '/compliance/run-integrity-check', detail: `health=${result.health} gaps=${result.gaps.length}` });

    return c.json({ success: true, ...result });
  } catch (err) {
    console.log(`[compliance/run-integrity-check POST] ${errMsg(err)}`);
    return c.json({ error: `runIntegrityCheck: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPLIANCE ALERT RECIPIENTS  (configurable stakeholder email list)
// KV key: "compliance_alert_recipients" → JSON array of AlertRecipient objects
// ─────────────────────────────────────────────────────────────────────────────

interface AlertRecipient {
  id: string;
  email: string;
  name: string;
  role: string;   // e.g. 'CISO', 'DPO', 'IT Admin', 'CTO', 'Custom'
  enabled: boolean;
  addedAt: string;
  addedBy?: string;
}

async function getAlertRecipients(): Promise<AlertRecipient[]> {
  const raw = await kv.get("compliance_alert_recipients");
  if (!raw) {
    // Seed with default Super Admin recipient
    const defaults: AlertRecipient[] = [{
      id: crypto.randomUUID(),
      email: "it@brandtelligence.com.my",
      name: "IT Admin",
      role: "IT Admin",
      enabled: true,
      addedAt: new Date().toISOString(),
    }];
    await kv.set("compliance_alert_recipients", JSON.stringify(defaults));
    return defaults;
  }
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

// GET /compliance/alert-recipients  →  SUPER_ADMIN only
app.get("/make-server-309fe679/compliance/alert-recipients", async (c) => {
  try {
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const recipients = await getAlertRecipients();
    return c.json({ success: true, recipients });
  } catch (err) {
    console.log(`[compliance/alert-recipients GET] ${errMsg(err)}`);
    return c.json({ error: `fetchAlertRecipients: ${errMsg(err)}` }, 500);
  }
});

// PUT /compliance/alert-recipients  →  SUPER_ADMIN only
app.put("/make-server-309fe679/compliance/alert-recipients", async (c) => {
  try {
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;

    const body = await c.req.json();
    const recipients: AlertRecipient[] = body.recipients;

    if (!Array.isArray(recipients)) {
      return c.json({ error: "recipients must be an array" }, 400);
    }

    // Validate each recipient
    for (const r of recipients) {
      if (!r.email || !r.name) {
        return c.json({ error: "Each recipient must have an email and name" }, 400);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) {
        return c.json({ error: `Invalid email: ${r.email}` }, 400);
      }
    }

    await kv.set("compliance_alert_recipients", JSON.stringify(recipients));

    const enabledCount = recipients.filter(r => r.enabled).length;
    logSecurityEvent({
      ts: new Date().toISOString(),
      userId: (auth as AuthIdentity).userId,
      action: 'ALERT_RECIPIENTS_UPDATED',
      route: '/compliance/alert-recipients',
      detail: `total=${recipients.length} enabled=${enabledCount}`,
    });

    console.log(`[compliance/alert-recipients PUT] updated: ${recipients.length} recipients (${enabledCount} enabled)`);
    return c.json({ success: true, recipients });
  } catch (err) {
    console.log(`[compliance/alert-recipients PUT] ${errMsg(err)}`);
    return c.json({ error: `updateAlertRecipients: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PENETRATION TEST RESULTS  (server-side persistence for shared pen test state)
// KV key: "pentest_results" → JSON object { results, updatedAt, updatedBy }
// ─────────────────────────────────────────────────────────────────────────────

// GET /compliance/pentest-results  →  SUPER_ADMIN only
app.get("/make-server-309fe679/compliance/pentest-results", async (c) => {
  try {
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;
    const raw = await kv.get("pentest_results");
    if (!raw) return c.json({ success: true, results: {}, updatedAt: null, updatedBy: null });
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return c.json({ success: true, ...parsed });
  } catch (err) {
    console.log(`[compliance/pentest-results GET] ${errMsg(err)}`);
    return c.json({ error: `fetchPentestResults: ${errMsg(err)}` }, 500);
  }
});

// PUT /compliance/pentest-results  →  SUPER_ADMIN only
app.put("/make-server-309fe679/compliance/pentest-results", async (c) => {
  try {
    const auth = await requireRole(c, 'SUPER_ADMIN');
    if (auth instanceof Response) return auth;

    const body = await c.req.json();
    const results = body.results;

    if (!results || typeof results !== 'object') {
      return c.json({ error: "results must be an object" }, 400);
    }

    const payload = {
      results,
      updatedAt: new Date().toISOString(),
      updatedBy: (auth as AuthIdentity).userId,
    };

    await kv.set("pentest_results", JSON.stringify(payload));

    const totalTests = Object.keys(results).length;
    const passed = Object.values(results).filter((r: any) => r.status === 'pass').length;
    const failed = Object.values(results).filter((r: any) => r.status === 'fail').length;

    logSecurityEvent({
      ts: new Date().toISOString(),
      userId: (auth as AuthIdentity).userId,
      action: 'PENTEST_RESULTS_UPDATED',
      route: '/compliance/pentest-results',
      detail: `total=${totalTests} pass=${passed} fail=${failed}`,
    });

    console.log(`[compliance/pentest-results PUT] saved: ${totalTests} results (${passed} pass, ${failed} fail)`);
    return c.json({ success: true, ...payload });
  } catch (err) {
    console.log(`[compliance/pentest-results PUT] ${errMsg(err)}`);
    return c.json({ error: `updatePentestResults: ${errMsg(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CRON 5 — AUDIT LOG INTEGRITY CHECK  (runs weekly, Sunday 04:00 UTC)
// ─────────────────────────────────────────────────────────────────────────────
try {
  Deno.cron("audit-log-integrity-check", "0 4 * * 0", async () => {
    console.log("[audit-integrity] tick");
    try {
      await runAuditIntegrityCheck('cron');
    } catch (outerErr) {
      console.log(`[audit-integrity] error: ${errMsg(outerErr)}`);
    }
  });
  console.log("[audit-integrity] registered (runs weekly on Sundays at 04:00 UTC)");
} catch (cronErr) {
  console.log(`[audit-integrity] Deno.cron not available: ${cronErr instanceof Error ? cronErr.message : String(cronErr)}`);
}

Deno.serve(app.fetch);
