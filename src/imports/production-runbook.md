# Brandtelligence — Final Production Runbook
**Version:** 1.1 | **Date:** 2026-03-04 | **Applies to:** v1.0.0+ | **Status:** 🚀 DEPLOYMENT READY

---

## 1. Pre-Deployment Checklist
- [ ] **Supabase Project:** Ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are provisioned.
- [ ] **Secrets:** All 9 environment variables (`OPENAI_API_KEY`, `REPLICATE_API_TOKEN`, `SUPER_ADMIN_PASSWORD`, `CRON_SECRET`, etc.) must be set in GitHub Secrets.
- [ ] **FTP Access:** Verify FTP credentials for `deploy.yml`.
- [ ] **GitHub Environments:** Create `production` and `staging` environments with protection rules.

---

## 2. Infrastructure Setup (Order of Operations)

### 2.1 — Database (Supabase SQL Editor)
Run `/supabase/schema.sql`. This file is idempotent and uses `IF NOT EXISTS` for all tables.
- **Verification:** Run `SELECT count(*) FROM features;`. Should return 40+.

### 2.2 — Edge Function Deployment
Deploy the `server` function:
```bash
supabase functions deploy server
```
- **Verification:** `curl https://<ref>.supabase.co/functions/v1/make-server-309fe679/health` → `{"status":"ok"}`.

### 2.3 — Initial Seeding
Trigger the manual module seed from the Super Admin dashboard or via `curl`:
```bash
curl -X POST -H "Authorization: Bearer <ANON_KEY>" \
  https://<ref>.supabase.co/functions/v1/make-server-309fe679/seed-modules
```

---

## 3. Monitoring & Performance

### 3.1 — Uptime Monitoring
Set up external monitoring for:
1. `GET /health` (API status)
2. `GET /` (Frontend availability)
- **Interval:** 5 minutes
- **Alerts:** 2 consecutive failures → SMS/Email

### 3.2 — Core Web Vitals
Review CWV scores in **Super Admin → Audit → Performance**.
- **LCP:** < 2.5s
- **CLS:** < 0.1
- **INP:** < 200ms

---

## 4. Maintenance & Incidents

### 4.1 — Emergency Rollback
1. **Frontend:** Revert the last commit on `main` branch. GitHub Actions will auto-deploy the previous state.
2. **Database:** Use Supabase's point-in-time recovery (PITR) for critical data corruption.

### 4.2 — Incident Log
All security-sensitive incidents are logged to the `security_audit_log` in the KV store. Review this log in the Super Admin dashboard weekly.

---

## 5. Security Protocols
- **RBAC:** All routes are protected by JWT and scoped by role/tenant.
- **MFA:** Required for all `TENANT_ADMIN` and `SUPER_ADMIN` accounts.
- **CSRF:** Stateful token required for all mutating requests (`POST`/`PUT`/`DELETE`).
- **Audit:** Automated audit logs generated for all data changes.

---

**Sign-off:**
Build is production-hardened and ready for go-live.
