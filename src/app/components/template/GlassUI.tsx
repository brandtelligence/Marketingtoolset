/**
 * GlassUI — Brandtelligence Design System Template
 * ─────────────────────────────────────────────────────────────────────────────
 * COPY-PASTE READY: Zero build-specific dependencies.
 * Dependencies: lucide-react, motion/react
 *
 * This file exports every glass UI primitive used across the Brandtelligence
 * platform. Drop it into any Figma Make project and import what you need.
 *
 * Component index:
 *   Layout      → GlassCard, GlassModal, GlassDivider, GlassSection
 *   Typography  → GradientText, SectionTitle, GlassLabel
 *   Inputs      → GlassInput, GlassTextarea, GlassSelect, GlassToggle, GlassCheckbox
 *   Buttons     → GlassButton
 *   Feedback    → GlassAlert, GlassBadge, GlassTag, GlassProgress, GlassSpinner
 *   Data        → GlassStatCard, GlassFeatureCard, GlassTable
 *   Navigation  → GlassTabBar, GlassBreadcrumb
 *
 * Colour accent system (accent prop):
 *   'purple' | 'teal' | 'orange' | 'emerald' | 'sky' | 'rose' | 'amber'
 */

import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, AlertTriangle, Info, CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';

// ── Shared accent palette ──────────────────────────────────────────────────────

export type GlassAccent = 'purple' | 'teal' | 'orange' | 'emerald' | 'sky' | 'rose' | 'amber';

export const ACCENT: Record<GlassAccent, {
  text: string; textLight: string;
  bg: string; bgHover: string;
  border: string; borderHover: string;
  gradient: string; gradientHover: string;
  glow: string;
  ring: string;
}> = {
  purple: {
    text: 'text-purple-300', textLight: 'text-purple-200',
    bg: 'bg-purple-500/20', bgHover: 'hover:bg-purple-500/30',
    border: 'border-purple-500/30', borderHover: 'hover:border-purple-500/60',
    gradient: 'from-purple-500 to-purple-700', gradientHover: 'hover:from-purple-400 hover:to-purple-600',
    glow: 'shadow-purple-500/30',
    ring: 'ring-purple-500/40',
  },
  teal: {
    text: 'text-teal-300', textLight: 'text-teal-200',
    bg: 'bg-teal-500/20', bgHover: 'hover:bg-teal-500/30',
    border: 'border-teal-500/30', borderHover: 'hover:border-teal-500/60',
    gradient: 'from-teal-500 to-teal-700', gradientHover: 'hover:from-teal-400 hover:to-teal-600',
    glow: 'shadow-teal-500/30',
    ring: 'ring-teal-500/40',
  },
  orange: {
    text: 'text-orange-300', textLight: 'text-orange-200',
    bg: 'bg-orange-500/20', bgHover: 'hover:bg-orange-500/30',
    border: 'border-orange-500/30', borderHover: 'hover:border-orange-500/60',
    gradient: 'from-orange-500 to-orange-700', gradientHover: 'hover:from-orange-400 hover:to-orange-600',
    glow: 'shadow-orange-500/30',
    ring: 'ring-orange-500/40',
  },
  emerald: {
    text: 'text-emerald-300', textLight: 'text-emerald-200',
    bg: 'bg-emerald-500/20', bgHover: 'hover:bg-emerald-500/30',
    border: 'border-emerald-500/30', borderHover: 'hover:border-emerald-500/60',
    gradient: 'from-emerald-500 to-emerald-700', gradientHover: 'hover:from-emerald-400 hover:to-emerald-600',
    glow: 'shadow-emerald-500/30',
    ring: 'ring-emerald-500/40',
  },
  sky: {
    text: 'text-sky-300', textLight: 'text-sky-200',
    bg: 'bg-sky-500/20', bgHover: 'hover:bg-sky-500/30',
    border: 'border-sky-500/30', borderHover: 'hover:border-sky-500/60',
    gradient: 'from-sky-500 to-sky-700', gradientHover: 'hover:from-sky-400 hover:to-sky-600',
    glow: 'shadow-sky-500/30',
    ring: 'ring-sky-500/40',
  },
  rose: {
    text: 'text-rose-300', textLight: 'text-rose-200',
    bg: 'bg-rose-500/20', bgHover: 'hover:bg-rose-500/30',
    border: 'border-rose-500/30', borderHover: 'hover:border-rose-500/60',
    gradient: 'from-rose-500 to-rose-700', gradientHover: 'hover:from-rose-400 hover:to-rose-600',
    glow: 'shadow-rose-500/30',
    ring: 'ring-rose-500/40',
  },
  amber: {
    text: 'text-amber-300', textLight: 'text-amber-200',
    bg: 'bg-amber-500/20', bgHover: 'hover:bg-amber-500/30',
    border: 'border-amber-500/30', borderHover: 'hover:border-amber-500/60',
    gradient: 'from-amber-500 to-amber-700', gradientHover: 'hover:from-amber-400 hover:to-amber-600',
    glow: 'shadow-amber-500/30',
    ring: 'ring-amber-500/40',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

// ── GlassCard ─────────────────────────────────────────────────────────────────

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /** Optional card title rendered in a header row */
  title?: string;
  /** Right-side actions in the header */
  actions?: ReactNode;
  /** Add a hover lift animation */
  hoverable?: boolean;
  /** Accent border colour */
  accent?: GlassAccent;
  /** Remove all padding */
  noPadding?: boolean;
}

export function GlassCard({
  children, className = '', title, actions, hoverable = false, accent, noPadding = false,
}: GlassCardProps) {
  const accentBorder = accent ? ACCENT[accent].border : 'border-white/15';
  const base = `bg-white/10 backdrop-blur-md border ${accentBorder} rounded-2xl shadow-xl`;
  const hover = hoverable ? 'hover:bg-white/15 hover:-translate-y-1 transition-all duration-300' : '';

  return (
    <div className={`${base} ${hover} ${className}`}>
      {title && (
        <div className={`flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10`}>
          <h3 className="text-white font-semibold text-sm">{title}</h3>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
}

// ── GlassModal ────────────────────────────────────────────────────────────────

interface GlassModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const modalMaxW: Record<string, string> = {
  sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl',
};

export function GlassModal({ open, onClose, children, title, maxWidth = 'md' }: GlassModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={`relative w-full ${modalMaxW[maxWidth]} bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden`}
          >
            {title && (
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
                <h2 className="text-white font-semibold">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── GlassDivider ──────────────────────────────────────────────────────────────

export function GlassDivider({ label, accent = 'purple' }: { label?: string; accent?: GlassAccent }) {
  if (!label) return <hr className="border-white/10 my-6" />;
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-white/10" />
      <span className={`text-xs font-medium ${ACCENT[accent].text} uppercase tracking-wider`}>{label}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

// ── GlassSection ──────────────────────────────────────────────────────────────

export function GlassSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`px-4 py-16 sm:px-6 sm:py-20 md:py-24 ${className}`}>
      <div className="max-w-7xl mx-auto">{children}</div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY
// ═══════════════════════════════════════════════════════════════════════════════

// ── GradientText ──────────────────────────────────────────────────────────────

interface GradientTextProps {
  children: ReactNode;
  /** Tailwind gradient classes: default purple→teal→orange */
  from?: string; via?: string; to?: string;
  className?: string;
}

export function GradientText({
  children,
  from = 'from-purple-400', via = 'via-teal-400', to = 'to-orange-400',
  className = '',
}: GradientTextProps) {
  return (
    <span className={`bg-gradient-to-r ${from} ${via} ${to} bg-clip-text text-transparent ${className}`}>
      {children}
    </span>
  );
}

// ── SectionTitle ──────────────────────────────────────────────────────────────

interface SectionTitleProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  accent?: GlassAccent;
  align?: 'left' | 'center';
}

export function SectionTitle({ eyebrow, title, subtitle, accent = 'purple', align = 'center' }: SectionTitleProps) {
  const textAlign = align === 'center' ? 'text-center' : 'text-left';
  const mx = align === 'center' ? 'mx-auto' : '';
  return (
    <div className={`mb-12 md:mb-16 ${textAlign}`}>
      {eyebrow && (
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className={`text-xs font-bold uppercase tracking-widest ${ACCENT[accent].text} mb-3 block`}
        >
          {eyebrow}
        </motion.span>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-white font-bold mb-4"
        style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)' }}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className={`text-white/60 max-w-2xl ${mx} text-sm sm:text-base leading-relaxed`}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}

// ── GlassLabel ────────────────────────────────────────────────────────────────

export function GlassLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-white/90 text-sm mb-2 font-medium">
      {children}
      {required && <span className="text-rose-400 ml-1">*</span>}
    </label>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── GlassInput ────────────────────────────────────────────────────────────────

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Lucide icon element to show on the left */
  icon?: ReactNode;
  /** Lucide icon or element to show on the right */
  rightSlot?: ReactNode;
}

export function GlassInput({ label, error, hint, icon, rightSlot, className = '', ...props }: GlassInputProps) {
  const paddingLeft = icon ? 'pl-11' : 'px-4';
  const paddingRight = rightSlot ? 'pr-12' : 'pr-4';
  const borderColor = error ? 'border-rose-500/60 focus:border-rose-400' : 'border-white/20 focus:border-white/40';

  return (
    <div className="w-full">
      {label && <GlassLabel required={props.required}>{label}</GlassLabel>}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          {...props}
          className={`w-full bg-white/10 border ${borderColor} rounded-xl py-3 ${paddingLeft} ${paddingRight} text-white placeholder-white/50 focus:outline-none transition-all min-h-[2.75rem] ${className}`}
        />
        {rightSlot && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
            {rightSlot}
          </span>
        )}
      </div>
      {error && <p className="mt-1.5 text-rose-400 text-xs">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-white/40 text-xs">{hint}</p>}
    </div>
  );
}

// ── GlassTextarea ─────────────────────────────────────────────────────────────

interface GlassTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function GlassTextarea({ label, error, hint, className = '', ...props }: GlassTextareaProps) {
  const borderColor = error ? 'border-rose-500/60 focus:border-rose-400' : 'border-white/20 focus:border-white/40';
  return (
    <div className="w-full">
      {label && <GlassLabel required={props.required}>{label}</GlassLabel>}
      <textarea
        {...props}
        className={`w-full bg-white/10 border ${borderColor} rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none transition-all resize-none ${className}`}
      />
      {error && <p className="mt-1.5 text-rose-400 text-xs">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-white/40 text-xs">{hint}</p>}
    </div>
  );
}

// ── GlassSelect ───────────────────────────────────────────────────────────────

interface GlassSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function GlassSelect({ label, error, hint, options, placeholder, className = '', ...props }: GlassSelectProps) {
  const borderColor = error ? 'border-rose-500/60 focus:border-rose-400' : 'border-white/20 focus:border-white/40';
  return (
    <div className="w-full">
      {label && <GlassLabel required={props.required}>{label}</GlassLabel>}
      <div className="relative">
        <select
          {...props}
          className={`w-full appearance-none bg-white/10 border ${borderColor} rounded-xl px-4 py-3 pr-10 text-white focus:outline-none transition-all min-h-[2.75rem] ${className}`}
          style={{ colorScheme: 'dark' }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value} value={o.value} className="bg-gray-900 text-white">{o.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
      </div>
      {error && <p className="mt-1.5 text-rose-400 text-xs">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-white/40 text-xs">{hint}</p>}
    </div>
  );
}

// ── GlassToggle ───────────────────────────────────────────────────────────────

interface GlassToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  accent?: GlassAccent;
  disabled?: boolean;
}

export function GlassToggle({ checked, onChange, label, accent = 'teal', disabled = false }: GlassToggleProps) {
  const activeColor: Record<GlassAccent, string> = {
    purple: 'bg-purple-500', teal: 'bg-teal-500', orange: 'bg-orange-500',
    emerald: 'bg-emerald-500', sky: 'bg-sky-500', rose: 'bg-rose-500', amber: 'bg-amber-500',
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${checked ? activeColor[accent] : 'bg-white/20'}`}>
        <motion.span
          animate={{ x: checked ? 18 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md block"
        />
      </div>
      {label && <span className="text-white/80 text-sm">{label}</span>}
    </button>
  );
}

// ── GlassCheckbox ─────────────────────────────────────────────────────────────

interface GlassCheckboxProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  accent?: GlassAccent;
  disabled?: boolean;
}

export function GlassCheckbox({ checked, onChange, label, accent = 'teal', disabled = false }: GlassCheckboxProps) {
  const activeColor: Record<GlassAccent, string> = {
    purple: 'bg-purple-500 border-purple-500', teal: 'bg-teal-500 border-teal-500',
    orange: 'bg-orange-500 border-orange-500', emerald: 'bg-emerald-500 border-emerald-500',
    sky: 'bg-sky-500 border-sky-500', rose: 'bg-rose-500 border-rose-500', amber: 'bg-amber-500 border-amber-500',
  };
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all shrink-0 ${
          checked ? activeColor[accent] : 'bg-white/10 border-white/30 hover:border-white/50'
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </span>
      {label && <span className="text-white/70 text-sm select-none">{label}</span>}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTONS
// ═══════════════════════════════════════════════════════════════════════════════

// ── GlassButton ───────────────────────────────────────────────────────────────

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'teal' | 'orange' | 'emerald' | 'ghost' | 'danger' | 'glass';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  /** Makes button full-width */
  block?: boolean;
  /** Pill (rounded-full) shape */
  pill?: boolean;
}

const BTN_VARIANT: Record<string, string> = {
  primary: 'bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 text-white border-purple-500/40 shadow-lg shadow-purple-500/25',
  teal:    'bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-600 text-white border-teal-500/40 shadow-lg shadow-teal-500/25',
  orange:  'bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-400 hover:to-orange-600 text-white border-orange-500/40 shadow-lg shadow-orange-500/25',
  emerald: 'bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white border-emerald-500/40 shadow-lg shadow-emerald-500/25',
  danger:  'bg-gradient-to-r from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 text-white border-rose-500/40 shadow-lg shadow-rose-500/25',
  ghost:   'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border-white/20 hover:border-white/40 backdrop-blur-md',
  glass:   'bg-white/5 hover:bg-white/15 text-white border-white/10 hover:border-white/25 backdrop-blur-md',
};

const BTN_SIZE: Record<string, string> = {
  xs: 'px-2.5 py-1.5 text-xs gap-1.5',
  sm: 'px-3 py-2 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-7 py-3.5 text-base gap-2.5',
};

export function GlassButton({
  variant = 'primary', size = 'md', loading = false, icon, iconRight, block = false, pill = false,
  children, disabled, className = '', ...props
}: GlassButtonProps) {
  const shape = pill ? 'rounded-full' : 'rounded-xl';
  return (
    <motion.button
      whileHover={disabled || loading ? {} : { scale: 1.03 }}
      whileTap={disabled || loading ? {} : { scale: 0.97 }}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center border font-medium transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${shape}
        ${block ? 'w-full' : ''}
        ${className}
      `}
      {...(props as any)}
    >
      {loading
        ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : icon}
      {children}
      {!loading && iconRight}
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════════

// ── GlassAlert ────────────────────────────────────────────────────────────────

interface GlassAlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

const ALERT_STYLES = {
  info:    { bg: 'bg-sky-500/15',     border: 'border-sky-500/30',     text: 'text-sky-200',     icon: <Info className="w-4 h-4 shrink-0 text-sky-400" />     },
  success: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-200', icon: <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> },
  warning: { bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   text: 'text-amber-200',   icon: <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />  },
  error:   { bg: 'bg-rose-500/15',    border: 'border-rose-500/30',    text: 'text-rose-200',    icon: <XCircle className="w-4 h-4 shrink-0 text-rose-400" />     },
};

export function GlassAlert({ type = 'info', title, children, onClose }: GlassAlertProps) {
  const s = ALERT_STYLES[type];
  return (
    <div className={`flex gap-3 ${s.bg} border ${s.border} rounded-xl px-4 py-3`}>
      <span className="mt-0.5">{s.icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className={`text-sm font-semibold ${s.text} mb-0.5`}>{title}</p>}
        <p className={`text-sm ${s.text} opacity-80`}>{children}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ── GlassBadge ────────────────────────────────────────────────────────────────

interface GlassBadgeProps {
  children: ReactNode;
  accent?: GlassAccent;
  dot?: boolean;
  size?: 'sm' | 'md';
}

export function GlassBadge({ children, accent = 'purple', dot = false, size = 'md' }: GlassBadgeProps) {
  const a = ACCENT[accent];
  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[0.6rem]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 ${pad} font-semibold rounded-full border ${a.bg} ${a.border} ${a.text}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${a.gradient.replace('from-', 'bg-').split(' ')[0].replace('from-', 'bg-')}`} style={{ background: 'currentColor', opacity: 0.8 }} />}
      {children}
    </span>
  );
}

// ── GlassTag ──────────────────────────────────────────────────────────────────

export function GlassTag({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 border border-white/20 rounded-lg text-white/80 text-xs">
      {children}
      {onRemove && (
        <button onClick={onRemove} className="text-white/40 hover:text-white transition-colors">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

// ── GlassProgress ─────────────────────────────────────────────────────────────

interface GlassProgressProps {
  value: number; // 0–100
  label?: string;
  showValue?: boolean;
  accent?: GlassAccent;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const PROGRESS_HEIGHT = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

export function GlassProgress({ value, label, showValue = false, accent = 'teal', size = 'md', animated = true }: GlassProgressProps) {
  const a = ACCENT[accent];
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between mb-2">
          {label && <span className="text-white/70 text-xs">{label}</span>}
          {showValue && <span className={`text-xs font-semibold ${a.text}`}>{pct}%</span>}
        </div>
      )}
      <div className={`w-full ${PROGRESS_HEIGHT[size]} bg-white/10 rounded-full overflow-hidden`}>
        <motion.div
          className={`h-full bg-gradient-to-r ${a.gradient} rounded-full`}
          initial={animated ? { width: 0 } : { width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ── GlassSpinner ──────────────────────────────────────────────────────────────

export function GlassSpinner({ size = 'md', accent = 'teal', label }: { size?: 'sm' | 'md' | 'lg'; accent?: GlassAccent; label?: string }) {
  const sz = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`${sz} border-2 border-white/20 border-t-current rounded-full animate-spin ${ACCENT[accent].text}`} />
      {label && <p className="text-white/60 text-sm">{label}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

// ── GlassStatCard ─────────────────────────────────────────────────────────────

interface GlassStatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon?: ReactNode;
  accent?: GlassAccent;
}

export function GlassStatCard({ label, value, delta, deltaPositive = true, icon, accent = 'purple' }: GlassStatCardProps) {
  const a = ACCENT[accent];
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`bg-white/10 backdrop-blur-md border ${a.border} rounded-2xl p-5`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">{label}</p>
          <p className={`font-bold ${a.text}`} style={{ fontSize: 'clamp(1.5rem,3vw,2rem)' }}>{value}</p>
          {delta && (
            <p className={`text-xs mt-1 ${deltaPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {deltaPositive ? '↑' : '↓'} {delta}
            </p>
          )}
        </div>
        {icon && <div className={`${a.text} shrink-0 opacity-70`}>{icon}</div>}
      </div>
    </motion.div>
  );
}

// ── GlassFeatureCard ──────────────────────────────────────────────────────────

interface GlassFeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  accent?: GlassAccent;
  badge?: string;
  index?: number;
}

export function GlassFeatureCard({ icon, title, description, accent = 'purple', badge, index = 0 }: GlassFeatureCardProps) {
  const a = ACCENT[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.6 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className={`group relative bg-white/8 backdrop-blur-md border ${a.border} rounded-2xl p-6 flex flex-col hover:bg-white/12 transition-all duration-300 shadow-xl overflow-hidden`}
    >
      {/* Glow blob */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${a.gradient} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />

      {/* Icon */}
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${a.gradient} flex items-center justify-center mb-4 shadow-lg ${a.glow} shadow-md text-white`}>
        {icon}
      </div>

      {/* Badge */}
      {badge && (
        <span className={`absolute top-5 right-5 px-2.5 py-1 rounded-lg border ${a.bg} ${a.border} ${a.text} text-[0.65rem] font-bold`}>
          {badge}
        </span>
      )}

      <h3 className="text-white font-bold text-base mb-2 pr-16">{title}</h3>
      <p className="text-white/60 text-sm leading-relaxed flex-1">{description}</p>

      <div className={`flex items-center gap-1 text-xs font-semibold ${a.text} mt-4 group-hover:gap-2 transition-all`}>
        <ChevronRight className="w-3.5 h-3.5" />
        <span>Learn more</span>
      </div>
    </motion.div>
  );
}

// ── GlassTable ────────────────────────────────────────────────────────────────

interface GlassTableColumn<T> {
  key: keyof T | string;
  header: string;
  cell?: (row: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface GlassTableProps<T> {
  columns: GlassTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  emptyMessage?: string;
}

export function GlassTable<T>({ columns, data, rowKey, emptyMessage = 'No data' }: GlassTableProps<T>) {
  const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' };
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/5 border-b border-white/10">
            {columns.map(col => (
              <th key={String(col.key)} className={`px-4 py-3 text-white/50 font-semibold text-xs uppercase tracking-wider ${alignClass[col.align ?? 'left']}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-white/40 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr key={rowKey(row)} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                {columns.map(col => (
                  <td key={String(col.key)} className={`px-4 py-3 text-white/80 ${alignClass[col.align ?? 'left']}`}>
                    {col.cell ? col.cell(row) : String((row as any)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════

// ── GlassTabBar ───────────────────────────────────────────────────────────────

interface GlassTabBarProps {
  tabs: { id: string; label: string; icon?: ReactNode; badge?: string | number }[];
  active: string;
  onChange: (id: string) => void;
  accent?: GlassAccent;
}

export function GlassTabBar({ tabs, active, onChange, accent = 'purple' }: GlassTabBarProps) {
  const a = ACCENT[accent];
  return (
    <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
            active === tab.id
              ? `${a.bg} ${a.border} border ${a.text}`
              : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
          }`}
        >
          {tab.icon}
          {tab.label}
          {tab.badge !== undefined && (
            <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold ${
              active === tab.id ? `${a.bg} ${a.text}` : 'bg-white/10 text-white/50'
            }`}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── GlassBreadcrumb ───────────────────────────────────────────────────────────

export function GlassBreadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <nav className="flex items-center gap-2 text-xs text-white/50 mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <ChevronRight className="w-3 h-3 opacity-50" />}
          {item.onClick
            ? <button onClick={item.onClick} className="hover:text-white/80 transition-colors">{item.label}</button>
            : <span className={i === items.length - 1 ? 'text-white/80' : ''}>{item.label}</span>
          }
        </span>
      ))}
    </nav>
  );
}

// ── GlassPageHeader ───────────────────────────────────────────────────────────

interface GlassPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: { label: string; onClick?: () => void }[];
  icon?: ReactNode;
  accent?: GlassAccent;
}

export function GlassPageHeader({ title, subtitle, actions, breadcrumb, icon, accent = 'purple' }: GlassPageHeaderProps) {
  const a = ACCENT[accent];
  return (
    <div className="mb-8">
      {breadcrumb && <GlassBreadcrumb items={breadcrumb} />}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {icon && (
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${a.gradient} flex items-center justify-center shadow-lg text-white shrink-0`}>
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-white font-bold" style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.75rem)' }}>{title}</h1>
            {subtitle && <p className="text-white/60 text-sm mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}

// ── Scroll-to-top FAB ─────────────────────────────────────────────────────────

export function GlassFAB({ onClick, icon, accent = 'purple', label }: {
  onClick: () => void; icon: ReactNode; accent?: GlassAccent; label?: string;
}) {
  const a = ACCENT[accent];
  return (
    <motion.button
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title={label}
      className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-br ${a.gradient} text-white shadow-xl flex items-center justify-center ${a.glow} shadow-lg border border-white/20`}
    >
      {icon}
    </motion.button>
  );
}

// ── Export convenience ─────────────────────────────────────────────────────────
// Re-export ACCENT map so consumers can reference palette values without
// importing the full module or duplicating the colour table.
export { ACCENT as glassAccent };