/**
 * EmployeeNav
 * ─────────────────────────────────────────────────────────────────────────────
 * Glassmorphism top navigation bar for the employee portal (/app/*).
 * Rendered by RootLayout so it appears on Projects, Profile, and Modules pages.
 *
 * Links:
 *   📂 Projects  →  /app/projects
 *   🧩 Modules   →  /app/modules
 *   👤 Profile   →  /app/profile
 *
 * Responsive: collapses to icon-only on very small screens, full labels on sm+.
 */

import { NavLink, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { FolderKanban, Puzzle, UserCircle, LogOut } from 'lucide-react';
import brandLogo from 'figma:asset/250842c5232a8611aa522e6a3530258e858657d5.png';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { path: '/app/projects', label: 'Projects', icon: <FolderKanban className="w-4 h-4" /> },
  { path: '/app/modules',  label: 'My Modules', icon: <Puzzle className="w-4 h-4" /> },
  { path: '/app/profile',  label: 'My Profile', icon: <UserCircle className="w-4 h-4" /> },
];

export function EmployeeNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login');
  };

  const linkCls = (isActive: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-white/20 text-white border border-white/30'
        : 'text-white/70 hover:text-white hover:bg-white/10'
    }`;

  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-40 w-full"
    >
      <div
        className="backdrop-blur-xl border-b border-white/15 px-4 py-2.5"
        style={{ background: 'rgba(11,164,170,0.08)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          {/* Logo */}
          <img src={brandLogo} alt="Brandtelligence" className="h-6 w-auto shrink-0" />

          {/* Divider */}
          <div className="w-px h-5 bg-white/20 shrink-0" />

          {/* Nav links */}
          <div className="flex items-center gap-1 flex-1">
            {NAV_ITEMS.map(item => (
              <NavLink key={item.path} to={item.path}>
                {({ isActive }) => (
                  <span className={linkCls(isActive)}>
                    {item.icon}
                    <span className="hidden sm:inline">{item.label}</span>
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          {/* Right: user avatar + sign out */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <img
                src={user.profileImage}
                alt={user.firstName}
                className="w-7 h-7 rounded-full border border-white/30 object-cover"
              />
              <span className="text-white/80 text-sm font-medium">{user.firstName}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
