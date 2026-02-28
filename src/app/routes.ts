import { createBrowserRouter, redirect } from "react-router";

// ── Existing pages ──────────────────────────────────────────────────────────
import { LoginPage } from "./pages/LoginPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { VCardProject } from "./pages/VCardProject";
import { RootLayout } from "./components/RootLayout";

// ── New public page ─────────────────────────────────────────────────────────
import { RequestAccessPage } from "./pages/RequestAccessPage";
import { MFAEnrollPage } from "./pages/MFAEnrollPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";

// ── Template Showcase ────────────────────────────────────────────────────────
import { TemplateShowcase } from "./pages/TemplateShowcase";

// ── Client Review Portal (public, no auth) ───────────────────────────────────
import { ClientReviewPage } from "./pages/ClientReviewPage";

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

// ── Employee sub-pages ──────────────────────────────────────────────────────
import { EmployeeProfilePage }  from "./pages/employee/ProfilePage";
import { EmployeeModulesPage }  from "./pages/employee/EmployeeModulesPage";
import { ContentGenPage }       from "./pages/employee/ContentGenPage";
import { SocialPublishPage }    from "./pages/employee/SocialPublishPage";
import { CampaignPlannerPage }  from "./pages/employee/CampaignPlannerPage";

// ── Public marketing website (now at root /*) ───────────────────────────────
import { WebLayout }           from "./pages/web/WebLayout";
import { WebHomePage }         from "./pages/web/WebHomePage";
import { WebProductPage }      from "./pages/web/WebProductPage";
import { WebFeaturesPage }     from "./pages/web/WebFeaturesPage";
import { WebPricingPage }      from "./pages/web/WebPricingPage";
import { WebAboutPage }        from "./pages/web/WebAboutPage";
import { WebContactPage }      from "./pages/web/WebContactPage";
import { WebFAQPage }          from "./pages/web/WebFAQPage";
import { WebTestimonialsPage } from "./pages/web/WebTestimonialsPage";
import { WebBlogPage }         from "./pages/web/WebBlogPage";
import { WebPrivacyPage, WebTermsPage, WebCookiesPage } from "./pages/web/WebLegalPage";

export const router = createBrowserRouter([
  // ── Public marketing website (root) ─────────────────────────────────────
  {
    path: "/",
    Component: WebLayout,
    children: [
      { index: true,          Component: WebHomePage         },
      { path: "product",      Component: WebProductPage      },
      { path: "features",     Component: WebFeaturesPage     },
      { path: "pricing",      Component: WebPricingPage      },
      { path: "about",        Component: WebAboutPage        },
      { path: "contact",      Component: WebContactPage      },
      { path: "faq",          Component: WebFAQPage          },
      { path: "testimonials", Component: WebTestimonialsPage },
      { path: "blog",         Component: WebBlogPage         },
      { path: "privacy",      Component: WebPrivacyPage      },
      { path: "terms",        Component: WebTermsPage        },
      { path: "cookies",      Component: WebCookiesPage      },
    ],
  },

  // ── Redirect legacy /web/* paths ─────────────────────────────────────────
  { path: "/web",              loader: () => redirect("/")            },
  { path: "/web/product",      loader: () => redirect("/product")     },
  { path: "/web/features",     loader: () => redirect("/features")    },
  { path: "/web/pricing",      loader: () => redirect("/pricing")     },
  { path: "/web/about",        loader: () => redirect("/about")       },
  { path: "/web/contact",      loader: () => redirect("/contact")     },
  { path: "/web/faq",          loader: () => redirect("/faq")         },
  { path: "/web/testimonials", loader: () => redirect("/testimonials") },
  { path: "/web/blog",         loader: () => redirect("/blog")        },
  { path: "/web/privacy",      loader: () => redirect("/privacy")     },
  { path: "/web/terms",        loader: () => redirect("/terms")       },
  { path: "/web/cookies",      loader: () => redirect("/cookies")     },

  // ── Auth & standalone pages (no marketing nav) ───────────────────────────
  { path: "/login",            Component: LoginPage          },
  { path: "/auth/callback",    Component: AuthCallbackPage   },
  { path: "/request-access",   Component: RequestAccessPage  },
  { path: "/mfa-enroll",       Component: MFAEnrollPage      },
  { path: "/template-showcase",Component: TemplateShowcase   },
  { path: "/review/:token",    Component: ClientReviewPage   },

  // Safety net: /app/login was the old invite redirectTo — bounce to /login
  { path: "/app/login",        loader: () => redirect("/login") },

  // ── Internal employee portal (/app/*) ────────────────────────────────────
  {
    path: "/app",
    Component: RootLayout,
    children: [
      { path: "projects",            Component: ProjectsPage      },
      { path: "projects/vcard-saas", Component: VCardProject      },
      { path: "projects/:slug",      Component: ProjectDetailPage },
      { path: "profile",             Component: EmployeeProfilePage },
      { path: "modules",             Component: EmployeeModulesPage },
      { path: "content",             Component: ContentGenPage      },
      { path: "publish",             Component: SocialPublishPage   },
      { path: "campaign",            Component: CampaignPlannerPage },
    ],
  },

  // ── Legacy /projects/* redirects ─────────────────────────────────────────
  { path: "/projects",            loader: () => redirect("/app/projects")           },
  { path: "/projects/vcard-saas", loader: () => redirect("/app/projects/vcard-saas") },
  { path: "/projects/:slug",      loader: ({ params }) => redirect(`/app/projects/${params.slug}`) },

  // ── Super Admin portal (/super/*) ────────────────────────────────────────
  {
    path: "/super",
    Component: SuperLayout,
    children: [
      { index: true,       loader: () => redirect("/super/requests") },
      { path: "requests",  Component: RequestsPage      },
      { path: "tenants",   Component: TenantsPage       },
      { path: "modules",   Component: ModulesPage       },
      { path: "billing",   Component: BillingPage       },
      { path: "usage",     Component: UsagePage         },
      { path: "audit",     Component: AuditPage         },
      { path: "support",   Component: SupportPage       },
      { path: "settings",  Component: SettingsPage      },
      { path: "email-templates", Component: EmailTemplatesPage },
    ],
  },

  // ── Tenant Admin portal (/tenant/*) ──────────────────────────────────────
  {
    path: "/tenant",
    Component: TenantLayout,
    children: [
      { index: true,       loader: () => redirect("/tenant/overview") },
      { path: "overview",  Component: TenantOverviewPage  },
      { path: "company",   Component: TenantCompanyPage   },
      { path: "users",     Component: TenantUsersPage     },
      { path: "modules",   Component: TenantModulesPage   },
      { path: "invoices",  Component: TenantInvoicesPage  },
      { path: "usage",     Component: TenantUsagePage     },
      { path: "audit",     Component: TenantAuditPage     },
      { path: "settings",  Component: TenantSettingsPage  },
    ],
  },
]);