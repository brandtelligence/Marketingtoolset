import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_MODULES } from '../../data/mockSaasData';
import { formatRM } from '../../utils/format';

/**
 * LandingModules — Full 18-module catalog with category filter tabs.
 * Shows icon, name, description, category badge, and monthly price.
 */

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  core:          { label: 'Core',          emoji: '🏗',  color: 'text-slate-300',   bg: 'bg-slate-500/15',   border: 'border-slate-500/25' },
  marketing:     { label: 'Marketing',     emoji: '📢',  color: 'text-purple-300',  bg: 'bg-purple-500/15',  border: 'border-purple-500/25' },
  analytics:     { label: 'Analytics',     emoji: '📊',  color: 'text-teal-300',    bg: 'bg-teal-500/15',    border: 'border-teal-500/25' },
  communication: { label: 'Communication', emoji: '📬',  color: 'text-orange-300',  bg: 'bg-orange-500/15',  border: 'border-orange-500/25' },
};

const ALL_CATEGORIES = ['all', 'core', 'marketing', 'analytics', 'communication'];

const CAT_LABELS: Record<string, string> = {
  all: '⚡ All Modules',
  core: '🏗 Core',
  marketing: '📢 Marketing',
  analytics: '📊 Analytics',
  communication: '📬 Communication',
};

export function LandingModules() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered =
    activeCategory === 'all'
      ? MOCK_MODULES
      : MOCK_MODULES.filter(m => m.category === activeCategory);

  const totalModules = MOCK_MODULES.length;
  const totalMin = MOCK_MODULES.slice(0, 6).reduce((s, m) => s + m.basePrice, 0);

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 md:py-24">
      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <div className="text-center mb-10 md:mb-14">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-3 block"
          >
            Complete Module Catalogue
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-white font-bold mb-4"
            style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)' }}
          >
            {totalModules} Modules.{' '}
            <span className="bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
              Every Marketing Channel Covered.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed"
          >
            Pick only the modules you need. Start with the essentials — add more as you grow.
            Every module includes a full 14-day free trial on approval.
          </motion.p>

          {/* Pricing anchor */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 }}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/15 border border-emerald-500/25 rounded-full"
          >
            <span className="text-emerald-300 text-xs font-semibold">Starting from</span>
            <span className="text-emerald-300 font-bold text-sm">RM 100/mo</span>
            <span className="text-emerald-400/60 text-xs">per module · no setup fee</span>
          </motion.div>
        </div>

        {/* Category filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-2 mb-8"
        >
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                activeCategory === cat
                  ? 'bg-purple-500/30 border-purple-500/50 text-purple-200'
                  : 'bg-white/8 border-white/15 text-white/60 hover:border-white/30 hover:text-white/80'
              }`}
            >
              {CAT_LABELS[cat]}
              {cat !== 'all' && (
                <span className="ml-1.5 text-white/30 font-normal">
                  ({MOCK_MODULES.filter(m => m.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* Module grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filtered.map((mod, i) => {
              const meta = CATEGORY_META[mod.category];
              return (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="group bg-white/8 backdrop-blur-md border border-white/12 rounded-2xl p-5 flex flex-col hover:bg-white/12 hover:border-white/20 transition-all duration-300"
                >
                  {/* Icon + category badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center text-xl">
                      {mod.icon}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full border text-[0.58rem] font-bold ${meta.bg} ${meta.border} ${meta.color}`}>
                      {meta.emoji} {meta.label}
                    </span>
                  </div>

                  {/* Name & description */}
                  <h3 className="text-white font-semibold text-sm mb-1.5 leading-snug">{mod.name}</h3>
                  <p className="text-white/50 text-xs leading-relaxed flex-1">{mod.description}</p>

                  {/* Price footer */}
                  <div className="mt-4 pt-3 border-t border-white/8 flex items-center justify-between">
                    <span className="text-white/35 text-[0.6rem] uppercase tracking-wider">After trial</span>
                    <span className="text-white/80 font-bold text-sm">
                      RM {formatRM(mod.basePrice)}<span className="text-white/35 font-normal text-xs">/mo</span>
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Bottom note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <p className="text-white/40 text-xs mb-4">
            Mix and match any combination. Pricing is additive — you only pay for what you activate.
          </p>
          <div className="inline-flex flex-wrap items-center justify-center gap-3">
            {[
              { label: 'No setup fee', color: 'text-purple-300' },
              { label: '14-day free trial', color: 'text-teal-300' },
              { label: 'Cancel anytime', color: 'text-orange-300' },
              { label: 'Add modules as you grow', color: 'text-emerald-300' },
            ].map((b, i) => (
              <span key={i} className={`text-xs font-medium ${b.color}`}>✓ {b.label}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
