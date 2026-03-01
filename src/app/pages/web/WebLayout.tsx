/**
 * WebLayout — Shared layout for all public marketing website pages.
 * Wraps WebNav + page content + WebFooter.
 * Applies `web-light` (light mode) or `dark` (dark mode) to the root wrapper
 * so that:
 *   • web-light.css overrides flip Tailwind colour utilities to light-on-white
 *   • Tailwind dark: variants in WebNav / WebFooter activate in dark mode
 */
import { Outlet, ScrollRestoration } from 'react-router';
import { WebNav } from '../../components/website/WebNav';
import { WebFooter } from '../../components/website/WebFooter';
import { useWebTheme } from '../../contexts/WebThemeContext';

export function WebLayout() {
  const { isDark } = useWebTheme();

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
      <main id="main-content">
        <Outlet />
      </main>
      <WebFooter />
      <ScrollRestoration />
    </div>
  );
}