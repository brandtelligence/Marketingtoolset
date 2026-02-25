import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import nodemailer from "npm:nodemailer";

const app = new Hono();

app.use('*', logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ─── Supabase Admin Client ─────────────────────────────────────────────────────

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ─── Bootstrap: seed Super Admin ──────────────────────────────────────────────

async function seedSuperAdmin() {
  const SUPER_ADMIN_EMAIL    = "it@brandtelligence.com.my";
  const SUPER_ADMIN_PASSWORD = "Th1l155a@2506";
  const SUPER_ADMIN_NAME     = "IT Admin";
  try {
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existing = listData?.users?.find(u => u.email === SUPER_ADMIN_EMAIL);
    if (existing) {
      if (existing.user_metadata?.role !== "SUPER_ADMIN") {
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          user_metadata: { ...existing.user_metadata, name: SUPER_ADMIN_NAME, role: "SUPER_ADMIN", display_name: SUPER_ADMIN_NAME },
        });
        console.log(`[bootstrap] Super Admin role patched for ${SUPER_ADMIN_EMAIL}`);
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
    console.log(`[bootstrap] Unexpected error during Super Admin seed: ${err}`);
  }
}
seedSuperAdmin();

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

// Features store moduleId + rolloutNote as JSON in the description column
// (features table has no module_id or rollout_note columns)
const DEFAULT_FEATURES = [
  { id:"f1", key:"ai_caption",       name:"AI Caption Generator",         description:JSON.stringify({ moduleId:"m1", rolloutNote:"100% rollout" }), global_enabled:true  },
  { id:"f2", key:"bulk_schedule",    name:"Bulk Post Scheduler",          description:JSON.stringify({ moduleId:"m1", rolloutNote:"100% rollout" }), global_enabled:true  },
  { id:"f3", key:"telegram_support", name:"Telegram Channel Support",     description:JSON.stringify({ moduleId:"m1", rolloutNote:"Beta – 50%"   }), global_enabled:true  },
  { id:"f4", key:"content_approval", name:"Multi-step Approval Workflow", description:JSON.stringify({ moduleId:"m2", rolloutNote:"100% rollout" }), global_enabled:true  },
  { id:"f5", key:"gpt4_gen",         name:"GPT-4 Content Generation",     description:JSON.stringify({ moduleId:"m2", rolloutNote:"Staged – 20%" }), global_enabled:false },
  { id:"f6", key:"custom_reports",   name:"Custom Report Builder",        description:JSON.stringify({ moduleId:"m3", rolloutNote:"100% rollout" }), global_enabled:true  },
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
    console.log(`[bootstrap] seedModulesAndFeatures FAILED at startup: ${err}`);
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
    return c.json({
      success:      true,
      modulesInDb:  result.modulesInDb,
      featuresInDb: result.featuresInDb,
      message: `Postgres now has ${result.modulesInDb} module(s) and ${result.featuresInDb} feature flag(s).`,
    });
  } catch (err) {
    console.log(`[seed-modules] ${err}`);
    return c.json({ error: String(err) }, 500); // full error forwarded to the UI
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
    // Frontend-only fields without a Postgres column — return harmless defaults
    size:            "",
    taxId:           "",
    billingAddress:  "",
    suspendedReason: null,
  };
}

function tenantToPg(d: any): Record<string, any> {
  const row: Record<string, any> = {};
  if (d.name           !== undefined) row.name             = d.name;
  if (d.plan           !== undefined) row.plan             = d.plan;
  if (d.status         !== undefined) row.status           = d.status;
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
  return row;
}

// ── TENANT USERS ──────────────────────────────────────────────────────────────
// Postgres status enum: active | invited | suspended
// Frontend UserStatus:  active | pending_invite | inactive

function pgUserStatus(frontendStatus: string): string {
  if (frontendStatus === "pending_invite") return "invited";
  if (frontendStatus === "inactive")       return "suspended";
  return frontendStatus; // active
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

function tenantUserToPg(d: any): Record<string, any> {
  const row: Record<string, any> = {};
  if (d.tenantId  !== undefined) row.tenant_id  = d.tenantId;
  if (d.name      !== undefined) row.name       = d.name;
  if (d.email     !== undefined) row.email      = d.email;
  if (d.role      !== undefined) row.role       = d.role;
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
// Extra invoice fields (invoiceNumber, tenantName, period, subtotal, tax,
// paymentMethod, receiptUrl, notes, lines[]) are serialised as JSON in
// the `description` column — the only text column available.

function pgInvoiceStatus(frontendStatus: string): string {
  if (frontendStatus === "draft" || frontendStatus === "sent") return "unpaid";
  if (frontendStatus === "suspended") return "overdue";
  return frontendStatus; // paid | overdue
}
function frontendInvoiceStatus(pgStatus: string): string {
  if (pgStatus === "unpaid") return "sent";
  return pgStatus; // paid | overdue
}

function rowToInvoice(r: any) {
  let extra: any = {};
  try { extra = JSON.parse(r.description || "{}"); } catch { extra = { notes: r.description ?? "" }; }
  const total = Number(r.amount ?? 0);
  return {
    id:            r.id,
    tenantId:      r.tenant_id       ?? "",
    invoiceNumber: extra.invoiceNumber ?? `INV-${r.id}`,
    tenantName:    extra.tenantName    ?? "",
    period:        extra.period        ?? "",
    status:        frontendInvoiceStatus(r.status ?? "unpaid"),
    subtotal:      extra.subtotal      ?? total,
    tax:           extra.tax           ?? 0,
    total,
    dueDate:       r.due_date          ?? "",
    issuedAt:      r.created_at ? String(r.created_at).slice(0, 10) : "",
    paidAt:        r.paid_date         ?? undefined,
    paymentMethod: extra.paymentMethod ?? "none",
    receiptUrl:    extra.receiptUrl    ?? undefined,
    notes:         extra.notes         ?? "",
    lines:         extra.lines         ?? [],
  };
}

function invoiceToPg(d: any): Record<string, any> {
  const extra = JSON.stringify({
    invoiceNumber: d.invoiceNumber,
    tenantName:    d.tenantName,
    period:        d.period,
    subtotal:      d.subtotal,
    tax:           d.tax,
    paymentMethod: d.paymentMethod,
    receiptUrl:    d.receiptUrl,
    notes:         d.notes,
    lines:         d.lines,
  });
  const row: Record<string, any> = { description: extra };
  if (d.tenantId  !== undefined) row.tenant_id = d.tenantId;
  if (d.total     !== undefined) row.amount    = d.total;
  if (d.status    !== undefined) row.status    = pgInvoiceStatus(d.status);
  if (d.dueDate   !== undefined) row.due_date  = d.dueDate   || null;
  if (d.paidAt    !== undefined) row.paid_date = d.paidAt    || null;
  if (d.issuedAt  !== undefined) row.created_at= d.issuedAt;
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
// moduleId + rolloutNote are stored as JSON in the `description` column.

function rowToFeature(r: any) {
  let meta: any = {};
  try { meta = JSON.parse(r.description || "{}"); } catch {}
  return {
    id:            r.id,
    key:           r.key           ?? "",
    name:          r.name          ?? "",
    globalEnabled: r.global_enabled ?? true,
    moduleId:      meta.moduleId   ?? null,
    rolloutNote:   meta.rolloutNote ?? "",
    description:   meta.text       ?? r.description ?? "",
  };
}

function featureToPg(d: any): Record<string, any> {
  const row: Record<string, any> = {};
  if (d.key           !== undefined) row.key           = d.key;
  if (d.name          !== undefined) row.name          = d.name;
  if (d.globalEnabled !== undefined) row.global_enabled= d.globalEnabled;
  // Merge description update while preserving existing moduleId / rolloutNote
  if (d.description !== undefined || d.moduleId !== undefined || d.rolloutNote !== undefined) {
    row.description = JSON.stringify({
      text:        d.description ?? "",
      moduleId:    d.moduleId    ?? null,
      rolloutNote: d.rolloutNote ?? "",
    });
  }
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
    id:          d.id ?? `al${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    actor_id:    d.actorId   ?? "",
    actor_name:  d.actorName ?? "",
    actor_role:  d.actorRole ?? "SUPER_ADMIN",
    tenant_id:   d.tenantId  ?? null,
    tenant_name: d.tenantName?? null,
    action:      d.action    ?? "",
    resource:    d.resource  ?? "",
    detail:      d.detail    ?? "",
    ip:          d.ip        ?? "",
    severity:    d.severity  ?? "info",
  };
}

// ── PENDING REQUESTS ──────────────────────────────────────────────────────────
// country, size, requestedModules, notes, rejectedReason are serialised as JSON
// in the `message` column — the only free-text column available.

function rowToRequest(r: any) {
  let extra: any = {};
  try { extra = JSON.parse(r.message || "{}"); } catch { extra = { notes: r.message ?? "" }; }
  return {
    id:               r.id,
    companyName:      r.company_name ?? "",
    contactName:      r.contact_name ?? "",
    contactEmail:     r.email        ?? "",
    country:          extra.country          ?? "",
    size:             extra.size             ?? "",
    requestedModules: extra.requestedModules ?? [],
    notes:            extra.notes            ?? "",
    status:           r.status ?? "pending",
    createdAt:        r.submitted_at ? String(r.submitted_at).slice(0, 10) : "",
    reviewedAt:       r.reviewed_at  ?? undefined,
    reviewedBy:       r.reviewed_by  ?? undefined,
    rejectedReason:   extra.rejectedReason ?? undefined,
  };
}

function requestToPg(d: any): Record<string, any> {
  const message = JSON.stringify({
    notes:            d.notes            ?? "",
    country:          d.country          ?? "",
    size:             d.size             ?? "",
    requestedModules: d.requestedModules ?? [],
    rejectedReason:   d.rejectedReason   ?? null,
  });
  const row: Record<string, any> = { message };
  if (d.companyName  !== undefined) row.company_name = d.companyName;
  if (d.contactName  !== undefined) row.contact_name = d.contactName;
  if (d.contactEmail !== undefined) row.email        = d.contactEmail;
  if (d.status       !== undefined) row.status       = d.status;
  if (d.reviewedAt   !== undefined) row.reviewed_at  = d.reviewedAt;
  if (d.reviewedBy   !== undefined) row.reviewed_by  = d.reviewedBy;
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
function normStatus(v: string):   string { return VALID_STATUSES.includes(v)  ? v : "draft";   }

function rowToContentCard(r: any) {
  return {
    id:             r.id,
    tenantId:       r.tenant_id        ?? null,
    title:          r.title            ?? "",
    body:           r.body             ?? "",
    platform:       r.platform         ?? "general",
    status:         r.status           ?? "draft",
    hashtags:       r.hashtags         ?? [],
    mediaUrl:       r.media_url        ?? null,
    createdBy:      r.created_by       ?? "",
    createdByName:  r.created_by_name  ?? "",
    approvedBy:     r.approved_by      ?? null,
    approvedByName: r.approved_by_name ?? null,
    approvedAt:     r.approved_at      ?? null,
    rejectedReason: r.rejected_reason  ?? null,
    scheduledAt:    r.scheduled_at     ?? null,
    publishedAt:    r.published_at     ?? null,
    metadata:       r.metadata         ?? {},
    createdAt:      r.created_at       ?? new Date().toISOString(),
    updatedAt:      r.updated_at       ?? new Date().toISOString(),
  };
}

function contentCardToPg(d: any): Record<string, any> {
  const row: Record<string, any> = {};
  if (d.tenantId       !== undefined) row.tenant_id        = d.tenantId       || null;
  if (d.title          !== undefined) row.title            = d.title;
  if (d.body           !== undefined) row.body             = d.body;
  if (d.platform       !== undefined) row.platform         = normPlatform(d.platform ?? "general");
  if (d.status         !== undefined) row.status           = normStatus(d.status     ?? "draft");
  if (d.hashtags       !== undefined) row.hashtags         = d.hashtags        ?? [];
  if (d.mediaUrl       !== undefined) row.media_url        = d.mediaUrl        ?? null;
  if (d.createdBy      !== undefined) row.created_by       = d.createdBy;
  if (d.createdByName  !== undefined) row.created_by_name  = d.createdByName;
  if (d.approvedBy     !== undefined) row.approved_by      = d.approvedBy      ?? null;
  if (d.approvedByName !== undefined) row.approved_by_name = d.approvedByName  ?? null;
  if (d.approvedAt     !== undefined) row.approved_at      = d.approvedAt      ?? null;
  if (d.rejectedReason !== undefined) row.rejected_reason  = d.rejectedReason  ?? null;
  if (d.scheduledAt    !== undefined) row.scheduled_at     = d.scheduledAt     ?? null;
  if (d.publishedAt    !== undefined) row.published_at     = d.publishedAt     ?? null;
  if (d.metadata       !== undefined) row.metadata         = d.metadata        ?? {};
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

app.post("/make-server-309fe679/bootstrap-super-admin", async (c) => {
  try {
    const auth = c.req.header("Authorization");
    if (!auth) return c.json({ error: "Unauthorized" }, 401);
    await seedSuperAdmin();
    return c.json({ success: true, message: "Bootstrap complete — check server logs." });
  } catch (err) {
    return c.json({ error: `Bootstrap failed: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TENANTS  (Postgres: tenants)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/tenants", async (c) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return c.json({ tenants: (data ?? []).map(rowToTenant) });
  } catch (err) {
    console.log(`[tenants GET] ${err}`);
    return c.json({ error: `fetchTenants: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/tenants", async (c) => {
  try {
    const body = await c.req.json();
    const id  = body.id ?? `t${Date.now()}`;
    const row = {
      ...tenantToPg(body),
      id,
      created_at: body.createdAt ?? new Date().toISOString(),
    };
    const { data, error } = await supabaseAdmin
      .from("tenants").insert(row).select().single();
    if (error) throw error;
    console.log(`[tenants POST] ${id}: ${body.name}`);
    return c.json({ tenant: rowToTenant(data) });
  } catch (err) {
    console.log(`[tenants POST] ${err}`);
    return c.json({ error: `createTenant: ${err}` }, 500);
  }
});

app.put("/make-server-309fe679/tenants/:id", async (c) => {
  try {
    const id  = c.req.param("id");
    const row = tenantToPg(await c.req.json());
    const { data, error } = await supabaseAdmin
      .from("tenants").update(row).eq("id", id).select().single();
    if (error) throw error;
    if (!data)  return c.json({ error: "Tenant not found" }, 404);
    return c.json({ tenant: rowToTenant(data) });
  } catch (err) {
    console.log(`[tenants PUT] ${err}`);
    return c.json({ error: `updateTenant: ${err}` }, 500);
  }
});

app.delete("/make-server-309fe679/tenants/:id", async (c) => {
  try {
    const { error } = await supabaseAdmin
      .from("tenants").delete().eq("id", c.req.param("id"));
    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.log(`[tenants DELETE] ${err}`);
    return c.json({ error: `deleteTenant: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL CHECK  (public — checks tenants + pending_requests in Postgres)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/check-access-email", async (c) => {
  try {
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
    const { data, error } = await supabaseAdmin
      .from("pending_requests")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return c.json({ requests: (data ?? []).map(rowToRequest) });
  } catch (err) {
    console.log(`[requests GET] ${err}`);
    return c.json({ error: `fetchRequests: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/requests", async (c) => {
  try {
    const body = await c.req.json();
    const id   = body.id ?? `req${Date.now()}`;
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
    return c.json({ request: rowToRequest(data) });
  } catch (err) {
    console.log(`[requests POST] ${err}`);
    return c.json({ error: `createRequest: ${err}` }, 500);
  }
});

app.put("/make-server-309fe679/requests/:id", async (c) => {
  try {
    const id   = c.req.param("id");
    const body = await c.req.json();
    const { data: existing } = await supabaseAdmin
      .from("pending_requests").select("*").eq("id", id).single();
    if (!existing) return c.json({ error: "Request not found" }, 404);

    let existingExtra: any = {};
    try { existingExtra = JSON.parse(existing.message || "{}"); } catch {}
    const merged = {
      notes:            body.notes            ?? existingExtra.notes            ?? "",
      country:          body.country          ?? existingExtra.country          ?? "",
      size:             body.size             ?? existingExtra.size             ?? "",
      requestedModules: body.requestedModules ?? existingExtra.requestedModules ?? [],
      rejectedReason:   body.rejectedReason   ?? existingExtra.rejectedReason   ?? null,
    };
    const row: Record<string, any> = { message: JSON.stringify(merged) };
    if (body.companyName !== undefined) row.company_name = body.companyName;
    if (body.contactName !== undefined) row.contact_name = body.contactName;
    if (body.contactEmail!== undefined) row.email        = body.contactEmail;
    if (body.status      !== undefined) row.status       = body.status;
    if (body.reviewedAt  !== undefined) row.reviewed_at  = body.reviewedAt;
    if (body.reviewedBy  !== undefined) row.reviewed_by  = body.reviewedBy;

    const { data, error } = await supabaseAdmin
      .from("pending_requests").update(row).eq("id", id).select().single();
    if (error) throw error;
    console.log(`[requests PUT] ${id} → ${body.status ?? existing.status}`);
    return c.json({ request: rowToRequest(data) });
  } catch (err) {
    console.log(`[requests PUT] ${err}`);
    return c.json({ error: `updateRequest: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TENANT USERS  (Postgres: tenant_users)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/tenant-users", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    let query = supabaseAdmin.from("tenant_users").select("*").order("created_at", { ascending: false });
    if (tenantId) query = query.eq("tenant_id", tenantId);
    const { data, error } = await query;
    if (error) throw error;
    return c.json({ users: (data ?? []).map(rowToTenantUser) });
  } catch (err) {
    console.log(`[tenant-users GET] ${err}`);
    return c.json({ error: `fetchTenantUsers: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/tenant-users", async (c) => {
  try {
    const body = await c.req.json();
    const id   = body.id ?? `u${Date.now()}`;
    const row  = {
      ...tenantUserToPg(body),
      id,
      status:     pgUserStatus(body.status ?? "invited"),
      created_at: body.joinedAt ?? new Date().toISOString(),
    };
    const { data, error } = await supabaseAdmin
      .from("tenant_users").insert(row).select().single();
    if (error) throw error;
    console.log(`[tenant-users POST] ${id}: ${body.email}`);
    return c.json({ user: rowToTenantUser(data) });
  } catch (err) {
    console.log(`[tenant-users POST] ${err}`);
    return c.json({ error: `createTenantUser: ${err}` }, 500);
  }
});

app.put("/make-server-309fe679/tenant-users/:id", async (c) => {
  try {
    const id  = c.req.param("id");
    const row = tenantUserToPg(await c.req.json());
    const { data, error } = await supabaseAdmin
      .from("tenant_users").update(row).eq("id", id).select().single();
    if (error) throw error;
    if (!data)  return c.json({ error: "User not found" }, 404);
    return c.json({ user: rowToTenantUser(data) });
  } catch (err) {
    console.log(`[tenant-users PUT] ${err}`);
    return c.json({ error: `updateTenantUser: ${err}` }, 500);
  }
});

app.delete("/make-server-309fe679/tenant-users/:id", async (c) => {
  try {
    const { error } = await supabaseAdmin
      .from("tenant_users").delete().eq("id", c.req.param("id"));
    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.log(`[tenant-users DELETE] ${err}`);
    return c.json({ error: `deleteTenantUser: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INVOICES  (Postgres: invoices)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/invoices", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    let query = supabaseAdmin.from("invoices").select("*").order("created_at", { ascending: false });
    if (tenantId) query = query.eq("tenant_id", tenantId);
    const { data, error } = await query;
    if (error) throw error;
    return c.json({ invoices: (data ?? []).map(rowToInvoice) });
  } catch (err) {
    console.log(`[invoices GET] ${err}`);
    return c.json({ error: `fetchInvoices: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/invoices", async (c) => {
  try {
    const body = await c.req.json();
    const id   = body.id ?? `inv${Date.now()}`;
    const row  = {
      ...invoiceToPg(body),
      id,
      created_at: body.issuedAt ?? new Date().toISOString(),
    };
    const { data, error } = await supabaseAdmin
      .from("invoices").insert(row).select().single();
    if (error) throw error;
    console.log(`[invoices POST] ${id}`);
    return c.json({ invoice: rowToInvoice(data) });
  } catch (err) {
    console.log(`[invoices POST] ${err}`);
    return c.json({ error: `createInvoice: ${err}` }, 500);
  }
});

app.put("/make-server-309fe679/invoices/:id", async (c) => {
  try {
    const id   = c.req.param("id");
    const body = await c.req.json();
    const { data: existing } = await supabaseAdmin
      .from("invoices").select("*").eq("id", id).single();
    if (!existing) return c.json({ error: "Invoice not found" }, 404);

    let existingExtra: any = {};
    try { existingExtra = JSON.parse(existing.description || "{}"); } catch {}
    const mergedExtra = JSON.stringify({
      invoiceNumber: body.invoiceNumber ?? existingExtra.invoiceNumber,
      tenantName:    body.tenantName    ?? existingExtra.tenantName,
      period:        body.period        ?? existingExtra.period,
      subtotal:      body.subtotal      ?? existingExtra.subtotal,
      tax:           body.tax           ?? existingExtra.tax,
      paymentMethod: body.paymentMethod ?? existingExtra.paymentMethod,
      receiptUrl:    body.receiptUrl    ?? existingExtra.receiptUrl,
      notes:         body.notes         ?? existingExtra.notes,
      lines:         body.lines         ?? existingExtra.lines,
    });

    const row: Record<string, any> = { description: mergedExtra };
    if (body.tenantId !== undefined) row.tenant_id = body.tenantId;
    if (body.total    !== undefined) row.amount    = body.total;
    if (body.status   !== undefined) row.status    = pgInvoiceStatus(body.status);
    if (body.dueDate  !== undefined) row.due_date  = body.dueDate  || null;
    if (body.paidAt   !== undefined) row.paid_date = body.paidAt   || null;

    const { data, error } = await supabaseAdmin
      .from("invoices").update(row).eq("id", id).select().single();
    if (error) throw error;
    return c.json({ invoice: rowToInvoice(data) });
  } catch (err) {
    console.log(`[invoices PUT] ${err}`);
    return c.json({ error: `updateInvoice: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULES  (Postgres: modules)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/modules", async (c) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("modules")
      .select("*")
      .order("id");
    if (error) throw error;
    return c.json({ modules: (data ?? []).map(rowToModule) });
  } catch (err) {
    console.log(`[modules GET] ${err}`);
    return c.json({ error: `fetchModules: ${err}` }, 500);
  }
});

app.put("/make-server-309fe679/modules/:id", async (c) => {
  try {
    const id  = c.req.param("id");
    const row = moduleToPg(await c.req.json());
    const { data, error } = await supabaseAdmin
      .from("modules").update(row).eq("id", id).select().single();
    if (error) throw error;
    if (!data)  return c.json({ error: "Module not found" }, 404);
    console.log(`[modules PUT] ${id} globalEnabled=${data.global_enabled}`);
    return c.json({ module: rowToModule(data) });
  } catch (err) {
    console.log(`[modules PUT] ${err}`);
    return c.json({ error: `updateModule: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES  (Postgres: features)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/features", async (c) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("features")
      .select("*")
      .order("id");
    if (error) throw error;
    return c.json({ features: (data ?? []).map(rowToFeature) });
  } catch (err) {
    console.log(`[features GET] ${err}`);
    return c.json({ error: `fetchFeatures: ${err}` }, 500);
  }
});

app.put("/make-server-309fe679/features/:id", async (c) => {
  try {
    const id  = c.req.param("id");
    const body= await c.req.json();
    const { data: existing } = await supabaseAdmin
      .from("features").select("description").eq("id", id).single();
    let existingMeta: any = {};
    try { existingMeta = JSON.parse(existing?.description || "{}"); } catch {}
    const row = featureToPg({
      ...body,
      moduleId:    body.moduleId    ?? existingMeta.moduleId,
      rolloutNote: body.rolloutNote ?? existingMeta.rolloutNote,
    });
    const { data, error } = await supabaseAdmin
      .from("features").update(row).eq("id", id).select().single();
    if (error) throw error;
    if (!data)  return c.json({ error: "Feature not found" }, 404);
    return c.json({ feature: rowToFeature(data) });
  } catch (err) {
    console.log(`[features PUT] ${err}`);
    return c.json({ error: `updateFeature: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS  (Postgres: audit_logs)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/audit-logs", async (c) => {
  try {
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
    console.log(`[audit-logs GET] ${err}`);
    return c.json({ error: `fetchAuditLogs: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/audit-logs", async (c) => {
  try {
    const body = await c.req.json();
    const row  = auditLogToPg(body);
    const { error } = await supabaseAdmin.from("audit_logs").insert(row);
    if (error) throw error;
    return c.json({ success: true, id: row.id });
  } catch (err) {
    console.log(`[audit-logs POST] ${err}`);
    return c.json({ error: `appendAuditLog: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USAGE STATS  (Postgres: usage_stats)
// tenant_id = NULL means platform-wide. Reads are limited to the latest 90 rows.
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/usage", async (c) => {
  try {
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
    console.log(`[usage GET] ${err}`);
    return c.json({ error: `fetchUsage: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/usage", async (c) => {
  try {
    const { tenantId, point } = await c.req.json();
    if (!point) return c.json({ error: "point is required" }, 400);
    const row: Record<string, any> = {
      period:      point.period  ?? "",
      posts:       point.posts   ?? 0,
      content:     point.content ?? 0,
      api:         point.api     ?? 0,
      users:       point.users   ?? 0,
      recorded_at: new Date().toISOString(),
    };
    if (tenantId) row.tenant_id = tenantId;
    const { error } = await supabaseAdmin.from("usage_stats").insert(row);
    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.log(`[usage POST] ${err}`);
    return c.json({ error: `recordUsage: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT CARDS  (Postgres: content_cards)
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/content-cards", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    let query = supabaseAdmin
      .from("content_cards")
      .select("*")
      .order("created_at", { ascending: false });
    if (tenantId) query = query.eq("tenant_id", tenantId);
    const { data, error } = await query;
    if (error) throw error;
    return c.json({ cards: (data ?? []).map(rowToContentCard), initialized: true });
  } catch (err) {
    console.log(`[content-cards GET] ${err}`);
    return c.json({ error: `fetchContentCards: ${err}`, cards: [] }, 500);
  }
});

app.post("/make-server-309fe679/content-cards", async (c) => {
  try {
    const { card } = await c.req.json();
    if (!card || !card.id) return c.json({ error: "card with id is required" }, 400);
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
    return c.json({ success: true, cardId: card.id, card: rowToContentCard(data) });
  } catch (err) {
    console.log(`[content-cards POST] ${err}`);
    return c.json({ error: `saveContentCard: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/content-cards/sync", async (c) => {
  try {
    const { cards } = await c.req.json();
    if (!Array.isArray(cards)) return c.json({ error: "cards array is required" }, 400);
    if (cards.length === 0)    return c.json({ success: true, count: 0 });
    const now = new Date().toISOString();
    const rows = cards.map((card: any) => ({
      id: card.id,
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
    return c.json({ success: true, count: rows.length });
  } catch (err) {
    console.log(`[content-cards/sync] ${err}`);
    return c.json({ error: `syncContentCards: ${err}` }, 500);
  }
});

app.delete("/make-server-309fe679/content-cards/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const { error } = await supabaseAdmin
      .from("content_cards").delete().eq("id", id);
    if (error) throw error;
    console.log(`[content-cards DELETE] ${id}`);
    return c.json({ success: true, deletedId: id });
  } catch (err) {
    console.log(`[content-cards DELETE] ${err}`);
    return c.json({ error: `deleteContentCard: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// APPROVAL EVENTS  (Postgres: approval_events)
// ─────────────────────────────────────────────────────────────────────────────

app.post("/make-server-309fe679/approval-events", async (c) => {
  try {
    const { event } = await c.req.json();
    if (!event) return c.json({ error: "event is required" }, 400);
    const row: Record<string, any> = {
      id:         event.id ?? `ev${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      event_type: normEventType(event.eventType ?? event.event_type ?? "submitted"),
      actor_id:   event.actorId   ?? event.actor_id   ?? "",
      actor_name: event.actorName ?? event.actor_name ?? "",
      actor_role: event.actorRole ?? event.actor_role ?? "",
      message:    event.message   ?? null,
      created_at: event.createdAt ?? new Date().toISOString(),
    };
    if (event.cardId   || event.card_id)   row.card_id   = event.cardId   ?? event.card_id;
    if (event.tenantId || event.tenant_id) row.tenant_id = event.tenantId ?? event.tenant_id;
    const { error } = await supabaseAdmin.from("approval_events").insert(row);
    if (error) throw error;
    console.log(`[approval-events POST] ${row.id} type=${row.event_type}`);
    return c.json({ success: true, eventId: row.id });
  } catch (err) {
    console.log(`[approval-events POST] ${err}`);
    return c.json({ error: `logApprovalEvent: ${err}` }, 500);
  }
});

app.get("/make-server-309fe679/approval-events", async (c) => {
  try {
    const cardId   = c.req.query("cardId");
    const tenantId = c.req.query("tenantId");
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
    console.log(`[approval-events GET] ${err}`);
    return c.json({ error: `fetchApprovalEvents: ${err}`, events: [] }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SMTP CONFIG  (Postgres: smtp_config, id = 'global')
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/smtp/config", async (c) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("smtp_config").select("*").eq("id", "global").maybeSingle();
    if (error) throw error;
    return c.json({ config: data ? rowToSmtpConfig(data) : null });
  } catch (err) {
    console.log(`[smtp/config GET] ${err}`);
    return c.json({ error: `fetchSmtpConfig: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/smtp/config", async (c) => {
  try {
    const body = await c.req.json();
    const row  = smtpConfigToPg(body);
    const { error } = await supabaseAdmin
      .from("smtp_config")
      .upsert(row, { onConflict: "id" });
    if (error) throw error;
    console.log(`[smtp/config POST] Saved SMTP config (host=${row.host})`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`[smtp/config POST] ${err}`);
    return c.json({ error: `saveSmtpConfig: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/smtp/test", async (c) => {
  try {
    const { to, config } = await c.req.json();
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

    console.log(`[smtp/test] Test email sent to ${to} via ${config.host}:${config.port}`);
    return c.json({ success: true, message: `Test email sent to ${to}` });
  } catch (err) {
    console.log(`[smtp/test] Error: ${err}`);
    return c.json({ error: `SMTP Error: ${String(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES  (Postgres: email_templates)
// Absent rows fall back to the hard-coded default in the calling UI.
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/email-templates/:id", async (c) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("email_templates").select("*").eq("id", c.req.param("id")).maybeSingle();
    if (error) throw error;
    return c.json({ template: data ? rowToEmailTemplate(data) : null });
  } catch (err) {
    console.log(`[email-templates GET] ${err}`);
    return c.json({ error: `fetchEmailTemplate: ${err}` }, 500);
  }
});

app.put("/make-server-309fe679/email-templates/:id", async (c) => {
  try {
    const id   = c.req.param("id");
    const body = await c.req.json();
    const row  = {
      id,
      subject:    body.subject   ?? "",
      html:       body.html      ?? "",
      updated_at: new Date().toISOString(),
      updated_by: body.updatedBy ?? null,
    };
    const { error } = await supabaseAdmin
      .from("email_templates")
      .upsert(row, { onConflict: "id" });
    if (error) throw error;
    console.log(`[email-templates PUT] Saved template: ${id}`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`[email-templates PUT] ${err}`);
    return c.json({ error: `saveEmailTemplate: ${err}` }, 500);
  }
});

app.delete("/make-server-309fe679/email-templates/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const { error } = await supabaseAdmin
      .from("email_templates").delete().eq("id", id);
    if (error) throw error;
    console.log(`[email-templates DELETE] Reset template: ${id}`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`[email-templates DELETE] ${err}`);
    return c.json({ error: `resetEmailTemplate: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/email-templates/:id/test", async (c) => {
  try {
    const { to, subject, html } = await c.req.json();
    if (!to || !subject || !html) return c.json({ error: "Missing required fields: to, subject, html" }, 400);

    // Read SMTP config from Postgres
    const { data: smtpRow, error: smtpErr } = await supabaseAdmin
      .from("smtp_config").select("*").eq("id", "global").maybeSingle();
    if (smtpErr) throw smtpErr;
    if (!smtpRow?.host) return c.json({ error: "SMTP not configured — please save SMTP settings first in Settings → Email / SMTP." }, 400);
    const smtpConfig = rowToSmtpConfig(smtpRow);

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

    console.log(`[email-templates/test] Preview sent to ${to}`);
    return c.json({ success: true, message: `Preview sent to ${to}` });
  } catch (err) {
    console.log(`[email-templates/test] Error: ${err}`);
    return c.json({ error: `Send error: ${String(err)}` }, 500);
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

// ─────────────────────────────────────────────────────────────────────────────
// AUTH ROUTES  (generateLink + custom email dispatch — unchanged externally)
// ─────────────────────────────────────────────────────────────────────────────

app.post("/make-server-309fe679/auth/confirm-signup", async (c) => {
  try {
    const { email, userName } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup", email,
      options: { redirectTo: `${Deno.env.get("APP_URL") || "https://brandtelligence.com.my"}/` },
    });
    if (error || !data?.properties?.action_link) return c.json({ error: `Failed to generate confirmation link: ${error?.message}` }, 500);
    const name = userName || email.split("@")[0];
    await sendAuthEmail(email, "auth_confirm_signup",
      { userName: name, email, confirmUrl: data.properties.action_link, expiresAt: "24 hours" },
      "Confirm your Brandtelligence account",
      fbWrap("Confirm Your Email Address",
        `<p style="font-size:15px;line-height:1.7;color:#444;">Hi ${name}, please confirm your email to activate your account.</p>
         ${fbBtn(data.properties.action_link, "Confirm Email Address →")}
         ${fbWarn("This link expires in 24 hours. If you did not sign up, ignore this email.")}`));
    console.log(`[auth/confirm-signup] Sent to ${email}`);
    return c.json({ success: true, message: `Confirmation email sent to ${email}` });
  } catch (err) {
    console.log(`[auth/confirm-signup] Error: ${err}`);
    return c.json({ error: `confirm-signup error: ${String(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/auth/invite-user", async (c) => {
  try {
    const { email, templateId, vars: extraVars } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite", email,
      options: { redirectTo: `${Deno.env.get("APP_URL") || "https://brandtelligence.com.my"}/` },
    });
    if (error || !data?.properties?.action_link) return c.json({ error: `Failed to generate invite link: ${error?.message}` }, 500);
    const actionUrl  = data.properties.action_link;
    const tplId      = templateId || "auth_invite_user";
    const mergedVars = {
      inviteUrl: actionUrl, expiresAt: "24 hours",
      invitedByName: "Brandtelligence Admin", invitedByEmail: "admin@brandtelligence.com.my",
      employeeName: email.split("@")[0], adminName: "Admin",
      companyName: "Brandtelligence", plan: "Starter", role: "Employee",
      ...(extraVars || {}),
    };
    await sendAuthEmail(email, tplId, mergedVars,
      "You've been invited to Brandtelligence",
      fbWrap("You've Been Invited to Brandtelligence",
        `<p style="font-size:15px;line-height:1.7;color:#444;">You have been invited to join the Brandtelligence Platform.</p>
         ${fbBtn(actionUrl, "Accept Invitation →")}
         ${fbWarn("This invite link expires in 24 hours and can only be used once.")}`));
    console.log(`[auth/invite-user] Invite sent to ${email} using template: ${tplId}`);
    return c.json({ success: true, message: `Invite email sent to ${email}` });
  } catch (err) {
    console.log(`[auth/invite-user] Error: ${err}`);
    return c.json({ error: `invite-user error: ${String(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/auth/magic-link", async (c) => {
  try {
    const { email, userName, ipAddress } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink", email,
      options: { redirectTo: `${Deno.env.get("APP_URL") || "https://brandtelligence.com.my"}/` },
    });
    if (error || !data?.properties?.action_link) return c.json({ error: `Failed to generate magic link: ${error?.message}` }, 500);
    const name = userName || email.split("@")[0];
    const ip   = ipAddress || c.req.header("x-forwarded-for") || "unknown";
    await sendAuthEmail(email, "auth_magic_link",
      { userName: name, magicLinkUrl: data.properties.action_link, expiresAt: "1 hour", ipAddress: ip },
      "Your Brandtelligence sign-in link",
      fbWrap("Your Sign-In Link",
        `<p style="font-size:15px;line-height:1.7;color:#444;">Hi ${name}, click below to sign in — no password required.</p>
         ${fbBtn(data.properties.action_link, "Sign In to Brandtelligence →")}
         ${fbWarn(`If you did not request this, ignore this email. Request from IP: ${ip}`)}`));
    console.log(`[auth/magic-link] Sent to ${email}`);
    return c.json({ success: true, message: `Magic link email sent to ${email}` });
  } catch (err) {
    console.log(`[auth/magic-link] Error: ${err}`);
    return c.json({ error: `magic-link error: ${String(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/auth/change-email", async (c) => {
  try {
    const { email, newEmail, userName } = await c.req.json();
    if (!email || !newEmail) return c.json({ error: "email and newEmail are required" }, 400);
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "email_change_new" as any, email, newEmail,
      options: { redirectTo: `${Deno.env.get("APP_URL") || "https://brandtelligence.com.my"}/` },
    });
    if (error || !data?.properties?.action_link) return c.json({ error: `Failed to generate email change link: ${error?.message}` }, 500);
    const name = userName || email.split("@")[0];
    await sendAuthEmail(newEmail, "auth_email_change",
      { userName: name, oldEmail: email, newEmail, changeUrl: data.properties.action_link, expiresAt: "24 hours" },
      "Confirm your new email address — Brandtelligence",
      fbWrap("Confirm Your New Email Address",
        `<p style="font-size:15px;line-height:1.7;color:#444;">Hi ${name}, click below to confirm <strong>${newEmail}</strong>.</p>
         ${fbBtn(data.properties.action_link, "Confirm New Email →", "#0d9488")}
         ${fbWarn("If you did not request this change, contact support@brandtelligence.com.my immediately.")}`));
    console.log(`[auth/change-email] Sent to ${newEmail}`);
    return c.json({ success: true, message: `Email change confirmation sent to ${newEmail}` });
  } catch (err) {
    console.log(`[auth/change-email] Error: ${err}`);
    return c.json({ error: `change-email error: ${String(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/auth/reset-password", async (c) => {
  try {
    const { email, userName, ipAddress } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery", email,
      options: { redirectTo: `${Deno.env.get("APP_URL") || "https://brandtelligence.com.my"}/` },
    });
    if (error || !data?.properties?.action_link) return c.json({ error: `Failed to generate reset link: ${error?.message}` }, 500);
    const name = userName || email.split("@")[0];
    const ip   = ipAddress || c.req.header("x-forwarded-for") || "unknown";
    await sendAuthEmail(email, "password_reset",
      { userName: name, resetUrl: data.properties.action_link, expiresAt: "1 hour", ipAddress: ip },
      "Reset Your Brandtelligence Password",
      fbWrap("Password Reset Request",
        `<p style="font-size:15px;line-height:1.7;color:#444;">Hi ${name}, click below to reset your password. Valid for 1 hour.</p>
         ${fbBtn(data.properties.action_link, "Reset Password →")}
         ${fbWarn(`If you did not request a reset, ignore this email. Request from IP: ${ip}`)}`));
    console.log(`[auth/reset-password] Sent to ${email}`);
    return c.json({ success: true, message: `Password reset email sent to ${email}` });
  } catch (err) {
    console.log(`[auth/reset-password] Error: ${err}`);
    return c.json({ error: `reset-password error: ${String(err)}` }, 500);
  }
});

app.post("/make-server-309fe679/auth/reauth", async (c) => {
  try {
    const { email, userName, ipAddress, actionDescription } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "reauthentication" as any, email,
    });
    if (error || !data?.properties?.action_link) return c.json({ error: `Failed to generate reauthentication link: ${error?.message}` }, 500);
    const name        = userName    || email.split("@")[0];
    const ip          = ipAddress   || c.req.header("x-forwarded-for") || "unknown";
    const description = actionDescription || "Sensitive account action";
    await sendAuthEmail(email, "auth_reauth",
      { userName: name, reauthUrl: data.properties.action_link, expiresAt: "15 minutes", ipAddress: ip, actionDescription: description },
      "Action Required: Verify your identity — Brandtelligence",
      fbWrap("Verify Your Identity",
        `<p style="font-size:15px;line-height:1.7;color:#444;">Hi ${name}, please verify your identity to complete: <strong>${description}</strong>. Valid for 15 minutes.</p>
         ${fbBtn(data.properties.action_link, "Verify My Identity →", "#f59e0b")}
         ${fbWarn(`If you did not initiate this, ignore this email. Request from IP: ${ip}`)}`));
    console.log(`[auth/reauth] Sent to ${email}`);
    return c.json({ success: true, message: `Reauthentication email sent to ${email}` });
  } catch (err) {
    console.log(`[auth/reauth] Error: ${err}`);
    return c.json({ error: `reauth error: ${String(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT GATEWAY CONFIG  (Postgres: payment_gateway_config, id = 'global')
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/payment-gateway/config", async (c) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("payment_gateway_config").select("*").eq("id", "global").maybeSingle();
    if (error) throw error;
    return c.json({ config: data ? rowToGatewayConfig(data) : null });
  } catch (err) {
    console.log(`[payment-gateway/config GET] ${err}`);
    return c.json({ error: `fetchGatewayConfig: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/payment-gateway/config", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.gatewayId) return c.json({ error: "gatewayId is required" }, 400);
    const row = gatewayConfigToPg(body);
    const { error } = await supabaseAdmin
      .from("payment_gateway_config")
      .upsert(row, { onConflict: "id" });
    if (error) throw error;
    console.log(`[payment-gateway/config POST] Saved config for: ${body.gatewayId} (sandbox=${body.sandboxMode})`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`[payment-gateway/config POST] ${err}`);
    return c.json({ error: `saveGatewayConfig: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/payment-gateway/test", async (c) => {
  try {
    const { gateway, sandboxCreds } = await c.req.json();
    if (!gateway) return c.json({ error: "gateway is required" }, 400);
    const creds: Record<string, string> = sandboxCreds ?? {};

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
    console.log(`[payment-gateway/test] Error: ${err}`);
    return c.json({ error: `Gateway test error: ${String(err)}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MFA POLICY  (Postgres: mfa_policy, id = 'global')
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/mfa/policy", async (c) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("mfa_policy").select("*").eq("id", "global").maybeSingle();
    if (error) throw error;
    return c.json(data ? rowToMfaPolicy(data) : { requireTenantAdminMfa: false });
  } catch (err) {
    console.log(`[mfa/policy GET] ${err}`);
    return c.json({ error: `fetchMfaPolicy: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/mfa/policy", async (c) => {
  try {
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
    return c.json({ success: true });
  } catch (err) {
    console.log(`[mfa/policy POST] ${err}`);
    return c.json({ error: `saveMfaPolicy: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY POLICY  (Postgres: security_policy, id = 'global')
// ─────────────────────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/security/policy", async (c) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("security_policy").select("*").eq("id", "global").maybeSingle();
    if (error) throw error;
    return c.json({ policy: data ? rowToSecurityPolicy(data) : null });
  } catch (err) {
    console.log(`[security/policy GET] ${err}`);
    return c.json({ error: `fetchSecurityPolicy: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/security/policy", async (c) => {
  try {
    const body = await c.req.json();
    const row  = securityPolicyToPg(body);
    const { error } = await supabaseAdmin
      .from("security_policy")
      .upsert(row, { onConflict: "id" });
    if (error) throw error;
    console.log(`[security/policy POST] Policy saved`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`[security/policy POST] ${err}`);
    return c.json({ error: `saveSecurityPolicy: ${err}` }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MFA RECOVERY CODES  (Postgres: mfa_recovery_codes)
// One row per code; normalised from the old KV shape of {codes:[{code,used,usedAt}]}.
// ─────────────────────────────────────────────────────────────────────────────

app.post("/make-server-309fe679/mfa-recovery/store", async (c) => {
  try {
    const { userId, codes } = await c.req.json();
    if (!userId || !Array.isArray(codes) || codes.length === 0)
      return c.json({ error: "userId and codes[] are required" }, 400);

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
    return c.json({ success: true, count: codes.length });
  } catch (err) {
    console.log(`[mfa-recovery/store] Error: ${err}`);
    return c.json({ error: `storeRecoveryCodes: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/mfa-recovery/verify", async (c) => {
  try {
    const { userId, code } = await c.req.json();
    if (!userId || !code) return c.json({ error: "userId and code are required" }, 400);

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
    return c.json({ success: true, remaining });
  } catch (err) {
    console.log(`[mfa-recovery/verify] Error: ${err}`);
    return c.json({ error: `recoveryVerify: ${err}` }, 500);
  }
});

app.post("/make-server-309fe679/mfa/admin/reset-user", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) return c.json({ error: "Unauthorized" }, 401);
    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (authErr || !caller) return c.json({ error: "Unauthorized" }, 401);
    if (caller.user_metadata?.role !== "SUPER_ADMIN")
      return c.json({ error: "Forbidden — only Super Admins can reset user MFA" }, 403);

    const { targetUserId } = await c.req.json();
    if (!targetUserId) return c.json({ error: "targetUserId is required" }, 400);

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
    console.log(`[mfa/admin/reset-user] Reset MFA for ${targetUserId}. Deleted ${deleted} factor(s). Caller: ${caller.email}`);
    return c.json({ success: true, deletedFactors: deleted });
  } catch (err) {
    console.log(`[mfa/admin/reset-user] Error: ${err}`);
    return c.json({ error: `MFA reset error: ${String(err)}` }, 500);
  }
});

Deno.serve(app.fetch);
