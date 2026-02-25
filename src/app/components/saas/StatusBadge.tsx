import { ReactNode } from 'react';

type StatusVariant =
  | 'active' | 'suspended' | 'pending' | 'cancelled'
  | 'paid' | 'sent' | 'overdue' | 'draft'
  | 'approved' | 'rejected'
  | 'enabled' | 'disabled'
  | 'info' | 'warning' | 'critical' | 'success'
  | 'admin' | 'employee' | 'superadmin'
  | 'pending_invite' | 'inactive';

const variantStyles: Record<StatusVariant, string> = {
  // Tenant status
  active:        'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  suspended:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  pending:       'bg-sky-500/20 text-sky-300 border-sky-500/30',
  cancelled:     'bg-red-500/20 text-red-300 border-red-500/30',
  // Invoice status
  paid:          'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  sent:          'bg-sky-500/20 text-sky-300 border-sky-500/30',
  overdue:       'bg-red-500/20 text-red-300 border-red-500/30',
  draft:         'bg-white/10 text-white/60 border-white/20',
  // Request status
  approved:      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  rejected:      'bg-red-500/20 text-red-300 border-red-500/30',
  // Module/feature
  enabled:       'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  disabled:      'bg-white/10 text-white/50 border-white/20',
  // Severity
  info:          'bg-sky-500/20 text-sky-300 border-sky-500/30',
  warning:       'bg-amber-500/20 text-amber-300 border-amber-500/30',
  critical:      'bg-red-500/20 text-red-300 border-red-500/30',
  success:       'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  // Roles
  admin:         'bg-purple-500/20 text-purple-300 border-purple-500/30',
  superadmin:    'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  employee:      'bg-teal-500/20 text-teal-300 border-teal-500/30',
  // User status
  pending_invite:'bg-amber-500/20 text-amber-300 border-amber-500/30',
  inactive:      'bg-white/10 text-white/50 border-white/20',
};

const variantLabels: Partial<Record<StatusVariant, string>> = {
  active: 'Active', suspended: 'Suspended', pending: 'Pending', cancelled: 'Cancelled',
  paid: 'Paid', sent: 'Sent', overdue: 'Overdue', draft: 'Draft',
  approved: 'Approved', rejected: 'Rejected',
  enabled: 'Enabled', disabled: 'Disabled',
  info: 'Info', warning: 'Warning', critical: 'Critical', success: 'Success',
  admin: 'Tenant Admin', superadmin: 'Super Admin', employee: 'Employee',
  pending_invite: 'Invite Pending', inactive: 'Inactive',
};

interface StatusBadgeProps {
  status: StatusVariant | string;
  label?: string;
  dot?: boolean;
  size?: 'sm' | 'md';
  children?: ReactNode;
}

export function StatusBadge({ status, label, dot = true, size = 'sm', children }: StatusBadgeProps) {
  const variant = (status as StatusVariant) in variantStyles ? status as StatusVariant : 'info';
  const cls = variantStyles[variant] ?? variantStyles.info;
  const text = children ?? label ?? variantLabels[variant] ?? status;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[0.7rem]' : 'px-3 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${padding} ${cls}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {text}
    </span>
  );
}

// Role badge shorthand
export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, StatusVariant> = {
    SUPER_ADMIN: 'superadmin', TENANT_ADMIN: 'admin', EMPLOYEE: 'employee',
  };
  const labels: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin', TENANT_ADMIN: 'Tenant Admin', EMPLOYEE: 'Employee',
  };
  return <StatusBadge status={map[role] ?? 'employee'} label={labels[role] ?? role} />;
}
