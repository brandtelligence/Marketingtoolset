/**
 * WebTestimonialsPage — Case studies + testimonials
 */
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Star, ArrowRight, TrendingUp, Users, BarChart2, Zap } from 'lucide-react';

function fadeUp(delay = 0) {
  return { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5, delay } };
}

const CASE_STUDIES = [
  {
    company: 'Luxe Commerce Group',
    industry: 'E-Commerce',
    logo: 'L',
    bg: 'from-bt-orange to-bt-orange-dark',
    tagline: '70% reduction in content production time.',
    challenge: 'Luxe Commerce was producing content for 8 brands across 4 countries. Their 12-person marketing team was spending 60% of their time on content creation and manual approvals.',
    solution: 'Deployed Brandtelligence AI Content Studio with brand voice training for each brand. Implemented automated approval workflows and content calendars.',
    results: [
      { metric: '70%', label: 'Reduction in content production time' },
      { metric: '4×',  label: 'Increase in content output' },
      { metric: '92%', label: 'Brand compliance score (up from 61%)' },
    ],
    quote: 'Brandtelligence cut our content production time by 70%. The AI Studio is genuinely remarkable — it understands our brand voice better than some copywriters we\'ve hired.',
    author: 'Sarah Lim',
    authorRole: 'CMO, Luxe Commerce Group',
  },
  {
    company: 'Apex Financial',
    industry: 'Financial Services',
    logo: 'A',
    bg: 'from-bt-teal to-bt-teal-dark',
    tagline: '312% ROI from campaign analytics insights.',
    challenge: 'Apex was running campaigns across 6 channels with no unified analytics. Campaign performance was assessed monthly from spreadsheets, making real-time optimisation impossible.',
    solution: 'Implemented Brandtelligence Campaign Analytics with UTM tracking, live attribution, and automated reporting. Connected Google Ads, Meta, and LinkedIn Ads.',
    results: [
      { metric: '312%', label: 'ROI improvement in Q2 2024' },
      { metric: '45%',  label: 'Reduction in cost per lead' },
      { metric: '8 hrs',label: 'Reporting time saved per week' },
    ],
    quote: 'The analytics dashboard alone is worth the subscription. We finally have real-time visibility into what every campaign is actually generating — no more guesswork.',
    author: 'Arif Rahman',
    authorRole: 'Head of Digital, Apex Financial',
  },
  {
    company: 'Meridian Agency',
    industry: 'Marketing Agency',
    logo: 'M',
    bg: 'from-bt-purple to-[#2d2b5a]',
    tagline: 'Managing 30+ clients from one platform.',
    challenge: 'Meridian Agency was managing 30+ clients with a different platform for each. Onboarding new clients took 2 weeks and managing assets across teams was a constant headache.',
    solution: 'Deployed Brandtelligence Enterprise with multi-tenant architecture. Each client gets isolated data, their own brand kit, and dedicated team permissions.',
    results: [
      { metric: '30+',  label: 'Client brands managed from one platform' },
      { metric: '80%',  label: 'Reduction in client onboarding time' },
      { metric: '2.3×', label: 'Increase in clients served per team member' },
    ],
    quote: 'We manage 30+ client brands on a single Brandtelligence instance. The multi-tenant architecture means perfect data isolation with zero overhead for our ops team.',
    author: 'Priya Nair',
    authorRole: 'Founder & CEO, Meridian Agency',
  },
];

const ALL_TESTIMONIALS = [
  { name: 'Kevin Tan',     role: 'Marketing Director, Pinnacle Retail',    rating: 5, quote: 'The landing page builder converted at 11% — double our previous average. We set it up in under an hour.' },
  { name: 'Jasmine Wu',    role: 'Content Lead, ByteNova',                 rating: 5, quote: 'AI Studio generates content in our exact brand voice. Our team thought I had hired two extra writers.' },
  { name: 'Raj Patel',     role: 'CEO, Velocity Marketing',                rating: 5, quote: 'Brandtelligence replaced 6 different SaaS tools. We cut our software spend by 40%.' },
  { name: 'Ana Santos',    role: 'Digital Manager, EcoWave Brasil',        rating: 5, quote: 'The multi-language support is exceptional. We publish in 4 languages without any extra effort.' },
  { name: 'David Chen',    role: 'Head of Performance, Krona Group',       rating: 5, quote: 'UTM tracking and attribution is finally accurate. We know exactly which campaigns drive revenue.' },
  { name: 'Layla Hassan',  role: 'Brand Manager, Gulf Horizon',            rating: 5, quote: 'The brand kit manager is something we didn\'t know we needed. Brand consistency went from good to perfect.' },
  { name: 'Thomas Müller', role: 'CTO, Spark Digital DE',                  rating: 5, quote: 'Enterprise security and GDPR compliance were our top requirements. Brandtelligence checked every box.' },
  { name: 'Fatima Al-Amri',role: 'VP Marketing, Crescent Ventures',        rating: 5, quote: 'Onboarding took 3 hours. ROI was measurable within the first week. I recommend it to everyone I know.' },
  { name: 'Marcus Bell',   role: 'Growth Manager, FlexWork Solutions',     rating: 5, quote: 'Contact management + email sequences in one platform means we don\'t need a separate CRM anymore.' },
];

export function WebTestimonialsPage() {
  return (
    <div className="text-white pt-16">

      {/* Hero */}
      <section className="relative py-20 sm:py-28 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-bt-teal/8 blur-[130px] rounded-full" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4">
          <motion.div {...fadeUp(0)}>
            <div className="flex justify-center gap-0.5 mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-bt-orange fill-bt-orange" />)}
            </div>
            <h1 className="text-white font-black text-4xl sm:text-5xl leading-tight mb-4">
              Real brands. Real results.
            </h1>
            <p className="text-white/55 text-lg max-w-xl mx-auto">
              Discover how 1,200+ marketing teams across 40+ countries use Brandtelligence to grow faster, work smarter, and deliver measurable results.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4">
          {[
            { icon: Users,    value: '1,200+', label: 'Marketing Teams' },
            { icon: TrendingUp,value: '10×',   label: 'Average ROI Lift' },
            { icon: Star,     value: '4.9/5',  label: 'Average Rating'   },
            { icon: BarChart2, value: '98%',   label: 'Retention Rate'   },
          ].map(({ icon: Icon, value, label }, i) => (
            <div key={label} className={`py-8 px-4 text-center ${i < 3 ? 'border-r border-white/[0.06]' : ''}`}>
              <Icon className="w-5 h-5 text-bt-teal mx-auto mb-2" />
              <p className="text-white font-black text-2xl">{value}</p>
              <p className="text-white/45 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Case studies */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div {...fadeUp(0)} className="mb-12">
          <h2 className="text-white font-black text-3xl sm:text-4xl">Case Studies</h2>
          <p className="text-white/50 mt-2">In-depth results from customers who transformed their marketing with Brandtelligence.</p>
        </motion.div>

        <div className="space-y-10">
          {CASE_STUDIES.map(({ company, industry, logo, bg, tagline, challenge, solution, results, quote, author, authorRole }, i) => (
            <motion.div key={company} {...fadeUp(i * 0.08)} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="grid lg:grid-cols-3">

                {/* Left: company info */}
                <div className="p-8 border-r border-white/[0.06] bg-white/[0.02]">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${bg} flex items-center justify-center text-white font-black text-xl mb-4 shadow-lg`}>
                    {logo}
                  </div>
                  <p className="text-white font-bold text-lg">{company}</p>
                  <p className="text-white/40 text-sm mb-4">{industry}</p>
                  <p className="text-bt-orange font-bold text-base leading-snug">{tagline}</p>
                  <div className="mt-6 space-y-4">
                    {results.map(({ metric, label }) => (
                      <div key={label}>
                        <p className="text-white font-black text-2xl text-bt-teal">{metric}</p>
                        <p className="text-white/50 text-xs">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: story + quote */}
                <div className="lg:col-span-2 p-8">
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">The Challenge</p>
                      <p className="text-white/65 text-sm leading-relaxed">{challenge}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">The Solution</p>
                      <p className="text-white/65 text-sm leading-relaxed">{solution}</p>
                    </div>
                  </div>
                  <div className="p-5 bg-bt-teal/[0.07] border border-bt-teal/20 rounded-xl">
                    <div className="flex gap-0.5 mb-3">
                      {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 text-bt-orange fill-bt-orange" />)}
                    </div>
                    <p className="text-white/80 text-sm italic leading-relaxed mb-4">"{quote}"</p>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${bg} flex items-center justify-center text-white font-bold text-xs shrink-0`}>{logo}</div>
                      <div>
                        <p className="text-white font-semibold text-sm">{author}</p>
                        <p className="text-white/40 text-xs">{authorRole}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonial grid */}
      <section className="py-20 bg-white/[0.015] border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="text-center mb-12">
            <h2 className="text-white font-black text-3xl">What customers say.</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ALL_TESTIMONIALS.map(({ name, role, rating, quote }, i) => (
              <motion.div key={name} {...fadeUp(i * 0.06)} className="p-5 bg-white/[0.04] border border-white/[0.08] rounded-2xl flex flex-col hover:border-bt-teal/20 transition-colors">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(rating)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 text-bt-orange fill-bt-orange" />)}
                </div>
                <p className="text-white/70 text-sm leading-relaxed flex-1 mb-4">"{quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bt-teal to-bt-teal-dark flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{name}</p>
                    <p className="text-white/35 text-xs">{role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-bt-teal/8 blur-[100px] rounded-full" /></div>
        <div className="relative max-w-2xl mx-auto px-4">
          <motion.div {...fadeUp(0)}>
            <Zap className="w-10 h-10 text-bt-teal mx-auto mb-4" />
            <h2 className="text-white font-black text-3xl sm:text-4xl mb-4">Your success story starts here.</h2>
            <p className="text-white/55 mb-7">Join 1,200+ marketing teams already delivering measurable results with Brandtelligence.</p>
            <Link to="/request-access" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-bt-teal to-bt-teal-dark text-white font-bold shadow-xl shadow-bt-teal/30 hover:scale-[1.03] transition-all">
              Start Free — No Credit Card <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}