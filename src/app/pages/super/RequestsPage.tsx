import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { DataTable, Column } from '../../components/saas/DataTable';
import { formatRM } from '../../utils/format';
import { StatusBadge } from '../../components/saas/StatusBadge';
import { DrawerForm, Field, Select, Textarea, ConfirmDialog } from '../../components/saas/DrawerForm';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import {
  fetchRequests, updateRequest, createTenant, fetchModules,
  type PendingRequest, type Tenant,
} from '../../utils/apiClient';

export function RequestsPage() {
  const t = useDashboardTheme();
  const [requests,     setRequests]     = useState<PendingRequest[]>([]);
  const [modules,      setModules]      = useState<any[]>([]);
  const [loadingData,  setLoadingData]  = useState(true);
  const [selected,     setSelected]     = useState<PendingRequest | null>(null);
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [approveDrawer, setApproveDrawer] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [plan,         setPlan]         = useState('Starter');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingData(true);
      try {
        const [reqs, mods] = await Promise.all([fetchRequests(), fetchModules()]);
        setRequests(reqs);
        setModules(mods);
      } catch (err: any) {
        console.error('[RequestsPage] load error:', err);
        toast.error(`Failed to load requests: ${err.message}`);
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

  const openDetail  = (r: PendingRequest) => { setSelected(r); setDrawerOpen(true); };
  const openApprove = (r: PendingRequest) => { setSelected(r); setSelectedModules(r.requestedModules); setApproveDrawer(true); };

  const handleApprove = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await updateRequest(selected.id, { status: 'approved' });
      const newTenant: Partial<Tenant> = {
        id: `t${Date.now()}`, name: selected.companyName, email: selected.contactEmail,
        country: selected.country, size: selected.size, status: 'active',
        plan, moduleIds: selectedModules, createdAt: new Date().toISOString().slice(0, 10),
        mrr: selectedModules.reduce((s, id) => {
          const m = modules.find(m => m.id === id);
          return s + (m?.basePrice ?? 0);
        }, 0),
        adminName: selected.contactName, adminEmail: selected.contactEmail,
        taxId: '', billingAddress: selected.country,
      };
      await createTenant(newTenant);
      setRequests(prev => prev.map(r => r.id === selected.id ? { ...r, status: 'approved' } : r));
      toast.success(`✅ ${selected.companyName} approved and tenant created`);
      setApproveDrawer(false);
    } catch (err: any) {
      toast.error(`Approval failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await updateRequest(selected.id, { status: 'rejected', rejectedReason: rejectReason });
      setRequests(prev => prev.map(r => r.id === selected.id ? { ...r, status: 'rejected', rejectedReason: rejectReason } : r));
      toast.success(`Request from ${selected.companyName} rejected`);
      setRejectDialog(false);
      setDrawerOpen(false);
      setRejectReason('');
    } catch (err: any) {
      toast.error(`Reject failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (id: string) => {
    setSelectedModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const columns: Column<PendingRequest>[] = [
    { key: 'companyName', header: 'Company', sortable: true, render: r => <span className={`font-medium ${t.text}`}>{r.companyName}</span> },
    { key: 'contactName', header: 'Contact', sortable: true, render: r => <span className={t.textSm}>{r.contactName}<br /><span className={`${t.textFaint} text-xs`}>{r.contactEmail}</span></span> },
    { key: 'country', header: 'Country', sortable: true },
    { key: 'size', header: 'Team Size' },
    { key: 'createdAt', header: 'Submitted', sortable: true, render: r => <span className={`${t.textMd} text-xs`}>{r.createdAt}</span> },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
    {
      key: 'actions', header: '', render: r => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => openDetail(r)} className={`p-1.5 rounded-lg ${t.hover} ${t.textFaint} transition-colors`} title="View"><Eye className="w-4 h-4" /></button>
          {r.status === 'pending' && (
            <>
              <button onClick={() => openApprove(r)} className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-500 transition-colors" title="Approve"><CheckCircle className="w-4 h-4" /></button>
              <button onClick={() => { setSelected(r); setRejectDialog(true); }} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors" title="Reject"><XCircle className="w-4 h-4" /></button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Access Requests"
        subtitle="Review and approve new tenant onboarding requests"
        actions={<PrimaryBtn variant="ghost" onClick={() => toast.info('Refreshed')}><RefreshCw className="w-4 h-4" />Refresh</PrimaryBtn>}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending Review', value: stats.pending, color: 'bg-sky-500/20 border-sky-500/20 text-sky-600' },
          { label: 'Approved', value: stats.approved, color: 'bg-emerald-500/20 border-emerald-500/20 text-emerald-600' },
          { label: 'Rejected', value: stats.rejected, color: 'bg-red-500/20 border-red-500/20 text-red-600' },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`${s.color} border rounded-xl p-4 text-center`}
          >
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs opacity-80 mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <Card>
        <DataTable
          columns={columns} data={requests} keyField="id"
          onRowClick={openDetail}
          searchPlaceholder="Search requests…"
          searchFields={['companyName', 'contactEmail', 'country']}
          emptyTitle="No requests yet"
          emptyDescription="New access requests will appear here."
        />
      </Card>

      {/* Detail Drawer */}
      <DrawerForm open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Request Detail" subtitle={selected?.companyName}
        footer={
          selected?.status === 'pending' ? (
            <>
              <PrimaryBtn variant="danger" onClick={() => { setDrawerOpen(false); setRejectDialog(true); }}>Reject</PrimaryBtn>
              <PrimaryBtn onClick={() => { setDrawerOpen(false); openApprove(selected); }}>Approve →</PrimaryBtn>
            </>
          ) : null
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Company', selected.companyName], ['Contact', selected.contactName],
                ['Email', selected.contactEmail], ['Country', selected.country],
                ['Team Size', selected.size], ['Submitted', selected.createdAt],
              ].map(([k, v]) => (
                <div key={k} className={`${t.s1} rounded-xl p-3`}>
                  <p className={`${t.textFaint} text-xs mb-1`}>{k}</p>
                  <p className={`${t.text} text-sm font-medium`}>{v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className={`${t.textFaint} text-xs mb-2`}>Requested Modules</p>
              <div className="flex flex-wrap gap-2">
                {selected.requestedModules.map(id => {
                  const m = modules.find(m => m.id === id);
                  return m ? <span key={id} className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-600 border border-purple-500/30 text-xs">{m.icon} {m.name}</span> : null;
                })}
                {selected.requestedModules.length === 0 && <span className={`${t.textFaint} text-sm`}>None specified</span>}
              </div>
            </div>
            {selected.notes && (
              <div className={`${t.s1} rounded-xl p-3`}>
                <p className={`${t.textFaint} text-xs mb-1`}>Notes</p>
                <p className={`${t.textSm} text-sm`}>{selected.notes}</p>
              </div>
            )}
            {selected.rejectedReason && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-red-500 text-xs mb-1">Rejection Reason</p>
                <p className="text-red-600 text-sm">{selected.rejectedReason}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <StatusBadge status={selected.status} size="md" />
            </div>
          </div>
        )}
      </DrawerForm>

      {/* Approve Drawer */}
      <DrawerForm open={approveDrawer} onClose={() => setApproveDrawer(false)} title="Approve & Onboard Tenant" subtitle={`Creating tenant for ${selected?.companyName}`}
        footer={
          <>
            <PrimaryBtn variant="ghost" onClick={() => setApproveDrawer(false)}>Cancel</PrimaryBtn>
            <PrimaryBtn onClick={handleApprove} loading={loading} disabled={selectedModules.length === 0}>
              <CheckCircle className="w-4 h-4" /> Approve & Send Invite
            </PrimaryBtn>
          </>
        }
      >
        <Field label="Subscription Plan" required>
          <Select value={plan} onChange={e => setPlan(e.target.value)}>
            <option value="Starter">Starter</option>
            <option value="Growth">Growth</option>
            <option value="Enterprise">Enterprise</option>
          </Select>
        </Field>
        <div>
          <p className={`${t.textSm} text-sm font-medium mb-2`}>Assign Modules <span className="text-red-400">*</span></p>
          <div className="space-y-2">
            {modules.map(m => (
              <label key={m.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedModules.includes(m.id) ? 'bg-purple-500/20 border-purple-500/40' : `${t.s0} ${t.border} ${t.hoverBorder}`}`}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedModules.includes(m.id)} onChange={() => toggleModule(m.id)} className="accent-purple-500" />
                  <span className="text-lg">{m.icon}</span>
                  <div>
                    <p className={`${t.text} text-sm font-medium`}>{m.name}</p>
                    <p className={`${t.textFaint} text-xs`}>{m.description.slice(0, 50)}…</p>
                  </div>
                </div>
                <span className={`${t.textMd} text-xs shrink-0`}>RM {formatRM(m.basePrice)}/mo</span>
              </label>
            ))}
          </div>
        </div>
        <div className={`${t.s1} rounded-xl p-3 text-sm`}>
          <p className={`${t.textFaint} text-xs mb-1`}>Estimated MRR</p>
          <p className={`${t.text} font-bold text-xl`}>
            RM {selectedModules.reduce((s, id) => s + (modules.find(m => m.id === id)?.basePrice ?? 0), 0)}/mo
          </p>
        </div>
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 text-xs text-sky-600">
          📧 A one-time invite link (24h TTL) will be emailed to <strong>{selected?.contactEmail}</strong> once you confirm.
        </div>
      </DrawerForm>

      {/* Reject Dialog */}
      <ConfirmDialog
        open={rejectDialog} onClose={() => setRejectDialog(false)} onConfirm={handleReject}
        title={`Reject request from ${selected?.companyName}?`}
        loading={loading} confirmLabel="Reject Request"
        description=""
      >
        <Field label="Reason for rejection" required>
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this request is being rejected…" rows={3} />
        </Field>
      </ConfirmDialog>
    </div>
  );
}