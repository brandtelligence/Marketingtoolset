import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { ArrowRight, Sparkles, TrendingUp, Clock, Layers, BadgeCheck } from 'lucide-react';
import brandtelligenceLogo from 'figma:asset/12cb08e986949f1228eef0d76d4fc7b928da05e8.png';

const STATS = [
  { value: '18', label: 'Marketing Modules', color: 'text-purple-300', bg: 'bg-purple-500/20 border-purple-500/30' },
  { value: '25+', label: 'Hrs Saved / Week', color: 'text-teal-300', bg: 'bg-teal-500/20 border-teal-500/30' },
  { value: '3×', label: 'Content Output', color: 'text-orange-300', bg: 'bg-orange-500/20 border-orange-500/30' },
  { value: 'RM 7k', label: 'Avg. Monthly Savings', color: 'text-emerald-300', bg: 'bg-emerald-500/20 border-emerald-500/30' },
];

const TRUST_BADGES = [
  { icon: BadgeCheck, label: '14-Day Free Trial', color: 'text-purple-300' },
  { icon: Layers, label: 'One Platform, All Channels', color: 'text-teal-300' },
  { icon: TrendingUp, label: 'Built for Growing Businesses', color: 'text-orange-300' },
];

export function LandingHero() {
  const navigate = useNavigate();

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-4 py-16 sm:px-6 md:px-8 lg:py-20 text-center">
      <div className="w-full max-w-6xl">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" />
          AI-Powered Marketing Command Centre for Modern Teams
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.8 }}
          className="mb-8"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="inline-block bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 border border-white/20 shadow-2xl"
          >
            <img
              src={brandtelligenceLogo}
              alt="Brandtelligence"
              className="w-full max-w-[13rem] sm:max-w-xs md:max-w-md lg:max-w-lg h-auto mx-auto"
            />
          </motion.div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-white font-bold mb-4 md:mb-5 tracking-tight"
          style={{ fontSize: 'clamp(2rem, 5.5vw, 4rem)' }}
        >
          Your Entire Marketing Stack.{' '}
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-purple-400 via-teal-400 to-orange-400 bg-clip-text text-transparent">
            One Intelligent Platform.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-white/70 mb-10 max-w-3xl mx-auto leading-relaxed"
          style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.2rem)' }}
        >
          Replace 8+ fragmented marketing tools with a single AI-powered command centre.
          Built for ambitious teams — AI content creation, social scheduling, real-time analytics,
          SEO, SEM, email, mobile, influencer management, and 10 more modules. All managed by
          your team, not an agency.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/request-access')}
            className="group relative overflow-hidden bg-gradient-to-r from-purple-500 to-teal-500 text-white px-8 py-3.5 rounded-full font-semibold shadow-xl inline-flex items-center gap-2 text-sm sm:text-base"
          >
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            />
            <span className="relative z-10">Start Your 14-Day Free Trial</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/login')}
            className="bg-white/10 backdrop-blur-md border border-white/30 text-white/90 px-8 py-3.5 rounded-full font-medium text-sm sm:text-base hover:bg-white/20 transition-all"
          >
            Sign In to Dashboard →
          </motion.button>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mb-8"
        >
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.0 + i * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className={`${s.bg} border backdrop-blur-md rounded-xl p-3 text-center`}
            >
              <p className={`font-bold text-lg sm:text-xl ${s.color}`}>{s.value}</p>
              <p className="text-white/50 text-[0.65rem] mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-6"
        >
          {TRUST_BADGES.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="flex items-center gap-1.5 text-white/50 text-xs">
                <Icon className={`w-3.5 h-3.5 ${b.color}`} />
                <span>{b.label}</span>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="hidden sm:flex flex-col items-center gap-2 mt-12"
      >
        <span className="text-white/40 text-xs">Scroll to explore</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-5 h-8 border border-white/30 rounded-full flex items-start justify-center p-1.5"
        >
          <motion.div
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-0.5 h-1.5 bg-white/50 rounded-full"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}