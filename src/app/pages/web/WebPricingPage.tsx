/**
 * WebPricingPage — Conversion-optimised pricing
 * Toggle · 3-tier cards · Comparison table · FAQ · CTA
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, X, ArrowRight, Zap, ChevronDown, Star } from 'lucide-react';

function fadeUp(delay = 0) {
  return { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5, delay } };
}

const TIERS = [
  {
    name: 'Starter',
    desc: 'Perfect for small teams getting started with AI marketing.',
    monthly: 399, annual: 319,
    tag: null, highlight: false,
    cta: 'Start Free Trial',
    features: [
      '5 team members',
      'AI Content Studio — 50 credits/mo',
      'Landing page builder (3 pages)',
      'Basic UTM analytics',
      'Lead capture forms (500 submissions)',
      'Brand kit (1 brand)',
      'Email support',
      '1 GB storage',
    ],
  },
  {
    name: 'Growth',
    desc: 'For growing businesses that need the full AI marketing suite.',
    monthly: 999, annual: 799,
    tag: 'Most Popular', highlight: true,
    cta: 'Start Free Trial',
    features: [
      '25 team members',
      'AI Content Studio — unlimited',
      'Landing pages — unlimited + A/B testing',
      'Real-time UTM analytics & attribution',
      'Contact management (10,000 contacts)',
      'Social media asset library',
      'Brand kit (5 brands)',
      'QR code generator',
      'Priority email & chat support',
      '50 GB storage',
    ],
  },
  {
    name: 'Enterprise',
    desc: 'Full platform power for agencies and enterprise marketing teams.',
    monthly: null, annual: null,
    tag: null, highlight: false,
    cta: 'Contact Sales',
    features: [
      'Unlimited team members',
      'Unlimited AI content (fine-tuned model)',
      'Multi-tenant client management',
      'Custom SLA & dedicated infrastructure',
      'SSO / SAML / SCIM provisioning',
      'Custom RBAC & approval workflows',
      'Full audit trail & compliance exports',
      'API access & webhooks',
      'Dedicated customer success manager',
      'Unlimited storage',
    ],
  },
];

const COMPARISON: { feature: string; starter: boolean | string; growth: boolean | string; enterprise: boolean | string }[] = [
  { feature: 'Team members',            starter: '5',          growth: '25',        enterprise: 'Unlimited' },
  { feature: 'AI content credits',      starter: '50/mo',      growth: 'Unlimited', enterprise: 'Unlimited + fine-tuning' },
  { feature: 'Landing pages',           starter: '3',          growth: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'A/B testing',             starter: false,        growth: true,        enterprise: true },
  { feature: 'UTM analytics',           starter: 'Basic',      growth: 'Full',      enterprise: 'Full + API' },
  { feature: 'Contact management',      starter: '500',        growth: '10,000',    enterprise: 'Unlimited' },
  { feature: 'Brand kits',              starter: '1',          growth: '5',         enterprise: 'Unlimited' },
  { feature: 'Social asset library',    starter: false,        growth: true,        enterprise: true },
  { feature: 'QR code generator',       starter: false,        growth: true,        enterprise: true },
  { feature: 'API access',              starter: false,        growth: false,       enterprise: true },
  { feature: 'SSO / SAML',             starter: false,        growth: false,       enterprise: true },
  { feature: 'Multi-tenant management', starter: false,        growth: false,       enterprise: true },
  { feature: 'Audit trail',             starter: false,        growth: 'Basic',     enterprise: 'Full + Export' },
  { feature: 'Support',                 starter: 'Email',      growth: 'Priority',  enterprise: 'Dedicated CSM' },
  { feature: 'Storage',                 starter: '1 GB',       growth: '50 GB',     enterprise: 'Unlimited' },
  { feature: 'Uptime SLA',              starter: '99.5%',      growth: '99.9%',     enterprise: 'Custom SLA' },
];

const FAQS = [
  { q: 'Is there a free trial?', a: 'Yes — all paid plans come with a 14-day free trial. No credit card is required to start. You get full access to all features in your chosen plan during the trial.' },
  { q: 'Can I change plans at any time?', a: 'Absolutely. You can upgrade or downgrade your plan at any time. Upgrades take effect immediately; downgrades apply at the next billing cycle.' },
  { q: 'What counts as an AI content credit?', a: 'One credit generates one piece of AI content — a social caption, an email subject line, a blog paragraph, or a product description. Credits reset monthly on your billing date.' },
  { q: 'How does the multi-tenant model work?', a: 'On the Enterprise plan, your organisation can manage multiple client tenants from a single admin panel. Each tenant has fully isolated data, users, and branding.' },
  { q: 'Is my data secure and GDPR compliant?', a: 'Yes. All data is stored in Supabase with row-level security, encrypted at rest and in transit. We are GDPR, PDPA, and CCPA compliant. Enterprise clients receive a Data Processing Agreement (DPA).' },
  { q: 'Do you offer discounts for agencies or NGOs?', a: 'Yes. We offer a 20% discount for registered agencies managing 3+ client tenants, and a special NGO pricing tier. Contact our sales team for details.' },
];

export function WebPricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="text-white pt-16">

      {/* Hero */}
      <section className="relative py-20 sm:py-28 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-bt-teal/8 blur-[120px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4">
          <motion.div {...fadeUp(0)}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bt-orange/10 border border-bt-orange/20 text-bt-orange text-xs font-semibold mb-5">
              <Zap className="w-3.5 h-3.5" /> Transparent Pricing — No Hidden Fees
            </div>
            <h1 className="text-white font-black text-4xl sm:text-5xl leading-tight mb-4">
              Simple pricing.<br />
              <span className="bg-gradient-to-r from-bt-teal to-bt-orange bg-clip-text text-transparent">Serious marketing power.</span>
            </h1>
            <p className="text-white/55 text-lg mb-8 max-w-xl mx-auto">
              14-day free trial on all plans. No credit card required. Cancel anytime.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 bg-white/[0.06] border border-white/[0.1] rounded-xl p-1">
              <button onClick={() => setAnnual(false)} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${!annual ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}>Monthly</button>
              <button onClick={() => setAnnual(true)}  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${annual  ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}>
                Annual
              </button>
              {annual && <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold mr-1">Save 20%</div>}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tier cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map(({ name, desc, monthly, annual: ann, tag, highlight, cta, features }, i) => (
            <motion.div key={name} {...fadeUp(i * 0.1)}
              className={`relative rounded-2xl p-7 border flex flex-col ${highlight ? 'bg-gradient-to-b from-bt-teal/15 to-transparent border-bt-teal/40 shadow-2xl shadow-bt-teal/10 scale-[1.02]' : 'bg-white/[0.03] border-white/[0.08]'}`}
            >
              {tag && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-bt-orange text-white text-xs font-bold shadow-lg shadow-bt-orange/30">{tag}</div>}
              <div className="mb-5">
                <p className="text-white font-bold text-lg mb-1">{name}</p>
                <p className="text-white/45 text-sm mb-4">{desc}</p>
                <AnimatePresence mode="wait">
                  <motion.div key={annual ? 'ann' : 'mon'} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    {monthly ? (
                      <div className="flex items-end gap-1">
                        <span className="text-white font-black text-4xl">RM {annual ? ann : monthly}</span>
                        <span className="text-white/40 text-sm mb-1.5">/month{annual ? ', billed annually' : ''}</span>
                      </div>
                    ) : (
                      <span className="text-white font-black text-3xl">Custom pricing</span>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-bt-teal shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>

              <Link
                to={name === 'Enterprise' ? '/contact' : '/request-access'}
                className={`block text-center px-5 py-3 rounded-xl font-bold text-sm transition-all ${highlight ? 'bg-gradient-to-r from-bt-teal to-bt-teal-dark text-white shadow-lg shadow-bt-teal/30 hover:shadow-bt-teal/50 hover:scale-[1.02]' : 'border border-white/20 text-white hover:bg-white/8'}`}
              >
                {cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-20 bg-white/[0.015] border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="text-center mb-10">
            <h2 className="text-white font-black text-3xl mb-2">Full feature comparison.</h2>
            <p className="text-white/50 text-sm">See exactly what's included in every plan.</p>
          </motion.div>
          <motion.div {...fadeUp(0.1)} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left pb-4 text-white/40 font-medium w-[40%]">Feature</th>
                  {['Starter', 'Growth', 'Enterprise'].map(t => (
                    <th key={t} className={`pb-4 font-bold text-center ${t === 'Growth' ? 'text-bt-teal' : 'text-white'}`}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(({ feature, starter, growth, enterprise }, i) => (
                  <tr key={feature} className={`border-t ${i % 2 === 0 ? 'bg-white/[0.02]' : ''} border-white/[0.06]`}>
                    <td className="py-3 px-2 text-white/60">{feature}</td>
                    {[starter, growth, enterprise].map((val, j) => (
                      <td key={j} className="py-3 text-center">
                        {typeof val === 'boolean' ? (
                          val ? <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" /> : <X className="w-4 h-4 text-white/20 mx-auto" />
                        ) : (
                          <span className={`text-xs font-medium ${j === 1 ? 'text-bt-teal' : 'text-white/55'}`}>{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div {...fadeUp(0)} className="text-center mb-10">
          <h2 className="text-white font-black text-3xl mb-2">Pricing questions answered.</h2>
        </motion.div>
        <div className="space-y-3">
          {FAQS.map(({ q, a }, i) => (
            <motion.div key={q} {...fadeUp(i * 0.06)} className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                <span className="text-white font-semibold text-sm">{q}</span>
                <ChevronDown className={`w-4 h-4 text-white/40 transition-transform shrink-0 ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <p className="px-5 pb-4 text-white/55 text-sm leading-relaxed">{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full bg-bt-teal/10 blur-[100px]" /></div>
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <motion.div {...fadeUp(0)}>
            <h2 className="text-white font-black text-3xl sm:text-4xl mb-4">Still deciding? Talk to our team.</h2>
            <p className="text-white/55 mb-7">Get a personalised walkthrough, custom pricing for your team size, or a hands-on trial with our onboarding specialists.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/request-access" className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-bt-teal to-bt-teal-dark text-white font-bold shadow-xl shadow-bt-teal/30 hover:scale-[1.03] transition-all">
                Start 14-Day Free Trial <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/contact" className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/8 transition-all">
                Talk to Sales
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}