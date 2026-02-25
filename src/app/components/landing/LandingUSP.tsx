import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

/**
 * LandingUSP — 6 Unique Selling Points derived directly from Brandtelligence modules.
 * Each USP clusters related modules into a compelling value proposition.
 */

interface USP {
  emoji: string;
  gradient: string;
  accentColor: string;
  borderColor: string;
  tagColor: string;
  title: string;
  subtitle: string;
  description: string;
  modules: string[];
  kpiLabel: string;
  kpiValue: string;
}

const USPS: USP[] = [
  {
    emoji: '✨',
    gradient: 'from-purple-500 to-pink-500',
    accentColor: 'text-purple-300',
    borderColor: 'border-purple-500/30',
    tagColor: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    title: 'AI That Writes Like Your Brand',
    subtitle: 'Never stare at a blank page again',
    description:
      'Generate on-brand social captions, blog posts, ad copy, and whitepapers in seconds. The built-in content scrapper surfaces trending ideas; the approval workflow ensures every piece clears your team before it goes live.',
    modules: ['✨ AI Content Studio', '📝 Content Marketing', '🕷️ Content Scrapper'],
    kpiLabel: 'More content, same team',
    kpiValue: '5× output',
  },
  {
    emoji: '📱',
    gradient: 'from-teal-500 to-cyan-500',
    accentColor: 'text-teal-300',
    borderColor: 'border-teal-500/30',
    tagColor: 'bg-teal-500/15 text-teal-300 border-teal-500/25',
    title: 'One Dashboard, Every Platform',
    subtitle: 'Instagram, Facebook, LinkedIn, TikTok, Twitter — unified',
    description:
      'Schedule, publish, and monitor posts across 6+ platforms from a single workspace. AI-generated captions, bulk scheduling, and engagement tracking replace five separate subscriptions with one login.',
    modules: ['📱 Social Media Management'],
    kpiLabel: 'Tools replaced',
    kpiValue: '5 → 1',
  },
  {
    emoji: '📊',
    gradient: 'from-blue-500 to-indigo-500',
    accentColor: 'text-blue-300',
    borderColor: 'border-blue-500/30',
    tagColor: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    title: 'Stop Guessing, Start Growing',
    subtitle: 'Real-time intelligence across every campaign',
    description:
      'Track reach, engagement, conversions, and ROAS in one live dashboard. Custom report builder lets you visualise exactly what leadership needs — no spreadsheet wrangling, no delayed agency reports.',
    modules: ['📊 Analytics Dashboard'],
    kpiLabel: 'Budget decisions made in',
    kpiValue: '< 5 min',
  },
  {
    emoji: '🔍',
    gradient: 'from-orange-500 to-amber-500',
    accentColor: 'text-orange-300',
    borderColor: 'border-orange-500/30',
    tagColor: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
    title: 'Own Search — Organic & Paid',
    subtitle: 'Cut agency fees. Keep control.',
    description:
      'Keyword research, rank tracking, on-page audits, Google/Bing ad campaigns, and programmatic display buying — all from one cockpit. Your in-house team gains agency-grade capability without the retainer.',
    modules: ['🔍 SEO Toolkit', '💰 SEM', '🤖 Programmatic Ads', '🖼️ Display Advertising'],
    kpiLabel: 'Agency fee reduction',
    kpiValue: '60–90%',
  },
  {
    emoji: '📧',
    gradient: 'from-emerald-500 to-teal-500',
    accentColor: 'text-emerald-300',
    borderColor: 'border-emerald-500/30',
    tagColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    title: 'Every Channel, One Workspace',
    subtitle: 'Email, SMS, push — all automated',
    description:
      'Build drip sequences, promotional blasts, SMS campaigns, and mobile push notifications inside a single workflow. Segment your audience once and reach them wherever they are — no extra subscriptions.',
    modules: ['📧 Email Marketing', '📲 Mobile Marketing'],
    kpiLabel: 'Repeat purchase rate',
    kpiValue: '+40%',
  },
  {
    emoji: '⭐',
    gradient: 'from-rose-500 to-orange-500',
    accentColor: 'text-rose-300',
    borderColor: 'border-rose-500/30',
    tagColor: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
    title: 'Build Authority at Scale',
    subtitle: 'Earned, owned & paid media from one hub',
    description:
      'Manage influencer partnerships, press releases, brand monitoring, virtual events, and video marketing in one place. Turn your brand into a trusted voice in your market without coordinating across five agencies.',
    modules: ['⭐ Influencer Marketing', '📰 PR & Media', '🎥 Webinars & Events', '🎬 Video Marketing', '🎙️ Podcast & Audio'],
    kpiLabel: 'Earned media value',
    kpiValue: '3× ROI',
  },
];

export function LandingUSP() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 md:py-24">
      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <div className="text-center mb-12 md:mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-3 block"
          >
            Why Brandtelligence
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-white font-bold mb-4"
            style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)' }}
          >
            Six Reasons Fast-Growing SMEs{' '}
            <span className="bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
              Switch to Brandtelligence
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed"
          >
            Every module is purpose-built for marketing teams that want to move fast,
            spend less, and generate more — without relying on external agencies.
          </motion.p>
        </div>

        {/* USP grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {USPS.map((usp, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
              whileHover={{ y: -6, scale: 1.01 }}
              className={`group relative bg-white/8 backdrop-blur-md border ${usp.borderColor} rounded-2xl p-6 flex flex-col hover:bg-white/12 transition-all duration-300 shadow-xl overflow-hidden`}
            >
              {/* Background glow */}
              <div
                className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${usp.gradient} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`}
              />

              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${usp.gradient} flex items-center justify-center mb-4 shadow-lg text-xl`}>
                {usp.emoji}
              </div>

              {/* KPI badge */}
              <div className={`absolute top-5 right-5 px-2.5 py-1 rounded-lg border ${usp.tagColor} text-center`}>
                <p className="font-bold text-xs">{usp.kpiValue}</p>
                <p className="text-[0.55rem] opacity-70">{usp.kpiLabel}</p>
              </div>

              {/* Content */}
              <h3 className="text-white font-bold text-base sm:text-lg mb-1 pr-16">{usp.title}</h3>
              <p className={`text-xs font-medium mb-3 ${usp.accentColor}`}>{usp.subtitle}</p>
              <p className="text-white/60 text-sm leading-relaxed mb-5 flex-1">{usp.description}</p>

              {/* Module tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {usp.modules.map((mod) => (
                  <span
                    key={mod}
                    className={`px-2 py-0.5 rounded-full border text-[0.6rem] font-medium ${usp.tagColor}`}
                  >
                    {mod}
                  </span>
                ))}
              </div>

              {/* Arrow link */}
              <div className={`flex items-center gap-1 text-xs font-semibold ${usp.accentColor} group-hover:gap-2 transition-all`}>
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Explore module</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
