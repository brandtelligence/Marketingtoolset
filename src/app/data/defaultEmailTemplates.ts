export type EmailTemplateTag = 'Onboarding' | 'Billing' | 'Dunning' | 'Security' | 'System';

export const TEMPLATE_TAGS: EmailTemplateTag[] = ['Onboarding', 'Billing', 'Dunning', 'Security', 'System'];

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  tag: EmailTemplateTag;
  subject: string;
  variables: EmailTemplateVar[];
  html: string;
}

// ─── Shared base wrapper ────────────────────────────────────────────────────────
const wrap = (body: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#7c3aed 0%,#0d9488 100%);padding:36px 40px 28px;text-align:center;">
  <p style="margin:0;font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Brandtelligence</p>
  <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.75);">AI-Powered Social Media Platform</p>
</td></tr>
<tr><td style="padding:40px;">
${body}
</td></tr>
<tr><td style="background:#f8f8f8;border-top:1px solid #eeeeee;padding:20px 40px;text-align:center;">
  <p style="margin:0;font-size:11px;color:#aaaaaa;">Brandtelligence Sdn Bhd &nbsp;·&nbsp; Kuala Lumpur, Malaysia</p>
  <p style="margin:4px 0 0;font-size:11px;color:#aaaaaa;">© 2026 Brandtelligence. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

// ─── Reusable snippets ──────────────────────────────────────────────────────────
const btn = (url: string, label: string, color = '#7c3aed') =>
  `<table cellpadding="0" cellspacing="0" style="margin:28px auto 0;"><tr><td style="background:${color};border-radius:10px;"><a href="${url}" style="display:block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;">${label}</a></td></tr></table>`;

const infoRow = (label: string, value: string) =>
  `<tr><td style="padding:8px 14px;font-size:12px;color:#888;width:130px;">${label}</td><td style="padding:8px 14px;font-size:13px;color:#333;font-weight:600;">${value}</td></tr>`;

const infoTable = (...rows: string[]) =>
  `<table cellpadding="0" cellspacing="0" style="width:100%;background:#f8f8fb;border-radius:10px;border:1px solid #eee;margin:24px 0;">${rows.join('')}</table>`;

const h1 = (text: string) =>
  `<h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1a1a2e;">${text}</h1>`;

const p = (text: string, extra = '') =>
  `<p style="margin:12px 0;font-size:15px;line-height:1.7;color:#444;${extra}">${text}</p>`;

const highlight = (text: string, color = '#7c3aed') =>
  `<span style="color:${color};font-weight:700;">${text}</span>`;

const warningBox = (text: string) =>
  `<div style="background:#fff5f5;border:1px solid #fca5a5;border-radius:10px;padding:16px 20px;margin:20px 0;">
    <p style="margin:0;font-size:13px;color:#dc2626;font-weight:600;">⚠️ ${text}</p>
  </div>`;

const successBox = (text: string) =>
  `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px 20px;margin:20px 0;">
    <p style="margin:0;font-size:13px;color:#16a34a;font-weight:600;">✅ ${text}</p>
  </div>`;

// ─── Default templates ──────────────────────────────────────────────────────────
export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [

  // 1. Request Received (to Super Admin)
  {
    id: 'request_received',
    name: 'Request Received',
    description: 'Sent to Super Admin when a new access request is submitted via the public form.',
    tag: 'Onboarding',
    subject: 'New Access Request: {{companyName}} — Action Required',
    variables: [
      { key: 'companyName',  description: 'Name of the company that submitted the request' },
      { key: 'contactName',  description: 'Name of the primary contact person' },
      { key: 'contactEmail', description: 'Email address of the contact' },
      { key: 'country',      description: 'Country of the company' },
      { key: 'size',         description: 'Team size (e.g. 1–10, 11–50)' },
      { key: 'submittedAt',  description: 'Date and time the request was submitted' },
      { key: 'adminPanelUrl',description: 'Direct URL to the Requests page in admin panel' },
    ],
    html: wrap(`
${h1('New Access Request Received')}
${p(`A new company has requested access to the Brandtelligence Platform. Please review the request and approve or reject it from the admin panel.`)}
${infoTable(
  infoRow('Company', '{{companyName}}'),
  infoRow('Contact', '{{contactName}}'),
  infoRow('Email', '{{contactEmail}}'),
  infoRow('Country', '{{country}}'),
  infoRow('Team Size', '{{size}}'),
  infoRow('Submitted', '{{submittedAt}}'),
)}
${btn('{{adminPanelUrl}}', 'Review Request →')}
${p('You are receiving this email because you are a Super Admin of the Brandtelligence Platform.', 'font-size:12px;color:#888;margin-top:32px;')}
`),
  },

  // 2. Tenant Invite (to new Tenant Admin)
  {
    id: 'tenant_invite',
    name: 'Tenant Invite',
    description: 'One-time invite link emailed to a new Tenant Admin after their request is approved.',
    tag: 'Onboarding',
    subject: "You're Invited to Brandtelligence — {{companyName}}",
    variables: [
      { key: 'adminName',    description: 'Full name of the invited Tenant Admin' },
      { key: 'companyName',  description: 'Name of the company/tenant' },
      { key: 'inviteUrl',    description: 'One-time invite link (expires after TTL)' },
      { key: 'expiresAt',    description: 'Expiry timestamp of the invite link' },
      { key: 'plan',         description: 'Subscription plan name (Starter, Growth, Enterprise)' },
    ],
    html: wrap(`
${h1("Welcome to Brandtelligence, {{adminName}}!")}
${p(`Your company ${highlight('{{companyName}}')} has been approved on the Brandtelligence Platform. You have been assigned the <strong>{{plan}}</strong> plan.`)}
${p('Click the button below to set up your account. This link is valid for <strong>24 hours</strong> and can only be used once.')}
${btn('{{inviteUrl}}', 'Accept Invite & Set Password →')}
${warningBox('This link expires on {{expiresAt}}. If it has expired, contact support to request a new invite.')}
${p('Once your account is active, you can invite your team members, manage your modules, and view your invoices from the Tenant Admin portal.', 'font-size:13px;color:#666;')}
`),
  },

  // 3. Invoice Issued
  {
    id: 'invoice_issued',
    name: 'Invoice Issued',
    description: 'Monthly invoice notification sent to Tenant Admin when a new invoice is generated.',
    tag: 'Billing',
    subject: 'Invoice {{invoiceNumber}} — RM {{amount}} due {{dueDate}}',
    variables: [
      { key: 'tenantName',     description: 'Name of the tenant company' },
      { key: 'adminName',      description: 'Name of the Tenant Admin' },
      { key: 'invoiceNumber',  description: 'Invoice reference number (e.g. INV-2026-001)' },
      { key: 'amount',         description: 'Total invoice amount (e.g. 1,200.00)' },
      { key: 'issueDate',      description: 'Date the invoice was issued' },
      { key: 'dueDate',        description: 'Payment due date' },
      { key: 'invoiceUrl',     description: 'Direct link to view/download the invoice' },
    ],
    html: wrap(`
${h1('Your Invoice is Ready')}
${p(`Hi {{adminName}}, your monthly invoice for ${highlight('{{tenantName}}')} is ready.`)}
${infoTable(
  infoRow('Invoice No.', '{{invoiceNumber}}'),
  infoRow('Issue Date', '{{issueDate}}'),
  infoRow('Due Date', '{{dueDate}}'),
  infoRow('Amount Due', 'RM {{amount}}'),
)}
${p('Please ensure payment is made by the due date to avoid any service interruptions.')}
${btn('{{invoiceUrl}}', 'View & Pay Invoice →', '#0d9488')}
${p('Accepted payment methods: FPX, credit card, or bank transfer. If you have any questions about this invoice, please contact our support team.', 'font-size:13px;color:#666;')}
`),
  },

  // 4. Invoice Reminder 7 days
  {
    id: 'invoice_reminder_7d',
    name: 'Invoice Reminder (7 Days)',
    description: 'Friendly payment reminder sent 7 days before the invoice due date.',
    tag: 'Dunning',
    subject: 'Reminder: Invoice {{invoiceNumber}} is due in 7 days',
    variables: [
      { key: 'tenantName',    description: 'Name of the tenant company' },
      { key: 'adminName',     description: 'Name of the Tenant Admin' },
      { key: 'invoiceNumber', description: 'Invoice reference number' },
      { key: 'amount',        description: 'Total invoice amount' },
      { key: 'dueDate',       description: 'Payment due date' },
      { key: 'invoiceUrl',    description: 'Direct link to the invoice' },
    ],
    html: wrap(`
${h1('Payment Reminder')}
${p(`Hi {{adminName}}, this is a friendly reminder that invoice ${highlight('{{invoiceNumber}}')} for ${highlight('{{tenantName}}')} is due in <strong>7 days</strong>.`)}
${infoTable(
  infoRow('Invoice No.', '{{invoiceNumber}}'),
  infoRow('Amount Due', 'RM {{amount}}'),
  infoRow('Due Date', '{{dueDate}}'),
)}
${p('If you have already made payment, please disregard this reminder.')}
${btn('{{invoiceUrl}}', 'Pay Now →', '#f59e0b')}
${p('Need help? Reply to this email or contact our support team.', 'font-size:13px;color:#888;margin-top:24px;')}
`),
  },

  // 5. Overdue Notice
  {
    id: 'overdue_notice',
    name: 'Overdue Notice',
    description: 'Sent when an invoice is past due. Includes a service suspension warning.',
    tag: 'Dunning',
    subject: 'URGENT: Invoice {{invoiceNumber}} is Overdue — Action Required',
    variables: [
      { key: 'tenantName',      description: 'Name of the tenant company' },
      { key: 'adminName',       description: 'Name of the Tenant Admin' },
      { key: 'invoiceNumber',   description: 'Invoice reference number' },
      { key: 'amount',          description: 'Total overdue amount' },
      { key: 'daysOverdue',     description: 'Number of days past due date' },
      { key: 'suspensionDate',  description: 'Date account will be suspended if unpaid' },
      { key: 'invoiceUrl',      description: 'Direct link to the invoice' },
    ],
    html: wrap(`
${h1('⚠️ Invoice Overdue')}
${p(`Hi {{adminName}}, invoice ${highlight('{{invoiceNumber}}', '#dc2626')} for ${highlight('{{tenantName}}')} is now <strong>{{daysOverdue}} day(s) overdue</strong>.`)}
${warningBox('Your account will be suspended on {{suspensionDate}} if this invoice remains unpaid.')}
${infoTable(
  infoRow('Invoice No.', '{{invoiceNumber}}'),
  infoRow('Overdue Amount', 'RM {{amount}}'),
  infoRow('Days Overdue', '{{daysOverdue}} days'),
  infoRow('Suspension Date', '{{suspensionDate}}'),
)}
${p('Please settle this invoice immediately to avoid suspension of your Brandtelligence account and loss of access for your team.')}
${btn('{{invoiceUrl}}', 'Pay Immediately →', '#dc2626')}
${p('If you believe this is an error or need to discuss a payment arrangement, contact us immediately.', 'font-size:13px;color:#666;margin-top:24px;')}
`),
  },

  // 6. Payment Received
  {
    id: 'payment_received',
    name: 'Payment Received',
    description: 'Confirmation email sent when a payment is successfully received.',
    tag: 'Billing',
    subject: 'Payment Confirmed — RM {{amount}} received for {{invoiceNumber}}',
    variables: [
      { key: 'tenantName',    description: 'Name of the tenant company' },
      { key: 'adminName',     description: 'Name of the Tenant Admin' },
      { key: 'invoiceNumber', description: 'Invoice reference number' },
      { key: 'amount',        description: 'Amount paid' },
      { key: 'paymentDate',   description: 'Date the payment was processed' },
      { key: 'paymentMethod', description: 'Payment method used (e.g. FPX, Credit Card, Bank Transfer)' },
      { key: 'receiptUrl',    description: 'Link to download the payment receipt' },
    ],
    html: wrap(`
${h1('Payment Confirmed')}
${successBox('Thank you! Your payment of RM {{amount}} has been received.')}
${p(`Hi {{adminName}}, we have successfully received your payment for invoice ${highlight('{{invoiceNumber}}')} for ${highlight('{{tenantName}}')}.`)}
${infoTable(
  infoRow('Invoice No.', '{{invoiceNumber}}'),
  infoRow('Amount Paid', 'RM {{amount}}'),
  infoRow('Payment Date', '{{paymentDate}}'),
  infoRow('Method', '{{paymentMethod}}'),
)}
${p('Your account is in good standing. Thank you for your continued trust in Brandtelligence.')}
${btn('{{receiptUrl}}', 'Download Receipt →', '#16a34a')}
`),
  },

  // 7. Account Suspended
  {
    id: 'account_suspended',
    name: 'Account Suspended',
    description: 'Sent to Tenant Admin when their account is suspended due to overdue payments.',
    tag: 'Dunning',
    subject: 'Your Brandtelligence Account Has Been Suspended — {{companyName}}',
    variables: [
      { key: 'tenantName',    description: 'Name of the tenant company' },
      { key: 'adminName',     description: 'Name of the Tenant Admin' },
      { key: 'companyName',   description: 'Company name' },
      { key: 'reason',        description: 'Reason for suspension' },
      { key: 'invoiceUrl',    description: 'Link to the outstanding invoice' },
      { key: 'supportEmail',  description: 'Support email address' },
    ],
    html: wrap(`
${h1('Account Suspended')}
${warningBox('Your account access has been suspended.')}
${p(`Hi {{adminName}}, we regret to inform you that the Brandtelligence account for ${highlight('{{companyName}}')} has been suspended.`)}
${infoTable(
  infoRow('Company', '{{tenantName}}'),
  infoRow('Reason', '{{reason}}'),
)}
${p('Your team members can no longer access the platform until the outstanding balance is settled. All your data is preserved and will be restored immediately upon payment.')}
${btn('{{invoiceUrl}}', 'Pay & Restore Access →', '#dc2626')}
${p('If you have already made payment or wish to dispute this suspension, please contact us at <a href="mailto:{{supportEmail}}" style="color:#7c3aed;">{{supportEmail}}</a>.', 'font-size:13px;color:#666;margin-top:24px;')}
`),
  },

  // 8. Account Reactivated
  {
    id: 'account_reactivated',
    name: 'Account Reactivated',
    description: 'Sent to Tenant Admin when their account is reactivated after payment or manual override.',
    tag: 'System',
    subject: 'Your Brandtelligence Account is Back Online — {{companyName}}',
    variables: [
      { key: 'adminName',      description: 'Name of the Tenant Admin' },
      { key: 'companyName',    description: 'Company name' },
      { key: 'reactivatedAt', description: 'Date and time of reactivation' },
      { key: 'portalUrl',      description: 'URL to the Tenant Admin portal' },
    ],
    html: wrap(`
${h1('Your Account is Back Online! 🎉')}
${successBox('Account reactivated successfully on {{reactivatedAt}}.')}
${p(`Hi {{adminName}}, great news! The Brandtelligence account for ${highlight('{{companyName}}')} has been fully reactivated.`)}
${p('Your team members can now log in and resume their work. All your data, projects, and settings remain intact exactly as you left them.')}
${btn('{{portalUrl}}', 'Go to Dashboard →', '#0d9488')}
${p('Thank you for your continued partnership with Brandtelligence. If you have any questions, we are always here to help.', 'font-size:13px;color:#666;margin-top:24px;')}
`),
  },

  // 9. Password Reset
  {
    id: 'password_reset',
    name: 'Password Reset',
    description: 'Sent when a user requests a password reset link.',
    tag: 'Security',
    subject: 'Reset Your Brandtelligence Password',
    variables: [
      { key: 'userName',   description: 'Full name of the user' },
      { key: 'resetUrl',   description: 'One-time password reset link' },
      { key: 'expiresAt',  description: 'Expiry time of the reset link (e.g. 1 hour)' },
      { key: 'ipAddress',  description: 'IP address that initiated the request' },
    ],
    html: wrap(`
${h1('Password Reset Request')}
${p(`Hi {{userName}}, we received a request to reset the password for your Brandtelligence account.`)}
${p('Click the button below to set a new password. This link is valid for <strong>{{expiresAt}}</strong> and can only be used once.')}
${btn('{{resetUrl}}', 'Reset Password →', '#7c3aed')}
${warningBox('If you did not request a password reset, please ignore this email. Your account is safe. This request was initiated from IP: {{ipAddress}}')}
${p('For security, never share this link with anyone. Our team will never ask you for this link.', 'font-size:13px;color:#888;margin-top:24px;')}
`),
  },

  // 10. Welcome Employee
  {
    id: 'welcome_employee',
    name: 'Welcome — New Employee',
    description: 'Sent to new staff members invited to join the platform by their Tenant Admin.',
    tag: 'Onboarding',
    subject: 'Welcome to Brandtelligence — {{companyName}}',
    variables: [
      { key: 'employeeName', description: 'Full name of the new employee' },
      { key: 'companyName',  description: 'Name of the company/tenant' },
      { key: 'role',         description: 'Role assigned to the employee' },
      { key: 'inviteUrl',    description: 'One-time invite link to set up account' },
      { key: 'expiresAt',    description: 'Expiry time of the invite link' },
      { key: 'adminName',    description: 'Name of the admin who sent the invite' },
    ],
    html: wrap(`
${h1('Welcome to Brandtelligence!')}
${p(`Hi {{employeeName}}, you have been invited by ${highlight('{{adminName}}')} to join ${highlight('{{companyName}}')} on the Brandtelligence Platform as a <strong>{{role}}</strong>.`)}
${p('Brandtelligence is an AI-powered social media management platform. Click below to accept your invitation and set up your password.')}
${btn('{{inviteUrl}}', 'Accept Invitation →')}
${warningBox('This invite expires on {{expiresAt}}. Contact your admin if it has expired.')}
${infoTable(
  infoRow('Company', '{{companyName}}'),
  infoRow('Your Role', '{{role}}'),
  infoRow('Invited By', '{{adminName}}'),
)}
${p('We are excited to have you on the team! If you have questions, reach out to your admin directly.', 'font-size:13px;color:#666;margin-top:24px;')}
`),
  },

  // 11. Test Email (used by Settings → Email / SMTP → Send Test)
  {
    id: 'test_email',
    name: 'Test Email',
    description: 'Sent when Super Admin clicks "Send Test" in Settings → Email / SMTP to verify the SMTP configuration is working correctly.',
    tag: 'System',
    subject: 'Brandtelligence — SMTP Test Successful ✅',
    variables: [
      { key: 'smtpHost',  description: 'SMTP host used to send this email' },
      { key: 'smtpPort',  description: 'SMTP port number' },
      { key: 'fromEmail', description: 'The "From" email address configured' },
      { key: 'sentTo',    description: 'The recipient address this test was sent to' },
      { key: 'sentAt',    description: 'Date and time the test was triggered' },
    ],
    html: wrap(`
${h1('SMTP Test Successful ✅')}
${successBox('Your SMTP configuration is working correctly. Emails will be delivered as expected.')}
${p('This test email was triggered from <strong>Settings → Email / SMTP → Send Test</strong> in the Brandtelligence Admin Panel.')}
${infoTable(
  infoRow('SMTP Host',   '{{smtpHost}}'),
  infoRow('SMTP Port',   '{{smtpPort}}'),
  infoRow('From Email',  '{{fromEmail}}'),
  infoRow('Sent To',     '{{sentTo}}'),
  infoRow('Sent At',     '{{sentAt}}'),
)}
${p('If you received this email, no further action is required. Your platform is ready to send all system notifications.', 'font-size:13px;color:#666;margin-top:8px;')}
${p('You can customise this template (and all other system emails) from <strong>Email Templates</strong> in the left sidebar.', 'font-size:12px;color:#888;margin-top:24px;')}
`),
  },

  // 12. Confirm Sign Up
  {
    id: 'auth_confirm_signup',
    name: 'Confirm Sign Up',
    description: 'Sent when a new user registers and must verify their email address before their account is activated. Triggered via the auth/confirm-signup server route.',
    tag: 'Security',
    subject: 'Confirm your Brandtelligence account — {{email}}',
    variables: [
      { key: 'userName',   description: 'Full name of the registering user (or email prefix if name unknown)' },
      { key: 'email',      description: 'Email address being confirmed' },
      { key: 'confirmUrl', description: 'One-time email confirmation link (Supabase-signed)' },
      { key: 'expiresAt',  description: 'Expiry time of the confirmation link (e.g. 24 hours)' },
    ],
    html: wrap(`
${h1('Confirm Your Email Address')}
${p(`Hi {{userName}}, thank you for creating your Brandtelligence account. Please confirm your email address to activate your access.`)}
${p(`Click the button below to verify ${highlight('{{email}}')} and complete your registration.`)}
${btn('{{confirmUrl}}', 'Confirm Email Address →')}
${warningBox('This link expires in {{expiresAt}}. If you did not create a Brandtelligence account, please ignore this email — no action is needed and your account will not be created.')}
${p('Once confirmed, you will have full access to your assigned modules on the Brandtelligence Platform.', 'font-size:13px;color:#666;margin-top:24px;')}
`),
  },

  // 13. Invite User (generic auth-level invite)
  {
    id: 'auth_invite_user',
    name: 'Invite User',
    description: 'Generic auth-level invite link — used when a user is invited directly via the Supabase auth system. For tenant-specific invites use the Tenant Invite template; for staff use Welcome Employee.',
    tag: 'Onboarding',
    subject: "You've been invited to Brandtelligence",
    variables: [
      { key: 'invitedByName',  description: 'Full name of the person who sent the invite' },
      { key: 'invitedByEmail', description: 'Email address of the person who sent the invite' },
      { key: 'inviteUrl',      description: 'One-time invite link to set up the account (Supabase-signed)' },
      { key: 'expiresAt',      description: 'Expiry time of the invite link (e.g. 24 hours)' },
    ],
    html: wrap(`
${h1("You've Been Invited to Brandtelligence")}
${p(`Hi there, ${highlight('{{invitedByName}}')} (<a href="mailto:{{invitedByEmail}}" style="color:#7c3aed;">{{invitedByEmail}}</a>) has invited you to join the Brandtelligence Platform.`)}
${p('Click the button below to accept your invitation and set up your password. This link is valid for <strong>{{expiresAt}}</strong> and can only be used once.')}
${btn('{{inviteUrl}}', 'Accept Invitation →')}
${warningBox('This invite expires in {{expiresAt}}. If you were not expecting this invitation, you can safely ignore this email.')}
${p('Brandtelligence is an AI-powered social media management platform used by leading agencies across Malaysia.', 'font-size:13px;color:#666;margin-top:24px;')}
`),
  },

  // 14. Magic Link
  {
    id: 'auth_magic_link',
    name: 'Magic Link',
    description: 'Passwordless sign-in link sent to a user who requests to log in without a password. Expires quickly — typically 1 hour.',
    tag: 'Security',
    subject: 'Your Brandtelligence sign-in link',
    variables: [
      { key: 'userName',     description: 'Name or email prefix of the user requesting sign-in' },
      { key: 'magicLinkUrl', description: 'One-time passwordless sign-in link (Supabase-signed)' },
      { key: 'expiresAt',    description: 'Expiry time of the sign-in link (e.g. 1 hour)' },
      { key: 'ipAddress',    description: 'IP address that requested the magic link' },
    ],
    html: wrap(`
${h1('Your Sign-In Link')}
${p(`Hi {{userName}}, a passwordless sign-in link was requested for your Brandtelligence account. Click the button below to sign in instantly — no password required.`)}
${p('This link is valid for <strong>{{expiresAt}}</strong> and can only be used once.')}
${btn('{{magicLinkUrl}}', 'Sign In to Brandtelligence →')}
${warningBox('If you did not request this link, please ignore this email. Your account remains secure. This request came from IP: {{ipAddress}}')}
${p('For your security, never share this link with anyone. It grants immediate access to your Brandtelligence account.', 'font-size:13px;color:#888;margin-top:24px;')}
`),
  },

  // 15. Change Email Address
  {
    id: 'auth_email_change',
    name: 'Change Email Address',
    description: 'Sent to confirm an email address change request. The user must click the link to complete the update to their new address.',
    tag: 'Security',
    subject: 'Confirm your new email address — Brandtelligence',
    variables: [
      { key: 'userName',  description: 'Full name of the user requesting the change' },
      { key: 'oldEmail',  description: 'The current (old) email address being replaced' },
      { key: 'newEmail',  description: 'The new email address to be confirmed and activated' },
      { key: 'changeUrl', description: 'One-time confirmation link to complete the email change (Supabase-signed)' },
      { key: 'expiresAt', description: 'Expiry time of the confirmation link (e.g. 24 hours)' },
    ],
    html: wrap(`
${h1('Confirm Your New Email Address')}
${p(`Hi {{userName}}, we received a request to change the email address associated with your Brandtelligence account.`)}
${infoTable(
  infoRow('Current Email', '{{oldEmail}}'),
  infoRow('New Email', '{{newEmail}}'),
)}
${p(`Click the button below to confirm ${highlight('{{newEmail}}')} as your new sign-in email. This link is valid for <strong>{{expiresAt}}</strong>.`)}
${btn('{{changeUrl}}', 'Confirm New Email →', '#0d9488')}
${warningBox('If you did not request this change, please contact support immediately at support@brandtelligence.com.my — your account may be at risk.')}
${p('After confirmation, all future login attempts must use your new email address.', 'font-size:13px;color:#666;margin-top:24px;')}
`),
  },

  // 16. Reauthentication
  {
    id: 'auth_reauth',
    name: 'Reauthentication',
    description: 'Sent when a user must re-verify their identity before performing a sensitive action (e.g. changing password, updating billing, deleting account).',
    tag: 'Security',
    subject: 'Action Required: Verify your identity — Brandtelligence',
    variables: [
      { key: 'userName',          description: 'Full name of the user' },
      { key: 'reauthUrl',         description: 'One-time reauthentication link (Supabase-signed)' },
      { key: 'expiresAt',         description: 'Expiry time of the link (e.g. 15 minutes)' },
      { key: 'ipAddress',         description: 'IP address that triggered the reauthentication request' },
      { key: 'actionDescription', description: 'Description of the sensitive action requiring verification (e.g. "Change Password")' },
    ],
    html: wrap(`
${h1('Verify Your Identity')}
${p(`Hi {{userName}}, a sensitive action was attempted on your Brandtelligence account that requires you to re-verify your identity.`)}
${infoTable(
  infoRow('Action', '{{actionDescription}}'),
  infoRow('Requested From', '{{ipAddress}}'),
)}
${p('Click the button below to confirm it was you and complete this action. This link is valid for <strong>{{expiresAt}}</strong> and can only be used once.')}
${btn('{{reauthUrl}}', 'Verify My Identity →', '#f59e0b')}
${warningBox('If you did not initiate this action, ignore this email and consider changing your password immediately. Your account has not been compromised.')}
${p('For security, this link will expire quickly. If it has already expired, please return to the platform and retry the action.', 'font-size:13px;color:#888;margin-top:24px;')}
`),
  },
];