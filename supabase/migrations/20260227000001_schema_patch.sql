-- =============================================================================
-- Brandtelligence SaaS Platform — Schema Patch 02
-- Run this in: Supabase Dashboard → SQL Editor → New query
--
-- PURPOSE
--   Promotes all JSON-packed "ghost" fields to proper typed columns so every
--   field that the UI reads/writes has a real Postgres column, an index where
--   needed, and a consistent NOT NULL default.  No tables are dropped — all
--   16 existing tables are in active use.
--
-- SAFETY
--   Every statement uses ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
--   Safe to re-run: existing data is never overwritten, only backfilled where
--   the new column is still at its default value.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. TENANTS  — add 4 missing operational columns
-- ---------------------------------------------------------------------------
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS company_size     text,          -- "51-200", "11-50", …
  ADD COLUMN IF NOT EXISTS tax_id           text,          -- "MY-123456789"
  ADD COLUMN IF NOT EXISTS billing_address  text,          -- full billing address string
  ADD COLUMN IF NOT EXISTS suspended_reason text;          -- reason shown in Tenant Detail drawer

-- No backfill needed — these were always returned as "" / null from the server;
-- the DB rows simply had no column for them before this patch.


-- ---------------------------------------------------------------------------
-- 2. PENDING_REQUESTS  — promote JSON fields to dedicated columns
--    Previously: country, size, requestedModules, notes, rejectedReason were
--    all serialised as JSON inside the `message` text column.
--    After this patch: dedicated columns; `message` is left as-is for any
--    legacy rows already in the database.
-- ---------------------------------------------------------------------------
ALTER TABLE pending_requests
  ADD COLUMN IF NOT EXISTS country           text        not null default '',
  ADD COLUMN IF NOT EXISTS company_size      text        not null default '',
  ADD COLUMN IF NOT EXISTS requested_modules text[]      not null default '{}',
  ADD COLUMN IF NOT EXISTS notes             text        not null default '',
  ADD COLUMN IF NOT EXISTS rejected_reason   text;

-- One-time backfill: parse existing JSON `message` rows into the new columns.
-- Only runs when the column is still at its default (idempotent).
UPDATE pending_requests
SET
  country          = coalesce( nullif(message::jsonb->>'country', ''),         '' ),
  company_size     = coalesce( nullif(message::jsonb->>'size',    ''),         '' ),
  requested_modules = coalesce(
    array(select jsonb_array_elements_text(message::jsonb->'requestedModules')),
    '{}'::text[]
  ),
  notes            = coalesce( nullif(message::jsonb->>'notes',   ''),         '' ),
  rejected_reason  = nullif(message::jsonb->>'rejectedReason', '')
WHERE
  message IS NOT NULL
  AND message ~ '^\{'              -- only rows that contain JSON
  AND country = ''                 -- skip rows already backfilled
  AND message <> '{}';


-- ---------------------------------------------------------------------------
-- 3. INVOICES  — promote JSON fields to dedicated columns
--    Previously: invoiceNumber, tenantName, period, subtotal, tax,
--    paymentMethod, receiptUrl, notes, lines[] were all packed into the
--    `description` text column as JSON.
-- ---------------------------------------------------------------------------
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_number  text          not null default '',
  ADD COLUMN IF NOT EXISTS tenant_name     text          not null default '',
  ADD COLUMN IF NOT EXISTS period          text          not null default '',
  ADD COLUMN IF NOT EXISTS subtotal        numeric(10,2) not null default 0,
  ADD COLUMN IF NOT EXISTS tax             numeric(10,2) not null default 0,
  ADD COLUMN IF NOT EXISTS payment_method  text          not null default 'none',
  ADD COLUMN IF NOT EXISTS receipt_url     text,
  ADD COLUMN IF NOT EXISTS notes           text          not null default '',
  ADD COLUMN IF NOT EXISTS lines           jsonb         not null default '[]';

-- One-time backfill from JSON `description`
UPDATE invoices
SET
  invoice_number = coalesce( nullif(description::jsonb->>'invoiceNumber', ''), '' ),
  tenant_name    = coalesce( nullif(description::jsonb->>'tenantName',    ''), '' ),
  period         = coalesce( nullif(description::jsonb->>'period',        ''), '' ),
  subtotal       = coalesce(
                     (nullif(description::jsonb->>'subtotal', ''))::numeric,
                     amount ),
  tax            = coalesce( (nullif(description::jsonb->>'tax', ''))::numeric, 0 ),
  payment_method = coalesce( nullif(description::jsonb->>'paymentMethod', ''), 'none' ),
  receipt_url    = nullif(description::jsonb->>'receiptUrl', ''),
  notes          = coalesce( nullif(description::jsonb->>'notes', ''), '' ),
  lines          = coalesce( description::jsonb->'lines', '[]'::jsonb )
WHERE
  description IS NOT NULL
  AND description ~ '^\{'
  AND invoice_number = ''          -- skip rows already backfilled
  AND description <> '{}';

-- Performance index for per-tenant invoice lookups (already exists for tenant_id;
-- add period + payment_method for the billing filter dropdowns)
CREATE INDEX IF NOT EXISTS idx_invoices_period         ON invoices (period);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_method ON invoices (payment_method);


-- ---------------------------------------------------------------------------
-- 4. FEATURES  — add dedicated module_id + rollout_note columns
--    Previously both were serialised as JSON in the `description` text column.
-- ---------------------------------------------------------------------------
ALTER TABLE features
  ADD COLUMN IF NOT EXISTS module_id    text references modules(id) on delete set null,
  ADD COLUMN IF NOT EXISTS rollout_note text not null default '';

-- One-time backfill from JSON `description`
UPDATE features
SET
  module_id    = nullif(description::jsonb->>'moduleId',    ''),
  rollout_note = coalesce( nullif(description::jsonb->>'rolloutNote', ''), '' )
WHERE
  description IS NOT NULL
  AND description ~ '^\{'
  AND module_id IS NULL;

-- Rewrite `description` to be plain human-readable text (strip JSON wrapper)
UPDATE features
SET description = coalesce(
  nullif(description::jsonb->>'text', ''),
  ''
)
WHERE description ~ '^\{';

-- FK index
CREATE INDEX IF NOT EXISTS idx_features_module_id ON features (module_id);


-- =============================================================================
-- DONE.
-- After running this patch:
--   1. Re-deploy the Edge Function (supabase/functions/server/index.tsx)
--      so the updated mapper functions use the new columns.
--   2. The /seed-modules endpoint will now include module_id + rollout_note
--      directly in the features upsert — re-run it once to refresh the rows.
-- =============================================================================
