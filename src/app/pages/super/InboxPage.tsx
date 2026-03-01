import { useState, useEffect } from 'react';
import { Inbox, ArrowUpCircle, MessageSquare, RefreshCw, Clock, Building2, Mail, User, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, Card, PrimaryBtn } from '../../components/saas/SaasLayout';
import { StatusBadge } from '../../components/saas/StatusBadge';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { getAuthHeaders } from '../../utils/authHeaders';
import { projectId } from '/utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

interface UpgradeRequest {
  id: string;
  tenantId: string;
  tenantName: string;
  message: string;
  currentModules: string[];
  availableModules: string[];
  requesterEmail: string;
  status: string;
  createdAt: string;
}

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
  createdAt: string;
}

type TabType = 'upgrade' | 'contact';

export function InboxPage() {
  const t = useDashboardTheme();
  const [tab, setTab] = useState<TabType>('upgrade');
  const [upgrades, setUpgrades] = useState<UpgradeRequest[]>([]);
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [uRes, cRes] = await Promise.all([
        fetch(`${SERVER}/upgrade-requests`, { headers }),
        fetch(`${SERVER}/contact-submissions`, { headers }),
      ]);
      const [uData, cData] = await Promise.all([uRes.json(), cRes.json()]);
      if (uRes.ok) setUpgrades(uData.requests ?? []);
      else console.error('[Inbox] upgrade-requests error:', uData.error);
      if (cRes.ok) setContacts(cData.submissions ?? []);
      else console.error('[Inbox] contact-submissions error:', cData.error);
    } catch (err: any) {
      console.error('[Inbox] load error:', err);
      toast.error(`Failed to load inbox: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleRefresh = async () => {
    await fetchAll();
    toast.success('Inbox refreshed');
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    if (diff < 604800_000) return `${Math.floor(diff / 86400_000)}d ago`;
    return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const tabs: { key: TabType; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'upgrade', label: 'Upgrade Requests', count: upgrades.length, icon: <ArrowUpCircle className="w-4 h-4" /> },
    { key: 'contact', label: 'Contact Forms', count: contacts.length, icon: <MessageSquare className="w-4 h-4" /> },
  ];

  const SkeletonRows = () => (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className={`p-4 rounded-xl ${t.s1} border ${t.border} animate-pulse`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${t.s0}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-3 ${t.s0} rounded w-1/3`} />
              <div className={`h-2 ${t.s0} rounded w-2/3`} />
            </div>
            <div className={`h-5 w-16 ${t.s0} rounded-full`} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Inbox"
        subtitle="Upgrade requests from tenants and contact form submissions"
        actions={
          <PrimaryBtn variant="ghost" onClick={handleRefresh} loading={loading}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </PrimaryBtn>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-purple-500/15 border border-purple-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-500">{upgrades.length}</p>
          <p className="text-xs text-purple-500/70 mt-1">Upgrade Requests</p>
        </div>
        <div className="bg-teal-500/15 border border-teal-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-teal-500">{contacts.length}</p>
          <p className="text-xs text-teal-500/70 mt-1">Contact Forms</p>
        </div>
        <div className="bg-amber-500/15 border border-amber-500/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{upgrades.filter(u => u.status === 'pending').length}</p>
          <p className="text-xs text-amber-500/70 mt-1">Pending Review</p>
        </div>
        <div className={`${t.s1} border ${t.border} rounded-xl p-4 text-center`}>
          <p className={`text-2xl font-bold ${t.text}`}>{upgrades.length + contacts.length}</p>
          <p className={`text-xs ${t.textFaint} mt-1`}>Total Items</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className={`flex gap-1 ${t.tabBg} rounded-xl p-1 mb-4 w-fit`}>
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === tb.key ? t.tabActive : t.tabInactive}`}
          >
            {tb.icon}
            {tb.label}
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === tb.key ? 'bg-white/20' : t.isDark ? 'bg-white/10' : 'bg-black/5'}`}>
              {tb.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <Card>
        {loading ? (
          <SkeletonRows />
        ) : tab === 'upgrade' ? (
          upgrades.length === 0 ? (
            <div className="text-center py-12">
              <ArrowUpCircle className={`w-12 h-12 ${t.textFaint} mx-auto mb-3 opacity-30`} />
              <p className={`${t.text} font-medium`}>No upgrade requests</p>
              <p className={`${t.textFaint} text-sm mt-1`}>Tenant admins can submit upgrade requests from their Modules page.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upgrades.map(req => {
                const isExpanded = expandedId === req.id;
                return (
                  <div
                    key={req.id}
                    className={`rounded-xl border transition-all cursor-pointer ${isExpanded ? `${t.s0} ${t.border}` : `${t.s1} ${t.border} ${t.hoverBorder}`}`}
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-full bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <ArrowUpCircle className="w-5 h-5 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`${t.text} font-medium text-sm truncate`}>{req.tenantName || req.tenantId}</p>
                          <StatusBadge status={req.status as any} />
                        </div>
                        <p className={`${t.textFaint} text-xs truncate mt-0.5`}>{req.message}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`${t.textFaint} text-xs flex items-center gap-1`}>
                          <Clock className="w-3 h-3" />
                          {formatDate(req.createdAt)}
                        </span>
                        {isExpanded ? <ChevronUp className={`w-4 h-4 ${t.textFaint}`} /> : <ChevronDown className={`w-4 h-4 ${t.textFaint}`} />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className={`px-4 pb-4 pt-0 border-t ${t.border} mt-0 space-y-3`}>
                        <div className="grid grid-cols-2 gap-3 pt-3">
                          <div>
                            <p className={`${t.textFaint} text-[10px] uppercase tracking-wider font-semibold mb-1`}>Requester</p>
                            <p className={`${t.textMd} text-sm flex items-center gap-1.5`}><Mail className="w-3.5 h-3.5" />{req.requesterEmail}</p>
                          </div>
                          <div>
                            <p className={`${t.textFaint} text-[10px] uppercase tracking-wider font-semibold mb-1`}>Tenant</p>
                            <p className={`${t.textMd} text-sm flex items-center gap-1.5`}><Building2 className="w-3.5 h-3.5" />{req.tenantName || req.tenantId}</p>
                          </div>
                        </div>
                        <div>
                          <p className={`${t.textFaint} text-[10px] uppercase tracking-wider font-semibold mb-1`}>Message</p>
                          <p className={`${t.textSm} text-sm p-3 ${t.s1} rounded-lg border ${t.border}`}>{req.message}</p>
                        </div>
                        {(req.currentModules?.length > 0 || req.availableModules?.length > 0) && (
                          <div className="grid grid-cols-2 gap-3">
                            {req.currentModules?.length > 0 && (
                              <div>
                                <p className={`${t.textFaint} text-[10px] uppercase tracking-wider font-semibold mb-1`}>Current Modules</p>
                                <div className="flex flex-wrap gap-1">
                                  {req.currentModules.map((m, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 text-[10px] font-medium">{m}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {req.availableModules?.length > 0 && (
                              <div>
                                <p className={`${t.textFaint} text-[10px] uppercase tracking-wider font-semibold mb-1`}>Requested Modules</p>
                                <div className="flex flex-wrap gap-1">
                                  {req.availableModules.map((m, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 text-[10px] font-medium">{m}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <p className={`${t.textFaint} text-[10px]`}>ID: {req.id} · Submitted: {new Date(req.createdAt).toLocaleString('en-MY')}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          contacts.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className={`w-12 h-12 ${t.textFaint} mx-auto mb-3 opacity-30`} />
              <p className={`${t.text} font-medium`}>No contact submissions</p>
              <p className={`${t.textFaint} text-sm mt-1`}>Submissions from the public marketing contact form will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map(sub => {
                const isExpanded = expandedId === sub.id;
                return (
                  <div
                    key={sub.id}
                    className={`rounded-xl border transition-all cursor-pointer ${isExpanded ? `${t.s0} ${t.border}` : `${t.s1} ${t.border} ${t.hoverBorder}`}`}
                    onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-full bg-teal-500/15 border border-teal-500/20 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-5 h-5 text-teal-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`${t.text} font-medium text-sm`}>{sub.name}</p>
                          {sub.company && <span className={`${t.textFaint} text-xs`}>({sub.company})</span>}
                        </div>
                        <p className={`${t.textFaint} text-xs truncate mt-0.5`}>{sub.subject || sub.message}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`${t.textFaint} text-xs flex items-center gap-1`}>
                          <Clock className="w-3 h-3" />
                          {formatDate(sub.createdAt)}
                        </span>
                        {isExpanded ? <ChevronUp className={`w-4 h-4 ${t.textFaint}`} /> : <ChevronDown className={`w-4 h-4 ${t.textFaint}`} />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className={`px-4 pb-4 pt-0 border-t ${t.border} mt-0 space-y-3`}>
                        <div className="grid grid-cols-2 gap-3 pt-3">
                          <div>
                            <p className={`${t.textFaint} text-[10px] uppercase tracking-wider font-semibold mb-1`}>From</p>
                            <p className={`${t.textMd} text-sm flex items-center gap-1.5`}><User className="w-3.5 h-3.5" />{sub.name}</p>
                          </div>
                          <div>
                            <p className={`${t.textFaint} text-[10px] uppercase tracking-wider font-semibold mb-1`}>Email</p>
                            <p className={`${t.textMd} text-sm flex items-center gap-1.5`}><Mail className="w-3.5 h-3.5" />{sub.email}</p>
                          </div>
                        </div>
                        {sub.company && (
                          <div>
                            <p className={`${t.textFaint} text-[10px] uppercase tracking-wider font-semibold mb-1`}>Company</p>
                            <p className={`${t.textMd} text-sm flex items-center gap-1.5`}><Building2 className="w-3.5 h-3.5" />{sub.company}</p>
                          </div>
                        )}
                        {sub.subject && (
                          <div>
                            <p className={`${t.textFaint} text-[10px] uppercase tracking-wider font-semibold mb-1`}>Subject</p>
                            <p className={`${t.textMd} text-sm font-medium`}>{sub.subject}</p>
                          </div>
                        )}
                        <div>
                          <p className={`${t.textFaint} text-[10px] uppercase tracking-wider font-semibold mb-1`}>Message</p>
                          <p className={`${t.textSm} text-sm p-3 ${t.s1} rounded-lg border ${t.border} whitespace-pre-wrap`}>{sub.message}</p>
                        </div>
                        <p className={`${t.textFaint} text-[10px]`}>ID: {sub.id} · Received: {new Date(sub.createdAt).toLocaleString('en-MY')}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </Card>
    </div>
  );
}
