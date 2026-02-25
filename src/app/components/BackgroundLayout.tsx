import { ReactNode, useMemo } from 'react';
import { motion } from 'motion/react';
import { useFoldableLayout } from '../hooks/useFoldableLayout';

/**
 * BackgroundLayout
 * ─────────────────────────────────────────────────────────
 * Shared animated background used across all portal pages.
 * Includes: gradient base, animated blobs, grid pattern overlay,
 * and floating particles.
 *
 * Responsive considerations:
 * - Blob sizes scale down on mobile via clamp() widths
 * - Particle count adapts to viewport (fewer on mobile for perf)
 * - Grid pattern scales for smaller screens
 * - Children are rendered in a relative z-10 container
 *
 * Foldable / Dual-Screen:
 * - Blobs reposition to avoid the hinge/seam area
 * - Grid pattern respects viewport segments
 * - Content wrapper uses fold-content-safe for hinge padding
 * - Squarish aspect ratios get extra blob coverage
 */

interface BackgroundLayoutProps {
  children: ReactNode;
  /** Number of floating particles – defaults to 25 on mobile, 40 on desktop */
  particleCount?: number;
}

export function BackgroundLayout({ children, particleCount }: BackgroundLayoutProps) {
  const { isDualScreen, spanningMode, isSquarish, isTabletop } = useFoldableLayout();

  // Memoize particle seeds so they don't regenerate on every render
  const particles = useMemo(() => {
    const count = particleCount ?? 30;
    return Array.from({ length: count }, (_, i) => {
      let xPct = Math.random() * 100;

      // On dual-screen horizontal, push particles away from the center hinge
      if (isDualScreen && spanningMode === 'dual-horizontal') {
        // Avoid the center 8% (hinge zone) — redistribute to left or right
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
  }, [particleCount, isDualScreen, spanningMode]);

  // Blob positions shift to fill each segment on dual-screen
  const blobPositions = useMemo(() => {
    if (isDualScreen && spanningMode === 'dual-horizontal') {
      // Keep blobs in left or right segments, away from the hinge
      return {
        blob1: { top: '0', left: '5%' },
        blob2: { top: '33%', right: '5%' },
        blob3: { bottom: '0', left: '25%' },
        blob4: { top: '50%', left: '25%' },
      };
    }
    if (isDualScreen && spanningMode === 'dual-vertical') {
      // Keep blobs in top or bottom segments
      return {
        blob1: { top: '5%', left: '0' },
        blob2: { top: '10%', right: '0' },
        blob3: { bottom: '5%', left: '33%' },
        blob4: { top: '25%', left: '50%' },
      };
    }
    // Default positions
    return {
      blob1: { top: '0', left: '0' },
      blob2: { top: '33%', right: '0' },
      blob3: { bottom: '0', left: '33%' },
      blob4: { top: '50%', left: '50%' },
    };
  }, [isDualScreen, spanningMode]);

  // Blob sizing adjusts for squarish screens (more coverage)
  const blobScale = isSquarish ? 1.15 : 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-teal-700 to-orange-600 overflow-hidden relative fold-posture-aware">
      {/* ── Animated background blobs ── */}
      {/* Sizes use clamp() to shrink gracefully on mobile viewports */}
      {/* On dual-screen, blobs avoid the hinge area */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bg-purple-500 rounded-full mix-blend-multiply blur-3xl opacity-20"
          style={{
            ...blobPositions.blob1,
            width: `calc(clamp(20rem, 50vw, 50rem) * ${blobScale})`,
            height: `calc(clamp(20rem, 50vw, 50rem) * ${blobScale})`,
          }}
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], x: [0, -50, 0], y: [0, 100, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bg-teal-400 rounded-full mix-blend-multiply blur-3xl opacity-20"
          style={{
            ...blobPositions.blob2,
            width: `calc(clamp(22rem, 55vw, 56rem) * ${blobScale})`,
            height: `calc(clamp(22rem, 55vw, 56rem) * ${blobScale})`,
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, -100, 0], y: [0, -50, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bg-orange-500 rounded-full mix-blend-multiply blur-3xl opacity-20"
          style={{
            ...blobPositions.blob3,
            width: `calc(clamp(18rem, 45vw, 44rem) * ${blobScale})`,
            height: `calc(clamp(18rem, 45vw, 44rem) * ${blobScale})`,
          }}
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bg-cyan-500 rounded-full mix-blend-multiply blur-3xl"
          style={{
            ...blobPositions.blob4,
            transform: isDualScreen ? undefined : 'translate(-50%, -50%)',
            width: `calc(clamp(16rem, 40vw, 38rem) * ${blobScale})`,
            height: `calc(clamp(16rem, 40vw, 38rem) * ${blobScale})`,
          }}
        />
      </div>

      {/* ── Grid pattern overlay ── */}
      {/* Pattern size scales from 60px on mobile -> 100px on desktop */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: 'clamp(3.75rem, 6vw, 6.25rem) clamp(3.75rem, 6vw, 6.25rem)',
        }}
      />

      {/* ── Floating particles ── */}
      {/* Positioned with % so they work at any viewport */}
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

      {/* ── Page content (z-10 to sit above background) ── */}
      {/* fold-content-safe adds hinge padding on dual-screen devices */}
      <div className={`relative z-10 ${isDualScreen ? 'fold-content-safe' : ''} ${isTabletop ? 'fold-tabletop-content' : ''}`}>
        {children}
      </div>
    </div>
  );
}