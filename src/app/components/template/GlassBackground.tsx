/**
 * GlassBackground — Brandtelligence Design System Template
 * ─────────────────────────────────────────────────────────────────────────────
 * COPY-PASTE READY: Zero build-specific dependencies.
 * Dependencies: motion/react   (install: pnpm add motion)
 *
 * Drop this file into any Figma Make project and wrap your pages with it.
 *
 * Usage:
 *   <GlassBackground>
 *     <YourPage />
 *   </GlassBackground>
 *
 * Palette variants — pass `palette` prop:
 *   'brand'   → purple / teal / orange  (Brandtelligence default)
 *   'ocean'   → indigo / cyan / blue
 *   'sunset'  → rose / orange / amber
 *   'forest'  → emerald / teal / green
 *   'midnight'→ slate / violet / purple
 *   'custom'  → use `customGradient` prop for full Tailwind class control
 */

import { ReactNode, useMemo } from 'react';
import { motion } from 'motion/react';

// ── Types ──────────────────────────────────────────────────────────────────────

export type GlassPalette = 'brand' | 'ocean' | 'sunset' | 'forest' | 'midnight' | 'custom';

interface GlassBackgroundProps {
  children: ReactNode;
  /** Number of floating particles (default 30) */
  particleCount?: number;
  /** Colour palette preset */
  palette?: GlassPalette;
  /**
   * Full Tailwind gradient string e.g. "from-rose-900 via-orange-700 to-amber-500"
   * Only used when palette='custom'
   */
  customGradient?: string;
}

// ── Palette definitions ────────────────────────────────────────────────────────

const PALETTES: Record<GlassPalette, {
  gradient: string;
  blob1: string; blob2: string; blob3: string; blob4: string;
}> = {
  brand: {
    gradient: 'from-purple-900 via-teal-700 to-orange-600',
    blob1: 'bg-purple-500', blob2: 'bg-teal-400', blob3: 'bg-orange-500', blob4: 'bg-cyan-500',
  },
  ocean: {
    gradient: 'from-indigo-900 via-blue-700 to-cyan-600',
    blob1: 'bg-indigo-500', blob2: 'bg-cyan-400', blob3: 'bg-blue-500', blob4: 'bg-teal-400',
  },
  sunset: {
    gradient: 'from-rose-900 via-orange-700 to-amber-500',
    blob1: 'bg-rose-500', blob2: 'bg-orange-400', blob3: 'bg-amber-500', blob4: 'bg-red-400',
  },
  forest: {
    gradient: 'from-emerald-900 via-teal-700 to-green-600',
    blob1: 'bg-emerald-500', blob2: 'bg-teal-400', blob3: 'bg-green-500', blob4: 'bg-cyan-400',
  },
  midnight: {
    gradient: 'from-slate-900 via-violet-900 to-purple-800',
    blob1: 'bg-violet-500', blob2: 'bg-purple-400', blob3: 'bg-slate-500', blob4: 'bg-indigo-400',
  },
  custom: {
    gradient: 'from-purple-900 via-teal-700 to-orange-600',
    blob1: 'bg-purple-500', blob2: 'bg-teal-400', blob3: 'bg-orange-500', blob4: 'bg-cyan-500',
  },
};

// ── Component ──────────────────────────────────────────────────────────────────

export function GlassBackground({
  children,
  particleCount = 30,
  palette = 'brand',
  customGradient,
}: GlassBackgroundProps) {
  const pal = PALETTES[palette];
  const gradientClass = palette === 'custom' && customGradient
    ? customGradient
    : pal.gradient;

  // Memoised so particles don't re-seed on re-render
  const particles = useMemo(() =>
    Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      xPct: Math.random() * 100,
      yPct: Math.random() * 100,
      driftY: Math.random() * -200 - 100,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 5,
    })),
  [particleCount]);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${gradientClass} overflow-hidden relative`}>

      {/* ── Animated background blobs ── */}
      {/* Sizes use clamp() so they scale gracefully on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute top-0 left-0 ${pal.blob1} rounded-full mix-blend-multiply blur-3xl opacity-20`}
          style={{ width: 'clamp(20rem,50vw,50rem)', height: 'clamp(20rem,50vw,50rem)' }}
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], x: [0, -50, 0], y: [0, 100, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute top-1/3 right-0 ${pal.blob2} rounded-full mix-blend-multiply blur-3xl opacity-20`}
          style={{ width: 'clamp(22rem,55vw,56rem)', height: 'clamp(22rem,55vw,56rem)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, -100, 0], y: [0, -50, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute bottom-0 left-1/3 ${pal.blob3} rounded-full mix-blend-multiply blur-3xl opacity-20`}
          style={{ width: 'clamp(18rem,45vw,44rem)', height: 'clamp(18rem,45vw,44rem)' }}
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${pal.blob4} rounded-full mix-blend-multiply blur-3xl`}
          style={{ width: 'clamp(16rem,40vw,38rem)', height: 'clamp(16rem,40vw,38rem)' }}
        />
      </div>

      {/* ── Grid pattern overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: 'clamp(3.75rem, 6vw, 6.25rem) clamp(3.75rem, 6vw, 6.25rem)',
        }}
      />

      {/* ── Floating particles ── */}
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

      {/* ── Page content ── */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}