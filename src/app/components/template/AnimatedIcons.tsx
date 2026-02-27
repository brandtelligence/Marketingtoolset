/**
 * AnimatedIcons — Brandtelligence Icon Kit (Black & Orange)
 * ─────────────────────────────────────────────────────────────────────────────
 * Flaticon-style animated icons:
 *   • Multi-part SVG — internal elements animate independently (not just container)
 *   • Bold filled shapes on black containers — orange accent details
 *   • Shine sweep on hover (light shimmer across the container)
 *   • Continuous idle micro-animations on orange accents
 *   • 18 fully custom SVG icon components + generic AnimatedIcon wrapper
 *
 * COPY-PASTE READY: Dependencies → motion/react only (no lucide-react required)
 *
 * Quick usage:
 *   <FlatBell size="lg" />                    — custom animated SVG
 *   <AnimatedIcon icon={<Zap />} />            — generic wrapper for any icon
 *   <FlatIconGrid icons={FLAT_ICON_SETS.platform} columns={6} />
 */

import { ReactNode } from 'react';
import { motion } from 'motion/react';

// ── Sizes ──────────────────────────────────────────────────────────────────────

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type IconShape = 'circle' | 'rounded' | 'squircle';
export type IconVariant = 'solid' | 'outline' | 'ghost' | 'gradient';
export type IconAnimation = 'bounce' | 'pulse' | 'spin' | 'shake' | 'pop' | 'swing' | 'ring' | 'float' | 'none';

const CONTAINER_SIZE: Record<IconSize, string> = {
  xs:   'w-8  h-8',
  sm:   'w-10 h-10',
  md:   'w-12 h-12',
  lg:   'w-16 h-16',
  xl:   'w-20 h-20',
  '2xl':'w-24 h-24',
};
const ICON_SIZE: Record<IconSize, string> = {
  xs:   'w-4  h-4',
  sm:   'w-5  h-5',
  md:   'w-6  h-6',
  lg:   'w-8  h-8',
  xl:   'w-10 h-10',
  '2xl':'w-12 h-12',
};
const SHAPE: Record<IconShape, string> = {
  circle:   'rounded-full',
  rounded:  'rounded-2xl',
  squircle: 'rounded-[28%]',
};

// ── Colours ────────────────────────────────────────────────────────────────────

const OG  = '#f97316'; // orange-500
const OGL = '#fb923c'; // orange-400 (lighter)
const W   = '#ffffff'; // white
const WD  = 'rgba(255,255,255,0.65)'; // white dimmed

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM FLAT SVG ICONS (18 icons — each has animated internal elements)
// Each component renders a bare SVG — wrap in <FlatIconWrap> for the container.
// ═══════════════════════════════════════════════════════════════════════════════

/** Bell — bell swings, orange notification dot pulses */
export function FlatBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <motion.g
        animate={{ rotate: [0, -12, 12, -8, 8, -4, 4, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
        style={{ transformOrigin: '12px 3px' }}
      >
        <path d="M18 9a6 6 0 0 0-12 0c0 5-3 8-3 8h18s-3-3-3-8z" fill={W} />
        <circle cx="12" cy="3" r="1.5" fill={W} />
      </motion.g>
      <path d="M10.3 21a2 2 0 0 0 3.4 0" stroke={W} strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Orange dot — pulses on its own */}
      <motion.circle
        cx="18" cy="5.5" r="4"
        fill={OG}
        animate={{ scale: [1, 1.25, 1], opacity: [1, 0.75, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.8 }}
      />
      <circle cx="18" cy="5.5" r="1.8" fill={W} />
    </svg>
  );
}

/** Rocket — flame oscillates, rocket lifts on hover */
export function FlatRocket() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <motion.g
        whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 10 } }}
      >
        {/* Body */}
        <path d="M12 2C9 2 7 5.5 7 9.5v5l5 2.5 5-2.5v-5C17 5.5 15 2 12 2z" fill={W} />
        {/* Fins */}
        <path d="M7 13l-3 4.5h3z" fill={WD} />
        <path d="M17 13l3 4.5h-3z" fill={WD} />
        {/* Window */}
        <circle cx="12" cy="9" r="2.5" fill={OG} />
        <circle cx="12" cy="9" r="1.2" fill={W} />
      </motion.g>
      {/* Exhaust flame — always animating */}
      <motion.path
        d="M10 17.5c0 0 .8 4 2 4s2-4 2-4"
        stroke={OG} strokeWidth="2.5" strokeLinecap="round" fill="none"
        animate={{ scaleY: [1, 1.5, 0.7, 1.3, 1], opacity: [1, 0.7, 1, 0.8, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '12px 17.5px' }}
      />
    </svg>
  );
}

/** Shield — checkmark draws in on hover, shield subtly pulses */
export function FlatShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <motion.path
        d="M12 2L4 5.5v6C4 16.5 7.5 21 12 22c4.5-1 8-5.5 8-10.5v-6L12 2z"
        fill={W}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
        style={{ transformOrigin: '12px 12px' }}
      />
      {/* Check — orange accent */}
      <motion.path
        d="M8 12l3 3 5-6"
        stroke={OG} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
      />
    </svg>
  );
}

/** BarChart — bars grow from bottom, orange trend line */
export function FlatBarChart() {
  const bars = [
    { x: 3,  h: 8,  delay: 0.1, fill: WD },
    { x: 10, h: 13, delay: 0.2, fill: W  },
    { x: 17, h: 10, delay: 0.3, fill: WD },
  ];
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      {bars.map((b, i) => (
        <motion.rect
          key={i} x={b.x} y={21 - b.h} width="4" height={b.h} rx="1.5"
          fill={b.fill}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.7, delay: b.delay, ease: 'easeOut' }}
          style={{ transformOrigin: `${b.x + 2}px 21px` }}
        />
      ))}
      {/* Orange trend line */}
      <motion.polyline
        points="5,16 12,8 19,11"
        stroke={OG} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
      />
      {[{ cx: 5, cy: 16 }, { cx: 12, cy: 8 }, { cx: 19, cy: 11 }].map((p, i) => (
        <motion.circle
          key={i} cx={p.cx} cy={p.cy} r="1.8" fill={OG}
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 + i * 0.15 }}
          style={{ transformOrigin: `${p.cx}px ${p.cy}px` }}
        />
      ))}
    </svg>
  );
}

/** Mail — envelope with flap that lifts on hover */
export function FlatMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      {/* Envelope body */}
      <rect x="2" y="7" width="20" height="14" rx="2" fill={W} />
      {/* Envelope bottom fold lines */}
      <path d="M2 15l6-4M22 15l-6-4" stroke={WD} strokeWidth="1" />
      {/* Animated flap */}
      <motion.path
        d="M2 9l10 7 10-7"
        stroke="#d1d5db" strokeWidth="1.5" fill={W}
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
      />
      {/* Orange stamp */}
      <motion.rect
        x="15" y="9" width="5" height="3.5" rx="0.75" fill={OG}
        animate={{ opacity: [1, 0.6, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <line x1="16" y1="10.75" x2="19" y2="10.75" stroke={W} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

/** Gear — outer ring rotates, orange center pulses */
export function FlatGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      {/* Rotating gear body */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '12px 12px' }}
      >
        <circle cx="12" cy="12" r="9" fill="none" stroke={W} strokeWidth="2"
          strokeDasharray="4.2 1.8" />
        <circle cx="12" cy="12" r="5.5" fill={W} />
      </motion.g>
      {/* Static orange center */}
      <motion.circle
        cx="12" cy="12" r="2.5" fill={OG}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
        style={{ transformOrigin: '12px 12px' }}
      />
    </svg>
  );
}

/** Star — sparkles burst outward, inner star glows */
export function FlatStar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      {/* Outer star */}
      <motion.path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={W}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.5 }}
        style={{ transformOrigin: '12px 12px' }}
      />
      {/* Inner orange star */}
      <motion.path
        d="M12 6.5l2 4 4 .6-2.9 2.8.7 4L12 15.8l-3.8 2 .7-4L6 11.1l4-.6 2-4z"
        fill={OG}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}

/** Zap/Lightning — bolt flashes with orange inner glow */
export function FlatZap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      {/* White outer bolt */}
      <path d="M13 2L3 14h8l-2 8 10-12h-8l2-8z" fill={W} />
      {/* Orange inner bolt — flashes */}
      <motion.path
        d="M13 6L7 14h5l-1 4 6-8h-5l1-4z"
        fill={OG}
        animate={{ opacity: [0.5, 1, 0.3, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}

/** Lock — shackle bounces open then snaps shut */
export function FlatLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      {/* Lock body */}
      <rect x="4" y="10" width="16" height="12" rx="2.5" fill={W} />
      {/* Animated shackle */}
      <motion.path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        fill="none" stroke={W} strokeWidth="2.5" strokeLinecap="round"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
      />
      {/* Orange keyhole */}
      <circle cx="12" cy="15.5" r="2.2" fill={OG} />
      <motion.rect
        x="11" y="16.5" width="2" height="3" rx="1" fill={OG}
        animate={{ scaleY: [1, 1.3, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
        style={{ transformOrigin: '12px 18px' }}
      />
    </svg>
  );
}

/** Globe — orange longitude arc rotates */
export function FlatGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      {/* Globe outline */}
      <circle cx="12" cy="12" r="10" stroke={W} strokeWidth="2" fill="none" />
      {/* Latitude lines */}
      <line x1="2" y1="12" x2="22" y2="12" stroke={WD} strokeWidth="1.2" />
      <path d="M4 7h16M4 17h16" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      {/* Meridian (white) */}
      <path d="M12 2c-3.5 3-5 6-5 10s1.5 7 5 10" stroke={WD} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M12 2c3.5 3 5 6 5 10s-1.5 7-5 10" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Orange rotating arc */}
      <motion.path
        d="M2 12a10 10 0 0 1 20 0"
        stroke={OG} strokeWidth="2.5" strokeLinecap="round" fill="none"
        animate={{ rotate: 360 }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '12px 12px' }}
      />
    </svg>
  );
}

/** Users — secondary user slides right, orange connecting dot */
export function FlatUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      {/* Primary user */}
      <circle cx="9" cy="7" r="4" fill={W} />
      <path d="M1 21a8 8 0 0 1 16 0H1z" fill={W} />
      {/* Secondary user (slightly transparent) */}
      <motion.g
        animate={{ x: [0, 2, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
      >
        <circle cx="17" cy="7" r="3" fill={WD} />
        <path d="M14 21a6 6 0 0 1 8 0h-8z" fill={WD} />
      </motion.g>
      {/* Orange connecting badge */}
      <motion.circle
        cx="12.5" cy="21" r="0" fill={OG}
        animate={{ r: [0, 0, 0] }}
      />
      {/* Orange plus badge */}
      <motion.circle
        cx="18" cy="4" r="3.5" fill={OG}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
        style={{ transformOrigin: '18px 4px' }}
      />
      <line x1="18" y1="2.5" x2="18" y2="5.5" stroke={W} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16.5" y1="4" x2="19.5" y2="4" stroke={W} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Search — magnifier scans left-right */
export function FlatSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      <motion.g
        animate={{ x: [0, 2, -2, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
      >
        <circle cx="11" cy="11" r="8" stroke={W} strokeWidth="2.5" fill="none" />
        <circle cx="11" cy="11" r="4" stroke={OG} strokeWidth="1.5" fill="none" />
        <circle cx="11" cy="11" r="1.5" fill={OG} />
      </motion.g>
      <motion.path
        d="M21 21l-4.35-4.35"
        stroke={W} strokeWidth="2.5" strokeLinecap="round"
        animate={{ x: [0, 2, -2, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}
      />
    </svg>
  );
}

/** Heart — beats with orange inner pulse ring */
export function FlatHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      {/* White heart */}
      <motion.path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={W}
        animate={{ scale: [1, 1.12, 1, 1.08, 1] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.5 }}
        style={{ transformOrigin: '12px 12px' }}
      />
      {/* Orange inner heart */}
      <path
        d="M16.5 6.5a3 3 0 0 0-4.5 0A3 3 0 0 0 7.5 10l.5.5L12 14.5l4-4 .5-.5a3 3 0 0 0 0-3.5z"
        fill={OG}
      />
    </svg>
  );
}

/** Target — rings ripple outward from bullseye */
export function FlatTarget() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      {/* Outer ring */}
      <motion.circle cx="12" cy="12" r="10" stroke={WD} strokeWidth="1.5" fill="none"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.5 }}
        style={{ transformOrigin: '12px 12px' }}
      />
      {/* Mid ring — orange */}
      <circle cx="12" cy="12" r="6.5" stroke={OG} strokeWidth="2" fill="none" />
      {/* Inner ring */}
      <circle cx="12" cy="12" r="3" stroke={W} strokeWidth="1.5" fill="none" />
      {/* Bullseye */}
      <motion.circle cx="12" cy="12" r="1.5" fill={OG}
        animate={{ scale: [1, 1.4, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.8 }}
        style={{ transformOrigin: '12px 12px' }}
      />
    </svg>
  );
}

/** Megaphone — orange sound waves ripple out */
export function FlatMegaphone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      {/* Body */}
      <path d="M3 8.5v7L6 17V8l-3 .5z" fill={W} />
      {/* Horn */}
      <path d="M6 8l11-5v14L6 12V8z" fill={W} />
      {/* Handle */}
      <path d="M6 16l1 3.5a1 1 0 0 0 1.8.5l1.5-2" stroke={WD} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Animated sound waves */}
      {[0, 1, 2].map(i => (
        <motion.path
          key={i}
          d={`M18 ${8 + i}a${4 - i} ${4 - i} 0 0 1 0 ${8 - i * 2}`}
          stroke={OG} strokeWidth="2" fill="none" strokeLinecap="round"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity, ease: 'easeOut' }}
          style={{ opacity: 0 }}
        />
      ))}
    </svg>
  );
}

/** Trophy — star spins inside trophy cup */
export function FlatTrophy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      {/* Cup */}
      <path d="M5 3h14v7a7 7 0 0 1-14 0V3z" fill={W} />
      {/* Handles */}
      <path d="M5 5H3a2 2 0 0 0 0 4h2M19 5h2a2 2 0 0 1 0 4h-2" stroke={W} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Stem + base */}
      <line x1="12" y1="17" x2="12" y2="21" stroke={W} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="21" x2="16" y2="21" stroke={W} strokeWidth="2" strokeLinecap="round" />
      {/* Spinning orange star inside cup */}
      <motion.path
        d="M12 5.5l1.4 2.9 3.1.45-2.25 2.2.53 3.1L12 12.5l-2.78 1.65.53-3.1L7.5 8.85l3.1-.45L12 5.5z"
        fill={OG}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '12px 9px' }}
      />
    </svg>
  );
}

/** CPU — circuit lines pulse orange */
export function FlatCpu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      {/* CPU body */}
      <rect x="5" y="5" width="14" height="14" rx="2" fill={W} />
      {/* Inner chip */}
      <motion.rect
        x="8" y="8" width="8" height="8" rx="1" fill={OG}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Pins */}
      {[9, 12, 15].map(x => (
        <g key={x}>
          <line x1={x} y1="2" x2={x} y2="5" stroke={W} strokeWidth="1.5" strokeLinecap="round" />
          <line x1={x} y1="19" x2={x} y2="22" stroke={W} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ))}
      {[9, 12, 15].map(y => (
        <g key={y}>
          <line x1="2" y1={y} x2="5" y2={y} stroke={W} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="19" y1={y} x2="22" y2={y} stroke={W} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      ))}
      {/* Center dot */}
      <circle cx="12" cy="12" r="1.5" fill={W} />
    </svg>
  );
}

/** Sparkles / AI — orbiting sparks */
export function FlatSparkles() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
      {/* Main spark */}
      <path d="M12 2l2 8h8l-6.5 4.7 2.5 7.7L12 18l-6 4.4 2.5-7.7L2 10h8z" fill={W} />
      {/* Orange rotating small stars */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '12px 12px' }}
      >
        <circle cx="12" cy="3" r="1.2" fill={OG} />
        <circle cx="21" cy="12" r="1.2" fill={OGL} />
        <circle cx="3" cy="12" r="1" fill={OG} />
      </motion.g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLAT ICON WRAPPER — black container + shine + hover animation
// ═══════════════════════════════════════════════════════════════════════════════

interface FlatIconWrapProps {
  children: ReactNode;
  size?: IconSize;
  shape?: IconShape;
  /** Lift the icon on hover (default true) */
  hoverable?: boolean;
  /** Show orange glow ring on hover */
  glowRing?: boolean;
  /** Badge count in upper-right */
  badge?: string | number;
  /** Label shown below */
  label?: string;
  className?: string;
  onClick?: () => void;
}

export function FlatIconWrap({
  children, size = 'md', shape = 'rounded', hoverable = true,
  glowRing = false, badge, label, className = '', onClick,
}: FlatIconWrapProps) {
  const shapeClass = SHAPE[shape];
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative inline-block">
        {/* Orange glow ring on hover */}
        {glowRing && (
          <motion.div
            className={`absolute inset-0 ${shapeClass} ring-2 ring-orange-500/70 pointer-events-none`}
            initial={{ opacity: 0, scale: 0.85 }}
            whileHover={{ opacity: 1, scale: 1.1 }}
            transition={{ duration: 0.25 }}
          />
        )}

        <motion.div
          className={`relative ${CONTAINER_SIZE[size]} ${shapeClass} bg-black flex items-center justify-center overflow-hidden cursor-${onClick ? 'pointer' : 'default'}`}
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)' }}
          whileHover={hoverable ? { y: -5, scale: 1.08, transition: { type: 'spring', stiffness: 400, damping: 15 } } : {}}
          whileTap={onClick ? { scale: 0.95 } : {}}
          onClick={onClick}
        >
          {/* Top-left inner highlight (depth illusion) */}
          <div
            className={`absolute inset-0 ${shapeClass} pointer-events-none`}
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, transparent 55%)' }}
          />

          {/* Hover shine sweep */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)' }}
            initial={{ x: '-100%', opacity: 0 }}
            whileHover={{ x: '150%', opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />

          {/* Icon */}
          <div className={`${ICON_SIZE[size]} relative z-10`}>
            {children}
          </div>
        </motion.div>

        {/* Badge */}
        {badge !== undefined && (
          <span className={`absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 bg-orange-500 text-white text-[0.6rem] font-bold rounded-full flex items-center justify-center ring-2 ring-black z-20`}>
            {badge}
          </span>
        )}
      </div>

      {label && (
        <span className="text-white/60 text-[0.65rem] text-center leading-tight font-medium">{label}</span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERIC AnimatedIcon WRAPPER (for Lucide or any ReactNode icon)
// ═══════════════════════════════════════════════════════════════════════════════

interface AnimatedIconProps {
  icon: ReactNode;
  animation?: IconAnimation;
  shape?: IconShape;
  variant?: IconVariant;
  size?: IconSize;
  containerClass?: string;
  iconClass?: string;
  glowRing?: boolean;
  badge?: string | number;
  idle?: boolean;
  className?: string;
  onClick?: () => void;
  label?: string;
}

const VARIANT_STYLE: Record<IconVariant, { container: string; icon: string }> = {
  solid:    { container: 'bg-black shadow-lg shadow-black/40', icon: 'text-orange-500' },
  outline:  { container: 'bg-transparent border-2 border-orange-500 shadow-lg shadow-orange-500/20', icon: 'text-orange-500' },
  ghost:    { container: 'bg-orange-500/15', icon: 'text-orange-400' },
  gradient: { container: 'bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg shadow-orange-500/40', icon: 'text-white' },
};

function getHoverAnim(animation: IconAnimation) {
  switch (animation) {
    case 'bounce': return { whileHover: { y: -6, transition: { type: 'spring', stiffness: 400, damping: 10 } } };
    case 'pulse':  return { whileHover: { scale: [1, 1.18, 1, 1.12, 1], transition: { duration: 0.5 } } };
    case 'spin':   return { whileHover: { rotate: 360, transition: { duration: 0.5, ease: 'easeInOut' } } };
    case 'shake':  return { whileHover: { x: [-4, 4, -4, 4, -2, 2, 0], transition: { duration: 0.4 } } };
    case 'pop':    return { whileHover: { scale: 1.2, transition: { type: 'spring', stiffness: 500, damping: 15 } } };
    case 'swing':  return { whileHover: { rotate: [0, -15, 12, -8, 5, 0], transition: { duration: 0.6 } } };
    case 'ring':   return { whileHover: { scale: 1.05 } };
    default:       return {};
  }
}

export function AnimatedIcon({
  icon, animation = 'bounce', shape = 'rounded', variant = 'solid', size = 'md',
  containerClass, iconClass, glowRing = false, badge, idle = false,
  className = '', onClick, label,
}: AnimatedIconProps) {
  const v = VARIANT_STYLE[variant];
  const hoverAnim = getHoverAnim(animation);

  return (
    <div className={`relative inline-block ${className}`}>
      {animation === 'ring' && (
        <motion.div
          className={`absolute inset-0 ${SHAPE[shape]} border-2 border-orange-500 pointer-events-none`}
          initial={{ scale: 1, opacity: 0 }}
          whileHover={{ scale: 1.5, opacity: 0, transition: { duration: 0.6 } }}
        />
      )}
      {glowRing && (
        <motion.div
          className={`absolute inset-0 ${SHAPE[shape]} ring-2 ring-orange-500/60 pointer-events-none`}
          initial={{ opacity: 0, scale: 0.85 }}
          whileHover={{ opacity: 1, scale: 1.08, transition: { duration: 0.25 } }}
        />
      )}
      <motion.div
        className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden
          ${CONTAINER_SIZE[size]} ${SHAPE[shape]} ${containerClass ?? v.container} transition-all duration-200
          ${onClick ? 'cursor-pointer' : ''}`}
        animate={idle ? { y: [0, -6, 0] } : undefined}
        transition={idle ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : undefined}
        onClick={onClick}
        title={label}
        {...hoverAnim}
      >
        {/* Inner shine */}
        {(variant === 'solid' || variant === 'gradient') && (
          <div className={`absolute inset-0 ${SHAPE[shape]} pointer-events-none`}
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />
        )}
        {/* Hover shine sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)' }}
          initial={{ x: '-100%', opacity: 0 }}
          whileHover={{ x: '150%', opacity: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
        <span className={`relative z-10 ${ICON_SIZE[size]} flex items-center justify-center ${iconClass ?? v.icon}`}>
          {icon}
        </span>
      </motion.div>
      {badge !== undefined && (
        <span className={`absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-orange-500 text-white text-[0.6rem] font-bold rounded-full flex items-center justify-center ring-2 ring-black z-20`}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLAT ICON GRID
// ═══════════════════════════════════════════════════════════════════════════════

export interface FlatIconItem {
  component: ReactNode;
  label: string;
  badge?: string | number;
}

interface FlatIconGridProps {
  icons: FlatIconItem[];
  size?: IconSize;
  shape?: IconShape;
  columns?: 3 | 4 | 5 | 6 | 8;
  showLabels?: boolean;
  glowRing?: boolean;
}

export function FlatIconGrid({
  icons, size = 'md', shape = 'rounded', columns = 6, showLabels = true, glowRing = false,
}: FlatIconGridProps) {
  const colClass: Record<number, string> = {
    3: 'grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-3 sm:grid-cols-5',
    6: 'grid-cols-3 sm:grid-cols-6',
    8: 'grid-cols-4 sm:grid-cols-8',
  };
  return (
    <div className={`grid ${colClass[columns]} gap-5`}>
      {icons.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05, duration: 0.4 }}
          className="flex justify-center"
        >
          <FlatIconWrap size={size} shape={shape} glowRing={glowRing} badge={item.badge} label={showLabels ? item.label : undefined}>
            {item.component}
          </FlatIconWrap>
        </motion.div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE CARD — Flaticon-style icon with card layout
// ═══════════════════════════════════════════════════════════════════════════════

interface IconFeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  shape?: IconShape;
  badge?: string;
  index?: number;
  onClick?: () => void;
}

export function IconFeatureCard({
  icon, title, description, shape = 'rounded', badge, index = 0, onClick,
}: IconFeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.55 }}
      whileHover={{ y: -5 }}
      onClick={onClick}
      className={`group relative bg-white/8 backdrop-blur-md border border-white/12 rounded-2xl p-6 flex flex-col
        hover:bg-white/12 hover:border-orange-500/30 transition-all duration-300 shadow-xl overflow-hidden
        ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Subtle orange glow on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/0 to-orange-500/0 group-hover:from-orange-500/6 group-hover:to-transparent transition-all duration-500 pointer-events-none" />

      <div className="flex items-start justify-between mb-4">
        <FlatIconWrap size="md" shape={shape} glowRing>
          {icon}
        </FlatIconWrap>
        {badge && (
          <span className="px-2.5 py-1 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[0.65rem] font-bold">
            {badge}
          </span>
        )}
      </div>

      <h3 className="text-white font-bold text-base mb-2">{title}</h3>
      <p className="text-white/60 text-sm leading-relaxed flex-1">{description}</p>

      <div className="flex items-center gap-1.5 mt-4 text-orange-400 text-xs font-semibold group-hover:gap-3 transition-all">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        <span>Learn more</span>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface IconStatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  shape?: IconShape;
}

export function IconStatCard({ icon, label, value, delta, deltaPositive = true, shape = 'rounded' }: IconStatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="bg-white/8 backdrop-blur-md border border-white/10 hover:border-orange-500/25 rounded-2xl p-5 transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-white/50 text-xs font-medium uppercase tracking-wider">{label}</p>
        <FlatIconWrap size="sm" shape={shape}>{icon}</FlatIconWrap>
      </div>
      <p className="text-white font-bold" style={{ fontSize: 'clamp(1.5rem,3vw,2rem)' }}>{value}</p>
      {delta && (
        <p className={`text-xs mt-1.5 font-medium ${deltaPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {deltaPositive ? '▲' : '▼'} {delta}
        </p>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET SETS — ready-to-use FlatIconItem arrays
// ═══════════════════════════════════════════════════════════════════════════════

export const FLAT_ICON_SETS: Record<string, FlatIconItem[]> = {
  platform: [
    { component: <FlatBarChart />,  label: 'Analytics'    },
    { component: <FlatBell />,      label: 'Alerts',  badge: 3 },
    { component: <FlatUsers />,     label: 'Users'        },
    { component: <FlatShield />,    label: 'Security'     },
    { component: <FlatGear />,      label: 'Settings'     },
    { component: <FlatSearch />,    label: 'Search'       },
    { component: <FlatLock />,      label: 'Access'       },
    { component: <FlatCpu />,       label: 'Infrastructure'},
    { component: <FlatGlobe />,     label: 'Global'       },
    { component: <FlatMail />,      label: 'Email'        },
    { component: <FlatTarget />,    label: 'Targets'      },
    { component: <FlatTrophy />,    label: 'Milestones'   },
  ],
  marketing: [
    { component: <FlatSparkles />,  label: 'AI Content'   },
    { component: <FlatMegaphone />, label: 'Campaigns'    },
    { component: <FlatRocket />,    label: 'Growth'       },
    { component: <FlatStar />,      label: 'Influencer'   },
    { component: <FlatZap />,       label: 'Automation'   },
    { component: <FlatHeart />,     label: 'Engagement'   },
    { component: <FlatTarget />,    label: 'SEM'          },
    { component: <FlatBarChart />,  label: 'Analytics'    },
    { component: <FlatMail />,      label: 'Email Mkt'    },
    { component: <FlatGlobe />,     label: 'SEO'          },
    { component: <FlatTrophy />,    label: 'Awards'       },
    { component: <FlatShield />,    label: 'Brand'        },
  ],
};
