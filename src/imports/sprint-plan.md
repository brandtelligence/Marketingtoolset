# Brandtelligence — Production Sprint Plan
**Version:** 1.0 | **Date:** 2026-03-04 | **Sprint Duration:** 1 week (Mar 4–11, 2026)

---

## Objective
Ship the Brandtelligence platform to production with zero drift — no untested code, no demo data, no broken routes, no silent errors.

---

## Sprint Acceptance Criteria (Definition of Done)
1. `GET /health` returns HTTP 200 from live Edge Function
2. All 45+ lazy-loaded routes render without `[ErrorBoundary]` or `[Global]` console errors
3. `ContentAnalyticsPage` and `ContentCalendarPage` are reachable at `/app/analytics` and `/app/calendar`
4. Super Admin can sign in with real credentials (SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD)
5. Schema.sql runs in Supabase SQL Editor with 0 errors
6. GitHub Actions `deploy.yml` completes successfully on push to `main`
7. GitHub Actions `cron-auto-publish.yml` cron job responds HTTP 200
8. Core Web Vitals: LCP ≤ 2500 ms, CLS ≤ 0.10, INP ≤ 200 ms
9. WCAG 2.1 AA: skip-nav present, all interactive elements have aria-labels
10. No `npm audit --audit-level=high` vulnerabilities

---

## Sprint Backlog

### Phase 1 — Pre-flight Verification (Day 1)
| # | Task | Owner | Status |
|---|------|-------|--------|
| 1.1 | Confirm preview renders (no blank screen) | Dev | ✅ Fixed |
| 1.2 | Check browser console for `[Global]`, `[ErrorBoundary]`, `[routes]` errors | Dev | ✅ Hardened |
| 1.3 | Verify all 45+ route lazy imports have matching named exports | Dev | ✅ Audited |
| 1.4 | Confirm `ContentAnalyticsPage` and `ContentCalendarPage` load at their routes | Dev | ✅ Wired |
| 1.5 | Confirm `CardDetailModal` export exists in `ContentBoardPage.tsx` | Dev | ✅ Confirmed |

### Phase 2 — Database & Backend (Day 1–2)
| # | Task | Owner | Status |
|---|------|-------|--------|
| 2.1 | Run `/supabase/schema.sql` in Supabase SQL Editor | DB Admin | ✅ Ready |
| 2.2 | Verify 0 errors from schema execution | DB Admin | ⬜ Pending run |
| 2.3 | Deploy Edge Function: `supabase functions deploy server` | DevOps | ⬜ Pending |
| 2.4 | Hit `GET /health` and confirm 200 | DevOps | ⬜ Pending |
| 2.5 | Hit `POST /seed-modules` and confirm modules + features seeded | DevOps | ⬜ Pending |
| 2.6 | Verify singleton rows exist: smtp_config, mfa_policy, security_policy | DB Admin | ⬜ Pending |

### Phase 3 — Auth & RBAC (Day 2)
| # | Task | Owner | Status |
|---|------|-------|--------|
| 3.1 | Confirm Super Admin exists in Supabase Auth | Dev | ⬜ Pending |
| 3.2 | Enable TOTP MFA in Supabase Dashboard → Auth → Sign In Methods | DevOps | ⬜ Pending |
| 3.3 | Test login flow end-to-end (SUPER_ADMIN → dashboard) | QA | ⬜ Pending |
| 3.4 | Test tenant invite flow (tenant creation → user invite email) | QA | ⬜ Pending |
| 3.5 | Verify MFA enrollment page works for new users | QA | ⬜ Pending |

### Phase 4 — CI/CD Pipeline (Day 2–3)
| # | Task | Owner | Status |
|---|------|-------|--------|
| 4.1 | Add GitHub repo secrets: FTP_SERVER, FTP_USERNAME, FTP_PASSWORD | DevOps | ⬜ Pending |
| 4.2 | Add GitHub repo secrets: SUPABASE_FUNCTIONS_URL, CRON_SECRET | DevOps | ⬜ Pending |
| 4.3 | Create "production" environment in GitHub repo settings | DevOps | ⬜ Pending |
| 4.4 | Create "staging" environment in GitHub repo settings | DevOps | ⬜ Pending |
| 4.5 | Push to `main` and verify `deploy.yml` completes | DevOps | ⬜ Pending |
| 4.6 | Manually trigger `cron-auto-publish.yml` workflow and verify | DevOps | ⬜ Pending |

### Phase 5 — QA & Performance (Day 3–4)
| # | Task | Owner | Status |
|---|------|-------|--------|
| 5.1 | Run browser QA checklist (all pages on desktop + mobile) | QA | ⬜ Pending |
| 5.2 | Run pen-test checklist in `/super/audit` → Security tab | Security | ⬜ Pending |
| 5.3 | Capture Core Web Vitals via `/super/audit` → Deployment Readiness tab | QA | ⬜ Pending |
| 5.4 | Verify skip-nav link works on keyboard navigation | QA | ⬜ Pending |
| 5.5 | Test content card create → approve → schedule → publish flow | QA | ⬜ Pending |
| 5.6 | Test auto-publish failure banner appears when cron fails | QA | ⬜ Pending |

### Phase 6 — Monitoring (Day 4)
| # | Task | Owner | Status |
|---|------|-------|--------|
| 6.1 | Configure uptime monitor for `GET /health` (UptimeRobot / BetterStack) | DevOps | ⬜ Pending |
| 6.2 | Set alert threshold: 2 consecutive failures → SMS/email | DevOps | ⬜ Pending |
| 6.3 | Configure uptime monitor for production FTP domain | DevOps | ⬜ Pending |
| 6.4 | (Optional) Add Sentry DSN as VITE_SENTRY_DSN env var in GitHub secrets | DevOps | ⬜ Optional |

### Phase 7 — Sign-off (Day 5)
| # | Task | Owner | Status |
|---|------|-------|--------|
| 7.1 | Save CWV evidence in Audit → Deployment Readiness | Tech Lead | ⬜ Pending |
| 7.2 | Save schema health record in Audit → Deployment Readiness | Tech Lead | ⬜ Pending |
| 7.3 | Complete deployment sequence checklist in Audit → Deployment Readiness | Tech Lead | ⬜ Pending |
| 7.4 | Approve Go-Live in Audit → Deployment Readiness | Tech Lead | ⬜ Pending |
| 7.5 | Tag git release: `git tag v1.0.0 && git push origin v1.0.0` | DevOps | ⬜ Pending |

---

## Risk Register
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Schema migration conflicts | Low | High | Use consolidated schema.sql (IF NOT EXISTS guards) |
| FTP deployment fails | Medium | High | Test with staging first; verify FTP credentials |
| Cron secret not set | High | Medium | Set CRON_SECRET in GitHub Secrets before first push |
| TOTP MFA not enabled in Supabase | High | High | Check Supabase Dashboard → Auth before go-live |
| CORS blocking production domain | Low | High | APP_URL env var must match production domain exactly |

---

## Go / No-Go Checklist
All items must be ✅ before production go-live:
- [ ] `GET /health` returns 200
- [ ] Super Admin can log in
- [ ] All 7 phases above marked complete
- [ ] No high-severity pen-test findings open
- [ ] CWV evidence saved to audit trail
- [ ] Go-Live approved in Deployment Readiness tab
