import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ── Theme token types ──────────────────────────────────────────────────────────

export interface DashboardThemeTokens {
  isDark: boolean;
  // Page
  pageBg: string;
  // Surfaces
  s0: string;   // lowest surface (bg-white/5 → bg-white)
  s1: string;   // medium surface (bg-white/10 → bg-gray-100)
  // Borders
  border: string;
  borderMd: string;
  // Text
  text: string;
  textSm: string;
  textMd: string;
  textFaint: string;
  // Interactive
  hover: string;
  hoverBorder: string;
  // Input / Select class bundle
  inputCls: string;
  selectCls: string;
  // Sidebar
  sidebarBg: string;
  sidebarBorder: string;
  collapseBg: string;
  mobileSidebarBg: string;
  // Table
  theadBg: string;
  theadText: string;
  trBorder: string;
  trHover: string;
  tableBorder: string;
  // Nav accents
  navActive: (accent: 'purple' | 'teal') => string;
  navHover:  (accent: 'purple' | 'teal') => string;
  navInactive: string;
  navBadgeDot: (accent: 'purple' | 'teal') => string;
  // Tab bar
  tabBg: string;
  tabActive: string;
  tabInactive: string;
  // Charts (JS values for recharts)
  chart: {
    tooltipBg: string;
    tooltipBorder: string;
    tooltipColor: string;
    gridStroke: string;
    tickFill: string;
    tickFillAlt: string;
    legendColor: string;
    optionBg: string;   // for <option> bg color
  };
}

const DARK: DashboardThemeTokens = {
  isDark: true,
  pageBg: 'bg-[#0a0615]',
  s0: 'bg-white/5',
  s1: 'bg-white/10',
  border: 'border-white/10',
  borderMd: 'border-white/20',
  text: 'text-white',
  textSm: 'text-white/80',
  textMd: 'text-white/60',
  textFaint: 'text-white/40',
  hover: 'hover:bg-white/10',
  hoverBorder: 'hover:border-white/20',
  inputCls: 'bg-white/10 border-white/15 text-white placeholder-white/40 focus:border-purple-400/50 focus:outline-none',
  selectCls: 'bg-white/10 border-white/15 text-white focus:border-purple-400/50 focus:outline-none',
  sidebarBg: 'bg-white/5',
  sidebarBorder: 'border-white/10',
  collapseBg: 'bg-[#1a0f35] border-white/20 hover:bg-white/20',
  mobileSidebarBg: 'bg-[rgba(10,6,21,0.98)]',
  theadBg: 'bg-white/5',
  theadText: 'text-white/60',
  trBorder: 'border-white/5',
  trHover: 'hover:bg-white/5',
  tableBorder: 'border-white/10',
  navActive: (a) => a === 'teal'
    ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
    : 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  navHover: (a) => a === 'teal'
    ? 'hover:bg-teal-500/10 hover:text-teal-200'
    : 'hover:bg-purple-500/10 hover:text-purple-200',
  navInactive: 'text-white/60',
  navBadgeDot: (a) => a === 'teal' ? 'bg-teal-400 text-black/80' : 'bg-purple-400 text-black/80',
  tabBg: 'bg-white/5',
  tabActive: 'bg-purple-500/30 text-purple-300',
  tabInactive: 'text-white/50 hover:text-white/80',
  chart: {
    tooltipBg: 'rgba(15,10,40,0.95)',
    tooltipBorder: '1px solid rgba(255,255,255,0.1)',
    tooltipColor: '#fff',
    gridStroke: 'rgba(255,255,255,0.05)',
    tickFill: 'rgba(255,255,255,0.4)',
    tickFillAlt: 'rgba(255,255,255,0.6)',
    legendColor: 'rgba(255,255,255,0.6)',
    optionBg: '#1a0f35',
  },
};

const LIGHT: DashboardThemeTokens = {
  isDark: false,
  pageBg: 'bg-gray-50',
  s0: 'bg-white',
  s1: 'bg-gray-100',
  border: 'border-gray-200',
  borderMd: 'border-gray-300',
  text: 'text-gray-900',
  textSm: 'text-gray-700',
  textMd: 'text-gray-500',
  textFaint: 'text-gray-400',
  hover: 'hover:bg-gray-100',
  hoverBorder: 'hover:border-gray-300',
  inputCls: 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none',
  selectCls: 'bg-white border-gray-300 text-gray-900 focus:border-purple-500 focus:outline-none',
  sidebarBg: 'bg-white',
  sidebarBorder: 'border-gray-200',
  collapseBg: 'bg-white border-gray-300 hover:bg-gray-100',
  mobileSidebarBg: 'bg-white',
  theadBg: 'bg-gray-50',
  theadText: 'text-gray-500',
  trBorder: 'border-gray-100',
  trHover: 'hover:bg-gray-50',
  tableBorder: 'border-gray-200',
  navActive: (a) => a === 'teal'
    ? 'bg-teal-50 text-teal-700 border-teal-200'
    : 'bg-purple-50 text-purple-700 border-purple-200',
  navHover: (a) => a === 'teal'
    ? 'hover:bg-teal-50 hover:text-teal-700'
    : 'hover:bg-purple-50 hover:text-purple-700',
  navInactive: 'text-gray-600',
  navBadgeDot: (a) => a === 'teal' ? 'bg-teal-500 text-white' : 'bg-purple-500 text-white',
  tabBg: 'bg-gray-100',
  tabActive: 'bg-white text-purple-700 shadow-sm',
  tabInactive: 'text-gray-500 hover:text-gray-700',
  chart: {
    tooltipBg: 'rgba(255,255,255,0.98)',
    tooltipBorder: '1px solid rgba(0,0,0,0.1)',
    tooltipColor: '#1f2937',
    gridStroke: 'rgba(0,0,0,0.06)',
    tickFill: 'rgba(0,0,0,0.45)',
    tickFillAlt: 'rgba(0,0,0,0.65)',
    legendColor: 'rgba(0,0,0,0.6)',
    optionBg: '#ffffff',
  },
};

// ── Context & Provider ─────────────────────────────────────────────────────────

interface DashboardThemeCtx extends DashboardThemeTokens {
  toggleTheme: () => void;
}

const Ctx = createContext<DashboardThemeCtx>({ ...DARK, toggleTheme: () => {} });

export function DashboardThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('dashboard-theme');
      return saved !== null ? saved === 'dark' : false; // default → light
    } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('dashboard-theme', isDark ? 'dark' : 'light'); }
    catch { /* ignore */ }
  }, [isDark]);

  const tokens = isDark ? DARK : LIGHT;

  return (
    <Ctx.Provider value={{ ...tokens, toggleTheme: () => setIsDark(v => !v) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDashboardTheme(): DashboardThemeCtx {
  return useContext(Ctx);
}