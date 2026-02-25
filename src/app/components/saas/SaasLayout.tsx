import { useState, ReactNode } from 'react';
import brandLogo from 'figma:asset/250842c5232a8611aa522e6a3530258e858657d5.png';
import { NavLink, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, ChevronLeft, ChevronRight, Menu, ShieldAlert, Sun, Moon, FlaskConical } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { RoleBadge } from './StatusBadge';
import { useDashboardTheme } from './DashboardThemeContext';
import { NotificationsPanel } from './NotificationsPanel';
import { toast } from 'sonner';
import { SHOW_DEMO_RIBBON } from '../../config/appConfig';

export interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
  badge?: string | number;
}

interface SaasLayoutProps {
  navItems: NavItem[];
  children: ReactNode;
  accentColor?: 'purple' | 'teal';
  /** shown when super admin is impersonating */
  impersonatingTenant?: string | null;
  onExitImpersonation?: () => void;
}

export function SaasLayout({ navItems, children, accentColor = 'purple', impersonatingTenant, onExitImpersonation }: SaasLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const t = useDashboardTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  // ── Theme toggle pill ──────────────────────────────────────────────────────
  const ThemeToggle = () => (
    <div className="flex items-center gap-1.5">
      <Sun className={`w-3.5 h-3.5 transition-colors ${!t.isDark ? 'text-amber-500' : t.isDark ? 'text-white/25' : 'text-gray-300'}`} />
      <button
        onClick={t.toggleTheme}
        title={t.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`relative w-9 h-5 rounded-full transition-colors duration-300 focus:outline-none ${
          t.isDark ? 'bg-purple-600' : 'bg-amber-400'
        }`}
      >
        <motion.span
          animate={{ x: t.isDark ? 18 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md block"
        />
      </button>
      <Moon className={`w-3.5 h-3.5 transition-colors ${t.isDark ? 'text-purple-300' : 'text-gray-300'}`} />
    </div>
  );

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b ${t.border} ${collapsed ? 'justify-center' : ''}`}>
        {collapsed ? (
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <img src={brandLogo} alt="Brandtelligence" className="w-8 h-8 object-contain" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col gap-1"
          >
            <img src={brandLogo} alt="Brandtelligence" className="h-8 w-auto max-w-[148px] object-contain object-left" />
            <p className={`${t.textFaint} text-[0.65rem] pl-0.5`}>
              {user?.role === 'SUPER_ADMIN' ? 'Platform Control' : user?.tenantName ?? 'Tenant Portal'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all border ${
                isActive
                  ? `${t.navActive(accentColor)} border`
                  : `${t.navInactive} border-transparent ${t.navHover(accentColor)}`
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <span className="w-5 h-5 shrink-0">{item.icon}</span>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap flex-1"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {!collapsed && item.badge && (
              <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold ${t.navBadgeDot(accentColor)}`}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className={`border-t ${t.border} p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed ? (
          <div className={`flex items-center gap-3 px-2 py-2 rounded-xl ${t.hover} transition-colors group`}>
            {/* Avatar with online indicator */}
            <div className="relative shrink-0">
              <img
                src={user?.profileImage ?? `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=6366f1&color=fff`}
                alt={user?.firstName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-offset-1 ring-indigo-400/40"
                style={{ ringOffsetColor: t.isDark ? '#1e1b2e' : '#f9fafb' }}
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-gray-900 ring-1 ring-emerald-300/50" />
            </div>

            {/* Name + badge */}
            <div className="flex-1 min-w-0">
              <p className={`${t.text} text-sm font-semibold truncate leading-tight`}>
                {user?.firstName} {user?.lastName}
              </p>
              <div className="mt-0.5">
                <span className={`text-[0.65rem] font-medium tracking-wide ${t.textFaint}`}>
                  {{
                    SUPER_ADMIN:  'Super Admin',
                    TENANT_ADMIN: 'Tenant Admin',
                    EMPLOYEE:     'Employee',
                  }[user?.role ?? ''] ?? user?.role}
                </span>
              </div>
            </div>

            {/* Sign-out button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-400 transition-all opacity-0 group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-500"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className={`p-2 rounded-lg ${t.hover} ${t.textMd} transition-colors`}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  // ── Page background ────────────────────────────────────────────────────────
  const bgStyle = t.isDark
    ? { backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(120,40,200,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(0,200,180,0.07) 0%, transparent 50%)' }
    : {};

  return (
    <div className={`min-h-screen flex flex-col ${t.pageBg} ${t.text}`} style={bgStyle}>

      {/* ── Demo Mode Ribbon (ONLY shown in demo mode; hidden in production) ── */}
      {SHOW_DEMO_RIBBON && (
        <div
          className="w-full flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold shrink-0 z-50"
          style={{
            background: 'linear-gradient(90deg, #3E3C70 0%, #2d2b55 50%, #3E3C70 100%)',
            borderBottom: '1px solid #0BA4AA40',
          }}
        >
          <FlaskConical className="w-3 h-3 shrink-0" style={{ color: '#0BA4AA' }} />
          <span className="text-white/70">
            Demo Mode —{' '}
            <span style={{ color: '#0BA4AA' }}>mock data active</span>
            {' '}· No real data is stored · Set{' '}
            <code className="font-mono text-[0.65rem] bg-white/10 px-1 py-0.5 rounded">VITE_APP_ENV=production</code>
            {' '}to connect Supabase
          </span>
          <span
            className="ml-2 px-2 py-0.5 rounded-full text-[0.6rem] font-bold border"
            style={{ background: '#F47A2020', borderColor: '#F47A2060', color: '#F47A20' }}
          >
            DEMO
          </span>
        </div>
      )}

      <div className="flex flex-1 min-h-0">

        {/* Desktop Sidebar */}
        <motion.aside
          animate={{ width: collapsed ? 64 : 220 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`hidden md:flex flex-col shrink-0 border-r ${t.sidebarBorder} ${t.sidebarBg} backdrop-blur-md relative`}
        >
          <SidebarContent />
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`absolute -right-3 top-20 w-6 h-6 rounded-full border flex items-center justify-center z-10 transition-colors ${t.collapseBg}`}
          >
            {collapsed
              ? <ChevronRight className={`w-3 h-3 ${t.textMd}`} />
              : <ChevronLeft  className={`w-3 h-3 ${t.textMd}`} />}
          </button>
        </motion.aside>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50 md:hidden"
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                initial={{ x: -220 }} animate={{ x: 0 }} exit={{ x: -220 }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className={`fixed left-0 top-0 bottom-0 w-[220px] z-50 flex flex-col border-r ${t.sidebarBorder} ${t.mobileSidebarBg} md:hidden`}
              >
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Top bar */}
          <header className={`h-14 flex items-center gap-3 px-4 sm:px-6 border-b ${t.sidebarBorder} ${t.sidebarBg} backdrop-blur-md shrink-0`}>
            <button
              onClick={() => setMobileOpen(true)}
              className={`md:hidden p-2 rounded-lg ${t.hover} ${t.textMd} transition-colors`}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Impersonation banner */}
            {impersonatingTenant && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-600 text-xs font-medium">
                <ShieldAlert className="w-4 h-4" />
                Impersonating: {impersonatingTenant}
                <button onClick={onExitImpersonation} className="ml-2 underline hover:no-underline">Exit</button>
              </div>
            )}

            <div className="flex-1" />

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <NotificationsPanel />
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

// ── Page header ────────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string; subtitle?: string; actions?: ReactNode;
  breadcrumb?: { label: string; path?: string }[];
}
export function PageHeader({ title, subtitle, actions, breadcrumb }: PageHeaderProps) {
  const t = useDashboardTheme();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        {breadcrumb && (
          <p className={`${t.textFaint} text-xs mb-1`}>
            {breadcrumb.map((b, i) => (
              <span key={i}>{i > 0 && <span className="mx-1.5">/</span>}{b.label}</span>
            ))}
          </p>
        )}
        <h1 className={`${t.text} font-bold`} style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)' }}>{title}</h1>
        {subtitle && <p className={`${t.textMd} text-sm mt-0.5`}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
interface StatCardProps { label: string; value: string | number; delta?: string; icon?: ReactNode; color?: string; }
export function StatCard({ label, value, delta, icon, color = 'purple' }: StatCardProps) {
  const t = useDashboardTheme();
  const colorMap: Record<string, { dark: string; light: string }> = {
    purple:  { dark: 'from-purple-500/20  to-purple-600/10  border-purple-500/20',  light: 'from-purple-50  to-purple-100/60  border-purple-200'  },
    teal:    { dark: 'from-teal-500/20    to-teal-600/10    border-teal-500/20',    light: 'from-teal-50    to-teal-100/60    border-teal-200'    },
    orange:  { dark: 'from-orange-500/20  to-orange-600/10  border-orange-500/20',  light: 'from-orange-50  to-orange-100/60  border-orange-200'  },
    red:     { dark: 'from-red-500/20     to-red-600/10     border-red-500/20',     light: 'from-red-50     to-red-100/60     border-red-200'     },
    emerald: { dark: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20', light: 'from-emerald-50 to-emerald-100/60 border-emerald-200' },
    sky:     { dark: 'from-sky-500/20     to-sky-600/10     border-sky-500/20',     light: 'from-sky-50     to-sky-100/60     border-sky-200'     },
  };
  const c = (colorMap[color] ?? colorMap.purple)[t.isDark ? 'dark' : 'light'];
  return (
    <div className={`bg-gradient-to-br ${c} border rounded-2xl p-5`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className={`${t.textMd} text-xs font-medium uppercase tracking-wider`}>{label}</p>
          <p className={`${t.text} font-bold mt-1`} style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>{value}</p>
          {delta && <p className={`${t.textFaint} text-xs mt-1`}>{delta}</p>}
        </div>
        {icon && <div className={`${t.textFaint} shrink-0`}>{icon}</div>}
      </div>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────────────────
export function Card({ title, children, actions, className }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  const t = useDashboardTheme();
  return (
    <div className={`${t.s0} border ${t.border} rounded-2xl ${className ?? ''}`}>
      {title && (
        <div className={`flex items-center justify-between px-5 pt-5 pb-4 border-b ${t.border}`}>
          <h2 className={`${t.text} font-semibold text-sm`}>{title}</h2>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Primary button ─────────────────────────────────────────────────────────────
export function PrimaryBtn({ children, onClick, disabled, loading, variant = 'primary', size = 'md', className = '', type = 'button' }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean;
  variant?: 'primary' | 'danger' | 'ghost' | 'teal'; size?: 'sm' | 'md'; className?: string;
  type?: 'button' | 'submit';
}) {
  const t = useDashboardTheme();
  const v = {
    primary: 'bg-purple-500/80 hover:bg-purple-500 text-white border-purple-500/30',
    teal:    'bg-teal-500/80 hover:bg-teal-500 text-white border-teal-500/30',
    danger:  'bg-red-500/80 hover:bg-red-500 text-white border-red-500/30',
    ghost:   t.isDark
      ? 'bg-white/10 hover:bg-white/15 text-white/80 border-white/15'
      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300',
  }[variant];
  const s = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
  return (
    <button
      type={type} onClick={onClick} disabled={disabled || loading}
      className={`inline-flex items-center gap-2 rounded-lg border font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${v} ${s} ${className}`}
    >
      {loading && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
}