import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './components/AuthContext';
import { ProjectsProvider } from './contexts/ProjectsContext';
import { ContentProvider } from './contexts/ContentContext';
import { DashboardThemeProvider } from './components/saas/DashboardThemeContext';
import { WebThemeProvider } from './contexts/WebThemeContext';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <WebThemeProvider>
      <AuthProvider>
        <ProjectsProvider>
          <ContentProvider>
            <DashboardThemeProvider>
              <RouterProvider router={router} />
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: 'rgba(15, 10, 40, 0.92)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                  },
                }}
              />
            </DashboardThemeProvider>
          </ContentProvider>
        </ProjectsProvider>
      </AuthProvider>
    </WebThemeProvider>
  );
}