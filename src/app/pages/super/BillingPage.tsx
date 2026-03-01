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
import { getAuthHeaders } from '../../utils/authHeaders';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// ── CSV Export helper ───────────────────────────────────────────────────────
function downloadCsv(filename: string, rows: Record<string, any>[], columns: { key: string; label: string }[]) {
  const header = columns.map(c => `"${c.label}"`).join(',');
  const body = rows.map(r =>
    columns.map(c => {
      const v = r[c.key] ?? '';
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(',')
  ).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Invoice PDF generator (opens print-friendly window → Save as PDF) ────
function generateInvoicePdf(inv: Invoice) {
  const fmtRM = (n: number) => n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const linesHtml = inv.lines.map(l =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${l.description}</td>
     <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${l.quantity}</td>
     <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">RM ${fmtRM(l.unitPrice)}</td>
     <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right">RM ${fmtRM(l.total)}</td></tr>`
  ).join('');

  const html = `<!DOCTYPE html><html><head><title>${inv.invoiceNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:40px;color:#1f2937;max-width:800px;margin:0 auto}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #14b8a6}
  .logo{font-size:24px;font-weight:800;color:#14b8a6}
  .logo span{color:#6b7280;font-weight:400;font-size:14px;display:block;margin-top:2px}
  .inv-num{text-align:right}
  .inv-num h2{font-size:20px;color:#374151;margin-bottom:4px}
  .inv-num p{font-size:12px;color:#6b7280}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}
  .meta-block h4{font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;margin-bottom:6px}
  .meta-block p{font-size:13px;color:#374151;margin-bottom:2px}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  thead tr{background:#f9fafb}
  th{padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;text-align:left;border-bottom:2px solid #e5e7eb}
  th:nth-child(2),th:nth-child(3),th:nth-child(4){text-align:right}
  th:nth-child(2){text-align:center}
  .totals{display:flex;flex-direction:column;align-items:flex-end;gap:4px;margin-bottom:24px}
  .totals .row{display:flex;gap:32px;font-size:13px;color:#6b7280}
  .totals .row span:last-child{min-width:100px;text-align:right}
  .totals .total-row{font-size:16px;font-weight:700;color:#1f2937;border-top:2px solid #14b8a6;padding-top:8px;margin-top:4px}
  .status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase}
  .status-paid{background:#d1fae5;color:#065f46}
  .status-sent{background:#dbeafe;color:#1e40af}
  .status-overdue{background:#fee2e2;color:#991b1b}
  .status-draft{background:#f3f4f6;color:#6b7280}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
  .notes{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin-bottom:20px;font-size:12px;color:#92400e}
  @media print{body{padding:20px}button{display:none!important}}
</style></head><body>
<div class="header">
  <div class="logo">Brandtelligence<span>AI-Powered Content Platform</span></div>
  <div class="inv-num"><h2>${inv.invoiceNumber}</h2><p>Issued: ${inv.issuedAt}</p><p>Due: ${inv.dueDate}</p></div>
</div>
<div class="meta">
  <div class="meta-block"><h4>Bill To</h4><p style="font-weight:600">${inv.tenantName}</p><p>Period: ${inv.period}</p></div>
  <div class="meta-block" style="text-align:right"><h4>Status</h4><span class="status status-${inv.status}">${inv.status}</span>${inv.paidAt ? `<p style="margin-top:6px;font-size:12px;color:#065f46">Paid: ${inv.paidAt}</p>` : ''}</div>
</div>
${inv.notes ? `<div class="notes"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
<table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>${linesHtml}</tbody></table>
<div class="totals">
  <div class="row"><span>Subtotal</span><span>RM ${fmtRM(inv.subtotal)}</span></div>
  <div class="row"><span>SST (6%)</span><span>RM ${fmtRM(inv.tax)}</span></div>
  <div class="row total-row"><span>Total Due</span><span>RM ${fmtRM(inv.total)}</span></div>
</div>
<div class="footer">
  <p>Brandtelligence Sdn Bhd · SSM 202401000001 · SST ID W10-2401-32000001</p>
  <p style="margin-top:4px">Thank you for your business. Payment terms: Net 30 days.</p>
</div>
<div style="text-align:center;margin-top:24px">
  <button onclick="window.print()" style="padding:10px 28px;background:#14b8a6;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Print / Save as PDF</button>
</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=820,height=900');
  if (w) { w.document.write(html); w.document.close(); }
  else { toast.error('Popup blocked — please allow popups for PDF download'); }
}

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
    try {
      const res = await fetch(`${SERVER}/invoices/generate-monthly`, {
        method: 'POST',
        headers: await getAuthHeaders(true),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate invoices');
      toast.success(`${data.message ?? 'Invoices generated'}${data.skipped ? ` (${data.skipped} already billed)` : ''}`);
      // Refresh invoice list
      const refreshed = await fetchInvoices();
      setInvoices(refreshed);
    } catch (err: any) {
      console.error('[BillingPage] generate-monthly error:', err);
      toast.error(`Invoice generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
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
          <button onClick={() => generateInvoicePdf(i)} className={`p-1.5 rounded-lg ${t.hover} ${t.textMd}`}><Download className="w-4 h-4" /></button>
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
            <PrimaryBtn variant="ghost" onClick={() => downloadCsv('invoices.csv', invoices, [
              { key: 'invoiceNumber', label: 'Invoice #' },
              { key: 'tenantName', label: 'Tenant' },
              { key: 'period', label: 'Period' },
              { key: 'total', label: 'Total' },
              { key: 'dueDate', label: 'Due Date' },
              { key: 'paymentMethod', label: 'Payment Method' },
              { key: 'status', label: 'Status' },
            ])}><Download className="w-4 h-4" />Export</PrimaryBtn>
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
              <PrimaryBtn variant="ghost" onClick={() => selected && generateInvoicePdf(selected)}><Download className="w-4 h-4" />PDF</PrimaryBtn>
              <div className="flex-1" />
              <PrimaryBtn variant="ghost" onClick={() => setDrawerOpen(false)}>Close</PrimaryBtn>
              <PrimaryBtn onClick={handleConfirmBankTransfer} loading={loading}>
                <CheckCircle className="w-4 h-4" /> Confirm Bank Transfer
              </PrimaryBtn>
            </>
          ) : (
            <>
              <PrimaryBtn variant="ghost" onClick={() => selected && generateInvoicePdf(selected)}><Download className="w-4 h-4" />PDF</PrimaryBtn>
              <div className="flex-1" />
              <PrimaryBtn variant="ghost" onClick={() => setDrawerOpen(false)}>Close</PrimaryBtn>
            </>
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