/**
 * WebFeaturesPage — Deep-dive feature showcase
 * Hero · Feature tabs · Detailed feature blocks · Integrations · CTA
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, BarChart2, Globe, Users, Shield, Target, Zap, CheckCircle,
  ArrowRight, Lock, Bell, FileText, Database, Layers, Code, RefreshCw,
} from 'lucide-react';

function fadeUp(delay = 0) {
  return { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5, delay } };
}

const TABS = [
  { id: 'ai',        label: 'AI Studio',   icon: Sparkles  },
  { id: 'analytics', label: 'Analytics',   icon: BarChart2 },
  { id: 'landing',   label: 'Pages',       icon: Globe     },
  { id: 'contacts',  label: 'Contacts',    icon: Users     },
  { id: 'brand',     label: 'Brand Kit',   icon: Target    },
  { id: 'security',  label: 'Security',    icon: Shield    },
];

const TAB_CONTENT: Record<string, { headline: string; sub: string; features: string[]; accent: string }> = {
  ai: {
    headline: 'AI Content Studio that speaks your brand.',
    sub: 'Generate blog posts, social captions, email sequences, ad copy, and video scripts — trained on your brand voice, tone guidelines, and past content.',
    features: ['Brand voice fine-tuning', 'Multi-language output (50+ languages)', 'Content calendar integration', 'One-click approval workflows', 'Plagiarism + brand compliance checks', 'Bulk content generation', 'SEO optimisation built in', 'Image prompt generation'],
    accent: 'orange',
  },
  analytics: {
    headline: 'Real-time analytics. Zero guesswork.',
    sub: 'Track UTM links, campaign performance, conversion funnels, lead attribution, and ROI across every channel — in a single live dashboard.',
    features: ['UTM builder & tracker', 'Multi-channel attribution', 'Conversion funnel visualisation', 'Real-time click analytics', 'Custom KPI dashboards', 'Automated performance reports', 'Lead source attribution', 'Export to PDF / CSV / API'],
    accent: 'sky',
  },
  landing: {
    headline: 'Landing pages and link-in-bio — in minutes.',
    sub: 'Drag-and-drop builder with mobile-first templates, A/B testing, conversion tracking, and custom domain support. No code required.',
    features: ['50+ conversion-optimised templates', 'A/B testing with statistical significance', 'Custom domain mapping', 'Pixel & conversion tracking', 'QR code generator', 'Link-in-bio pages', 'Form builder + lead capture', 'Instant page speed optimisation'],
    accent: 'teal',
  },
  contacts: {
    headline: 'CRM-lite contact management for marketers.',
    sub: 'Capture, segment, and nurture leads without leaving the platform. Sync with your favourite CRM or use ours for full lifecycle management.',
    features: ['Lead capture forms & popups', 'Contact segmentation & tagging', 'Lead scoring & qualification', 'Custom fields & properties', 'Automated email sequences', 'Import / export CSV', 'GDPR consent tracking', 'Activity timeline per contact'],
    accent: 'violet',
  },
  brand: {
    headline: 'One brand kit. Zero inconsistency.',
    sub: 'Store and distribute your logos, colour palettes, typography, approved imagery, and tone-of-voice guidelines in a central, always-accessible brand hub.',
    features: ['Logo library (all formats)', 'Colour palette management', 'Font management & embedding', 'Brand usage guidelines', 'Approved asset distribution', 'Version control for assets', 'Brand compliance checking (AI)', 'Per-team access controls'],
    accent: 'amber',
  },
  security: {
    headline: 'Enterprise-grade security. By default.',
    sub: 'Multi-tenant data isolation, role-based access control at every layer, full audit trails, MFA enforcement, and compliance-ready infrastructure.',
    features: ['SOC 2 Type II certified', 'Row-level data isolation per tenant', 'RBAC: Admin / Manager / Member / Viewer', 'MFA: TOTP + Magic Link', 'Full audit trail with actor tracking', 'GDPR / PDPA / CCPA ready', 'Data residency controls', 'SSO / SAML / SCIM (Enterprise)'],
    accent: 'rose',
  },
};

const INTEGRATIONS = [
  'Meta Ads', 'Google Ads', 'Google Analytics', 'Mailchimp', 'HubSpot', 'Salesforce',
  'Slack', 'Notion', 'Zapier', 'Make (Integromat)', 'Shopify', 'WordPress',
  'LinkedIn Ads', 'TikTok Ads', 'Canva', 'Figma', 'Airtable', 'Google Sheets',
];

const PLATFORM_FEATURES = [
  { icon: Lock,      title: 'Zero-Trust Security',       desc: 'Every API call is authenticated and authorised. Data never crosses tenant boundaries.' },
  { icon: Bell,      title: 'Real-Time Notifications',   desc: 'Instant alerts for campaign milestones, budget limits, lead captures, and approvals.' },
  { icon: FileText,  title: 'Automated Reporting',       desc: 'Schedule PDF reports to stakeholders. Data exports in CSV, JSON, or via webhook.' },
  { icon: Database,  title: 'Data Residency Controls',   desc: 'Choose where your data lives. EU, APAC, or US regions available on Enterprise.' },
  { icon: Layers,    title: 'Multi-Brand Management',    desc: 'Manage unlimited brands, clients, or sub-accounts from one unified dashboard.' },
  { icon: Code,      title: 'Developer API',             desc: 'Full REST API with webhooks, SDK support, and comprehensive documentation.' },
  { icon: RefreshCw, title: 'Live Data Sync',            desc: 'Connect your ad platforms and get live performance data without manual exports.' },
  { icon: Zap,       title: 'Workflow Automation',       desc: 'Build no-code automation flows: triggers, conditions, and actions across all modules.' },
];

const accentClasses: Record<string, { border: string; text: string; bg: string }> = {
  orange: { border: 'border-bt-orange/30', text: 'text-bt-orange', bg: 'bg-bt-orange/10' },
  sky:    { border: 'border-bt-teal/30',   text: 'text-bt-teal',   bg: 'bg-bt-teal/10'   },
  teal:   { border: 'border-bt-teal/30',   text: 'text-bt-teal',   bg: 'bg-bt-teal/10'   },
  violet: { border: 'border-bt-purple/40', text: 'text-bt-purple-light', bg: 'bg-bt-purple/20' },
  amber:  { border: 'border-bt-orange/30', text: 'text-bt-orange', bg: 'bg-bt-orange/10' },
  rose:   { border: 'border-rose-500/30',  text: 'text-rose-400',  bg: 'bg-rose-500/10'  },
};

export function WebFeaturesPage() {
  const [activeTab, setActiveTab] = useState('ai');
  const content = TAB_CONTENT[activeTab];
  const ac = accentClasses[content.accent];

  return (
    <div className="text-white pt-16">

      {/* Hero */}
      <section className="relative py-20 sm:py-28 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-bt-teal/7 blur-[130px] rounded-full" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4">
          <motion.div {...fadeUp(0)}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bt-orange/10 border border-bt-orange/20 text-bt-orange text-xs font-semibold mb-5">
              <Layers className="w-3.5 h-3.5" /> Full Feature Suite
            </div>
            <h1 className="text-white font-black text-4xl sm:text-5xl leading-tight mb-5">
              Every tool your marketing team<br />
              <span className="bg-gradient-to-r from-bt-teal to-bt-orange bg-clip-text text-transparent">will ever need.</span>
            </h1>
            <p className="text-white/55 text-lg leading-relaxed max-w-xl mx-auto">
              Six deeply integrated modules. One platform. Built to scale from a 5-person team to a 500-person agency.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Feature tabs */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Tab bar */}
        <motion.div {...fadeUp(0.05)} className="flex flex-wrap gap-2 justify-center mb-10">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${activeTab === id ? 'bg-bt-teal/15 border-bt-teal/40 text-bt-teal' : 'bg-white/[0.04] border-white/[0.09] text-white/55 hover:text-white hover:bg-white/[0.07]'}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`rounded-2xl border ${ac.border} bg-white/[0.02] p-8 lg:p-12`}
          >
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-white font-black text-2xl sm:text-3xl mb-4 leading-tight">{content.headline}</h2>
                <p className="text-white/55 leading-relaxed mb-7">{content.sub}</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {content.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle className={`w-4 h-4 ${ac.text} shrink-0 mt-0.5`} />
                      <span className="text-white/65 text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/request-access" className={`inline-flex items-center gap-2 mt-7 px-5 py-2.5 rounded-xl ${ac.bg} border ${ac.border} ${ac.text} font-bold text-sm hover:opacity-80 transition-opacity`}>
                  Try this feature free <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {/* Visual mockup */}
              <div className={`rounded-xl ${ac.bg} border ${ac.border} p-6 min-h-[200px] flex items-center justify-center`}>
                <div className="text-center">
                  {TABS.find(t => t.id === activeTab) && (
                    <>
                      {(() => { const T = TABS.find(t => t.id === activeTab)!; return <T.icon className={`w-16 h-16 ${ac.text} mx-auto mb-3 opacity-60`} />; })()}
                    </>
                  )}
                  <p className={`${ac.text} font-bold text-sm`}>{content.headline.split('.')[0]}</p>
                  <p className="text-white/30 text-xs mt-1">Interactive preview coming soon</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Platform features */}
      <section className="py-20 bg-white/[0.015] border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="text-center mb-12">
            <h2 className="text-white font-black text-3xl mb-3">Platform-wide capabilities.</h2>
            <p className="text-white/50 max-w-xl mx-auto">These power every module — built into the foundation of Brandtelligence.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLATFORM_FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} {...fadeUp(i * 0.06)} className="p-5 bg-white/[0.03] border border-white/[0.08] rounded-xl hover:border-bt-teal/25 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-bt-teal/10 border border-bt-teal/20 flex items-center justify-center text-bt-teal mb-4 group-hover:bg-bt-teal/20 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-white font-semibold text-sm mb-1.5">{title}</p>
                <p className="text-white/45 text-xs leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8" id="integrations">
        <motion.div {...fadeUp(0)} className="text-center mb-10">
          <h2 className="text-white font-black text-3xl mb-3">Connects with your entire stack.</h2>
          <p className="text-white/50">Native integrations with 50+ tools and a full API for anything else.</p>
        </motion.div>
        <div className="flex flex-wrap gap-3 justify-center">
          {INTEGRATIONS.map((name, i) => (
            <motion.div key={name} {...fadeUp(i * 0.04)} className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.09] text-white/60 text-sm font-medium hover:border-bt-teal/30 hover:text-bt-teal transition-all cursor-default">
              {name}
            </motion.div>
          ))}
          <motion.div {...fadeUp(0.5)} className="px-4 py-2.5 rounded-xl bg-bt-orange/10 border border-bt-orange/20 text-bt-orange text-sm font-bold">
            + 30 more →
          </motion.div>
        </div>
      </section>

      {/* Security section */}
      <section className="py-20 bg-white/[0.015] border-y border-white/[0.06]" id="security">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeUp(0)}>
            <Shield className="w-10 h-10 text-bt-teal mx-auto mb-4" />
            <h2 className="text-white font-black text-3xl mb-4">Security and compliance, built in.</h2>
            <p className="text-white/55 max-w-2xl mx-auto mb-8 leading-relaxed">
              We built Brandtelligence from the ground up with enterprise-grade security and global privacy compliance. Your data is yours — always isolated, always encrypted, always auditable.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
              {[
                { label: 'SOC 2 Type II',      desc: 'Annually audited by independent assessors.' },
                { label: 'GDPR / PDPA Ready',  desc: 'Data subject rights, DPA available, consent management.' },
                { label: 'AES-256 Encryption', desc: 'All data encrypted at rest and in transit via TLS 1.3.' },
                { label: '99.9% Uptime SLA',   desc: 'Enterprise SLA with dedicated incident response.' },
              ].map(({ label, desc }) => (
                <div key={label} className="p-4 bg-rose-500/[0.05] border border-rose-500/15 rounded-xl">
                  <Shield className="w-4 h-4 text-rose-400 mb-2" />
                  <p className="text-white font-semibold text-sm mb-1">{label}</p>
                  <p className="text-white/45 text-xs">{desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-bt-teal/8 blur-[100px] rounded-full" /></div>
        <div className="relative max-w-2xl mx-auto px-4">
          <motion.div {...fadeUp(0)}>
            <h2 className="text-white font-black text-3xl sm:text-4xl mb-4">Explore all features — free for 14 days.</h2>
            <p className="text-white/55 mb-7">No credit card. No commitment. Just powerful marketing tools ready to use from day one.</p>
            <Link to="/request-access" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-bt-teal to-bt-teal-dark text-white font-bold shadow-xl shadow-bt-teal/30 hover:scale-[1.03] transition-all">
              Start Your Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}