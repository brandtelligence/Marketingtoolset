/**
 * ChannelDashboardPage  —  /app/modules/:key
 * ─────────────────────────────────────────────────────────────────────────────
 * Dynamic dashboard for each marketing channel module.
 * Renders channel-specific KPIs, quick actions, feature list, and recent activity.
 *
 * Supported channels: seo, sem, email, content, display, affiliate, video,
 * mobile, programmatic, influencer.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft, TrendingUp, TrendingDown, Zap, Sparkles, BarChart3,
  Target, Search, Mail, PenLine, Layers, Link2, Film, Smartphone,
  Bot, Star, ExternalLink, ChevronRight, Loader2, AlertTriangle,
  CheckCircle, Clock, Eye, MousePointerClick, DollarSign, Users,
  Globe, FileText, Video, Share2, MessageSquare, Bell, Percent,
  Activity, Megaphone, Play, Image, Send, RefreshCw,
} from 'lucide-react';
import { BackgroundLayout } from '../../components/BackgroundLayout';
import { EmployeeNav } from '../../components/EmployeeNav';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { employeeTheme } from '../../utils/employeeTheme';
import { fetchModules, fetchFeatures, type Module, type Feature } from '../../utils/apiClient';
import { formatRM } from '../../utils/format';
import { toast } from 'sonner';
import { useSEO } from '../../hooks/useSEO';

// ── Channel configuration (KPIs, quick actions, tips) ─────────────────────────

interface ChannelKPI {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  Icon: React.ElementType;
}

interface QuickAction {
  label: string;
  description: string;
  Icon: React.ElementType;
  color: string;
  route?: string;
}

interface ChannelConfig {
  moduleKey: string;
  gradient: string;
  Icon: React.ElementType;
  kpis: ChannelKPI[];
  quickActions: QuickAction[];
  tips: string[];
}

const CHANNEL_CONFIGS: Record<string, ChannelConfig> = {
  seo_toolkit: {
    moduleKey: 'seo_toolkit',
    gradient: 'from-green-500 to-teal-500',
    Icon: Search,
    kpis: [
      { label: 'Organic Traffic', value: '24.8K', change: '+12.3%', trend: 'up', Icon: Globe },
      { label: 'Keywords Ranked', value: '342', change: '+28', trend: 'up', Icon: Target },
      { label: 'Domain Authority', value: '47', change: '+3', trend: 'up', Icon: TrendingUp },
      { label: 'Backlinks', value: '1,284', change: '+156', trend: 'up', Icon: Link2 },
    ],
    quickActions: [
      { label: 'Keyword Research', description: 'Discover high-value keywords with AI', Icon: Search, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
      { label: 'Site Audit', description: 'Run an on-page SEO health check', Icon: Activity, color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
      { label: 'Rank Tracker', description: 'Monitor SERP positions daily', Icon: BarChart3, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      { label: 'AI Content Brief', description: 'Generate SEO-optimised content briefs', Icon: Sparkles, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', route: '/app/content' },
    ],
    tips: [
      'Focus on long-tail keywords with low competition and high intent for quicker wins.',
      'Update existing content regularly — refreshed pages rank 2× faster than new ones.',
      'Build topical authority by creating content clusters around your core topics.',
    ],
  },
  sem: {
    moduleKey: 'sem',
    gradient: 'from-blue-500 to-cyan-500',
    Icon: DollarSign,
    kpis: [
      { label: 'Ad Spend', value: 'RM 8,420', change: '-5.2%', trend: 'down', Icon: DollarSign },
      { label: 'Conversions', value: '186', change: '+23.4%', trend: 'up', Icon: Target },
      { label: 'CPC', value: 'RM 2.14', change: '-18%', trend: 'up', Icon: MousePointerClick },
      { label: 'Quality Score', value: '8.2', change: '+0.4', trend: 'up', Icon: Star },
    ],
    quickActions: [
      { label: 'Campaign Builder', description: 'Create a new search ad campaign', Icon: Megaphone, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      { label: 'Ad Copy Generator', description: 'AI-powered ad copy variations', Icon: Sparkles, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', route: '/app/content' },
      { label: 'Bid Optimiser', description: 'AI-driven bid adjustments', Icon: TrendingUp, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
      { label: 'Quality Score', description: 'View and improve quality scores', Icon: BarChart3, color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
    ],
    tips: [
      'Use negative keywords aggressively — they can reduce wasted spend by 20-30%.',
      'A/B test ad copy weekly; small headline changes can improve CTR by 15%.',
      'Align landing page content exactly with ad group keywords for higher Quality Scores.',
    ],
  },
  email_marketing: {
    moduleKey: 'email_marketing',
    gradient: 'from-amber-500 to-orange-500',
    Icon: Mail,
    kpis: [
      { label: 'Open Rate', value: '34.2%', change: '+3.1%', trend: 'up', Icon: Eye },
      { label: 'Click Rate', value: '8.7%', change: '+1.2%', trend: 'up', Icon: MousePointerClick },
      { label: 'Subscribers', value: '12,480', change: '+342', trend: 'up', Icon: Users },
      { label: 'Deliverability', value: '98.6%', change: '+0.3%', trend: 'up', Icon: CheckCircle },
    ],
    quickActions: [
      { label: 'New Campaign', description: 'Build a new email campaign', Icon: Mail, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
      { label: 'Drip Sequence', description: 'Create automated email flows', Icon: RefreshCw, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
      { label: 'A/B Testing', description: 'Split-test subject lines', Icon: Target, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      { label: 'AI Templates', description: 'Generate email templates with AI', Icon: Sparkles, color: 'bg-red-500/20 text-red-400 border-red-500/30', route: '/app/content' },
    ],
    tips: [
      'Personalised subject lines increase open rates by 26% on average.',
      'Send emails between 10 AM–12 PM on Tuesdays for optimal engagement.',
      'Segment your list by engagement level — re-engage dormant subscribers with a dedicated flow.',
    ],
  },
  content_marketing: {
    moduleKey: 'content_marketing',
    gradient: 'from-indigo-500 to-violet-500',
    Icon: PenLine,
    kpis: [
      { label: 'Published', value: '28', change: '+6', trend: 'up', Icon: FileText },
      { label: 'Avg Read Time', value: '4.2m', change: '+0.8m', trend: 'up', Icon: Clock },
      { label: 'Organic Views', value: '18.5K', change: '+34%', trend: 'up', Icon: Eye },
      { label: 'Lead Gen', value: '142', change: '+18%', trend: 'up', Icon: Users },
    ],
    quickActions: [
      { label: 'Blog Generator', description: 'AI-powered blog post creation', Icon: Sparkles, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', route: '/app/content' },
      { label: 'Whitepaper Builder', description: 'Create professional whitepapers', Icon: FileText, color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
      { label: 'Editorial Calendar', description: 'Plan content across channels', Icon: Clock, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', route: '/app/campaign' },
      { label: 'SEO Scorer', description: 'Score content for SEO effectiveness', Icon: BarChart3, color: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30' },
    ],
    tips: [
      'Long-form content (2,000+ words) ranks 10× higher than short posts in organic search.',
      'Repurpose every blog post into 5+ social media pieces — maximise content ROI.',
      'Gate high-value content (whitepapers, guides) behind lead forms for lead generation.',
    ],
  },
  display_advertising: {
    moduleKey: 'display_advertising',
    gradient: 'from-rose-500 to-red-500',
    Icon: Layers,
    kpis: [
      { label: 'Impressions', value: '1.2M', change: '+18%', trend: 'up', Icon: Eye },
      { label: 'CTR', value: '0.42%', change: '+0.08%', trend: 'up', Icon: MousePointerClick },
      { label: 'Conversions', value: '284', change: '+22%', trend: 'up', Icon: Target },
      { label: 'CPM', value: 'RM 4.80', change: '-12%', trend: 'up', Icon: DollarSign },
    ],
    quickActions: [
      { label: 'Banner Generator', description: 'Create ad banners with AI', Icon: Image, color: 'bg-rose-500/20 text-rose-400 border-rose-500/30', route: '/app/content' },
      { label: 'Audience Builder', description: 'Define targeting segments', Icon: Users, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
      { label: 'Retargeting', description: 'Manage retargeting pixels', Icon: RefreshCw, color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
      { label: 'A/B Creative', description: 'Test banner variations', Icon: Target, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    ],
    tips: [
      'Use responsive display ads — they auto-adjust size and reach 90% more inventory.',
      'Retargeting campaigns convert 70% higher than cold audience campaigns.',
      'Refresh ad creatives every 2 weeks to prevent banner fatigue.',
    ],
  },
  affiliate_marketing: {
    moduleKey: 'affiliate_marketing',
    gradient: 'from-emerald-500 to-green-500',
    Icon: Link2,
    kpis: [
      { label: 'Active Partners', value: '48', change: '+8', trend: 'up', Icon: Users },
      { label: 'Revenue', value: 'RM 32.4K', change: '+28%', trend: 'up', Icon: DollarSign },
      { label: 'Conversion Rate', value: '6.8%', change: '+1.1%', trend: 'up', Icon: Percent },
      { label: 'Avg Commission', value: 'RM 124', change: '+RM 18', trend: 'up', Icon: TrendingUp },
    ],
    quickActions: [
      { label: 'Partner Portal', description: 'Manage affiliate partners', Icon: Users, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      { label: 'Link Generator', description: 'Create tracked affiliate links', Icon: Link2, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
      { label: 'Commission Report', description: 'View commission payouts', Icon: BarChart3, color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
      { label: 'Promo Materials', description: 'Generate partner content with AI', Icon: Sparkles, color: 'bg-lime-500/20 text-lime-400 border-lime-500/30', route: '/app/content' },
    ],
    tips: [
      'Top-performing affiliates generate 80% of programme revenue — nurture your top 10.',
      'Offer tiered commissions to incentivise higher-volume partners.',
      'Provide partners with pre-made creatives and landing pages to boost conversions.',
    ],
  },
  video_marketing: {
    moduleKey: 'video_marketing',
    gradient: 'from-red-500 to-pink-500',
    Icon: Film,
    kpis: [
      { label: 'Total Views', value: '156K', change: '+42%', trend: 'up', Icon: Play },
      { label: 'Watch Time', value: '2,340h', change: '+28%', trend: 'up', Icon: Clock },
      { label: 'Subscribers', value: '4,280', change: '+380', trend: 'up', Icon: Users },
      { label: 'Engagement', value: '8.4%', change: '+1.6%', trend: 'up', Icon: MessageSquare },
    ],
    quickActions: [
      { label: 'Script Writer', description: 'AI video script generation', Icon: Sparkles, color: 'bg-red-500/20 text-red-400 border-red-500/30', route: '/app/content' },
      { label: 'Thumbnail Gen', description: 'Create click-worthy thumbnails', Icon: Image, color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
      { label: 'Video SEO', description: 'Optimise tags, titles & descriptions', Icon: Search, color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
      { label: 'Performance', description: 'View video analytics', Icon: BarChart3, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    ],
    tips: [
      'The first 3 seconds determine if viewers stay — hook them immediately.',
      'Add captions to all videos — 85% of social video is watched without sound.',
      'YouTube Shorts and TikTok drive 3× more reach than long-form for brand awareness.',
    ],
  },
  mobile_marketing: {
    moduleKey: 'mobile_marketing',
    gradient: 'from-sky-500 to-blue-500',
    Icon: Smartphone,
    kpis: [
      { label: 'SMS Delivered', value: '45.2K', change: '+15%', trend: 'up', Icon: Send },
      { label: 'Push Opens', value: '12.8K', change: '+22%', trend: 'up', Icon: Bell },
      { label: 'App Installs', value: '2,140', change: '+340', trend: 'up', Icon: Smartphone },
      { label: 'In-App CTR', value: '3.2%', change: '+0.6%', trend: 'up', Icon: MousePointerClick },
    ],
    quickActions: [
      { label: 'SMS Campaign', description: 'Build and send bulk SMS', Icon: Send, color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
      { label: 'Push Notifications', description: 'Create push notification campaigns', Icon: Bell, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      { label: 'In-App Ads', description: 'Design in-app ad placements', Icon: Layers, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
      { label: 'AI Copy', description: 'Generate mobile-optimised copy', Icon: Sparkles, color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', route: '/app/content' },
    ],
    tips: [
      'SMS has a 98% open rate — use it for time-sensitive promotions and flash sales.',
      'Personalise push notifications with user name and preferences for 4× higher opens.',
      'Test different send times — mobile engagement peaks at 8 AM, 12 PM, and 8 PM.',
    ],
  },
  programmatic_ads: {
    moduleKey: 'programmatic_ads',
    gradient: 'from-violet-500 to-purple-500',
    Icon: Bot,
    kpis: [
      { label: 'Ad Spend', value: 'RM 18.6K', change: '-8%', trend: 'up', Icon: DollarSign },
      { label: 'Impressions', value: '4.8M', change: '+32%', trend: 'up', Icon: Eye },
      { label: 'Viewability', value: '72%', change: '+5%', trend: 'up', Icon: CheckCircle },
      { label: 'ROAS', value: '4.2×', change: '+0.6×', trend: 'up', Icon: TrendingUp },
    ],
    quickActions: [
      { label: 'DSP Manager', description: 'Connect and manage DSPs', Icon: Globe, color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
      { label: 'RTB Dashboard', description: 'Monitor real-time bidding', Icon: Activity, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      { label: 'Audience Segments', description: 'Build targeting segments', Icon: Users, color: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30' },
      { label: 'AI Optimisation', description: 'AI-driven campaign optimisation', Icon: Sparkles, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
    ],
    tips: [
      'Set frequency caps at 3-5 impressions per user per day to prevent ad fatigue.',
      'Use contextual targeting alongside behavioural for better brand safety.',
      'Header bidding setups can increase yield by 20-40% over waterfall setups.',
    ],
  },
  influencer: {
    moduleKey: 'influencer',
    gradient: 'from-yellow-500 to-amber-500',
    Icon: Star,
    kpis: [
      { label: 'Active Campaigns', value: '12', change: '+3', trend: 'up', Icon: Megaphone },
      { label: 'Total Reach', value: '2.4M', change: '+45%', trend: 'up', Icon: Users },
      { label: 'Engagement', value: '6.8%', change: '+1.2%', trend: 'up', Icon: MessageSquare },
      { label: 'EMV', value: 'RM 84K', change: '+38%', trend: 'up', Icon: DollarSign },
    ],
    quickActions: [
      { label: 'Discovery', description: 'Find influencers by niche and reach', Icon: Search, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      { label: 'Campaign Brief', description: 'Create structured campaign briefs', Icon: FileText, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
      { label: 'ROI Tracker', description: 'Measure influencer campaign ROI', Icon: BarChart3, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
      { label: 'AI Brief Gen', description: 'Generate briefs with AI', Icon: Sparkles, color: 'bg-red-500/20 text-red-400 border-red-500/30', route: '/app/content' },
    ],
    tips: [
      'Micro-influencers (10K–100K followers) often deliver 3× higher engagement than mega-influencers.',
      'Always negotiate usage rights upfront — repurposing UGC in ads can boost ROAS by 50%.',
      'Track EMV (Earned Media Value) per influencer to identify your top performers.',
    ],
  },
};

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KPICard({ kpi, isDark, et }: { kpi: ChannelKPI; isDark: boolean; et: ReturnType<typeof employeeTheme> }) {
  const Icon = kpi.Icon;
  return (
    <div
      className={`rounded-2xl p-4 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200 shadow-sm'}`}
      role="group"
      aria-label={`${kpi.label}: ${kpi.value}, ${kpi.change}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-gray-100'}`} aria-hidden="true">
          <Icon className={`w-4.5 h-4.5 ${isDark ? 'text-white/60' : 'text-gray-500'}`} />
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${
          kpi.trend === 'up' ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : kpi.trend === 'down' ? (isDark ? 'text-red-400' : 'text-red-600') : et.textFaint
        }`} aria-label={`Trend: ${kpi.change}`}>
          {kpi.trend === 'up' ? <TrendingUp className="w-3 h-3" aria-hidden="true" /> : kpi.trend === 'down' ? <TrendingDown className="w-3 h-3" aria-hidden="true" /> : null}
          {kpi.change}
        </div>
      </div>
      <p className={`text-2xl font-bold ${et.text}`}>{kpi.value}</p>
      <p className={`text-xs mt-0.5 ${et.textMd}`}>{kpi.label}</p>
    </div>
  );
}

// ── Quick Action Card ──────────────────────────────────────────────────────────

function ActionCard({
  action, isDark, et, navigate,
}: {
  action: QuickAction; isDark: boolean; et: ReturnType<typeof employeeTheme>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const Icon = action.Icon;
  // In light mode, remap the color tokens to higher-contrast equivalents
  const colorCls = isDark ? action.color : action.color
    .replace(/text-(green|teal|emerald|cyan|blue|indigo|sky|violet|purple|fuchsia|red|rose|pink|amber|orange|yellow|lime)-400/g, 'text-$1-600')
    .replace(/bg-([\w]+)-500\/20/g, 'bg-$1-100')
    .replace(/border-([\w]+)-500\/30/g, 'border-$1-300');
  return (
    <button
      onClick={() => {
        if (action.route) navigate(action.route);
        else toast.info(`${action.label} — launching soon!`);
      }}
      className={`group w-full text-left rounded-xl p-4 border transition-all ${
        isDark
          ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
      }`}
      aria-label={`${action.label}: ${action.description}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${colorCls}`} aria-hidden="true">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${et.text} flex items-center gap-1`}>
            {action.label}
            {action.route && <ExternalLink className={`w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ${et.textFaint}`} aria-hidden="true" />}
          </p>
          <p className={`text-xs mt-0.5 ${et.textMd}`}>{action.description}</p>
        </div>
        <ChevronRight className={`w-4 h-4 mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${et.textFaint}`} aria-hidden="true" />
      </div>
    </button>
  );
}

// ── Feature row ────────────────────────────────────────────────────────────────

function FeatureRow({ f, isDark, et }: { f: Feature; isDark: boolean; et: ReturnType<typeof employeeTheme> }) {
  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}
      role="listitem"
      aria-label={`${f.name} — ${f.globalEnabled ? 'enabled' : 'disabled'}, ${f.rolloutNote}`}
    >
      <Zap className={`w-3.5 h-3.5 shrink-0 ${f.globalEnabled ? 'text-teal-400' : isDark ? 'text-white/25' : 'text-gray-300'}`} aria-hidden="true" />
      <span className={`text-sm flex-1 ${et.text}`}>{f.name}</span>
      <span className={`text-[0.65rem] px-2 py-0.5 rounded-full ${
        f.globalEnabled
          ? isDark ? 'bg-teal-500/15 text-teal-300 border border-teal-500/25' : 'bg-teal-50 text-teal-700 border border-teal-200'
          : isDark ? 'bg-white/5 text-white/30 border border-white/10' : 'bg-gray-50 text-gray-400 border border-gray-200'
      }`}>
        {f.rolloutNote}
      </span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function ChannelDashboardPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);

  const [modules, setModules] = useState<Module[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchModules(), fetchFeatures()])
      .then(([m, f]) => { setModules(m); setFeatures(f); })
      .catch(err => toast.error(`Failed to load: ${err.message}`))
      .finally(() => setLoading(false));
  }, []);

  const config = key ? CHANNEL_CONFIGS[key] : null;
  const module = modules.find(m => m.key === key);
  const moduleFeatures = features.filter(f => f.moduleId === module?.id);

  // SEO — internal page, noindex
  useSEO({
    title:       module ? `${module.name} Dashboard` : 'Channel Dashboard',
    description: module?.description ?? 'Marketing channel module dashboard with KPIs, quick actions, and AI-powered tips.',
    noindex:     true,
  });

  if (loading) {
    return (
      <BackgroundLayout>
        <EmployeeNav />
        <div className={`flex items-center justify-center py-32 ${et.textFaint}`}>
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading module…
        </div>
      </BackgroundLayout>
    );
  }

  if (!config || !module) {
    return (
      <BackgroundLayout>
        <EmployeeNav />
        <div className="px-4 py-12 max-w-3xl mx-auto text-center">
          <AlertTriangle className={`w-12 h-12 mx-auto mb-4 ${et.textFaint}`} />
          <h2 className={`text-lg font-semibold mb-2 ${et.text}`}>Module Not Found</h2>
          <p className={`text-sm mb-6 ${et.textMd}`}>
            The module "{key}" doesn't have a dashboard yet or doesn't exist.
          </p>
          <button
            onClick={() => navigate('/app/modules')}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: '#0BA4AA' }}
          >
            Back to Modules
          </button>
        </div>
      </BackgroundLayout>
    );
  }

  const ChannelIcon = config.Icon;

  return (
    <BackgroundLayout>
      <EmployeeNav />
      <div className="px-4 py-6 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

          {/* ── Back + Header ────────────────────────────────────────── */}
          <button
            onClick={() => navigate('/app/modules')}
            className={`flex items-center gap-1.5 text-xs mb-4 transition-colors ${isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Modules
          </button>

          <div className="flex items-start gap-4 mb-8">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shrink-0 shadow-lg`}>
              <ChannelIcon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className={`text-2xl font-bold ${et.text}`}>{module.name}</h1>
              <p className={`text-sm mt-1 ${et.textMd}`}>{module.description}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-teal-50 text-teal-700 border border-teal-200'}`}>
                  RM {formatRM(module.basePrice)}/mo
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-white/10 text-white/50 border border-white/15' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                  {moduleFeatures.length} features
                </span>
              </div>
            </div>
          </div>

          {/* ── KPI Grid ─────────────────────────────────────────────── */}
          <section className="mb-8" aria-labelledby="kpi-heading">
            <h2 id="kpi-heading" className={`text-xs uppercase tracking-wider font-semibold mb-3 flex items-center gap-2 ${et.textMd}`}>
              <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" /> Key Metrics
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" role="group" aria-label="Key performance indicators">
              {config.kpis.map((kpi, i) => (
                <KPICard key={i} kpi={kpi} isDark={isDark} et={et} />
              ))}
            </div>
          </section>

          {/* ── Quick Actions + Features ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            {/* Quick Actions */}
            <section className="lg:col-span-3" aria-labelledby="actions-heading">
              <h2 id="actions-heading" className={`text-xs uppercase tracking-wider font-semibold mb-3 flex items-center gap-2 ${et.textMd}`}>
                <Sparkles className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" /> Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Quick actions">
                {config.quickActions.map((action, i) => (
                  <ActionCard key={i} action={action} isDark={isDark} et={et} navigate={navigate} />
                ))}
              </div>
            </section>

            {/* Features list */}
            <section className="lg:col-span-2" aria-labelledby="features-heading">
              <h2 id="features-heading" className={`text-xs uppercase tracking-wider font-semibold mb-3 flex items-center gap-2 ${et.textMd}`}>
                <Zap className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" /> Module Features
              </h2>
              <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                {moduleFeatures.length > 0 ? (
                  <div className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`} role="list" aria-label="Module features">
                    {moduleFeatures.map(f => (
                      <FeatureRow key={f.id} f={f} isDark={isDark} et={et} />
                    ))}
                  </div>
                ) : (
                  <div className={`p-6 text-center text-sm ${et.textFaint}`}>
                    No features configured yet.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ── AI Tips ───────────────────────────────────────────────── */}
          <section className="mb-8" aria-labelledby="tips-heading">
            <h2 id="tips-heading" className={`text-xs uppercase tracking-wider font-semibold mb-3 flex items-center gap-2 ${et.textMd}`}>
              <Sparkles className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" /> AI-Powered Tips
            </h2>
            <div className={`rounded-2xl p-5 space-y-3 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200 shadow-sm'}`} role="list" aria-label="AI-powered tips">
              {config.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3" role="listitem">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.6rem] font-bold shrink-0 mt-0.5 bg-gradient-to-br ${config.gradient} text-white`} aria-hidden="true">
                    {i + 1}
                  </span>
                  <p className={`text-sm leading-relaxed ${et.textSm}`}>{tip}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── CTA to AI Studio ──────────────────────────────────────── */}
          <div className={`rounded-2xl p-6 text-center ${isDark ? 'bg-gradient-to-br from-[#0BA4AA]/20 to-purple-600/20 border border-[#0BA4AA]/25' : 'bg-gradient-to-br from-teal-50 to-indigo-50 border border-teal-200'}`}>
            <Sparkles className={`w-8 h-8 mx-auto mb-3 ${isDark ? 'text-teal-300' : 'text-teal-600'}`} />
            <h3 className={`font-semibold mb-1 ${et.text}`}>Ready to Create?</h3>
            <p className={`text-sm mb-4 ${et.textMd}`}>
              Head to the AI Studio to generate {module.name.toLowerCase()} content powered by GPT-4o.
            </p>
            <button
              onClick={() => navigate('/app/content')}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:scale-105"
              style={{ background: '#0BA4AA' }}
            >
              Open AI Studio
            </button>
          </div>

        </motion.div>
      </div>
    </BackgroundLayout>
  );
}