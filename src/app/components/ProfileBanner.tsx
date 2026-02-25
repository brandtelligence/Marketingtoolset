import { motion } from 'motion/react';
import { Mail, Building2, Briefcase, CalendarDays } from 'lucide-react';
import { useAuth } from './AuthContext';

export function ProfileBanner() {
  const { user } = useAuth();

  if (!user) return null;

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
    </motion.div>
  );
}
