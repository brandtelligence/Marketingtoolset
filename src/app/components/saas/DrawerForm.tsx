import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useDashboardTheme } from './DashboardThemeContext';

interface DrawerFormProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

const widthMap = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl' };

export function DrawerForm({ open, onClose, title, subtitle, children, footer, width = 'md' }: DrawerFormProps) {
  const t = useDashboardTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const panelBg = t.isDark
    ? 'bg-[rgba(15,10,40,0.97)]'
    : 'bg-white';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className={`fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full ${widthMap[width]} ${panelBg} border-l ${t.border} shadow-2xl`}
          >
            {/* Header */}
            <div className={`flex items-start justify-between px-6 pt-6 pb-4 border-b ${t.border} shrink-0`}>
              <div>
                <h2 className={`${t.text} font-semibold text-lg`}>{title}</h2>
                {subtitle && <p className={`${t.textMd} text-sm mt-0.5`}>{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg ${t.hover} ${t.textMd} transition-colors -mt-1 -mr-1`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className={`px-6 py-4 border-t ${t.border} flex items-center justify-end gap-3 shrink-0`}>
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Reusable form field components ────────────────────────────────────────────
interface FieldProps { label: string; required?: boolean; error?: string; children: ReactNode; hint?: string; }
export function Field({ label, required, error, children, hint }: FieldProps) {
  const t = useDashboardTheme();
  return (
    <div className="flex flex-col gap-1.5">
      <label className={`${t.textSm} text-sm font-medium`}>
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className={`${t.textFaint} text-xs`}>{hint}</p>}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const t = useDashboardTheme();
  const base = `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-all ${t.inputCls}`;
  return <input {...props} className={`${base} ${props.className ?? ''}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const t = useDashboardTheme();
  const base = `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-all resize-none ${t.inputCls}`;
  return <textarea {...props} rows={props.rows ?? 3} className={`${base} ${props.className ?? ''}`} />;
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const t = useDashboardTheme();
  const base = `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none transition-all ${t.selectCls}`;
  return (
    <select {...props} className={`${base} ${props.className ?? ''}`}>
      {children}
    </select>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; description?: string; confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary'; loading?: boolean;
  children?: ReactNode;
}
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', confirmVariant = 'danger', loading, children }: ConfirmDialogProps) {
  const t = useDashboardTheme();
  const panelBg = t.isDark ? 'bg-[rgba(15,10,40,0.98)]' : 'bg-white';
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
            className={`fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm ${panelBg} border ${t.border} rounded-2xl shadow-2xl p-6`}
          >
            <h3 className={`${t.text} font-semibold text-base mb-2`}>{title}</h3>
            {description && <p className={`${t.textMd} text-sm mb-4`}>{description}</p>}
            {children && <div className="mb-5">{children}</div>}
            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className={`px-4 py-2 rounded-lg ${t.s1} ${t.textSm} ${t.hover} text-sm transition-colors`}>
                Cancel
              </button>
              <button
                onClick={onConfirm} disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
                  confirmVariant === 'danger'
                    ? 'bg-red-500/80 hover:bg-red-500 text-white'
                    : 'bg-purple-500/80 hover:bg-purple-500 text-white'
                }`}
              >
                {loading ? 'Processing…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
