/**
 * employeeTheme.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared CSS class factories for the employee portal.
 * Accepts an `isDark` boolean from DashboardThemeContext and returns
 * the appropriate glassmorphism / surface / text classes.
 *
 * USAGE:
 *   const { isDark } = useDashboardTheme();
 *   const et = employeeTheme(isDark);
 *   <div className={et.glass}> ... </div>
 */

export interface EmployeeThemeTokens {
  /** Primary glass card: blurred semi-transparent surface */
  glass: string;
  /** Inner surface (e.g. inside a glass card) */
  glassInner: string;
  /** Text input */
  inputCls: string;
  /** Select dropdown */
  selectCls: string;
  /** Primary text */
  text: string;
  /** Secondary text (e.g. descriptions) */
  textSm: string;
  /** Muted text */
  textMd: string;
  /** Faint text (placeholders, hints) */
  textFaint: string;
  /** Surface background (cards, panels) */
  surface: string;
  /** Higher surface */
  surfaceAlt: string;
  /** Standard border */
  border: string;
  /** Heavier border */
  borderMd: string;
  /** Hover background */
  hover: string;
  /** Divider class */
  divider: string;
  /** Theme flag */
  isDark: boolean;
}

export function employeeTheme(isDark: boolean): EmployeeThemeTokens {
  if (isDark) {
    return {
      isDark: true,
      glass:      'backdrop-blur-xl bg-white/8 border border-white/15 rounded-2xl',
      glassInner: 'bg-white/5 border border-white/10 rounded-xl',
      inputCls:   'w-full bg-white/8 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#0BA4AA]/60 focus:bg-white/10 transition-all',
      selectCls:  'w-full bg-white/8 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#0BA4AA]/60 focus:bg-white/10 transition-all appearance-none',
      text:       'text-white',
      textSm:     'text-white/80',
      textMd:     'text-white/60',
      textFaint:  'text-white/40',
      surface:    'bg-white/5',
      surfaceAlt: 'bg-white/10',
      border:     'border-white/10',
      borderMd:   'border-white/15',
      hover:      'hover:bg-white/10',
      divider:    'bg-white/20',
    };
  }
  return {
    isDark: false,
    glass:      'backdrop-blur-xl bg-white/80 border border-gray-200/60 rounded-2xl shadow-sm',
    glassInner: 'bg-gray-50/80 border border-gray-200/50 rounded-xl',
    inputCls:   'w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0BA4AA]/60 focus:ring-2 focus:ring-[#0BA4AA]/15 transition-all',
    selectCls:  'w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#0BA4AA]/60 focus:ring-2 focus:ring-[#0BA4AA]/15 transition-all appearance-none',
    text:       'text-gray-900',
    textSm:     'text-gray-700',
    textMd:     'text-gray-500',
    textFaint:  'text-gray-400',
    surface:    'bg-white',
    surfaceAlt: 'bg-gray-100',
    border:     'border-gray-200',
    borderMd:   'border-gray-300',
    hover:      'hover:bg-gray-100',
    divider:    'bg-gray-300',
  };
}
