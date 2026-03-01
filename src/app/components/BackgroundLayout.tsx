import { ReactNode, useMemo } from 'react';
import { motion } from 'motion/react';
import { useFoldableLayout } from '../hooks/useFoldableLayout';
import { useDashboardTheme } from './saas/DashboardThemeContext';

/**
 * BackgroundLayout
 * ---------------------------------------------------------
 * Shared animated background used across all portal pages.
 *
 * Theme-aware:
 * - Dark mode: gradient base, animated blobs, grid pattern overlay, floating particles
 * - Light mode: clean white/gray-50 background with subtle brand-tinted accents,
 *   softer blobs at reduced opacity, and no grid/particles for a crisp feel
 *
 * Foldable / Dual-Screen:
 * - Blobs reposition to avoid the hinge/seam area
 * - Content wrapper uses fold-content-safe for hinge padding
 */

interface BackgroundLayoutProps {
  children: ReactNode;
  /** Number of floating particles -- defaults to 30 (dark mode only) */
  particleCount?: number;
}

export function BackgroundLayout({ children, particleCount }: BackgroundLayoutProps) {
  const { isDualScreen, spanningMode, isSquarish, isTabletop } = useFoldableLayout();
  const { isDark } = useDashboardTheme();

  // Memoize particle seeds so they don't regenerate on every render
  const particles = useMemo(() => {
    if (!isDark) return []; // No particles in light mode
    const count = particleCount ?? 30;
    return Array.from({ length: count }, (_, i) => {
      let xPct = Math.random() * 100;
      if (isDualScreen && spanningMode === 'dual-horizontal') {
        if (xPct > 46 && xPct < 54) {
          xPct = xPct < 50 ? xPct - 10 : xPct + 10;
        }
      }
      return {
        id: i,
        xPct: Math.max(0, Math.min(100, xPct)),
        yPct: Math.random() * 100,
        driftY: Math.random() * -200 - 100,
        duration: Math.random() * 4 + 3,
        delay: Math.random() * 5,
      };
    });
  }, [particleCount, isDualScreen, spanningMode, isDark]);

  // Blob positions shift to fill each segment on dual-screen
  const blobPositions = useMemo(() => {
    if (isDualScreen && spanningMode === 'dual-horizontal') {
      return {
        blob1: { top: '0', left: '5%' },
        blob2: { top: '33%', right: '5%' },
        blob3: { bottom: '0', left: '25%' },
        blob4: { top: '50%', left: '25%' },
      };
    }
    if (isDualScreen && spanningMode === 'dual-vertical') {
      return {
        blob1: { top: '5%', left: '0' },
        blob2: { top: '10%', right: '0' },
        blob3: { bottom: '5%', left: '33%' },
        blob4: { top: '25%', left: '50%' },
      };
    }
    return {
      blob1: { top: '0', left: '0' },
      blob2: { top: '33%', right: '0' },
      blob3: { bottom: '0', left: '33%' },
      blob4: { top: '50%', left: '50%' },
    };
  }, [isDualScreen, spanningMode]);

  const blobScale = isSquarish ? 1.15 : 1;

  // Light vs dark blob opacity + background
  const blobOpacity = isDark ? 0.2 : 0.06;
  const containerBg = isDark
    ? 'min-h-screen bg-gradient-to-br from-purple-900 via-teal-700 to-orange-600 overflow-hidden relative fold-posture-aware'
    : 'min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-hidden relative fold-posture-aware';

  return (
    <div className={containerBg}>
      {/* ── Animated background blobs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute rounded-full mix-blend-multiply blur-3xl"
          style={{
            ...blobPositions.blob1,
            width: `calc(clamp(20rem, 50vw, 50rem) * ${blobScale})`,
            height: `calc(clamp(20rem, 50vw, 50rem) * ${blobScale})`,
            background: isDark ? `rgba(168,85,247,${blobOpacity})` : `rgba(11,164,170,${blobOpacity})`,
          }}
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], x: [0, -50, 0], y: [0, 100, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute rounded-full mix-blend-multiply blur-3xl"
          style={{
            ...blobPositions.blob2,
            width: `calc(clamp(22rem, 55vw, 56rem) * ${blobScale})`,
            height: `calc(clamp(22rem, 55vw, 56rem) * ${blobScale})`,
            background: isDark ? `rgba(45,212,191,${blobOpacity})` : `rgba(62,60,112,${blobOpacity})`,
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, -100, 0], y: [0, -50, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute rounded-full mix-blend-multiply blur-3xl"
          style={{
            ...blobPositions.blob3,
            width: `calc(clamp(18rem, 45vw, 44rem) * ${blobScale})`,
            height: `calc(clamp(18rem, 45vw, 44rem) * ${blobScale})`,
            background: isDark ? `rgba(249,115,22,${blobOpacity})` : `rgba(244,122,32,${blobOpacity * 0.7})`,
          }}
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [blobOpacity * 0.5, blobOpacity, blobOpacity * 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute rounded-full mix-blend-multiply blur-3xl"
          style={{
            ...blobPositions.blob4,
            transform: isDualScreen ? undefined : 'translate(-50%, -50%)',
            width: `calc(clamp(16rem, 40vw, 38rem) * ${blobScale})`,
            height: `calc(clamp(16rem, 40vw, 38rem) * ${blobScale})`,
            background: isDark ? `rgba(6,182,212,${blobOpacity})` : `rgba(11,164,170,${blobOpacity * 0.5})`,
          }}
        />
      </div>

      {/* ── Grid pattern overlay (dark mode only) ── */}
      {isDark && (
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: 'clamp(3.75rem, 6vw, 6.25rem) clamp(3.75rem, 6vw, 6.25rem)',
          }}
        />
      )}

      {/* ── Floating particles (dark mode only) ── */}
      {isDark && particles.length > 0 && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {particles.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0], y: [0, p.driftY] }}
              transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeOut' }}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
            />
          ))}
        </div>
      )}

      {/* ── Page content (z-10 to sit above background) ── */}
      <div className={`relative z-10 ${isDualScreen ? 'fold-content-safe' : ''} ${isTabletop ? 'fold-tabletop-content' : ''}`}>
        {children}
      </div>
    </div>
  );
}
