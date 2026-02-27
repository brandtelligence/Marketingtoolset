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
      <WebNav />
      <main>
        <Outlet />
      </main>
      <WebFooter />
      <ScrollRestoration />
    </div>
  );
}
