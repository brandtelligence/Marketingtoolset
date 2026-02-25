import { useState, useEffect, useRef } from 'react';
import { Eye, Download, Upload, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { DataTable, Column } from '../../components/saas/DataTable';
import { StatusBadge } from '../../components/saas/StatusBadge';
import { DrawerForm, Field, Textarea } from '../../components/saas/DrawerForm';
import { formatRM } from '../../utils/format';
import { useAuth } from '../../components/AuthContext';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { fetchInvoices, updateInvoice, type Invoice } from '../../utils/apiClient';

export function TenantInvoicesPage() {
  const t = useDashboardTheme();
  const { user } = useAuth();
  const [invoices,    setInvoices]    = useState<Invoice[]>([]);
  const [selected,    setSelected]    = useState<Invoice | null>(null);
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [bankModal,   setBankModal]   = useState(false);
  const [transferNote, setTransferNote] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loading,     setLoading]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.tenantId) return;
    fetchInvoices(user.tenantId).then(setInvoices).catch(err =>
      toast.error(`Failed to load invoices: ${err.message}`)
    );
  }, [user?.tenantId]);

  const openInvoice = (inv: Invoice) => { setSelected(inv); setDrawerOpen(true); };

  const handleGatewayPay = async (inv: Invoice) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'paid', paidAt: new Date().toISOString().slice(0, 10), paymentMethod: 'gateway' } : i));
    setSelected(prev => prev?.id === inv.id ? { ...prev, status: 'paid', paidAt: new Date().toISOString().slice(0, 10), paymentMethod: 'gateway' } : prev);
    setLoading(false);
    toast.success(`✅ Payment successful for ${inv.invoiceNumber}`);
  };

  const handleBankTransferSubmit = async () => {
    if (!selected) return;
    if (!uploadedFile) { toast.error('Please upload your payment proof'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setInvoices(prev => prev.map(i => i.id === selected.id
      ? { ...i, paymentMethod: 'bank_transfer', notes: `Bank transfer submitted. Proof: ${uploadedFile.name}. Note: ${transferNote}` }
      : i
    ));
    setLoading(false);
    setBankModal(false);
    setUploadedFile(null);
    setTransferNote('');
    toast.success('Bank transfer proof submitted — awaiting Super Admin confirmation');
  };

  const unpaid = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);

  const columns: Column<Invoice>[] = [
    { key: 'invoiceNumber', header: 'Invoice #', sortable: true, render: i => <span className="font-mono text-teal-600">{i.invoiceNumber}</span> },
    { key: 'period', header: 'Period', sortable: true, render: i => <span className={t.textMd}>{i.period}</span> },
    { key: 'total', header: 'Total', sortable: true, render: i => <span className={`font-semibold ${t.text}`}>RM {formatRM(i.total)}</span> },
    { key: 'dueDate', header: 'Due Date', sortable: true, render: i => <span className={`${t.textMd} text-xs`}>{i.dueDate}</span> },
    { key: 'status', header: 'Status', render: i => <StatusBadge status={i.status} /> },
    {
      key: 'actions', header: '',
      render: i => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => openInvoice(i)} className={`p-1.5 rounded-lg ${t.hover} ${t.textMd}`}><Eye className="w-4 h-4" /></button>
          <button onClick={() => toast.info(`Downloading ${i.invoiceNumber}`)} className={`p-1.5 rounded-lg ${t.hover} ${t.textMd}`}><Download className="w-4 h-4" /></button>
          {(i.status === 'sent' || i.status === 'overdue') && (
            <PrimaryBtn size="sm" variant="teal" onClick={() => { setSelected(i); setDrawerOpen(true); }}>Pay</PrimaryBtn>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Invoices & Billing" subtitle="Manage your invoices and make payments" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-500/20 border border-emerald-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">RM {formatRM(totalPaid)}</p>
          <p className="text-xs text-emerald-600/70 mt-1">Total Paid</p>
        </div>
        <div className={`${unpaid.some(i => i.status === 'overdue') ? 'bg-red-500/20 border-red-500/20' : 'bg-amber-500/20 border-amber-500/20'} border rounded-xl p-4 text-center`}>
          <p className={`text-2xl font-bold ${unpaid.some(i => i.status === 'overdue') ? 'text-red-600' : 'text-amber-600'}`}>
            RM {formatRM(unpaid.reduce((s, i) => s + i.total, 0))}
          </p>
          <p className={`text-xs mt-1 ${unpaid.some(i => i.status === 'overdue') ? 'text-red-600/70' : 'text-amber-600/70'}`}>Outstanding</p>
        </div>
        <div className={`${t.s1} border ${t.border} rounded-xl p-4 text-center`}>
          <p className={`text-2xl font-bold ${t.text}`}>{invoices.length}</p>
          <p className={`text-xs ${t.textFaint} mt-1`}>Total Invoices</p>
        </div>
      </div>

      {/* Overdue alert */}
      {unpaid.some(i => i.status === 'overdue') && (
        <div className="mb-4 bg-red-500/15 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
          <p className="text-red-600 text-sm flex-1">You have an overdue invoice. Please pay to prevent account suspension.</p>
        </div>
      )}

      <Card>
        <DataTable columns={columns} data={invoices} keyField="id" onRowClick={openInvoice}
          emptyTitle="No invoices" emptyDescription="Your invoices will appear here when generated." />
      </Card>

      {/* Invoice Detail Drawer */}
      <DrawerForm
        open={drawerOpen} onClose={() => setDrawerOpen(false)} width="md"
        title={selected?.invoiceNumber ?? ''} subtitle={`Period: ${selected?.period}`}
        footer={
          (selected?.status === 'sent' || selected?.status === 'overdue') ? (
            <>
              <PrimaryBtn variant="ghost" onClick={() => setDrawerOpen(false)}>Close</PrimaryBtn>
              <PrimaryBtn variant="ghost" onClick={() => { setDrawerOpen(false); setBankModal(true); }}>
                <Upload className="w-4 h-4" /> Bank Transfer
              </PrimaryBtn>
              <PrimaryBtn variant="teal" onClick={() => handleGatewayPay(selected!)} loading={loading}>
                <CreditCard className="w-4 h-4" /> Pay Online
              </PrimaryBtn>
            </>
          ) : (
            <div className="flex gap-2 w-full">
              <PrimaryBtn variant="ghost" onClick={() => toast.info(`Downloading ${selected?.invoiceNumber}`)}><Download className="w-4 h-4" />Download PDF</PrimaryBtn>
              <div className="flex-1" />
              <PrimaryBtn variant="ghost" onClick={() => setDrawerOpen(false)}>Close</PrimaryBtn>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <StatusBadge status={selected.status} size="md" />
            <div className={`${t.s1} rounded-xl overflow-hidden`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${t.border}`}>
                    <th className={`px-4 py-2.5 text-left ${t.textFaint} text-xs`}>Description</th>
                    <th className={`px-4 py-2.5 text-right ${t.textFaint} text-xs`}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map(l => (
                    <tr key={l.id} className={`border-b ${t.border}`}>
                      <td className={`px-4 py-2.5 ${t.textSm}`}>{l.description}</td>
                      <td className={`px-4 py-2.5 text-right ${t.textSm}`}>RM {formatRM(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={`px-4 py-3 border-t ${t.border} space-y-1 text-sm`}>
                <div className={`flex justify-between ${t.textMd}`}><span>Subtotal</span><span>RM {formatRM(selected.subtotal)}</span></div>
                <div className={`flex justify-between ${t.textMd}`}><span>Tax</span><span>RM {formatRM(selected.tax)}</span></div>
                <div className={`flex justify-between font-bold ${t.text} text-base border-t ${t.border} pt-2 mt-1`}><span>Total Due</span><span>RM {formatRM(selected.total)}</span></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className={`${t.s1} rounded-xl p-3`}><p className={`${t.textFaint} text-xs mb-1`}>Issued</p><p className={t.text}>{selected.issuedAt}</p></div>
              <div className={`${t.s1} rounded-xl p-3`}><p className={`${t.textFaint} text-xs mb-1`}>Due Date</p><p className={t.text}>{selected.dueDate}</p></div>
            </div>
            {selected.notes && (
              <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 text-xs text-sky-600">{selected.notes}</div>
            )}
            {selected.status === 'paid' && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-emerald-600 text-sm font-medium">Payment Received</p>
                  <p className="text-emerald-600/60 text-xs">Paid on {selected.paidAt}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </DrawerForm>

      {/* Bank Transfer Modal */}
      <DrawerForm
        open={bankModal} onClose={() => setBankModal(false)} width="sm"
        title="Submit Bank Transfer Proof"
        subtitle={`For invoice ${selected?.invoiceNumber} · RM ${selected?.total != null ? formatRM(selected.total) : ''}`}
        footer={
          <>
            <PrimaryBtn variant="ghost" onClick={() => setBankModal(false)}>Cancel</PrimaryBtn>
            <PrimaryBtn variant="teal" onClick={handleBankTransferSubmit} loading={loading}><Upload className="w-4 h-4" />Submit Proof</PrimaryBtn>
          </>
        }
      >
        <div className={`${t.s1} rounded-xl p-4 border ${t.border} text-sm space-y-2`}>
          <p className={`${t.textMd} font-medium`}>Bank Transfer Details</p>
          <div className={`space-y-1 ${t.textMd}`}>
            <p>Bank: <span className={t.text}>Malayan Banking Berhad (Maybank)</span></p>
            <p>Account Name: <span className={t.text}>Brandtelligence Sdn Bhd</span></p>
            <p>Account No: <span className={`${t.text} font-mono`}>5642-8819-2034</span></p>
            <p>Reference: <span className={`${t.text} font-mono`}>{selected?.invoiceNumber}</span></p>
            <p>Amount: <span className={`${t.text} font-bold`}>RM {selected?.total != null ? formatRM(selected.total) : ''}</span></p>
          </div>
        </div>

        <Field label="Upload Payment Receipt" required hint="PDF, JPG, or PNG accepted (max 5MB)">
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${uploadedFile ? 'border-teal-500/60 bg-teal-500/10' : `${t.borderMd} ${t.hoverBorder}`}`}
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={e => setUploadedFile(e.target.files?.[0] ?? null)} />
            {uploadedFile ? (
              <div>
                <CheckCircle className="w-8 h-8 text-teal-500 mx-auto mb-2" />
                <p className="text-teal-600 text-sm font-medium">{uploadedFile.name}</p>
                <p className="text-teal-600/60 text-xs">{(uploadedFile.size / 1024).toFixed(0)} KB · Click to change</p>
              </div>
            ) : (
              <>
                <Upload className={`w-8 h-8 ${t.textFaint} mx-auto mb-2`} />
                <p className={`${t.textMd} text-sm`}>Click or drag & drop your receipt</p>
              </>
            )}
          </div>
        </Field>

        <Field label="Transfer Note (optional)">
          <Textarea value={transferNote} onChange={e => setTransferNote(e.target.value)} placeholder="Reference number, date of transfer, bank name…" rows={2} />
        </Field>
      </DrawerForm>
    </div>
  );
}