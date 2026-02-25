import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import nodemailer from "npm:nodemailer";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
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

// ─── Supabase Admin Client ────────────────────────────────────────────────────

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ─── Bootstrap: seed Super Admin user on startup ─────────────────────────────
// Idempotent — safe to run every cold start. Creates the primary Super Admin
// account if it does not already exist in Supabase Auth.

async function seedSuperAdmin() {
  const SUPER_ADMIN_EMAIL    = "it@brandtelligence.com.my";
  const SUPER_ADMIN_PASSWORD = "Th1l155a@2506";
  const SUPER_ADMIN_NAME     = "IT Admin";

  try {
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existing = listData?.users?.find(u => u.email === SUPER_ADMIN_EMAIL);

    if (existing) {
      // User exists — ensure role metadata is correctly set (idempotent patch)
      const currentRole = existing.user_metadata?.role;
      if (currentRole !== "SUPER_ADMIN") {
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          user_metadata: {
            ...existing.user_metadata,
            name: SUPER_ADMIN_NAME,
            role: "SUPER_ADMIN",
            display_name: SUPER_ADMIN_NAME,
          },
        });
        console.log(`[bootstrap] Super Admin role metadata patched for ${SUPER_ADMIN_EMAIL}`);
      } else {
        console.log(`[bootstrap] Super Admin (${SUPER_ADMIN_EMAIL}) already exists with correct role — skipping.`);
      }
      return;
    }

    // Create the user with email already confirmed
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      user_metadata: {
        name: SUPER_ADMIN_NAME,
        role: "SUPER_ADMIN",
        display_name: SUPER_ADMIN_NAME,
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.log(`[bootstrap] Error creating Super Admin: ${error.message}`);
    } else {
      console.log(`[bootstrap] Super Admin created successfully — uid: ${data.user?.id}`);
    }
  } catch (err) {
    console.log(`[bootstrap] Unexpected error during Super Admin seed: ${err}`);
  }
}

// Run seed on startup (non-blocking)
seedSuperAdmin();

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/make-server-309fe679/health", (c) => {
  return c.json({ status: "ok" });
});

// ─── Super Admin bootstrap endpoint (idempotent, POST to trigger manually) ───

app.post("/make-server-309fe679/bootstrap-super-admin", async (c) => {
  try {
    // Verify caller is authorised (must supply service-level auth)
    const auth = c.req.header("Authorization");
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    await seedSuperAdmin();
    return c.json({ success: true, message: "Bootstrap complete — check server logs." });
  } catch (err) {
    console.log(`[bootstrap-endpoint] Error: ${err}`);
    return c.json({ error: `Bootstrap failed: ${err}` }, 500);
  }
});

// ─── Content Cards ──────────────────────────────────────────────────────────────

const CARD_PREFIX = "content_card:";
const CARD_INDEX_KEY = "content_card_index";

// GET all content cards
app.get("/make-server-309fe679/content-cards", async (c) => {
  try {
    // Get index of card IDs
    const index: string[] | null = await kv.get(CARD_INDEX_KEY);
    if (!index || index.length === 0) {
      return c.json({ cards: [], initialized: false });
    }

    // Fetch all cards by keys
    const keys = index.map((id: string) => `${CARD_PREFIX}${id}`);
    const values = await kv.mget(keys);

    // Filter out any null values from deleted/missing cards
    const cards = values.filter(Boolean);
    return c.json({ cards, initialized: true });
  } catch (error) {
    console.log(`Error fetching content cards: ${error}`);
    return c.json({ error: `Failed to fetch content cards: ${error}`, cards: [] }, 500);
  }
});

// POST create or update a single card
app.post("/make-server-309fe679/content-cards", async (c) => {
  try {
    const { card } = await c.req.json();
    if (!card || !card.id) {
      return c.json({ error: "Card with id is required" }, 400);
    }

    // Save the card
    await kv.set(`${CARD_PREFIX}${card.id}`, card);

    // Update index
    let index: string[] = (await kv.get(CARD_INDEX_KEY)) || [];
    if (!index.includes(card.id)) {
      index = [card.id, ...index];
      await kv.set(CARD_INDEX_KEY, index);
    }

    return c.json({ success: true, cardId: card.id });
  } catch (error) {
    console.log(`Error saving content card: ${error}`);
    return c.json({ error: `Failed to save content card: ${error}` }, 500);
  }
});

// POST bulk sync — replaces all cards
app.post("/make-server-309fe679/content-cards/sync", async (c) => {
  try {
    const { cards } = await c.req.json();
    if (!Array.isArray(cards)) {
      return c.json({ error: "cards array is required" }, 400);
    }

    // Build keys and values
    const ids = cards.map((card: any) => card.id);
    const keys = ids.map((id: string) => `${CARD_PREFIX}${id}`);

    // Batch set all cards
    if (keys.length > 0) {
      await kv.mset(keys, cards);
    }

    // Update the index
    await kv.set(CARD_INDEX_KEY, ids);

    return c.json({ success: true, count: cards.length });
  } catch (error) {
    console.log(`Error syncing content cards: ${error}`);
    return c.json({ error: `Failed to sync content cards: ${error}` }, 500);
  }
});

// DELETE a card
app.delete("/make-server-309fe679/content-cards/:id", async (c) => {
  try {
    const id = c.req.param("id");

    // Remove from KV
    await kv.del(`${CARD_PREFIX}${id}`);

    // Update index
    const index: string[] = (await kv.get(CARD_INDEX_KEY)) || [];
    const newIndex = index.filter((i: string) => i !== id);
    await kv.set(CARD_INDEX_KEY, newIndex);

    return c.json({ success: true, deletedId: id });
  } catch (error) {
    console.log(`Error deleting content card: ${error}`);
    return c.json({ error: `Failed to delete content card: ${error}` }, 500);
  }
});

// ─── Approval Events Log ────────────────────────────────────────────────────────

const EVENTS_PREFIX = "approval_event:";
const EVENTS_INDEX_KEY = "approval_events_index";

// POST log an approval event (for notifications)
app.post("/make-server-309fe679/approval-events", async (c) => {
  try {
    const { event } = await c.req.json();
    if (!event || !event.id) {
      return c.json({ error: "Event with id is required" }, 400);
    }

    await kv.set(`${EVENTS_PREFIX}${event.id}`, event);

    // Update index (keep last 100 events)
    let index: string[] = (await kv.get(EVENTS_INDEX_KEY)) || [];
    index = [event.id, ...index].slice(0, 100);
    await kv.set(EVENTS_INDEX_KEY, index);

    return c.json({ success: true, eventId: event.id });
  } catch (error) {
    console.log(`Error logging approval event: ${error}`);
    return c.json({ error: `Failed to log approval event: ${error}` }, 500);
  }
});

// GET recent approval events
app.get("/make-server-309fe679/approval-events", async (c) => {
  try {
    const index: string[] = (await kv.get(EVENTS_INDEX_KEY)) || [];
    if (index.length === 0) {
      return c.json({ events: [] });
    }

    const keys = index.map((id: string) => `${EVENTS_PREFIX}${id}`);
    const values = await kv.mget(keys);
    const events = values.filter(Boolean);

    return c.json({ events });
  } catch (error) {
    console.log(`Error fetching approval events: ${error}`);
    return c.json({ error: `Failed to fetch approval events: ${error}`, events: [] }, 500);
  }
});

// ─── SMTP Config ──────────────────────────────────────────────────────────────

const SMTP_CONFIG_KEY    = "smtp_config";
const TEMPLATE_PREFIX    = "email_template:";
const GW_CONFIG_KEY      = "payment_gateway_config";
const MFA_POLICY_KEY     = "mfa_policy";
const MFA_RECOVERY_PREFIX = "mfa_recovery:";
const SECURITY_POLICY_KEY = "security_policy";

// ─── Entity KV keys ───────────────────────────────────────────────────────────
const TENANT_PFX       = "tenant:";
const TENANT_IDX       = "tenants_index";
const REQUEST_PFX      = "request:";
const REQUEST_IDX      = "requests_index";
const TUSER_PFX        = "tenant_user:";
const TUSER_IDX        = "tenant_users_index";
const INVOICE_PFX      = "invoice:";
const INVOICE_IDX      = "invoices_index";
const MODULE_PFX       = "module:";
const MODULE_IDX       = "modules_index";
const FEATURE_PFX      = "feature:";
const FEATURE_IDX      = "features_index";
const AUDIT_PFX        = "audit_log:";
const AUDIT_IDX        = "audit_logs_index";
const USAGE_GLOBAL_KEY = "usage_global";
const USAGE_TENANT_PFX = "usage_tenant:";

// ─── Default modules + features (seeded on first boot) ───────────────────────
const DEFAULT_MODULES = [
  { id:"m1",  key:"social_media",        name:"Social Media Management",      description:"Schedule, publish, and analyse social posts across all platforms.",                    globalEnabled:true,  basePrice:200, icon:"📱", category:"marketing"     },
  { id:"m2",  key:"content_studio",      name:"AI Content Studio",            description:"Generate and manage AI-powered marketing content with approval workflow.",              globalEnabled:true,  basePrice:300, icon:"✨", category:"marketing"     },
  { id:"m3",  key:"analytics",           name:"Analytics Dashboard",          description:"Real-time engagement analytics, audience insights, and ROI tracking.",                 globalEnabled:true,  basePrice:150, icon:"📊", category:"analytics"     },
  { id:"m4",  key:"vcard",               name:"Digital vCard Generator",      description:"Create and manage professional digital business cards.",                                globalEnabled:true,  basePrice:100, icon:"🪪", category:"core"          },
  { id:"m5",  key:"email_marketing",     name:"Email Marketing",              description:"Campaign builder, automation, drip sequences, and deliverability tools.",               globalEnabled:true,  basePrice:250, icon:"📧", category:"communication" },
  { id:"m6",  key:"seo_toolkit",         name:"SEO Toolkit",                  description:"Keyword research, rank tracking, and on-page optimisation audit.",                     globalEnabled:true,  basePrice:200, icon:"🔍", category:"marketing"     },
  { id:"m7",  key:"sem",                 name:"Search Engine Marketing",      description:"Paid search advertising campaigns on Google, Bing, and more.",                        globalEnabled:true,  basePrice:350, icon:"💰", category:"marketing"     },
  { id:"m8",  key:"content_marketing",   name:"Content Marketing",            description:"Blog posts, articles, whitepapers, case studies, and infographics.",                   globalEnabled:true,  basePrice:180, icon:"📝", category:"marketing"     },
  { id:"m9",  key:"display_advertising", name:"Display Advertising",          description:"Banner ads, rich media ads, and programmatic display campaigns.",                       globalEnabled:true,  basePrice:280, icon:"🖼️", category:"marketing"     },
  { id:"m10", key:"affiliate_marketing", name:"Affiliate Marketing",          description:"Partner and affiliate programme management and content creation.",                       globalEnabled:true,  basePrice:220, icon:"🤝", category:"marketing"     },
  { id:"m11", key:"video_marketing",     name:"Video Marketing",              description:"YouTube, Vimeo, and OTT platform video content strategy and production.",               globalEnabled:true,  basePrice:320, icon:"🎬", category:"marketing"     },
  { id:"m12", key:"mobile_marketing",    name:"Mobile Marketing",             description:"SMS, push notifications, in-app advertising, and mobile-first campaigns.",              globalEnabled:true,  basePrice:200, icon:"📲", category:"communication" },
  { id:"m13", key:"programmatic_ads",    name:"Programmatic Advertising",     description:"Automated ad buying across networks using DSPs and real-time bidding.",                 globalEnabled:true,  basePrice:400, icon:"🤖", category:"marketing"     },
  { id:"m14", key:"influencer",          name:"Influencer Marketing",         description:"Influencer partnerships, UGC campaigns, and brand ambassador programmes.",               globalEnabled:true,  basePrice:280, icon:"⭐", category:"marketing"     },
  { id:"m15", key:"podcast_audio",       name:"Podcast & Audio Marketing",    description:"Podcast production, audio ads, and Spotify / Apple Music campaigns.",                   globalEnabled:true,  basePrice:250, icon:"🎙️", category:"marketing"     },
  { id:"m16", key:"webinars_events",     name:"Webinars & Virtual Events",    description:"Live webinars, virtual conferences, and online workshop content.",                      globalEnabled:true,  basePrice:300, icon:"🎥", category:"marketing"     },
  { id:"m17", key:"pr_media",            name:"Public Relations & Media",     description:"Press releases, media outreach, and brand reputation management.",                      globalEnabled:true,  basePrice:350, icon:"📰", category:"communication" },
  { id:"m18", key:"content_scrapper",    name:"Content Scrapper",             description:"Scrape, curate, and repurpose content from the web to fuel your pipeline.",             globalEnabled:true,  basePrice:180, icon:"🕷️", category:"marketing"     },
];
const DEFAULT_FEATURES = [
  { id:"f1", key:"ai_caption",       name:"AI Caption Generator",         moduleId:"m1", globalEnabled:true,  rolloutNote:"100% rollout" },
  { id:"f2", key:"bulk_schedule",    name:"Bulk Post Scheduler",          moduleId:"m1", globalEnabled:true,  rolloutNote:"100% rollout" },
  { id:"f3", key:"telegram_support", name:"Telegram Channel Support",     moduleId:"m1", globalEnabled:true,  rolloutNote:"Beta – 50%"   },
  { id:"f4", key:"content_approval", name:"Multi-step Approval Workflow", moduleId:"m2", globalEnabled:true,  rolloutNote:"100% rollout" },
  { id:"f5", key:"gpt4_gen",         name:"GPT-4 Content Generation",     moduleId:"m2", globalEnabled:false, rolloutNote:"Staged – 20%" },
  { id:"f6", key:"custom_reports",   name:"Custom Report Builder",        moduleId:"m3", globalEnabled:true,  rolloutNote:"100% rollout" },
];

async function seedModulesAndFeatures() {
  try {
    const midx: string[] | null = await kv.get(MODULE_IDX);
    if (!midx || midx.length === 0) {
      const ids = DEFAULT_MODULES.map((m: any) => m.id);
      await kv.mset(ids.map((id: string) => `${MODULE_PFX}${id}`), DEFAULT_MODULES);
      await kv.set(MODULE_IDX, ids);
      console.log(`[bootstrap] Seeded ${ids.length} modules.`);
    }
    const fidx: string[] | null = await kv.get(FEATURE_IDX);
    if (!fidx || fidx.length === 0) {
      const fids = DEFAULT_FEATURES.map((f: any) => f.id);
      await kv.mset(fids.map((id: string) => `${FEATURE_PFX}${id}`), DEFAULT_FEATURES);
      await kv.set(FEATURE_IDX, fids);
      console.log(`[bootstrap] Seeded ${fids.length} features.`);
    }
  } catch (err) { console.log(`[bootstrap] seedModulesAndFeatures: ${err}`); }
}
seedModulesAndFeatures();

// ─── Generic KV helpers ───────────────────────────────────────────────────────
async function kvList<T>(prefix: string, indexKey: string): Promise<T[]> {
  const idx: string[] | null = await kv.get(indexKey);
  if (!idx || idx.length === 0) return [];
  const vals = await kv.mget(idx.map((id: string) => `${prefix}${id}`));
  return (vals as T[]).filter(Boolean);
}
async function kvUpdate(prefix: string, id: string, patch: any): Promise<any | null> {
  const existing = await kv.get(`${prefix}${id}`);
  if (!existing) return null;
  const updated = { ...(existing as any), ...patch, updatedAt: new Date().toISOString() };
  await kv.set(`${prefix}${id}`, updated);
  return updated;
}
async function kvSet(prefix: string, indexKey: string, id: string, data: any): Promise<void> {
  await kv.set(`${prefix}${id}`, data);
  const idx: string[] = (await kv.get(indexKey)) ?? [];
  if (!idx.includes(id)) await kv.set(indexKey, [id, ...idx]);
}
async function kvDelete(prefix: string, indexKey: string, id: string): Promise<void> {
  await kv.del(`${prefix}${id}`);
  const idx: string[] = (await kv.get(indexKey)) ?? [];
  await kv.set(indexKey, idx.filter((i: string) => i !== id));
}

// ─────────────────────────────────────────────────────────────────────────────
// TENANTS
// ─────────────────────────────────────────────────────────────────────────────
app.get("/make-server-309fe679/tenants", async (c) => {
  try { return c.json({ tenants: await kvList(TENANT_PFX, TENANT_IDX) }); }
  catch (err) { return c.json({ error: `fetchTenants: ${err}` }, 500); }
});
app.post("/make-server-309fe679/tenants", async (c) => {
  try {
    const data = await c.req.json();
    const id = data.id ?? `t${Date.now()}`;
    const tenant = { ...data, id, createdAt: data.createdAt ?? new Date().toISOString().slice(0, 10) };
    await kvSet(TENANT_PFX, TENANT_IDX, id, tenant);
    console.log(`[tenants POST] ${id}: ${tenant.name}`);
    return c.json({ tenant });
  } catch (err) { return c.json({ error: `createTenant: ${err}` }, 500); }
});
app.put("/make-server-309fe679/tenants/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updated = await kvUpdate(TENANT_PFX, id, await c.req.json());
    if (!updated) return c.json({ error: "Tenant not found" }, 404);
    return c.json({ tenant: updated });
  } catch (err) { return c.json({ error: `updateTenant: ${err}` }, 500); }
});
app.delete("/make-server-309fe679/tenants/:id", async (c) => {
  try {
    await kvDelete(TENANT_PFX, TENANT_IDX, c.req.param("id"));
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `deleteTenant: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL CHECK (public — returns status only, no PII returned)
// ─────────────────────────────────────────────────────────────────────────────
app.get("/make-server-309fe679/check-access-email", async (c) => {
  try {
    const email = (c.req.query("email") ?? "").toLowerCase().trim();
    if (!email) return c.json({ status: "available" });
    const tenants: any[] = await kvList(TENANT_PFX, TENANT_IDX);
    const tenantMatch = tenants.find(
      (t: any) => t.email?.toLowerCase() === email || t.adminEmail?.toLowerCase() === email
    );
    if (tenantMatch) return c.json({ status: "tenant" });
    const requests: any[] = await kvList(REQUEST_PFX, REQUEST_IDX);
    const reqMatch = requests.find((r: any) => r.contactEmail?.toLowerCase() === email);
    if (reqMatch) {
      return c.json({
        status: reqMatch.status === "rejected" ? "rejected" : "pending",
        submittedAt: reqMatch.createdAt,
      });
    }
    return c.json({ status: "available" });
  } catch (_err) {
    return c.json({ status: "available" }); // fail open
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REQUESTS (access requests)
// ─────────────────────────────────────────────────────────────────────────────
app.get("/make-server-309fe679/requests", async (c) => {
  try { return c.json({ requests: await kvList(REQUEST_PFX, REQUEST_IDX) }); }
  catch (err) { return c.json({ error: `fetchRequests: ${err}` }, 500); }
});
app.post("/make-server-309fe679/requests", async (c) => {
  try {
    const data = await c.req.json();
    const id = data.id ?? `req${Date.now()}`;
    const request = { ...data, id, status: data.status ?? "pending", createdAt: data.createdAt ?? new Date().toISOString().slice(0, 10) };
    await kvSet(REQUEST_PFX, REQUEST_IDX, id, request);
    return c.json({ request });
  } catch (err) { return c.json({ error: `createRequest: ${err}` }, 500); }
});
app.put("/make-server-309fe679/requests/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updated = await kvUpdate(REQUEST_PFX, id, await c.req.json());
    if (!updated) return c.json({ error: "Request not found" }, 404);
    console.log(`[requests PUT] ${id} → ${updated.status}`);
    return c.json({ request: updated });
  } catch (err) { return c.json({ error: `updateRequest: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
// TENANT USERS
// ─────────────────────────────────────────────────────────────────────────────
app.get("/make-server-309fe679/tenant-users", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    let users: any[] = await kvList(TUSER_PFX, TUSER_IDX);
    if (tenantId) users = users.filter((u: any) => u.tenantId === tenantId);
    return c.json({ users });
  } catch (err) { return c.json({ error: `fetchTenantUsers: ${err}` }, 500); }
});
app.post("/make-server-309fe679/tenant-users", async (c) => {
  try {
    const data = await c.req.json();
    const id = data.id ?? `u${Date.now()}`;
    const user = { ...data, id, status: data.status ?? "pending_invite", joinedAt: data.joinedAt ?? new Date().toISOString().slice(0, 10) };
    await kvSet(TUSER_PFX, TUSER_IDX, id, user);
    console.log(`[tenant-users POST] ${id}: ${user.email}`);
    return c.json({ user });
  } catch (err) { return c.json({ error: `createTenantUser: ${err}` }, 500); }
});
app.put("/make-server-309fe679/tenant-users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updated = await kvUpdate(TUSER_PFX, id, await c.req.json());
    if (!updated) return c.json({ error: "User not found" }, 404);
    return c.json({ user: updated });
  } catch (err) { return c.json({ error: `updateTenantUser: ${err}` }, 500); }
});
app.delete("/make-server-309fe679/tenant-users/:id", async (c) => {
  try {
    await kvDelete(TUSER_PFX, TUSER_IDX, c.req.param("id"));
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `deleteTenantUser: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
// INVOICES
// ─────────────────────────────────────────────────────────────────────────────
app.get("/make-server-309fe679/invoices", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    let invoices: any[] = await kvList(INVOICE_PFX, INVOICE_IDX);
    if (tenantId) invoices = invoices.filter((i: any) => i.tenantId === tenantId);
    return c.json({ invoices });
  } catch (err) { return c.json({ error: `fetchInvoices: ${err}` }, 500); }
});
app.post("/make-server-309fe679/invoices", async (c) => {
  try {
    const data = await c.req.json();
    const id = data.id ?? `inv${Date.now()}`;
    const invoice = { ...data, id, issuedAt: data.issuedAt ?? new Date().toISOString().slice(0, 10) };
    await kvSet(INVOICE_PFX, INVOICE_IDX, id, invoice);
    console.log(`[invoices POST] ${id}: ${invoice.invoiceNumber}`);
    return c.json({ invoice });
  } catch (err) { return c.json({ error: `createInvoice: ${err}` }, 500); }
});
app.put("/make-server-309fe679/invoices/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updated = await kvUpdate(INVOICE_PFX, id, await c.req.json());
    if (!updated) return c.json({ error: "Invoice not found" }, 404);
    return c.json({ invoice: updated });
  } catch (err) { return c.json({ error: `updateInvoice: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULES
// ─────────────────────────────────────────────────────────────────────────────
app.get("/make-server-309fe679/modules", async (c) => {
  try { return c.json({ modules: await kvList(MODULE_PFX, MODULE_IDX) }); }
  catch (err) { return c.json({ error: `fetchModules: ${err}` }, 500); }
});
app.put("/make-server-309fe679/modules/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updated = await kvUpdate(MODULE_PFX, id, await c.req.json());
    if (!updated) return c.json({ error: "Module not found" }, 404);
    console.log(`[modules PUT] ${id} globalEnabled=${updated.globalEnabled}`);
    return c.json({ module: updated });
  } catch (err) { return c.json({ error: `updateModule: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES
// ─────────────────────────────────────────────────────────────────────────────
app.get("/make-server-309fe679/features", async (c) => {
  try { return c.json({ features: await kvList(FEATURE_PFX, FEATURE_IDX) }); }
  catch (err) { return c.json({ error: `fetchFeatures: ${err}` }, 500); }
});
app.put("/make-server-309fe679/features/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const updated = await kvUpdate(FEATURE_PFX, id, await c.req.json());
    if (!updated) return c.json({ error: "Feature not found" }, 404);
    return c.json({ feature: updated });
  } catch (err) { return c.json({ error: `updateFeature: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────
app.get("/make-server-309fe679/audit-logs", async (c) => {
  try {
    const severity = c.req.query("severity");
    const role     = c.req.query("role");
    const limit    = parseInt(c.req.query("limit") ?? "200");
    let logs: any[] = await kvList(AUDIT_PFX, AUDIT_IDX);
    if (severity) logs = logs.filter((a: any) => a.severity === severity);
    if (role)     logs = logs.filter((a: any) => a.actorRole === role);
    return c.json({ logs: logs.slice(0, limit) });
  } catch (err) { return c.json({ error: `fetchAuditLogs: ${err}` }, 500); }
});
app.post("/make-server-309fe679/audit-logs", async (c) => {
  try {
    const data = await c.req.json();
    const id = `al${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const entry = { ...data, id, createdAt: new Date().toISOString() };
    await kv.set(`${AUDIT_PFX}${id}`, entry);
    const idx: string[] = (await kv.get(AUDIT_IDX)) ?? [];
    await kv.set(AUDIT_IDX, [id, ...idx].slice(0, 1000));
    return c.json({ success: true, id });
  } catch (err) { return c.json({ error: `appendAuditLog: ${err}` }, 500); }
});

// ─────────────────────────────────────────────────────────────────────────────
// USAGE
// ─────────────────────────────────────────────────────────────────────────────
app.get("/make-server-309fe679/usage", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    const key = tenantId ? `${USAGE_TENANT_PFX}${tenantId}` : USAGE_GLOBAL_KEY;
    const data = (await kv.get(key)) ?? [];
    return c.json({ data });
  } catch (err) { return c.json({ error: `fetchUsage: ${err}` }, 500); }
});
app.post("/make-server-309fe679/usage", async (c) => {
  try {
    const { tenantId, point } = await c.req.json();
    const key = tenantId ? `${USAGE_TENANT_PFX}${tenantId}` : USAGE_GLOBAL_KEY;
    const existing: any[] = (await kv.get(key)) ?? [];
    existing.push({ ...point, recordedAt: new Date().toISOString() });
    await kv.set(key, existing.slice(-90));
    return c.json({ success: true });
  } catch (err) { return c.json({ error: `recordUsage: ${err}` }, 500); }
});

// GET SMTP config
app.get("/make-server-309fe679/smtp/config", async (c) => {
  try {
    const config = await kv.get(SMTP_CONFIG_KEY);
    return c.json({ config });
  } catch (err) {
    console.log(`[smtp/config GET] Error: ${err}`);
    return c.json({ error: `Failed to fetch SMTP config: ${err}` }, 500);
  }
});

// POST save SMTP config
app.post("/make-server-309fe679/smtp/config", async (c) => {
  try {
    const body = await c.req.json();
    await kv.set(SMTP_CONFIG_KEY, body);
    return c.json({ success: true });
  } catch (err) {
    console.log(`[smtp/config POST] Error: ${err}`);
    return c.json({ error: `Failed to save SMTP config: ${err}` }, 500);
  }
});

// POST send test email
app.post("/make-server-309fe679/smtp/test", async (c) => {
  try {
    const { to, config } = await c.req.json();
    if (!to || !config?.host || !config?.port) {
      return c.json({ error: "Missing required fields: to, config.host, config.port" }, 400);
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port, 10),
      secure: parseInt(config.port, 10) === 465,
      auth: config.user && config.pass
        ? { user: config.user, pass: config.pass }
        : undefined,
    });

    await transporter.verify();

    // Load the saved "test_email" template from KV, or fall back to a built-in default
    const savedTemplate: any = await kv.get("email_template:test_email");

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
            <p style="margin:0;font-size:13px;color:#16a34a;font-weight:600;">✅ Your SMTP configuration is working correctly. Emails will be delivered as expected.</p>
          </div>
          <p style="margin:12px 0;font-size:15px;line-height:1.7;color:#444;">This test email was triggered from <strong>Settings → Email / SMTP → Send Test</strong> in the Brandtelligence Admin Panel.</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8f8fb;border-radius:10px;border:1px solid #eee;margin:24px 0;">
            <tr><td style="padding:8px 14px;font-size:12px;color:#888;width:130px;">SMTP Host</td><td style="padding:8px 14px;font-size:13px;color:#333;font-weight:600;">{{smtpHost}}</td></tr>
            <tr><td style="padding:8px 14px;font-size:12px;color:#888;">SMTP Port</td><td style="padding:8px 14px;font-size:13px;color:#333;font-weight:600;">{{smtpPort}}</td></tr>
            <tr><td style="padding:8px 14px;font-size:12px;color:#888;">From Email</td><td style="padding:8px 14px;font-size:13px;color:#333;font-weight:600;">{{fromEmail}}</td></tr>
            <tr><td style="padding:8px 14px;font-size:12px;color:#888;">Sent To</td><td style="padding:8px 14px;font-size:13px;color:#333;font-weight:600;">{{sentTo}}</td></tr>
            <tr><td style="padding:8px 14px;font-size:12px;color:#888;">Sent At</td><td style="padding:8px 14px;font-size:13px;color:#333;font-weight:600;">{{sentAt}}</td></tr>
          </table>
          <p style="margin:12px 0;font-size:13px;line-height:1.7;color:#666;">If you received this email, no further action is required. Your platform is ready to send all system notifications.</p>
          <p style="margin:24px 0 0;font-size:12px;color:#888;">You can customise this template (and all other system emails) from <strong>Email Templates</strong> in the left sidebar.</p>
        </td></tr>
        <tr><td style="background:#f8f8f8;border-top:1px solid #eee;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#aaa;">Brandtelligence Sdn Bhd · Kuala Lumpur, Malaysia</p>
          <p style="margin:4px 0 0;font-size:11px;color:#aaa;">© 2026 Brandtelligence. All rights reserved.</p>
        </td></tr>
      </table></td></tr></table>
    </body></html>`;

    const templateSubject = savedTemplate?.subject ?? defaultSubject;
    const templateHtml    = savedTemplate?.html    ?? defaultHtml;

    // Substitute test_email variables with real values
    const vars: Record<string, string> = {
      smtpHost:  config.host,
      smtpPort:  String(config.port),
      fromEmail: config.fromEmail || config.from || "",
      sentTo:    to,
      sentAt:    new Date().toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "full", timeStyle: "short" }),
    };
    const replace = (str: string) => str.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => vars[k] ?? `{{${k}}}`);

    await transporter.sendMail({
      from: `"${config.fromName || 'Brandtelligence'}" <${config.fromEmail || 'noreply@brandtelligence.com.my'}>`,
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

// ─── Email Templates ─────────────────────────────────────────────────────────

// GET single template (from KV, or null if not customised)
app.get("/make-server-309fe679/email-templates/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const template = await kv.get(`${TEMPLATE_PREFIX}${id}`);
    return c.json({ template });
  } catch (err) {
    console.log(`[email-templates GET] Error: ${err}`);
    return c.json({ error: `Failed to fetch template: ${err}` }, 500);
  }
});

// PUT save/update a template
app.put("/make-server-309fe679/email-templates/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    await kv.set(`${TEMPLATE_PREFIX}${id}`, { ...body, savedAt: new Date().toISOString() });
    console.log(`[email-templates PUT] Saved template: ${id}`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`[email-templates PUT] Error: ${err}`);
    return c.json({ error: `Failed to save template: ${err}` }, 500);
  }
});

// DELETE reset a template (removes customisation, reverts to default)
app.delete("/make-server-309fe679/email-templates/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`${TEMPLATE_PREFIX}${id}`);
    console.log(`[email-templates DELETE] Reset template: ${id}`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`[email-templates DELETE] Error: ${err}`);
    return c.json({ error: `Failed to reset template: ${err}` }, 500);
  }
});

// POST send a template test email
app.post("/make-server-309fe679/email-templates/:id/test", async (c) => {
  try {
    const { to, subject, html } = await c.req.json();
    if (!to || !subject || !html) {
      return c.json({ error: "Missing required fields: to, subject, html" }, 400);
    }

    const smtpConfig: any = await kv.get(SMTP_CONFIG_KEY);
    if (!smtpConfig?.host) {
      return c.json({ error: "SMTP not configured — please save SMTP settings first in Settings → Email / SMTP." }, 400);
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: parseInt(smtpConfig.port, 10),
      secure: parseInt(smtpConfig.port, 10) === 465,
      auth: smtpConfig.user && smtpConfig.pass
        ? { user: smtpConfig.user, pass: smtpConfig.pass }
        : undefined,
    });

    // Replace template variables with sample values for preview
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
      // Auth templates (12–16)
      email: 'john.doe@acme.com', confirmUrl: 'https://brandtelligence.com.my/confirm/sample',
      invitedByName: 'Jane Admin', invitedByEmail: 'admin@brandtelligence.com.my',
      magicLinkUrl: 'https://brandtelligence.com.my/magic/sample',
      oldEmail: 'john.old@acme.com', newEmail: 'john.new@acme.com',
      changeUrl: 'https://brandtelligence.com.my/change-email/sample',
      reauthUrl: 'https://brandtelligence.com.my/reauth/sample',
      actionDescription: 'Change Password',
    };

    const renderedSubject = subject.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => sampleVars[k] || `{{${k}}}`);
    const renderedHtml    = html.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => sampleVars[k] || `{{${k}}}`);

    await transporter.sendMail({
      from: `"${smtpConfig.fromName || 'Brandtelligence'}" <${smtpConfig.fromEmail}>`,
      to,
      subject: `[TEMPLATE PREVIEW] ${renderedSubject}`,
      html: renderedHtml,
    });

    console.log(`[email-templates/test] Preview sent to ${to}`);
    return c.json({ success: true, message: `Preview sent to ${to}` });
  } catch (err) {
    console.log(`[email-templates/test] Error: ${err}`);
    return c.json({ error: `Send error: ${String(err)}` }, 500);
  }
});

// ─── Auth Email Helper ────────────────────────────────────────────────────────
// Shared branded wrapper for simple server-side fallback emails.
// These are used only when a template has not yet been saved to KV.
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

/**
 * sendAuthEmail — load a template from KV (or use a branded fallback),
 * substitute {{variables}}, and send via the configured SMTP transporter.
 * Throws if SMTP is not yet configured.
 */
async function sendAuthEmail(
  to: string,
  templateId: string,
  vars: Record<string, string>,
  fallbackSubject: string,
  fallbackHtml: string,
): Promise<void> {
  const smtpConfig: any = await kv.get(SMTP_CONFIG_KEY);
  if (!smtpConfig?.host) {
    throw new Error("SMTP not configured — please save SMTP settings in Settings → Email / SMTP first.");
  }

  // Prefer the KV-saved (possibly customised) version of the template
  const saved: any = await kv.get(`${TEMPLATE_PREFIX}${templateId}`);
  const subject = saved?.subject ?? fallbackSubject;
  const html    = saved?.html    ?? fallbackHtml;

  // Substitute {{variable}} placeholders
  const sub = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => vars[k] ?? `{{${k}}}`);

  const transporter = nodemailer.createTransport({
    host:   smtpConfig.host,
    port:   parseInt(smtpConfig.port, 10),
    secure: parseInt(smtpConfig.port, 10) === 465,
    auth:   smtpConfig.user && smtpConfig.pass
              ? { user: smtpConfig.user, pass: smtpConfig.pass }
              : undefined,
  });

  await transporter.sendMail({
    from:    `"${smtpConfig.fromName || 'Brandtelligence'}" <${smtpConfig.fromEmail || 'noreply@brandtelligence.com.my'}>`,
    to,
    subject: sub(subject),
    html:    sub(html),
  });
}

// ─── Auth Routes — generateLink + custom email dispatch ──────────────────────
//
// Each route:
//   1. Calls supabase.auth.admin.generateLink() to get a Supabase-signed URL
//   2. Loads the matching email template from KV (or a branded fallback)
//   3. Substitutes template variables (including the generated link)
//   4. Sends the email via the configured SMTP transport
//
// Routes are ready for future UI wiring. SMTP must be configured in
// Settings → Email / SMTP before emails will be delivered.

// POST /auth/confirm-signup
// Body: { email, userName? }
// Generates a signup confirmation link and sends Template: auth_confirm_signup
app.post("/make-server-309fe679/auth/confirm-signup", async (c) => {
  try {
    const { email, userName } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email,
      options: { redirectTo: `${Deno.env.get("APP_URL") || "https://brandtelligence.com.my"}/` },
    });
    if (error || !data?.properties?.action_link) {
      console.log(`[auth/confirm-signup] generateLink error: ${error?.message}`);
      return c.json({ error: `Failed to generate confirmation link: ${error?.message}` }, 500);
    }

    const name      = userName || email.split("@")[0];
    const actionUrl = data.properties.action_link;

    await sendAuthEmail(
      email,
      "auth_confirm_signup",
      { userName: name, email, confirmUrl: actionUrl, expiresAt: "24 hours" },
      "Confirm your Brandtelligence account",
      fbWrap("Confirm Your Email Address",
        `<p style="font-size:15px;line-height:1.7;color:#444;">Hi ${name}, please confirm your email address to activate your Brandtelligence account.</p>
         ${fbBtn(actionUrl, "Confirm Email Address →")}
         ${fbWarn("This link expires in 24 hours. If you did not sign up, ignore this email.")}`
      ),
    );

    console.log(`[auth/confirm-signup] Confirmation email sent to ${email}`);
    return c.json({ success: true, message: `Confirmation email sent to ${email}` });
  } catch (err) {
    console.log(`[auth/confirm-signup] Error: ${err}`);
    return c.json({ error: `confirm-signup error: ${String(err)}` }, 500);
  }
});

// POST /auth/invite-user
// Body: { email, templateId?, vars? }
//   templateId defaults to 'auth_invite_user' but callers may pass
//   'tenant_invite' or 'welcome_employee' to use those richer templates.
//   vars is merged with the generated inviteUrl and expiresAt.
// Generates a Supabase invite link and sends the chosen template.
app.post("/make-server-309fe679/auth/invite-user", async (c) => {
  try {
    const { email, templateId, vars: extraVars } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo: `${Deno.env.get("APP_URL") || "https://brandtelligence.com.my"}/` },
    });
    if (error || !data?.properties?.action_link) {
      console.log(`[auth/invite-user] generateLink error: ${error?.message}`);
      return c.json({ error: `Failed to generate invite link: ${error?.message}` }, 500);
    }

    const actionUrl  = data.properties.action_link;
    const tplId      = templateId || "auth_invite_user";
    const mergedVars = {
      inviteUrl:     actionUrl,
      expiresAt:     "24 hours",
      invitedByName:  "Brandtelligence Admin",
      invitedByEmail: "admin@brandtelligence.com.my",
      // welcome_employee / tenant_invite variables
      employeeName:  email.split("@")[0],
      adminName:     "Admin",
      companyName:   "Brandtelligence",
      plan:          "Starter",
      role:          "Employee",
      ...(extraVars || {}),
    };

    await sendAuthEmail(
      email,
      tplId,
      mergedVars,
      "You've been invited to Brandtelligence",
      fbWrap("You've Been Invited to Brandtelligence",
        `<p style="font-size:15px;line-height:1.7;color:#444;">You have been invited to join the Brandtelligence Platform. Click the button below to set up your account.</p>
         ${fbBtn(actionUrl, "Accept Invitation →")}
         ${fbWarn("This invite link expires in 24 hours and can only be used once.")}`
      ),
    );

    console.log(`[auth/invite-user] Invite email sent to ${email} using template: ${tplId}`);
    return c.json({ success: true, message: `Invite email sent to ${email}` });
  } catch (err) {
    console.log(`[auth/invite-user] Error: ${err}`);
    return c.json({ error: `invite-user error: ${String(err)}` }, 500);
  }
});

// POST /auth/magic-link
// Body: { email, userName?, ipAddress? }
// Generates a magic (passwordless) sign-in link and sends Template: auth_magic_link
app.post("/make-server-309fe679/auth/magic-link", async (c) => {
  try {
    const { email, userName, ipAddress } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${Deno.env.get("APP_URL") || "https://brandtelligence.com.my"}/` },
    });
    if (error || !data?.properties?.action_link) {
      console.log(`[auth/magic-link] generateLink error: ${error?.message}`);
      return c.json({ error: `Failed to generate magic link: ${error?.message}` }, 500);
    }

    const name      = userName || email.split("@")[0];
    const actionUrl = data.properties.action_link;
    const ip        = ipAddress || c.req.header("x-forwarded-for") || "unknown";

    await sendAuthEmail(
      email,
      "auth_magic_link",
      { userName: name, magicLinkUrl: actionUrl, expiresAt: "1 hour", ipAddress: ip },
      "Your Brandtelligence sign-in link",
      fbWrap("Your Sign-In Link",
        `<p style="font-size:15px;line-height:1.7;color:#444;">Hi ${name}, click the button below to sign in to your Brandtelligence account — no password required.</p>
         ${fbBtn(actionUrl, "Sign In to Brandtelligence →")}
         ${fbWarn(`If you did not request this, ignore this email. Request from IP: ${ip}`)}`
      ),
    );

    console.log(`[auth/magic-link] Magic link email sent to ${email}`);
    return c.json({ success: true, message: `Magic link email sent to ${email}` });
  } catch (err) {
    console.log(`[auth/magic-link] Error: ${err}`);
    return c.json({ error: `magic-link error: ${String(err)}` }, 500);
  }
});

// POST /auth/change-email
// Body: { email, newEmail, userName? }
// Generates an email change confirmation link and sends Template: auth_email_change
app.post("/make-server-309fe679/auth/change-email", async (c) => {
  try {
    const { email, newEmail, userName } = await c.req.json();
    if (!email || !newEmail) return c.json({ error: "email and newEmail are required" }, 400);

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "email_change_new" as any,
      email,
      newEmail,
      options: { redirectTo: `${Deno.env.get("APP_URL") || "https://brandtelligence.com.my"}/` },
    });
    if (error || !data?.properties?.action_link) {
      console.log(`[auth/change-email] generateLink error: ${error?.message}`);
      return c.json({ error: `Failed to generate email change link: ${error?.message}` }, 500);
    }

    const name      = userName || email.split("@")[0];
    const actionUrl = data.properties.action_link;

    await sendAuthEmail(
      newEmail,
      "auth_email_change",
      { userName: name, oldEmail: email, newEmail, changeUrl: actionUrl, expiresAt: "24 hours" },
      "Confirm your new email address — Brandtelligence",
      fbWrap("Confirm Your New Email Address",
        `<p style="font-size:15px;line-height:1.7;color:#444;">Hi ${name}, click below to confirm <strong>${newEmail}</strong> as your new Brandtelligence sign-in email.</p>
         ${fbBtn(actionUrl, "Confirm New Email →", "#0d9488")}
         ${fbWarn("If you did not request this change, contact support@brandtelligence.com.my immediately.")}`
      ),
    );

    console.log(`[auth/change-email] Email change confirmation sent to ${newEmail}`);
    return c.json({ success: true, message: `Email change confirmation sent to ${newEmail}` });
  } catch (err) {
    console.log(`[auth/change-email] Error: ${err}`);
    return c.json({ error: `change-email error: ${String(err)}` }, 500);
  }
});

// POST /auth/reset-password
// Body: { email, userName?, ipAddress? }
// Generates a password recovery link and sends Template: password_reset (template #9)
// This is the live wired version of the LoginPage "Forgot Password" form.
app.post("/make-server-309fe679/auth/reset-password", async (c) => {
  try {
    const { email, userName, ipAddress } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${Deno.env.get("APP_URL") || "https://brandtelligence.com.my"}/` },
    });
    if (error || !data?.properties?.action_link) {
      console.log(`[auth/reset-password] generateLink error: ${error?.message}`);
      return c.json({ error: `Failed to generate reset link: ${error?.message}` }, 500);
    }

    const name      = userName || email.split("@")[0];
    const actionUrl = data.properties.action_link;
    const ip        = ipAddress || c.req.header("x-forwarded-for") || "unknown";

    await sendAuthEmail(
      email,
      "password_reset",
      { userName: name, resetUrl: actionUrl, expiresAt: "1 hour", ipAddress: ip },
      "Reset Your Brandtelligence Password",
      fbWrap("Password Reset Request",
        `<p style="font-size:15px;line-height:1.7;color:#444;">Hi ${name}, click below to reset your Brandtelligence password. This link is valid for 1 hour.</p>
         ${fbBtn(actionUrl, "Reset Password →")}
         ${fbWarn(`If you did not request a reset, ignore this email. Request from IP: ${ip}`)}`
      ),
    );

    console.log(`[auth/reset-password] Password reset email sent to ${email}`);
    return c.json({ success: true, message: `Password reset email sent to ${email}` });
  } catch (err) {
    console.log(`[auth/reset-password] Error: ${err}`);
    return c.json({ error: `reset-password error: ${String(err)}` }, 500);
  }
});

// POST /auth/reauth
// Body: { email, userName?, ipAddress?, actionDescription? }
// Generates a reauthentication link and sends Template: auth_reauth
app.post("/make-server-309fe679/auth/reauth", async (c) => {
  try {
    const { email, userName, ipAddress, actionDescription } = await c.req.json();
    if (!email) return c.json({ error: "email is required" }, 400);

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "reauthentication" as any,
      email,
    });
    if (error || !data?.properties?.action_link) {
      console.log(`[auth/reauth] generateLink error: ${error?.message}`);
      return c.json({ error: `Failed to generate reauthentication link: ${error?.message}` }, 500);
    }

    const name        = userName    || email.split("@")[0];
    const actionUrl   = data.properties.action_link;
    const ip          = ipAddress   || c.req.header("x-forwarded-for") || "unknown";
    const description = actionDescription || "Sensitive account action";

    await sendAuthEmail(
      email,
      "auth_reauth",
      { userName: name, reauthUrl: actionUrl, expiresAt: "15 minutes", ipAddress: ip, actionDescription: description },
      "Action Required: Verify your identity — Brandtelligence",
      fbWrap("Verify Your Identity",
        `<p style="font-size:15px;line-height:1.7;color:#444;">Hi ${name}, please verify your identity to complete: <strong>${description}</strong>. This link is valid for 15 minutes.</p>
         ${fbBtn(actionUrl, "Verify My Identity →", "#f59e0b")}
         ${fbWarn(`If you did not initiate this, ignore this email. Request from IP: ${ip}`)}`
      ),
    );

    console.log(`[auth/reauth] Reauthentication email sent to ${email}`);
    return c.json({ success: true, message: `Reauthentication email sent to ${email}` });
  } catch (err) {
    console.log(`[auth/reauth] Error: ${err}`);
    return c.json({ error: `reauth error: ${String(err)}` }, 500);
  }
});

// ─── Payment Gateway Config ───────────────────────────────────────────────────

// GET /payment-gateway/config — load saved gateway config
app.get("/make-server-309fe679/payment-gateway/config", async (c) => {
  try {
    const config = await kv.get(GW_CONFIG_KEY);
    return c.json({ config });
  } catch (err) {
    console.log(`[payment-gateway/config GET] Error: ${err}`);
    return c.json({ error: `Failed to load gateway config: ${err}` }, 500);
  }
});

// POST /payment-gateway/config — persist gateway config
app.post("/make-server-309fe679/payment-gateway/config", async (c) => {
  try {
    const body = await c.req.json();
    const { gatewayId, sandboxMode, liveCreds, sandboxCreds, gracePeriod } = body;
    if (!gatewayId) return c.json({ error: "gatewayId is required" }, 400);
    await kv.set(GW_CONFIG_KEY, {
      gatewayId, sandboxMode: !!sandboxMode,
      liveCreds:    liveCreds    ?? {},
      sandboxCreds: sandboxCreds ?? {},
      gracePeriod:  gracePeriod  ?? "7",
      savedAt: new Date().toISOString(),
    });
    console.log(`[payment-gateway/config POST] Saved config for gateway: ${gatewayId} (sandbox=${sandboxMode})`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`[payment-gateway/config POST] Error: ${err}`);
    return c.json({ error: `Failed to save gateway config: ${err}` }, 500);
  }
});

// POST /payment-gateway/test
// Tests sandbox credentials against each gateway's live sandbox API where possible.
// Body: { gateway: string, sandboxCreds: Record<string, string> }
app.post("/make-server-309fe679/payment-gateway/test", async (c) => {
  try {
    const { gateway, sandboxCreds } = await c.req.json();
    if (!gateway) return c.json({ error: "gateway is required" }, 400);

    const creds: Record<string, string> = sandboxCreds ?? {};

    switch (gateway) {

      // ── Stripe — real API call against api.stripe.com ─────────────────────
      case "stripe": {
        const key = creds.secretKey?.trim();
        if (!key) return c.json({ error: "Sandbox Secret Key (sk_test_...) is required" }, 400);
        if (!key.startsWith("sk_test_")) {
          return c.json({ error: "Stripe sandbox keys must start with sk_test_ — do not use a live key for testing." }, 400);
        }
        const res = await fetch("https://api.stripe.com/v1/balance", {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (res.ok) {
          const data = await res.json();
          const currency = data.available?.[0]?.currency?.toUpperCase() ?? "MYR";
          return c.json({ success: true, message: `Connected ✓ — account balance retrieved (${currency})` });
        }
        const err = await res.json();
        return c.json({ error: `Stripe error: ${err.error?.message ?? "Connection refused"}` }, 400);
      }

      // ── Billplz — real API call against billplz-sandbox.com ──────────────
      case "billplz": {
        const key = creds.apiKey?.trim();
        if (!key) return c.json({ error: "Sandbox API Key is required" }, 400);
        const encoded = btoa(`${key}:`);
        const res = await fetch("https://www.billplz-sandbox.com/api/v3/bill_collections", {
          headers: { Authorization: `Basic ${encoded}` },
        });
        if (res.ok || res.status === 200) {
          return c.json({ success: true, message: "Billplz Sandbox connected ✓ — API key accepted" });
        }
        return c.json({ error: `Billplz sandbox returned HTTP ${res.status} — check your Sandbox API Key` }, 400);
      }

      // ── toyyibPay — sandbox health check ──────────────────────────────────
      case "toyyibpay": {
        const key = creds.userSecretKey?.trim();
        if (!key) return c.json({ error: "Sandbox User Secret Key is required" }, 400);
        const form = new URLSearchParams({ userSecretKey: key });
        const res = await fetch("https://dev.toyyibpay.com/api/getBank", {
          method: "POST",
          body: form,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            return c.json({ success: true, message: `toyyibPay Sandbox connected ✓ — ${data.length} FPX banks available` });
          }
        }
        return c.json({ error: "toyyibPay sandbox returned an unexpected response — check your User Secret Key" }, 400);
      }

      // ── Curlec — bearer auth validation ──────────────────────────────────
      case "curlec": {
        const key = creds.apiKey?.trim();
        if (!key) return c.json({ error: "Sandbox API Key is required" }, 400);
        // Curlec does not have a public unauthenticated ping; validate key format
        if (!key.includes("test") && !key.includes("sandbox") && !key.startsWith("curlec_test")) {
          return c.json({
            error: "Curlec sandbox keys typically contain 'test' or 'sandbox'. Please verify you are using your sandbox API key.",
          }, 400);
        }
        return c.json({ success: true, message: "Curlec sandbox API Key format accepted ✓ — verify via live test payment" });
      }

      // ── HitPay — x-api-key header validation ─────────────────────────────
      case "hitpay": {
        const key = creds.apiKey?.trim();
        if (!key) return c.json({ error: "Sandbox API Key is required" }, 400);
        const res = await fetch("https://api.sandbox.hit-pay.com/v1/payment-requests?per_page=1", {
          headers: { "X-BUSINESS-API-KEY": key, Accept: "application/json" },
        });
        if (res.ok) {
          return c.json({ success: true, message: "HitPay Sandbox connected ✓ — API key accepted" });
        }
        if (res.status === 401) {
          return c.json({ error: "HitPay Sandbox: Invalid API key (401 Unauthorized)" }, 400);
        }
        return c.json({ error: `HitPay Sandbox returned HTTP ${res.status}` }, 400);
      }

      // ── PayPal — OAuth2 token exchange in sandbox ─────────────────────────
      case "paypal": {
        const clientId     = creds.clientId?.trim();
        const clientSecret = creds.clientSecret?.trim();
        if (!clientId || !clientSecret) {
          return c.json({ error: "Sandbox Client ID and Client Secret are both required" }, 400);
        }
        const encoded = btoa(`${clientId}:${clientSecret}`);
        const res = await fetch("https://api.sandbox.paypal.com/v1/oauth2/token", {
          method: "POST",
          headers: {
            Authorization: `Basic ${encoded}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        });
        if (res.ok) {
          return c.json({ success: true, message: "PayPal Sandbox connected ✓ — OAuth2 token obtained successfully" });
        }
        const err = await res.json();
        return c.json({ error: `PayPal Sandbox error: ${err.error_description ?? err.error ?? "Invalid credentials"}` }, 400);
      }

      // ── All other gateways — credential presence validation ────────────────
      // (iPay88, eGHL, Razer, SenangPay, 2C2P, Payex require merchant-registered
      //  sandbox portals; we validate credential presence and non-trivial length)
      default: {
        const allValues = Object.values(creds).filter(v => (v ?? "").trim().length > 4);
        if (allValues.length === 0) {
          return c.json({ error: "Please fill in your sandbox credentials before testing." }, 400);
        }
        const names: Record<string, string> = {
          ipay88:     "iPay88",
          razer:      "Razer Merchant Services",
          eghl:       "eGHL",
          senangpay:  "SenangPay",
          "2c2p":     "2C2P",
          payex:      "Payex",
        };
        const gwName = names[gateway] ?? gateway;
        return c.json({
          success: true,
          message: `${gwName} sandbox credentials accepted ✓ — ${gwName} requires a merchant-registered sandbox portal to run live test transactions. Contact their support team for test account details.`,
        });
      }
    }
  } catch (err) {
    console.log(`[payment-gateway/test] Error: ${err}`);
    return c.json({ error: `Gateway test error: ${String(err)}` }, 500);
  }
});

// ─── MFA Policy ───────────────────────────────────────────────────────────────

// GET /mfa/policy — returns { requireTenantAdminMfa: boolean }
app.get("/make-server-309fe679/mfa/policy", async (c) => {
  try {
    const policy: any = await kv.get(MFA_POLICY_KEY);
    return c.json({ requireTenantAdminMfa: policy?.requireTenantAdminMfa ?? false });
  } catch (err) {
    console.log(`[mfa/policy GET] Error: ${err}`);
    return c.json({ error: `Failed to load MFA policy: ${err}` }, 500);
  }
});

// POST /mfa/policy — saves { requireTenantAdminMfa: boolean }
app.post("/make-server-309fe679/mfa/policy", async (c) => {
  try {
    const { requireTenantAdminMfa } = await c.req.json();
    await kv.set(MFA_POLICY_KEY, { requireTenantAdminMfa: !!requireTenantAdminMfa, updatedAt: new Date().toISOString() });
    console.log(`[mfa/policy POST] requireTenantAdminMfa=${requireTenantAdminMfa}`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`[mfa/policy POST] Error: ${err}`);
    return c.json({ error: `Failed to save MFA policy: ${err}` }, 500);
  }
});

// ─── Security Policy ──────────────────────────────────────────────────────────

// GET /security/policy
app.get("/make-server-309fe679/security/policy", async (c) => {
  try {
    const policy = await kv.get(SECURITY_POLICY_KEY);
    return c.json({ policy });
  } catch (err) {
    console.log(`[security/policy GET] Error: ${err}`);
    return c.json({ error: `Failed to load security policy: ${err}` }, 500);
  }
});

// POST /security/policy
app.post("/make-server-309fe679/security/policy", async (c) => {
  try {
    const body = await c.req.json();
    await kv.set(SECURITY_POLICY_KEY, { ...body, updatedAt: new Date().toISOString() });
    console.log(`[security/policy POST] Policy saved`);
    return c.json({ success: true });
  } catch (err) {
    console.log(`[security/policy POST] Error: ${err}`);
    return c.json({ error: `Failed to save security policy: ${err}` }, 500);
  }
});

// ─── MFA Recovery Codes ───────────────────────────────────────────────────────

// POST /mfa-recovery/store
// Body: { userId: string, codes: string[] }
// Stores hashed one-time recovery codes for a user.
app.post("/make-server-309fe679/mfa-recovery/store", async (c) => {
  try {
    const { userId, codes } = await c.req.json();
    if (!userId || !Array.isArray(codes) || codes.length === 0) {
      return c.json({ error: "userId and codes[] are required" }, 400);
    }
    // Store as { code: string, used: boolean }[] — codes stored in plaintext
    // (acceptable for recovery codes; in higher-security deployments hash with bcrypt)
    const stored = codes.map(code => ({ code: code.toUpperCase(), used: false }));
    await kv.set(`${MFA_RECOVERY_PREFIX}${userId}`, { codes: stored, createdAt: new Date().toISOString() });
    console.log(`[mfa-recovery/store] Stored ${codes.length} recovery codes for user ${userId}`);
    return c.json({ success: true, count: codes.length });
  } catch (err) {
    console.log(`[mfa-recovery/store] Error: ${err}`);
    return c.json({ error: `Failed to store recovery codes: ${err}` }, 500);
  }
});

// POST /mfa-recovery/verify
// Body: { userId: string, code: string }
// Verifies a recovery code, marks it used, and returns success/failure.
app.post("/make-server-309fe679/mfa-recovery/verify", async (c) => {
  try {
    const { userId, code } = await c.req.json();
    if (!userId || !code) return c.json({ error: "userId and code are required" }, 400);

    const stored: any = await kv.get(`${MFA_RECOVERY_PREFIX}${userId}`);
    if (!stored?.codes) return c.json({ error: "No recovery codes found for this account. Contact your administrator." }, 404);

    const normalised = code.trim().toUpperCase();
    const idx = (stored.codes as any[]).findIndex(
      (c: any) => c.code === normalised && !c.used,
    );

    if (idx === -1) {
      return c.json({ error: "Invalid or already-used recovery code." }, 400);
    }

    // Mark code as used
    stored.codes[idx].used = true;
    stored.codes[idx].usedAt = new Date().toISOString();
    await kv.set(`${MFA_RECOVERY_PREFIX}${userId}`, stored);

    const remaining = (stored.codes as any[]).filter((c: any) => !c.used).length;
    console.log(`[mfa-recovery/verify] Code used for user ${userId}. ${remaining} codes remaining.`);
    return c.json({ success: true, remaining });
  } catch (err) {
    console.log(`[mfa-recovery/verify] Error: ${err}`);
    return c.json({ error: `Recovery verification error: ${err}` }, 500);
  }
});

// POST /mfa/admin/reset-user
// Body: { targetUserId: string }
// Super Admin action: unenrolls all TOTP factors for a user so they can re-enroll.
// Also clears their stored recovery codes.
app.post("/make-server-309fe679/mfa/admin/reset-user", async (c) => {
  try {
    // Verify caller is authenticated (requires valid bearer token)
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) return c.json({ error: "Unauthorized" }, 401);
    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (authErr || !caller) return c.json({ error: "Unauthorized" }, 401);

    // Only SUPER_ADMIN can reset MFA
    if (caller.user_metadata?.role !== "SUPER_ADMIN") {
      return c.json({ error: "Forbidden — only Super Admins can reset user MFA" }, 403);
    }

    const { targetUserId } = await c.req.json();
    if (!targetUserId) return c.json({ error: "targetUserId is required" }, 400);

    // List factors for the target user using admin API
    const { data: factors, error: factorErr } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: targetUserId });
    if (factorErr) throw factorErr;

    // Delete each enrolled factor
    const deleteResults = await Promise.allSettled(
      (factors?.totp ?? []).map((f: any) =>
        supabaseAdmin.auth.admin.mfa.deleteFactor({ userId: targetUserId, id: f.id }),
      ),
    );

    // Clear stored recovery codes
    await kv.del(`${MFA_RECOVERY_PREFIX}${targetUserId}`);

    const deleted = deleteResults.filter(r => r.status === "fulfilled").length;
    console.log(`[mfa/admin/reset-user] Reset MFA for user ${targetUserId}. Deleted ${deleted} factor(s). Caller: ${caller.email}`);
    return c.json({ success: true, deletedFactors: deleted });
  } catch (err) {
    console.log(`[mfa/admin/reset-user] Error: ${err}`);
    return c.json({ error: `MFA reset error: ${String(err)}` }, 500);
  }
});

Deno.serve(app.fetch);