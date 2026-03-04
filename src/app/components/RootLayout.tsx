/**
 * RootLayout — Employee Portal Shell
 * ────────────────────────────────────────────────────────────────────────────
 * Auth-guarded wrapper for the employee portal (/app/*).
 *
 * - If no session and still loading → shows a branded loading spinner
 * - If no session after load → redirects to /login
 * - Otherwise → renders the child page via <Outlet />
 *
 * WCAG 2.1 AA: includes a skip-nav link so keyboard users can bypass
 * the navigation bar and jump straight to the main page content.
 *
 * Each child page owns its own BackgroundLayout so we never
 * double-render the animated background.
 */

import { Outlet, Navigate } from 'react-router';
import { useAuth } from './AuthContext';
import { Loader2 } from 'lucide-react';

export function RootLayout() {
  const { user, sessionLoading } = useAuth();

  // Session recovery still in progress — show branded spinner
  if (sessionLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white gap-4"
        role="status"
        aria-label="Loading session"
      >
        <Loader2 className="w-8 h-8 animate-spin text-[#0BA4AA]" />
        <p className="text-white/40 text-sm">Loading your workspace...</p>
      </div>
    );
  }

  // No authenticated user — redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {/*
       * WCAG 2.1 AA — Skip Navigation Link (Success Criterion 2.4.1)
       * Visually hidden until focused; allows keyboard/screen-reader users
       * to skip the repeated navigation bar and jump to the main content.
       */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold focus:text-white focus:no-underline"
        style={{ background: '#0BA4AA' }}
      >
        Skip to main content
      </a>

      {/* Each child page renders its own BackgroundLayout + EmployeeNav */}
      <Outlet />
    </>
  );
}
