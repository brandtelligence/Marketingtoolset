-- =============================================================================
-- Brandtelligence SaaS Platform — Full Database Schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE guards.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid() fallback
create extension if not exists "uuid-ossp";  -- uuid_generate_v4() fallback

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
-- 2. MODULES
-- Seeded automatically by the Edge Function on cold start via /seed-modules.
-- id is a short string ('m1'…'m18') — not a uuid — to match the seed data.
-- ---------------------------------------------------------------------------
create table if not exists modules (
  id             text        primary key,
  key            text        not null unique,
  name           text        not null,
  description    text        not null default '',
  icon           text        not null default '',
  category       text        not null default 'marketing',
  base_price     numeric(10,2) not null default 0,
  global_enabled boolean     not null default true,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. FEATURES
-- Feature flags linked to modules via JSON stored in the description column
-- (moduleId + rolloutNote are serialised there — no separate FK column needed).
-- id is a short string ('f1'…'f6') — seeded via /seed-modules.
-- ---------------------------------------------------------------------------
create table if not exists features (
  id             text        primary key,
  key            text        not null unique,
  name           text        not null,
  description    text        not null default '{}',  -- JSON: { moduleId, rolloutNote, text }
  global_enabled boolean     not null default true,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. TENANTS
-- Core multi-tenant table. One row per approved company.
-- modules_enabled is an array of module IDs (text[] because module IDs are
-- short strings like 'm1').
-- Fields without a dedicated column (size, taxId, billingAddress,
-- suspendedReason) are frontend-only defaults — add columns here if needed.
-- ---------------------------------------------------------------------------
create table if not exists tenants (
  id                 uuid        primary key default gen_random_uuid(),
  name               text        not null,
  plan               text        not null default 'Starter',
  status             text        not null default 'active'
                                 check (status in ('active','suspended','trialing','cancelled')),
  industry           text,
  country            text        not null default '',
  contact_name       text        not null default '',   -- adminName
  contact_email      text        not null default '',   -- adminEmail / email
  contact_phone      text,
  domain             text,
  logo_url           text,
  monthly_fee        numeric(10,2) not null default 0,  -- mrr
  modules_enabled    text[]      not null default '{}', -- moduleIds
  next_billing_date  date,
  created_at         timestamptz not null default now()
);

create index if not exists idx_tenants_status     on tenants (status);
create index if not exists idx_tenants_created_at on tenants (created_at desc);

-- ---------------------------------------------------------------------------
-- 5. TENANT USERS
-- One row per user belonging to a tenant.
-- role: TENANT_ADMIN | EMPLOYEE
-- status (Postgres): active | invited | suspended
--   → frontend maps: invited → pending_invite, suspended → inactive
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 6. PENDING REQUESTS
-- Access-request submissions from the public RequestAccessPage.
-- Extra fields (country, size, requestedModules, notes, rejectedReason)
-- are serialised as JSON in the message column.
-- ---------------------------------------------------------------------------
create table if not exists pending_requests (
  id           uuid        primary key default gen_random_uuid(),
  company_name text        not null,
  contact_name text        not null,
  email        text        not null,
  status       text        not null default 'pending'
                           check (status in ('pending','approved','rejected')),
  message      text        not null default '{}',  -- JSON extras
  submitted_at timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  text
);

create index if not exists idx_pending_requests_status       on pending_requests (status);
create index if not exists idx_pending_requests_submitted_at on pending_requests (submitted_at desc);

-- ---------------------------------------------------------------------------
-- 7. INVOICES
-- Extra fields (invoiceNumber, tenantName, period, subtotal, tax,
-- paymentMethod, receiptUrl, notes, lines[]) are stored as JSON in description.
-- status (Postgres): paid | unpaid | overdue
--   → frontend maps: unpaid → sent
-- ---------------------------------------------------------------------------
create table if not exists invoices (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        references tenants (id) on delete set null,
  amount      numeric(10,2) not null default 0,
  status      text        not null default 'unpaid'
                          check (status in ('paid','unpaid','overdue')),
  description text        not null default '{}',  -- JSON extras
  due_date    date,
  paid_date   date,
  created_at  timestamptz not null default now()
);

create index if not exists idx_invoices_tenant_id  on invoices (tenant_id);
create index if not exists idx_invoices_status     on invoices (status);
create index if not exists idx_invoices_created_at on invoices (created_at desc);

-- ---------------------------------------------------------------------------
-- 8. AUDIT LOGS
-- Append-only log of all admin actions across the platform.
-- tenant_id is nullable (platform-level actions have no tenant).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 9. USAGE STATS
-- Monthly usage snapshots per tenant.
-- id uses bigserial (auto-increment) as per the server comment.
-- ---------------------------------------------------------------------------
create table if not exists usage_stats (
  id          bigserial   primary key,
  tenant_id   uuid        references tenants (id) on delete cascade,
  period      text        not null default '',  -- e.g. '2026-02'
  posts       integer     not null default 0,
  content     integer     not null default 0,
  api         integer     not null default 0,
  users       integer     not null default 0,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_usage_stats_tenant_id on usage_stats (tenant_id);
create index if not exists idx_usage_stats_period    on usage_stats (period);

-- ---------------------------------------------------------------------------
-- 10. CONTENT CARDS
-- AI Content Studio cards. Uses the two DB enums defined above.
-- Extra ContentCard-only fields are packed into the metadata JSONB column
-- (channel, projectId, mediaType, approvers[], auditLog[], etc.)
-- created_by is NOT NULL — non-UUID display names fall back to SYSTEM_USER_UUID.
-- ---------------------------------------------------------------------------
create table if not exists content_cards (
  id               uuid                primary key default gen_random_uuid(),
  tenant_id        uuid                references tenants (id) on delete cascade,
  title            text                not null default '',
  body             text                not null default '',   -- caption
  platform         content_platform    not null default 'general',
  status           content_card_status not null default 'draft',
  hashtags         text[]              not null default '{}',
  media_url        text,
  -- created_by is a uuid — display names are stored in created_by_name
  created_by       uuid                not null default '00000000-0000-0000-0000-000000000001',
  created_by_name  text                not null default '',
  approved_by      uuid,
  approved_by_name text,
  approved_at      timestamptz,
  rejected_reason  text,               -- rejectionReason
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

-- Auto-update updated_at on every write
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- content_cards trigger (was already here)
drop trigger if exists trg_content_cards_updated_at on content_cards;
create trigger trg_content_cards_updated_at
  before update on content_cards
  for each row execute function set_updated_at();

-- Safety-net triggers for all other tables that carry an updated_at column.
-- The server always sets updated_at explicitly; these fire as a backstop so the
-- column is never stale even if a future code path forgets to set it.
drop trigger if exists trg_smtp_config_updated_at           on smtp_config;
create trigger trg_smtp_config_updated_at
  before update on smtp_config
  for each row execute function set_updated_at();

drop trigger if exists trg_email_templates_updated_at       on email_templates;
create trigger trg_email_templates_updated_at
  before update on email_templates
  for each row execute function set_updated_at();

drop trigger if exists trg_payment_gateway_config_updated_at on payment_gateway_config;
create trigger trg_payment_gateway_config_updated_at
  before update on payment_gateway_config
  for each row execute function set_updated_at();

drop trigger if exists trg_mfa_policy_updated_at            on mfa_policy;
create trigger trg_mfa_policy_updated_at
  before update on mfa_policy
  for each row execute function set_updated_at();

drop trigger if exists trg_security_policy_updated_at       on security_policy;
create trigger trg_security_policy_updated_at
  before update on security_policy
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 11. APPROVAL EVENTS
-- Immutable audit trail for the content approval workflow.
-- card_id and tenant_id are nullable (events may reference deleted cards).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 12. SMTP CONFIG  (singleton row, id = 'global')
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 13. EMAIL TEMPLATES
-- id is the template key (e.g. 'auth_invite_user', 'auth_confirm_signup').
-- ---------------------------------------------------------------------------
create table if not exists email_templates (
  id          text        primary key,
  subject     text        not null default '',
  html        text        not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  text        not null default ''
);

-- ---------------------------------------------------------------------------
-- 14. PAYMENT GATEWAY CONFIG  (singleton row, id = 'global')
-- live_creds and sandbox_creds store provider-specific key/value pairs.
-- ---------------------------------------------------------------------------
create table if not exists payment_gateway_config (
  id            text        primary key default 'global',
  gateway_id    text        not null default '',
  sandbox_mode  boolean     not null default true,
  live_creds    jsonb       not null default '{}',
  sandbox_creds jsonb       not null default '{}',
  grace_period  text        not null default '7',  -- days as string
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 15. MFA POLICY  (singleton row, id = 'global')
-- ---------------------------------------------------------------------------
create table if not exists mfa_policy (
  id                      text        primary key default 'global',
  require_tenant_admin_mfa boolean    not null default false,
  updated_at              timestamptz not null default now()
);

-- Insert the singleton if it doesn't exist yet
insert into mfa_policy (id) values ('global') on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 16. SECURITY POLICY  (singleton row, id = 'global')
-- metadata JSONB stores forward-compatible fields (currently inviteTtl).
-- ---------------------------------------------------------------------------
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
  metadata                    jsonb       not null default '{}',  -- { inviteTtl: "24" }
  updated_at                  timestamptz not null default now()
);

insert into security_policy (id) values ('global') on conflict (id) do nothing;

-- Singleton rows for optional config tables — ensures GET routes always return a row.
insert into smtp_config (id)            values ('global') on conflict (id) do nothing;
insert into payment_gateway_config (id) values ('global') on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 17. MFA RECOVERY CODES
-- One-time backup codes generated when a user enrolls in TOTP MFA.
-- user_id references auth.users (Supabase managed schema).
-- ---------------------------------------------------------------------------
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

-- =============================================================================
-- ROW-LEVEL SECURITY
-- All data access goes through the Edge Function using the SERVICE_ROLE key,
-- which bypasses RLS. We enable RLS on every table as a safety backstop and
-- add a permissive service-role policy on each so the Edge Function always works.
-- If you ever add direct client-side Supabase queries, tighten these policies.
-- =============================================================================

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

-- Service-role bypass policies (Edge Function uses SUPABASE_SERVICE_ROLE_KEY)
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

-- =============================================================================
-- DONE
-- After running this migration:
--   1. Go to Supabase Dashboard → Edge Functions and deploy the server function.
--   2. Hit GET /make-server-309fe679/health to verify the function is live.
--   3. Hit POST /make-server-309fe679/seed-modules (with Authorization header)
--      to populate the modules and features tables, OR wait for the first
--      cold-start which seeds them automatically.
-- =============================================================================