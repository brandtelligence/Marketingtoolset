import { BackgroundLayout } from '../components/BackgroundLayout';
import { LandingHero } from '../components/landing/LandingHero';
import { LandingUSP } from '../components/landing/LandingUSP';
import { LandingDashboard } from '../components/landing/LandingDashboard';
import { LandingFAB } from '../components/landing/LandingFAB';
import { LandingROI } from '../components/landing/LandingROI';
import { LandingModules } from '../components/landing/LandingModules';
import { LandingCTA } from '../components/landing/LandingCTA';

/**
 * HomePage — Long-scroll marketing landing page.
 *
 * Section order:
 * 1. Hero         — Logo, headline, stats bar, CTA buttons
 * 2. USP          — 6 unique selling points from platform modules
 * 3. Dashboard    — CSS-crafted interactive browser mockup
 * 4. FAB          — Feature → Advantage → Benefit for 6 capabilities
 * 5. ROI          — SME ROI/KPI framework with cost comparison & timeline
 * 6. Modules      — Full 18-module catalogue with category filters
 * 7. CTA          — Final call-to-action with trust badges
 *
 * Responsive: mobile-first, all sections fluid to max-w-7xl.
 * Animations: whileInView with once:true for scroll-reveal.
 * Design: glassmorphism, purple/teal/orange gradient palette.
 */

export function HomePage() {
  return (
    <BackgroundLayout particleCount={40}>
      <div className="flex flex-col">

        {/* 1. Hero */}
        <LandingHero />

        {/* Divider */}
        <div className="border-t border-white/8 max-w-7xl mx-auto w-full px-4 sm:px-6" />

        {/* 2. USP — 6 module-based selling points */}
        <LandingUSP />

        {/* Divider */}
        <div className="border-t border-white/8 max-w-7xl mx-auto w-full px-4 sm:px-6" />

        {/* 3. Dashboard mockup — interactive CSS platform preview */}
        <LandingDashboard />

        {/* Divider */}
        <div className="border-t border-white/8 max-w-7xl mx-auto w-full px-4 sm:px-6" />

        {/* 4. FAB — Feature → Advantage → Benefit */}
        <LandingFAB />

        {/* Divider */}
        <div className="border-t border-white/8 max-w-7xl mx-auto w-full px-4 sm:px-6" />

        {/* 5. ROI — SME return on investment & KPI framework */}
        <LandingROI />

        {/* Divider */}
        <div className="border-t border-white/8 max-w-7xl mx-auto w-full px-4 sm:px-6" />

        {/* 6. Modules — full 18-module catalogue */}
        <LandingModules />

        {/* Divider */}
        <div className="border-t border-white/8 max-w-7xl mx-auto w-full px-4 sm:px-6" />

        {/* 7. CTA — final conversion section */}
        <LandingCTA />

        {/* ── Copyright Footer ── */}
        <div className="border-t border-white/8 py-6 px-4 text-center">
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} Brandtelligence Sdn. Bhd. All rights reserved.
          </p>
        </div>

      </div>
    </BackgroundLayout>
  );
}