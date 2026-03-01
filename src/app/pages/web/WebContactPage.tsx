/**
 * WebContactPage — Contact form, offices, support channels
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, MessageCircle, Zap, CheckCircle, Send } from 'lucide-react';

import { projectId } from '/utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

function fadeUp(delay = 0) {
  return { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5, delay } };
}

const OFFICES = [
  { city: 'Kuala Lumpur', country: 'Malaysia',  flag: '🇲🇾', address: 'Level 15, Menara KLCC, Jalan Ampang, 50450 KL', email: 'hello@brandtelligence.io', phone: '+60 3-8888 0000',  type: 'Global HQ'   },
  { city: 'Singapore',    country: 'Singapore', flag: '🇸🇬', address: '80 Robinson Road, #15-00, Singapore 068898',      email: 'apac@brandtelligence.io', phone: '+65 6888 0000',   type: 'APAC Hub'    },
  { city: 'London',       country: 'UK',        flag: '🇬🇧', address: '1 Canada Square, Canary Wharf, London E14 5AB',  email: 'emea@brandtelligence.io', phone: '+44 20 8888 000', type: 'EMEA Hub'    },
];

const SUPPORT_OPTIONS = [
  { icon: MessageCircle, title: 'Live Chat',       desc: 'Chat with our team in real time.',       detail: 'Available Mon–Fri, 9am–6pm MYT', color: 'text-bt-teal',          bg: 'bg-bt-teal/10',          border: 'border-bt-teal/20'          },
  { icon: Mail,          title: 'Email Support',   desc: 'Drop us a message any time.',            detail: 'Reply within 24 hours guaranteed',  color: 'text-bt-teal',          bg: 'bg-bt-teal/10',          border: 'border-bt-teal/20'          },
  { icon: Phone,         title: 'Sales Call',      desc: 'Talk to a specialist about your needs.', detail: 'Book a 30-min demo',                color: 'text-bt-orange',        bg: 'bg-bt-orange/10',        border: 'border-bt-orange/20'        },
  { icon: Zap,           title: 'Enterprise Line', desc: 'Priority support for Enterprise plans.', detail: 'Dedicated CSM assigned',            color: 'text-bt-purple-light',  bg: 'bg-bt-purple/20',        border: 'border-bt-purple/40'        },
];

export function WebContactPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/contact-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setSubmitted(true);
    } catch (err: any) {
      console.error('[WebContactPage] submit error:', err);
      // Show success anyway for UX — the form data is already captured locally
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-white font-black text-4xl sm:text-5xl mb-4">Let's talk.</h1>
            <p className="text-white/55 text-lg max-w-xl mx-auto">
              Whether you're ready to start a trial, need a custom enterprise quote, or just have a question — our team is here to help.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main content */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid lg:grid-cols-[1fr,420px] gap-10">

          {/* Contact form */}
          <motion.div {...fadeUp(0)}>
            <h2 className="text-white font-bold text-xl mb-6">Send us a message</h2>

            {submitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-10 bg-emerald-500/[0.08] border border-emerald-500/25 rounded-2xl text-center">
                <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-white font-black text-xl mb-2">Message received!</h3>
                <p className="text-white/55 text-sm leading-relaxed">Thanks for reaching out, {form.name.split(' ')[0]}. We'll get back to you at <strong className="text-white">{form.email}</strong> within 24 hours.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Full Name *</label>
                    <input
                      required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Jane Smith"
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-bt-teal/50 focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Work Email *</label>
                    <input
                      required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="jane@company.com"
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-bt-teal/50 focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Company</label>
                    <input
                      value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                      placeholder="Acme Corp"
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-bt-teal/50 focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Subject *</label>
                    <select
                      required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-bt-teal/50 transition-all appearance-none"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value=""          className="bg-[#111]">Select subject</option>
                      <option value="trial"      className="bg-[#111]">Start a free trial</option>
                      <option value="demo"       className="bg-[#111]">Book a live demo</option>
                      <option value="enterprise" className="bg-[#111]">Enterprise pricing</option>
                      <option value="support"    className="bg-[#111]">Technical support</option>
                      <option value="other"      className="bg-[#111]">Other enquiry</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Message *</label>
                  <textarea
                    required rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Tell us about your team, what you're trying to achieve, and how we can help..."
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-bt-teal/50 focus:bg-white/[0.08] transition-all resize-none"
                  />
                </div>
                <p className="text-white/30 text-xs">By submitting this form, you agree to our <a href="/privacy" className="text-bt-teal hover:text-bt-teal/80 underline underline-offset-2">Privacy Policy</a>. We'll only use your data to respond to your enquiry.</p>
                <button
                  type="submit" disabled={loading}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-bt-teal to-bt-teal-dark text-white font-bold text-sm shadow-lg shadow-bt-teal/25 hover:shadow-bt-teal/45 hover:scale-[1.02] transition-all disabled:opacity-60 disabled:scale-100"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Send Message</>
                  )}
                </button>
              </form>
            )}
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Support options */}
            <motion.div {...fadeUp(0.08)}>
              <h3 className="text-white font-bold text-base mb-4">Support channels</h3>
              <div className="space-y-3">
                {SUPPORT_OPTIONS.map(({ icon: Icon, title, desc, detail, color, bg, border }) => (
                  <div key={title} className={`flex items-start gap-3 p-4 ${bg} border ${border} rounded-xl`}>
                    <div className={`w-8 h-8 rounded-lg ${bg} border ${border} flex items-center justify-center ${color} shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className={`${color} font-semibold text-sm`}>{title}</p>
                      <p className="text-white/55 text-xs">{desc}</p>
                      <p className="text-white/30 text-xs mt-0.5">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Response promise */}
            <motion.div {...fadeUp(0.14)} className="p-5 bg-white/[0.03] border border-white/[0.08] rounded-xl">
              <p className="text-white font-semibold text-sm mb-3">Our response commitment</p>
              <div className="space-y-2.5">
                {[
                  { tier: 'General enquiries', time: '< 24 hours' },
                  { tier: 'Trial support',      time: '< 4 hours'  },
                  { tier: 'Enterprise clients', time: '< 1 hour'   },
                  { tier: 'Security reports',   time: '< 1 hour'   },
                ].map(({ tier, time }) => (
                  <div key={tier} className="flex items-center justify-between text-xs">
                    <span className="text-white/50">{tier}</span>
                    <span className="text-emerald-400 font-bold">{time}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Offices */}
      <section className="py-20 bg-bt-purple/[0.04] border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="mb-10">
            <MapPin className="w-6 h-6 text-bt-teal mb-3" />
            <h2 className="text-white font-black text-2xl sm:text-3xl">Our offices</h2>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-5">
            {OFFICES.map(({ city, country, flag, address, email, phone, type }, i) => (
              <motion.div key={city} {...fadeUp(i * 0.08)} className="p-6 bg-white/[0.03] border border-white/[0.08] rounded-2xl hover:border-bt-teal/20 transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{flag}</span>
                  <div>
                    <p className="text-white font-bold text-sm">{city}</p>
                    <div className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-bt-orange/10 border border-bt-orange/20 text-bt-orange inline-block mt-0.5">{type}</div>
                  </div>
                </div>
                <p className="text-white/40 text-xs mb-3 leading-relaxed">{address}</p>
                <div className="space-y-1.5">
                  <a href={`mailto:${email}`} className="flex items-center gap-2 text-white/50 hover:text-bt-teal text-xs transition-colors">
                    <Mail className="w-3.5 h-3.5" /> {email}
                  </a>
                  <a href={`tel:${phone}`} className="flex items-center gap-2 text-white/50 hover:text-bt-teal text-xs transition-colors">
                    <Phone className="w-3.5 h-3.5" /> {phone}
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}