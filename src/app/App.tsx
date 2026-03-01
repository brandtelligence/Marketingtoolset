import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './components/AuthContext';
import { ProjectsProvider } from './contexts/ProjectsContext';
import { ContentProvider } from './contexts/ContentContext';
import { DashboardThemeProvider } from './components/saas/DashboardThemeContext';
import { WebThemeProvider } from './contexts/WebThemeContext';
import { ThemedToaster } from './components/ThemedToaster';
import { ErrorBoundary } from './components/ErrorBoundary';

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