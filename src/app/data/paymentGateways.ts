// ─── Malaysian Payment Gateways Master List ────────────────────────────────────
// Each gateway definition includes display info, gateway-specific credential
// fields, and metadata needed by the Settings page and server test route.

export interface GatewayField {
  key: string;
  label: string;
  sandboxLabel: string;
  hint: string;
  sandboxHint: string;
  type?: 'text' | 'password';
  placeholder?: string;
  sandboxPlaceholder?: string;
  optional?: boolean;
}

export interface PaymentGateway {
  id: string;
  name: string;
  tagline: string;
  country: string;
  accentColor: string;
  badgeCls: string;   // Tailwind classes for the badge chip
  methods: string[];
  fields: GatewayField[];
  docsUrl: string;
  sandboxDocsUrl: string;
  webhookPath: string;
  testAuthType: 'bearer' | 'basic' | 'x-api-key' | 'paypal' | 'form' | 'none';
  sandboxKeyField: string; // which field key to use for sandbox test
  notes?: string;
}

export const MALAYSIA_GATEWAYS: PaymentGateway[] = [
  // ── 1. Billplz ─────────────────────────────────────────────────────────────
  {
    id: 'billplz',
    name: 'Billplz',
    tagline: 'Malaysia-first FPX & e-wallet gateway',
    country: 'MY',
    accentColor: '#00C853',
    badgeCls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    methods: ['FPX', 'Credit Card', 'Debit Card', 'E-wallet', 'DuitNow'],
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        sandboxLabel: 'Sandbox API Key',
        hint: 'Found in Billplz Dashboard → Settings → API',
        sandboxHint: 'Log in at billplz-sandbox.com and copy your sandbox API Key',
        type: 'password',
        placeholder: 'xxxx-xxxx-xxxx-xxxx',
        sandboxPlaceholder: 'sandbox-xxxx-xxxx-xxxx',
      },
      {
        key: 'xSignatureKey',
        label: 'X-Signature Key',
        sandboxLabel: 'Sandbox X-Signature Key',
        hint: 'Used to verify inbound webhook events from Billplz',
        sandboxHint: 'Sandbox X-Signature Key from Billplz Sandbox portal',
        type: 'password',
        placeholder: 'sig_xxxxxxxxxxxxxxxx',
      },
    ],
    docsUrl: 'https://www.billplz.com/api',
    sandboxDocsUrl: 'https://www.billplz-sandbox.com',
    webhookPath: '/webhooks/billplz',
    testAuthType: 'basic',
    sandboxKeyField: 'apiKey',
  },

  // ── 2. iPay88 ────────────────────────────────────────────────────────────────
  {
    id: 'ipay88',
    name: 'iPay88',
    tagline: 'Pioneer Malaysian payment gateway since 2000',
    country: 'MY',
    accentColor: '#003DA5',
    badgeCls: 'bg-blue-600/15 text-blue-700 border-blue-600/30',
    methods: ['FPX', 'Credit Card', 'Visa', 'Mastercard', 'GrabPay', 'TnG eWallet', 'Boost'],
    fields: [
      {
        key: 'merchantCode',
        label: 'Merchant Code',
        sandboxLabel: 'Sandbox Merchant Code',
        hint: 'Unique merchant identifier provided by iPay88 on registration',
        sandboxHint: 'Test Merchant Code provided by iPay88 support',
        type: 'text',
        placeholder: 'M00000',
        sandboxPlaceholder: 'M00000T',
      },
      {
        key: 'merchantKey',
        label: 'Merchant Key',
        sandboxLabel: 'Sandbox Merchant Key',
        hint: 'Secret key used for transaction hash generation',
        sandboxHint: 'Sandbox Merchant Key provided by iPay88',
        type: 'password',
        placeholder: '••••••••••••••••',
      },
    ],
    docsUrl: 'https://support.ipay88.com/hc/en-us',
    sandboxDocsUrl: 'https://sandbox.ipay88.com.my',
    webhookPath: '/webhooks/ipay88',
    testAuthType: 'none',
    sandboxKeyField: 'merchantKey',
    notes: 'iPay88 sandbox testing requires prior registration with iPay88 support team.',
  },

  // ── 3. Razer Merchant Services (MOLPay) ────────────────────────────────────
  {
    id: 'razer',
    name: 'Razer Merchant Services',
    tagline: 'Formerly MOLPay — SE Asia payments leader',
    country: 'MY',
    accentColor: '#00D1C1',
    badgeCls: 'bg-teal-500/15 text-teal-600 border-teal-500/30',
    methods: ['FPX', 'Credit Card', 'GrabPay', 'Boost', 'TnG eWallet', 'ShopeePay', 'DuitNow QR'],
    fields: [
      {
        key: 'merchantId',
        label: 'Merchant ID',
        sandboxLabel: 'Sandbox Merchant ID',
        hint: 'Your RMS/MOLPay merchant identifier',
        sandboxHint: 'Sandbox merchant ID from Razer developer portal',
        type: 'text',
        placeholder: 'rms_xxxxxxxx',
      },
      {
        key: 'verifyKey',
        label: 'Verify Key',
        sandboxLabel: 'Sandbox Verify Key',
        hint: 'Used for transaction hash/signature generation',
        sandboxHint: 'Sandbox Verify Key from Razer Merchant Services portal',
        type: 'password',
        placeholder: '••••••••••••••••',
      },
      {
        key: 'secretKey',
        label: 'Secret Key',
        sandboxLabel: 'Sandbox Secret Key',
        hint: 'For IPN (Instant Payment Notification) verification',
        sandboxHint: 'Sandbox Secret Key',
        type: 'password',
        placeholder: '••••••••••••••••',
        optional: true,
      },
    ],
    docsUrl: 'https://github.com/RazerMS/rms-sdk-for-web',
    sandboxDocsUrl: 'https://sandbox.merchant.razer.com',
    webhookPath: '/webhooks/razer',
    testAuthType: 'none',
    sandboxKeyField: 'verifyKey',
  },

  // ── 4. eGHL (GHL) ──────────────────────────────────────────────────────────
  {
    id: 'eghl',
    name: 'eGHL',
    tagline: 'GHL e-payment gateway — Malaysia & SE Asia',
    country: 'MY',
    accentColor: '#E31E24',
    badgeCls: 'bg-red-500/15 text-red-600 border-red-500/30',
    methods: ['FPX', 'Credit Card', 'Visa', 'Mastercard', 'Amex', 'E-wallet', 'DuitNow'],
    fields: [
      {
        key: 'serviceId',
        label: 'Service ID',
        sandboxLabel: 'Sandbox Service ID',
        hint: 'Your eGHL Service/Merchant ID from the eGHL dashboard',
        sandboxHint: 'Staging Service ID from eGHL developer portal',
        type: 'text',
        placeholder: 'SID0000001',
        sandboxPlaceholder: 'STAGINGSID',
      },
      {
        key: 'password',
        label: 'Service Password',
        sandboxLabel: 'Sandbox Service Password',
        hint: 'Transaction password set in eGHL merchant dashboard',
        sandboxHint: 'Staging service password',
        type: 'password',
        placeholder: '••••••••••••••••',
      },
    ],
    docsUrl: 'https://developer.eghl.com',
    sandboxDocsUrl: 'https://staging.eGHL.com',
    webhookPath: '/webhooks/eghl',
    testAuthType: 'none',
    sandboxKeyField: 'password',
    notes: 'eGHL sandbox uses a separate staging environment. Contact GHL for sandbox credentials.',
  },

  // ── 5. toyyibPay ───────────────────────────────────────────────────────────
  {
    id: 'toyyibpay',
    name: 'toyyibPay',
    tagline: 'Malaysian SME-focused payment gateway',
    country: 'MY',
    accentColor: '#FF6B35',
    badgeCls: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
    methods: ['FPX', 'Credit Card', 'Debit Card', 'E-wallet'],
    fields: [
      {
        key: 'userSecretKey',
        label: 'User Secret Key',
        sandboxLabel: 'Sandbox User Secret Key',
        hint: 'From Account → Profile in toyyibPay merchant portal',
        sandboxHint: 'From your toyyibPay sandbox account (dev.toyyibpay.com)',
        type: 'password',
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx',
      },
      {
        key: 'categoryCode',
        label: 'Default Category Code',
        sandboxLabel: 'Sandbox Category Code',
        hint: 'Bill category code — leave blank to create per-invoice',
        sandboxHint: 'Sandbox category code for test bills',
        type: 'text',
        placeholder: 'xxxxxxxx',
        optional: true,
      },
    ],
    docsUrl: 'https://toyyibpay.com/apireference/',
    sandboxDocsUrl: 'https://dev.toyyibpay.com',
    webhookPath: '/webhooks/toyyibpay',
    testAuthType: 'form',
    sandboxKeyField: 'userSecretKey',
  },

  // ── 6. SenangPay ───────────────────────────────────────────────────────────
  {
    id: 'senangpay',
    name: 'SenangPay',
    tagline: 'Exabytes-backed Malaysian payment solution',
    country: 'MY',
    accentColor: '#1565C0',
    badgeCls: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    methods: ['FPX', 'Credit Card', 'GrabPay', 'Boost', 'TnG eWallet', 'ShopeePay'],
    fields: [
      {
        key: 'merchantId',
        label: 'Merchant ID',
        sandboxLabel: 'Sandbox Merchant ID',
        hint: 'Found in your SenangPay merchant dashboard',
        sandboxHint: 'Sandbox Merchant ID from sandbox.senangpay.my',
        type: 'text',
        placeholder: '123456789',
      },
      {
        key: 'secretKey',
        label: 'Secret Key',
        sandboxLabel: 'Sandbox Secret Key',
        hint: 'Used for hash/signature verification on transactions',
        sandboxHint: 'Sandbox secret key for test transactions',
        type: 'password',
        placeholder: '••••••••••••••••',
      },
    ],
    docsUrl: 'https://guide.senangpay.my/integrations/',
    sandboxDocsUrl: 'https://sandbox.senangpay.my',
    webhookPath: '/webhooks/senangpay',
    testAuthType: 'none',
    sandboxKeyField: 'secretKey',
  },

  // ── 7. Curlec ──────────────────────────────────────────────────────────────
  {
    id: 'curlec',
    name: 'Curlec',
    tagline: 'Malaysian recurring & direct-debit platform',
    country: 'MY',
    accentColor: '#6C3FE8',
    badgeCls: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
    methods: ['FPX', 'Direct Debit', 'E-mandate', 'Recurring', 'Standing Instruction'],
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        sandboxLabel: 'Sandbox API Key',
        hint: 'From Curlec Dashboard → Developers → API Keys',
        sandboxHint: 'Sandbox API key from Curlec developer dashboard',
        type: 'password',
        placeholder: 'curlec_live_xxxxxxxxxxxxxxxx',
        sandboxPlaceholder: 'curlec_test_xxxxxxxxxxxxxxxx',
      },
      {
        key: 'apiSecret',
        label: 'API Secret',
        sandboxLabel: 'Sandbox API Secret',
        hint: 'Secret key for API request authentication',
        sandboxHint: 'Sandbox API secret',
        type: 'password',
        placeholder: '••••••••••••••••••••••••',
      },
    ],
    docsUrl: 'https://docs.curlec.com',
    sandboxDocsUrl: 'https://docs.curlec.com/sandbox',
    webhookPath: '/webhooks/curlec',
    testAuthType: 'bearer',
    sandboxKeyField: 'apiKey',
    notes: 'Best suited for SaaS subscription billing with automated mandate management.',
  },

  // ── 8. HitPay ──────────────────────────────────────────────────────────────
  {
    id: 'hitpay',
    name: 'HitPay',
    tagline: 'Singapore / Malaysia SME payment platform',
    country: 'MY / SG',
    accentColor: '#1A73E8',
    badgeCls: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
    methods: ['FPX', 'PayNow', 'Credit Card', 'GrabPay', 'Boost', 'DuitNow QR', 'Atome'],
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        sandboxLabel: 'Sandbox API Key',
        hint: 'From HitPay Dashboard → Payment Gateway → API Keys',
        sandboxHint: 'Sandbox API Key from HitPay sandbox dashboard',
        type: 'password',
        placeholder: 'hitpay_live_xxxxxxxxxxxxxxxx',
        sandboxPlaceholder: 'hitpay_test_xxxxxxxxxxxxxxxx',
      },
      {
        key: 'salt',
        label: 'Salt / HMAC Key',
        sandboxLabel: 'Sandbox Salt / HMAC Key',
        hint: 'Used for webhook HMAC signature verification',
        sandboxHint: 'Sandbox HMAC key',
        type: 'password',
        placeholder: '••••••••••••••••',
      },
    ],
    docsUrl: 'https://docs.hitpayapp.com',
    sandboxDocsUrl: 'https://docs.hitpayapp.com/docs/sandbox',
    webhookPath: '/webhooks/hitpay',
    testAuthType: 'x-api-key',
    sandboxKeyField: 'apiKey',
  },

  // ── 9. 2C2P ────────────────────────────────────────────────────────────────
  {
    id: '2c2p',
    name: '2C2P',
    tagline: 'Enterprise payment gateway across SE Asia',
    country: 'MY / SG / TH',
    accentColor: '#CC0000',
    badgeCls: 'bg-red-600/15 text-red-700 border-red-600/30',
    methods: ['FPX', 'Credit Card', 'E-wallet', 'QR Pay', 'Instalment', 'BNPL'],
    fields: [
      {
        key: 'merchantId',
        label: 'Merchant ID',
        sandboxLabel: 'Sandbox Merchant ID',
        hint: 'Your 2C2P Merchant ID from the portal',
        sandboxHint: 'Sandbox Merchant ID (provided by 2C2P team)',
        type: 'text',
        placeholder: '764764000000059',
        sandboxPlaceholder: '764764000000001',
      },
      {
        key: 'secretKey',
        label: 'Secret Key',
        sandboxLabel: 'Sandbox Secret Key',
        hint: 'For JWT token generation and request signing',
        sandboxHint: 'Sandbox secret key — downloadable from sandbox portal',
        type: 'password',
        placeholder: '••••••••••••••••',
      },
    ],
    docsUrl: 'https://developer.2c2p.com',
    sandboxDocsUrl: 'https://sandbox-pgw.2c2p.com',
    webhookPath: '/webhooks/2c2p',
    testAuthType: 'none',
    sandboxKeyField: 'secretKey',
  },

  // ── 10. Stripe ─────────────────────────────────────────────────────────────
  {
    id: 'stripe',
    name: 'Stripe',
    tagline: 'Global gateway with full MYR & FPX support',
    country: 'Global (MY)',
    accentColor: '#635BFF',
    badgeCls: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
    methods: ['Credit Card', 'FPX', 'GrabPay', 'Visa', 'Mastercard', 'Amex', 'BNPL'],
    fields: [
      {
        key: 'secretKey',
        label: 'Secret Key (Live)',
        sandboxLabel: 'Secret Key (Test)',
        hint: 'Starts with sk_live_ — from Stripe Dashboard → Developers → API Keys',
        sandboxHint: 'Starts with sk_test_ — from Stripe Dashboard → Developers → API Keys',
        type: 'password',
        placeholder: 'sk_live_••••••••••••••••••••',
        sandboxPlaceholder: 'sk_test_••••••••••••••••••••',
      },
      {
        key: 'webhookSecret',
        label: 'Webhook Signing Secret',
        sandboxLabel: 'Sandbox Webhook Signing Secret',
        hint: 'Starts with whsec_ — from Stripe Dashboard → Webhooks',
        sandboxHint: 'whsec_ key from Stripe CLI or sandbox webhook endpoint',
        type: 'password',
        placeholder: 'whsec_••••••••••••••••••••',
      },
    ],
    docsUrl: 'https://stripe.com/docs',
    sandboxDocsUrl: 'https://stripe.com/docs/testing',
    webhookPath: '/webhooks/stripe',
    testAuthType: 'bearer',
    sandboxKeyField: 'secretKey',
    notes: 'Use Stripe test cards (e.g. 4242 4242 4242 4242) to simulate sandbox transactions.',
  },

  // ── 11. PayPal ─────────────────────────────────────────────────────────────
  {
    id: 'paypal',
    name: 'PayPal',
    tagline: 'Global digital wallet & international payments',
    country: 'Global (MY)',
    accentColor: '#003087',
    badgeCls: 'bg-blue-800/15 text-blue-800 border-blue-800/30',
    methods: ['PayPal Wallet', 'Credit Card', 'Debit Card', 'Pay Later'],
    fields: [
      {
        key: 'clientId',
        label: 'Client ID',
        sandboxLabel: 'Sandbox Client ID',
        hint: 'From PayPal Developer Dashboard → My Apps & Credentials',
        sandboxHint: 'Sandbox Client ID from developer.paypal.com',
        type: 'text',
        placeholder: 'AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxB',
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        sandboxLabel: 'Sandbox Client Secret',
        hint: 'OAuth 2.0 client secret for API authentication',
        sandboxHint: 'Sandbox client secret — visible in developer.paypal.com',
        type: 'password',
        placeholder: '••••••••••••••••',
      },
    ],
    docsUrl: 'https://developer.paypal.com/docs',
    sandboxDocsUrl: 'https://developer.paypal.com/tools/sandbox/',
    webhookPath: '/webhooks/paypal',
    testAuthType: 'paypal',
    sandboxKeyField: 'clientId',
  },
];

// Lookup helper
export const getGatewayById = (id: string) =>
  MALAYSIA_GATEWAYS.find(g => g.id === id) ?? null;
