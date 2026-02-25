import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

/**
 * LandingDashboard — CSS-crafted browser mockup showcasing the platform.
 * Three tab views: Analytics · Social Media · AI Content Studio
 * No real screenshots needed — 100% styled with Tailwind + motion.
 */

// ── Analytics View ──────────────────────────────────────────────────────────

function AnalyticsView() {
  const kpis = [
    { label: 'Total Reach', value: '124.5K', change: '+23.4%', color: 'text-purple-300', bg: 'bg-purple-500/15 border-purple-500/25' },
    { label: 'Engagement Rate', value: '8.4%', change: '+5.1%', color: 'text-teal-300', bg: 'bg-teal-500/15 border-teal-500/25' },
    { label: 'Leads Generated', value: '342', change: '+18.2%', color: 'text-orange-300', bg: 'bg-orange-500/15 border-orange-500/25' },
    { label: 'ROAS', value: '4.2×', change: '+12.0%', color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/25' },
  ];

  const bars = [
    { label: 'Instagram', pct: 88, color: 'from-pink-500 to-purple-500' },
    { label: 'Facebook', pct: 64, color: 'from-blue-600 to-blue-400' },
    { label: 'LinkedIn', pct: 51, color: 'from-blue-700 to-cyan-500' },
    { label: 'TikTok', pct: 95, color: 'from-purple-500 to-pink-400' },
    { label: 'Email', pct: 72, color: 'from-teal-500 to-emerald-400' },
  ];

  const topCampaigns = [
    { name: 'Q2 Product Launch', reach: '48.2K', conv: '124', status: 'active' },
    { name: 'Hari Raya Campaign', reach: '38.7K', conv: '98', status: 'ended' },
    { name: 'Brand Awareness Apr', reach: '22.1K', conv: '67', status: 'active' },
  ];

  return (
    <div className="p-3 sm:p-4 space-y-3">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {kpis.map((k, i) => (
          <div key={i} className={`border rounded-xl p-2.5 ${k.bg}`}>
            <p className="text-white/40 text-[0.58rem] uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`font-bold text-sm sm:text-base ${k.color}`}>{k.value}</p>
            <p className="text-emerald-400 text-[0.58rem] mt-0.5">↑ {k.change} vs last month</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {/* Bar chart */}
        <div className="sm:col-span-3 bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-white/50 text-[0.62rem] uppercase tracking-wider mb-3 font-semibold">Platform Performance</p>
          <div className="space-y-2.5">
            {bars.map((bar, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-white/40 text-[0.58rem] w-14 text-right shrink-0">{bar.label}</span>
                <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${bar.pct}%` }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                    className={`h-2 rounded-full bg-gradient-to-r ${bar.color}`}
                  />
                </div>
                <span className="text-white/50 text-[0.58rem] w-7 shrink-0">{bar.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top campaigns */}
        <div className="sm:col-span-2 bg-white/5 border border-white/10 rounded-xl p-3">
          <p className="text-white/50 text-[0.62rem] uppercase tracking-wider mb-3 font-semibold">Top Campaigns</p>
          <div className="space-y-2">
            {topCampaigns.map((c, i) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white/80 text-[0.62rem] font-medium truncate">{c.name}</p>
                  <p className="text-white/35 text-[0.55rem]">Reach: {c.reach} · Conv: {c.conv}</p>
                </div>
                <span className={`text-[0.52rem] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                  c.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-white/10 text-white/40'
                }`}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Social Media View ────────────────────────────────────────────────────────

function SocialView() {
  const platforms = [
    { emoji: '📸', name: 'Instagram', followers: '12.4K', growth: '+234', color: 'bg-pink-500/20 border-pink-500/30' },
    { emoji: '👥', name: 'Facebook', followers: '8.9K', growth: '+89', color: 'bg-blue-500/20 border-blue-500/30' },
    { emoji: '💼', name: 'LinkedIn', followers: '3.2K', growth: '+156', color: 'bg-blue-700/20 border-blue-700/30' },
    { emoji: '🎵', name: 'TikTok', followers: '21.7K', growth: '+1.2K', color: 'bg-purple-500/20 border-purple-500/30' },
  ];

  const posts = [
    {
      platform: '📸', platformName: 'Instagram',
      text: 'Exciting news! Our new AI-powered feature suite is finally here. Your social media workflow will never be the same…',
      time: 'Today · 10:00 AM', status: 'scheduled', sColor: 'bg-purple-500/15 text-purple-300',
    },
    {
      platform: '💼', platformName: 'LinkedIn',
      text: 'We\'re proud to share our Q1 case study: how Acme Corp tripled their content output in 60 days using Brandtelligence.',
      time: 'Today · 2:30 PM', status: 'approved', sColor: 'bg-emerald-500/15 text-emerald-400',
    },
    {
      platform: '👥', platformName: 'Facebook',
      text: 'Join us this Friday for a live Q&A with our marketing team. Drop your questions in the comments below!',
      time: 'Tomorrow · 9:00 AM', status: 'draft', sColor: 'bg-white/10 text-white/40',
    },
  ];

  return (
    <div className="p-3 sm:p-4 space-y-3">
      {/* Platform stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {platforms.map((p, i) => (
          <div key={i} className={`border rounded-xl p-2.5 text-center ${p.color}`}>
            <span className="text-lg">{p.emoji}</span>
            <p className="text-white font-bold text-sm mt-1">{p.followers}</p>
            <p className="text-white/40 text-[0.58rem]">{p.name}</p>
            <p className="text-emerald-400 text-[0.58rem] mt-0.5">{p.growth} this week</p>
          </div>
        ))}
      </div>

      {/* Scheduled posts */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/50 text-[0.62rem] uppercase tracking-wider font-semibold">Post Queue</p>
          <span className="text-[0.58rem] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">3 pending</span>
        </div>
        <div className="space-y-2">
          {posts.map((post, i) => (
            <div key={i} className="flex items-start gap-2.5 p-2.5 bg-white/3 border border-white/8 rounded-xl">
              <span className="text-base shrink-0 mt-0.5">{post.platform}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-white/40 text-[0.55rem]">{post.platformName}</span>
                  <span className="text-white/20 text-[0.55rem]">·</span>
                  <span className="text-white/35 text-[0.55rem]">{post.time}</span>
                </div>
                <p className="text-white/75 text-[0.62rem] leading-relaxed line-clamp-2">{post.text}</p>
              </div>
              <span className={`text-[0.52rem] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${post.sColor}`}>
                {post.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AI Content View ──────────────────────────────────────────────────────────

function AIContentView() {
  const items = [
    {
      type: 'Instagram Caption',
      preview: '✨ Big things are coming! Stay tuned as we unveil our game-changing new platform helping ambitious SMEs achieve 3× content output in half the time. Ready to transform your marketing? #Brandtelligence #DigitalMarketing #SME',
      status: 'approved', statusIcon: CheckCircle, statusColor: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25',
      aiScore: '94%', scoreColor: 'text-emerald-300',
    },
    {
      type: 'Facebook Post',
      preview: 'Exciting announcement! We\'re thrilled to share that our AI-powered platform has now helped 200+ SMEs worldwide achieve more with less. Here\'s how the magic works: one platform, 18 modules, zero tab-switching…',
      status: 'pending', statusIcon: Clock, statusColor: 'text-amber-400 bg-amber-500/15 border-amber-500/25',
      aiScore: '87%', scoreColor: 'text-amber-300',
    },
    {
      type: 'LinkedIn Article Intro',
      preview: 'The Hidden Cost of Fragmented Marketing: Why SMEs Overpay for Underperformance. A data-driven analysis of how consolidating your marketing stack could save you RM 7,000 or more every month…',
      status: 'review', statusIcon: AlertCircle, statusColor: 'text-blue-400 bg-blue-500/15 border-blue-500/25',
      aiScore: '91%', scoreColor: 'text-blue-300',
    },
  ];

  return (
    <div className="p-3 sm:p-4 space-y-3">
      {/* Prompt area */}
      <div className="bg-white/5 border border-purple-500/30 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white/50 text-[0.62rem] uppercase tracking-wider font-semibold">Active Prompt</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[0.55rem] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">GPT-4o</span>
            <span className="text-[0.55rem] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30">Brand Voice ON</span>
          </div>
        </div>
        <p className="text-white/65 text-[0.62rem] italic leading-relaxed">
          "Write a series of social posts announcing our new platform features. Tone: professional yet approachable.
          Target: SME business owners aged 28–45. Include a soft CTA. Generate 3 variations."
        </p>
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          {['3 Variations', 'Auto-hashtags', 'SEO Optimised', 'Approval Flow'].map(tag => (
            <span key={tag} className="text-[0.55rem] bg-white/8 text-white/50 px-2 py-0.5 rounded-full border border-white/10">{tag}</span>
          ))}
        </div>
      </div>

      {/* Generated content cards */}
      <div className="space-y-2">
        {items.map((item, i) => {
          const StatusIcon = item.statusIcon;
          return (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-[0.62rem] font-semibold">{item.type}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[0.58rem] font-semibold ${item.scoreColor}`}>
                    AI Score: {item.aiScore}
                  </span>
                  <span className={`flex items-center gap-1 text-[0.52rem] font-bold px-1.5 py-0.5 rounded-full border ${item.statusColor}`}>
                    <StatusIcon className="w-2.5 h-2.5" />
                    {item.status}
                  </span>
                </div>
              </div>
              <p className="text-white/60 text-[0.62rem] leading-relaxed line-clamp-2">{item.preview}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Export ──────────────────────────────────────────────────────────────

const TABS = [
  { label: '📊 Analytics', view: 'analytics' },
  { label: '📱 Social Media', view: 'social' },
  { label: '✨ AI Content', view: 'ai' },
];

const SIDEBAR_ITEMS = [
  { emoji: '📊', label: 'Analytics' },
  { emoji: '📱', label: 'Social' },
  { emoji: '✨', label: 'AI Studio' },
  { emoji: '📧', label: 'Email' },
  { emoji: '🔍', label: 'SEO' },
  { emoji: '💰', label: 'SEM' },
  { emoji: '📝', label: 'Content' },
  { emoji: '🪪', label: 'vCard' },
];

export function LandingDashboard() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20 md:py-24">
      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-3 block"
          >
            Platform Preview
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-white font-bold mb-4"
            style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)' }}
          >
            Everything Your Team Needs,{' '}
            <span className="bg-gradient-to-r from-teal-400 to-purple-400 bg-clip-text text-transparent">
              One Place to Find It
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed"
          >
            A unified workspace where your entire marketing operation lives — real-time analytics,
            social scheduling, and AI-generated content, all under one roof.
          </motion.p>
        </div>

        {/* Browser mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-2xl">

            {/* Browser title bar */}
            <div className="bg-black/30 border-b border-white/10 px-4 py-2.5 flex items-center gap-3">
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
              </div>
              <div className="flex-1 bg-white/8 border border-white/12 rounded-lg px-3 py-1 text-white/35 text-[0.62rem] flex items-center gap-1.5">
                🔒 <span>brandtelligence.com.my/dashboard</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center">
                  <span className="text-[0.5rem] font-bold text-white">JL</span>
                </div>
              </div>
            </div>

            {/* App layout */}
            <div className="flex">

              {/* Sidebar */}
              <div className="hidden sm:flex flex-col w-14 bg-black/20 border-r border-white/8 py-3 gap-1 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-teal-500 flex items-center justify-center mx-auto mb-3">
                  <span className="text-[0.6rem] font-bold text-white">B</span>
                </div>
                {SIDEBAR_ITEMS.map((item, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg mx-1 cursor-pointer transition-all ${
                      i === activeTab ? 'bg-purple-500/25' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className="text-xs leading-none">{item.emoji}</span>
                    <span className="text-[0.42rem] text-white/40 leading-none">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                {/* Module tabs */}
                <div className="bg-black/15 border-b border-white/8 px-2 sm:px-3 flex gap-0.5 overflow-x-auto">
                  {TABS.map((tab, i) => (
                    <button
                      key={tab.label}
                      onClick={() => setActiveTab(i)}
                      className={`px-3 sm:px-4 py-2.5 text-[0.62rem] font-medium whitespace-nowrap border-b-2 transition-all ${
                        activeTab === i
                          ? 'border-purple-400 text-purple-300'
                          : 'border-transparent text-white/35 hover:text-white/65'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* View content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === 0 && <AnalyticsView />}
                    {activeTab === 1 && <SocialView />}
                    {activeTab === 2 && <AIContentView />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Caption */}
          <p className="text-center text-white/35 text-xs mt-4">
            Interactive preview of the Brandtelligence portal — switch tabs to explore modules
          </p>
        </motion.div>
      </div>
    </section>
  );
}