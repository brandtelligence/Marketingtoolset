import { Toaster } from 'sonner';
import { useDashboardTheme } from './saas/DashboardThemeContext';

export function ThemedToaster() {
  const { isDark } = useDashboardTheme();

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: isDark
          ? {
              background: 'rgba(15, 10, 40, 0.92)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
            }
          : {
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(0,0,0,0.08)',
              color: '#1f2937',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            },
      }}
    />
  );
}
