import { Outlet, Navigate } from 'react-router';
import { useState } from 'react';
import {
  LayoutDashboard, ClipboardList, Building2, Puzzle, CreditCard,
  BarChart2, BookOpen, Headphones, Settings, ShieldCheck, Mail,
} from 'lucide-react';
import { SaasLayout } from '../../components/saas/SaasLayout';
import { useAuth } from '../../components/AuthContext';

export function SuperLayout() {
  const { user } = useAuth();
  const [impersonating, setImpersonating] = useState<string | null>(null);

  if (!user || user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/super/requests',        label: 'Access Requests',    icon: <ClipboardList className="w-5 h-5" /> },
    { path: '/super/tenants',         label: 'Tenants',            icon: <Building2 className="w-5 h-5" /> },
    { path: '/super/modules',         label: 'Modules & Features', icon: <Puzzle className="w-5 h-5" /> },
    { path: '/super/billing',         label: 'Billing',            icon: <CreditCard className="w-5 h-5" /> },
    { path: '/super/usage',           label: 'Usage',              icon: <BarChart2 className="w-5 h-5" /> },
    { path: '/super/audit',           label: 'Audit & Compliance', icon: <ShieldCheck className="w-5 h-5" /> },
    { path: '/super/support',         label: 'Support',            icon: <Headphones className="w-5 h-5" /> },
    { path: '/super/email-templates', label: 'Email Templates',    icon: <Mail className="w-5 h-5" /> },
    { path: '/super/settings',        label: 'Settings',           icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <SaasLayout
      navItems={navItems}
      accentColor="purple"
      impersonatingTenant={impersonating}
      onExitImpersonation={() => setImpersonating(null)}
    >
      <Outlet context={{ impersonating, setImpersonating }} />
    </SaasLayout>
  );
}