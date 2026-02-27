/**
 * WebHomePage — High-conversion marketing homepage
 * Hero · Trust logos · USPs · Product preview · Stats · Testimonials · Pricing · Blog · CTA
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowRight, Zap, BarChart2, Globe, Users, Shield, Sparkles,
  CheckCircle, Star, TrendingUp, Target, Layers, Play, ChevronRight,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bt-orange/10 border border-bt-orange/20 text-bt-orange text-xs font-semibold mb-5">
      {children}
    </div>
  );
}

function fadeUp(delay = 0) {
  return { initial: { opacity: 0, y: 28 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.55, delay, ease: 'easeOut' } };
}

// ── Data ───────────────────────────────────────────────────────────────────────

const USPS = [
  { icon: Sparkles, title: 'AI Content Studio',    desc: 'Generate on-brand copy, captions, blog posts, and ads in seconds — in any language, for any audience.',                  color: 'from-bt-orange/20 to-bt-orange/10',   border: 'border-bt-orange/20',  iconColor: 'text-bt-orange'        },
  { icon: BarChart2, title: 'Real-Time Analytics',  desc: 'Track UTM links, campaign ROI, click-through rates, and conversion funnels across every channel — live.',               color: 'from-bt-teal/15 to-bt-teal/8',        border: 'border-bt-teal/20',    iconColor: 'text-bt-teal'          },
  { icon: Globe,     title: 'Landing Page Builder', desc: 'Drag-and-drop high-converting pages with A/B testing, custom domains, and pixel-perfect mobile rendering.',             color: 'from-bt-teal/15 to-bt-teal/8',        border: 'border-bt-teal/20',    iconColor: 'text-bt-teal'          },
  { icon: Users,     title: 'Contact Management',   desc: 'CRM-lite contact manager with lead scoring, tags, custom fields, segmentation, and automated nurture sequences.',       color: 'from-bt-purple/30 to-bt-purple/15',   border: 'border-bt-purple/40',  iconColor: 'text-bt-purple-light'  },
  { icon: Shield,    title: 'Enterprise Security',  desc: 'SOC 2 Type II, GDPR-ready, RBAC at every layer. Your data never leaves your tenant — isolated by design.',             color: 'from-rose-500/15 to-pink-500/8',      border: 'border-rose-500/20',   iconColor: 'text-rose-400'         },
  { icon: Target,    title: 'Brand Kit Manager',    desc: 'Centralise your logos, colours, fonts, and approved assets. Enforce brand consistency across every team member.',       color: 'from-bt-orange/15 to-bt-orange/8',    border: 'border-bt-orange/20',  iconColor: 'text-bt-orange'        },
];

const STATS = [
  { value: '1,200+', label: 'Marketing Teams',      icon: Users     },
  { value: '50M+',   label: 'Impressions Tracked',  icon: TrendingUp },
  { value: '98%',    label: 'Retention Rate',        icon: Star      },
  { value: '10×',    label: 'Average ROI Lift',      icon: Zap       },
];

const TESTIMONIALS = [
  { quote: "Brandtelligence cut our content production time by 70%. The AI Studio is genuinely remarkable — it understands our brand voice better than some copywriters we've hired.", name: 'Sarah Lim', role: 'CMO, Luxe Commerce Group', rating: 5, initial: 'S' },
  { quote: "The analytics dashboard alone is worth the subscription. We finally have real-time visibility into what every campaign is actually generating — no more guesswork.", name: 'Arif Rahman', role: 'Head of Digital, Apex Financial', rating: 5, initial: 'A' },
  { quote: "We manage 30+ client brands on a single Brandtelligence instance. The multi-tenant architecture means perfect data isolation with zero overhead for our ops team.", name: 'Priya Nair', role: 'Founder & CEO, Meridian Agency', rating: 5, initial: 'P' },
];

const PRICING_TIERS = [
  { name: 'Starter', price: 'RM 399', period: '/mo', tag: null,       highlight: false, features: ['5 team members', 'AI Content Studio (50 credits/mo)', 'Landing page builder', 'Basic analytics', 'Email support'] },
  { name: 'Growth',  price: 'RM 999', period: '/mo', tag: 'Most Popular', highlight: true,  features: ['25 team members', 'AI Content Studio (unlimited)', 'A/B testing', 'UTM analytics & attribution', 'Contact management (10,000)', 'Priority support'] },
  { name: 'Enterprise', price: 'Custom', period: '', tag: null,       highlight: false, features: ['Unlimited team members', 'Dedicated AI model fine-tuning', 'Multi-tenant management', 'Custom SLA & compliance', 'SSO & SAML', 'Dedicated success manager'] },
];

const BLOG_POSTS = [
  { category: 'AI Marketing', title: '10 AI Prompts Every Marketing Manager Should Use in 2025', date: 'Jan 15, 2025', readTime: '7 min', gradient: 'from-bt-orange/30 to-bt-orange/10' },
  { category: 'Analytics',    title: 'UTM Tracking Best Practices for Multi-Channel Campaigns', date: 'Jan 8, 2025',  readTime: '5 min', gradient: 'from-bt-teal/25 to-bt-teal/10'   },
  { category: 'Growth',       title: 'How to Build a Landing Page That Converts: The 2025 Playbook', date: 'Dec 28, 2024', readTime: '9 min', gradient: 'from-bt-teal/20 to-bt-purple/15' },
];

const LOGOS = ['Apex Financial', 'Luxe Commerce', 'Meridian Agency', 'Nova Brands', 'Skyline Digital', 'PrimeTech', 'Orion Marketing', 'Fusion Media'];

// ── Component ──────────────────────────────────────────────────────────────────

export function WebHomePage() {
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  return (
    <div className="text-white">

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-bt-teal/8 blur-[140px]" />
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[400px] rounded-full bg-bt-purple/15 blur-[100px]" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: Copy */}
            <div>
              <motion.div {...fadeUp(0)}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bt-orange/12 border border-bt-orange/25 text-bt-orange text-xs font-semibold mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-bt-orange animate-pulse" />
                  New: AI Campaign Generator — now live
                </div>
              </motion.div>

              <motion.h1 {...fadeUp(0.08)} className="font-black leading-[1.08] tracking-tight mb-6" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)' }}>
                The Marketing Intelligence<br />
                <span className="bg-gradient-to-r from-bt-teal to-bt-orange bg-clip-text text-transparent">
                  Platform Built to Scale.
                </span>
              </motion.h1>

              <motion.p {...fadeUp(0.16)} className="text-white/60 text-lg leading-relaxed mb-8 max-w-lg">
                Brandtelligence unifies AI content creation, campaign analytics, landing pages, and client reporting in one powerful multi-tenant platform — built for marketing teams that mean business.
              </motion.p>

              <motion.div {...fadeUp(0.22)} className="flex flex-col sm:flex-row gap-3 mb-10">
                <Link
                  to="/request-access"
                  className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-bt-teal to-bt-teal-dark text-white font-bold text-sm shadow-xl shadow-bt-teal/35 hover:shadow-bt-teal/55 hover:scale-[1.03] transition-all duration-200"
                >
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => setVideoModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-white/20 text-white font-semibold text-sm hover:bg-white/8 transition-all"
                >
                  <Play className="w-4 h-4 text-bt-teal" /> Watch Demo
                </button>
              </motion.div>

              <motion.div {...fadeUp(0.28)} className="flex flex-wrap items-center gap-4">
                <div className="flex -space-x-2">
                  {['S','A','P','R','M'].map((l, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[#06070f] bg-gradient-to-br from-bt-teal to-bt-teal-dark flex items-center justify-center text-white text-xs font-bold">{l}</div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-0.5 mb-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-bt-orange fill-bt-orange" />)}
                  </div>
                  <p className="text-white/50 text-xs">Trusted by 1,200+ marketing teams in 40+ countries</p>
                </div>
              </motion.div>
            </div>

            {/* Right: Product mockup */}
            <motion.div {...fadeUp(0.15)} className="relative hidden lg:block">
              <div className="relative">
                {/* Main card */}
                <div className="bg-white/[0.05] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
                  {/* Header bar */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.08] bg-white/[0.03]">
                    <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500/60" /><div className="w-3 h-3 rounded-full bg-amber-500/60" /><div className="w-3 h-3 rounded-full bg-emerald-500/60" /></div>
                    <div className="flex-1 mx-4 bg-white/[0.06] rounded-md h-5 flex items-center px-2"><span className="text-white/30 text-[10px]">app.brandtelligence.io/dashboard</span></div>
                  </div>
                  {/* Mock content */}
                  <div className="p-5 space-y-4">
                    {/* Stat row */}
                    <div className="grid grid-cols-3 gap-3">
                      {[{ l: 'Total Reach', v: '2.4M', c: 'text-bt-teal' }, { l: 'Conversions', v: '18.2K', c: 'text-emerald-400' }, { l: 'Avg CTR', v: '4.8%', c: 'text-bt-orange' }].map(s => (
                        <div key={s.l} className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3">
                          <p className="text-white/40 text-[10px] mb-1">{s.l}</p>
                          <p className={`font-black text-lg ${s.c}`}>{s.v}</p>
                        </div>
                      ))}
                    </div>
                    {/* Chart */}
                    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
                      <div className="flex items-end justify-between gap-1.5 h-20">
                        {[40,65,45,80,55,90,70,95,60,85,75,100].map((h, i) => (
                          <motion.div
                            key={i}
                            className="flex-1 rounded-t-sm bg-gradient-to-t from-bt-teal-dark to-bt-teal"
                            style={{ height: `${h}%` }}
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ duration: 0.8, delay: i * 0.06, ease: 'easeOut' }}
                          />
                        ))}
                      </div>
                      <p className="text-white/30 text-[10px] mt-2">Campaign performance — last 12 weeks</p>
                    </div>
                    {/* AI suggestion */}
                    <div className="bg-bt-teal/[0.08] border border-bt-teal/20 rounded-xl p-3 flex items-start gap-3">
                      <Sparkles className="w-4 h-4 text-bt-teal shrink-0 mt-0.5" />
                      <div>
                        <p className="text-white/80 text-xs font-semibold">AI Insight</p>
                        <p className="text-white/50 text-[11px] mt-0.5">Your Wednesday posts get 3.2× higher engagement. Schedule your next campaign for Wed 9am.</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Floating badges */}
                <motion.div animate={{ y: [0,-8,0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="absolute -top-4 -right-6 bg-emerald-500/90 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/30">
                  ↑ 312% ROI this month
                </motion.div>
                <motion.div animate={{ y: [0,8,0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} className="absolute -bottom-4 -left-6 bg-white/[0.08] backdrop-blur border border-white/15 text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
                  <span className="text-bt-teal font-bold">AI</span> · Content generated
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Stats bar */}
          <motion.div {...fadeUp(0.35)} className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-center p-5 bg-white/[0.03] border border-white/[0.07] rounded-2xl">
                <Icon className="w-5 h-5 text-bt-teal mx-auto mb-2" />
                <p className="text-white font-black text-2xl sm:text-3xl">{value}</p>
                <p className="text-white/45 text-xs mt-1">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          TRUST LOGOS
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-12 border-y border-white/[0.06] bg-bt-purple/[0.04] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-6">
          <p className="text-white/30 text-xs font-semibold uppercase tracking-widest">Trusted by leading brands worldwide</p>
        </div>
        <div className="relative">
          <motion.div
            className="flex items-center gap-12 whitespace-nowrap"
            animate={{ x: [0, -1600] }}
            transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          >
            {[...LOGOS, ...LOGOS].map((name, i) => (
              <span key={i} className="text-white/25 font-bold text-sm shrink-0 tracking-widest uppercase">{name}</span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          PROBLEM / SOLUTION
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <motion.div {...fadeUp(0)}>
            <SectionLabel>The Problem</SectionLabel>
            <h2 className="text-white font-black text-3xl sm:text-4xl leading-tight mb-5">
              Marketing teams are drowning in<br />
              <span className="text-white/40">disconnected tools.</span>
            </h2>
            <div className="space-y-3">
              {[
                'Juggling 10+ platforms to run one campaign',
                'No single source of truth for performance data',
                'Brand assets scattered across drives and chats',
                'Weeks wasted on manual reporting and approvals',
                'AI tools that don\'t understand your brand voice',
              ].map(item => (
                <div key={item} className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/[0.05] border border-rose-500/15">
                  <div className="w-4 h-4 rounded-full border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500/60" />
                  </div>
                  <span className="text-white/60 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.12)}>
            <SectionLabel>The Brandtelligence Solution</SectionLabel>
            <h2 className="text-white font-black text-3xl sm:text-4xl leading-tight mb-5">
              One platform.<br />
              <span className="bg-gradient-to-r from-bt-teal to-bt-orange bg-clip-text text-transparent">Everything connected.</span>
            </h2>
            <div className="space-y-3">
              {[
                'All marketing tools unified in one intelligent platform',
                'Real-time analytics across every channel and campaign',
                'Centralised brand kit accessible to every team member',
                'AI-powered reporting generated in seconds, not hours',
                'AI that learns your brand voice and improves with use',
              ].map(item => (
                <div key={item} className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/15">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-white/70 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          USP GRID
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-bt-purple/[0.04] border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <SectionLabel><Layers className="w-3.5 h-3.5" /> Platform Capabilities</SectionLabel>
            <h2 className="text-white font-black text-3xl sm:text-4xl mb-4">
              Everything your marketing team needs.<br />
              <span className="text-white/40">Nothing you don't.</span>
            </h2>
            <p className="text-white/55 max-w-xl mx-auto text-base leading-relaxed">
              Six integrated modules. One login. Infinite marketing power for your team.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {USPS.map(({ icon: Icon, title, desc, color, border, iconColor }, i) => (
              <motion.div key={title} {...fadeUp(i * 0.07)}
                whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                className={`relative bg-gradient-to-br ${color} border ${border} rounded-2xl p-6 cursor-default overflow-hidden group`}
              >
                <div className={`w-10 h-10 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center mb-4 ${iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{desc}</p>
                <div className="flex items-center gap-1.5 mt-4 text-xs font-semibold text-white/40 group-hover:text-bt-teal transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" /> Learn more
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div {...fadeUp(0)} className="text-center mb-14">
          <SectionLabel>Simple by Design</SectionLabel>
          <h2 className="text-white font-black text-3xl sm:text-4xl mb-4">Up and running in under 10 minutes.</h2>
          <p className="text-white/55 max-w-lg mx-auto text-base">No engineers needed. No migration headaches. Just marketing that works.</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Connect Your Brand', desc: 'Upload your brand kit — logos, colours, fonts, tone of voice guidelines. Brandtelligence learns your brand in minutes.' },
            { step: '02', title: 'Launch Your First Campaign', desc: 'Use the AI Studio to generate content, build your landing page, set up UTM tracking, and schedule posts — all from one place.' },
            { step: '03', title: 'Track, Optimise, Scale', desc: 'Real-time dashboards show exactly what\'s working. AI surfaces insights automatically. Scale what converts.' },
          ].map(({ step, title, desc }, i) => (
            <motion.div key={step} {...fadeUp(i * 0.1)} className="relative p-6 bg-white/[0.03] border border-white/[0.07] rounded-2xl">
              <div className="text-bt-teal/30 font-black text-5xl mb-3 leading-none">{step}</div>
              <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
              <p className="text-white/55 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          TESTIMONIALS
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-bt-purple/[0.04] border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <SectionLabel><Star className="w-3.5 h-3.5" /> Real Results</SectionLabel>
            <h2 className="text-white font-black text-3xl sm:text-4xl mb-4">Loved by marketing teams globally.</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ quote, name, role, rating, initial }, i) => (
              <motion.div key={name} {...fadeUp(i * 0.1)} className="p-6 bg-white/[0.04] border border-white/[0.08] rounded-2xl flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(rating)].map((_, j) => <Star key={j} className="w-4 h-4 text-bt-orange fill-bt-orange" />)}
                </div>
                <p className="text-white/70 text-sm leading-relaxed flex-1 mb-5">"{quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-bt-teal to-bt-teal-dark flex items-center justify-center text-white font-bold text-sm shrink-0">{initial}</div>
                  <div>
                    <p className="text-white font-semibold text-sm">{name}</p>
                    <p className="text-white/40 text-xs">{role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div {...fadeUp(0.3)} className="text-center mt-8">
            <Link to="/testimonials" className="inline-flex items-center gap-2 text-bt-teal font-semibold text-sm hover:text-bt-teal/80 transition-colors">
              Read more case studies <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          PRICING PREVIEW
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div {...fadeUp(0)} className="text-center mb-14">
          <SectionLabel>Transparent Pricing</SectionLabel>
          <h2 className="text-white font-black text-3xl sm:text-4xl mb-4">Simple plans. Serious results.</h2>
          <p className="text-white/55 max-w-lg mx-auto">Start free for 14 days. No credit card required. Cancel any time.</p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {PRICING_TIERS.map(({ name, price, period, tag, highlight, features }, i) => (
            <motion.div key={name} {...fadeUp(i * 0.08)}
              className={`relative rounded-2xl p-6 border flex flex-col ${highlight ? 'bg-gradient-to-b from-bt-teal/15 to-transparent border-bt-teal/40 shadow-xl shadow-bt-teal/10' : 'bg-white/[0.03] border-white/[0.08]'}`}
            >
              {tag && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-bt-orange text-white text-xs font-bold">{tag}</div>}
              <div className="mb-5">
                <p className="text-white/60 text-sm font-medium mb-1">{name}</p>
                <div className="flex items-end gap-1">
                  <span className="text-white font-black text-3xl">{price}</span>
                  <span className="text-white/40 text-sm mb-1">{period}</span>
                </div>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/65">
                    <CheckCircle className="w-4 h-4 text-bt-teal shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                to={name === 'Enterprise' ? '/contact' : '/request-access'}
                className={`block text-center px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${highlight ? 'bg-gradient-to-r from-bt-teal to-bt-teal-dark text-white shadow-lg shadow-bt-teal/30 hover:shadow-bt-teal/50' : 'border border-white/20 text-white hover:bg-white/8'}`}
              >
                {name === 'Enterprise' ? 'Contact Sales' : 'Start Free Trial'}
              </Link>
            </motion.div>
          ))}
        </div>
        <div className="text-center">
          <Link to="/pricing" className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
            See full feature comparison <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          BLOG PREVIEW
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 bg-bt-purple/[0.04] border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="flex items-center justify-between mb-10">
            <div>
              <SectionLabel>Latest Insights</SectionLabel>
              <h2 className="text-white font-black text-2xl sm:text-3xl mt-2">From the Brandtelligence blog.</h2>
            </div>
            <Link to="/blog" className="hidden sm:flex items-center gap-1.5 text-bt-teal hover:text-bt-teal/80 font-semibold text-sm transition-colors">
              All articles <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {BLOG_POSTS.map(({ category, title, date, readTime, gradient }, i) => (
              <motion.div key={title} {...fadeUp(i * 0.08)}
                whileHover={{ y: -5, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                className="group bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden cursor-pointer hover:border-white/[0.15] transition-colors"
              >
                <div className={`h-40 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <BookOpenIcon className="w-10 h-10 text-white/20" />
                </div>
                <div className="p-5">
                  <span className="text-bt-orange text-xs font-bold uppercase tracking-wider">{category}</span>
                  <h3 className="text-white font-bold text-base mt-2 mb-3 leading-snug group-hover:text-bt-teal transition-colors">{title}</h3>
                  <div className="flex items-center gap-3 text-white/35 text-xs">
                    <span>{date}</span>
                    <span>·</span>
                    <span>{readTime} read</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-bt-teal/8 blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] rounded-full bg-bt-purple/20 blur-[80px]" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <motion.div {...fadeUp(0)}>
            <SectionLabel><Zap className="w-3.5 h-3.5" /> 14-Day Free Trial</SectionLabel>
            <h2 className="text-white font-black text-4xl sm:text-5xl leading-tight mb-5">
              Ready to make your marketing<br />
              <span className="bg-gradient-to-r from-bt-teal to-bt-orange bg-clip-text text-transparent">work smarter?</span>
            </h2>
            <p className="text-white/55 text-lg mb-8 max-w-xl mx-auto">
              Join 1,200+ marketing teams already using Brandtelligence to create more, measure better, and grow faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/request-access" className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-bt-teal to-bt-teal-dark text-white font-bold text-base shadow-xl shadow-bt-teal/35 hover:shadow-bt-teal/55 hover:scale-[1.03] transition-all duration-200">
                Start Free — No Credit Card <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/contact" className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/20 text-white font-semibold text-base hover:bg-white/8 transition-all">
                Talk to Sales
              </Link>
            </div>
            <p className="text-white/30 text-xs mt-5">14-day free trial · No credit card · Cancel anytime · GDPR compliant</p>
          </motion.div>
        </div>
      </section>

      {/* Video modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl" onClick={() => setVideoModalOpen(false)}>
          <div className="w-full max-w-3xl bg-white/5 border border-white/15 rounded-2xl p-8 text-center" onClick={e => e.stopPropagation()}>
            <Play className="w-16 h-16 text-bt-teal mx-auto mb-4" />
            <h3 className="text-white font-bold text-xl mb-2">Product Demo</h3>
            <p className="text-white/50 text-sm mb-4">Full video demo coming soon. Book a live walkthrough with our team.</p>
            <Link to="/contact" onClick={() => setVideoModalOpen(false)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bt-teal text-white font-bold text-sm">
              Book Live Demo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}