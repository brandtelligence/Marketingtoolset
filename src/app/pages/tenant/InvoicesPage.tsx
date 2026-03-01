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
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:40px;color:#1f2937;max-width:800px;margin:0 auto}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #14b8a6}.logo{font-size:24px;font-weight:800;color:#14b8a6}.logo span{color:#6b7280;font-weight:400;font-size:14px;display:block;margin-top:2px}.inv-num{text-align:right}.inv-num h2{font-size:20px;color:#374151;margin-bottom:4px}.inv-num p{font-size:12px;color:#6b7280}.meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}.meta-block h4{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;margin-bottom:6px}.meta-block p{font-size:13px;color:#374151;margin-bottom:2px}table{width:100%;border-collapse:collapse;margin-bottom:20px}thead tr{background:#f9fafb}th{padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;text-align:left;border-bottom:2px solid #e5e7eb}th:nth-child(2),th:nth-child(3),th:nth-child(4){text-align:right}th:nth-child(2){text-align:center}.totals{display:flex;flex-direction:column;align-items:flex-end;gap:4px;margin-bottom:24px}.totals .row{display:flex;gap:32px;font-size:13px;color:#6b7280}.totals .row span:last-child{min-width:100px;text-align:right}.totals .total-row{font-size:16px;font-weight:700;color:#1f2937;border-top:2px solid #14b8a6;padding-top:8px;margin-top:4px}.status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase}.status-paid{background:#d1fae5;color:#065f46}.status-sent{background:#dbeafe;color:#1e40af}.status-overdue{background:#fee2e2;color:#991b1b}.status-draft{background:#f3f4f6;color:#6b7280}.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}.notes{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin-bottom:20px;font-size:12px;color:#92400e}@media print{body{padding:20px}button{display:none!important}}</style></head><body>
<div class="header"><div class="logo">Brandtelligence<span>AI-Powered Content Platform</span></div><div class="inv-num"><h2>${inv.invoiceNumber}</h2><p>Issued: ${inv.issuedAt}</p><p>Due: ${inv.dueDate}</p></div></div>
<div class="meta"><div class="meta-block"><h4>Bill To</h4><p style="font-weight:600">${inv.tenantName}</p><p>Period: ${inv.period}</p></div><div class="meta-block" style="text-align:right"><h4>Status</h4><span class="status status-${inv.status}">${inv.status}</span>${inv.paidAt ? `<p style="margin-top:6px;font-size:12px;color:#065f46">Paid: ${inv.paidAt}</p>` : ''}</div></div>
${inv.notes ? `<div class="notes"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
<table><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>${linesHtml}</tbody></table>
<div class="totals"><div class="row"><span>Subtotal</span><span>RM ${fmtRM(inv.subtotal)}</span></div><div class="row"><span>SST (6%)</span><span>RM ${fmtRM(inv.tax)}</span></div><div class="row total-row"><span>Total Due</span><span>RM ${fmtRM(inv.total)}</span></div></div>
<div class="footer"><p>Brandtelligence Sdn Bhd · SSM 202401000001 · SST ID W10-2401-32000001</p><p style="margin-top:4px">Thank you for your business. Payment terms: Net 30 days.</p></div>
<div style="text-align:center;margin-top:24px"><button onclick="window.print()" style="padding:10px 28px;background:#14b8a6;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">Print / Save as PDF</button></div>
</body></html>`;
  const w = window.open('', '_blank', 'width=820,height=900');
  if (w) { w.document.write(html); w.document.close(); }
  else { toast.error('Popup blocked — please allow popups for PDF download'); }
}

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

  // P3-FIX-16: Persist gateway payment to Postgres (was local-state-only with fake delay)
  const handleGatewayPay = async (inv: Invoice) => {
    setLoading(true);
    const patch = { status: 'paid' as const, paidAt: new Date().toISOString().slice(0, 10), paymentMethod: 'gateway' as const };
    try {
      await updateInvoice(inv.id, patch);
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, ...patch } : i));
      setSelected(prev => prev?.id === inv.id ? { ...prev, ...patch } : prev);
      toast.success(`Payment successful for ${inv.invoiceNumber}`);
    } catch (err: any) {
      toast.error(`Payment failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // P3-FIX-17: Persist bank transfer to Postgres (was local-state-only with fake delay)
  const handleBankTransferSubmit = async () => {
    if (!selected) return;
    if (!uploadedFile) { toast.error('Please upload your payment proof'); return; }
    setLoading(true);
    const patch = { paymentMethod: 'bank_transfer' as const, notes: `Bank transfer submitted. Proof: ${uploadedFile.name}. Note: ${transferNote}` };
    try {
      await updateInvoice(selected.id, patch);
      setInvoices(prev => prev.map(i => i.id === selected.id ? { ...i, ...patch } : i));
    } catch (err: any) {
      toast.error(`Submission failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
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
          <button onClick={() => generateInvoicePdf(i)} className={`p-1.5 rounded-lg ${t.hover} ${t.textMd}`} title="Download PDF"><Download className="w-4 h-4" /></button>
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
              <PrimaryBtn variant="ghost" onClick={() => selected && generateInvoicePdf(selected)}><Download className="w-4 h-4" />Download PDF</PrimaryBtn>
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