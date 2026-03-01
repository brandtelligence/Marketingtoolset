/**
 * ConnectAccountDrawer
 * Side-panel for adding or editing a social channel connection.
 * Supports: Telegram · WhatsApp Business · Facebook Page ·
 *           Instagram Graph API · Twitter/X (OAuth 1.0a) · LinkedIn
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, Loader2, Check, AlertCircle, Eye, EyeOff,
  ExternalLink, Info, HelpCircle,
} from 'lucide-react';
import {
  SiTelegram, SiWhatsapp, SiFacebook,
  SiInstagram, SiX, SiLinkedin,
} from 'react-icons/si';
import { toast } from 'sonner';
import { useAuth } from '../AuthContext';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHeaders';
import { useDashboardTheme } from '../saas/DashboardThemeContext';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SocialPlatform = 'telegram' | 'whatsapp' | 'facebook' | 'instagram' | 'twitter' | 'linkedin';

export interface SocialConnection {
  id:              string;
  platform:        SocialPlatform;
  displayName:     string;
  credentials:     Record<string, string>;
  connectedAt:     string;
  connectedBy:     string;
  lastTestedAt?:   string;
  lastTestStatus?: 'ok' | 'error';
  lastTestError?:  string;
}

// ─── Platform metadata ────────────────────────────────────────────────────────

interface CredField {
  key:         string;
  label:       string;
  placeholder: string;
  hint:        string;
  secret?:     boolean;
  mono?:       boolean;
}

interface PlatformDef {
  id:      SocialPlatform;
  label:   string;
  color:   string;
  bg:      string;
  Icon:    React.ComponentType<{ className?: string }>;
  fields:  CredField[];
  guide:   string; // URL to setup guide
  gist:    string; // one-line summary
}

const PLATFORMS: PlatformDef[] = [
  {
    id: 'telegram', label: 'Telegram', color: 'text-sky-400', bg: 'bg-sky-500/15 border-sky-400/25',
    Icon: SiTelegram, guide: 'https://core.telegram.org/bots#how-do-i-create-a-bot',
    gist: 'Post text, images and videos to any Telegram channel or group via a bot.',
    fields: [
      { key: 'botToken',  label: 'Bot Token',  placeholder: '7123456789:AAFxxxx…', secret: true, mono: true,
        hint: 'Get this from @BotFather on Telegram when you create a new bot.' },
      { key: 'chatId',    label: 'Chat ID / Channel Username', placeholder: '@mychannel  or  -1001234567890', mono: true,
        hint: 'For public channels use @handle. For private groups/channels use the numeric ID (add your bot as admin first).' },
    ],
  },
  {
    id: 'whatsapp', label: 'WhatsApp Business', color: 'text-green-400', bg: 'bg-green-500/15 border-green-400/25',
    Icon: SiWhatsapp, guide: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
    gist: 'Send messages via WhatsApp Business Cloud API to any phone number.',
    fields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: '123456789012345', mono: true,
        hint: 'Found in Meta Business Manager → WhatsApp → Getting Started under your phone number.' },
      { key: 'accessToken', label: 'Permanent Access Token', placeholder: 'EAAxxxxx…', secret: true, mono: true,
        hint: 'Create a System User in Meta Business Manager and generate a permanent token with whatsapp_business_messaging permission.' },
      { key: 'recipientPhone', label: 'Recipient Phone Number', placeholder: '+601xxxxxxxx', mono: true,
        hint: 'The WhatsApp number to publish to (with country code, no spaces). For broadcast, use a WA group admin number.' },
    ],
  },
  {
    id: 'facebook', label: 'Facebook Page', color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-400/25',
    Icon: SiFacebook, guide: 'https://developers.facebook.com/docs/pages-api/getting-started',
    gist: 'Publish text posts, photos, and videos directly to a Facebook Page.',
    fields: [
      { key: 'pageId',          label: 'Page ID',           placeholder: '123456789012345', mono: true,
        hint: 'Go to your Facebook Page → About → Page Transparency → Page ID.' },
      { key: 'pageAccessToken', label: 'Page Access Token', placeholder: 'EAAxxxxx…', secret: true, mono: true,
        hint: 'Use the Graph API Explorer at developers.facebook.com to generate a Page Access Token with pages_manage_posts permission.' },
    ],
  },
  {
    id: 'instagram', label: 'Instagram', color: 'text-pink-400', bg: 'bg-pink-500/15 border-pink-400/25',
    Icon: SiInstagram, guide: 'https://developers.facebook.com/docs/instagram-api/getting-started',
    gist: 'Publish images and Reels to an Instagram Business/Creator account.',
    fields: [
      { key: 'igUserId',     label: 'Instagram User ID', placeholder: '17841400455970638', mono: true,
        hint: 'Call GET /me?fields=id,name with your token. The "id" field is your IG User ID (not page ID).' },
      { key: 'accessToken',  label: 'Access Token',      placeholder: 'EAAxxxxx…', secret: true, mono: true,
        hint: 'Generate a long-lived User Access Token from the Graph API Explorer with instagram_basic, instagram_content_publish, and pages_read_engagement permissions.' },
    ],
  },
  {
    id: 'twitter', label: 'X (Twitter)', color: 'text-white', bg: 'bg-white/8 border-white/15',
    Icon: SiX, guide: 'https://developer.twitter.com/en/portal/projects-and-apps',
    gist: 'Tweet text content to your X (Twitter) account using OAuth 1.0a.',
    fields: [
      { key: 'apiKey',            label: 'API Key (Consumer Key)',          placeholder: 'xvz1evFS4wEEPTGEFPHBog', secret: true, mono: true,
        hint: 'Found in your X App settings under "Keys and Tokens" → Consumer Keys.' },
      { key: 'apiSecret',         label: 'API Secret (Consumer Secret)',     placeholder: 'L8qq9PZyRg6ieKGEKhZolGC0vJWLw8iEJ88DRdyOg…', secret: true, mono: true,
        hint: 'Found alongside the API Key. Keep this secret.' },
      { key: 'accessToken',       label: 'Access Token',                     placeholder: '756201191646691328-xxxxx', secret: true, mono: true,
        hint: 'Your personal Access Token generated in the X Developer Portal. Must have Write permissions.' },
      { key: 'accessTokenSecret', label: 'Access Token Secret',              placeholder: 'x7Y0qj…', secret: true, mono: true,
        hint: 'Generated alongside the Access Token.' },
    ],
  },
  {
    id: 'linkedin', label: 'LinkedIn', color: 'text-blue-300', bg: 'bg-blue-700/15 border-blue-400/25',
    Icon: SiLinkedin, guide: 'https://learn.microsoft.com/en-us/linkedin/marketing/getting-started',
    gist: 'Share text posts to a LinkedIn personal profile or company page.',
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'AQX…', secret: true, mono: true,
        hint: 'Generate via LinkedIn OAuth 2.0. Requires the w_member_social permission scope.' },
      { key: 'authorUrn',   label: 'Author URN',   placeholder: 'urn:li:person:XXXXXXXX  or  urn:li:organization:XXXXXXXX', mono: true,
        hint: 'For a personal profile: urn:li:person:{YOUR_PERSON_ID}. For a company page: urn:li:organization:{ORG_ID}.' },
    ],
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConnectAccountDrawerProps {
  tenantId:           string;
  existingConnection?: SocialConnection;  // editing mode
  preselectedPlatform?: SocialPlatform;   // open directly on a platform
  onSaved:            (conn: SocialConnection) => void;
  onClose:            () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConnectAccountDrawer({
  tenantId, existingConnection, preselectedPlatform, onSaved, onClose,
}: ConnectAccountDrawerProps) {
  const { user } = useAuth();
  const { isDark } = useDashboardTheme();

  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(
    existingConnection?.platform ?? preselectedPlatform ?? null,
  );
  const [displayName, setDisplayName] = useState(existingConnection?.displayName ?? '');
  const [creds,       setCreds]       = useState<Record<string, string>>(existingConnection?.credentials ?? {});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving,      setSaving]      = useState(false);
  const [testing,     setTesting]     = useState(false);
  const [testResult,  setTestResult]  = useState<{ ok: boolean; info?: string; error?: string } | null>(null);

  const [oauthLoading, setOauthLoading] = useState(false);
  const [connectMode,  setConnectMode]  = useState<'manual' | 'oauth'>('manual');

  const platform = PLATFORMS.find(p => p.id === selectedPlatform);
  const supportsOAuth = selectedPlatform === 'facebook' || selectedPlatform === 'instagram' || selectedPlatform === 'linkedin';

  // Reset creds when platform changes
  useEffect(() => {
    if (!existingConnection) {
      setCreds({});
      setTestResult(null);
      setConnectMode('manual');
    }
  }, [selectedPlatform]);

  // Listen for OAuth popup result
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-result') {
        setOauthLoading(false);
        if (event.data.success) {
          toast.success('OAuth connected!', { description: event.data.message });
          // Refresh connections — the OAuth callback already saved the connection server-side
          onSaved({ id: 'oauth-refresh', platform: selectedPlatform!, displayName: event.data.message, credentials: {}, connectedAt: new Date().toISOString(), connectedBy: '' });
        } else {
          toast.error('OAuth failed', { description: event.data.message });
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [selectedPlatform, onSaved]);

  const handleOAuthConnect = async () => {
    if (!selectedPlatform) return;
    setOauthLoading(true);
    try {
      const oauthHeaders = await getAuthHeaders(true);
      const res = await fetch(`${API_BASE}/social/oauth/start`, {
        method: 'POST',
        headers: oauthHeaders,
        body: JSON.stringify({
          tenantId,
          platform: selectedPlatform,
          connectionId: existingConnection?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);

      // Open OAuth popup
      const popup = window.open(data.authUrl, 'oauth-popup', 'width=600,height=700,scrollbars=yes');
      if (!popup) {
        toast.error('Popup blocked — please allow popups for this site');
        setOauthLoading(false);
      }
    } catch (err: any) {
      toast.error(`OAuth start failed: ${err.message}`);
      setOauthLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPlatform) { toast.error('Select a platform first'); return; }
    if (!displayName.trim()) { toast.error('Give this connection a display name'); return; }

    setSaving(true);
    try {
      const connId = existingConnection?.id ?? crypto.randomUUID();
      const conn: SocialConnection = {
        id:          connId,
        platform:    selectedPlatform,
        displayName: displayName.trim(),
        credentials: creds,
        connectedAt: existingConnection?.connectedAt ?? new Date().toISOString(),
        connectedBy: existingConnection?.connectedBy ?? `${user?.firstName} ${user?.lastName}`.trim(),
        lastTestedAt:   testResult ? new Date().toISOString() : existingConnection?.lastTestedAt,
        lastTestStatus: testResult ? (testResult.ok ? 'ok' : 'error') : existingConnection?.lastTestStatus,
        lastTestError:  testResult?.error ?? existingConnection?.lastTestError,
      };

      const saveHeaders = await getAuthHeaders(true);
      const res  = await fetch(`${API_BASE}/social/connections`, {
        method:  'POST',
        headers: saveHeaders,
        body:    JSON.stringify({ tenantId, connection: conn }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);

      toast.success(`${platform?.label} connection saved`, { description: displayName });
      onSaved(conn);
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!existingConnection?.id && !displayName.trim()) {
      toast.error('Save the connection first before testing');
      return;
    }
    // Build a temp connection for testing
    const tempConn: SocialConnection = {
      id:          existingConnection?.id ?? 'temp-test',
      platform:    selectedPlatform!,
      displayName: displayName,
      credentials: creds,
      connectedAt: new Date().toISOString(),
      connectedBy: '',
    };

    setTesting(true);
    setTestResult(null);
    try {
      // First save so the server can look it up
      const testHeaders = await getAuthHeaders(true);
      await fetch(`${API_BASE}/social/connections`, {
        method:  'POST',
        headers: testHeaders,
        body:    JSON.stringify({ tenantId, connection: tempConn }),
      });

      const res  = await fetch(`${API_BASE}/social/connections/test`, {
        method:  'POST',
        headers: testHeaders,
        body:    JSON.stringify({ tenantId, connectionId: tempConn.id }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.ok) toast.success(`✅ Connection verified${data.info ? ` — ${data.info}` : ''}`);
      else         toast.error(`Test failed: ${data.error}`);
    } catch (err: any) {
      setTestResult({ ok: false, error: err.message });
      toast.error(`Test error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9100] flex justify-end"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} />

        {/* Drawer */}
        <motion.div
          className="relative w-full max-w-lg h-full flex flex-col overflow-hidden shadow-2xl"
          style={{ background: isDark ? 'linear-gradient(160deg, rgba(15,12,30,0.99) 0%, rgba(10,8,22,0.99) 100%)' : 'linear-gradient(160deg, rgba(255,255,255,0.99) 0%, rgba(248,249,252,0.99) 100%)', borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.1)'}` }}
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 shrink-0">
            <div>
              <h2 className="text-white font-bold text-base">
                {existingConnection ? 'Edit Connection' : 'Connect a Social Channel'}
              </h2>
              <p className="text-white/35 text-xs mt-0.5">
                {existingConnection ? `Editing "${existingConnection.displayName}"` : 'Add credentials to enable direct publishing'}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/50 hover:text-white transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* ── Platform selector ── */}
            {!existingConnection && (
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-3">Choose Platform</p>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS.map(p => {
                    const active = selectedPlatform === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPlatform(p.id)}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-center transition-all
                          ${active ? p.bg + ' ' + p.color : 'bg-white/4 border-white/8 text-white/40 hover:bg-white/8 hover:text-white/70'}`}
                      >
                        <p.Icon className="w-5 h-5" />
                        <span className="text-[10px] font-semibold leading-tight">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {platform && (
              <>
                {/* Platform gist + guide link */}
                <div className={`flex items-start gap-3 p-3 rounded-xl border ${platform.bg}`}>
                  <platform.Icon className={`w-4 h-4 ${platform.color} shrink-0 mt-0.5`} />
                  <div className="flex-1">
                    <p className="text-white/60 text-xs leading-relaxed">{platform.gist}</p>
                    <a href={platform.guide} target="_blank" rel="noreferrer"
                      className={`inline-flex items-center gap-1 mt-1 text-[10px] ${platform.color} hover:underline`}>
                      Setup guide <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>

                {/* OAuth vs Manual toggle (for supported platforms) */}
                {supportsOAuth && !existingConnection && (
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-2">Connection Method</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConnectMode('oauth')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all
                          ${connectMode === 'oauth'
                            ? 'bg-gradient-to-r from-teal-500/20 to-teal-600/20 border-teal-400/30 text-teal-300'
                            : 'bg-white/4 border-white/8 text-white/40 hover:bg-white/8'}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Connect via OAuth
                      </button>
                      <button
                        onClick={() => setConnectMode('manual')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all
                          ${connectMode === 'manual'
                            ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-400/30 text-purple-300'
                            : 'bg-white/4 border-white/8 text-white/40 hover:bg-white/8'}`}
                      >
                        <Save className="w-3.5 h-3.5" />
                        Manual Tokens
                      </button>
                    </div>
                  </div>
                )}

                {/* OAuth flow */}
                {connectMode === 'oauth' && supportsOAuth && !existingConnection ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-teal-500/8 border border-teal-400/15 rounded-xl">
                      <ExternalLink className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-teal-300 text-xs font-semibold mb-1">One-click OAuth Connection</p>
                        <p className="text-white/40 text-[10px] leading-relaxed">
                          Click the button below to authorize {platform.label} via OAuth. A popup will open for you
                          to log in and grant permissions. Tokens are stored securely server-side and auto-renewed.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleOAuthConnect}
                      disabled={oauthLoading}
                      className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm transition-all
                        ${platform.bg} border ${platform.color} hover:brightness-125 disabled:opacity-40`}
                    >
                      {oauthLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <platform.Icon className="w-4 h-4" />
                      )}
                      {oauthLoading ? 'Waiting for authorization…' : `Connect ${platform.label} via OAuth`}
                    </button>

                    <div className="flex items-start gap-2 p-3 bg-amber-500/8 border border-amber-400/15 rounded-xl">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-amber-300/60 text-[10px] leading-relaxed">
                        OAuth requires your server to have <code className="text-amber-300/80 font-mono">FACEBOOK_APP_ID</code> /
                        <code className="text-amber-300/80 font-mono"> FACEBOOK_APP_SECRET</code> (for Meta platforms)
                        or <code className="text-amber-300/80 font-mono">LINKEDIN_CLIENT_ID</code> /
                        <code className="text-amber-300/80 font-mono"> LINKEDIN_CLIENT_SECRET</code> configured as environment variables.
                        If OAuth fails, switch to Manual Tokens.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Display name */}
                    <div>
                      <label className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-1.5 block">
                        Connection Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder={`e.g. ${platform.label} — Main Brand`}
                        className="w-full bg-white/5 border border-white/12 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-white/25
                          focus:outline-none focus:border-teal-400/40 transition-all"
                      />
                      <p className="text-white/20 text-[10px] mt-1">A friendly label to identify this connection</p>
                    </div>

                    {/* Credential fields */}
                    <div className="space-y-4">
                      <p className="text-white/40 text-xs uppercase tracking-wider font-semibold">Credentials</p>
                      {platform.fields.map(field => (
                        <div key={field.key}>
                          <label className="text-white/50 text-xs font-medium mb-1.5 block">{field.label}</label>
                          <div className="relative">
                            <input
                              type={field.secret && !showSecrets[field.key] ? 'password' : 'text'}
                              value={creds[field.key] ?? ''}
                              onChange={e => setCreds(prev => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              className={`w-full bg-white/5 border border-white/12 rounded-xl px-3.5 py-2.5 text-white text-sm
                                placeholder-white/20 focus:outline-none focus:border-teal-400/40 transition-all
                                ${field.mono ? 'font-mono text-xs' : ''} ${field.secret ? 'pr-10' : ''}`}
                            />
                            {field.secret && (
                              <button
                                type="button"
                                onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-all"
                              >
                                {showSecrets[field.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                          <div className="flex items-start gap-1.5 mt-1.5">
                            <HelpCircle className="w-3 h-3 text-white/20 shrink-0 mt-0.5" />
                            <p className="text-white/25 text-[10px] leading-relaxed">{field.hint}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Test result */}
                    {testResult && (
                      <div className={`flex items-start gap-2.5 p-3 rounded-xl border ${testResult.ok
                        ? 'bg-green-500/10 border-green-400/20'
                        : 'bg-red-500/10 border-red-400/20'}`}>
                        {testResult.ok
                          ? <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                          : <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                        <div>
                          <p className={`text-xs font-semibold ${testResult.ok ? 'text-green-300' : 'text-red-300'}`}>
                            {testResult.ok ? `✅ Connected${testResult.info ? ` as ${testResult.info}` : ''}` : '❌ Connection failed'}
                          </p>
                          {testResult.error && <p className="text-white/40 text-[10px] mt-0.5">{testResult.error}</p>}
                        </div>
                      </div>
                    )}

                    {/* Security note */}
                    <div className="flex items-start gap-2 p-3 bg-amber-500/8 border border-amber-400/15 rounded-xl">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-amber-300/60 text-[10px] leading-relaxed">
                        Credentials are stored encrypted in your tenant's secure KV store.
                        They are never returned to the browser after saving — only masked placeholders are shown.
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer actions (hidden in OAuth mode — connection saved server-side) */}
          {platform && !(connectMode === 'oauth' && supportsOAuth && !existingConnection) && (
            <div className="px-6 py-4 border-t border-white/8 flex items-center gap-3 shrink-0">
              <button
                onClick={handleTest}
                disabled={testing || saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10
                  text-white/60 hover:text-white text-sm font-semibold transition-all disabled:opacity-40"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Test
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !displayName.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all
                  bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500
                  text-white shadow-lg shadow-teal-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Connection
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
