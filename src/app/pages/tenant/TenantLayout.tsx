import { Outlet, Navigate } from 'react-router';
import {
  LayoutDashboard, Building2, Users, Puzzle, CreditCard,
  BarChart2, BookOpen, Settings,
} from 'lucide-react';
import { SaasLayout } from '../../components/saas/SaasLayout';
import { useAuth } from '../../components/AuthContext';

export function TenantLayout() {
  const { user } = useAuth();

  if (!user || (user.role !== 'TENANT_ADMIN')) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/tenant/overview',  label: 'Overview',           icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: '/tenant/company',   label: 'Company',            icon: <Building2 className="w-5 h-5" /> },
    { path: '/tenant/users',     label: 'Users & Roles',      icon: <Users className="w-5 h-5" /> },
    { path: '/tenant/modules',   label: 'Modules',            icon: <Puzzle className="w-5 h-5" /> },
    { path: '/tenant/invoices',  label: 'Invoices & Billing', icon: <CreditCard className="w-5 h-5" /> },
    { path: '/tenant/usage',     label: 'Usage',              icon: <BarChart2 className="w-5 h-5" /> },
    { path: '/tenant/audit',     label: 'Activity Log',       icon: <BookOpen className="w-5 h-5" /> },
    { path: '/tenant/settings',  label: 'Settings',           icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <SaasLayout navItems={navItems} accentColor="teal">
      <Outlet />
    </SaasLayout>
  );
}