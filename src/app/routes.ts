import { createBrowserRouter, redirect } from "react-router";

// ── Existing pages ──────────────────────────────────────────────────────────
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { VCardProject } from "./pages/VCardProject";
import { RootLayout } from "./components/RootLayout";

// ── New public page ─────────────────────────────────────────────────────────
import { RequestAccessPage } from "./pages/RequestAccessPage";
import { MFAEnrollPage } from "./pages/MFAEnrollPage";

// ── Super Admin dashboard ───────────────────────────────────────────────────
import { SuperLayout } from "./pages/super/SuperLayout";
import { RequestsPage } from "./pages/super/RequestsPage";
import { TenantsPage } from "./pages/super/TenantsPage";
import { ModulesPage } from "./pages/super/ModulesPage";
import { BillingPage } from "./pages/super/BillingPage";
import { UsagePage } from "./pages/super/UsagePage";
import { AuditPage } from "./pages/super/AuditPage";
import { SupportPage } from "./pages/super/SupportPage";
import { SettingsPage } from "./pages/super/SettingsPage";
import { EmailTemplatesPage } from "./pages/super/EmailTemplatesPage";

// ── Tenant Admin dashboard ──────────────────────────────────────────────────
import { TenantLayout } from "./pages/tenant/TenantLayout";
import { TenantOverviewPage } from "./pages/tenant/OverviewPage";
import { TenantCompanyPage } from "./pages/tenant/CompanyPage";
import { TenantUsersPage } from "./pages/tenant/UsersPage";
import { TenantModulesPage } from "./pages/tenant/ModulesPage";
import { TenantInvoicesPage } from "./pages/tenant/InvoicesPage";
import { TenantUsagePage } from "./pages/tenant/UsagePage";
import { TenantAuditPage } from "./pages/tenant/AuditPage";
import { TenantSettingsPage } from "./pages/tenant/SettingsPage";

export const router = createBrowserRouter([
  // ── Public / Employee shell (RootLayout + BackgroundLayout) ─────────────
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true,                   Component: HomePage },
      { path: "login",                 Component: LoginPage },
      { path: "request-access",        Component: RequestAccessPage },
      { path: "mfa-enroll",            Component: MFAEnrollPage },
      { path: "projects",              Component: ProjectsPage },
      { path: "projects/vcard-saas",   Component: VCardProject },
      { path: "projects/:slug",        Component: ProjectDetailPage },
    ],
  },

  // ── Super Admin portal (/super/*) ────────────────────────────────────────
  {
    path: "/super",
    Component: SuperLayout,
    children: [
      { index: true,        loader: () => redirect("/super/requests") },
      { path: "requests",   Component: RequestsPage },
      { path: "tenants",    Component: TenantsPage },
      { path: "modules",    Component: ModulesPage },
      { path: "billing",    Component: BillingPage },
      { path: "usage",      Component: UsagePage },
      { path: "audit",      Component: AuditPage },
      { path: "support",    Component: SupportPage },
      { path: "settings",   Component: SettingsPage },
      { path: "email-templates",  Component: EmailTemplatesPage },
    ],
  },

  // ── Tenant Admin portal (/tenant/*) ──────────────────────────────────────
  {
    path: "/tenant",
    Component: TenantLayout,
    children: [
      { index: true,        loader: () => redirect("/tenant/overview") },
      { path: "overview",   Component: TenantOverviewPage },
      { path: "company",    Component: TenantCompanyPage },
      { path: "users",      Component: TenantUsersPage },
      { path: "modules",    Component: TenantModulesPage },
      { path: "invoices",   Component: TenantInvoicesPage },
      { path: "usage",      Component: TenantUsagePage },
      { path: "audit",      Component: TenantAuditPage },
      { path: "settings",   Component: TenantSettingsPage },
    ],
  },
]);