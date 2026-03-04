-- =============================================================================
-- Brandtelligence SaaS Platform — FINAL CONSOLIDATED SCHEMA
-- =============================================================================
-- VERSION : 2.0.0  (combines migrations 00 + 01 in dependency order)
-- DATE    : 2026-03-04
-- AUTHOR  : Production Hardening Sprint
--
-- INSTRUCTIONS
--   Run this once in: Supabase Dashboard → SQL Editor → New query → Run
--   Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE / ON CONFLICT.
--   No demo data is inserted here.
--
-- ORDERING CONTRACT (no forward-references)
--   0. Extensions
--   1. Enum types
--   2. Tables   (leaf tables first, then tables that depend on them)
--        modules → features → tenants → tenant_users → pending_requests
--        → invoices → audit_logs → usage_stats → content_cards
--        → approval_events → smtp_config → email_templates
--        → payment_gateway_config → mfa_policy → security_policy
--        → mfa_recovery_codes
--   3. set_updated_at() function
--   4. ALL triggers  ← after every table exists
--   5. RLS enable + service-role policies
--   6. Singleton inserts
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "uuid-ossp";  -- uuid_generate_v4()


-- ---------------------------------------------------------------------------
-- 1. CUSTOM ENUM TYPES
-- ---------------------------------------------------------------------------

do $$ begin
  create type content_platform as enum (
    'instagram','facebook','twitter','linkedin',
    'tiktok','youtube','telegram','general'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_card_status as enum (
    'draft','pending_review','approved',
    'rejected','scheduled','published'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_event_type as enum (
    'submitted','approved','rejected',
    'commented','scheduled','published'
  );
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------------
-- 2. TABLES  (strict dependency order — no forward-references)
-- ---------------------------------------------------------------------------

-- ── 2.1  MODULES ─────────────────────────────────────────────────────────────
-- Seeded automatically by the Edge Function on cold start via /seed-modules.
-- id is a short string ('m1'…'m18') — not a uuid — to match the seed data.
create table if not exists modules (
  id             text          primary key,
  key            text          not null unique,
  name           text          not null,
  description    text          not null default '',
  icon           text          not null default '',
  category       text          not null default 'marketing',
  base_price     numeric(10,2) not null default 0,
  global_enabled boolean       not null default true,
  created_at     timestamptz   not null default now()
);

create index if not exists idx_modules_key        on modules (key);
create index if not exists idx_modules_category   on modules (category);
create index if not exists idx_modules_enabled    on modules (global_enabled);


-- ── 2.2  FEATURES ────────────────────────────────────────────────────────────
-- Feature flags linked to modules.
-- module_id FK references modules(id).
-- Patch 02: module_id and rollout_note are dedicated columns (not JSON).
create table if not exists features (
  id             text          primary key,
  key            text          not null unique,
  name           text          not null,
  description    text          not null default '',
  global_enabled boolean       not null default true,
  module_id      text          references modules(id) on delete set null,
  rollout_note   text          not null default '',
  created_at     timestamptz   not null default now()
);

create index if not exists idx_features_module_id on features (module_id);
create index if not exists idx_features_key       on features (key);


-- ── 2.3  TENANTS ─────────────────────────────────────────────────────────────
-- Core multi-tenant table. One row per approved company.
-- Patch 02: company_size, tax_id, billing_address, suspended_reason columns added.
create table if not exists tenants (
  id                 uuid          primary key default gen_random_uuid(),
  name               text          not null,
  plan               text          not null default 'Starter',
  status             text          not null default 'active'
                                   check (status in ('active','suspended','trialing','cancelled','pending','churned')),
  industry           text,
  country            text          not null default '',
  contact_name       text          not null default '',
  contact_email      text          not null default '',
  contact_phone      text,
  domain             text,
  logo_url           text,
  monthly_fee        numeric(10,2) not null default 0,
  modules_enabled    text[]        not null default '{}',
  next_billing_date  date,
  -- Patch 02 columns
  company_size       text,
  tax_id             text,
  billing_address    text,
  suspended_reason   text,
  created_at         timestamptz   not null default now()
);

create index if not exists idx_tenants_status     on tenants (status);
create index if not exists idx_tenants_created_at on tenants (created_at desc);
create index if not exists idx_tenants_plan       on tenants (plan);
create index if not exists idx_tenants_email      on tenants (contact_email);


-- ── 2.4  TENANT USERS ────────────────────────────────────────────────────────
-- One row per user belonging to a tenant.
-- role: TENANT_ADMIN | EMPLOYEE
-- status (Postgres): active | invited | suspended
create table if not exists tenant_users (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references tenants (id) on delete cascade,
  name        text        not null,
  email       text        not null,
  role        text        not null default 'EMPLOYEE'
                          check (role in ('TENANT_ADMIN','EMPLOYEE')),
  status      text        not null default 'invited'
                          check (status in ('active','invited','suspended')),
  avatar_url  text,
  last_login  timestamptz,
  created_at  timestamptz not null default now(),
  unique (tenant_id, email)
);

create index if not exists idx_tenant_users_tenant_id on tenant_users (tenant_id);
create index if not exists idx_tenant_users_email     on tenant_users (email);
create index if not exists idx_tenant_users_status    on tenant_users (status);
create index if not exists idx_tenant_users_role      on tenant_users (role);


-- ── 2.5  PENDING REQUESTS ────────────────────────────────────────────────────
-- Access-request submissions from the public RequestAccessPage.
-- Patch 02: country, company_size, requested_modules, notes, rejected_reason
--           are now dedicated columns (no longer packed into `message` JSON).
create table if not exists pending_requests (
  id                uuid        primary key default gen_random_uuid(),
  company_name      text        not null,
  contact_name      text        not null,
  email             text        not null,
  status            text        not null default 'pending'
                                check (status in ('pending','approved','rejected')),
  message           text        not null default '{}',   -- kept for legacy compatibility
  -- Patch 02 dedicated columns
  country           text        not null default '',
  company_size      text        not null default '',
  requested_modules text[]      not null default '{}',
  notes             text        not null default '',
  rejected_reason   text,
  submitted_at      timestamptz not null default now(),
  reviewed_at       timestamptz,
  reviewed_by       text
);

create index if not exists idx_pending_requests_status       on pending_requests (status);
create index if not exists idx_pending_requests_submitted_at on pending_requests (submitted_at desc);
create index if not exists idx_pending_requests_email        on pending_requests (email);


-- ── 2.6  INVOICES ────────────────────────────────────────────────────────────
-- Patch 02: invoice_number, tenant_name, period, subtotal, tax,
--           payment_method, receipt_url, notes, lines are dedicated columns.
create table if not exists invoices (
  id              uuid          primary key default gen_random_uuid(),
  tenant_id       uuid          references tenants (id) on delete set null,
  amount          numeric(10,2) not null default 0,
  status          text          not null default 'unpaid'
                                check (status in ('paid','unpaid','overdue')),
  description     text          not null default '{}',   -- kept for legacy compatibility
  due_date        date,
  paid_date       date,
  -- Patch 02 dedicated columns
  invoice_number  text          not null default '',
  tenant_name     text          not null default '',
  period          text          not null default '',
  subtotal        numeric(10,2) not null default 0,
  tax             numeric(10,2) not null default 0,
  payment_method  text          not null default 'none',
  receipt_url     text,
  notes           text          not null default '',
  lines           jsonb         not null default '[]',
  created_at      timestamptz   not null default now()
);

create index if not exists idx_invoices_tenant_id     on invoices (tenant_id);
create index if not exists idx_invoices_status        on invoices (status);
create index if not exists idx_invoices_created_at    on invoices (created_at desc);
create index if not exists idx_invoices_period        on invoices (period);
create index if not exists idx_invoices_payment_method on invoices (payment_method);


-- ── 2.7  AUDIT LOGS ──────────────────────────────────────────────────────────
-- Append-only log of all admin actions.
create table if not exists audit_logs (
  id          uuid        primary key default gen_random_uuid(),
  actor_id    text        not null default '',
  actor_name  text        not null default '',
  actor_role  text        not null default 'SUPER_ADMIN',
  tenant_id   uuid        references tenants (id) on delete set null,
  tenant_name text,
  action      text        not null default '',
  resource    text        not null default '',
  detail      text        not null default '',
  ip          text        not null default '',
  severity    text        not null default 'info'
                          check (severity in ('info','warning','critical')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_logs_tenant_id  on audit_logs (tenant_id);
create index if not exists idx_audit_logs_actor_id   on audit_logs (actor_id);
create index if not exists idx_audit_logs_created_at on audit_logs (created_at desc);
create index if not exists idx_audit_logs_severity   on audit_logs (severity);
create index if not exists idx_audit_logs_action     on audit_logs (action);


-- ── 2.8  USAGE STATS ─────────────────────────────────────────────────────────
-- Monthly usage snapshots per tenant.
create table if not exists usage_stats (
  id          bigserial   primary key,
  tenant_id   uuid        references tenants (id) on delete cascade,
  period      text        not null default '',   -- e.g. '2026-02'
  posts       integer     not null default 0,
  content     integer     not null default 0,
  api         integer     not null default 0,
  users       integer     not null default 0,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_usage_stats_tenant_id on usage_stats (tenant_id);
create index if not exists idx_usage_stats_period    on usage_stats (period);
create unique index if not exists idx_usage_stats_tenant_period on usage_stats (tenant_id, period);


-- ── 2.9  CONTENT CARDS ───────────────────────────────────────────────────────
-- AI Content Studio cards.
-- Extra fields are packed into the metadata JSONB column.
create table if not exists content_cards (
  id               uuid                primary key default gen_random_uuid(),
  tenant_id        uuid                references tenants (id) on delete cascade,
  title            text                not null default '',
  body             text                not null default '',
  platform         content_platform    not null default 'general',
  status           content_card_status not null default 'draft',
  hashtags         text[]              not null default '{}',
  media_url        text,
  created_by       uuid                not null default '00000000-0000-0000-0000-000000000001',
  created_by_name  text                not null default '',
  approved_by      uuid,
  approved_by_name text,
  approved_at      timestamptz,
  rejected_reason  text,
  scheduled_at     timestamptz,
  published_at     timestamptz,
  metadata         jsonb               not null default '{}',
  created_at       timestamptz         not null default now(),
  updated_at       timestamptz         not null default now()
);

create index if not exists idx_content_cards_tenant_id   on content_cards (tenant_id);
create index if not exists idx_content_cards_status      on content_cards (status);
create index if not exists idx_content_cards_platform    on content_cards (platform);
create index if not exists idx_content_cards_created_by  on content_cards (created_by);
create index if not exists idx_content_cards_created_at  on content_cards (created_at desc);
create index if not exists idx_content_cards_scheduled   on content_cards (scheduled_at) where scheduled_at is not null;
create index if not exists idx_content_cards_published   on content_cards (published_at) where published_at is not null;


-- ── 2.10  APPROVAL EVENTS ────────────────────────────────────────────────────
-- Immutable audit trail for the content approval workflow.
create table if not exists approval_events (
  id          uuid                primary key default gen_random_uuid(),
  card_id     uuid                references content_cards (id) on delete set null,
  tenant_id   uuid                references tenants (id) on delete set null,
  event_type  approval_event_type not null default 'submitted',
  actor_id    text                not null default '',
  actor_name  text                not null default '',
  actor_role  text                not null default '',
  message     text,
  created_at  timestamptz         not null default now()
);

create index if not exists idx_approval_events_card_id    on approval_events (card_id);
create index if not exists idx_approval_events_tenant_id  on approval_events (tenant_id);
create index if not exists idx_approval_events_created_at on approval_events (created_at desc);
create index if not exists idx_approval_events_event_type on approval_events (event_type);


-- ── 2.11  SMTP CONFIG ────────────────────────────────────────────────────────
-- Singleton row, id = 'global'.
create table if not exists smtp_config (
  id          text        primary key default 'global',
  host        text        not null default '',
  port        integer     not null default 587,
  username    text        not null default '',
  password    text        not null default '',
  from_email  text        not null default '',
  from_name   text        not null default 'Brandtelligence',
  secure      boolean     not null default false,
  updated_at  timestamptz not null default now()
);


-- ── 2.12  EMAIL TEMPLATES ────────────────────────────────────────────────────
-- id is the template key (e.g. 'auth_invite_user').
create table if not exists email_templates (
  id          text        primary key,
  subject     text        not null default '',
  html        text        not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  text        not null default ''
);


-- ── 2.13  PAYMENT GATEWAY CONFIG ─────────────────────────────────────────────
-- Singleton row, id = 'global'.
create table if not exists payment_gateway_config (
  id            text        primary key default 'global',
  gateway_id    text        not null default '',
  sandbox_mode  boolean     not null default true,
  live_creds    jsonb       not null default '{}',
  sandbox_creds jsonb       not null default '{}',
  grace_period  text        not null default '7',
  updated_at    timestamptz not null default now()
);


-- ── 2.14  MFA POLICY ─────────────────────────────────────────────────────────
-- Singleton row, id = 'global'.
create table if not exists mfa_policy (
  id                       text        primary key default 'global',
  require_tenant_admin_mfa boolean     not null default false,
  updated_at               timestamptz not null default now()
);


-- ── 2.15  SECURITY POLICY ────────────────────────────────────────────────────
-- Singleton row, id = 'global'.
create table if not exists security_policy (
  id                          text        primary key default 'global',
  session_timeout_minutes     integer     not null default 60,
  max_login_attempts          integer     not null default 5,
  lockout_duration_minutes    integer     not null default 15,
  password_min_length         integer     not null default 8,
  password_require_uppercase  boolean     not null default true,
  password_require_numbers    boolean     not null default true,
  password_require_symbols    boolean     not null default false,
  two_fa_required             boolean     not null default false,
  ip_whitelist                text,
  metadata                    jsonb       not null default '{}',   -- { inviteTtl: "24" }
  updated_at                  timestamptz not null default now()
);


-- ── 2.16  MFA RECOVERY CODES ─────────────────────────────────────────────────
-- One-time backup codes generated when a user enrolls in TOTP MFA.
create table if not exists mfa_recovery_codes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  code        text        not null,
  used        boolean     not null default false,
  used_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, code)
);

create index if not exists idx_mfa_recovery_codes_user_id on mfa_recovery_codes (user_id);
create index if not exists idx_mfa_recovery_codes_used    on mfa_recovery_codes (used);


-- ---------------------------------------------------------------------------
-- 3. AUTO-UPDATE FUNCTION (defined ONCE, used by all triggers below)
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------------
-- 4. TRIGGERS  (ALL tables exist now — safe to reference any of them)
-- ---------------------------------------------------------------------------

-- content_cards
drop trigger if exists trg_content_cards_updated_at on content_cards;
create trigger trg_content_cards_updated_at
  before update on content_cards
  for each row execute function set_updated_at();

-- smtp_config
drop trigger if exists trg_smtp_config_updated_at on smtp_config;
create trigger trg_smtp_config_updated_at
  before update on smtp_config
  for each row execute function set_updated_at();

-- email_templates
drop trigger if exists trg_email_templates_updated_at on email_templates;
create trigger trg_email_templates_updated_at
  before update on email_templates
  for each row execute function set_updated_at();

-- payment_gateway_config
drop trigger if exists trg_payment_gateway_config_updated_at on payment_gateway_config;
create trigger trg_payment_gateway_config_updated_at
  before update on payment_gateway_config
  for each row execute function set_updated_at();

-- mfa_policy
drop trigger if exists trg_mfa_policy_updated_at on mfa_policy;
create trigger trg_mfa_policy_updated_at
  before update on mfa_policy
  for each row execute function set_updated_at();

-- security_policy
drop trigger if exists trg_security_policy_updated_at on security_policy;
create trigger trg_security_policy_updated_at
  before update on security_policy
  for each row execute function set_updated_at();


-- ---------------------------------------------------------------------------
-- 5. ROW-LEVEL SECURITY
-- All data access goes through the Edge Function using the SERVICE_ROLE key,
-- which bypasses RLS. We enable RLS on every table as a safety backstop and
-- add a permissive service-role policy so the Edge Function always works.
-- ---------------------------------------------------------------------------

alter table modules                  enable row level security;
alter table features                 enable row level security;
alter table tenants                  enable row level security;
alter table tenant_users             enable row level security;
alter table pending_requests         enable row level security;
alter table invoices                 enable row level security;
alter table audit_logs               enable row level security;
alter table usage_stats              enable row level security;
alter table content_cards            enable row level security;
alter table approval_events          enable row level security;
alter table smtp_config              enable row level security;
alter table email_templates          enable row level security;
alter table payment_gateway_config   enable row level security;
alter table mfa_policy               enable row level security;
alter table security_policy          enable row level security;
alter table mfa_recovery_codes       enable row level security;

-- Service-role bypass policies (idempotent — drop then recreate)
do $$ declare tbl text; begin
  foreach tbl in array array[
    'modules','features','tenants','tenant_users','pending_requests',
    'invoices','audit_logs','usage_stats','content_cards','approval_events',
    'smtp_config','email_templates','payment_gateway_config',
    'mfa_policy','security_policy','mfa_recovery_codes'
  ] loop
    execute format(
      'drop policy if exists "service_role_all" on %I;
       create policy "service_role_all" on %I
         as permissive for all
         to service_role using (true) with check (true);',
      tbl, tbl
    );
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- 6. SINGLETON ROW INSERTS (idempotent — ON CONFLICT DO NOTHING)
-- ---------------------------------------------------------------------------

insert into smtp_config            (id) values ('global') on conflict (id) do nothing;
insert into payment_gateway_config (id) values ('global') on conflict (id) do nothing;
insert into mfa_policy             (id) values ('global') on conflict (id) do nothing;
insert into security_policy        (id) values ('global') on conflict (id) do nothing;


-- =============================================================================
-- DONE — POST-RUN CHECKLIST
-- =============================================================================
-- After running this schema:
--   1. Deploy the Edge Function:
--        supabase functions deploy server
--   2. Verify health:
--        GET https://<project>.supabase.co/functions/v1/make-server-309fe679/health
--   3. Seed modules & features (auto-runs on cold start, or trigger manually):
--        POST /make-server-309fe679/seed-modules  { Authorization: Bearer <token> }
--   4. Set required GitHub Actions secrets:
--        FTP_SERVER, FTP_USERNAME, FTP_PASSWORD
--        SUPABASE_FUNCTIONS_URL, CRON_SECRET
--   5. Enable TOTP MFA in Supabase Dashboard:
--        Authentication → Sign In Methods → MFA → TOTP ✅
-- =============================================================================
