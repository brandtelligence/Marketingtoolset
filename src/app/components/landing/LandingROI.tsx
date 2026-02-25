import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle, TrendingUp, Calendar, Target, DollarSign } from 'lucide-react';

/**
 * LandingROI — SME Return on Investment & KPI section.
 *
 * Sections:
 * 1. The Problem — typical fragmented toolstack cost
 * 2. The Solution — Brandtelligence consolidation savings
 * 3. KPI Comparison Table — Before vs After 90 Days
 * 4. ROI Timeline — 4 milestones (Week 1 → Year 1)
 */

// ── Problem vs Solution ──────────────────────────────────────────────────────

const PROBLEM_TOOLS = [
  { name: 'Social Scheduling (Buffer / Hootsuite)', cost: 'RM 400–900' },
  { name: 'Email Marketing (Mailchimp / Klaviyo)', cost: 'RM 200–500' },
  { name: 'SEO Tool (SEMrush / Ahrefs)', cost: 'RM 500–1,500' },
  { name: 'Design Tool (Canva Pro / Adobe)', cost: 'RM 60–400' },
  { name: 'CRM / Marketing Hub (HubSpot)', cost: 'RM 1,500–4,500' },
  { name: 'Analytics & Reporting', cost: 'RM 200–800' },
  { name: 'Agency Retainer (SEO / Content / Ads)', cost: 'RM 5,000–20,000' },
];

const SOLUTION_MODULES = [
  { name: 'Social Media Management + AI Captions', saving: '📱 RM 200/mo' },
  { name: 'AI Content Studio + GPT-4 Generation', saving: '✨ RM 300/mo' },
  { name: 'Analytics Dashboard + Custom Reports', saving: '📊 RM 150/mo' },
  { name: 'SEO Toolkit + SEM + Programmatic Ads', saving: '🔍 RM 950/mo' },
  { name: 'Email + Mobile Marketing Automation', saving: '📧 RM 450/mo' },
  { name: '+ 13 more modules available', saving: '⚡ from RM 100/mo' },
];

// ── KPI Table ────────────────────────────────────────────────────────────────

const KPI_ROWS = [
  { metric: 'Monthly marketing tools spend', before: 'RM 2,500–7,000', after: 'RM 650–2,500', positive: true },
  { metric: 'Agency dependency', before: 'High (RM 5k–20k/mo)', after: 'Low to None', positive: true },
  { metric: 'Content pieces published / week', before: '4–6', after: '20–30+', positive: true },
  { metric: 'Campaign launch time', before: '3–5 business days', after: '< 2 hours', positive: true },
  { metric: 'Marketing tool logins / day', before: '7–10 apps', after: '1 platform', positive: true },
  { metric: 'Reporting prep time / month', before: '8–12 hours', after: '< 30 minutes', positive: true },
  { metric: 'Social media engagement rate', before: 'Baseline', after: '+45–65% in 90 days', positive: true },
  { metric: 'Leads generated / month', before: 'Baseline', after: '+80–120% in 90 days', positive: true },
  { metric: 'Team hours lost to admin / week', before: '15–25 hrs', after: '< 3 hrs', positive: true },
];

// ── ROI Timeline ─────────────────────────────────────────────────────────────

const TIMELINE = [
  {
    period: 'Week 1',
    icon: Calendar,
    gradient: 'from-purple-500 to-pink-500',
    title: 'Immediate Cost Savings',
    desc: 'Cancel redundant subscriptions. Tool consolidation savings alone typically cover the entire Brandtelligence plan in the first month.',
    value: 'RM 2k–5k saved',
    valueColor: 'text-purple-300',
  },
  {
    period: 'Month 1',
    icon: TrendingUp,
    gradient: 'from-teal-500 to-cyan-500',
    title: 'AI-Driven Output Multiplier',
    desc: 'AI Content Studio drives 3× content volume. Teams reclaim 20+ hours/week from writing and manual scheduling.',
    value: '3× content output',
    valueColor: 'text-teal-300',
  },
  {
    period: 'Month 3',
    icon: Target,
    gradient: 'from-orange-500 to-amber-500',
    title: 'Analytics-Led ROAS Gains',
    desc: 'Real-time analytics data enables budget reallocation to top performers. Average ROAS improves 35% as spend shifts away from underperforming channels.',
    value: '+35% ROAS avg.',
    valueColor: 'text-orange-300',
  },
  {
    period: 'Year 1',
    icon: DollarSign,
    gradient: 'from-emerald-500 to-teal-500',
    title: 'Full In-House Capability',
    desc: 'Agency retainers eliminated or significantly reduced. Your team now runs SEO, SEM, content, social, and PR end-to-end. The compounding value of organic growth begins.',
    value: 'RM 84k–234k value',
    valueColor: 'text-emerald-300',
  },
];

// ── Section Header Helper ────────────────────────────────────────────────────

function SectionLabel({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className={`text-xs font-bold uppercase tracking-widest block mb-1 ${color}`}>{children}</span>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────

export function LandingROI() {
  const totalProblemMin = 7860;
  const totalProblemMax = 27600;
  const solutionMin = 650;
  const solutionMax = 2500;

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 md:py-24">
      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <div className="text-center mb-12 md:mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3 block"
          >
            ROI & KPI Framework for Growing SMEs
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-white font-bold mb-4"
            style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)' }}
          >
            The Numbers That{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Make the Decision Easy
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed"
          >
            Based on real SME marketing operations worldwide. Your actual numbers will vary,
            but the direction is always the same: less spend, more output, faster decisions.
          </motion.p>
        </div>

        {/* ── Problem vs Solution ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">

          {/* The Problem */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="bg-red-500/8 border border-red-500/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <SectionLabel color="text-red-400">The Typical SME Setup</SectionLabel>
                <h3 className="text-white font-bold text-base">Fragmented Tools = Hidden Costs</h3>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              {PROBLEM_TOOLS.map((t, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-red-500/10">
                  <span className="text-white/65 text-xs">{t.name}</span>
                  <span className="text-red-400 text-xs font-semibold shrink-0">{t.cost}</span>
                </div>
              ))}
            </div>

            <div className="bg-red-500/15 border border-red-500/25 rounded-xl p-4">
              <p className="text-red-400/70 text-xs mb-1">Total monthly overhead</p>
              <p className="text-red-300 font-bold text-2xl">
                RM {totalProblemMin.toLocaleString('en-MY')} – {totalProblemMax.toLocaleString('en-MY')}
              </p>
              <p className="text-red-400/60 text-xs mt-1">
                = RM {(totalProblemMin * 12).toLocaleString('en-MY')} – {(totalProblemMax * 12).toLocaleString('en-MY')} per year
              </p>
            </div>
          </motion.div>

          {/* The Solution */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="bg-emerald-500/8 border border-emerald-500/20 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <SectionLabel color="text-emerald-400">With Brandtelligence</SectionLabel>
                <h3 className="text-white font-bold text-base">One Platform, All Channels</h3>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              {SOLUTION_MODULES.map((m, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-emerald-500/10">
                  <span className="text-white/65 text-xs">{m.name}</span>
                  <span className="text-emerald-400 text-xs font-semibold shrink-0">{m.saving}</span>
                </div>
              ))}
            </div>

            <div className="bg-emerald-500/15 border border-emerald-500/25 rounded-xl p-4">
              <p className="text-emerald-400/70 text-xs mb-1">Typical monthly investment</p>
              <p className="text-emerald-300 font-bold text-2xl">
                RM {solutionMin.toLocaleString('en-MY')} – {solutionMax.toLocaleString('en-MY')}
              </p>
              <p className="text-emerald-400/60 text-xs mt-1">
                Save up to RM {((totalProblemMax - solutionMax) * 12).toLocaleString('en-MY')} per year
              </p>
            </div>
          </motion.div>
        </div>

        {/* ── KPI Comparison Table ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="bg-white/8 backdrop-blur-md border border-white/15 rounded-2xl overflow-hidden mb-10"
        >
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="text-white font-bold text-base">KPI Comparison — Before vs After 90 Days</h3>
            <p className="text-white/50 text-xs mt-0.5">Based on aggregated data from SME marketing teams globally</p>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-3 px-5 py-3 bg-white/5 border-b border-white/10 text-[0.65rem] font-bold uppercase tracking-wider">
            <span className="text-white/40">KPI</span>
            <span className="text-red-400 text-center">Before</span>
            <span className="text-emerald-400 text-center">After 90 Days</span>
          </div>

          {/* Rows */}
          {KPI_ROWS.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className={`grid grid-cols-3 px-5 py-3 border-b border-white/5 items-center ${i % 2 === 0 ? 'bg-white/2' : ''}`}
            >
              <span className="text-white/70 text-xs pr-4">{row.metric}</span>
              <span className="text-red-400/80 text-xs text-center">{row.before}</span>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-emerald-400 text-xs font-semibold text-center">{row.after}</span>
                <span className="text-emerald-500 text-xs">✓</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── ROI Timeline ── */}
        <div>
          <motion.h3
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-white font-bold text-lg mb-6 text-center"
          >
            Your ROI Timeline
          </motion.h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIMELINE.map((t, i) => {
              const Icon = t.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/8 backdrop-blur-md border border-white/15 rounded-2xl p-5 relative overflow-hidden"
                >
                  {/* Glow */}
                  <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${t.gradient} opacity-10 blur-2xl rounded-full`} />

                  {/* Period pill */}
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold mb-3 bg-gradient-to-r ${t.gradient} text-white`}>
                    {t.period}
                  </span>

                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center mb-3`}>
                    <Icon className="w-4.5 h-4.5 text-white w-5 h-5" />
                  </div>

                  <h4 className="text-white font-bold text-sm mb-2">{t.title}</h4>
                  <p className="text-white/55 text-xs leading-relaxed mb-3">{t.desc}</p>

                  <div className={`font-bold text-base ${t.valueColor}`}>{t.value}</div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Bottom disclaimer ── */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-white/30 text-xs mt-8 max-w-2xl mx-auto leading-relaxed"
        >
          * KPIs are representative estimates based on observed outcomes across SME marketing teams globally.
          Individual results vary based on industry, team size, starting baseline, and module selection.
          All pricing in Malaysian Ringgit (RM).
        </motion.p>
      </div>
    </section>
  );
}