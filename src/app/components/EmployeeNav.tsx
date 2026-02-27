/**
 * EmployeeNav
 * ─────────────────────────────────────────────────────────────────────────────
 * Glassmorphism top navigation bar for the employee portal (/app/*).
 *
 * Links:
 *   📂 Projects  →  /app/projects
 *   ✨ AI Studio  →  /app/content
 *   🧩 Modules   →  /app/modules
 *   👤 Profile   →  /app/profile
 *
 * Approval Bell:
 *   Shows a live badge count of pending_approval content cards.
 *   Opens a mini dropdown listing each card with a deep-link to its project.
 *   Re-derives in real time whenever ContentContext.cards changes.
 */

import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderKanban, Puzzle, UserCircle, LogOut, Sparkles,
  Bell, X, ExternalLink, CheckCheck,
} from 'lucide-react';
import brandLogo from 'figma:asset/250842c5232a8611aa522e6a3530258e858657d5.png';
import { useAuth } from './AuthContext';
import { useContent } from '../contexts/ContentContext';
import { useProjects } from '../contexts/ProjectsContext';
import { toast } from 'sonner';

// ─── Platform icon map ────────────────────────────────────────────────────────

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '📘', twitter: '🐦', linkedin: '💼',
  tiktok: '🎵', youtube: '📺', general: '📄',
};

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { path: '/app/projects', label: 'Projects',   icon: <FolderKanban className="w-4 h-4" /> },
  { path: '/app/content',  label: 'AI Studio',  icon: <Sparkles className="w-4 h-4" /> },
  { path: '/app/modules',  label: 'My Modules', icon: <Puzzle className="w-4 h-4" /> },
  { path: '/app/profile',  label: 'My Profile', icon: <UserCircle className="w-4 h-4" /> },
];

// ─── ApprovalBell sub-component ───────────────────────────────────────────────

function ApprovalBell() {
  const { cards }    = useContent();
  const { projects } = useProjects();
  const navigate     = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // All pending_approval cards across all projects
  const pendingCards = cards.filter(c => c.status === 'pending_approval');
  const count        = pendingCards.length;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const goToProject = (projectSlug: string) => {
    setOpen(false);
    navigate(`/app/projects/${projectSlug}`);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        title={count > 0 ? `${count} card${count !== 1 ? 's' : ''} awaiting approval` : 'No pending approvals'}
        className={`relative p-2 rounded-lg transition-all ${
          open
            ? 'bg-[#F47A20]/15 text-[#F47A20]'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
      >
        <Bell className="w-4 h-4" />

        {/* Badge */}
        <AnimatePresence>
          {count > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-[#F47A20] rounded-full text-white text-[0.55rem] font-bold leading-none"
            >
              {count > 9 ? '9+' : count}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-white/15 shadow-2xl z-50 overflow-hidden"
            style={{ background: 'rgba(10,8,35,0.97)', backdropFilter: 'blur(20px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#F47A20]" />
                <span className="text-white font-semibold text-sm">Approval Queue</span>
                {count > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#F47A20] text-white text-[0.6rem] font-bold rounded-full">
                    {count}
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card list */}
            <div className="max-h-72 overflow-y-auto">
              {count === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 gap-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-white/60 text-sm font-medium">All caught up!</p>
                  <p className="text-white/30 text-xs text-center">No content cards are currently waiting for approval.</p>
                </div>
              ) : (
                pendingCards.slice(0, 8).map((card, i) => {
                  const project  = projects.find(p => p.id === card.projectId);
                  const slug     = project?.route.split('/').pop() ?? '';
                  const emoji    = PLATFORM_EMOJI[card.platform] ?? '📄';
                  const isLast   = i === Math.min(pendingCards.length, 8) - 1;

                  return (
                    <button
                      key={card.id}
                      onClick={() => goToProject(slug)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors group ${!isLast ? 'border-b border-white/6' : ''}`}
                    >
                      {/* Platform emoji */}
                      <span className="text-base shrink-0 mt-0.5 leading-none">{emoji}</span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white/90 text-xs font-semibold truncate leading-snug">
                          {card.title}
                        </p>
                        <p className="text-white/40 text-[11px] truncate mt-0.5">
                          {project?.name ?? 'Unknown project'}
                          {card.createdBy ? ` · by ${card.createdBy}` : ''}
                        </p>
                      </div>

                      {/* Pending badge + link icon */}
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F47A20]/15 text-[#F47A20] border border-[#F47A20]/25">
                          Pending
                        </span>
                        <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/60 transition-colors" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Overflow label */}
            {pendingCards.length > 8 && (
              <div className="px-4 py-2 border-t border-white/8 text-center">
                <span className="text-white/30 text-[11px]">
                  +{pendingCards.length - 8} more card{pendingCards.length - 8 !== 1 ? 's' : ''} not shown
                </span>
              </div>
            )}

            {/* Footer */}
            {count > 0 && (
              <div className="px-4 py-2.5 border-t border-white/8">
                <button
                  onClick={() => { setOpen(false); navigate('/app/projects'); }}
                  className="w-full text-center text-xs text-[#0BA4AA] hover:text-[#0BA4AA]/80 transition-colors py-0.5"
                >
                  View all projects →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main EmployeeNav component ───────────────────────────────────────────────

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

          {/* Right: approval bell + user avatar + sign out */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Approval bell */}
            <ApprovalBell />

            {/* Divider */}
            <div className="w-px h-5 bg-white/15 hidden sm:block" />

            {/* Avatar + name */}
            <div className="hidden sm:flex items-center gap-2">
              <img
                src={user.profileImage}
                alt={user.firstName}
                className="w-7 h-7 rounded-full border border-white/30 object-cover"
              />
              <span className="text-white/80 text-sm font-medium">{user.firstName}</span>
            </div>

            {/* Sign out */}
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