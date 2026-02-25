import { useState, useEffect } from 'react';
import { CreditCard, Download, Upload, CheckCircle, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn, StatCard } from '../../components/saas/SaasLayout';
import { DataTable, Column } from '../../components/saas/DataTable';
import { StatusBadge } from '../../components/saas/StatusBadge';
import { DrawerForm, Field, Textarea } from '../../components/saas/DrawerForm';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { formatRM } from '../../utils/format';
import { fetchInvoices, updateInvoice, type Invoice, type InvoiceStatus } from '../../utils/apiClient';

export function BillingPage() {
  const t = useDashboardTheme();
  const [invoices,  setInvoices]  = useState<Invoice[]>([]);
  const [selected,  setSelected]  = useState<Invoice | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmNote, setConfirmNote] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [filter,    setFilter]    = useState<InvoiceStatus | 'all'>('all');

  useEffect(() => {
    fetchInvoices().then(setInvoices).catch(err => {
      console.error('[BillingPage] load error:', err);
      toast.error(`Failed to load invoices: ${err.message}`);
    });
  }, []);

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter);
  const bankQueue = invoices.filter(i => i.paymentMethod === 'bank_transfer' && i.status !== 'paid');

  const openInvoice = (inv: Invoice) => { setSelected(inv); setDrawerOpen(true); };

  const handleGenerateInvoices = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    toast.success('Monthly invoices generated for all active tenants (Feb 2025)');
  };

  const handleConfirmBankTransfer = async () => {
    if (!selected) return;
    setLoading(true);
    const patch = { status: 'paid' as const, paidAt: new Date().toISOString().slice(0, 10), notes: confirmNote || undefined };
    try {
      await updateInvoice(selected.id, patch);
      setInvoices(prev => prev.map(i => i.id === selected.id ? { ...i, ...patch } : i));
      setSelected(prev => prev ? { ...prev, ...patch } : null);
      toast.success(`Bank transfer confirmed for ${selected.invoiceNumber}`);
      setConfirmNote('');
    } catch (err: any) { toast.error(`Confirm failed: ${err.message}`); }
    finally { setLoading(false); }
  };

  const statusFilters: { label: string; value: InvoiceStatus | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Sent', value: 'sent' },
    { label: 'Paid', value: 'paid' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Draft', value: 'draft' },
  ];

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const outstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);

  const columns: Column<Invoice>[] = [
    { key: 'invoiceNumber', header: 'Invoice #', sortable: true, render: i => <span className="font-mono text-purple-600">{i.invoiceNumber}</span> },
    { key: 'tenantName', header: 'Tenant', sortable: true, render: i => <span className={`font-medium ${t.text}`}>{i.tenantName}</span> },
    { key: 'period', header: 'Period', sortable: true, render: i => <span className={t.textMd}>{i.period}</span> },
    { key: 'total', header: 'Total', sortable: true, render: i => <span className={`font-semibold ${t.text}`}>RM {formatRM(i.total)}</span> },
    { key: 'dueDate', header: 'Due Date', sortable: true, render: i => <span className={`${t.textMd} text-xs`}>{i.dueDate}</span> },
    { key: 'paymentMethod', header: 'Method', render: i => <span className={`${t.textMd} text-xs capitalize`}>{i.paymentMethod === 'none' ? '—' : i.paymentMethod.replace('_', ' ')}</span> },
    { key: 'status', header: 'Status', render: i => <StatusBadge status={i.status} /> },
    {
      key: 'actions', header: '',
      render: i => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => openInvoice(i)} className={`p-1.5 rounded-lg ${t.hover} ${t.textMd}`}><Eye className="w-4 h-4" /></button>
          <button onClick={() => toast.info(`PDF download for ${i.invoiceNumber}`)} className={`p-1.5 rounded-lg ${t.hover} ${t.textMd}`}><Download className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Manage invoices, confirm bank transfers, and track revenue"
        actions={
          <>
            <PrimaryBtn variant="ghost" onClick={() => toast.info('Exported to CSV')}><Download className="w-4 h-4" />Export</PrimaryBtn>
            <PrimaryBtn onClick={handleGenerateInvoices} loading={loading}><CreditCard className="w-4 h-4" />Generate Monthly Invoices</PrimaryBtn>
          </>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Revenue (Paid)" value={`RM ${formatRM(totalRevenue)}`} color="emerald" icon={<CreditCard className="w-8 h-8" />} />
        <StatCard label="Outstanding" value={`RM ${formatRM(outstanding)}`} color="orange" icon={<AlertTriangle className="w-8 h-8" />} />
        <StatCard label="Overdue Invoices" value={invoices.filter(i => i.status === 'overdue').length} color="red" icon={<AlertTriangle className="w-8 h-8" />} />
        <StatCard label="Bank Transfer Queue" value={bankQueue.length} color="sky" icon={<Upload className="w-8 h-8" />} />
      </div>

      {/* Bank Transfer Queue */}
      {bankQueue.length > 0 && (
        <Card title="🏦 Bank Transfer Queue — Awaiting Confirmation" className="mb-6">
          <div className="space-y-2">
            {bankQueue.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div>
                  <p className={`${t.text} font-medium`}>{inv.invoiceNumber} · {inv.tenantName}</p>
                  <p className="text-amber-600 text-xs">{inv.notes ?? 'Bank transfer proof uploaded'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`${t.text} font-bold`}>RM {formatRM(inv.total)}</span>
                  <PrimaryBtn size="sm" onClick={() => openInvoice(inv)}><CheckCircle className="w-3.5 h-3.5" />Review</PrimaryBtn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className={`flex gap-1 ${t.tabBg} rounded-xl p-1 mb-4 w-fit`}>
        {statusFilters.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f.value ? t.tabActive : t.tabInactive}`}
          >
            {f.label}
            {f.value !== 'all' && (
              <span className="ml-1 text-[0.6rem] opacity-60">({invoices.filter(i => i.status === f.value).length})</span>
            )}
          </button>
        ))}
      </div>

      <Card>
        <DataTable
          columns={columns} data={filtered} keyField="id"
          onRowClick={openInvoice}
          searchPlaceholder="Search invoices…"
          searchFields={['invoiceNumber', 'tenantName', 'period']}
          emptyTitle="No invoices" emptyDescription="No invoices match the current filter."
        />
      </Card>

      {/* Invoice Detail Drawer */}
      <DrawerForm
        open={drawerOpen} onClose={() => setDrawerOpen(false)} width="md"
        title={selected?.invoiceNumber ?? ''}
        subtitle={`${selected?.tenantName} · ${selected?.period}`}
        footer={
          selected?.paymentMethod === 'bank_transfer' && selected?.status !== 'paid' ? (
            <>
              <PrimaryBtn variant="ghost" onClick={() => setDrawerOpen(false)}>Close</PrimaryBtn>
              <PrimaryBtn onClick={handleConfirmBankTransfer} loading={loading}>
                <CheckCircle className="w-4 h-4" /> Confirm Bank Transfer
              </PrimaryBtn>
            </>
          ) : (
            <PrimaryBtn variant="ghost" onClick={() => setDrawerOpen(false)}>Close</PrimaryBtn>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={selected.status} size="md" />
              {selected.paymentMethod !== 'none' && (
                <span className={`${t.textFaint} text-xs capitalize`}>{selected.paymentMethod.replace('_', ' ')}</span>
              )}
            </div>
            {/* Line items */}
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
                <div className={`flex justify-between ${t.textMd}`}><span>Tax (10%)</span><span>RM {formatRM(selected.tax)}</span></div>
                <div className={`flex justify-between font-bold ${t.text} text-base border-t ${t.border} pt-2 mt-1`}><span>Total</span><span>RM {formatRM(selected.total)}</span></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className={`${t.s1} rounded-xl p-3`}><p className={`${t.textFaint} text-xs mb-1`}>Issued</p><p className={t.text}>{selected.issuedAt}</p></div>
              <div className={`${t.s1} rounded-xl p-3`}><p className={`${t.textFaint} text-xs mb-1`}>Due</p><p className={t.text}>{selected.dueDate}</p></div>
              {selected.paidAt && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 col-span-2"><p className="text-emerald-600 text-xs mb-1">Paid On</p><p className={t.text}>{selected.paidAt}</p></div>}
            </div>
            {selected.notes && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <p className="text-amber-600 text-xs mb-1">Notes</p>
                <p className={`${t.textSm} text-sm`}>{selected.notes}</p>
              </div>
            )}
            {selected.paymentMethod === 'bank_transfer' && selected.status !== 'paid' && (
              <Field label="Confirmation Note (optional)">
                <Textarea value={confirmNote} onChange={e => setConfirmNote(e.target.value)} placeholder="Add a reconciliation note…" rows={2} />
              </Field>
            )}
          </div>
        )}
      </DrawerForm>
    </div>
  );
}