/**
 * TemplateShowcase — Brandtelligence Design System Preview
 * ─────────────────────────────────────────────────────────────────────────────
 * Live preview of every component in the GlassUI template.
 * Route: /template-showcase
 *
 * HOW TO USE IN A NEW FIGMA MAKE BUILD:
 *   1. Copy /src/app/components/template/GlassBackground.tsx
 *   2. Copy /src/app/components/template/GlassUI.tsx
 *   3. (Optional) Copy this file as a reference / delete it once familiar.
 *   4. Install: pnpm add motion lucide-react
 *   5. Import what you need from GlassUI and wrap pages with GlassBackground.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Zap, BarChart2, Users, Shield, Star, Globe, ArrowRight, Copy, Check,
  Download, Settings, Bell, Search, ChevronUp,
} from 'lucide-react';
import { GlassBackground, type GlassPalette } from '../components/template/GlassBackground';
import {
  GlassCard, GlassModal, GlassDivider, GlassSection,
  GradientText, SectionTitle,
  GlassInput, GlassTextarea, GlassSelect, GlassToggle, GlassCheckbox,
  GlassButton,
  GlassAlert, GlassBadge, GlassTag, GlassProgress, GlassSpinner,
  GlassStatCard, GlassFeatureCard, GlassTable,
  GlassTabBar, GlassBreadcrumb, GlassPageHeader, GlassFAB,
  type GlassAccent,
} from '../components/template/GlassUI';
import {
  FlatBell, FlatRocket, FlatShield, FlatBarChart, FlatMail, FlatGear,
  FlatStar, FlatZap, FlatLock, FlatGlobe, FlatUsers, FlatSearch,
  FlatHeart, FlatTarget, FlatMegaphone, FlatTrophy, FlatCpu, FlatSparkles,
  FlatIconWrap, FlatIconGrid, IconFeatureCard, IconStatCard,
  AnimatedIcon, FLAT_ICON_SETS,
  type IconShape, type IconSize,
} from '../components/template/AnimatedIcons';

// ── Demo data ──────────────────────────────────────────────────────────────────

const PALETTE_OPTIONS: { value: GlassPalette; label: string }[] = [
  { value: 'brand',    label: '🟣 Brand — purple / teal / orange' },
  { value: 'ocean',    label: '🔵 Ocean — indigo / cyan / blue'   },
  { value: 'sunset',   label: '🔴 Sunset — rose / orange / amber' },
  { value: 'forest',   label: '🟢 Forest — emerald / teal / green'},
  { value: 'midnight', label: '🌌 Midnight — slate / violet'      },
];

const ACCENT_OPTIONS: GlassAccent[] = ['purple', 'teal', 'orange', 'emerald', 'sky', 'rose', 'amber'];

const TABLE_DATA = [
  { id: '1', name: 'Alice Tan',    role: 'Admin',    status: 'Active',   revenue: 'RM 12,400' },
  { id: '2', name: 'Bob Lim',      role: 'Employee', status: 'Active',   revenue: 'RM 8,700'  },
  { id: '3', name: 'Chloe Wong',   role: 'Employee', status: 'Inactive', revenue: 'RM 4,200'  },
  { id: '4', name: 'David Ng',     role: 'Admin',    status: 'Pending',  revenue: 'RM 19,800' },
];

// ── Component ──────────────────────────────────────────────────────────────────

export function TemplateShowcase() {
  const [palette, setPalette]       = useState<GlassPalette>('brand');
  const [accent, setAccent]         = useState<GlassAccent>('purple');
  const [activeTab, setActiveTab]   = useState('components');
  const [modalOpen, setModalOpen]   = useState(false);
  const [toggleOn, setToggleOn]     = useState(true);
  const [checked, setChecked]       = useState(false);
  const [inputVal, setInputVal]     = useState('');
  const [textareaVal, setTextareaVal] = useState('');
  const [selectVal, setSelectVal]   = useState('');
  const [copied, setCopied]         = useState(false);

  // Icon controls
  const [iconShape, setIconShape]   = useState<IconShape>('rounded');
  const [iconSize, setIconSize]     = useState<IconSize>('md');
  const [iconSet, setIconSet]       = useState<'platform' | 'marketing'>('platform');
  const [showGlow, setShowGlow]     = useState(false);

  const copyInstall = () => {
    navigator.clipboard.writeText('pnpm add motion lucide-react').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GlassBackground palette={palette} particleCount={25}>

      {/* ── Sticky palette + accent controls ─────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-black/30 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <span className="text-white/60 text-xs font-medium uppercase tracking-wider">Palette:</span>
          <select
            value={palette}
            onChange={e => setPalette(e.target.value as GlassPalette)}
            className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none"
            style={{ colorScheme: 'dark' }}
          >
            {PALETTE_OPTIONS.map(o => (
              <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>
            ))}
          </select>

          <span className="text-white/60 text-xs font-medium uppercase tracking-wider ml-3">Accent:</span>
          <div className="flex gap-1.5">
            {ACCENT_OPTIONS.map(a => (
              <button
                key={a}
                onClick={() => setAccent(a)}
                title={a}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  accent === a ? 'scale-125 border-white' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                style={{
                  background: {
                    purple: '#a855f7', teal: '#14b8a6', orange: '#f97316',
                    emerald: '#10b981', sky: '#0ea5e9', rose: '#f43f5e', amber: '#f59e0b',
                  }[a],
                }}
              />
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2 bg-white/5 border border-white/15 rounded-lg px-3 py-1.5">
            <code className="text-teal-300 text-xs font-mono">pnpm add motion lucide-react</code>
            <button onClick={copyInstall} className="text-white/40 hover:text-white transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="text-center px-4 pt-16 pb-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/70 text-xs mb-6"
        >
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          Brandtelligence Glass Design System — Copy-Paste Template
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-white font-bold mb-4"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
        >
          <GradientText>GlassUI</GradientText> Template Kit
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed"
        >
          Every component used across the Brandtelligence platform, packaged in two files.
          Copy <code className="bg-white/10 px-1.5 py-0.5 rounded text-teal-300 text-xs font-mono">GlassBackground.tsx</code> and{' '}
          <code className="bg-white/10 px-1.5 py-0.5 rounded text-purple-300 text-xs font-mono">GlassUI.tsx</code> into any Figma Make build.
        </motion.p>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 max-w-7xl mx-auto mb-8">
        <GlassTabBar
          accent={accent}
          active={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'components', label: 'Components', icon: <Zap className="w-4 h-4" /> },
            { id: 'inputs',     label: 'Inputs',     icon: <Settings className="w-4 h-4" /> },
            { id: 'feedback',   label: 'Feedback',   icon: <Bell className="w-4 h-4" />, badge: 3 },
            { id: 'data',       label: 'Data',       icon: <BarChart2 className="w-4 h-4" /> },
            { id: 'layout',     label: 'Layout',     icon: <Globe className="w-4 h-4" /> },
            { id: 'icons',      label: 'Icons',      icon: <Star className="w-4 h-4" /> },
          ]}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          COMPONENTS TAB
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'components' && (
        <GlassSection>

          {/* Page Header */}
          <GlassCard className="mb-8" title="GlassPageHeader">
            <GlassPageHeader
              title="Dashboard Overview"
              subtitle="Track everything that matters to your business"
              accent={accent}
              icon={<BarChart2 className="w-5 h-5" />}
              breadcrumb={[{ label: 'Platform' }, { label: 'Dashboard' }, { label: 'Overview' }]}
              actions={
                <>
                  <GlassButton variant="ghost" size="sm" icon={<Download className="w-3.5 h-3.5" />}>Export</GlassButton>
                  <GlassButton variant={accent === 'teal' ? 'teal' : 'primary'} size="sm" icon={<Zap className="w-3.5 h-3.5" />}>New Report</GlassButton>
                </>
              }
            />
          </GlassCard>

          {/* Buttons */}
          <GlassCard className="mb-8" title="GlassButton — variants">
            <div className="flex flex-wrap gap-3 mb-4">
              <GlassButton variant="primary">Primary</GlassButton>
              <GlassButton variant="teal">Teal</GlassButton>
              <GlassButton variant="orange">Orange</GlassButton>
              <GlassButton variant="emerald">Emerald</GlassButton>
              <GlassButton variant="danger">Danger</GlassButton>
              <GlassButton variant="ghost">Ghost</GlassButton>
              <GlassButton variant="glass">Glass</GlassButton>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              <GlassButton variant="primary" size="xs">Extra Small</GlassButton>
              <GlassButton variant="primary" size="sm">Small</GlassButton>
              <GlassButton variant="primary" size="md">Medium</GlassButton>
              <GlassButton variant="primary" size="lg">Large</GlassButton>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              <GlassButton variant="primary" pill icon={<Star className="w-4 h-4" />}>Pill Button</GlassButton>
              <GlassButton variant="teal" icon={<ArrowRight className="w-4 h-4" />} iconRight={<ArrowRight className="w-4 h-4" />}>With Icons</GlassButton>
              <GlassButton variant="primary" loading>Loading...</GlassButton>
              <GlassButton variant="primary" disabled>Disabled</GlassButton>
            </div>
            <GlassButton variant="primary" block>Full Width Button</GlassButton>
          </GlassCard>

          {/* Feature Cards */}
          <SectionTitle
            eyebrow="GlassFeatureCard"
            title={<>Beautiful <GradientText>Feature Cards</GradientText></>}
            subtitle="Hover over each card to see the lift animation."
            accent={accent}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
            {[
              { icon: <Zap className="w-5 h-5" />,      title: 'AI-Powered',       desc: 'Generate content with state-of-the-art language models integrated directly into your workflow.',    accent: 'purple' as GlassAccent, badge: 'NEW' },
              { icon: <BarChart2 className="w-5 h-5" />, title: 'Real-Time Data',   desc: 'Live dashboards with sub-second refresh. No more waiting for reports to be emailed at end of day.', accent: 'teal'   as GlassAccent, badge: '↑ 40%' },
              { icon: <Shield className="w-5 h-5" />,    title: 'Enterprise RBAC',  desc: 'Three-tier role system — Super Admin, Tenant Admin, Employee — with granular module permissions.',  accent: 'orange' as GlassAccent },
              { icon: <Users className="w-5 h-5" />,     title: 'Multi-Tenant',     desc: 'Serve dozens of clients from a single platform. Isolated data, custom branding, per-tenant billing.',accent: 'emerald'as GlassAccent },
              { icon: <Globe className="w-5 h-5" />,     title: 'Global Scale',     desc: 'Built on Supabase Edge Functions and a Postgres database with row-level security policies.',         accent: 'sky'   as GlassAccent },
              { icon: <Star className="w-5 h-5" />,      title: 'Approval Flows',   desc: 'Every piece of content goes through a configurable review pipeline before publication.',              accent: 'rose'  as GlassAccent },
            ].map((f, i) => (
              <GlassFeatureCard key={i} index={i} accent={f.accent} badge={f.badge} icon={f.icon} title={f.title} description={f.desc} />
            ))}
          </div>

          {/* Modal */}
          <GlassCard className="mb-8" title="GlassModal">
            <p className="text-white/60 text-sm mb-4">Keyboard-dismissible modal with spring animation and backdrop blur.</p>
            <GlassButton variant="primary" onClick={() => setModalOpen(true)} icon={<Zap className="w-4 h-4" />}>
              Open Modal
            </GlassButton>
            <GlassModal open={modalOpen} onClose={() => setModalOpen(false)} title="Modal Example" maxWidth="md">
              <p className="text-white/70 text-sm mb-5 leading-relaxed">
                This is a fully-functional glassmorphism modal. Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-xs">Esc</kbd> or click
                the backdrop to dismiss. Spring animations are handled by Motion.
              </p>
              <GlassAlert type="info" title="Tip">
                Use the <code className="text-xs bg-white/10 px-1 rounded">maxWidth</code> prop to control panel size: sm / md / lg / xl / 2xl
              </GlassAlert>
              <div className="flex gap-3 mt-5 justify-end">
                <GlassButton variant="ghost" onClick={() => setModalOpen(false)}>Cancel</GlassButton>
                <GlassButton variant="primary" onClick={() => setModalOpen(false)}>Confirm</GlassButton>
              </div>
            </GlassModal>
          </GlassCard>

        </GlassSection>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          INPUTS TAB
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'inputs' && (
        <GlassSection>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <GlassCard title="GlassInput">
              <div className="space-y-4">
                <GlassInput
                  label="Email Address"
                  placeholder="you@company.com"
                  type="email"
                  icon={<Search className="w-4 h-4" />}
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  required
                />
                <GlassInput
                  label="With Error"
                  placeholder="Enter value"
                  error="This field is required"
                  value=""
                  onChange={() => {}}
                />
                <GlassInput
                  label="With Hint"
                  placeholder="Username"
                  hint="Letters and numbers only, 3–20 characters"
                  value=""
                  onChange={() => {}}
                />
                <GlassInput
                  label="Disabled"
                  placeholder="Cannot edit"
                  disabled
                  value="Locked value"
                  onChange={() => {}}
                />
              </div>
            </GlassCard>

            <GlassCard title="GlassTextarea & GlassSelect">
              <div className="space-y-4">
                <GlassTextarea
                  label="Description"
                  placeholder="Write something..."
                  rows={4}
                  value={textareaVal}
                  onChange={e => setTextareaVal(e.target.value)}
                />
                <GlassSelect
                  label="Country"
                  placeholder="Select a country"
                  value={selectVal}
                  onChange={e => setSelectVal(e.target.value)}
                  options={[
                    { value: 'my', label: 'Malaysia' },
                    { value: 'sg', label: 'Singapore' },
                    { value: 'id', label: 'Indonesia' },
                    { value: 'th', label: 'Thailand' },
                    { value: 'ph', label: 'Philippines' },
                  ]}
                />
              </div>
            </GlassCard>

            <GlassCard title="GlassToggle">
              <div className="space-y-4">
                {(['purple', 'teal', 'orange', 'emerald'] as GlassAccent[]).map(a => (
                  <GlassToggle
                    key={a}
                    checked={toggleOn}
                    onChange={setToggleOn}
                    label={`${a.charAt(0).toUpperCase() + a.slice(1)} toggle — ${toggleOn ? 'ON' : 'OFF'}`}
                    accent={a}
                  />
                ))}
                <GlassToggle checked={false} onChange={() => {}} label="Disabled toggle" disabled accent="teal" />
              </div>
            </GlassCard>

            <GlassCard title="GlassCheckbox">
              <div className="space-y-4">
                {(['purple', 'teal', 'orange', 'emerald'] as GlassAccent[]).map(a => (
                  <GlassCheckbox
                    key={a}
                    checked={checked}
                    onChange={setChecked}
                    label={`${a.charAt(0).toUpperCase() + a.slice(1)} checkbox — ${checked ? 'checked' : 'unchecked'}`}
                    accent={a}
                  />
                ))}
              </div>
            </GlassCard>

          </div>
        </GlassSection>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          FEEDBACK TAB
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'feedback' && (
        <GlassSection>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <GlassCard title="GlassAlert — all variants">
              <div className="space-y-3">
                <GlassAlert type="info" title="Information">Your subscription renews in 7 days.</GlassAlert>
                <GlassAlert type="success" title="Success">Content published to all 6 platforms.</GlassAlert>
                <GlassAlert type="warning" title="Warning">SMTP is not configured — emails may fail.</GlassAlert>
                <GlassAlert type="error" title="Error" onClose={() => {}}>Authentication failed. Please try again.</GlassAlert>
              </div>
            </GlassCard>

            <GlassCard title="GlassBadge & GlassTag">
              <p className="text-white/50 text-xs mb-3">GlassBadge — accent × dot variants</p>
              <div className="flex flex-wrap gap-2 mb-5">
                {(['purple', 'teal', 'orange', 'emerald', 'sky', 'rose', 'amber'] as GlassAccent[]).map(a => (
                  <GlassBadge key={a} accent={a} dot>{a}</GlassBadge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {(['purple', 'teal', 'orange', 'emerald'] as GlassAccent[]).map(a => (
                  <GlassBadge key={a} accent={a} size="sm">{a} sm</GlassBadge>
                ))}
              </div>
              <p className="text-white/50 text-xs mb-3">GlassTag — with remove button</p>
              <div className="flex flex-wrap gap-2">
                <GlassTag>Marketing</GlassTag>
                <GlassTag onRemove={() => {}}>Social Media</GlassTag>
                <GlassTag onRemove={() => {}}>AI Content</GlassTag>
                <GlassTag>Analytics</GlassTag>
              </div>
            </GlassCard>

            <GlassCard title="GlassProgress">
              <div className="space-y-5">
                <GlassProgress value={85} label="Content Quota Used" showValue accent="purple" animated />
                <GlassProgress value={62} label="Storage" showValue accent="teal" animated />
                <GlassProgress value={33} label="Monthly Budget" showValue accent="orange" animated size="lg" />
                <GlassProgress value={100} label="Onboarding Complete" showValue accent="emerald" size="sm" animated />
                <GlassProgress value={5}  label="Trial Remaining" showValue accent="rose" animated />
              </div>
            </GlassCard>

            <GlassCard title="GlassSpinner & GlassDivider">
              <div className="flex items-start gap-8 mb-6">
                <GlassSpinner size="sm" accent="purple" label="Small" />
                <GlassSpinner size="md" accent="teal"   label="Medium" />
                <GlassSpinner size="lg" accent="orange" label="Large" />
              </div>
              <GlassDivider label="section separator" accent={accent} />
              <GlassDivider />
              <p className="text-white/40 text-xs text-center">Plain divider above, labelled divider above that</p>
            </GlassCard>

          </div>
        </GlassSection>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          DATA TAB
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'data' && (
        <GlassSection>

          {/* Stat cards */}
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-4">GlassStatCard</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <GlassStatCard label="Monthly Revenue"  value="RM 48,200" delta="12% vs last month"     deltaPositive  accent="purple"  icon={<BarChart2 className="w-6 h-6" />} />
            <GlassStatCard label="Active Tenants"   value="24"        delta="3 new this week"        deltaPositive  accent="teal"    icon={<Users className="w-6 h-6" />}    />
            <GlassStatCard label="Content Published" value="1,842"    delta="−8% vs last month"      deltaPositive={false} accent="orange" icon={<Globe className="w-6 h-6" />} />
            <GlassStatCard label="Churn Rate"       value="2.1%"      delta="↓ 0.4% improvement"    deltaPositive  accent="emerald" icon={<Star className="w-6 h-6" />}     />
          </div>

          {/* Table */}
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-4">GlassTable</p>
          <GlassCard noPadding>
            <GlassTable
              data={TABLE_DATA}
              rowKey={r => r.id}
              columns={[
                { key: 'name',    header: 'Name',    cell: r => <span className="text-white font-medium">{r.name}</span> },
                { key: 'role',    header: 'Role',    cell: r => <GlassBadge accent={r.role === 'Admin' ? 'purple' : 'teal'} size="sm">{r.role}</GlassBadge> },
                { key: 'status',  header: 'Status',  cell: r => (
                  <GlassBadge accent={r.status === 'Active' ? 'emerald' : r.status === 'Pending' ? 'amber' : 'rose'} size="sm" dot>
                    {r.status}
                  </GlassBadge>
                )},
                { key: 'revenue', header: 'Revenue', align: 'right', cell: r => <span className="text-white/70 font-mono">{r.revenue}</span> },
              ]}
            />
          </GlassCard>

        </GlassSection>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          LAYOUT TAB
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'layout' && (
        <GlassSection>

          <SectionTitle
            eyebrow="GlassCard variants"
            title={<>Flexible <GradientText>Card</GradientText> System</>}
            subtitle="Cards support accent borders, optional headers, hover lift, and zero-padding modes."
            accent={accent}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            <GlassCard title="Default card" actions={<GlassBadge accent="teal" size="sm">Live</GlassBadge>}>
              <p className="text-white/60 text-sm">Standard glass card with header + action slot.</p>
            </GlassCard>
            <GlassCard accent="purple" hoverable>
              <p className="text-white font-semibold mb-1">Accent + hoverable</p>
              <p className="text-white/60 text-sm">Purple border + lift on hover. Great for interactive tiles.</p>
            </GlassCard>
            <GlassCard accent="teal" hoverable>
              <p className="text-white font-semibold mb-1">Teal accent card</p>
              <p className="text-white/60 text-sm">Swap accent to any of the 7 palette colours.</p>
            </GlassCard>
          </div>

          <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-4">GlassBreadcrumb</p>
          <GlassCard className="mb-8">
            <GlassBreadcrumb
              items={[
                { label: 'Platform', onClick: () => {} },
                { label: 'Tenants',  onClick: () => {} },
                { label: 'Acme Corp', onClick: () => {} },
                { label: 'Settings' },
              ]}
            />
            <p className="text-white/60 text-sm">Clickable breadcrumb items receive an <code className="bg-white/10 px-1 rounded text-xs">onClick</code> prop.</p>
          </GlassCard>

          <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-4">GradientText</p>
          <GlassCard className="mb-8">
            <div className="space-y-3">
              <h2 className="text-white font-bold text-2xl">
                Standard headline with <GradientText>gradient accent</GradientText>
              </h2>
              <h3 className="text-white font-bold text-xl">
                <GradientText from="from-rose-400" via="via-orange-400" to="to-amber-400">Custom sunset gradient</GradientText>
              </h3>
              <h3 className="text-white font-bold text-xl">
                <GradientText from="from-sky-400" via="via-cyan-400" to="to-teal-400">Custom ocean gradient</GradientText>
              </h3>
            </div>
          </GlassCard>

          {/* File list */}
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-4">Files to copy</p>
          <GlassCard>
            <div className="space-y-3">
              {[
                { file: 'GlassBackground.tsx', desc: 'Animated purple/teal/orange background with blobs, particles, and grid overlay. Supports 5 palette presets.', lines: '~120 lines', accent: 'purple' as GlassAccent },
                { file: 'GlassUI.tsx',         desc: 'Full design-system kit: 25+ components including buttons, inputs, cards, modals, tables, badges, tabs, and more.', lines: '~500 lines', accent: 'teal'   as GlassAccent },
              ].map(f => (
                <div key={f.file} className={`flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10`}>
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-${f.accent}-500 to-${f.accent}-700 flex items-center justify-center shrink-0`}>
                    <code className="text-white text-[0.55rem] font-bold">.tsx</code>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm font-mono">{f.file}</p>
                    <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                  <GlassBadge accent="teal" size="sm">{f.lines}</GlassBadge>
                </div>
              ))}
            </div>
          </GlassCard>

        </GlassSection>
      )}

      {/* ── Scroll to top FAB ─────────────────────────────────────────────── */}

      {/* ═══════════════════════════════════════════════════════════════════════
          ICONS TAB — Flaticon-style animated SVG icons
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'icons' && (
        <GlassSection>

          {/* Controls */}
          <GlassCard className="mb-8" title="Icon controls">
            <div className="flex flex-wrap gap-6 items-end">
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Shape</p>
                <div className="flex gap-2">
                  {(['rounded', 'circle', 'squircle'] as IconShape[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setIconShape(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs border font-medium transition-all ${
                        iconShape === s
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                          : 'bg-white/5 border-white/15 text-white/50 hover:text-white/80'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Size</p>
                <div className="flex gap-2">
                  {(['sm', 'md', 'lg', 'xl'] as IconSize[]).map(s => (
                    <button
                      key={s}
                      onClick={() => setIconSize(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs border font-medium transition-all ${
                        iconSize === s
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                          : 'bg-white/5 border-white/15 text-white/50 hover:text-white/80'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Set</p>
                <div className="flex gap-2">
                  {(['platform', 'marketing'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setIconSet(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs border font-medium capitalize transition-all ${
                        iconSet === s
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                          : 'bg-white/5 border-white/15 text-white/50 hover:text-white/80'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => setShowGlow(v => !v)}
                  className={`w-9 h-5 rounded-full transition-colors duration-300 ${showGlow ? 'bg-orange-500' : 'bg-white/20'} relative`}
                >
                  <motion.span
                    animate={{ x: showGlow ? 18 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow block"
                  />
                </button>
                <span className="text-white/60 text-xs">Glow ring</span>
              </div>
            </div>
          </GlassCard>

          {/* Icon grid */}
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-6">
            FlatIconGrid — {iconSet} set · hover any icon
          </p>
          <GlassCard className="mb-10">
            <FlatIconGrid
              icons={FLAT_ICON_SETS[iconSet]}
              size={iconSize}
              shape={iconShape}
              columns={6}
              showLabels
              glowRing={showGlow}
            />
          </GlassCard>

          {/* All 18 icons solo */}
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-6">
            All 18 custom SVG icons — each has independent internal animations
          </p>
          <GlassCard className="mb-10">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-6">
              {[
                { c: <FlatBell />,      l: 'Bell'      },
                { c: <FlatRocket />,    l: 'Rocket'    },
                { c: <FlatShield />,    l: 'Shield'    },
                { c: <FlatBarChart />,  l: 'Bar Chart' },
                { c: <FlatMail />,      l: 'Mail'      },
                { c: <FlatGear />,      l: 'Gear'      },
                { c: <FlatStar />,      l: 'Star'      },
                { c: <FlatZap />,       l: 'Zap'       },
                { c: <FlatLock />,      l: 'Lock'      },
                { c: <FlatGlobe />,     l: 'Globe'     },
                { c: <FlatUsers />,     l: 'Users'     },
                { c: <FlatSearch />,    l: 'Search'    },
                { c: <FlatHeart />,     l: 'Heart'     },
                { c: <FlatTarget />,    l: 'Target'    },
                { c: <FlatMegaphone />, l: 'Megaphone' },
                { c: <FlatTrophy />,    l: 'Trophy'    },
                { c: <FlatCpu />,       l: 'CPU'       },
                { c: <FlatSparkles />,  l: 'Sparkles'  },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="flex justify-center"
                >
                  <FlatIconWrap size={iconSize} shape={iconShape} label={item.l} glowRing={showGlow}>
                    {item.c}
                  </FlatIconWrap>
                </motion.div>
              ))}
            </div>
          </GlassCard>

          {/* Feature cards using flat icons */}
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-6">
            IconFeatureCard — flat icons in glass cards
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {[
              { icon: <FlatSparkles />, title: 'AI Content Studio',       desc: 'Generate captions, copy, and long-form content in seconds with built-in approval workflows.',  badge: 'AI'    },
              { icon: <FlatRocket />,   title: 'Growth Engine',            desc: 'Track conversions, optimise ad spend, and automate retargeting across every paid channel.',     badge: '↑ 3×'  },
              { icon: <FlatShield />,   title: 'Enterprise Security',      desc: 'Role-based access, MFA enforcement, full audit trail, and per-tenant data isolation.',          badge: 'SOC2'  },
              { icon: <FlatBarChart />, title: 'Real-Time Analytics',      desc: 'Sub-second dashboards, custom KPI builders, and one-click exports for stakeholder reports.',    badge: 'LIVE'  },
              { icon: <FlatGlobe />,    title: 'SEO & SEM Command Centre', desc: 'Keyword research, rank tracking, Google Ads, and programmatic display — one workspace.',       badge: '+60%'  },
              { icon: <FlatTrophy />,   title: 'Milestone Rewards',        desc: 'Gamified goal-tracking keeps teams motivated and celebrates wins automatically.',                           },
            ].map((c, i) => (
              <IconFeatureCard
                key={i}
                icon={c.icon}
                title={c.title}
                description={c.desc}
                shape={iconShape}
                badge={c.badge}
                index={i}
              />
            ))}
          </div>

          {/* Stat cards with flat icons */}
          <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-6">
            IconStatCard — flat icons in stat cards
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <IconStatCard icon={<FlatBarChart />} label="Monthly Revenue"   value="RM 48,200" delta="12% vs last month"    deltaPositive  shape={iconShape} />
            <IconStatCard icon={<FlatUsers />}    label="Active Tenants"    value="24"         delta="3 new this week"      deltaPositive  shape={iconShape} />
            <IconStatCard icon={<FlatRocket />}   label="Content Published" value="1,842"      delta="8% vs last month"    deltaPositive={false} shape={iconShape} />
            <IconStatCard icon={<FlatTrophy />}   label="Milestones Hit"    value="16"         delta="4 this quarter"       deltaPositive  shape={iconShape} />
          </div>

        </GlassSection>
      )}

      <GlassFAB
        accent={accent}
        label="Back to top"
        icon={<ChevronUp className="w-5 h-5" />}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      />

    </GlassBackground>
  );
}