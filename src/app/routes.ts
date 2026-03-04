import { createBrowserRouter, redirect } from "react-router";
import { lazy, Suspense, createElement, type ComponentType } from "react";

// ── Lazy wrapper — wraps a dynamic import in Suspense with a loading spinner ──
function lazyPage(
  importFn: () => Promise<{ [key: string]: ComponentType<any> }>,
  exportName = "default"
) {
  const Lazy = lazy(async () => {
    try {
      const mod = await importFn();
      const Comp = (mod as any)[exportName] || mod.default;
      if (!Comp) {
        console.error(`[routes] Export "${exportName}" not found in module`, mod);
        return {
          default: () =>
            createElement("div", {
              style: { padding: "2rem", color: "#f87171", fontFamily: "sans-serif", textAlign: "center" },
            }, `Missing export: ${exportName}`),
        };
      }
      return { default: Comp };
    } catch (err) {
      console.error(`[routes] Failed to load page (export="${exportName}"):`, err);
      return {
        default: () =>
          createElement(
            "div",
            {
              style: {
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0a0615",
                color: "#fff",
                padding: "2rem",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              },
            },
            createElement(
              "div",
              { style: { maxWidth: "32rem", textAlign: "center" } },
              createElement("h1", { style: { fontSize: "1.5rem", fontWeight: 700, color: "#f87171", marginBottom: "1rem" } }, "Page Load Error"),
              createElement("p", { style: { color: "rgba(255,255,255,0.6)", marginBottom: "1rem", fontSize: "0.875rem", lineHeight: 1.6 } }, String(err)),
              createElement("button", {
                style: {
                  padding: "0.5rem 1rem",
                  background: "#9333ea",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                },
                onClick: () => window.location.reload(),
              }, "Reload Page")
            )
          ),
      };
    }
  });

  return function LazyPageWrapper() {
    return createElement(
      Suspense,
      {
        fallback: createElement("div", {
          style: {
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
          children: createElement("div", {
            style: {
              width: "2rem",
              height: "2rem",
              border: "2px solid #0BA4AA",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            },
          }),
        }),
      },
      createElement(Lazy)
    );
  };
}

// ── Layout components (loaded eagerly — they're small and always needed) ─────
import { RootLayout } from "./components/RootLayout";

// ── Lazy-loaded pages ────────────────────────────────────────────────────────

// Public marketing website
const WebLayout         = lazyPage(() => import("./pages/web/WebLayout"),         "WebLayout");
const WebHomePage       = lazyPage(() => import("./pages/web/WebHomePage"),       "WebHomePage");
const WebProductPage    = lazyPage(() => import("./pages/web/WebProductPage"),    "WebProductPage");
const WebFeaturesPage   = lazyPage(() => import("./pages/web/WebFeaturesPage"),   "WebFeaturesPage");
const WebPricingPage    = lazyPage(() => import("./pages/web/WebPricingPage"),    "WebPricingPage");
const WebAboutPage      = lazyPage(() => import("./pages/web/WebAboutPage"),      "WebAboutPage");
const WebContactPage    = lazyPage(() => import("./pages/web/WebContactPage"),    "WebContactPage");
const WebFAQPage        = lazyPage(() => import("./pages/web/WebFAQPage"),        "WebFAQPage");
const WebTestimonialsPage = lazyPage(() => import("./pages/web/WebTestimonialsPage"), "WebTestimonialsPage");
const WebBlogPage       = lazyPage(() => import("./pages/web/WebBlogPage"),       "WebBlogPage");
const WebPrivacyPage    = lazyPage(() => import("./pages/web/WebLegalPage"),      "WebPrivacyPage");
const WebTermsPage      = lazyPage(() => import("./pages/web/WebLegalPage"),      "WebTermsPage");
const WebCookiesPage    = lazyPage(() => import("./pages/web/WebLegalPage"),      "WebCookiesPage");

// Auth & standalone
const LoginPage         = lazyPage(() => import("./pages/LoginPage"),             "LoginPage");
const AuthCallbackPage  = lazyPage(() => import("./pages/AuthCallbackPage"),      "AuthCallbackPage");
const RequestAccessPage = lazyPage(() => import("./pages/RequestAccessPage"),     "RequestAccessPage");
const MFAEnrollPage     = lazyPage(() => import("./pages/MFAEnrollPage"),         "MFAEnrollPage");
const TemplateShowcase  = lazyPage(() => import("./pages/TemplateShowcase"),      "TemplateShowcase");
const ClientReviewPage  = lazyPage(() => import("./pages/ClientReviewPage"),      "ClientReviewPage");
const NotFoundPage      = lazyPage(() => import("./pages/NotFoundPage"),          "NotFoundPage");

// Employee portal
const ProjectsPage      = lazyPage(() => import("./pages/ProjectsPage"),          "ProjectsPage");
const ProjectDetailPage = lazyPage(() => import("./pages/ProjectDetailPage"),     "ProjectDetailPage");
const VCardProject      = lazyPage(() => import("./pages/VCardProject"),          "VCardProject");
const DashboardPage     = lazyPage(() => import("./pages/employee/DashboardPage"),       "DashboardPage");
const EmployeeProfilePage = lazyPage(() => import("./pages/employee/ProfilePage"),       "EmployeeProfilePage");
const EmployeeModulesPage = lazyPage(() => import("./pages/employee/EmployeeModulesPage"), "EmployeeModulesPage");
const ContentGenPage    = lazyPage(() => import("./pages/employee/ContentGenPage"),      "ContentGenPage");
const ContentBoardPage  = lazyPage(() => import("./pages/employee/ContentBoardPage"),    "ContentBoardPage");
const SocialPublishPage = lazyPage(() => import("./pages/employee/SocialPublishPage"),   "SocialPublishPage");
const CampaignPlannerPage = lazyPage(() => import("./pages/employee/CampaignPlannerPage"), "CampaignPlannerPage");
const ActivityFeedPage  = lazyPage(() => import("./pages/employee/ActivityFeedPage"),    "ActivityFeedPage");
const ChannelDashboardPage = lazyPage(() => import("./pages/employee/ChannelDashboardPage"), "ChannelDashboardPage");

// Analytics & Calendar (previously orphaned)
const ContentAnalyticsPage = lazyPage(() => import("./pages/employee/ContentAnalyticsPage"), "ContentAnalyticsPage");
const ContentCalendarPage  = lazyPage(() => import("./pages/employee/ContentCalendarPage"),  "ContentCalendarPage");

// Super Admin portal
const SuperLayout       = lazyPage(() => import("./pages/super/SuperLayout"),     "SuperLayout");
const RequestsPage      = lazyPage(() => import("./pages/super/RequestsPage"),    "RequestsPage");
const TenantsPage       = lazyPage(() => import("./pages/super/TenantsPage"),     "TenantsPage");
const ModulesPage       = lazyPage(() => import("./pages/super/ModulesPage"),     "ModulesPage");
const BillingPage       = lazyPage(() => import("./pages/super/BillingPage"),     "BillingPage");
const UsagePage         = lazyPage(() => import("./pages/super/UsagePage"),       "UsagePage");
const AuditPage         = lazyPage(() => import("./pages/super/AuditPage"),       "AuditPage");
const SupportPage       = lazyPage(() => import("./pages/super/SupportPage"),     "SupportPage");
const SettingsPage      = lazyPage(() => import("./pages/super/SettingsPage"),    "SettingsPage");
const EmailTemplatesPage = lazyPage(() => import("./pages/super/EmailTemplatesPage"), "EmailTemplatesPage");
const InboxPage         = lazyPage(() => import("./pages/super/InboxPage"),       "InboxPage");

// Tenant Admin portal
const TenantLayout      = lazyPage(() => import("./pages/tenant/TenantLayout"),   "TenantLayout");
const TenantOverviewPage = lazyPage(() => import("./pages/tenant/OverviewPage"),  "TenantOverviewPage");
const TenantCompanyPage = lazyPage(() => import("./pages/tenant/CompanyPage"),    "TenantCompanyPage");
const TenantUsersPage   = lazyPage(() => import("./pages/tenant/UsersPage"),      "TenantUsersPage");
const TenantModulesPage = lazyPage(() => import("./pages/tenant/ModulesPage"),    "TenantModulesPage");
const TenantInvoicesPage = lazyPage(() => import("./pages/tenant/InvoicesPage"),  "TenantInvoicesPage");
const TenantUsagePage   = lazyPage(() => import("./pages/tenant/UsagePage"),      "TenantUsagePage");
const TenantAuditPage   = lazyPage(() => import("./pages/tenant/AuditPage"),      "TenantAuditPage");
const TenantSettingsPage = lazyPage(() => import("./pages/tenant/SettingsPage"),  "TenantSettingsPage");

// ── Router ───────────────────────────────────────────────────────────────────

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
      { index: true,                 loader: () => redirect("/app/dashboard") },
      { path: "dashboard",            Component: DashboardPage       },
      { path: "projects",            Component: ProjectsPage      },
      { path: "projects/vcard-saas", Component: VCardProject      },
      { path: "projects/:slug",      Component: ProjectDetailPage },
      { path: "profile",             Component: EmployeeProfilePage },
      { path: "modules",             Component: EmployeeModulesPage },
      { path: "modules/:key",        Component: ChannelDashboardPage },
      { path: "content",             Component: ContentGenPage      },
      { path: "board",               Component: ContentBoardPage    },
      { path: "publish",             Component: SocialPublishPage   },
      { path: "campaign",            Component: CampaignPlannerPage },
      { path: "activity",            Component: ActivityFeedPage    },
      { path: "analytics",           Component: ContentAnalyticsPage },
      { path: "calendar",            Component: ContentCalendarPage  },
      { path: "*",                   loader: () => redirect("/app/dashboard") },
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
      { path: "inbox",     Component: InboxPage         },
      { path: "*",         loader: () => redirect("/super/requests") },
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
      { path: "*",         loader: () => redirect("/tenant/overview") },
    ],
  },

  // ── 404 Not Found page ──────────────────────────────────────────────────────
  { path: "*", Component: NotFoundPage },
]);