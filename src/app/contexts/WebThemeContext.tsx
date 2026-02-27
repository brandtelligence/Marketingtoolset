/**
 * WebThemeContext — light / dark mode for the public marketing website.
 * Defaults to 'light'. Persisted to localStorage as 'bt-web-theme'.
 * The 'dark' class on the WebLayout wrapper activates Tailwind dark: variants.
 */
import { createContext, useContext, useEffect, useState } from 'react';

export type WebTheme = 'light' | 'dark';

interface WebThemeCtx {
  theme: WebTheme;
  isDark: boolean;
  toggleTheme: () => void;
}

const WebThemeContext = createContext<WebThemeCtx>({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
});

export function WebThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<WebTheme>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('bt-web-theme') as WebTheme | null;
    if (stored === 'light' || stored === 'dark') return stored;
    // Honour OS preference on first visit, but default to light
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const toggleTheme = () =>
    setTheme(t => {
      const next: WebTheme = t === 'light' ? 'dark' : 'light';
      localStorage.setItem('bt-web-theme', next);
      return next;
    });

  return (
    <WebThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </WebThemeContext.Provider>
  );
}

export const useWebTheme = () => useContext(WebThemeContext);
