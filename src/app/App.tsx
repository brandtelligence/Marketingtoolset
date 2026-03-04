import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './components/AuthContext';
import { ProjectsProvider } from './contexts/ProjectsContext';
import { ContentProvider } from './contexts/ContentContext';
import { DashboardThemeProvider } from './components/saas/DashboardThemeContext';
import { WebThemeProvider } from './contexts/WebThemeContext';
import { ThemedToaster } from './components/ThemedToaster';
import { ErrorBoundary } from './components/ErrorBoundary';

// Gate 4 — start collecting Core Web Vitals on app load (logs to DevTools Console)
try {
  import('./utils/webVitals').then(({ reportWebVitals }) => {
    reportWebVitals();
  }).catch(() => {
    // Non-critical — never let vitals crash the app
  });
} catch {
  // Ignore
}

// Global unhandled error + rejection logging (helps diagnose blank screens)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    console.error('[Global] Uncaught error:', e.error ?? e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[Global] Unhandled promise rejection:', e.reason);
  });
}

export default function App() {
  return (
    <ErrorBoundary>
      <WebThemeProvider>
        <AuthProvider>
          <ProjectsProvider>
            <ContentProvider>
              <DashboardThemeProvider>
                <RouterProvider router={router} />
                <ThemedToaster />
              </DashboardThemeProvider>
            </ContentProvider>
          </ProjectsProvider>
        </AuthProvider>
      </WebThemeProvider>
    </ErrorBoundary>
  );
}
