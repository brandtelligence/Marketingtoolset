import { useState, useEffect } from 'react';
import { Save, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { Field, Input, Select, Textarea } from '../../components/saas/DrawerForm';
import { useAuth } from '../../components/AuthContext';
import { formatRM } from '../../utils/format';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { fetchTenants, updateTenant, type Tenant } from '../../utils/apiClient';

export function TenantCompanyPage() {
  const t = useDashboardTheme();
  const { user } = useAuth();
  const [tenant,         setTenant]         = useState<Tenant | null>(null);
  const [name,           setName]           = useState('');
  const [taxId,          setTaxId]          = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [adminName,      setAdminName]      = useState('');
  const [adminEmail,     setAdminEmail]     = useState('');
  const [country,        setCountry]        = useState('');
  const [size,           setSize]           = useState('');
  const [loading,        setLoading]        = useState(false);

  useEffect(() => {
    if (!user?.tenantId) return;
    fetchTenants().then(tenants => {
      const ten = tenants.find(t => t.id === user.tenantId) ?? null;
      setTenant(ten);
      if (ten) {
        setName(ten.name);
        setTaxId(ten.taxId ?? '');
        setBillingAddress(ten.billingAddress ?? '');
        setAdminName(ten.adminName ?? '');
        setAdminEmail(ten.adminEmail ?? '');
        setCountry(ten.country ?? '');
        setSize(ten.size ?? '');
      }
    });
  }, [user?.tenantId]);

  const handleSave = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      await updateTenant(tenant.id, { name, taxId, billingAddress, adminName, adminEmail, country, size });
      setTenant(prev => prev ? { ...prev, name, taxId, billingAddress, adminName, adminEmail, country, size } : prev);
      toast.success('Company profile updated successfully');
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!tenant) return (
    <div className="flex items-center justify-center h-64">
      <p className={`${t.textFaint} text-sm`}>Loading…</p>
    </div>
  );

  return (
    <div>
      <PageHeader title="Company Profile" subtitle="Manage your organization's information and billing details" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logo / Overview */}
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-teal-500/20 border-2 border-teal-500/30 flex items-center justify-center text-4xl">
              {tenant.logoUrl
                ? <img src={tenant.logoUrl} alt={tenant.name} className="w-full h-full object-cover rounded-2xl" />
                : <Building2 className="w-10 h-10 text-teal-500" />}
            </div>
            <div>
              <p className={`${t.text} font-bold text-lg`}>{tenant.name}</p>
              <p className={`${t.textMd} text-sm`}>{tenant.plan} Plan</p>
              <p className={`${t.textFaint} text-xs mt-1`}>{tenant.country} · {tenant.size} employees</p>
            </div>
            <div className={`w-full ${t.s1} rounded-xl p-3 text-left space-y-2`}>
              <div className="flex justify-between text-sm">
                <span className={t.textFaint}>Monthly Cost</span>
                <span className="text-teal-500 font-bold">RM {formatRM(tenant.mrr)}/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={t.textFaint}>Modules Active</span>
                <span className={t.text}>{tenant.moduleIds.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={t.textFaint}>Member Since</span>
                <span className={t.text}>{tenant.createdAt}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Edit form */}
        <div className="lg:col-span-2 space-y-5">
          <Card title="Company Information">
            <div className="space-y-4">
              <Field label="Company Name" required>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country">
                  <Select value={country} onChange={e => setCountry(e.target.value)}>
                    {['Malaysia', 'Singapore', 'Australia', 'Philippines', 'Indonesia', 'Thailand'].map(c =>
                      <option key={c} value={c}>{c}</option>
                    )}
                  </Select>
                </Field>
                <Field label="Team Size">
                  <Select value={size} onChange={e => setSize(e.target.value)}>
                    {['1-10', '11-50', '51-200', '201-500', '500+'].map(s =>
                      <option key={s} value={s}>{s}</option>
                    )}
                  </Select>
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Billing Information">
            <div className="space-y-4">
              <Field label="Tax / Registration ID" hint="Used on invoices">
                <Input value={taxId} onChange={e => setTaxId(e.target.value)} placeholder="MY-123456789" />
              </Field>
              <Field label="Billing Address" hint="Full address as it should appear on invoices">
                <Textarea value={billingAddress} onChange={e => setBillingAddress(e.target.value)} rows={3} />
              </Field>
            </div>
          </Card>

          <Card title="Primary Contact">
            <div className="space-y-4">
              <Field label="Admin Name">
                <Input value={adminName} onChange={e => setAdminName(e.target.value)} />
              </Field>
              <Field label="Admin Email" required>
                <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
              </Field>
            </div>
          </Card>

          <div className="flex justify-end">
            <PrimaryBtn variant="teal" onClick={handleSave} loading={loading}>
              <Save className="w-4 h-4" /> Save Changes
            </PrimaryBtn>
          </div>
        </div>
      </div>
    </div>
  );
}