# Brandtelligence — Production Runbook
**Version:** 1.0 | **Date:** 2026-03-04 | **Applies to:** v1.0.0+

---

## Table of Contents
1. [First-time Production Setup](#1-first-time-production-setup)
2. [Database Schema Deployment](#2-database-schema-deployment)
3. [Supabase Edge Function Deployment](#3-supabase-edge-function-deployment)
4. [GitHub Actions Secrets](#4-github-actions-secrets)
5. [Frontend Build & Deploy](#5-frontend-build--deploy)
6. [Cron Job Activation](#6-cron-job-activation)
7. [Monitoring Setup](#7-monitoring-setup)
8. [Rollback Procedure](#8-rollback-procedure)
9. [Incident Response](#9-incident-response)
10. [Maintenance Windows](#10-maintenance-windows)

---

## 1. First-time Production Setup

### Prerequisites
- Supabase project provisioned (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- cPanel FTP access (FTP_SERVER, FTP_USERNAME, FTP_PASSWORD)
- GitHub repository with Actions enabled
- Node.js 20 LTS installed locally

### Environment Variables Required
| Variable | Source | Used By |
|----------|--------|---------|
| SUPABASE_URL | Supabase Dashboard → Settings → API | Server + Frontend |
| SUPABASE_ANON_KEY | Supabase Dashboard → Settings → API | Frontend |
| SUPABASE_SERVICE_ROLE_KEY | Supabase Dashboard → Settings → API | Server (never expose to frontend) |
| APP_URL | Your production domain (e.g. https://brand-telligence.com) | Server CORS |
| OPENAI_API_KEY | OpenAI Platform | Server (AI generation) |
| REPLICATE_API_TOKEN | Replicate Dashboard | Server (AI media) |
| SUPER_ADMIN_PASSWORD | Create a strong password | Server seed |
| CRON_SECRET | Generate: `openssl rand -hex 32` | Cron job auth |

---

## 2. Database Schema Deployment

### Step 2.1 — Run the consolidated schema
1. Open Supabase Dashboard → **SQL Editor** → **New query**
2. Copy and paste the entire contents of `/supabase/schema.sql`
3. Click **Run** (Ctrl+Enter / Cmd+Enter)
4. Expected: `Success. No rows returned.`

### Step 2.2 — Verify tables created
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```
Expected: 16 tables returned (audit_logs, approval_events, content_cards, email_templates, features, invoices, mfa_policy, mfa_recovery_codes, modules, payment_gateway_config, pending_requests, security_policy, smtp_config, tenant_users, tenants, usage_stats)

### Step 2.3 — Verify singleton rows
```sql
SELECT 'smtp_config' as tbl, count(*) FROM smtp_config
UNION ALL SELECT 'mfa_policy', count(*) FROM mfa_policy
UNION ALL SELECT 'security_policy', count(*) FROM security_policy
UNION ALL SELECT 'payment_gateway_config', count(*) FROM payment_gateway_config;
```
Expected: All 4 rows show count = 1

### Step 2.4 — Verify RLS enabled
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;
```
Expected: All tables show `rowsecurity = true`

---

## 3. Supabase Edge Function Deployment

### Step 3.1 — Install Supabase CLI
```bash
npm install -g supabase
supabase login
```

### Step 3.2 — Link to project
```bash
supabase link --project-ref <YOUR_PROJECT_REF>
```
(Project ref is in Supabase Dashboard URL: `https://app.supabase.com/project/<ref>`)

### Step 3.3 — Set environment variables
```bash
supabase secrets set APP_URL=https://brand-telligence.com
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set REPLICATE_API_TOKEN=r8_...
supabase secrets set SUPER_ADMIN_PASSWORD=<your-secure-password>
supabase secrets set CRON_SECRET=<your-cron-secret>
```

### Step 3.4 — Deploy the server function
```bash
supabase functions deploy server
```
Expected output: `Deployed Function server on project <ref>`

### Step 3.5 — Verify health endpoint
```bash
curl -s https://<PROJECT_REF>.supabase.co/functions/v1/make-server-309fe679/health
```
Expected: `{"status":"ok","timestamp":"...","version":"..."}`

### Step 3.6 — Seed modules and features
```bash
curl -s -X POST \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  https://<PROJECT_REF>.supabase.co/functions/v1/make-server-309fe679/seed-modules
```
Expected: `{"success":true,"modulesInDb":16,"featuresInDb":40,...}`

---

## 4. GitHub Actions Secrets

Navigate to: GitHub repo → **Settings** → **Secrets and variables** → **Actions**

Add the following repository secrets:

| Secret Name | Value |
|-------------|-------|
| FTP_SERVER | Your cPanel FTP host (e.g. ftp.yourdomain.com) |
| FTP_USERNAME | Your cPanel FTP username |
| FTP_PASSWORD | Your cPanel FTP password |
| SUPABASE_FUNCTIONS_URL | `https://<PROJECT_REF>.supabase.co/functions/v1` |
| CRON_SECRET | Same value as set in Step 3.3 |

### Create GitHub Environments
1. GitHub repo → **Settings** → **Environments** → **New environment**
2. Create: `production` (with protection rule: require approvals for main branch)
3. Create: `staging` (no protection rules)

---

## 5. Frontend Build & Deploy

### Manual build (local verification)
```bash
npm ci
npm run build
# Verify dist/index.html exists
ls -la dist/
```

### Automated deploy via GitHub Actions
1. Push to `main` branch
2. Monitor: GitHub repo → **Actions** → **Deploy to cPanel via FTP**
3. Expected: Green checkmark within ~10 minutes

### Verify deployment
```bash
curl -I https://brand-telligence.com/it/
```
Expected: `HTTP/2 200` or `HTTP/2 304`

---

## 6. Cron Job Activation

The cron workflow (`cron-auto-publish.yml`) triggers automatically via GitHub Actions schedule.

### Prerequisites
- `SUPABASE_FUNCTIONS_URL` secret set in GitHub repo
- `CRON_SECRET` secret set in GitHub repo (same value as server env var)

### Verify cron is active
1. GitHub repo → **Actions** → **Cron — Auto-Publish Scheduled Cards**
2. Check "scheduled" trigger is green
3. Manual trigger: click **Run workflow** to test immediately

### Test the cron endpoint manually
```bash
curl -s -X POST \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  https://<PROJECT_REF>.supabase.co/functions/v1/make-server-309fe679/cron/auto-publish
```
Expected: `{"success":true,"tenantsProcessed":N,"totalPublished":N,"totalFailed":0}`

---

## 7. Monitoring Setup

### 7.1 — Uptime Monitoring (UptimeRobot / BetterStack)
Create monitors for:
1. **Edge Function health**: `https://<ref>.supabase.co/functions/v1/make-server-309fe679/health`
   - Method: GET
   - Interval: 5 minutes
   - Alert on: 2 consecutive failures
2. **Production site**: `https://brand-telligence.com/it/`
   - Method: GET
   - Interval: 5 minutes
   - Alert on: 2 consecutive failures

### 7.2 — Core Web Vitals
CWV readings are automatically captured and stored in `localStorage['btl_cwv_readings']` when any page is loaded.

To review and save as audit evidence:
1. Log in as SUPER_ADMIN
2. Navigate to: **Super Admin** → **Audit** → **Deployment Readiness** tab
3. Click **Save CWV Evidence** to persist to KV store

### 7.3 — Security Audit Log
Security events are logged via `logSecurityEvent()` in the server. Review at:
**Super Admin** → **Audit** → **Security Log** tab

### 7.4 — (Optional) Sentry Error Tracking
To enable Sentry:
1. Create a Sentry project at https://sentry.io
2. Copy the DSN from Sentry Project → Settings → Client Keys
3. Add to `.env.production`: `VITE_SENTRY_DSN=https://your-dsn@sentry.io/...`
4. Add to GitHub Secrets: `VITE_SENTRY_DSN=...`

---

## 8. Rollback Procedure

### Frontend rollback (< 5 minutes)
1. Identify the last known good commit: `git log --oneline -10`
2. Revert: `git revert <bad-commit-hash> && git push origin main`
3. GitHub Actions will auto-deploy the reverted version

### Emergency rollback via FTP
1. Retrieve the previous `dist/` from local build cache or backup
2. Upload manually via FTP to `/public_html/brand-telligence.com/it/`

### Database rollback
The schema uses `IF NOT EXISTS` guards — tables are never dropped. For data issues:
1. Identify affected rows in Supabase Dashboard → Table Editor
2. Use soft-delete if available, or restore from Supabase daily backup

---

## 9. Incident Response

### Blank white screen
1. Open browser DevTools → Console
2. Look for `[Global]`, `[ErrorBoundary]`, or `[routes]` prefixed errors
3. If `[routes]`: a lazy import failed — check the Edge Function is deployed
4. If `[ErrorBoundary]`: a React render error — check component stack trace
5. Check `GET /health` is responding

### Auth / Login not working
1. Verify Supabase Auth is enabled: Dashboard → Auth → Settings
2. Verify TOTP MFA is enabled: Dashboard → Auth → Sign In Methods → MFA
3. Check server logs: Supabase Dashboard → Edge Functions → server → Logs
4. Verify SUPER_ADMIN_PASSWORD secret matches what was set

### Content board shows empty
1. Check browser console for `[ContentContext]` errors
2. Verify user has a `tenantId` in `user_metadata`
3. Hit `GET /content-cards?tenantId=<id>` directly to test the endpoint
4. Check `seed-modules` was run (modules table must be populated first)

### Cron job failing
1. GitHub Actions → Cron workflow → View logs
2. Verify `SUPABASE_FUNCTIONS_URL` does NOT have a trailing slash
3. Verify `CRON_SECRET` matches exactly what the server has
4. Test the endpoint manually (see Step 6)

---

## 10. Maintenance Windows

### Recommended schedule
- **Schema migrations**: Saturday 02:00–04:00 UTC (low traffic)
- **Edge Function updates**: Any time (zero-downtime via Supabase)
- **Frontend deploys**: Monday–Friday 10:00–14:00 UTC (can monitor after)

### Pre-maintenance checklist
1. Notify users via in-app announcement (if applicable)
2. Take a Supabase database snapshot (Dashboard → Backups)
3. Verify rollback procedure is ready
4. Run in staging first

### Post-maintenance checklist
1. `GET /health` returns 200
2. Super Admin can log in
3. Content board loads correctly
4. Cron job responds correctly
5. CWV readings within targets

---

## Quick Reference Commands
```bash
# Check health
curl https://<ref>.supabase.co/functions/v1/make-server-309fe679/health

# Deploy Edge Function
supabase functions deploy server

# Seed modules
curl -X POST -H "Authorization: Bearer <ANON_KEY>" \
  https://<ref>.supabase.co/functions/v1/make-server-309fe679/seed-modules

# Test cron
curl -X POST -H "Authorization: Bearer <CRON_SECRET>" \
  https://<ref>.supabase.co/functions/v1/make-server-309fe679/cron/auto-publish

# Local build
npm ci && npm run build && ls -la dist/

# Git release tag
git tag v1.0.0 -m "Production release v1.0.0" && git push origin v1.0.0
```
