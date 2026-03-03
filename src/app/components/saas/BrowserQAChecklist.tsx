/**
 * BrowserQAChecklist
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive Gate-2 UI/UX QA checklist for Super Admins.
 * Covers all 125 rows from /src/imports/theme-qa-checklist.md across 9 sections:
 *   1. Calendar             (13 items)
 *   2. Mockups              (14 items)
 *   3. Analytics Tooltips   ( 7 items)
 *   4. ContentBoard SLA     ( 7 items)
 *   5. ActivityFeedPage     (15 items)
 *   6. SocialPublishPage    (10 items)
 *   7. LoginPage            (13 items)
 *   8. Public Marketing     (26 items)
 *   9. Cross-cutting        (20 items)
 *
 * Features:
 * - PASS / FAIL / N/A / NOT TESTED per item + freetext notes
 * - L / D / 📱 mode badges per item (visual reminder)
 * - Category accordions with per-section progress bars
 * - Search + status/category filter
 * - localStorage cache (survives page reload)
 * - Auto-save to server KV every 30 s after changes
 * - Emergency save on beforeunload (keepalive fetch)
 * - CSV export for auditors
 * - Server-first merge strategy on mount
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, XCircle, HelpCircle, MinusCircle,
  ChevronDown, ChevronRight, Download, Search,
  RotateCcw, CloudUpload, Cloud, Loader2, RefreshCw,
  Smartphone, Sun, Moon, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, PrimaryBtn } from './SaasLayout';
import { useDashboardTheme } from './DashboardThemeContext';
import {
  fetchQaResults,
  saveQaResults,
  type QaItemStatus,
  type QaResultEntry,
  type QaResultsPayload,
} from '../../utils/apiClient';
import { projectId } from '/utils/supabase/info';

// ── Emergency save URL ────────────────────────────────────────────────────────
const QA_SAVE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679/compliance/qa-results`;
const LS_KEY                = 'btl_qa_results';
const LS_EMERGENCY_SAVE_KEY = 'btl_qa_emergency_save';

// ── Types ─────────────────────────────────────────────────────────────────────

type QaMode = 'L' | 'D' | 'M';  // Light, Dark, Mobile

interface QaItem {
  id:     string;
  area:   string;
  check:  string;
  modes:  QaMode[];   // which modes to verify
  note?:  string;     // optional extra context for tester
}
interface QaCategory {
  id:          string;
  title:       string;
  description: string;
  items:       QaItem[];
}

// ── QA Data (125 items transcribed from theme-qa-checklist.md) ────────────────

const CATEGORIES: QaCategory[] = [
  {
    id: 'cal',
    title: '1 — Calendar (Content Calendar page)',
    description: 'Filter bar, view modes, platform pills, list/grid views, post detail modal, and mobile layout.',
    items: [
      { id: '1.1',  area: 'Filter bar card',                     modes: ['L','D'],       check: 'Background ≈ light gray tint, border visible, "Filter by Platform" heading dark' },
      { id: '1.2',  area: 'View-mode toggle (List / Calendar)',   modes: ['L','D'],       check: 'Active button has visible dark bg; inactive text readable' },
      { id: '1.3',  area: 'Platform filter pills',                modes: ['L','D'],       check: 'Active pill: dark bg + dark text; inactive: light bg + gray text' },
      { id: '1.4',  area: 'List view — date headings & post rows',modes: ['L','D'],       check: 'All text dark; teal left-border visible' },
      { id: '1.5',  area: 'List view — caption text & hashtag chips', modes: ['L','D'],   check: 'Gray captions; chips with teal/colored border' },
      { id: '1.6',  area: 'Calendar grid view — day numbers',     modes: ['L','D'],       check: 'Dark numbers; platform event chips colored + white text ← critical exception' },
      { id: '1.7',  area: 'Calendar grid — Platform Legend labels', modes: ['L','D'],     check: 'Labels in readable gray' },
      { id: '1.8',  area: 'Content Summary card',                 modes: ['L','D'],       check: '"Total Posts" / "Active Days" / "Platforms" labels not washed out' },
      { id: '1.9',  area: 'Post detail modal (click any event)',  modes: ['L','D'],       check: 'Modal bg: white in Light / dark-purple in Dark' },
      { id: '1.10', area: 'Modal — platform icon badge',          modes: ['L','D'],       check: 'Colored bg (Instagram gradient, blue FB, etc.) + white icon ← exception check' },
      { id: '1.11', area: 'Modal — platform name & date/time',    modes: ['L','D'],       check: 'Name dark in Light; date muted gray' },
      { id: '1.12', area: 'Modal — close ✕ button',              modes: ['L','D'],       check: 'Visible, clickable, correct hover state' },
      { id: '1.13', area: 'Mobile: filter bar stacks vertically', modes: ['M'],           check: 'No horizontal overflow at 375 px' },
    ],
  },
  {
    id: 'mock',
    title: '2 — Mockups (Social Mockups page)',
    description: 'Grid cards, hover overlay, stat cards, detail modal phone frame, and caption panel.',
    items: [
      { id: '2.1',  area: '"Week 1 Social Media Mockups" header card', modes: ['L','D'],  check: 'Light tinted bg; white heading → dark in Light' },
      { id: '2.2',  area: 'Mockup cards grid',                    modes: ['L','D'],       check: 'Cards with subtle border; platform header bar keeps brand color + white icon' },
      { id: '2.3',  area: 'Card post-type badge ("Carousel", "Story"…)', modes: ['L','D'],check: 'Black/60 bg → badge readable in both modes' },
      { id: '2.4',  area: 'Card caption text',                    modes: ['L','D'],       check: 'Readable gray in Light; white/70 in Dark' },
      { id: '2.5',  area: 'Card footer (time, hashtag count)',     modes: ['L','D'],       check: 'Muted but visible' },
      { id: '2.6',  area: 'Hover overlay "View Details"',          modes: ['L','D'],       check: 'Dark text on semi-transparent black overlay — legible' },
      { id: '2.7',  area: 'Week Summary stat cards',               modes: ['L','D'],       check: 'Gradient number text readable; label "Platform Mix" etc. visible' },
      { id: '2.8',  area: 'Mockup detail modal — phone frame',     modes: ['L'],           check: 'Phone frame stays dark purple in Light (mockup-device exception applies)', note: 'Dark mode check N/A — frame is always dark by design' },
      { id: '2.9',  area: 'Modal phone — platform header',         modes: ['L','D'],       check: 'Brand color bg + white icon/text inside frame' },
      { id: '2.10', area: 'Modal phone — engagement icons (♥ 💬 ↗)', modes: ['L','D'],    check: 'White/60 on dark frame; hover turns accent color' },
      { id: '2.11', area: 'Modal phone — caption preview',         modes: ['L','D'],       check: 'white/80 on dark frame' },
      { id: '2.12', area: 'Modal right panel — Caption label & text box', modes: ['L','D'],check: 'Dark label text in Light; text box has light bg' },
      { id: '2.13', area: 'Modal right panel — Hashtags, Visual Concept, CTA sections', modes: ['L','D'], check: 'All readable; purple/emerald tinted boxes visible' },
      { id: '2.14', area: 'Download button',                       modes: ['L','D'],       check: 'Gradient bg preserves white text in Light' },
    ],
  },
  {
    id: 'analytics',
    title: '3 — ContentAnalyticsDashboard — Chart Tooltips',
    description: 'Pie chart tooltips, engagement bar chart tooltips, axis labels, and KPI cards.',
    items: [
      { id: '3.1',  area: 'Pie chart — hover any segment',         modes: ['L'],           check: 'Tooltip appears with dark bg (rgba ~dark) + white text name', note: 'chart-tooltip exception preserves dark bg in Light mode' },
      { id: '3.2',  area: 'Pie tooltip — sub-line "N cards · X%"', modes: ['L'],           check: 'White/60 (muted) text — NOT invisible' },
      { id: '3.3',  area: 'Pie tooltip — border',                  modes: ['L'],           check: 'Subtle white border (not gray-300 override)' },
      { id: '3.4',  area: 'Engagement bar chart — hover any bar',  modes: ['L'],           check: 'Tooltip: dark bg, white label, colored dots + white values' },
      { id: '3.5',  area: 'Engagement tooltip — legend color swatches', modes: ['L'],     check: 'Colored squares visible' },
      { id: '3.6',  area: 'Chart axes & tick labels',              modes: ['L','D'],       check: 'chartCursor fill visible; axis labels readable' },
      { id: '3.7',  area: 'KPI cards (Total Posts, Avg Engagement…)', modes: ['L','D'],   check: 'Gradient number text vivid; labels muted gray' },
    ],
  },
  {
    id: 'board',
    title: '4 — ContentBoard SLA Callout Banner',
    description: 'Red/amber SLA banners and per-card badges. Force visibility with demo/overdue cards.',
    items: [
      { id: '4.1',  area: 'Breached banner (red)',                 modes: ['L','D'],       check: 'Red border, faint red bg, Timer icon = red-700 in Light, text = red-700' },
      { id: '4.2',  area: 'Warning banner (amber)',                modes: ['L','D'],       check: 'Amber border, faint amber bg, text = amber-700 in Light' },
      { id: '4.3',  area: '"Review →" right-hand label',           modes: ['L'],           check: 'red-300/60 → red-600 at 65% in Light — legible' },
      { id: '4.4',  area: '"+N at risk" secondary label',          modes: ['L'],           check: 'amber-300/60 → amber-600 muted in Light' },
      { id: '4.5',  area: 'Per-card SLA badge (compact)',           modes: ['L','D'],       check: '"SLA Breached" = red-700 text; "At Risk" = amber-700' },
      { id: '4.6',  area: 'Per-card SLA progress panel',           modes: ['L','D'],       check: '"Time elapsed" label muted; bold value in red/amber' },
      { id: '4.7',  area: '"On Time" SLA badge (green)',            modes: ['L','D'],       check: 'green-700 text on light green bg' },
    ],
  },
  {
    id: 'activity',
    title: '5 — ActivityFeedPage',
    description: 'Page header, filter bar, search input, action pills, event rows, and mobile layout.',
    items: [
      { id: '5.1',  area: 'Page header + icon',                    modes: ['L','D'],       check: 'Gradient icon bg, white icon inside (exception applies)' },
      { id: '5.2',  area: 'Filter bar — refresh / load-more buttons', modes: ['L','D'],   check: 'isDark conditional → correct styles in both modes' },
      { id: '5.3',  area: 'Search input',                          modes: ['L','D'],       check: 'Light bg, dark placeholder, teal focus border' },
      { id: '5.4',  area: 'Action filter pills — all 14 types',    modes: ['L','D'],       check: 'Active pill: teal bg; inactive: text-*-400 → richer -700 in Light' },
      { id: '5.5',  area: 'User avatars — gradient initials',       modes: ['L'],           check: 'White initial letter on gradient → exception applies' },
      { id: '5.6',  area: 'Avatar border-white/20 ring',           modes: ['L'],           check: 'Converts to gray-300 ring in Light' },
      { id: '5.7',  area: 'Event rows — date group headers',        modes: ['L','D'],       check: 'Divider line visible; event count label readable' },
      { id: '5.8',  area: 'Event row card group border',            modes: ['L'],           check: 'border-white/8 → gray-200; divide-white/5 → gray-100' },
      { id: '5.9',  area: 'Event detail — action icon (sky/violet/emerald etc.)', modes: ['L'], check: '-400 → -700 mapping; no washed-out icons' },
      { id: '5.10', area: 'Platform badge (Instagram gradient etc.)', modes: ['L','D'],    check: 'White text on brand gradient ← exception check' },
      { id: '5.11', area: 'ADMIN role badge',                       modes: ['L'],           check: 'purple-400 text → purple-700 in Light' },
      { id: '5.12', area: '"Clear all" filters button',             modes: ['L'],           check: 'text-white/40 → gray-400, hover → dark' },
      { id: '5.13', area: 'Empty state illustration',               modes: ['L','D'],       check: 'bg-white/5 tint + icon faint color' },
      { id: '5.14', area: 'Load more button',                       modes: ['L','D'],       check: 'Light styling (isDark=false path)' },
      { id: '5.15', area: 'Mobile: filter pills wrap cleanly',      modes: ['M'],           check: 'No overlap at 375 px' },
    ],
  },
  {
    id: 'social',
    title: '6 — SocialPublishPage',
    description: 'Stat cards, connection cards, platform badges, History tab, and empty states.',
    items: [
      { id: '6.1',  area: 'Stat cards row (Connections / Published etc.)', modes: ['L','D'], check: 'isDark path → light bordered card in Light' },
      { id: '6.2',  area: 'Tab bar (Connections / History)',        modes: ['L','D'],       check: 'Inactive: text-white/40 → gray; active: bg-white/15 text-white → light' },
      { id: '6.3',  area: 'Twitter connection card',               modes: ['L'],           check: 'text-white icon → dark; bg-white/6 → faint tint; border-white/12 → gray-300' },
      { id: '6.4',  area: 'Other platform cards (Telegram, WhatsApp etc.)', modes: ['L'], check: 'Colored icon text remapped from -400 → -700' },
      { id: '6.5',  area: 'Status dot — "Not yet tested" (gray)',   modes: ['L'],           check: 'isDark → gray-300 in Light' },
      { id: '6.6',  area: 'Test / Edit buttons',                   modes: ['L','D'],       check: 'isDark → light gray style' },
      { id: '6.7',  area: 'Error message block (red for expired token)', modes: ['L'],     check: 'red-300/70 → red-600 text; red/10 bg visible' },
      { id: '6.8',  area: '"Connect Account" teal gradient button', modes: ['L','D'],      check: 'Gradient bg preserves white text' },
      { id: '6.9',  area: 'History tab — publish records list',     modes: ['L','D'],       check: 'isDark-conditional border & dividers → light gray' },
      { id: '6.10', area: 'Empty state (no connections)',           modes: ['L','D'],       check: 'Dark bg empty-state box → light gray in Light' },
    ],
  },
  {
    id: 'login',
    title: '7 — LoginPage',
    description: 'Login card, tabs, form fields, eye icon, demo mode toggle, and success state.',
    items: [
      { id: '7.1',  area: 'Page hero / gradient bg',               modes: ['L','D'],       check: 'Gradient renders correctly' },
      { id: '7.2',  area: 'Login card container',                  modes: ['L'],           check: 'Light mode: white/80 frosted card, gray-200 border' },
      { id: '7.3',  area: '"Password" / "Magic Link" tabs',        modes: ['L','D'],       check: 'Active = teal bg + white text; inactive = muted gray' },
      { id: '7.4',  area: 'Form labels',                           modes: ['L'],           check: 'Gray-700 in Light' },
      { id: '7.5',  area: 'Email / Password inputs',               modes: ['L','D'],       check: 'White bg, gray-300 border, dark text, gray placeholder' },
      { id: '7.6',  area: 'Eye icon (show/hide password)',         modes: ['L'],           check: 'gray-400 normal; gray-600 hover' },
      { id: '7.7',  area: '"Sign In" teal button',                 modes: ['L','D'],       check: 'Teal bg, white text (inline style exception)' },
      { id: '7.8',  area: 'hCaptcha disclaimer links',             modes: ['L'],           check: 'Underlined; hover → gray-600' },
      { id: '7.9',  area: 'Demo Mode toggle pill',                 modes: ['L','D'],       check: 'Toggle thumb white; track changes color' },
      { id: '7.10', area: 'Demo account quick-fill cards',         modes: ['L','D'],       check: 'Light bordered cards; muted text' },
      { id: '7.11', area: '"Seed Data" button',                    modes: ['L','D'],       check: 'Muted border + text; orange Zap icon' },
      { id: '7.12', area: 'Sign-up tab — form fields',             modes: ['L','D'],       check: 'Same as login form' },
      { id: '7.13', area: '"Check Your Inbox" success state',      modes: ['L','D'],       check: 'Gray-50 card, readable email address' },
    ],
  },
  {
    id: 'public',
    title: '8 — All 10 Public Marketing Pages (Web Light)',
    description: 'Toggle light/dark via globe icon in WebLayout nav. Test each page in both modes.',
    items: [
      { id: '8.1',  area: 'Home — Hero',                           modes: ['L','D'],       check: 'Hero text, stats row, dashboard mockup card, floating "↑312% ROI" badge' },
      { id: '8.2',  area: 'Home — "Watch Demo" button',            modes: ['L'],           check: 'Outline button → dark text + gray border in Light' },
      { id: '8.3',  area: 'Home — Ticker logos',                   modes: ['L'],           check: 'text-white/25 → visible muted text' },
      { id: '8.4',  area: 'Home — Problem & Solution sections',     modes: ['L','D'],       check: 'All text dark' },
      { id: '8.5',  area: 'Features — Tab buttons & feature panels', modes: ['L','D'],     check: 'Inactive/active tab buttons; feature panels; integration logos' },
      { id: '8.6',  area: 'Features — CTA button',                 modes: ['L','D'],       check: 'Gradient + white text' },
      { id: '8.7',  area: 'Pricing — Billing toggle',              modes: ['L'],           check: 'bg-white text-black active pill stays correct' },
      { id: '8.8',  area: 'Pricing — Plan cards',                  modes: ['L','D'],       check: 'Highlighted card = teal gradient border; others = subtle border' },
      { id: '8.9',  area: 'Pricing — "Most Popular" badge',        modes: ['L','D'],       check: 'Orange badge on highlighted card' },
      { id: '8.10', area: 'Pricing — Comparison table',            modes: ['L','D'],       check: 'Alternating rows; ✓ icons; ✗ icons muted' },
      { id: '8.11', area: 'Pricing — FAQ accordion',               modes: ['L','D'],       check: 'Question text dark; answer muted' },
      { id: '8.12', area: 'About — Stats & team cards',            modes: ['L','D'],       check: 'All stat numbers dark; team cards; office location pills' },
      { id: '8.13', area: 'Blog — Featured article card & grid',   modes: ['L','D'],       check: 'Featured article card; article grid; author avatar initials on gradient' },
      { id: '8.14', area: 'Blog — Search input',                   modes: ['L','D'],       check: 'Light bg, dark placeholder' },
      { id: '8.15', area: 'Blog — Category filter pills',          modes: ['L','D'],       check: 'Active/inactive states readable' },
      { id: '8.16', area: 'Blog — Ghost BookOpen icon in gradient card', modes: ['L'],    check: 'Faint but visible' },
      { id: '8.17', area: 'Blog — Newsletter input + Subscribe',   modes: ['L','D'],       check: 'Input and button readable in both modes' },
      { id: '8.18', area: 'Contact — Form inputs',                 modes: ['L','D'],       check: 'All form inputs (Name, Email, Company, Subject <select>, Message)' },
      { id: '8.19', area: 'Contact — Submit button',               modes: ['L','D'],       check: 'Teal gradient' },
      { id: '8.20', area: 'Contact — Loading spinner',             modes: ['L','D'],       check: 'border-white/40 border-t-white on teal bg' },
      { id: '8.21', area: 'Contact — Success state',               modes: ['L','D'],       check: 'CheckCircle + confirmation text readable' },
      { id: '8.22', area: 'Contact — Office & support channel cards', modes: ['L','D'],   check: 'All card text readable' },
      { id: '8.23', area: 'Careers — All text and layout',         modes: ['L','D'],       check: 'Nothing washed out' },
      { id: '8.24', area: 'Request Access — Form fields & CTA',    modes: ['L','D'],       check: 'Form and button readable' },
      { id: '8.25', area: 'Privacy — Long-form text',              modes: ['L','D'],       check: 'Readable — no contrast issues' },
      { id: '8.26', area: 'Terms — Long-form text',                modes: ['L','D'],       check: 'Readable' },
    ],
  },
  {
    id: 'cross',
    title: '9 — Cross-cutting (run once in Light, once in Dark)',
    description: 'Sidebar nav, toasts, selects, modals, FoldableContainer, Recharts, and more.',
    items: [
      { id: '9.1',  area: 'Nav sidebar — menu items & active item', modes: ['L','D'],     check: 'All menu items readable; active item highlighted' },
      { id: '9.2',  area: 'Nav sidebar — group-hover arrow icons',  modes: ['L'],          check: 'gray-500 in Light (not white)' },
      { id: '9.3',  area: 'Sonner toast messages',                  modes: ['L','D'],      check: 'Text legible in both modes' },
      { id: '9.4',  area: 'All <select> dropdowns',                 modes: ['L'],          check: 'color-scheme: light set (no dark OS picker in Light mode)' },
      { id: '9.5',  area: 'Modal backdrops (bg-black/80)',          modes: ['L','D'],      check: 'Near-white in web-light; correct dark overlay on dashboard' },
      { id: '9.6',  area: 'FoldableContainer panel headers',        modes: ['L','D'],      check: 'Title, description, collapse chevron all readable' },
      { id: '9.7',  area: 'Recharts bars/lines — chartCursor hover', modes: ['L','D'],    check: 'chartCursor fill visible in both modes' },
      { id: '9.8',  area: 'AnimatePresence enter/exit transitions', modes: ['L','D'],      check: 'No wrong-color flash on mount/unmount' },
      { id: '9.9',  area: 'Accent surfaces (bt-teal, bt-orange, bt-purple)', modes: ['L'], check: 'Retain white text in Light mode' },
      { id: '9.10', area: 'Gradient CTAs (from-bt-teal etc.)',      modes: ['L'],          check: 'Retain white text in Light mode' },
      { id: '9.11', area: 'ContentCalendarView — selected day number', modes: ['L'],       check: 'purple-700 (not near-white)' },
      { id: '9.12', area: 'ContentCard — "Apply Caption & Hashtags" AI button', modes: ['L'], check: 'Readable purple text' },
      { id: '9.13', area: 'ContentBoard — "Share for Review Mode" banner description', modes: ['L'], check: 'Orange text visible (not invisible)' },
      { id: '9.14', area: 'ContentBoard — overdue/due-today schedule alert', modes: ['L'], check: 'Orange or green text visible' },
      { id: '9.15', area: 'MFAEnrollPage — step indicator number', modes: ['L'],           check: 'purple-600 (not invisible pale lavender)' },
      { id: '9.16', area: 'MFAChallengeModal — OTP digit inputs',  modes: ['L','D'],       check: 'Dark text on light bg; gray placeholder' },
      { id: '9.17', area: 'StatusBadge — "superadmin" chip',       modes: ['L'],           check: 'indigo-700 text, not light lavender' },
      { id: '9.18', area: 'LandingUSP / LandingFAB — rose accent labels', modes: ['L'],   check: 'Readable on light bg' },
      { id: '9.19', area: 'ProfileBanner — status pills',           modes: ['L'],           check: 'amber/orange/green status pills readable in Light' },
      { id: '9.20', area: 'EmployeeNav — notification dropdown',    modes: ['L'],           check: 'Dark heading "Notifications"; dark card titles' },
    ],
  },
];

export const QA_TOTAL_ITEMS = CATEGORIES.reduce((s, c) => s + c.items.length, 0);

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<QaItemStatus, { label: string; icon: React.ReactNode; cls: string; dotCls: string }> = {
  not_tested: { label: 'Not Tested', icon: <HelpCircle className="w-4 h-4" />, cls: 'text-gray-400', dotCls: 'bg-gray-300' },
  pass:       { label: 'Pass',       icon: <CheckCircle2 className="w-4 h-4" />, cls: 'text-emerald-500', dotCls: 'bg-emerald-500' },
  fail:       { label: 'Fail',       icon: <XCircle className="w-4 h-4" />, cls: 'text-red-500', dotCls: 'bg-red-500' },
  na:         { label: 'N/A',        icon: <MinusCircle className="w-4 h-4" />, cls: 'text-gray-300', dotCls: 'bg-gray-200' },
};

const MODE_BADGE: Record<QaMode, { label: string; icon: React.ReactNode; cls: string }> = {
  L: { label: 'L', icon: <Sun className="w-2.5 h-2.5" />,  cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  D: { label: 'D', icon: <Moon className="w-2.5 h-2.5" />, cls: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  M: { label: '📱', icon: <Smartphone className="w-2.5 h-2.5" />, cls: 'bg-teal-100 text-teal-700 border-teal-300' },
};

// ── localStorage helpers ──────────────────────────────────────────────────────

function loadResults(): Record<string, QaResultEntry> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function persistResults(r: Record<string, QaResultEntry>) {
  localStorage.setItem(LS_KEY, JSON.stringify(r));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BrowserQAChecklist() {
  const t = useDashboardTheme();

  const [results,            setResults]            = useState<Record<string, QaResultEntry>>(loadResults);
  const [expandedCats,       setExpandedCats]       = useState<Set<string>>(new Set(['cal']));
  const [expandedItems,      setExpandedItems]      = useState<Set<string>>(new Set());
  const [searchQuery,        setSearchQuery]        = useState('');
  const [statusFilter,       setStatusFilter]       = useState<QaItemStatus | 'all'>('all');
  const [categoryFilter,     setCategoryFilter]     = useState<string>('all');
  const [mobileOnly,         setMobileOnly]         = useState(false);

  // ── Server sync ─────────────────────────────────────────────────────────────
  const [syncing,            setSyncing]            = useState(false);
  const [loadingServer,      setLoadingServer]      = useState(true);
  const [lastSyncedAt,       setLastSyncedAt]       = useState<string | null>(null);
  const [hasUnsavedChanges,  setHasUnsavedChanges] = useState(false);
  const serverSnapshotRef    = useRef<string>('{}');
  const cachedAuthHeadersRef = useRef<Record<string, string> | null>(null);

  const cacheAuthHeaders = useCallback(async () => {
    try {
      const { getAuthHeaders } = await import('../../utils/authHeaders');
      cachedAuthHeadersRef.current = await getAuthHeaders(true);
    } catch { /* best-effort */ }
  }, []);

  // Load from server on mount, merge with localStorage
  useEffect(() => {
    const emergencyAt = localStorage.getItem(LS_EMERGENCY_SAVE_KEY);
    if (emergencyAt) {
      localStorage.removeItem(LS_EMERGENCY_SAVE_KEY);
      toast.info(`QA data was emergency-saved on ${new Date(emergencyAt).toLocaleString()}. Your progress was preserved.`, { duration: 7000 });
    }

    setLoadingServer(true);
    fetchQaResults()
      .then(payload => {
        if (!payload) return;
        const serverResults = payload.results ?? {};
        const localResults  = loadResults();
        // Merge: server wins unless local has more recent testedAt
        const merged: Record<string, QaResultEntry> = { ...serverResults };
        for (const [id, local] of Object.entries(localResults)) {
          const srv = serverResults[id];
          if (!srv || (local.testedAt && srv.testedAt && local.testedAt > srv.testedAt)) {
            merged[id] = local;
          }
        }
        setResults(merged);
        persistResults(merged);
        serverSnapshotRef.current = JSON.stringify(serverResults);
        setLastSyncedAt(payload.updatedAt);
        setHasUnsavedChanges(JSON.stringify(merged) !== JSON.stringify(serverResults));
        cacheAuthHeaders();
      })
      .catch(err => console.error('[BrowserQAChecklist] server load:', err))
      .finally(() => setLoadingServer(false));
  }, []);

  // ── Update + persist ─────────────────────────────────────────────────────────
  const updateResult = useCallback((itemId: string, update: Partial<QaResultEntry>) => {
    setResults(prev => {
      const current = prev[itemId] || { status: 'not_tested', notes: '' };
      const next    = {
        ...prev,
        [itemId]: { ...current, ...update, testedAt: new Date().toISOString() },
      };
      persistResults(next);
      setHasUnsavedChanges(JSON.stringify(next) !== serverSnapshotRef.current);
      return next;
    });
  }, []);

  // ── Save to server ───────────────────────────────────────────────────────────
  const handleSaveToServer = async () => {
    setSyncing(true);
    try {
      const payload = await saveQaResults(results, QA_TOTAL_ITEMS);
      serverSnapshotRef.current = JSON.stringify(payload.results);
      setLastSyncedAt(payload.updatedAt);
      setHasUnsavedChanges(false);
      toast.success('QA results saved to server (audit record updated)');
      cacheAuthHeaders();
    } catch (err: any) {
      console.error('[BrowserQAChecklist] save error:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // ── Auto-save (30 s debounce) ────────────────────────────────────────────────
  const AUTO_SAVE_DELAY = 30_000;
  const autoSaveTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef        = useRef(results);
  resultsRef.current      = results;
  const [autoSaveCountdown, setAutoSaveCountdown] = useState<number | null>(null);
  const countdownRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveStartRef  = useRef<number>(0);

  useEffect(() => {
    if (!hasUnsavedChanges || loadingServer) {
      setAutoSaveCountdown(null);
      autoSaveStartRef.current = 0;
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      if (autoSaveTimerRef.current) { clearTimeout(autoSaveTimerRef.current); autoSaveTimerRef.current = null; }
      return;
    }
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    const startedAt = Date.now();
    autoSaveStartRef.current = startedAt;
    setAutoSaveCountdown(30);

    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((AUTO_SAVE_DELAY - (Date.now() - startedAt)) / 1000));
      setAutoSaveCountdown(remaining);
      if (remaining <= 0 && countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }, 1000);

    autoSaveTimerRef.current = setTimeout(async () => {
      setAutoSaveCountdown(null);
      try {
        const payload = await saveQaResults(resultsRef.current, QA_TOTAL_ITEMS);
        serverSnapshotRef.current = JSON.stringify(payload.results);
        setLastSyncedAt(payload.updatedAt);
        setHasUnsavedChanges(false);
        toast.success('QA results auto-saved', { id: 'qa-autosave', duration: 2500 });
        cacheAuthHeaders();
      } catch { /* silent fail — user can retry manually */ }
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [hasUnsavedChanges, loadingServer]);

  // ── Emergency save on page unload ───────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (!hasUnsavedChanges || !cachedAuthHeadersRef.current) return;
      const headers = { ...cachedAuthHeadersRef.current, 'Content-Type': 'application/json' };
      localStorage.setItem(LS_EMERGENCY_SAVE_KEY, new Date().toISOString());
      navigator.sendBeacon
        ? navigator.sendBeacon(QA_SAVE_URL, new Blob([JSON.stringify({ results: resultsRef.current, totalItems: QA_TOTAL_ITEMS })], { type: 'application/json' }))
        : fetch(QA_SAVE_URL, { method: 'POST', headers, body: JSON.stringify({ results: resultsRef.current, totalItems: QA_TOTAL_ITEMS }), keepalive: true }).catch(() => {});
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const vals = Object.values(results);
    const pass  = vals.filter(r => r.status === 'pass').length;
    const fail  = vals.filter(r => r.status === 'fail').length;
    const na    = vals.filter(r => r.status === 'na').length;
    const untested = QA_TOTAL_ITEMS - pass - fail - na;
    return { pass, fail, na, untested, total: QA_TOTAL_ITEMS };
  }, [results]);

  // ── CSV export ───────────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    const rows: string[] = [
      'ID,Category,Area,Modes,Status,Notes,TestedAt',
    ];
    for (const cat of CATEGORIES) {
      for (const item of cat.items) {
        const r = results[item.id];
        rows.push([
          item.id,
          `"${cat.title}"`,
          `"${item.area}"`,
          item.modes.join('+'),
          r?.status ?? 'not_tested',
          `"${(r?.notes ?? '').replace(/"/g, '""')}"`,
          r?.testedAt ?? '',
        ].join(','));
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `btl-gate2-qa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Gate 2 QA CSV exported');
  };

  // ── Filtered view ────────────────────────────────────────────────────────────
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return CATEGORIES
      .filter(c => categoryFilter === 'all' || c.id === categoryFilter)
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item => {
          if (mobileOnly && !item.modes.includes('M')) return false;
          if (statusFilter !== 'all') {
            const s = results[item.id]?.status ?? 'not_tested';
            if (s !== statusFilter) return false;
          }
          if (q) {
            return item.area.toLowerCase().includes(q) || item.check.toLowerCase().includes(q) || item.id.includes(q);
          }
          return true;
        }),
      }))
      .filter(c => c.items.length > 0);
  }, [searchQuery, statusFilter, categoryFilter, mobileOnly, results]);

  const toggleCat  = (id: string) => setExpandedCats(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleItem = (id: string) => setExpandedItems(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // ── Category progress helper ─────────────────────────────────────────────────
  function catProgress(cat: QaCategory) {
    const items = cat.items;
    const pass  = items.filter(i => results[i.id]?.status === 'pass').length;
    const fail  = items.filter(i => results[i.id]?.status === 'fail').length;
    const total = items.length;
    return { pass, fail, total, pct: Math.round(((pass + fail) / total) * 100) };
  }

  const allPassed = stats.pass === QA_TOTAL_ITEMS;

  return (
    <div className="space-y-4">
      {/* ── Header stats card ─────────────────────────────────────────────────── */}
      <Card title="Gate 2 — Browser QA Checklist" className="mb-0">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {/* Stat pills */}
          {([
            { label: 'Pass',       value: stats.pass,     cls: 'bg-emerald-500/15 text-emerald-700 border-emerald-400/30' },
            { label: 'Fail',       value: stats.fail,     cls: 'bg-red-500/15 text-red-700 border-red-400/30' },
            { label: 'N/A',        value: stats.na,       cls: 'bg-gray-300/20 text-gray-500 border-gray-300/40' },
            { label: 'Not Tested', value: stats.untested, cls: t.isDark ? 'bg-white/5 text-white/40 border-white/10' : 'bg-gray-50 text-gray-400 border-gray-200' },
          ] as const).map(s => (
            <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${s.cls}`}>
              {s.value} {s.label}
            </div>
          ))}
          <div className="ml-auto text-xs text-right">
            <span className={t.textFaint}>{QA_TOTAL_ITEMS} items · 9 categories</span>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className={`h-2 w-full rounded-full overflow-hidden mb-1 ${t.isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
          <div className="h-full flex">
            <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(stats.pass / QA_TOTAL_ITEMS) * 100}%` }} />
            <div className="bg-red-500 transition-all duration-500"    style={{ width: `${(stats.fail / QA_TOTAL_ITEMS) * 100}%` }} />
          </div>
        </div>
        <p className={`text-[10px] ${t.textFaint} mb-4`}>
          {stats.pass}/{QA_TOTAL_ITEMS} passed · {stats.fail} failed
          {allPassed && ' — ✅ All items pass! Gate 2 is ready to close.'}
        </p>

        {/* Sync bar */}
        <div className={`flex flex-wrap items-center gap-3 pt-3 border-t ${t.border}`}>
          <PrimaryBtn onClick={handleSaveToServer} loading={syncing} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
            {syncing ? 'Saving…' : hasUnsavedChanges ? `Save to Audit Record${autoSaveCountdown !== null ? ` (auto in ${autoSaveCountdown}s)` : ''}` : 'Saved ✓'}
          </PrimaryBtn>
          <button onClick={handleExportCsv} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${t.isDark ? 'text-white/50 border-white/15 hover:text-white/80' : 'text-gray-500 border-gray-200 hover:text-gray-800'}`}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          {loadingServer && (
            <span className={`flex items-center gap-1 text-xs ${t.textFaint}`}><Loader2 className="w-3 h-3 animate-spin" /> Loading server state…</span>
          )}
          {lastSyncedAt && !loadingServer && (
            <span className={`flex items-center gap-1 text-xs ${t.textFaint}`}>
              <Cloud className="w-3 h-3" /> Last saved {new Date(lastSyncedAt).toLocaleString()}
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-500 font-medium">● Unsaved changes</span>
          )}
        </div>
      </Card>

      {/* ── Filters ───────────────────────────────────────────────────────────── */}
      <div className={`flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl border ${t.s1} ${t.border}`}>
        <Search className={`w-3.5 h-3.5 shrink-0 ${t.textFaint}`} />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search items…"
          className={`flex-1 min-w-32 bg-transparent text-sm outline-none placeholder:text-gray-400 ${t.text}`}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as QaItemStatus | 'all')}
          className={`text-xs px-2 py-1 rounded-lg border ${t.inputCls}`}
        >
          <option value="all">All statuses</option>
          <option value="not_tested">Not Tested</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
          <option value="na">N/A</option>
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className={`text-xs px-2 py-1 rounded-lg border ${t.inputCls}`}
        >
          <option value="all">All sections</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.title.slice(0, 30)}</option>)}
        </select>
        <button
          onClick={() => setMobileOnly(v => !v)}
          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors ${
            mobileOnly
              ? 'bg-teal-500/15 text-teal-700 border-teal-400/30'
              : t.isDark ? 'text-white/40 border-white/10 hover:text-white/60' : 'text-gray-400 border-gray-200 hover:text-gray-600'
          }`}
        >
          <Smartphone className="w-3 h-3" /> 📱 only
        </button>
        {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' || mobileOnly) && (
          <button onClick={() => { setSearchQuery(''); setStatusFilter('all'); setCategoryFilter('all'); setMobileOnly(false); }}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${t.textFaint} hover:text-red-500 transition-colors`}>
            <RotateCcw className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* ── Category accordions ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        {filteredCategories.length === 0 && (
          <p className={`text-center py-10 text-sm ${t.textFaint}`}>No items match the current filters.</p>
        )}
        {filteredCategories.map(cat => {
          const prog  = catProgress(cat);
          const open  = expandedCats.has(cat.id);
          const hasF  = prog.fail > 0;
          const allP  = prog.pass === prog.total;
          return (
            <div key={cat.id} className={`rounded-xl border overflow-hidden ${t.card} ${t.border}`}>
              {/* Category header */}
              <button
                onClick={() => toggleCat(cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  t.isDark ? 'hover:bg-white/4' : 'hover:bg-gray-50'
                }`}
              >
                {open ? <ChevronDown className={`w-4 h-4 shrink-0 ${t.textFaint}`} /> : <ChevronRight className={`w-4 h-4 shrink-0 ${t.textFaint}`} />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${t.text}`}>{cat.title}</span>
                    {allP && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-400/30 px-1.5 py-0.5 rounded-full">ALL PASS</span>}
                    {hasF && <span className="text-[10px] font-bold text-red-600 bg-red-500/10 border border-red-400/30 px-1.5 py-0.5 rounded-full">{prog.fail} FAIL</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`h-1 w-28 rounded-full overflow-hidden ${t.isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                      <div className="h-full flex">
                        <div className="bg-emerald-500" style={{ width: `${(prog.pass / prog.total) * 100}%` }} />
                        <div className="bg-red-500"     style={{ width: `${(prog.fail / prog.total) * 100}%` }} />
                      </div>
                    </div>
                    <span className={`text-[10px] ${t.textFaint}`}>{prog.pass}/{prog.total}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-mono shrink-0 ${t.textFaint}`}>{cat.items.length} items</span>
              </button>

              {/* Items */}
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className={`divide-y ${t.isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                      {cat.items.map(item => {
                        const r       = results[item.id] || { status: 'not_tested' as QaItemStatus, notes: '' };
                        const status  = r.status;
                        const cfg     = STATUS_CONFIG[status];
                        const itemOpen = expandedItems.has(item.id);

                        return (
                          <div key={item.id} className={status === 'fail' ? (t.isDark ? 'bg-red-500/5' : 'bg-red-50/50') : ''}>
                            {/* Item row */}
                            <div className="flex items-start gap-3 px-4 py-2.5">
                              {/* ID */}
                              <span className={`w-8 shrink-0 text-[10px] font-mono pt-0.5 ${t.textFaint}`}>{item.id}</span>

                              {/* Area + check (click to expand notes) */}
                              <button
                                onClick={() => toggleItem(item.id)}
                                className="flex-1 text-left min-w-0"
                              >
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-xs font-medium ${t.text}`}>{item.area}</span>
                                  {item.modes.map(m => (
                                    <span key={m} className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded border ${MODE_BADGE[m].cls}`}>
                                      {MODE_BADGE[m].label}
                                    </span>
                                  ))}
                                  {itemOpen ? <ChevronDown className={`w-3 h-3 ${t.textFaint}`} /> : <ChevronRight className={`w-3 h-3 ${t.textFaint}`} />}
                                </div>
                                <p className={`text-[11px] mt-0.5 leading-snug ${t.textFaint}`}>{item.check}</p>
                              </button>

                              {/* Status selector */}
                              <div className="shrink-0 flex items-center gap-2">
                                <span className={cfg.cls}>{cfg.icon}</span>
                                <select
                                  value={status}
                                  onChange={e => updateResult(item.id, { status: e.target.value as QaItemStatus })}
                                  className={`text-[11px] px-2 py-1 rounded-lg border ${t.inputCls}`}
                                >
                                  <option value="not_tested">Not Tested</option>
                                  <option value="pass">Pass ✅</option>
                                  <option value="fail">Fail ❌</option>
                                  <option value="na">N/A</option>
                                </select>
                              </div>
                            </div>

                            {/* Expanded notes area */}
                            <AnimatePresence initial={false}>
                              {itemOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="overflow-hidden"
                                >
                                  <div className={`mx-4 mb-3 px-3 py-2 rounded-xl border ${t.isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-100'}`}>
                                    {item.note && (
                                      <p className={`text-[10px] italic mb-2 ${t.textFaint}`}>ℹ️ {item.note}</p>
                                    )}
                                    <textarea
                                      value={r.notes}
                                      onChange={e => updateResult(item.id, { notes: e.target.value })}
                                      placeholder="Notes (describe symptom if Fail, e.g. 'white text on white bg on main-nav')…"
                                      rows={2}
                                      className={`w-full text-xs bg-transparent outline-none resize-none placeholder:text-gray-400 ${t.text}`}
                                    />
                                    {r.testedAt && (
                                      <p className={`text-[9px] mt-1 ${t.textFaint}`}>
                                        Last updated {new Date(r.testedAt).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── Failure escalation reminder ────────────────────────────────────────── */}
      {stats.fail > 0 && (
        <div className={`p-4 rounded-xl border text-xs space-y-1 ${
          t.isDark ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <p className="font-semibold">⚠️ {stats.fail} failing item{stats.fail !== 1 ? 's' : ''} — escalation procedure:</p>
          <p>1. Note the component name, className string, and exact symptom in the item Notes field.</p>
          <p>2. Dashboard/employee portal → fix in <code>dashboard-light.css</code>. Public pages → <code>web-light.css</code>. Inline styles → component-level <code>isDark</code> conditional.</p>
          <p>3. Re-run the specific item and mark Pass once resolved.</p>
        </div>
      )}
    </div>
  );
}
