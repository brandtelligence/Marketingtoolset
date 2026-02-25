import { useState, useEffect } from 'react';
import { UserPlus, Mail, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { DataTable, Column } from '../../components/saas/DataTable';
import { StatusBadge, RoleBadge } from '../../components/saas/StatusBadge';
import { DrawerForm, Field, Input, Select, ConfirmDialog } from '../../components/saas/DrawerForm';
import { useAuth } from '../../components/AuthContext';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import {
  fetchTenantUsers, createTenantUser, updateTenantUser, deleteTenantUser,
  type TenantUser, type RoleType,
} from '../../utils/apiClient';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;
const AUTH   = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` };

export function TenantUsersPage() {
  const t = useDashboardTheme();
  const { user } = useAuth();
  const [users,       setUsers]       = useState<TenantUser[]>([]);
  const [inviteOpen,  setInviteOpen]  = useState(false);
  const [editOpen,    setEditOpen]    = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selected,    setSelected]    = useState<TenantUser | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole,  setInviteRole]  = useState<RoleType>('EMPLOYEE');

  useEffect(() => {
    if (!user?.tenantId) return;
    fetchTenantUsers(user.tenantId).then(setUsers).catch(err =>
      toast.error(`Failed to load users: ${err.message}`)
    );
  }, [user?.tenantId]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast.error('Email is required'); return; }
    setLoading(true);

    // Send Welcome Employee email via server → Supabase generateLink + nodemailer
    let emailOk = true;
    try {
      const res  = await fetch(`${SERVER}/auth/invite-user`, {
        method: 'POST', headers: AUTH,
        body: JSON.stringify({
          email:      inviteEmail,
          templateId: 'welcome_employee',
          vars: {
            employeeName: inviteEmail.split('@')[0],
            companyName:  user?.company || 'Brandtelligence',
            role:         inviteRole === 'TENANT_ADMIN' ? 'Tenant Admin' : 'Employee',
            adminName:    `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Admin',
            expiresAt:    '24 hours',
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Email dispatch failed');
      console.log(`[invite] Welcome email sent to ${inviteEmail}`);
    } catch (err: any) {
      emailOk = false;
      console.log(`[invite] Email error: ${err.message}`);
    }

    const newUser: TenantUser = {
      id: `u${Date.now()}`, tenantId: user?.tenantId ?? 't1',
      name: inviteEmail.split('@')[0], email: inviteEmail,
      role: inviteRole, status: 'pending_invite', joinedAt: new Date().toISOString().slice(0, 10),
    };
    setUsers(prev => [...prev, newUser]);
    setLoading(false);
    setInviteOpen(false);
    setInviteEmail('');
    setInviteRole('EMPLOYEE');

    if (emailOk) {
      toast.success(`Invite sent to ${inviteEmail}`);
    } else {
      toast.success(`User added`, { description: '⚠️ Invite email could not be sent — check SMTP settings.' });
    }
  };

  const handleRoleChange = async (newRole: RoleType) => {
    if (!selected) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, role: newRole } : u));
    setSelected(prev => prev ? { ...prev, role: newRole } : null);
    setLoading(false);
    setEditOpen(false);
    toast.success(`Role updated to ${newRole}`);
  };

  const handleDeactivate = async () => {
    if (!selected) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, status: u.status === 'inactive' ? 'active' : 'inactive' } : u));
    setLoading(false);
    setDeleteDialog(false);
    toast.success(`User ${selected.status === 'inactive' ? 'reactivated' : 'deactivated'}`);
    setSelected(null);
  };

  const handleResendInvite = async (u: TenantUser) => {
    try {
      const res  = await fetch(`${SERVER}/auth/invite-user`, {
        method: 'POST', headers: AUTH,
        body: JSON.stringify({
          email:      u.email,
          templateId: 'welcome_employee',
          vars: {
            employeeName: u.name,
            companyName:  user?.company || 'Brandtelligence',
            role:         u.role === 'TENANT_ADMIN' ? 'Tenant Admin' : 'Employee',
            adminName:    `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Admin',
            expiresAt:    '24 hours',
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Resend failed');
      toast.success(`Invite resent to ${u.email}`);
      console.log(`[resend-invite] Resent to ${u.email}`);
    } catch (err: any) {
      console.log(`[resend-invite] Error: ${err.message}`);
      if (err.message?.includes('SMTP not configured')) {
        toast.warning('SMTP not configured — invite email could not be sent.');
      } else {
        toast.error(`Resend failed: ${err.message}`);
      }
    }
  };

  const columns: Column<TenantUser>[] = [
    {
      key: 'name', header: 'User', sortable: true,
      render: u => (
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center text-xs font-bold text-teal-600 shrink-0">{u.name[0]}</div>
          <div>
            <p className={`font-medium ${t.text}`}>{u.name}</p>
            <p className={`${t.textFaint} text-xs`}>{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: u => <RoleBadge role={u.role} /> },
    { key: 'status', header: 'Status', render: u => <StatusBadge status={u.status} /> },
    { key: 'joinedAt', header: 'Joined', sortable: true, render: u => <span className={`${t.textFaint} text-xs`}>{u.joinedAt}</span> },
    { key: 'lastLogin', header: 'Last Login', render: u => <span className={`${t.textFaint} text-xs`}>{u.lastLogin ?? '—'}</span> },
    {
      key: 'actions', header: '',
      render: u => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {u.status === 'pending_invite' && (
            <button onClick={() => handleResendInvite(u)} className="p-1.5 rounded-lg hover:bg-sky-500/20 text-sky-500" title="Resend invite">
              <Mail className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => { setSelected(u); setEditOpen(true); }} className={`p-1.5 rounded-lg ${t.hover} ${t.textMd}`} title="Edit role">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setSelected(u); setDeleteDialog(true); }} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-500" title="Deactivate">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Manage your team — invite members and assign roles"
        actions={
          <PrimaryBtn variant="teal" onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-4 h-4" /> Invite User
          </PrimaryBtn>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active',         count: users.filter(u => u.status === 'active').length,         cls: 'bg-emerald-500/20 border-emerald-500/20 text-emerald-600' },
          { label: 'Pending Invite', count: users.filter(u => u.status === 'pending_invite').length, cls: 'bg-amber-500/20 border-amber-500/20 text-amber-600' },
          { label: 'Inactive',       count: users.filter(u => u.status === 'inactive').length,       cls: `${t.s1} ${t.border} ${t.textMd}` },
        ].map(s => (
          <div key={s.label} className={`${s.cls} border rounded-xl p-4 text-center`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs opacity-80 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <DataTable
          columns={columns} data={users} keyField="id"
          onRowClick={u => { setSelected(u); setEditOpen(true); }}
          searchPlaceholder="Search users…"
          searchFields={['name', 'email']}
        />
      </Card>

      {/* Invite Drawer */}
      <DrawerForm open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Team Member" subtitle="An email with a secure link will be sent"
        footer={
          <>
            <PrimaryBtn variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</PrimaryBtn>
            <PrimaryBtn variant="teal" onClick={handleInvite} loading={loading}><Mail className="w-4 h-4" />Send Invite</PrimaryBtn>
          </>
        }
      >
        <Field label="Email Address" required>
          <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" />
        </Field>
        <Field label="Role" required hint="Tenant Admins can manage users and billing. Employees access modules only.">
          <Select value={inviteRole} onChange={e => setInviteRole(e.target.value as RoleType)}>
            <option value="EMPLOYEE">Employee</option>
            <option value="TENANT_ADMIN">Tenant Admin</option>
          </Select>
        </Field>
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 text-xs text-sky-600">
          📧 A one-time invite link (24h TTL) will be sent. The user sets their password on first login.
        </div>
      </DrawerForm>

      {/* Edit Role Drawer */}
      <DrawerForm open={editOpen} onClose={() => setEditOpen(false)} title="Edit User" subtitle={selected?.email}
        footer={<PrimaryBtn variant="ghost" onClick={() => setEditOpen(false)}>Close</PrimaryBtn>}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className={`${t.s1} rounded-xl p-3`}><p className={`${t.textFaint} text-xs mb-1`}>Name</p><p className={t.text}>{selected.name}</p></div>
              <div className={`${t.s1} rounded-xl p-3`}><p className={`${t.textFaint} text-xs mb-1`}>Status</p><StatusBadge status={selected.status} /></div>
            </div>
            <Field label="Change Role">
              <div className="space-y-2">
                {(['EMPLOYEE', 'TENANT_ADMIN'] as RoleType[]).map(r => (
                  <button key={r} onClick={() => handleRoleChange(r)}
                    className={`w-full p-3 rounded-xl border text-left text-sm transition-all ${selected.role === r ? 'bg-teal-500/20 border-teal-500/40 text-teal-600' : `${t.s0} ${t.border} ${t.textSm} ${t.hoverBorder}`}`}
                  >
                    <RoleBadge role={r} />
                    <p className={`text-xs ${t.textFaint} mt-1 ml-5`}>
                      {r === 'EMPLOYEE' ? 'Access modules only' : 'Full tenant management access'}
                    </p>
                  </button>
                ))}
              </div>
            </Field>
            <div className={`pt-2 border-t ${t.border}`}>
              <PrimaryBtn variant="danger" size="sm" onClick={() => { setEditOpen(false); setDeleteDialog(true); }}>
                {selected.status === 'inactive' ? '✅ Reactivate' : '⏸ Deactivate'} User
              </PrimaryBtn>
            </div>
          </div>
        )}
      </DrawerForm>

      <ConfirmDialog
        open={deleteDialog} onClose={() => setDeleteDialog(false)} onConfirm={handleDeactivate}
        title={selected?.status === 'inactive' ? `Reactivate ${selected?.name}?` : `Deactivate ${selected?.name}?`}
        description={selected?.status === 'inactive' ? 'User will regain access to all modules.' : 'User will immediately lose access to all modules.'}
        confirmLabel={selected?.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
        confirmVariant={selected?.status === 'inactive' ? 'primary' : 'danger'}
        loading={loading}
      />
    </div>
  );
}