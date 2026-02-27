/**
 * WebAboutPage — Mission, story, team, global presence
 */
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, Globe, Users, Zap, Star, Target, Shield } from 'lucide-react';

function fadeUp(delay = 0) {
  return { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5, delay } };
}

const VALUES = [
  { icon: Zap,    title: 'Move Fast, Stay Smart', desc: 'We ship constantly and learn from every data point. Speed without recklessness — that\'s the balance we live by.' },
  { icon: Shield, title: 'Trust by Default',       desc: 'Security and privacy are not afterthoughts. Every feature is built with data protection and auditability at its core.' },
  { icon: Users,  title: 'Customers First',        desc: 'Our roadmap is shaped by the marketers who use us every day. We\'re their platform — and we take that seriously.' },
  { icon: Globe,  title: 'Globally Minded',        desc: 'We build for every market, every culture, every compliance jurisdiction. Global first, local always.' },
  { icon: Star,   title: 'Obsess Over Quality',    desc: 'Good enough isn\'t good enough. We hold ourselves to a standard that makes our users proud to use Brandtelligence.' },
  { icon: Target, title: 'Outcome Oriented',       desc: 'Features don\'t matter — results do. We measure success by the ROI our customers generate, not by lines of code.' },
];

const TEAM = [
  { name: 'Amara Hassan',   role: 'Co-Founder & CEO',         initial: 'A', bg: 'from-bt-orange to-bt-orange-dark'   },
  { name: 'Daniel Lim',     role: 'Co-Founder & CTO',         initial: 'D', bg: 'from-bt-teal to-bt-teal-dark'       },
  { name: 'Priya Krishnan', role: 'VP of Product',            initial: 'P', bg: 'from-bt-purple to-[#2d2b5a]'        },
  { name: 'Marcus Ng',      role: 'VP of Engineering',        initial: 'M', bg: 'from-bt-teal to-bt-teal-dark'       },
  { name: 'Siti Rahman',    role: 'Head of Customer Success', initial: 'S', bg: 'from-rose-500 to-rose-600'          },
  { name: 'James Okafor',   role: 'Head of Sales & Growth',   initial: 'J', bg: 'from-bt-orange to-bt-orange-dark'   },
];

const MILESTONES = [
  { year: '2022', event: 'Founded in Kuala Lumpur with a mission to democratise AI for marketing teams.' },
  { year: '2023', event: 'Launched AI Content Studio. Reached 100 paying customers in 6 months.' },
  { year: '2024', event: 'Expanded to 20 countries. Launched multi-tenant enterprise platform. Series A funding secured.' },
  { year: '2025', event: '1,200+ marketing teams. 40+ countries. Named a top 10 MarTech platform in Southeast Asia.' },
];

const OFFICES = [
  { city: 'Kuala Lumpur', country: 'Malaysia',  flag: '🇲🇾', type: 'HQ'       },
  { city: 'Singapore',    country: 'Singapore', flag: '🇸🇬', type: 'APAC Hub' },
  { city: 'London',       country: 'UK',        flag: '🇬🇧', type: 'EMEA Hub' },
  { city: 'Dubai',        country: 'UAE',       flag: '🇦🇪', type: 'MEA Hub'  },
];

export function WebAboutPage() {
  return (
    <div className="text-white pt-16">

      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-bt-teal/7 blur-[130px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-bt-purple/15 blur-[100px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp(0)}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bt-orange/10 border border-bt-orange/20 text-bt-orange text-xs font-semibold mb-5">
              <Globe className="w-3.5 h-3.5" /> Our Story
            </div>
            <h1 className="text-white font-black text-4xl sm:text-5xl leading-tight mb-6">
              Built by marketers.<br />
              <span className="bg-gradient-to-r from-bt-teal to-bt-orange bg-clip-text text-transparent">For marketers.</span>
            </h1>
            <p className="text-white/55 text-xl leading-relaxed max-w-2xl">
              We started Brandtelligence because we were tired of watching brilliant marketing teams waste half their day on admin, tool-switching, and manual reporting. We knew AI could fix this — so we built the platform we wished existed.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-bt-purple/[0.04] border-y border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-10 items-center">
          <motion.div {...fadeUp(0)}>
            <p className="text-bt-teal text-xs font-bold uppercase tracking-widest mb-3">Our Mission</p>
            <h2 className="text-white font-black text-3xl sm:text-4xl leading-tight mb-5">
              To give every marketing team an unfair advantage.
            </h2>
            <p className="text-white/55 leading-relaxed">
              We believe the best marketing doesn't come from the biggest budget — it comes from the smartest team with the right tools. Brandtelligence exists to level the playing field: to give every marketing team — regardless of size, location, or budget — access to enterprise-grade AI and analytics that actually move the needle.
            </p>
          </motion.div>
          <motion.div {...fadeUp(0.1)}>
            <div className="grid grid-cols-2 gap-4">
              {[
                { stat: '1,200+', label: 'Marketing teams' },
                { stat: '40+',    label: 'Countries served' },
                { stat: '50M+',   label: 'Impressions tracked' },
                { stat: '98%',    label: 'Customer retention' },
              ].map(({ stat, label }) => (
                <div key={label} className="p-5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-center">
                  <p className="text-bt-teal font-black text-3xl">{stat}</p>
                  <p className="text-white/50 text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div {...fadeUp(0)} className="mb-10">
          <p className="text-bt-orange text-xs font-bold uppercase tracking-widest mb-3">Our Journey</p>
          <h2 className="text-white font-black text-3xl">From idea to global platform.</h2>
        </motion.div>
        <div className="relative space-y-8 pl-6 border-l border-white/[0.08]">
          {MILESTONES.map(({ year, event }, i) => (
            <motion.div key={year} {...fadeUp(i * 0.1)} className="relative">
              <div className="absolute -left-[29px] w-5 h-5 rounded-full bg-bt-teal border-4 border-[#06070f] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <p className="text-bt-teal font-black text-sm mb-1">{year}</p>
              <p className="text-white/65 text-sm leading-relaxed">{event}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-bt-purple/[0.04] border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="text-center mb-12">
            <p className="text-bt-orange text-xs font-bold uppercase tracking-widest mb-3">Our Values</p>
            <h2 className="text-white font-black text-3xl sm:text-4xl">What we believe in.</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {VALUES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} {...fadeUp(i * 0.08)} className="p-6 bg-white/[0.03] border border-white/[0.08] rounded-2xl hover:border-bt-teal/25 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-bt-teal/10 border border-bt-teal/20 flex items-center justify-center text-bt-teal mb-4 group-hover:bg-bt-teal/20 transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-white font-bold text-base mb-2">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div {...fadeUp(0)} className="text-center mb-12">
          <p className="text-bt-orange text-xs font-bold uppercase tracking-widest mb-3">The Team</p>
          <h2 className="text-white font-black text-3xl sm:text-4xl">The people behind the platform.</h2>
          <p className="text-white/50 mt-3 max-w-xl mx-auto">A diverse team of marketers, engineers, and builders united by one obsession: making marketing smarter.</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TEAM.map(({ name, role, initial, bg }, i) => (
            <motion.div key={name} {...fadeUp(i * 0.08)} className="flex items-center gap-4 p-5 bg-white/[0.03] border border-white/[0.08] rounded-2xl hover:border-bt-teal/20 transition-colors">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bg} flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg`}>
                {initial}
              </div>
              <div>
                <p className="text-white font-bold text-sm">{name}</p>
                <p className="text-white/45 text-xs mt-0.5">{role}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div {...fadeUp(0.4)} className="text-center mt-8" id="careers">
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-bt-teal/10 border border-bt-teal/20 text-bt-teal text-sm font-semibold">
            🚀 We're hiring — View open roles
          </div>
        </motion.div>
      </section>

      {/* Global presence */}
      <section className="py-20 bg-bt-purple/[0.04] border-y border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="text-center mb-10">
            <Globe className="w-8 h-8 text-bt-teal mx-auto mb-3" />
            <h2 className="text-white font-black text-3xl">Global infrastructure. Local commitment.</h2>
            <p className="text-white/50 mt-3 max-w-lg mx-auto">Offices across four continents. Data centres in three regions. Support in your timezone.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {OFFICES.map(({ city, country, flag, type }, i) => (
              <motion.div key={city} {...fadeUp(i * 0.08)} className="p-5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-center hover:border-bt-teal/20 transition-colors">
                <div className="text-3xl mb-2">{flag}</div>
                <p className="text-white font-bold">{city}</p>
                <p className="text-white/40 text-xs">{country}</p>
                <div className="mt-2 px-2 py-0.5 rounded-full bg-bt-orange/10 border border-bt-orange/20 text-bt-orange text-[10px] font-bold inline-block">{type}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-bt-teal/8 blur-[100px] rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[250px] bg-bt-purple/20 blur-[70px] rounded-full" />
        </div>
        <div className="relative max-w-2xl mx-auto px-4">
          <motion.div {...fadeUp(0)}>
            <h2 className="text-white font-black text-3xl sm:text-4xl mb-4">Join the team that's changing marketing.</h2>
            <p className="text-white/55 mb-7">Start your free trial or reach out to learn more about our mission and culture.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/request-access" className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-bt-teal to-bt-teal-dark text-white font-bold shadow-xl shadow-bt-teal/30 hover:scale-[1.03] transition-all">
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/contact" className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/8 transition-all">
                Contact Us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
