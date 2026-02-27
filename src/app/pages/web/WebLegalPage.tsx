/**
 * WebLegalPage — Privacy Policy, Terms of Service, Cookie Policy
 * Handles /web/privacy, /web/terms, /web/cookies via the `type` prop
 */
import { useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Shield, FileText, Cookie } from 'lucide-react';

const LAST_UPDATED = 'January 15, 2025';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-white font-bold text-lg mb-4 pb-3 border-b border-white/[0.08]">{title}</h2>
      <div className="space-y-3 text-white/60 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-white/60 text-sm leading-relaxed">{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="flex items-start gap-2"><span className="text-bt-teal mt-1.5 shrink-0">•</span><span>{children}</span></li>;
}

const PRIVACY = () => (
  <>
    <Section title="1. Introduction">
      <P>Brandtelligence Sdn Bhd ("Brandtelligence", "we", "us", or "our") is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform and services.</P>
      <P>We comply with applicable privacy laws globally, including the Malaysian Personal Data Protection Act (PDPA), the EU General Data Protection Regulation (GDPR), and the California Consumer Privacy Act (CCPA), where applicable.</P>
    </Section>

    <Section title="2. Data We Collect">
      <P>We collect the following categories of personal data:</P>
      <ul className="space-y-2 pl-2">
        <Li><strong className="text-white">Account data:</strong> Name, work email address, password (hashed), company name, role, and profile information provided during registration.</Li>
        <Li><strong className="text-white">Usage data:</strong> Platform interactions, feature usage, login timestamps, IP address, browser type, and device identifiers.</Li>
        <Li><strong className="text-white">Content data:</strong> Marketing content, brand assets, campaign materials, and other data you create or upload to the platform.</Li>
        <Li><strong className="text-white">Billing data:</strong> Billing address and payment method details (processed securely by our payment provider; we do not store full card numbers).</Li>
        <Li><strong className="text-white">Communication data:</strong> Messages, support tickets, and correspondence you send to us.</Li>
      </ul>
    </Section>

    <Section title="3. How We Use Your Data">
      <P>We process your personal data only for the following purposes (purpose limitation principle):</P>
      <ul className="space-y-2 pl-2">
        <Li>To provide, maintain, and improve the Brandtelligence platform and services.</Li>
        <Li>To authenticate users and enforce security controls.</Li>
        <Li>To process payments and manage subscriptions.</Li>
        <Li>To communicate with you about your account, updates, and support requests.</Li>
        <Li>To send product and educational content where you have opted in.</Li>
        <Li>To comply with legal obligations and enforce our Terms of Service.</Li>
        <Li>To perform analytics on aggregated, anonymised platform usage to improve our products.</Li>
      </ul>
      <P>We do not sell your personal data to third parties. Ever.</P>
    </Section>

    <Section title="4. Data Minimisation">
      <P>We collect only the data that is strictly necessary for the purposes described above. We regularly review our data collection practices and remove unnecessary data fields. Sensitive identifiers (national ID numbers, passport details, bank account numbers) are never collected or required.</P>
    </Section>

    <Section title="5. Legal Basis for Processing (GDPR)">
      <P>For users in the European Economic Area (EEA) and United Kingdom, our legal bases for processing personal data are:</P>
      <ul className="space-y-2 pl-2">
        <Li><strong className="text-white">Contract performance:</strong> Processing necessary to deliver our platform services.</Li>
        <Li><strong className="text-white">Legitimate interests:</strong> Platform improvement, security, and fraud prevention.</Li>
        <Li><strong className="text-white">Legal obligation:</strong> Compliance with applicable laws.</Li>
        <Li><strong className="text-white">Consent:</strong> Marketing emails and optional cookies (where obtained).</Li>
      </ul>
    </Section>

    <Section title="6. Data Retention">
      <P>We retain personal data for as long as your account is active or as needed to provide services. Upon account deletion:</P>
      <ul className="space-y-2 pl-2">
        <Li>Account data is deleted within 30 days of closure.</Li>
        <Li>Billing and transaction records are retained for 7 years for legal and tax compliance.</Li>
        <Li>Backups are purged within 90 days.</Li>
        <Li>Anonymised, aggregated analytics data may be retained indefinitely.</Li>
      </ul>
    </Section>

    <Section title="7. Your Rights">
      <P>Depending on your jurisdiction, you have the following rights regarding your personal data:</P>
      <ul className="space-y-2 pl-2">
        <Li><strong className="text-white">Right to access:</strong> Request a copy of the personal data we hold about you.</Li>
        <Li><strong className="text-white">Right to rectification:</strong> Correct inaccurate or incomplete data.</Li>
        <Li><strong className="text-white">Right to erasure:</strong> Request deletion of your data ("right to be forgotten").</Li>
        <Li><strong className="text-white">Right to portability:</strong> Receive your data in a structured, machine-readable format.</Li>
        <Li><strong className="text-white">Right to object:</strong> Object to processing based on legitimate interests.</Li>
        <Li><strong className="text-white">Right to restrict processing:</strong> Request limitation of how we use your data.</Li>
      </ul>
      <P>To exercise any of these rights, email privacy@brandtelligence.io. We will respond within 30 days.</P>
    </Section>

    <Section title="8. Data Security">
      <P>We implement industry-standard technical and organisational measures to protect your data:</P>
      <ul className="space-y-2 pl-2">
        <Li>AES-256 encryption at rest; TLS 1.3 encryption in transit.</Li>
        <Li>Row-level security (RLS) in our database — tenant data is fully isolated.</Li>
        <Li>Multi-factor authentication available to all users.</Li>
        <Li>Regular third-party penetration testing and SOC 2 Type II audits.</Li>
        <Li>All team members with data access undergo background checks and security training.</Li>
      </ul>
    </Section>

    <Section title="9. International Transfers">
      <P>Brandtelligence stores data in Supabase infrastructure across APAC (Singapore), EU (Frankfurt), and US (Virginia) regions. Where personal data is transferred outside the EEA, we ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) where required.</P>
    </Section>

    <Section title="10. Contact & DPO">
      <P>For all privacy enquiries, data subject requests, or to reach our Data Protection Officer:</P>
      <P><strong className="text-white">Email:</strong> privacy@brandtelligence.io</P>
      <P><strong className="text-white">Post:</strong> Data Protection Officer, Brandtelligence Sdn Bhd, Level 15, Menara KLCC, Kuala Lumpur, Malaysia.</P>
    </Section>
  </>
);

const TERMS = () => (
  <>
    <Section title="1. Acceptance of Terms">
      <P>By accessing or using the Brandtelligence platform, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform. These Terms constitute a legally binding agreement between you (or your organisation) and Brandtelligence Sdn Bhd.</P>
    </Section>
    <Section title="2. Services Provided">
      <P>Brandtelligence provides a Software-as-a-Service (SaaS) marketing intelligence platform including AI content generation, campaign analytics, landing page builder, contact management, and brand asset management. Service availability is subject to the terms of your selected subscription plan.</P>
    </Section>
    <Section title="3. Account Responsibilities">
      <P>You are responsible for maintaining the confidentiality of your login credentials, all activities under your account, and ensuring that all users in your organisation comply with these Terms. You must immediately notify us of any unauthorised access.</P>
    </Section>
    <Section title="4. Acceptable Use">
      <P>You agree not to use Brandtelligence to:</P>
      <ul className="space-y-2 pl-2">
        <Li>Generate spam, phishing content, or deceptive marketing materials.</Li>
        <Li>Infringe intellectual property rights of any third party.</Li>
        <Li>Process personal data in violation of applicable privacy laws.</Li>
        <Li>Attempt to reverse-engineer, hack, or disrupt the platform.</Li>
        <Li>Resell or sublicense the platform without prior written consent.</Li>
      </ul>
    </Section>
    <Section title="5. Subscription and Billing">
      <P>Subscriptions are billed in advance on a monthly or annual basis. Failure to pay may result in service suspension after a 7-day grace period. All fees are non-refundable except as stated in our Refund Policy. Prices are subject to change with 30 days' notice.</P>
    </Section>
    <Section title="6. Intellectual Property">
      <P>Brandtelligence retains all intellectual property rights in the platform, software, and documentation. You retain ownership of all content you create and upload. You grant Brandtelligence a limited licence to process your content solely to provide the services.</P>
    </Section>
    <Section title="7. Limitation of Liability">
      <P>To the maximum extent permitted by law, Brandtelligence's liability for any claim arising out of these Terms shall not exceed the fees paid by you in the 12 months preceding the claim. We are not liable for indirect, incidental, or consequential damages.</P>
    </Section>
    <Section title="8. Termination">
      <P>Either party may terminate the agreement at any time. Upon termination, you will retain access until the end of the current billing period. Your data will be available for export for 30 days following termination, after which it will be deleted.</P>
    </Section>
    <Section title="9. Governing Law">
      <P>These Terms are governed by the laws of Malaysia. Any disputes shall be resolved in the courts of Kuala Lumpur, Malaysia, without regard to conflict of law provisions.</P>
    </Section>
    <Section title="10. Changes to Terms">
      <P>We may modify these Terms at any time. We will provide 30 days' notice for material changes via email and in-platform notification. Continued use of the platform after notice constitutes acceptance of the updated Terms.</P>
    </Section>
  </>
);

const COOKIES = () => (
  <>
    <Section title="1. What Are Cookies?">
      <P>Cookies are small text files placed on your device when you visit a website. They are widely used to make websites work efficiently and to provide information to the site owner. Brandtelligence uses cookies and similar technologies (such as local storage and session storage) on our platform and marketing website.</P>
    </Section>
    <Section title="2. Cookies We Use">
      <P>We use the following categories of cookies:</P>
      <ul className="space-y-3 pl-2">
        <Li><strong className="text-white">Strictly Necessary:</strong> Essential for the platform to function. These include authentication tokens, session management, and security cookies. These cannot be disabled.</Li>
        <Li><strong className="text-white">Performance & Analytics:</strong> Help us understand how users interact with our platform (page visits, feature usage, error tracking). All data is anonymised. Requires consent in GDPR-applicable regions.</Li>
        <Li><strong className="text-white">Functional:</strong> Remember your preferences (language, theme, dashboard layout). Requires consent.</Li>
        <Li><strong className="text-white">Marketing:</strong> Used on our marketing website to track ad campaigns (e.g., Google Ads, LinkedIn Ads conversions). Requires consent. Not placed in the platform application.</Li>
      </ul>
    </Section>
    <Section title="3. Cookie Consent">
      <P>When you first visit our marketing website, you will be presented with a cookie consent banner. You can choose to accept all cookies, reject non-essential cookies, or manage your preferences individually. You can update your preferences at any time by clicking the "Cookie Settings" link in our footer.</P>
    </Section>
    <Section title="4. Third-Party Cookies">
      <P>We use a limited number of third-party services that may place cookies. These include:</P>
      <ul className="space-y-2 pl-2">
        <Li><strong className="text-white">Supabase:</strong> Backend authentication and session management.</Li>
        <Li><strong className="text-white">Stripe:</strong> Payment processing (strictly necessary for billing).</Li>
        <Li><strong className="text-white">PostHog / Mixpanel:</strong> Anonymised product analytics (performance cookies, with consent).</Li>
        <Li><strong className="text-white">Google Analytics:</strong> Website analytics (marketing website only, with consent).</Li>
      </ul>
    </Section>
    <Section title="5. How to Manage Cookies">
      <P>You can control and delete cookies through your browser settings. Note that disabling strictly necessary cookies will prevent the platform from functioning. For browser-specific instructions, visit your browser's help centre.</P>
    </Section>
    <Section title="6. Retention Period">
      <P>Session cookies are deleted when you close your browser. Persistent cookies are retained for periods ranging from 30 days to 2 years, depending on their purpose. Marketing cookies are retained for up to 90 days.</P>
    </Section>
    <Section title="7. Contact">
      <P>For questions about our cookie practices, contact privacy@brandtelligence.io.</P>
    </Section>
  </>
);

export function WebPrivacyPage() { return <LegalPage type="privacy" />; }
export function WebTermsPage()   { return <LegalPage type="terms" />; }
export function WebCookiesPage() { return <LegalPage type="cookies" />; }

function LegalPage({ type }: { type: 'privacy' | 'terms' | 'cookies' }) {
  const config = {
    privacy: { icon: Shield,   title: 'Privacy Policy',   subtitle: 'How we collect, use, and protect your personal data.', Content: PRIVACY },
    terms:   { icon: FileText, title: 'Terms of Service',  subtitle: 'The terms governing your use of the Brandtelligence platform.', Content: TERMS },
    cookies: { icon: Cookie,   title: 'Cookie Policy',     subtitle: 'How we use cookies and similar technologies.', Content: COOKIES },
  }[type];

  const { icon: Icon, title, subtitle, Content } = config;

  return (
    <div className="text-white pt-16">
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-bt-teal/7 blur-[100px] rounded-full" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-bt-teal/15 border border-bt-teal/25 flex items-center justify-center text-bt-teal">
                <Icon className="w-5 h-5" />
              </div>
              <h1 className="text-white font-black text-3xl sm:text-4xl">{title}</h1>
            </div>
            <p className="text-white/50 mb-2">{subtitle}</p>
            <p className="text-white/30 text-xs">Last updated: {LAST_UPDATED} · Brandtelligence Sdn Bhd</p>
          </motion.div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-24">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="p-5 bg-bt-orange/[0.07] border border-bt-orange/20 rounded-xl mb-10 text-sm">
            <p className="text-bt-orange font-semibold mb-1">Important Notice</p>
            <p className="text-white/60">This document was last updated on {LAST_UPDATED}. Please review it carefully. If you have questions, contact us at <a href="mailto:privacy@brandtelligence.io" className="text-bt-teal hover:text-bt-teal/80 underline underline-offset-2">privacy@brandtelligence.io</a>.</p>
          </div>
          <Content />
        </motion.div>
      </section>
    </div>
  );
}