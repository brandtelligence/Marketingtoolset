import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { ArrowRight, Shield, Clock, Zap, CreditCard } from 'lucide-react';

/**
 * LandingCTA — Final call-to-action section.
 * Gradient banner with headline, subtext, two buttons, and trust badges.
 */

const TRUST_ITEMS = [
  { icon: Shield, label: 'No credit card required', color: 'text-purple-300' },
  { icon: Clock, label: '14-day full-access trial', color: 'text-teal-300' },
  { icon: Zap, label: 'Live in under 24 hours', color: 'text-orange-300' },
  { icon: CreditCard, label: 'Cancel anytime, no penalty', color: 'text-emerald-300' },
];

export function LandingCTA() {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 md:py-24">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-3xl border border-white/20 p-8 sm:p-12 md:p-16 text-center shadow-2xl"
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 via-teal-500/20 to-orange-500/25 backdrop-blur-md" />

          {/* Animated blobs */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], x: [0, 30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-20 -left-20 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply blur-3xl opacity-15 pointer-events-none"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], x: [0, -20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-20 -right-20 w-64 h-64 bg-teal-500 rounded-full mix-blend-multiply blur-3xl opacity-15 pointer-events-none"
          />

          {/* Content */}
          <div className="relative z-10">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-white/70 text-xs font-medium mb-6"
            >
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Taking applications now — limited spots per month
            </motion.div>

            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-white font-bold mb-4 tracking-tight"
              style={{ fontSize: 'clamp(1.75rem, 4.5vw, 3rem)' }}
            >
              Ready to Replace Your Entire{' '}
              <span className="bg-gradient-to-r from-purple-300 via-teal-300 to-orange-300 bg-clip-text text-transparent">
                Marketing Toolstack?
              </span>
            </motion.h2>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-white/65 mb-8 max-w-2xl mx-auto leading-relaxed"
              style={{ fontSize: 'clamp(0.9rem, 1.8vw, 1.1rem)' }}
            >
              Submit your access request today. Our team reviews it within 1–2 business days
              and sends a personal invite link straight to your inbox — no credit card, no commitment,
              just 14 days to explore everything Brandtelligence has to offer.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/request-access')}
                className="group relative overflow-hidden bg-white text-purple-700 px-8 py-4 rounded-full font-bold shadow-2xl inline-flex items-center gap-2 text-sm sm:text-base hover:bg-white/90 transition-all"
              >
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-200/30 to-transparent"
                />
                <span className="relative z-10">Request Access & Start Free Trial</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/login')}
                className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-full font-medium text-sm sm:text-base hover:bg-white/20 transition-all"
              >
                Already have an account? Sign In →
              </motion.button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-4 sm:gap-8"
            >
              {TRUST_ITEMS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-2 text-white/60">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-xs sm:text-sm">{item.label}</span>
                  </div>
                );
              })}
            </motion.div>

            {/* Footer note */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="mt-8 text-white/30 text-xs"
            >
              Questions? Email us at{' '}
              <a href="mailto:support@brandtelligence.my" className="text-white/50 underline hover:text-white/70 transition-colors">
                support@brandtelligence.my
              </a>
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
