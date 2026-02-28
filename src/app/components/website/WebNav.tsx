/**
 * WebNav — Global marketing website navigation
 * Sticky header · Mega-menu · Mobile drawer · Conversion CTAs · Light/Dark toggle
 */
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu, X, ChevronDown, Zap, BarChart2, Globe, Users, Shield,
  Sparkles, FileText, HelpCircle, BookOpen, Star, ArrowRight,
  Sun, Moon,
} from 'lucide-react';
import { useWebTheme } from '../../contexts/WebThemeContext';
import brandLogo from 'figma:asset/250842c5232a8611aa522e6a3530258e858657d5.png';

interface MegaItem { icon: React.ReactNode; label: string; desc: string; href: string; }

const MEGA: Record<string, MegaItem[]> = {
  Product: [
    { icon: <Zap className="w-4 h-4" />,        label: 'AI Content Studio',    desc: 'Generate on-brand content in seconds',    href: '/product#ai-studio'     },
    { icon: <BarChart2 className="w-4 h-4" />,   label: 'Campaign Analytics',   desc: 'Real-time ROI and UTM tracking',          href: '/product#analytics'     },
    { icon: <Globe className="w-4 h-4" />,       label: 'Landing Page Builder', desc: 'Drag-and-drop pages that convert',        href: '/product#landing-pages' },
    { icon: <Users className="w-4 h-4" />,       label: 'Contact Management',   desc: 'CRM-lite for your leads and contacts',   href: '/product#crm'           },
    { icon: <Shield className="w-4 h-4" />,      label: 'Brand Kit Manager',    desc: 'Keep every asset on-brand, always',      href: '/product#brand-kit'     },
    { icon: <Sparkles className="w-4 h-4" />,    label: 'Social Asset Library', desc: 'Organize and distribute creative assets', href: '/product#assets'        },
  ],
  Resources: [
    { icon: <BookOpen className="w-4 h-4" />,    label: 'Blog & Insights',      desc: 'Marketing guides and growth tactics',     href: '/blog'          },
    { icon: <Star className="w-4 h-4" />,        label: 'Case Studies',         desc: 'Real results from real brands',           href: '/testimonials'  },
    { icon: <HelpCircle className="w-4 h-4" />,  label: 'FAQ',                  desc: 'Answers to common questions',             href: '/faq'           },
    { icon: <FileText className="w-4 h-4" />,    label: 'Documentation',        desc: 'Setup guides and API references',         href: '/faq'           },
  ],
};

const NAV_LINKS = [
  { label: 'Product',   href: '/product',  mega: 'Product'   },
  { label: 'Features',  href: '/features', mega: null         },
  { label: 'Pricing',   href: '/pricing',  mega: null         },
  { label: 'Resources', href: '/blog',     mega: 'Resources'  },
  { label: 'About',     href: '/about',    mega: null         },
];

export function WebNav() {
  const [scrolled, setScrolled]             = useState(false);
  const [openMega, setOpenMega]             = useState<string | null>(null);
  const [mobileOpen, setMobileOpen]         = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const location = useLocation();
  const { isDark, toggleTheme } = useWebTheme();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); setOpenMega(null); }, [location.pathname]);

  /* ── Shared colour tokens (light vs dark) ─────────────────────── */
  const headerBg = scrolled
    ? isDark
      ? 'bg-[#06070f]/88 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-black/40'
      : 'bg-white/92 backdrop-blur-xl border-b border-gray-200/80 shadow-sm shadow-gray-300/30'
    : 'bg-transparent';

  const logoText   = isDark ? 'text-white'    : 'text-gray-900';
  const navLink    = isDark
    ? 'text-white/70 hover:text-white hover:bg-white/8'
    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';
  const navActive  = isDark ? 'text-white bg-white/10' : 'text-gray-900 bg-gray-100';
  const megaBg     = isDark
    ? 'bg-[#0a0a18]/95 backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/60'
    : 'bg-white/98 backdrop-blur-2xl border border-gray-200 shadow-2xl shadow-gray-200/60';
  const megaItemHover  = isDark ? 'hover:bg-white/8'   : 'hover:bg-gray-50';
  const megaIconBg     = isDark
    ? 'bg-bt-teal/15 border border-bt-teal/20 group-hover:bg-bt-teal/25'
    : 'bg-bt-teal/10 border border-bt-teal/15 group-hover:bg-bt-teal/20';
  const megaLabel      = isDark ? 'text-white group-hover:text-bt-teal' : 'text-gray-900 group-hover:text-bt-teal';
  const megaDesc       = isDark ? 'text-white/50'  : 'text-gray-500';
  const loginLink      = isDark
    ? 'text-white/70 hover:text-white hover:bg-white/8'
    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';
  const mobileDrawerBg = isDark ? 'bg-[#06070f]/97 backdrop-blur-xl' : 'bg-white/98 backdrop-blur-xl';
  const mobileLinkCls  = isDark
    ? 'text-white/80 hover:text-white hover:bg-white/8'
    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100';
  const mobileMegaLinkCls = isDark
    ? 'text-white/60 hover:text-white'
    : 'text-gray-600 hover:text-gray-900';
  const mobileIconCls  = isDark ? 'text-bt-teal'   : 'text-bt-teal';
  const mobileDivider  = isDark ? 'border-white/[0.08]' : 'border-gray-200';
  const mobileLoginCls = isDark
    ? 'border-white/20 text-white hover:bg-white/8'
    : 'border-gray-300 text-gray-800 hover:bg-gray-100';
  const hamburgerCls   = isDark ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';

  /* ── Theme toggle button ───────────────────────────────────────── */
  const toggleBtn = (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
        isDark
          ? 'bg-white/8 border border-white/15 text-white/70 hover:text-white hover:bg-white/15'
          : 'bg-gray-100 border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span key="sun"  initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
            <Sun className="w-4 h-4" />
          </motion.span>
        ) : (
          <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
            <Moon className="w-4 h-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBg}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-8">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0">
              <img src={brandLogo} alt="Brandtelligence" className="h-8 w-auto object-contain" />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1 flex-1" onMouseLeave={() => setOpenMega(null)}>
              {NAV_LINKS.map(link => (
                <div key={link.label} className="relative" onMouseEnter={() => setOpenMega(link.mega ?? null)}>
                  <Link
                    to={link.href}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname.startsWith(link.href) ? navActive : navLink
                    }`}
                  >
                    {link.label}
                    {link.mega && (
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openMega === link.mega ? 'rotate-180' : ''}`} />
                    )}
                  </Link>

                  {/* Mega dropdown */}
                  <AnimatePresence>
                    {link.mega && openMega === link.mega && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[520px] rounded-2xl p-4 grid grid-cols-2 gap-2 ${megaBg}`}
                      >
                        {MEGA[link.mega].map(item => (
                          <Link
                            key={item.label}
                            to={item.href}
                            className={`flex items-start gap-3 p-3 rounded-xl transition-colors group ${megaItemHover}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-bt-teal shrink-0 transition-colors ${megaIconBg}`}>
                              {item.icon}
                            </div>
                            <div>
                              <p className={`text-sm font-medium transition-colors ${megaLabel}`}>{item.label}</p>
                              <p className={`text-xs mt-0.5 ${megaDesc}`}>{item.desc}</p>
                            </div>
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </nav>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-2 ml-auto shrink-0">
              {/* Theme toggle */}
              {toggleBtn}

              <Link to="/login" className={`text-sm font-medium transition-colors px-3 py-2 rounded-lg ${loginLink}`}>
                Log In
              </Link>
              <Link
                to="/request-access"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-bt-teal to-bt-teal-dark text-white text-sm font-bold shadow-lg shadow-bt-teal/30 hover:shadow-bt-teal/50 hover:scale-105 transition-all duration-200"
              >
                Start Free Trial <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile: toggle + hamburger */}
            <div className="lg:hidden ml-auto flex items-center gap-2">
              {toggleBtn}
              <button
                className={`p-2 rounded-lg transition-colors ${hamburgerCls}`}
                onClick={() => setMobileOpen(v => !v)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
            className={`fixed inset-0 z-40 pt-16 overflow-y-auto lg:hidden ${mobileDrawerBg}`}
          >
            <div className="p-6 space-y-1">
              {NAV_LINKS.map(link => (
                <div key={link.label}>
                  {link.mega ? (
                    <>
                      <button
                        onClick={() => setMobileExpanded(mobileExpanded === link.mega ? null : link.mega!)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium transition-colors ${mobileLinkCls}`}
                      >
                        {link.label}
                        <ChevronDown className={`w-4 h-4 transition-transform ${mobileExpanded === link.mega ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {mobileExpanded === link.mega && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden pl-4"
                          >
                            {MEGA[link.mega!].map(item => (
                              <Link key={item.label} to={item.href} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${mobileMegaLinkCls}`}>
                                <span className={mobileIconCls}>{item.icon}</span>
                                {item.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <Link to={link.href} className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${mobileLinkCls}`}>
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}

              <div className={`pt-6 space-y-3 border-t ${mobileDivider} mt-4`}>
                <Link to="/login" className={`block text-center px-4 py-3 rounded-xl border font-medium transition-colors ${mobileLoginCls}`}>
                  Log In
                </Link>
                <Link to="/request-access" className="block text-center px-4 py-3 rounded-xl bg-gradient-to-r from-bt-teal to-bt-teal-dark text-white font-bold shadow-lg shadow-bt-teal/30">
                  Start Free Trial — No Credit Card
                </Link>

                {/* Theme toggle in mobile */}
                <button
                  onClick={toggleTheme}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isDark
                      ? 'border border-white/20 text-white/70 hover:text-white'
                      : 'border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {isDark ? <><Sun className="w-4 h-4" /> Switch to Light Mode</> : <><Moon className="w-4 h-4" /> Switch to Dark Mode</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}