/**
 * NotFoundPage — 404 catch-all
 * Shows a branded 404 message with navigation options.
 */

import { Link, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Home, ArrowLeft, Search } from 'lucide-react';

export function NotFoundPage() {
  const location = useLocation();

  // Determine the most likely portal the user was trying to reach
  const isAppPath = location.pathname.startsWith('/app');
  const isSuperPath = location.pathname.startsWith('/super');
  const isTenantPath = location.pathname.startsWith('/tenant');

  const homeLink = isSuperPath ? '/super/requests'
    : isTenantPath ? '/tenant/overview'
    : isAppPath ? '/app/projects'
    : '/';

  const homeLabel = isSuperPath ? 'Super Admin Dashboard'
    : isTenantPath ? 'Tenant Dashboard'
    : isAppPath ? 'Employee Portal'
    : 'Home';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md mx-auto"
      >
        {/* 404 graphic */}
        <div className="relative mb-8">
          <span className="text-[8rem] font-black leading-none bg-gradient-to-br from-purple-400 via-teal-400 to-purple-600 bg-clip-text text-transparent select-none">
            404
          </span>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            className="absolute top-4 right-4"
          >
            <Search className="w-10 h-10 text-purple-400/40" />
          </motion.div>
        </div>

        <h1 className="text-2xl font-bold mb-3">Page not found</h1>
        <p className="text-white/50 mb-8 text-sm leading-relaxed">
          The page <code className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-xs font-mono">{location.pathname}</code> doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to={homeLink}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all"
          >
            <Home className="w-4 h-4" />
            {homeLabel}
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white/70 font-medium text-sm hover:bg-white/15 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>
        </div>

        <p className="mt-10 text-white/25 text-xs">
          Brandtelligence Platform
        </p>
      </motion.div>
    </div>
  );
}
