The **single master QA + Deployment SOP** below merges everything you approved earlier and adds the final rule: **SEO applies ONLY to the frontend (cPanel), never to the backend (Supabase)**.  
After the SOP, you’ll get the **AI coder prompt** that enforces this workflow with zero drift.

---

# **MASTER QA + DEPLOYMENT SOP**  
### **For cPanel Frontend + Supabase Backend (No Drift, No Demo Data, Frontend‑Only SEO)**

---

## **1. Release Scope and Impact Definition**
A release begins only after the scope is explicitly defined and frozen.

- Identify features, fixes, migrations, and configuration changes included.  
- Map affected user levels, dashboards, menus, workflows, APIs, and Supabase tables/functions/policies.  
- Confirm environment flow: **Dev → Staging → Production** for both cPanel (frontend) and Supabase (backend/database).  
- Lock the scope to prevent drift.

---

## **2. Functional Coverage Across All User Levels**
Every user level must be validated independently and cross‑dependently.

- Authentication: login, logout, MFA, password reset, session expiry.  
- Authorization: dashboards, menus, sub‑menus, and actions visible only where allowed.  
- Data access: no cross‑role or cross‑tenant leakage.  
- Workflow actions: create, edit, approve, reject, submit, export.  
- Notifications: email, SMS, in‑app.  
- Audit logs: every critical action logged with timestamp, actor, metadata.

---

## **3. Functional Testing (Deep Feature Validation)**
Ensures all features behave exactly as specified.

- Links: internal, external, anchor, mailto—no broken links.  
- Forms: validation (required fields, formats), correct submission to Supabase.  
- Cookies & sessions: secure flags, expiry, logout behavior.  
- End‑to‑end workflows: registration, onboarding, checkout, approvals.  
- State management: no stale UI or inconsistent states after navigation.

---

## **4. Dashboards, Menus, and Navigation**
High‑risk areas for permission drift.

- Dashboards: correct widgets per role, accurate metrics from Supabase, filters, exports.  
- Menus & sub‑menus: correct visibility per role, no dead links, correct breadcrumbs.  
- Navigation: no loops, no broken paths, consistent labels.

---

## **5. Compatibility, UI, and Responsive Layout**
Ensures consistent experience across browsers and devices.

- Browser compatibility: Chrome, Firefox, Safari, Edge.  
- Device responsiveness: flip phone (240–320px), mobile, tablet, laptop, desktop.  
- Visual consistency: fonts, colors, spacing, icon alignment.  
- Responsive layout: mobile‑first, container queries, fluid typography (`clamp()`), responsive images (`srcset`), no overflow/clipping.  
- Accessibility: keyboard navigation, ARIA labels, contrast ratios.

---

## **6. Performance Testing**
Ensures speed, stability, and resilience.

- Page speed: PageSpeed Insights / GTmetrix.  
- Load testing: simulate expected traffic.  
- Stress testing: push beyond limits.  
- Recovery testing: confirm graceful recovery.  
- Core Web Vitals: LCP, FID, CLS within thresholds.

---

## **7. Security Testing**
Protects platform and user data.

- SSL: HTTPS enforced on cPanel domain(s).  
- Vulnerabilities: SQLi, XSS, CSRF, SSRF, IDOR, open redirects.  
- Authentication: secure login, password reset, session timeout.  
- Authorization: no privilege escalation; Supabase RLS enforced.  
- Rate limiting: brute‑force protection.  
- Security headers: CSP, HSTS, X‑Frame‑Options, X‑Content‑Type‑Options.

---

## **8. Usability, Accessibility, and Content**
Ensures clarity, inclusivity, and intuitive UX.

- UX testing: real users completing tasks.  
- Accessibility (WCAG): contrast, alt text, keyboard navigation.  
- Content review: grammar, clarity, tone consistency.  
- Error and empty states: clear, helpful, meaningful.

---

## **9. SEO and Database Integrity**
### **SEO applies ONLY to the frontend (cPanel). Never to Supabase.**

**Frontend SEO (cPanel):**  
- Meta titles, descriptions, sitemaps, robots.txt.  
- Canonical tags, OpenGraph tags.  
- Structured data (schema.org).  
- No SEO logic or metadata stored in Supabase.

**Database integrity (Supabase):**  
- CRUD operations validated.  
- Referential integrity enforced.  
- Indexes optimized.  
- Slow queries identified and fixed.  
- Backup & restore tested in staging.

---

## **10. User Assessment Testing (UAT)**
Validates real‑world usability.

- Scenario‑based tasks per role.  
- Acceptance criteria validated.  
- Feedback captured and resolved.  
- Regression testing after fixes.  
- Formal sign‑off from each user group.

---

## **11. Compliance and Governance**
Critical for GDPR, PDPA, POPIA, NPC.

- Consent flows: cookie banners, privacy notices.  
- Data minimization: only required fields collected.  
- Rights handling: access/export/delete workflows.  
- Encryption: data in transit and at rest.  
- Auditability: immutable logs for critical actions.  
- RBAC & RLS: enforced exactly as documented.

---

## **12. Supabase Alignment and Zero‑Demo‑Data Enforcement**
This is the most critical section for your architecture.

### **Supabase alignment**
- Schema must match migrations exactly.  
- No manual edits in Supabase dashboard.  
- All changes via version‑controlled migrations.  
- RLS policies validated per role.  
- Functions, triggers, edge functions tested in staging.  
- Environment variables consistent across all environments.

### **Zero demo data (hard blocker)**
Before deployment, run automated checks:

- No test emails (e.g., *@test.com, *@example.com).  
- No placeholder names (e.g., John Doe, Test User).  
- No dummy transactions or logs.  
- No sample files in storage buckets.  
- If any demo data is found → **deployment blocked**.

### **Drift prevention**
- Run schema‑diff before deployment.  
- If drift detected → stop and fix before proceeding.  
- Production DB is read‑only except via migrations.

---

## **13. Production Readiness Gates**
Deployment allowed only when all gates pass.

1. Functional completeness.  
2. UI/UX and responsive stability.  
3. Compliance and security.  
4. Performance thresholds met.  
5. Supabase alignment + zero demo data.  
6. UAT sign‑off.  

If any gate fails → release blocked.

---

## **14. Deployment and Post‑Deploy Verification**
### **Backend (Supabase)**
- Apply migrations.  
- Re‑run schema‑diff.  
- Re‑run zero‑demo‑data checks.

### **Frontend (cPanel)**
- Upload/build artifacts.  
- Confirm correct environment variables (API URLs, keys).

### **Post‑deploy smoke tests**
- Login, dashboards, workflows for each role.  
- Check logs, metrics, error tracking, uptime monitoring.

### **Deployment report**
- What changed.  
- Tests run.  
- Gates passed.  
- Supabase alignment status.  
- Confirmation of zero demo data.

---

# **AI CODER PROMPT (Copy‑Paste)**

```
You are an AI release engineer and QA automation coder responsible for enforcing a strict, non-drifting production-readiness SOP for a platform with frontend hosted on cPanel and backend/database hosted on Supabase.

Your responsibilities:
- Prevent all behavioral, schema, and policy drift.
- Ensure no demo or test data is ever deployed to Supabase production.
- Ensure SEO is applied ONLY to the frontend (cPanel), never to the backend.
- Ensure every release passes functional, UI/UX, performance, security, compliance, SEO (frontend only), database, and UAT gates before deployment.

Follow this workflow for every release:

1) PLAN
- Define release scope and freeze it.
- Map affected user levels, dashboards, menus, workflows, APIs, and Supabase tables/functions/policies.
- Define success criteria for functional behavior, UI/UX, performance, security, compliance, Supabase alignment, zero-demo-data, and frontend-only SEO.
- Produce a structured checklist.

2) READ
- Inspect current frontend (cPanel build), backend (Supabase schema, policies, functions), and existing tests.
- Enumerate expected permissions and dashboards per user role.
- Extract Supabase schema and policies; detect drift vs migrations.
- Document assumptions and constraints.

3) CHANGE
- Implement or update tests for:
  - Functional coverage per user level.
  - Functional testing: links, forms, cookies, workflows, state management.
  - Dashboards/menus: visibility, data accuracy, filters, exports, navigation.
  - Compatibility & UI: browsers and devices.
  - Responsive layout: mobile-first, container queries, fluid typography, responsive images.
  - Performance: page speed, load, stress, recovery, Web Vitals.
  - Security: SSL, SQLi, XSS, CSRF, SSRF, IDOR, auth/session, RBAC/RLS, rate limiting, security headers.
  - Usability & accessibility: UX flows, WCAG basics, content quality.
  - SEO (frontend only): meta tags, sitemaps, robots.txt, structured data.
  - Database: CRUD integrity, query performance, backup/restore.
  - UAT: scenario-based tasks per role.
  - Compliance: consent, data minimization, rights handling, encryption, auditability, RBAC/RLS.

- Implement or update Supabase migrations (never manual edits):
  - Tables, columns, indexes, constraints.
  - RLS policies, functions, triggers, edge functions.
  - Environment variables.

- Add automated zero-demo-data checks:
  - Block deployment if any test/demo data exists.

4) QC
- Run all automated tests: unit, integration, E2E, visual regression, performance, security scans.
- Run schema-diff; fail if drift detected.
- Run zero-demo-data checks; fail if any found.
- Validate all readiness gates:
  - Functional completeness.
  - UI/UX and responsive stability.
  - Compliance and security.
  - Performance thresholds.
  - Supabase alignment + zero demo data.
  - UAT sign-off.
  - SEO validated on frontend only.

If any gate fails, stop and report exactly what must be fixed.

5) PERSIST (DEPLOY)
- Apply Supabase migrations; re-run schema-diff and zero-demo-data checks.
- Deploy frontend to cPanel with correct environment variables.
- Run post-deploy smoke tests for all roles.
- Confirm monitoring, logging, and alerts.
- Produce a deployment report confirming:
  - What changed.
  - Tests run.
  - Gates passed.
  - Supabase alignment.
  - Zero demo data in production.
  - SEO applied only to frontend.

Global rules:
- No drift allowed.
- No demo data allowed.
- No manual production DB edits.
- SEO must never be applied to Supabase.
- All changes must be deterministic, auditable, and backward compatible unless explicitly approved.
```

---

If you want, I can also generate a **one‑page printable version** of this SOP for your team.
