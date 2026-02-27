import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Mail, Building2, Briefcase, CalendarDays, Clock, AlertTriangle, Zap } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useContent } from '../contexts/ContentContext';
import { availableTeamMembers } from '../contexts/ProjectsContext';

// ─── Date helper (local calendar, not UTC) ────────────────────────────────────
function getLocalDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const TODAY_BANNER = getLocalDateString();

// ─── ProfileBanner ────────────────────────────────────────────────────────────

export function ProfileBanner() {
  const { user }   = useAuth();
  const { cards }  = useContent();

  if (!user) return null;

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });

  // ── Global notification counts (all projects) ─────────────────────────────
  const { myPendingCount, dueTodayCount, overdueCount } = useMemo(() => {
    const myPending = cards.filter(c =>
      c.status === 'pending_approval' &&
      c.approvers.some(appId => {
        const member = availableTeamMembers.find(m => m.id === appId);
        return member &&
          member.firstName.toLowerCase() === user.firstName.toLowerCase() &&
          member.lastName.toLowerCase()  === user.lastName.toLowerCase();
      })
    ).length;

    const dueToday = cards.filter(c =>
      c.status === 'scheduled' && c.scheduledDate === TODAY_BANNER
    ).length;

    const overdue = cards.filter(c =>
      c.status === 'scheduled' &&
      c.scheduledDate !== undefined &&
      c.scheduledDate < TODAY_BANNER
    ).length;

    return { myPendingCount: myPending, dueTodayCount: dueToday, overdueCount: overdue };
  }, [cards, user]);

  const hasNotifications = myPendingCount > 0 || dueTodayCount > 0 || overdueCount > 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 md:p-5 shadow-xl h-full"
    >
      <div className="flex items-center gap-4">
        {/* Profile Image */}
        <div className="shrink-0">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-white/40 shadow-lg overflow-hidden">
            <img
              src={user.profileImage}
              alt={`${user.firstName} ${user.lastName}`}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base md:text-lg truncate">
            {user.firstName} {user.lastName}
          </h3>
          <div className="flex items-center gap-1.5 text-white/70 text-xs">
            <Briefcase className="w-3 h-3 shrink-0" />
            <span className="truncate">{user.jobTitle}</span>
          </div>
        </div>
      </div>

      {/* Details row */}
      <div className="mt-3 pt-3 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-white/70">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3 h-3 shrink-0" />
          <span className="truncate">{user.company}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Mail className="w-3 h-3 shrink-0" />
          <span className="truncate">{user.email}</span>
        </div>
        <div className="flex items-center gap-1.5 sm:col-span-2">
          <CalendarDays className="w-3 h-3 shrink-0" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* ── Notification badges (content action items) ── */}
      {hasNotifications && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2"
        >
          {/* Pending approvals */}
          {myPendingCount > 0 && (
            <span className="flex items-center gap-1.5 bg-amber-500/12 border border-amber-400/25 text-amber-300 text-[10px] font-semibold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <Clock className="w-3 h-3 shrink-0" />
              {myPendingCount} pending approval{myPendingCount !== 1 ? 's' : ''}
            </span>
          )}

          {/* Overdue posts */}
          {overdueCount > 0 && (
            <span className="flex items-center gap-1.5 bg-orange-500/12 border border-orange-400/25 text-orange-300 text-[10px] font-semibold px-2.5 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {overdueCount} overdue post{overdueCount !== 1 ? 's' : ''}
            </span>
          )}

          {/* Due today */}
          {dueTodayCount > 0 && (
            <span className="flex items-center gap-1.5 bg-green-500/12 border border-green-400/25 text-green-300 text-[10px] font-semibold px-2.5 py-1 rounded-full animate-pulse">
              <Zap className="w-3 h-3 shrink-0" />
              {dueTodayCount} due today
            </span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
