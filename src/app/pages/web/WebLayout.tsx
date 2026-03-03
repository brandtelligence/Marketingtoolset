/**
 * WebLayout — Shared layout for all public marketing website pages.
 * Wraps WebNav + page content + WebFooter.
 * Applies `web-light` (light mode) or `dark` (dark mode) to the root wrapper
 * so that:
 *   • web-light.css overrides flip Tailwind colour utilities to light-on-white
 *   • Tailwind dark: variants in WebNav / WebFooter activate in dark mode
 *
 * SEO: Injects sitewide Organization + WebSite JSON-LD schema on mount.
 * Page-level meta (title, description, canonical, OG, Twitter, page schema)
 * is managed by useSEO() in each individual page component.
 */
import { useEffect } from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { WebNav } from '../../components/website/WebNav';
import { WebFooter } from '../../components/website/WebFooter';
import { useWebTheme } from '../../contexts/WebThemeContext';
import { ORGANIZATION_SCHEMA, WEBSITE_SCHEMA } from '../../hooks/useSEO';

export function WebLayout() {
  const { isDark } = useWebTheme();

  /* ── Inject sitewide structured data once on mount ──────────────────────── */
  useEffect(() => {
    const inject = (id: string, data: Record<string, unknown>) => {
      let el = document.getElementById(id) as HTMLScriptElement | null;
      if (!el) {
        el = document.createElement('script');
        el.type = 'application/ld+json';
        el.id   = id;
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(data, null, 0);
    };
    inject('ld-json-organization', ORGANIZATION_SCHEMA);
    inject('ld-json-website',      WEBSITE_SCHEMA);

    /* Set core meta charset + viewport if not already present (should be in HTML) */
    if (!document.querySelector('meta[charset]')) {
      const charset = document.createElement('meta');
      charset.setAttribute('charset', 'utf-8');
      document.head.prepend(charset);
    }
    if (!document.querySelector('meta[name="viewport"]')) {
      const vp = document.createElement('meta');
      vp.setAttribute('name', 'viewport');
      vp.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
      document.head.appendChild(vp);
    }
    /* Theme colour hint for mobile browsers */
    if (!document.querySelector('meta[name="theme-color"]')) {
      const tc = document.createElement('meta');
      tc.setAttribute('name', 'theme-color');
      tc.setAttribute('content', '#0BA4AA');
      document.head.appendChild(tc);
    }

    return () => {
      document.getElementById('ld-json-organization')?.remove();
      document.getElementById('ld-json-website')?.remove();
    };
  }, []);

  return (
    <div
      className={`min-h-screen overflow-x-hidden transition-colors duration-300 ${
        isDark ? 'dark bg-[#06070f]' : 'web-light bg-[#f8f9fc]'
      }`}
    >
      {/* WCAG 2.1 skip-to-content link — visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-white focus:text-gray-900 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      <WebNav />

      {/* role="main" is redundant with <main> but kept for legacy AT compat */}
      <main id="main-content" role="main">
        <Outlet />
      </main>

      <WebFooter />
      <ScrollRestoration />
    </div>
  );
}