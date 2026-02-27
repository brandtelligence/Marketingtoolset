/**
 * WebProductPage — Deep product showcase
 * Hero · Module deep-dives · Feature callouts · Social proof · CTA
 */
import { Link } from 'react-router';
import { motion } from 'motion/react';
import {
  Sparkles, BarChart2, Globe, Users, Shield, Target, Zap,
  CheckCircle, ArrowRight, Star, Layers,
} from 'lucide-react';

function fadeUp(delay = 0) {
  return { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5, delay } };
}

const MODULES = [
  {
    id: 'ai-studio',
    icon: Sparkles,
    tag: 'AI Studio',
    headline: 'Write less. Create more. Stay on brand.',
    body: 'The AI Content Studio is the fastest way to produce high-quality marketing content at scale. Train it on your brand voice, give it a brief, and watch it generate copy that sounds exactly like you — across every format and language.',
    bullets: [
      'On-brand copy in 50+ languages',
      'Blog posts, emails, ads, captions & scripts',
      'Tone-of-voice fine-tuning per brand',
      'Approval workflow & content calendar',
      'SEO scoring & keyword integration',
      'Bulk generation for campaign launches',
    ],
    gradient: 'from-bt-orange/15 to-bt-orange/5',
    border: 'border-bt-orange/25',
    iconColor: 'text-bt-orange',
    iconBg: 'bg-bt-orange/15',
    flip: false,
  },
  {
    id: 'analytics',
    icon: BarChart2,
    tag: 'Campaign Analytics',
    headline: 'Real-time ROI. Across every channel.',
    body: 'Stop stitching together reports from 10 different dashboards. Brandtelligence pulls performance data from every ad platform, email tool, and landing page into one live view — with automatic attribution and AI-powered insights.',
    bullets: [
      'UTM link builder + click tracker',
      'Multi-channel attribution modelling',
      'Live campaign performance dashboard',
      'Conversion funnel & drop-off analysis',
      'Automated weekly performance emails',
      'Custom KPI builder & white-label reports',
    ],
    gradient: 'from-bt-teal/15 to-bt-teal/5',
    border: 'border-bt-teal/25',
    iconColor: 'text-bt-teal',
    iconBg: 'bg-bt-teal/15',
    flip: true,
  },
  {
    id: 'landing-pages',
    icon: Globe,
    tag: 'Landing Page Builder',
    headline: 'Pages that load fast. Pages that convert.',
    body: 'Build stunning, conversion-optimised landing pages without writing a line of code. Choose from 50+ templates, customise with your brand, add your tracking pixels, run A/B tests, and connect a custom domain — all in one place.',
    bullets: [
      '50+ mobile-first templates',
      'Drag-and-drop visual editor',
      'A/B testing with auto-winner selection',
      'Custom domain mapping',
      'Conversion tracking & heatmaps',
      'Link-in-bio & QR code pages',
    ],
    gradient: 'from-bt-teal/15 to-bt-teal/5',
    border: 'border-bt-teal/25',
    iconColor: 'text-bt-teal',
    iconBg: 'bg-bt-teal/15',
    flip: false,
  },
  {
    id: 'crm',
    icon: Users,
    tag: 'Contact Management',
    headline: 'From first click to loyal customer.',
    body: 'Capture leads from your landing pages and forms, score them automatically, segment by behaviour, and trigger email sequences without switching tools. Full lifecycle contact management built for marketers — not sales engineers.',
    bullets: [
      'Lead capture forms & popups',
      'Contact scoring & segmentation',
      'Automated email nurture sequences',
      'GDPR consent tracking per contact',
      'Activity timeline & touchpoint history',
      'CRM export to HubSpot, Salesforce & more',
    ],
    gradient: 'from-bt-purple/30 to-bt-purple/15',
    border: 'border-bt-purple/40',
    iconColor: 'text-bt-purple-light',
    iconBg: 'bg-bt-purple/20',
    flip: true,
  },
  {
    id: 'brand-kit',
    icon: Target,
    tag: 'Brand Kit Manager',
    headline: 'Your brand, always consistent. Always accessible.',
    body: 'A centralised hub for every brand asset your team needs. Logos in every format, colour palettes, approved typography, imagery libraries, and tone-of-voice guidelines — all version-controlled and instantly shareable.',
    bullets: [
      'Logo library (SVG, PNG, EPS, PDF)',
      'Colour palette with HEX, RGB, CMYK',
      'Typography management & web fonts',
      'Approved image & asset library',
      'Brand usage guidelines (interactive)',
      'AI compliance checking against guidelines',
    ],
    gradient: 'from-bt-orange/15 to-bt-orange/5',
    border: 'border-bt-orange/25',
    iconColor: 'text-bt-orange',
    iconBg: 'bg-bt-orange/15',
    flip: false,
  },
  {
    id: 'assets',
    icon: Shield,
    tag: 'Social Asset Library',
    headline: 'Organise, find, and distribute creative assets instantly.',
    body: 'A searchable, tag-organised media library for every social media asset your team creates. Upload from Canva or Figma, add metadata, assign to campaigns, and distribute with one click — with full audit trail.',
    bullets: [
      'Drag-and-drop upload (all formats)',
      'Auto-tagging via AI image recognition',
      'Campaign & channel folder structure',
      'Team access controls per folder',
      'Version history & approval states',
      'Canva & Figma integration',
    ],
    gradient: 'from-rose-500/15 to-pink-500/5',
    border: 'border-rose-500/25',
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/15',
    flip: true,
  },
];

export function WebProductPage() {
  return (
    <div className="text-white pt-16">

      {/* Hero */}
      <section className="relative py-20 sm:py-28 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-bt-teal/8 blur-[140px]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full bg-bt-purple/15 blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-4">
          <motion.div {...fadeUp(0)}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bt-orange/10 border border-bt-orange/20 text-bt-orange text-xs font-semibold mb-5">
              <Layers className="w-3.5 h-3.5" /> The Platform
            </div>
            <h1 className="text-white font-black text-4xl sm:text-5xl leading-tight mb-5">
              One platform.<br />
              <span className="bg-gradient-to-r from-bt-teal to-bt-orange bg-clip-text text-transparent">Six unfair advantages.</span>
            </h1>
            <p className="text-white/55 text-lg max-w-xl mx-auto leading-relaxed mb-8">
              Brandtelligence replaces your fragmented marketing stack with a single, AI-powered platform that your whole team will actually use.
            </p>
            {/* Module nav pills */}
            <div className="flex flex-wrap gap-2 justify-center">
              {MODULES.map(m => (
                <a key={m.id} href={`#${m.id}`} className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.09] text-white/55 text-xs font-medium hover:text-bt-teal hover:border-bt-teal/30 transition-all">
                  {m.tag}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Module deep-dives */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 pb-20">
        {MODULES.map(({ id, icon: Icon, tag, headline, body, bullets, gradient, border, iconColor, iconBg, flip }, i) => (
          <motion.section key={id} id={id} {...fadeUp(0.05)}>
            <div className={`grid lg:grid-cols-2 gap-10 items-center ${flip ? 'lg:grid-flow-col-dense' : ''}`}>

              {/* Copy */}
              <div className={flip ? 'lg:col-start-2' : ''}>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border mb-5 ${iconBg} ${border} ${iconColor}`}>
                  <Icon className="w-3.5 h-3.5" /> {tag}
                </div>
                <h2 className="text-white font-black text-2xl sm:text-3xl leading-tight mb-4">{headline}</h2>
                <p className="text-white/55 leading-relaxed mb-6">{body}</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {bullets.map(b => (
                    <li key={b} className="flex items-start gap-2.5">
                      <CheckCircle className={`w-4 h-4 ${iconColor} shrink-0 mt-0.5`} />
                      <span className="text-white/65 text-sm">{b}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/request-access" className={`inline-flex items-center gap-2 mt-7 px-5 py-2.5 rounded-xl font-bold text-sm border ${iconBg} ${border} ${iconColor} hover:opacity-80 transition-opacity`}>
                  Try {tag} free <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Visual card */}
              <div className={flip ? 'lg:col-start-1' : ''}>
                <div className={`bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-8 min-h-[280px] flex items-center justify-center relative overflow-hidden`}>
                  <div className="text-center relative z-10">
                    <div className={`w-16 h-16 rounded-2xl ${iconBg} border ${border} flex items-center justify-center mx-auto mb-4`}>
                      <Icon className={`w-8 h-8 ${iconColor}`} />
                    </div>
                    <p className={`${iconColor} font-black text-lg mb-2`}>{tag}</p>
                    <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                      {bullets.slice(0, 3).map(b => (
                        <span key={b} className="px-2 py-1 rounded-md text-[11px] font-medium bg-black/30 border border-white/10 text-white/50">{b.split(' ')[0]} {b.split(' ')[1]}</span>
                      ))}
                    </div>
                  </div>
                  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full border border-white/5" />
                  <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full border border-white/5" />
                </div>
              </div>

            </div>
            {i < MODULES.length - 1 && <div className="mt-16 border-b border-white/[0.05]" />}
          </motion.section>
        ))}
      </div>

      {/* Social proof strip */}
      <section className="py-20 bg-bt-purple/[0.04] border-y border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div {...fadeUp(0)}>
            <div className="flex justify-center gap-0.5 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 text-bt-orange fill-bt-orange" />)}
            </div>
            <p className="text-white font-bold text-xl sm:text-2xl mb-2">"Brandtelligence is the Notion of marketing platforms — it does everything, beautifully."</p>
            <p className="text-white/40 text-sm">— Marina Tan, Head of Marketing, TechScale Asia</p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-bt-teal/8 blur-[120px] rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[250px] bg-bt-purple/20 blur-[80px] rounded-full" />
        </div>
        <div className="relative max-w-2xl mx-auto px-4">
          <motion.div {...fadeUp(0)}>
            <Zap className="w-10 h-10 text-bt-teal mx-auto mb-4" />
            <h2 className="text-white font-black text-3xl sm:text-4xl mb-4">See the full platform in action.</h2>
            <p className="text-white/55 mb-7">Book a 30-minute live demo with one of our marketing specialists. We'll show you exactly how Brandtelligence will work for your team.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/request-access" className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-bt-teal to-bt-teal-dark text-white font-bold shadow-xl shadow-bt-teal/30 hover:scale-[1.03] transition-all">
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/contact" className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/8 transition-all">
                Book Live Demo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
