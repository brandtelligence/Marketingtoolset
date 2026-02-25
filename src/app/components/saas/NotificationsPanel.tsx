import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, CheckCheck, FileText, Users, CreditCard, AlertTriangle, Shield, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useDashboardTheme } from './DashboardThemeContext';
import { useAuth } from '../AuthContext';
import { fetchRequests, fetchInvoices, fetchAuditLogs, fetchTenantUsers } from '../../utils/apiClient';
import { formatRM } from '../../utils/format';

interface Notification {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  time: string;
  path: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationsPanel() {
  const t = useDashboardTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // ── Build live notifications on mount ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const notes: Notification[] = [];

    async function load() {
      try {
        if (isSuperAdmin) {
          const [requests, invoices, auditLogs] = await Promise.all([
            fetchRequests(),
            fetchInvoices(),
            fetchAuditLogs({ severity: 'critical', limit: 5 }),
          ]);

          // Pending access requests
          const pending = requests.filter(r => r.status === 'pending');
          if (pending.length > 0) {
            notes.push({
              id: 'req-pending',
              icon: <Users className="w-4 h-4" />,
              iconBg: 'bg-sky-500/20 text-sky-600',
              title: `${pending.length} Access Request${pending.length > 1 ? 's' : ''} Pending`,
              description: `${pending.map(r => r.companyName).slice(0, 2).join(', ')}${pending.length > 2 ? ` +${pending.length - 2} more` : ''} awaiting review`,
              time: 'Now', path: '/super/requests', severity: 'warning', read: false,
            });
          }

          // Bank transfers awaiting confirmation
          const bankQueue = invoices.filter(i => i.paymentMethod === 'bank_transfer' && i.status !== 'paid');
          if (bankQueue.length > 0) {
            notes.push({
              id: 'bank-queue',
              icon: <CreditCard className="w-4 h-4" />,
              iconBg: 'bg-amber-500/20 text-amber-600',
              title: `${bankQueue.length} Bank Transfer${bankQueue.length > 1 ? 's' : ''} Need Confirmation`,
              description: `${formatRM(bankQueue.reduce((s, i) => s + i.total, 0))} total awaiting manual verification`,
              time: 'Today', path: '/super/billing', severity: 'warning', read: false,
            });
          }

          // Overdue invoices
          const overdue = invoices.filter(i => i.status === 'overdue');
          if (overdue.length > 0) {
            notes.push({
              id: 'overdue-invoices',
              icon: <AlertTriangle className="w-4 h-4" />,
              iconBg: 'bg-red-500/20 text-red-600',
              title: `${overdue.length} Overdue Invoice${overdue.length > 1 ? 's' : ''}`,
              description: `${formatRM(overdue.reduce((s, i) => s + i.total, 0))} outstanding — at risk of suspension`,
              time: 'Today', path: '/super/billing', severity: 'critical', read: false,
            });
          }

          // Critical audit events
          if (auditLogs.length > 0) {
            notes.push({
              id: 'critical-audit',
              icon: <Shield className="w-4 h-4" />,
              iconBg: 'bg-red-500/20 text-red-600',
              title: `${auditLogs.length} Critical Security Event${auditLogs.length > 1 ? 's' : ''}`,
              description: auditLogs[0]?.details ?? 'Sensitive action detected — review required',
              time: relTime(auditLogs[0]?.createdAt ?? new Date().toISOString()),
              path: '/super/audit', severity: 'critical', read: false,
            });
          }

          // Informational: usage always shown
          notes.push({
            id: 'usage-report',
            icon: <FileText className="w-4 h-4" />,
            iconBg: 'bg-purple-500/20 text-purple-600',
            title: 'Platform Usage Report Ready',
            description: 'Latest platform usage summary is available to view',
            time: '1h ago', path: '/super/usage', severity: 'info', read: true,
          });

        } else if (user?.tenantId) {
          const [invoices, users] = await Promise.all([
            fetchInvoices(user.tenantId),
            fetchTenantUsers(user.tenantId),
          ]);

          // Overdue first
          const overdueInv = invoices.filter(i => i.status === 'overdue');
          if (overdueInv.length > 0) {
            notes.push({
              id: 'tenant-overdue',
              icon: <AlertTriangle className="w-4 h-4" />,
              iconBg: 'bg-red-500/20 text-red-600',
              title: 'Invoice Overdue',
              description: `${formatRM(overdueInv.reduce((s, i) => s + i.total, 0))} overdue — pay now to avoid suspension`,
              time: 'Urgent', path: '/tenant/invoices', severity: 'critical', read: false,
            });
          }

          // Unpaid (non-overdue)
          const unpaid = invoices.filter(i => i.status === 'sent');
          if (unpaid.length > 0) {
            notes.push({
              id: 'tenant-unpaid',
              icon: <CreditCard className="w-4 h-4" />,
              iconBg: 'bg-amber-500/20 text-amber-600',
              title: `${unpaid.length} Invoice${unpaid.length > 1 ? 's' : ''} Due`,
              description: `${formatRM(unpaid.reduce((s, i) => s + i.total, 0))} outstanding — due soon`,
              time: 'This week', path: '/tenant/invoices', severity: 'warning', read: false,
            });
          }

          // Pending invites
          const pendingInvites = users.filter(u => u.status === 'pending_invite');
          if (pendingInvites.length > 0) {
            notes.push({
              id: 'pending-invites',
              icon: <Users className="w-4 h-4" />,
              iconBg: 'bg-sky-500/20 text-sky-600',
              title: `${pendingInvites.length} Invite${pendingInvites.length > 1 ? 's' : ''} Pending`,
              description: `${pendingInvites.map(u => u.name).slice(0, 2).join(', ')} hasn't accepted yet`,
              time: '1d ago', path: '/tenant/users', severity: 'info', read: false,
            });
          }

          // Always show usage info
          notes.push({
            id: 'tenant-usage',
            icon: <FileText className="w-4 h-4" />,
            iconBg: 'bg-teal-500/20 text-teal-600',
            title: 'Monthly Usage Available',
            description: 'Your latest usage summary is ready to view',
            time: '2h ago', path: '/tenant/usage', severity: 'info', read: true,
          });
        }
      } catch (err) {
        console.error('[NotificationsPanel] load error:', err);
      }
      setNotifications(notes);
    }

    load();
  }, [user?.role, user?.tenantId]);

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Close on Escape ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const unread = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const handleClick = (n: Notification) => {
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    setOpen(false);
    navigate(n.path);
  };
  const dismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const severityBorder: Record<string, string> = {
    critical: 'border-l-red-400',
    warning:  'border-l-amber-400',
    info:     'border-l-transparent',
  };

  const panelBg = t.isDark ? 'bg-[rgba(15,10,40,0.97)]' : 'bg-white';

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`p-2 rounded-lg ${t.hover} ${t.textMd} transition-colors relative`}
        title="Notifications"
      >
        <Bell className={`w-5 h-5 ${open ? (isSuperAdmin ? 'text-purple-500' : 'text-teal-500') : ''} transition-colors`} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[1rem] h-4 px-0.5 flex items-center justify-center bg-red-500 rounded-full text-white text-[0.55rem] font-bold leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute right-0 top-full mt-2 w-[360px] max-h-[520px] flex flex-col rounded-2xl border ${t.border} shadow-2xl z-50 overflow-hidden ${panelBg}`}
            style={{ boxShadow: t.isDark ? '0 25px 60px rgba(0,0,0,0.6)' : '0 25px 60px rgba(0,0,0,0.15)' }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${t.border} shrink-0`}>
              <div className="flex items-center gap-2">
                <Bell className={`w-4 h-4 ${isSuperAdmin ? 'text-purple-500' : 'text-teal-500'}`} />
                <span className={`${t.text} font-semibold text-sm`}>Notifications</span>
                {unread > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-[0.6rem] font-bold rounded-full">{unread}</span>
                )}
              </div>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${t.textMd} ${t.hover} transition-colors`}
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Bell className={`w-10 h-10 ${t.textFaint} mb-3`} />
                  <p className={`${t.textSm} font-medium text-sm`}>All caught up!</p>
                  <p className={`${t.textFaint} text-xs mt-1`}>No new notifications at this time.</p>
                </div>
              ) : (
                notifications.map((n, idx) => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`group relative flex items-start gap-3 px-4 py-3.5 cursor-pointer border-l-2 transition-all ${severityBorder[n.severity]} ${
                      n.read
                        ? `${t.hover} ${idx !== notifications.length - 1 ? `border-b ${t.border}` : ''}`
                        : `${t.isDark ? 'bg-white/5' : 'bg-gray-50'} ${idx !== notifications.length - 1 ? `border-b ${t.border}` : ''}`
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${n.iconBg}`}>
                      {n.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`${n.read ? t.textSm : t.text} text-xs font-semibold leading-snug`}>{n.title}</p>
                        <span className={`${t.textFaint} text-[0.6rem] shrink-0 mt-0.5`}>{n.time}</span>
                      </div>
                      <p className={`${t.textMd} text-xs mt-0.5 leading-relaxed line-clamp-2`}>{n.description}</p>
                      <div className={`flex items-center gap-1 mt-1.5 ${isSuperAdmin ? 'text-purple-500' : 'text-teal-500'} text-[0.65rem] font-medium opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <span>View details</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    </div>
                    {!n.read && (
                      <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${n.severity === 'critical' ? 'bg-red-500' : n.severity === 'warning' ? 'bg-amber-500' : isSuperAdmin ? 'bg-purple-500' : 'bg-teal-500'}`} />
                    )}
                    <button
                      onClick={e => dismiss(n.id, e)}
                      className={`absolute top-2 right-2 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${t.hover} ${t.textFaint}`}
                      title="Dismiss"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className={`px-4 py-2.5 border-t ${t.border} shrink-0`}>
                <button
                  onClick={() => { setOpen(false); navigate(isSuperAdmin ? '/super/audit' : '/tenant/audit'); }}
                  className={`w-full text-center text-xs ${isSuperAdmin ? 'text-purple-500 hover:text-purple-600' : 'text-teal-500 hover:text-teal-600'} transition-colors py-0.5`}
                >
                  View full activity log →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
