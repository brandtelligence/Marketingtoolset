/**
 * WebFooter — Global marketing website footer
 * Full link grid · Social icons · Trust badges · Legal bar
 * Supports light / dark mode via useWebTheme + Tailwind dark: variants
 */
import { Link } from 'react-router';
import { Zap, Twitter, Linkedin, Youtube, Globe, ArrowRight } from 'lucide-react';
import { useWebTheme } from '../../contexts/WebThemeContext';
import brandLogo from 'figma:asset/250842c5232a8611aa522e6a3530258e858657d5.png';

const FOOTER_COLS = {
  Product: [
    { label: 'AI Content Studio',    href: '/product#ai-studio'    },
    { label: 'Campaign Analytics',   href: '/product#analytics'    },
    { label: 'Landing Page Builder', href: '/product#landing-pages'},
    { label: 'Contact Management',   href: '/product#crm'          },
    { label: 'Brand Kit Manager',    href: '/product#brand-kit'    },
    { label: 'Social Asset Library', href: '/product#assets'       },
    { label: 'QR Code Generator',    href: '/product#qr'           },
  ],
  Features: [
    { label: 'All Features',           href: '/features'               },
    { label: 'Integrations',           href: '/features#integrations'  },
    { label: 'API Access',             href: '/features#api'           },
    { label: 'Security & Compliance',  href: '/features#security'      },
    { label: 'Multi-Tenant RBAC',      href: '/features#rbac'          },
    { label: 'Audit Trails',           href: '/features#audit'         },
  ],
  Company: [
    { label: 'About Us',    href: '/about'        },
    { label: 'Blog',        href: '/blog'         },
    { label: 'Case Studies',href: '/testimonials' },
    { label: 'Pricing',     href: '/pricing'      },
    { label: 'Careers',     href: '/about#careers'},
    { label: 'Contact',     href: '/contact'      },
  ],
  Legal: [
    { label: 'Privacy Policy',  href: '/privacy'  },
    { label: 'Terms of Service',href: '/terms'    },
    { label: 'Cookie Policy',   href: '/cookies'  },
    { label: 'GDPR',            href: '/privacy#gdpr' },
    { label: 'Security',        href: '/features#security' },
  ],
};

const SOCIALS = [
  { Icon: Twitter,  href: '#', label: 'Twitter'  },
  { Icon: Linkedin, href: '#', label: 'LinkedIn'  },
  { Icon: Youtube,  href: '#', label: 'YouTube'   },
  { Icon: Globe,    href: '#', label: 'Website'   },
];

const BADGES = [
  { emoji: '🔒', text: 'SOC 2 Type II' },
  { emoji: '🛡️', text: 'GDPR Ready'   },
  { emoji: '🌏', text: 'Global CDN'   },
  { emoji: '⚡', text: '99.9% Uptime' },
];

export function WebFooter() {
  const { isDark } = useWebTheme();

  const footerBg     = isDark ? 'bg-[#04050d]'  : 'bg-gray-100';
  const borderTop    = isDark ? 'border-white/[0.07]' : 'border-gray-200';
  const borderInner  = isDark ? 'border-white/[0.07]' : 'border-gray-200';
  const badgeBg      = isDark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-gray-200';
  const badgeText    = isDark ? 'text-white/40'  : 'text-gray-500';
  const socialCls    = isDark
    ? 'bg-white/5 border-white/10 text-white/40 hover:text-bt-teal hover:bg-bt-teal/10 hover:border-bt-teal/30'
    : 'bg-white border-gray-200 text-gray-400 hover:text-bt-teal hover:border-bt-teal/30';
  const colTitle     = isDark ? 'text-white'     : 'text-gray-900';
  const linkCls      = isDark ? 'text-white/40 hover:text-bt-teal' : 'text-gray-500 hover:text-bt-teal';
  const logoText     = isDark ? 'text-white'     : 'text-gray-900';
  const brandDesc    = isDark ? 'text-white/45'  : 'text-gray-500';
  const ctaDesc      = isDark ? 'text-white/50'  : 'text-gray-500';
  const ctaTitle     = isDark ? 'text-white'     : 'text-gray-900';
  const copyright    = isDark ? 'text-white/25'  : 'text-gray-400';
  const legalLink    = isDark ? 'text-white/25 hover:text-bt-teal' : 'text-gray-400 hover:text-bt-teal';

  return (
    <footer className={`border-t ${borderTop} ${footerBg} transition-colors duration-300`} aria-label="Site footer">

      {/* CTA strip */}
      <section aria-label="Free trial call to action" className={`border-b ${borderInner}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <p className={`font-bold text-lg ${ctaTitle}`}>Ready to transform your marketing?</p>
            <p className={`text-sm mt-0.5 ${ctaDesc}`}>Start your 14-day free trial. No credit card required.</p>
          </div>
          <Link
            to="/request-access"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-bt-teal to-bt-teal-dark text-white font-bold text-sm shadow-lg shadow-bt-teal/30 hover:shadow-bt-teal/50 hover:scale-105 transition-all duration-200 shrink-0"
          >
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10">

          {/* Brand column */}
          <div className="col-span-2">
            <Link to="/" aria-label="Brandtelligence — go to homepage" className="flex items-center gap-2.5 mb-4 group">
              <img src={brandLogo} alt="Brandtelligence logo" width={140} height={32} className="h-8 w-auto object-contain" />
            </Link>
            <p className={`text-sm leading-relaxed mb-5 max-w-[240px] ${brandDesc}`}>
              The AI-powered marketing intelligence platform for ambitious brands and agencies managing clients at scale.
            </p>
            {/* Social links */}
            <nav aria-label="Brandtelligence social media profiles">
              <div className="flex gap-2.5 mb-6">
                {SOCIALS.map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={`Brandtelligence on ${label}`}
                    rel="noopener noreferrer"
                    target="_blank"
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${socialCls}`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </nav>
            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-2" aria-label="Security certifications">
              {BADGES.map(b => (
                <div key={b.text} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${badgeBg}`}>
                  <span className="text-xs" aria-hidden="true">{b.emoji}</span>
                  <span className={`text-xs ${badgeText}`}>{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Link columns — each rendered as a <nav> with semantic <h3> headings */}
          {Object.entries(FOOTER_COLS).map(([title, links]) => (
            <nav key={title} aria-label={`${title} links`}>
              <h3 className={`text-sm font-semibold mb-5 ${colTitle}`}>{title}</h3>
              <ul className="space-y-3">
                {links.map(link => (
                  <li key={link.label}>
                    <Link to={link.href} className={`text-sm transition-colors ${linkCls}`}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Bottom legal bar */}
      <div className={`border-t ${borderInner}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className={`text-xs ${copyright}`}>
            <span>© 2025 Brandtelligence Sdn Bhd. All rights reserved.</span>
            {' '}Built for global marketing teams.
          </p>
          <nav aria-label="Legal pages">
            <div className="flex items-center gap-4">
              <Link to="/privacy" className={`text-xs transition-colors ${legalLink}`}>Privacy Policy</Link>
              <Link to="/terms"   className={`text-xs transition-colors ${legalLink}`}>Terms of Service</Link>
              <Link to="/cookies" className={`text-xs transition-colors ${legalLink}`}>Cookie Policy</Link>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}