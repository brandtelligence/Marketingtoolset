import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Building2, Mail, Globe, Users, FileText,
  CheckCircle, Send, Sparkles, Gift, AlertTriangle, Clock,
  XCircle, ChevronDown, Check, Search,
  // Module icons
  Share2, Wand2, BarChart3, CreditCard, MailCheck, SearchCheck,
  Target, PenLine, Layers, Link2, Film, Smartphone, Bot, Star,
  Mic2, Video, Newspaper, DatabaseZap,
  // Category icons
  Cpu, TrendingUp, PieChart, MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { BackgroundLayout } from '../components/BackgroundLayout';
import brandtelligenceLogo from 'figma:asset/250842c5232a8611aa522e6a3530258e858657d5.png';
import {
  createRequest, fetchModules, checkAccessEmail,
  type Module, type EmailCheckStatus,
} from '../utils/apiClient';
import { formatRM } from '../utils/format';

// ─── Module key → Lucide icon ──────────────────────────────────────────────
const MODULE_ICONS: Record<string, React.ElementType> = {
  social_media:        Share2,
  content_studio:      Wand2,
  analytics:           BarChart3,
  vcard:               CreditCard,
  email_marketing:     MailCheck,
  seo_toolkit:         SearchCheck,
  sem:                 Target,
  content_marketing:   PenLine,
  display_advertising: Layers,
  affiliate_marketing: Link2,
  video_marketing:     Film,
  mobile_marketing:    Smartphone,
  programmatic_ads:    Bot,
  influencer:          Star,
  podcast_audio:       Mic2,
  webinars_events:     Video,
  pr_media:            Newspaper,
  content_scrapper:    DatabaseZap,
};

// ─── Category metadata ──────────────────────────────────────────────────────
const POPULAR_IDS = ['m1', 'm2', 'm3'];
const CATEGORY_META: Record<string, { label: string; Icon: React.ElementType; order: number }> = {
  core:          { label: 'Core',          Icon: Cpu,            order: 0 },
  marketing:     { label: 'Marketing',     Icon: TrendingUp,     order: 1 },
  analytics:     { label: 'Analytics',     Icon: PieChart,       order: 2 },
  communication: { label: 'Communication', Icon: MessageSquare,  order: 3 },
};

// ─── Team-size options ──────────────────────────────────────────────────────
const TEAM_SIZES = [
  { value: '1-10',    label: '1 – 10',    sub: 'Solo / Micro team'   },
  { value: '11-50',   label: '11 – 50',   sub: 'Growing team'        },
  { value: '51-200',  label: '51 – 200',  sub: 'Mid-size company'    },
  { value: '201-500', label: '201 – 500', sub: 'Large enterprise'    },
  { value: '500+',    label: '500+',      sub: 'Global organisation' },
];

// ─── All countries (Malaysia pinned first) ──────────────────────────────────
const COUNTRIES = [
  'Malaysia',
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina',
  'Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados',
  'Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina',
  'Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Cabo Verde','Cambodia',
  'Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia',
  'Comoros','Congo (Republic)','Congo (Democratic Republic)','Costa Rica','Croatia','Cuba',
  'Cyprus','Czech Republic','Denmark','Djibouti','Dominica','Dominican Republic',
  'East Timor','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia',
  'Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany',
  'Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti',
  'Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel',
  'Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kosovo','Kuwait',
  'Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein',
  'Lithuania','Luxembourg','Madagascar','Malawi','Maldives','Mali','Malta',
  'Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco',
  'Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal',
  'Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea',
  'North Macedonia','Norway','Oman','Pakistan','Palau','Palestine','Panama',
  'Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar',
  'Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia',
  'Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe',
  'Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia',
  'Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan',
  'Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan',
  'Tajikistan','Tanzania','Thailand','Togo','Tonga','Trinidad and Tobago','Tunisia',
  'Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates',
  'United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu','Vatican City',
  'Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
];

// ─── Reusable custom dropdown ───────────────────────────────────────────────
interface CustomSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; sub?: string }[];
  placeholder?: string;
  searchable?: boolean;
  icon?: React.ElementType;
}

function CustomSelect({ value, onChange, options, placeholder = 'Select…', searchable = false, icon: Icon }: CustomSelectProps) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const ref                 = useRef<HTMLDivElement>(null);
  const searchRef           = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchable) setTimeout(() => searchRef.current?.focus(), 50);
    if (!open) setQuery('');
  }, [open, searchable]);

  const filtered = searchable && query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className={`w-full flex items-center gap-2.5 bg-white/10 border rounded-xl px-4 py-3 text-sm text-left transition-all focus:outline-none ${
          open ? 'border-purple-400/60 ring-2 ring-purple-500/20' : 'border-white/20 hover:border-white/35'
        }`}
      >
        {Icon && <Icon className="w-4 h-4 text-teal-300/80 shrink-0" />}
        <span className={`flex-1 truncate ${selected ? 'text-white' : 'text-white/40'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
        </motion.div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full bg-gray-900/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            {/* Search box */}
            {searchable && (
              <div className="p-2 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search country…"
                    className="w-full bg-white/8 border border-white/15 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-white/35 focus:outline-none focus:border-purple-400/40"
                  />
                </div>
              </div>
            )}

            {/* List */}
            <div className="max-h-52 overflow-y-auto custom-scroll">
              {filtered.length === 0 ? (
                <p className="text-white/40 text-xs text-center py-4">No results</p>
              ) : (
                filtered.map(opt => {
                  const isActive = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { onChange(opt.value); setOpen(false); }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                        isActive
                          ? 'bg-purple-500/25 text-white'
                          : 'text-white/75 hover:bg-white/8 hover:text-white'
                      }`}
                    >
                      <div>
                        <span className="block text-sm leading-tight">{opt.label}</span>
                        {opt.sub && <span className="block text-[0.6rem] text-white/40 mt-0.5">{opt.sub}</span>}
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST ACCESS PAGE
// ═══════════════════════════════════════════════════════════════════════════

export function RequestAccessPage() {
  const navigate = useNavigate();

  // ── Data ────────────────────────────────────────────────────────────────
  const [modules,         setModules]         = useState<Module[]>([]);
  const [collapsedCats,   setCollapsedCats]   = useState<Record<string, boolean>>({});

  // ── Form fields ─────────────────────────────────────────────────────────
  const [companyName,     setCompanyName]     = useState('');
  const [contactName,     setContactName]     = useState('');
  const [contactEmail,    setContactEmail]    = useState('');
  const [country,         setCountry]         = useState('Malaysia');
  const [size,            setSize]            = useState('11-50');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [notes,           setNotes]           = useState('');

  // ── Email check ──────────────────────────────────────────────────────────
  const [emailStatus,      setEmailStatus]      = useState<EmailCheckStatus | 'idle' | 'checking'>('idle');
  const [emailSubmittedAt, setEmailSubmittedAt] = useState<string | undefined>();
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [loading,     setLoading]     = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [moduleError, setModuleError] = useState(false);

  useEffect(() => {
    fetchModules()
      .then(mods => setModules(mods.filter(m => m.globalEnabled)))
      .catch(() => {});
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────
  const categories = Array.from(
    new Set(modules.map(m => m.category))
  ).sort((a, b) => (CATEGORY_META[a]?.order ?? 99) - (CATEGORY_META[b]?.order ?? 99));

  const selectedModuleObjects = modules.filter(m => selectedModules.includes(m.id));
  const totalMonthly = selectedModuleObjects.reduce((s, m) => s + (m.basePrice ?? 0), 0);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const toggleModule = (id: string) => {
    setModuleError(false);
    setSelectedModules(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const toggleCat = (cat: string) => {
    const catMods = modules.filter(m => m.category === cat).map(m => m.id);
    const allSelected = catMods.every(id => selectedModules.includes(id));
    setModuleError(false);
    setSelectedModules(prev =>
      allSelected
        ? prev.filter(id => !catMods.includes(id))
        : [...new Set([...prev, ...catMods])]
    );
  };

  const toggleCollapse = (cat: string) =>
    setCollapsedCats(prev => ({ ...prev, [cat]: !prev[cat] }));

  // ── Email blur check ─────────────────────────────────────────────────────
  const handleEmailBlur = useCallback(async () => {
    const email = contactEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    setEmailStatus('checking');
    try {
      const result = await checkAccessEmail(email);
      setEmailStatus(result.status);
      setEmailSubmittedAt(result.submittedAt);
    } catch {
      setEmailStatus('idle');
    }
  }, [contactEmail]);

  const handleEmailChange = (val: string) => {
    setContactEmail(val);
    setEmailStatus('idle');
    setEmailSubmittedAt(undefined);
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !contactName.trim() || !contactEmail.trim()) {
      toast.error('Company name, contact name, and email are required');
      return;
    }
    if (selectedModules.length === 0) {
      setModuleError(true);
      document.getElementById('modules-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error('Please select at least one module to continue');
      return;
    }
    if (emailStatus === 'tenant') {
      toast.error('This email already has an account — please sign in instead');
      return;
    }
    if (emailStatus === 'pending') {
      toast.error("You already have a pending access request — we'll be in touch soon");
      return;
    }
    if (emailStatus === 'rejected') {
      toast.error('A previous request from this email was declined — please contact support');
      return;
    }
    setLoading(true);
    try {
      await createRequest({
        companyName, contactName, contactEmail,
        country, size, requestedModules: selectedModules,
        notes, status: 'pending',
      });
      setSubmitted(true);
    } catch (err: any) {
      toast.error(`Submission failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-400/50 transition-all text-sm';

  // ─── Country options ────────────────────────────────────────────────────
  const countryOptions = COUNTRIES.map(c => ({ value: c, label: c }));
  const teamSizeOptions = TEAM_SIZES.map(s => ({ value: s.value, label: s.label, sub: s.sub }));

  // ════════════════════════════════════════════════════════════════════════
  // SUCCESS STATE
  // ════════════════════════════════════════════════════════════════════════
  if (submitted) {
    return (
      <BackgroundLayout particleCount={15}>
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl text-center"
          >
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </motion.div>

            <h2 className="text-white font-bold text-2xl mb-2">Request Submitted!</h2>
            <p className="text-emerald-400 text-sm font-medium mb-4">Your 14-day free trial starts on approval.</p>
            <p className="text-white/70 text-sm mb-6 leading-relaxed">
              Thank you, <strong className="text-white">{contactName || companyName}</strong>.
              Your request for <strong className="text-white">{companyName}</strong> is under review.
              We'll send a one-time invite link to{' '}
              <strong className="text-white">{contactEmail}</strong> within 1–2 business days.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/40">Company</span>
                <span className="text-white font-medium">{companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Contact</span>
                <span className="text-white">{contactEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Modules Selected</span>
                <span className="text-white font-medium">{selectedModules.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Trial Period</span>
                <span className="text-emerald-400 font-semibold">14 days FREE</span>
              </div>
              {totalMonthly > 0 && (
                <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                  <span className="text-white/40">After trial</span>
                  <span className="text-white font-semibold">{formatRM(totalMonthly)}/mo</span>
                </div>
              )}
            </div>

            {selectedModuleObjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mb-5">
                {selectedModuleObjects.map(m => {
                  const ModIcon = MODULE_ICONS[m.key] ?? Sparkles;
                  return (
                    <span key={m.id} className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-xs flex items-center gap-1">
                      <ModIcon className="w-3 h-3" /> {m.name}
                    </span>
                  );
                })}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/login')}
              className="w-full bg-white/20 border-2 border-white/40 text-white py-3 rounded-xl hover:bg-white/30 transition-all font-medium"
            >
              Back to Login
            </motion.button>
          </motion.div>
        </div>
      </BackgroundLayout>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // EMAIL STATUS INDICATOR
  // ════════════════════════════════════════════════════════════════════════
  const EmailFeedback = () => {
    if (emailStatus === 'checking') return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/50">
        <span className="w-3 h-3 border border-white/40 border-t-transparent rounded-full animate-spin" />
        Checking email…
      </p>
    );
    if (emailStatus === 'available') return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400">
        <CheckCircle className="w-3.5 h-3.5" /> Email looks good — proceed!
      </p>
    );
    if (emailStatus === 'tenant') return (
      <div className="mt-2 bg-red-500/15 border border-red-500/30 rounded-xl p-3 text-sm">
        <p className="text-red-400 font-semibold flex items-center gap-2 mb-1">
          <XCircle className="w-4 h-4 shrink-0" /> This email already has an account
        </p>
        <p className="text-red-300/80 text-xs mb-2">
          An active Brandtelligence account is associated with this email address.
        </p>
        <button
          type="button" onClick={() => navigate('/login')}
          className="text-xs font-semibold text-red-300 underline hover:text-white transition-colors"
        >
          Sign in instead →
        </button>
      </div>
    );
    if (emailStatus === 'pending') return (
      <div className="mt-2 bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 text-sm">
        <p className="text-amber-400 font-semibold flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 shrink-0" /> Access request already submitted
        </p>
        <p className="text-amber-300/80 text-xs">
          We received a request from this email{emailSubmittedAt ? ` on ${emailSubmittedAt}` : ''}.
          Our team will contact you within 1–2 business days.
        </p>
      </div>
    );
    if (emailStatus === 'rejected') return (
      <div className="mt-2 bg-red-500/15 border border-red-500/30 rounded-xl p-3 text-sm">
        <p className="text-red-400 font-semibold flex items-center gap-2 mb-1">
          <XCircle className="w-4 h-4 shrink-0" /> Previous request was not approved
        </p>
        <p className="text-red-300/80 text-xs">
          A prior access request from this email was declined. Please contact us at{' '}
          <a href="mailto:support@brandtelligence.my" className="underline hover:text-white">
            support@brandtelligence.my
          </a>{' '}
          for assistance.
        </p>
      </div>
    );
    return null;
  };

  // ════════════════════════════════════════════════════════════════════════
  // MAIN FORM
  // ════════════════════════════════════════════════════════════════════════
  return (
    <BackgroundLayout particleCount={15}>
      <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-2xl">

          {/* Back */}
          <motion.button
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/login')}
            className="text-white/70 hover:text-white mb-6 inline-flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </motion.button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

            {/* Header */}
            <div className="mb-8 text-center">
              <div className="inline-block bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/20 shadow-2xl mb-6">
                <img src={brandtelligenceLogo} alt="Brandtelligence" className="w-full max-w-[14rem] sm:max-w-xs h-auto mx-auto" />
              </div>
              <h1 className="text-white font-bold" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>Request Access</h1>
              <p className="text-white/60 text-sm mt-2">
                New here? We'd love to show you around! Tell us a bit about your company and we'll zip a personal invite link straight to your inbox.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">

              {/* ── Company Details ──────────────────────────────────────── */}
              <div className="space-y-5">
                <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">Company Details</p>

                {/* Company Name */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-300/70" />
                    <input
                      value={companyName} onChange={e => setCompanyName(e.target.value)}
                      className={`${inputCls} pl-10`} placeholder="Your company name" required
                    />
                  </div>
                </div>

                {/* Contact Name */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Contact Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-300/70" />
                    <input
                      value={contactName} onChange={e => setContactName(e.target.value)}
                      className={`${inputCls} pl-10`} placeholder="Your full name" required
                    />
                  </div>
                </div>

                {/* Business Email with live check */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Business Email <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-300/70" />
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={e => handleEmailChange(e.target.value)}
                      onBlur={handleEmailBlur}
                      className={`${inputCls} pl-10 pr-10 ${
                        emailStatus === 'tenant' || emailStatus === 'rejected'
                          ? 'border-red-500/50'
                          : emailStatus === 'available'
                          ? 'border-emerald-500/50'
                          : emailStatus === 'pending'
                          ? 'border-amber-500/50'
                          : ''
                      }`}
                      placeholder="admin@yourcompany.com"
                      required
                    />
                    {emailStatus === 'available' && (
                      <CheckCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                    )}
                    {(emailStatus === 'tenant' || emailStatus === 'rejected') && (
                      <XCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                    )}
                    {emailStatus === 'pending' && (
                      <Clock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <EmailFeedback />
                </div>

                {/* Country + Team Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-white/50" /> Country
                    </label>
                    <CustomSelect
                      value={country}
                      onChange={setCountry}
                      options={countryOptions}
                      placeholder="Select country…"
                      searchable
                      icon={Globe}
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-white/50" /> Team Size
                    </label>
                    <CustomSelect
                      value={size}
                      onChange={setSize}
                      options={teamSizeOptions}
                      placeholder="Select team size…"
                      icon={Users}
                    />
                  </div>
                </div>
              </div>

              {/* ── Module Selection ─────────────────────────────────────── */}
              <div id="modules-section">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-white/80 text-sm font-medium">
                    Select Modules to Trial <span className="text-red-400">*</span>
                  </label>
                  {selectedModules.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setSelectedModules([]); setModuleError(false); }}
                      className="text-white/40 hover:text-white/70 text-xs transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <p className="text-white/40 text-xs mb-3">
                  We use this to provision your trial account — not a purchase commitment.
                  You can change your modules any time after sign-up.
                </p>

                {/* 14-Day Free Trial Banner */}
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative mb-5 overflow-hidden rounded-2xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-purple-500/20 p-4"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                        <Gift className="w-4 h-4 text-emerald-300" />
                      </div>
                      <span className="text-emerald-300 font-bold text-sm">14-Day Free Trial — Automatic on Approval</span>
                      <span className="ml-auto px-2 py-0.5 bg-emerald-400/20 border border-emerald-400/30 rounded-full text-emerald-300 text-[0.6rem] font-bold uppercase tracking-wider shrink-0">
                        No card needed
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { step: '1', title: 'Submit & get approved', desc: 'Our team reviews your request and sends a one-time invite link within 1–2 business days.', color: 'text-purple-300', bg: 'bg-purple-500/15 border-purple-500/20' },
                        { step: '2', title: '14 days, full access',   desc: 'Your trial begins the moment you activate your account. All selected modules, zero restrictions.', color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/20' },
                        { step: '3', title: 'Decide at the end',      desc: 'Trial ends automatically. No charge ever applies — choose which modules to keep from your dashboard.', color: 'text-teal-300',   bg: 'bg-teal-500/15 border-teal-500/20' },
                      ].map(({ step, title, desc, color, bg }) => (
                        <div key={step} className={`rounded-xl border p-3 ${bg}`}>
                          <div className={`text-[0.6rem] font-bold uppercase tracking-widest mb-1 ${color}`}>Step {step}</div>
                          <p className={`text-xs font-semibold mb-1 ${color}`}>{title}</p>
                          <p className="text-white/55 text-[0.65rem] leading-relaxed">{desc}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-white/40 text-[0.65rem] text-center leading-relaxed">
                      No credit card is collected at any point during sign-up or the trial period.
                      Your trial expires quietly — you will never be charged without explicit agreement.
                    </p>
                  </div>
                </motion.div>

                {/* Module error */}
                <AnimatePresence>
                  {moduleError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="mb-3 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 text-xs"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Please select at least one module to continue.
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Categories */}
                {modules.length === 0 ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-white/40 text-sm">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                    Loading modules…
                  </div>
                ) : (
                  <div className={`space-y-3 ${moduleError ? 'ring-1 ring-red-500/30 rounded-2xl p-3' : ''}`}>
                    {categories.map(cat => {
                      const catMods = modules.filter(m => m.category === cat);
                      const catMeta = CATEGORY_META[cat] ?? { label: cat, Icon: Layers, order: 99 };
                      const CatIcon = catMeta.Icon;
                      const allCatSelected  = catMods.every(m => selectedModules.includes(m.id));
                      const someCatSelected = catMods.some(m => selectedModules.includes(m.id));
                      const isCollapsed     = collapsedCats[cat];

                      return (
                        <div key={cat} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                          {/* Category header */}
                          <div className="flex items-center justify-between px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                                <CatIcon className="w-3.5 h-3.5 text-teal-300/80" />
                              </div>
                              <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">{catMeta.label}</span>
                              {someCatSelected && (
                                <span className="px-1.5 py-0.5 bg-purple-500/30 text-purple-300 text-[0.6rem] font-bold rounded-full">
                                  {catMods.filter(m => selectedModules.includes(m.id)).length}/{catMods.length}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleCat(cat)}
                                className={`text-[0.65rem] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                                  allCatSelected
                                    ? 'bg-purple-500/30 border-purple-500/40 text-purple-300 hover:bg-purple-500/20'
                                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
                                }`}
                              >
                                {allCatSelected ? 'Deselect all' : 'Select all'}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleCollapse(cat)}
                                className="p-1 rounded-lg text-white/40 hover:text-white/70 transition-colors"
                              >
                                <motion.div animate={{ rotate: isCollapsed ? 0 : 180 }} transition={{ duration: 0.2 }}>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </motion.div>
                              </button>
                            </div>
                          </div>

                          {/* Module tiles */}
                          <AnimatePresence initial={false}>
                            {!isCollapsed && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {catMods.map(m => {
                                    const isSelected = selectedModules.includes(m.id);
                                    const isPopular  = POPULAR_IDS.includes(m.id);
                                    const ModIcon    = MODULE_ICONS[m.key] ?? Sparkles;
                                    return (
                                      <motion.label
                                        key={m.id}
                                        whileTap={{ scale: 0.98 }}
                                        className={`relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${
                                          isSelected
                                            ? 'bg-purple-500/20 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                                            : 'bg-white/3 border-white/10 hover:border-white/20 hover:bg-white/7'
                                        }`}
                                      >
                                        {isPopular && (
                                          <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-orange-500/30 border border-orange-500/40 text-orange-300 text-[0.55rem] font-bold rounded-full uppercase tracking-wider">
                                            Popular
                                          </span>
                                        )}

                                        {/* Custom checkbox */}
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                          isSelected ? 'bg-purple-500 border-purple-500' : 'border-white/25 bg-white/5'
                                        }`}>
                                          {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                        </div>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleModule(m.id)}
                                          className="sr-only"
                                        />

                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            {/* Professional Lucide icon with coloured background pill */}
                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all ${
                                              isSelected
                                                ? 'bg-purple-400/25 border border-purple-400/40'
                                                : 'bg-white/8 border border-white/12'
                                            }`}>
                                              <ModIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-300' : 'text-teal-300/70'}`} />
                                            </div>
                                            <p className={`text-xs font-semibold truncate pr-8 ${isSelected ? 'text-white' : 'text-white/80'}`}>
                                              {m.name}
                                            </p>
                                          </div>
                                          <p className={`text-[0.65rem] mt-0.5 pl-8 ${isSelected ? 'text-purple-300' : 'text-white/35'}`}>
                                            {formatRM(m.basePrice)}/mo after trial
                                          </p>
                                        </div>
                                      </motion.label>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Running total ticker */}
                <AnimatePresence>
                  {selectedModules.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="mt-3 flex items-center justify-between px-4 py-3 bg-purple-500/15 border border-purple-500/30 rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-300 text-xs font-medium">
                          {selectedModules.length} module{selectedModules.length > 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 text-xs font-bold">FREE for 14 days</p>
                        <p className="text-white/50 text-[0.65rem]">then {formatRM(totalMonthly)}/mo</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Additional Notes ─────────────────────────────────────── */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-white/50" />
                  Additional Notes
                  <span className="text-white/40 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  rows={3} className={`${inputCls} resize-none`}
                  placeholder="Tell us about your use case, goals, or any special requirements…"
                />
              </div>

              {/* ── Info box ─────────────────────────────────────────────── */}
              <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 text-xs text-sky-300 flex items-start gap-2">
                <Mail className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
                <span>
                  After approval, you'll receive a <strong>one-time invite link (valid 24 h)</strong> to set
                  your password and start your 14-day free trial — no credit card needed.
                </span>
              </div>

              {/* ── Submit ───────────────────────────────────────────────── */}
              <motion.button
                whileHover={{ scale: emailStatus === 'tenant' || emailStatus === 'rejected' ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || emailStatus === 'tenant' || emailStatus === 'rejected'}
                className="w-full bg-purple-500/80 hover:bg-purple-500 border border-purple-500/40 text-white py-3 rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting…</>
                  : <><Send className="w-4 h-4" />Submit Access Request & Start Free Trial</>
                }
              </motion.button>

              <p className="text-white/40 text-xs text-center">
                Already have an invite?{' '}
                <button type="button" onClick={() => navigate('/login')} className="underline hover:text-white/60 transition-colors">
                  Sign in here
                </button>
              </p>

            </form>
          </motion.div>
        </div>
      </div>
    </BackgroundLayout>
  );
}
