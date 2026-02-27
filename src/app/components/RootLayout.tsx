/**
 * RootLayout — Employee Portal Shell
 * ────────────────────────────────────────────────────────────────────────────
 * Thin wrapper: each child page owns its BackgroundLayout so we never
 * double-render the animated background. The EmployeeNav is rendered
 * INSIDE BackgroundLayout by each page.
 */

import { Outlet } from 'react-router';

export function RootLayout() {
  return <Outlet />;
}
