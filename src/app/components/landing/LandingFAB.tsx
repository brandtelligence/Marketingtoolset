import { useState } from 'react';
import type { ElementType } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Zap, Target, TrendingUp, Search, Mail, Star } from 'lucide-react';

/**
 * LandingFAB — Features → Advantages → Benefits framework.
 * Shows the full value chain for 6 key platform capabilities.
 * Desktop: clickable list on left + detail panel on right.
 * Mobile: accordion cards.
 */

interface FABItem {
  icon: ElementType;
  gradient: string;
  accentText: string;
  accentBg: string;
  feature: string;
  featureDetail: string;
  advantage: string;
  advantageDetail: string;
  benefit: string;
  benefitDetail: string;
  metric: string;
  metricLabel: string;
  modules: string[];
}

const FAB_ITEMS: FABItem[] = [
  {
    icon: Zap,
    gradient: 'from-purple-500 to-pink-500',
    accentText: 'text-purple-300',
    accentBg: 'bg-purple-500/15 border-purple-500/25',
    feature: 'GPT-4o AI Content Generation',
    featureDetail:
      'The AI Content Studio uses GPT-4o with your brand voice profile to generate social captions, blog posts, ad copy, and email campaigns — complete with a multi-step approval workflow so nothing goes live without your team\'s sign-off.',
    advantage: 'From brief to published-ready content in under 10 minutes',
    advantageDetail:
      'What previously required briefing a copywriter, waiting 2–3 days, reviewing drafts, and back-and-forth revisions now happens in one session. The approval board keeps everyone in the loop without a single email thread.',
    benefit: 'Your marketing team produces 5× more content without adding headcount',
    benefitDetail:
      'Reclaim 15–20 hours per week per content creator. Reinvest those hours into strategy, client relationships, and higher-value creative work — not repetitive writing tasks.',
    metric: '5×',
    metricLabel: 'Content output increase',
    modules: ['✨ AI Content Studio', '📝 Content Marketing', '🕷️ Content Scrapper'],
  },
  {
    icon: Target,
    gradient: 'from-teal-500 to-cyan-500',
    accentText: 'text-teal-300',
    accentBg: 'bg-teal-500/15 border-teal-500/25',
    feature: 'Unified Multi-Platform Social Scheduler',
    featureDetail:
      'Manage Instagram, Facebook, LinkedIn, TikTok, Twitter, and Telegram from a single dashboard. Bulk-upload content, use AI-generated captions per platform, and view your entire posting calendar at a glance.',
    advantage: 'One login replaces Buffer, Hootsuite, Sprout Social, Later, and Publer',
    advantageDetail:
      'The average SME pays RM 800–2,500/mo across 3–5 separate social tools. Brandtelligence consolidates all of them. You also eliminate the cognitive overhead of context-switching between apps all day.',
    benefit: 'Reduce SaaS spend by up to RM 2,500/mo while posting more consistently than ever',
    benefitDetail:
      'Teams that post more consistently see 40–65% higher organic engagement over 90 days. Combined with the cost savings, the ROI on this module alone typically covers the entire Brandtelligence subscription.',
    metric: 'RM 2.5k',
    metricLabel: 'SaaS savings / month',
    modules: ['📱 Social Media Management'],
  },
  {
    icon: TrendingUp,
    gradient: 'from-blue-500 to-indigo-600',
    accentText: 'text-blue-300',
    accentBg: 'bg-blue-500/15 border-blue-500/25',
    feature: 'Real-Time Cross-Platform Analytics',
    featureDetail:
      'The Analytics Dashboard aggregates reach, engagement, conversions, and ROAS from every channel — social, email, paid, and organic search — into a single live view. The custom report builder generates board-ready PDFs in one click.',
    advantage: 'Every campaign KPI visible in one view — no spreadsheet-building, no delayed agency reports',
    advantageDetail:
      'Previously, compiling a monthly performance report required pulling data from 5+ platforms, normalising it in Excel, and spending 8–12 hours creating the deck. All of that is eliminated.',
    benefit: 'Make data-backed budget reallocation decisions in minutes, not weeks',
    benefitDetail:
      'When you can see in real time that Instagram outperforms Facebook 3:1 for your audience, you reallocate budget immediately — not at next quarter\'s review. Teams using data-driven budget management see average ROAS improvements of 35%+ within 90 days.',
    metric: '35%',
    metricLabel: 'ROAS improvement avg.',
    modules: ['📊 Analytics Dashboard'],
  },
  {
    icon: Search,
    gradient: 'from-orange-500 to-amber-500',
    accentText: 'text-orange-300',
    accentBg: 'bg-orange-500/15 border-orange-500/25',
    feature: 'In-House SEO, SEM & Programmatic Advertising',
    featureDetail:
      'Keyword research, on-page audits, rank tracking, Google/Bing ad campaign management, and automated programmatic display buying — all available to your team without any specialist tools or external agency access.',
    advantage: 'Your in-house team gains full agency-grade search marketing capability',
    advantageDetail:
      'Most SMEs outsource SEO to an agency at RM 3,000–10,000/mo because the tooling is too complex. With Brandtelligence, the tools are simplified for non-specialists while retaining professional depth for those who need it.',
    benefit: 'Eliminate 60–90% of search marketing agency fees while improving performance',
    benefitDetail:
      'In-house teams using the SEO + SEM bundle typically break even within the first 30 days on saved agency fees alone. Within 6 months, organic traffic typically grows 45–80% from consistent keyword-targeted content strategy.',
    metric: '60–90%',
    metricLabel: 'Agency fee reduction',
    modules: ['🔍 SEO Toolkit', '💰 SEM', '🤖 Programmatic Ads'],
  },
  {
    icon: Mail,
    gradient: 'from-emerald-500 to-teal-500',
    accentText: 'text-emerald-300',
    accentBg: 'bg-emerald-500/15 border-emerald-500/25',
    feature: 'Automated Email, SMS & Push Notification Campaigns',
    featureDetail:
      'Build multi-step drip sequences, promotional email blasts, SMS campaigns, and mobile push notifications from one campaign builder. Segment audiences once, deploy across all channels simultaneously without extra subscriptions.',
    advantage: 'Reach every customer segment across every channel — from a single workflow',
    advantageDetail:
      'Without consolidation, email lives in Mailchimp, SMS in a separate provider, and push in a third tool. Each has its own billing, its own segment definitions, and its own reporting. Brandtelligence unifies all three with shared audience data.',
    benefit: 'Increase customer repeat-purchase rate and lifetime value without growing headcount',
    benefitDetail:
      'Brands with consistent multi-channel touchpoints see 40% higher repeat purchase rates and 25% higher average order values. Automating these sequences means it runs 24/7 without any manual intervention after initial setup.',
    metric: '+40%',
    metricLabel: 'Repeat purchase rate',
    modules: ['📧 Email Marketing', '📲 Mobile Marketing'],
  },
  {
    icon: Star,
    gradient: 'from-rose-500 to-orange-500',
    accentText: 'text-rose-300',
    accentBg: 'bg-rose-500/15 border-rose-500/25',
    feature: 'Influencer, PR, Video & Webinar Management',
    featureDetail:
      'Manage influencer partnerships, UGC campaigns, and brand ambassador programmes. Draft and distribute press releases. Plan and host virtual events and webinars. Produce and track video content performance — all from one workspace.',
    advantage: 'Coordinate earned, owned, and paid media from a single workflow',
    advantageDetail:
      'This module cluster replaces three separate agency retainers: a PR agency, an influencer agency, and a production house for video. All three are now internal capabilities managed by your own team.',
    benefit: 'Build brand authority in your niche while your team stays focused on core operations',
    benefitDetail:
      'Brands running consistent PR, influencer, and video programs see 3× earned media value compared to paid-only strategies. The compounding organic growth — search visibility, domain authority, social proof — becomes a durable competitive moat.',
    metric: '3×',
    metricLabel: 'Earned media value',
    modules: ['⭐ Influencer Marketing', '📰 PR & Media', '🎥 Webinars & Events', '🎬 Video Marketing'],
  },
];

// ── Mobile Accordion Card ────────────────────────────────────────────────────

function FABCard({ item, index }: { item: FABItem; index: number }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07 }}
      className="bg-white/8 backdrop-blur-md border border-white/15 rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-white/5 transition-all"
      >
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${item.accentText}`}>Feature</p>
          <p className="text-white font-semibold text-sm leading-snug">{item.feature}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`px-2 py-1 rounded-lg border ${item.accentBg} ${item.accentText} font-bold text-sm`}>
            {item.metric}
          </span>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-white/40" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
              {/* Advantage */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block mb-1">→ Advantage</span>
                <p className="text-white/90 text-sm font-medium mb-1">{item.advantage}</p>
                <p className="text-white/55 text-xs leading-relaxed">{item.advantageDetail}</p>
              </div>
              {/* Benefit */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">→ Benefit</span>
                <p className="text-white/90 text-sm font-medium mb-1">{item.benefit}</p>
                <p className="text-white/55 text-xs leading-relaxed">{item.benefitDetail}</p>
              </div>
              {/* Modules */}
              <div className="flex flex-wrap gap-1.5">
                {item.modules.map(m => (
                  <span key={m} className={`px-2 py-0.5 rounded-full border text-[0.6rem] font-medium ${item.accentBg} ${item.accentText}`}>{m}</span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Desktop Split Panel ──────────────────────────────────────────────────────

function FABDesktop() {
  const [active, setActive] = useState(0);
  const item = FAB_ITEMS[active];
  const Icon = item.icon;

  return (
    <div className="hidden lg:grid grid-cols-5 gap-6">
      {/* Left list */}
      <div className="col-span-2 space-y-2">
        {FAB_ITEMS.map((f, i) => {
          const FIcon = f.icon;
          const isActive = active === i;
          return (
            <motion.button
              key={i}
              onClick={() => setActive(i)}
              whileHover={{ x: isActive ? 0 : 4 }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                isActive
                  ? `${f.accentBg} border-opacity-50`
                  : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${f.gradient} flex items-center justify-center shrink-0`}>
                <FIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${isActive ? f.accentText : 'text-white/70'}`}>
                  {f.feature}
                </p>
                <p className="text-white/35 text-[0.58rem] mt-0.5">{f.modules.length} module{f.modules.length > 1 ? 's' : ''}</p>
              </div>
              <span className={`text-xs font-bold shrink-0 ${isActive ? f.accentText : 'text-white/30'}`}>
                {f.metric}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Right detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="col-span-3 bg-white/8 backdrop-blur-md border border-white/15 rounded-2xl p-7 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shrink-0`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <span className={`text-xs font-bold uppercase tracking-widest mb-1 block ${item.accentText}`}>Feature</span>
              <h3 className="text-white font-bold text-lg leading-snug">{item.feature}</h3>
            </div>
            <div className={`px-3 py-2 rounded-xl border ${item.accentBg} text-center shrink-0`}>
              <p className={`font-bold text-xl ${item.accentText}`}>{item.metric}</p>
              <p className={`text-[0.58rem] ${item.accentText} opacity-70`}>{item.metricLabel}</p>
            </div>
          </div>

          <p className="text-white/60 text-sm leading-relaxed mb-6">{item.featureDetail}</p>

          {/* Advantage */}
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block mb-1.5">→ Advantage</span>
            <p className="text-white font-semibold text-sm mb-1.5">{item.advantage}</p>
            <p className="text-white/55 text-xs leading-relaxed">{item.advantageDetail}</p>
          </div>

          {/* Benefit */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1.5">→ Benefit</span>
            <p className="text-white font-semibold text-sm mb-1.5">{item.benefit}</p>
            <p className="text-white/55 text-xs leading-relaxed">{item.benefitDetail}</p>
          </div>

          {/* Modules */}
          <div className="mt-auto">
            <p className="text-white/30 text-xs mb-2">Powered by</p>
            <div className="flex flex-wrap gap-1.5">
              {item.modules.map(m => (
                <span key={m} className={`px-2.5 py-1 rounded-full border text-xs font-medium ${item.accentBg} ${item.accentText}`}>{m}</span>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────

export function LandingFAB() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 md:py-24">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-3 block"
          >
            Feature · Advantage · Benefit
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-white font-bold mb-4"
            style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)' }}
          >
            Not Just Features.{' '}
            <span className="bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">
              Measurable Business Outcomes.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed"
          >
            Every capability is designed with a clear chain: what it does →
            what that means for your workflow → what it means for your business.
          </motion.p>
        </div>

        {/* Desktop split panel */}
        <FABDesktop />

        {/* Mobile accordion */}
        <div className="lg:hidden space-y-3">
          {FAB_ITEMS.map((item, i) => (
            <FABCard key={i} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}