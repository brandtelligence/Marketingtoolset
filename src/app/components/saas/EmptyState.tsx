import { ReactNode } from 'react';
import { AlertCircle, FolderOpen, ShieldOff, Loader2 } from 'lucide-react';
import { useDashboardTheme } from './DashboardThemeContext';

interface EmptyStateProps {
  type?: 'empty' | 'error' | 'no-permission' | 'loading';
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ type = 'empty', title, description, action, icon }: EmptyStateProps) {
  const t = useDashboardTheme();

  const defaults = {
    empty: {
      icon: <FolderOpen className={`w-10 h-10 ${t.textFaint}`} />,
      title: 'Nothing here yet',
      description: 'No records found for the current filter.',
    },
    error: {
      icon: <AlertCircle className="w-10 h-10 text-red-400/70" />,
      title: 'Something went wrong',
      description: 'Failed to load data. Please try again.',
    },
    'no-permission': {
      icon: <ShieldOff className="w-10 h-10 text-amber-400/70" />,
      title: 'Access Denied',
      description: "You don't have permission to view this resource.",
    },
    loading: {
      icon: <Loader2 className="w-10 h-10 text-purple-400/70 animate-spin" />,
      title: 'Loading…',
      description: 'Please wait while we fetch the data.',
    },
  };

  const d = defaults[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 opacity-80">{icon ?? d.icon}</div>
      <h3 className={`${t.textSm} font-semibold text-base mb-1`}>{title ?? d.title}</h3>
      <p className={`${t.textMd} text-sm max-w-xs`}>{description ?? d.description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Inline loading row for tables
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  const t = useDashboardTheme();
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className={`border-b ${t.trBorder}`}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <div className={`h-3 rounded ${t.s1} animate-pulse`} style={{ width: `${60 + Math.random() * 35}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
