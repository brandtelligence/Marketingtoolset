/**
 * WebFAQPage — Accordion FAQ with categories
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle, ArrowRight, MessageCircle } from 'lucide-react';

function fadeUp(delay = 0) {
  return { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.45, delay } };
}

const FAQ_CATEGORIES = [
  {
    id: 'general',
    label: 'General',
    questions: [
      { q: 'What is Brandtelligence?', a: 'Brandtelligence is an AI-powered marketing intelligence platform that unifies content creation, campaign analytics, landing pages, contact management, and brand asset management in a single multi-tenant platform. It is built for marketing teams, agencies, and enterprise brands that want to move faster and measure better.' },
      { q: 'Who is Brandtelligence for?', a: 'Brandtelligence is built for marketing teams of all sizes — from 5-person startups to 500-person enterprise marketing divisions and agencies managing dozens of client brands. If you run campaigns, produce content, and need to track results, Brandtelligence was built for you.' },
      { q: 'How is Brandtelligence different from other marketing tools?', a: 'Most tools do one thing. Brandtelligence does everything — and the modules work together. Your AI-generated content flows directly into your landing page builder. Your landing page leads feed into contact management. Your UTM links tie every campaign to revenue. No copy-pasting between tools. No data silos.' },
      { q: 'Is there a mobile app?', a: 'A mobile-optimised web app is available on all devices. Dedicated iOS and Android apps are on our roadmap for Q3 2025. You will be notified as soon as they launch.' },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing & Billing',
    questions: [
      { q: 'Is there a free trial?', a: 'Yes. All paid plans come with a 14-day free trial with full access to all features in your selected plan. No credit card is required to start.' },
      { q: 'What happens when my trial ends?', a: 'At the end of your 14-day trial, you will be asked to select a plan and enter payment details to continue. Your data and settings are preserved regardless. If you choose not to subscribe, your account is archived (not deleted) for 30 days.' },
      { q: 'Can I switch plans?', a: 'Yes, at any time. Upgrades take effect immediately and are prorated. Downgrades apply at the start of the next billing cycle.' },
      { q: 'Do you offer annual billing discounts?', a: 'Yes. Annual billing gives you 20% off compared to monthly billing on Starter and Growth plans.' },
      { q: 'Do you offer refunds?', a: 'We offer a 30-day money-back guarantee on annual plans. For monthly plans, we handle refund requests on a case-by-case basis. Contact support@brandtelligence.io.' },
      { q: 'What currencies do you accept?', a: 'We currently accept payments in MYR, USD, SGD, GBP, EUR, and AED. Additional currencies are added on request for enterprise clients.' },
    ],
  },
  {
    id: 'features',
    label: 'Features & Platform',
    questions: [
      { q: 'What does an AI content credit count as?', a: 'One credit = one generation request. This includes: a social media caption, a paragraph of blog content, an email subject line, a product description, or an ad headline. Credits reset on your monthly billing date.' },
      { q: 'Can I train the AI on my brand voice?', a: 'Yes. On Growth and Enterprise plans, you can upload brand guidelines, previous content examples, and tone-of-voice documents. The AI Studio uses this context to generate content that matches your unique brand voice with high accuracy.' },
      { q: 'How many brands can I manage?', a: 'Starter plan includes 1 brand. Growth includes 5 brands. Enterprise supports unlimited brands / client tenants, each fully isolated with their own users, brand kit, assets, and analytics.' },
      { q: 'Can I use my own domain for landing pages?', a: 'Yes. Growth and Enterprise plans support custom domain mapping for landing pages. You simply add a CNAME record in your DNS settings and Brandtelligence handles the SSL provisioning automatically.' },
      { q: 'Is there an API?', a: 'Yes. Full REST API with comprehensive documentation is available on Enterprise plans. Webhooks for real-time event notifications are also supported. We are working on a public API for Growth plan users in H2 2025.' },
    ],
  },
  {
    id: 'security',
    label: 'Security & Compliance',
    questions: [
      { q: 'Is Brandtelligence GDPR compliant?', a: 'Yes. Brandtelligence is GDPR-ready, PDPA compliant (Malaysia), and CCPA compatible. We support data subject access requests, right to erasure, data portability, and consent management. A Data Processing Agreement (DPA) is available for Enterprise clients.' },
      { q: 'Where is my data stored?', a: 'By default, data is stored in our APAC region (Singapore). EU data residency is available on Enterprise plans for GDPR-compliant EU data storage. US data residency is also available.' },
      { q: 'Is my data encrypted?', a: 'Yes. All data is encrypted at rest using AES-256 and in transit via TLS 1.3. Database-level row security isolates every tenant\'s data — no tenant can ever access another tenant\'s data.' },
      { q: 'Does Brandtelligence have SOC 2 certification?', a: 'Yes. Brandtelligence is SOC 2 Type II certified. Our security controls are independently audited annually. We are also ISO 27001 aligned.' },
      { q: 'Can I enforce MFA for my team?', a: 'Yes. Admins can mandate MFA for all users in their tenant. We support TOTP (authenticator apps) and magic link login as second factors. SSO / SAML is available on Enterprise plans.' },
    ],
  },
  {
    id: 'support',
    label: 'Support & Onboarding',
    questions: [
      { q: 'How do I get started?', a: 'Sign up for your free trial, complete the onboarding checklist (takes ~10 minutes), upload your brand kit, and create your first campaign. Our in-app setup guide walks you through every step.' },
      { q: 'What support options are available?', a: 'Starter: email support (24-hour response). Growth: priority email + live chat support. Enterprise: dedicated Customer Success Manager, Slack channel, SLA-backed response times.' },
      { q: 'Do you offer onboarding assistance?', a: 'Yes. Growth plan includes a 1-hour onboarding call with our specialist team. Enterprise includes full hands-on onboarding, data migration assistance, and a 90-day success plan.' },
      { q: 'Is there documentation or a knowledge base?', a: 'Yes. Comprehensive documentation, video tutorials, and a searchable knowledge base are available at docs.brandtelligence.io. In-app contextual help is also available on every screen.' },
    ],
  },
];

export function WebFAQPage() {
  const [activeCategory, setActiveCategory] = useState('general');
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const category = FAQ_CATEGORIES.find(c => c.id === activeCategory)!;

  return (
    <div className="text-white pt-16">

      {/* Hero */}
      <section className="relative py-20 sm:py-24 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-bt-teal/8 blur-[120px] rounded-full" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[250px] bg-bt-purple/15 blur-[80px] rounded-full" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4">
          <motion.div {...fadeUp(0)}>
            <HelpCircle className="w-10 h-10 text-bt-teal mx-auto mb-4" />
            <h1 className="text-white font-black text-4xl sm:text-5xl mb-4">Frequently Asked Questions</h1>
            <p className="text-white/55 text-lg max-w-xl mx-auto">
              Everything you need to know about Brandtelligence. Can't find what you're looking for?{' '}
              <Link to="/contact" className="text-bt-teal hover:text-bt-teal/80 underline underline-offset-4">Talk to our team.</Link>
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ content */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid lg:grid-cols-[220px,1fr] gap-8">

          {/* Category sidebar */}
          <motion.div {...fadeUp(0.05)} className="lg:sticky lg:top-24 self-start space-y-1">
            {FAQ_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setOpenIdx(null); }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeCategory === cat.id ? 'bg-bt-teal/15 border border-bt-teal/30 text-bt-teal' : 'text-white/50 hover:text-white hover:bg-white/[0.05]'}`}
              >
                {cat.label}
                <span className="ml-2 text-xs text-white/25">({cat.questions.length})</span>
              </button>
            ))}

            <div className="pt-4 border-t border-white/[0.08] mt-4">
              <p className="text-white/40 text-xs mb-3 px-1">Still have questions?</p>
              <Link to="/contact" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-bt-teal/10 border border-bt-teal/20 text-bt-teal text-sm font-semibold hover:bg-bt-teal/20 transition-colors">
                <MessageCircle className="w-4 h-4" /> Contact Support
              </Link>
            </div>
          </motion.div>

          {/* Questions */}
          <div>
            <motion.div key={activeCategory} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <h2 className="text-white font-black text-xl mb-5">{category.label}</h2>
              <div className="space-y-3">
                {category.questions.map(({ q, a }, i) => (
                  <motion.div key={q} {...fadeUp(i * 0.05)} className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden hover:border-bt-teal/20 transition-colors">
                    <button
                      onClick={() => setOpenIdx(openIdx === i ? null : i)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                    >
                      <span className="text-white font-semibold text-sm">{q}</span>
                      <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform duration-300 ${openIdx === i ? 'rotate-180 text-bt-teal' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {openIdx === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <p className="px-5 pb-5 text-white/55 text-sm leading-relaxed">{a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-bt-purple/[0.04] border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <motion.div {...fadeUp(0)}>
            <h2 className="text-white font-black text-2xl sm:text-3xl mb-3">Ready to see it for yourself?</h2>
            <p className="text-white/50 mb-6">Start your free 14-day trial — no credit card required.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/request-access" className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-bt-teal to-bt-teal-dark text-white font-bold shadow-lg shadow-bt-teal/25 hover:scale-[1.03] transition-all">
                Start Free Trial <ArrowRight className="w-4 h-4" />
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
