/**
 * WebBlogPage — Blog listing with article preview
 */
import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { Search, ArrowRight, Clock, BookOpen } from 'lucide-react';

function fadeUp(delay = 0) {
  return { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.45, delay } };
}

const CATEGORIES = ['All', 'AI Marketing', 'Analytics', 'Growth', 'Brand Strategy', 'Case Studies', 'Product Updates'];

const POSTS = [
  {
    slug: '10-ai-prompts-marketing-2025',
    category: 'AI Marketing',
    title: '10 AI Prompts Every Marketing Manager Should Use in 2025',
    excerpt: 'The difference between average and exceptional AI content output comes down to how you write your prompts. Here are the 10 structures our team uses daily.',
    date: 'Jan 15, 2025',
    readTime: '7 min',
    author: 'Amara Hassan',
    authorInitial: 'A',
    featured: true,
    gradient: 'from-bt-orange/25 to-bt-orange/10',
  },
  {
    slug: 'utm-tracking-best-practices-2025',
    category: 'Analytics',
    title: 'UTM Tracking Best Practices for Multi-Channel Campaigns',
    excerpt: 'Stop guessing which campaigns drive revenue. Our complete guide to UTM parameter strategy, naming conventions, and attribution modelling.',
    date: 'Jan 8, 2025',
    readTime: '5 min',
    author: 'Marcus Ng',
    authorInitial: 'M',
    featured: false,
    gradient: 'from-bt-teal/25 to-bt-teal/10',
  },
  {
    slug: 'landing-page-conversion-2025',
    category: 'Growth',
    title: 'How to Build a Landing Page That Converts: The 2025 Playbook',
    excerpt: 'We analyzed 500 landing pages across 30 industries. Here\'s what the top 10% have in common — and what you should steal immediately.',
    date: 'Dec 28, 2024',
    readTime: '9 min',
    author: 'Priya Krishnan',
    authorInitial: 'P',
    featured: false,
    gradient: 'from-bt-teal/20 to-bt-purple/15',
  },
  {
    slug: 'brand-consistency-multi-channel',
    category: 'Brand Strategy',
    title: 'Brand Consistency Across 10+ Channels: A Practical Guide',
    excerpt: 'How enterprise brands maintain visual and verbal consistency when managing dozens of channels, markets, and team members simultaneously.',
    date: 'Dec 20, 2024',
    readTime: '6 min',
    author: 'Siti Rahman',
    authorInitial: 'S',
    featured: false,
    gradient: 'from-violet-500/25 to-purple-500/10',
  },
  {
    slug: 'meridian-agency-case-study',
    category: 'Case Studies',
    title: 'How Meridian Agency Manages 30 Clients From One Dashboard',
    excerpt: 'An in-depth look at how a regional marketing agency scaled from 12 to 30 clients without adding headcount — using Brandtelligence\'s multi-tenant platform.',
    date: 'Dec 12, 2024',
    readTime: '8 min',
    author: 'Daniel Lim',
    authorInitial: 'D',
    featured: false,
    gradient: 'from-rose-500/25 to-pink-500/10',
  },
  {
    slug: 'ai-content-studio-launch',
    category: 'Product Updates',
    title: 'Introducing AI Campaign Generator: Build Full Campaigns in Minutes',
    excerpt: 'Today we\'re launching our most powerful feature yet — the AI Campaign Generator. Describe your campaign goal, and get a complete, multi-channel campaign plan in seconds.',
    date: 'Dec 5, 2024',
    readTime: '4 min',
    author: 'Amara Hassan',
    authorInitial: 'A',
    featured: false,
    gradient: 'from-amber-500/25 to-yellow-500/10',
  },
  {
    slug: 'contact-management-roi',
    category: 'Growth',
    title: 'Why Your Marketing CRM Should Be Part of Your Content Platform',
    excerpt: 'Siloed CRM data is one of the biggest blockers to personalisation at scale. Here\'s the case for a unified contact + content platform.',
    date: 'Nov 28, 2024',
    readTime: '6 min',
    author: 'James Okafor',
    authorInitial: 'J',
    featured: false,
    gradient: 'from-teal-500/20 to-cyan-500/10',
  },
  {
    slug: 'social-asset-management',
    category: 'Brand Strategy',
    title: 'The Hidden Cost of Disorganised Social Media Assets',
    excerpt: 'We asked 200 marketing managers to estimate time spent searching for assets. The answer was shocking — and avoidable.',
    date: 'Nov 18, 2024',
    readTime: '5 min',
    author: 'Siti Rahman',
    authorInitial: 'S',
    featured: false,
    gradient: 'from-indigo-500/25 to-blue-500/10',
  },
];

const authorColors: Record<string, string> = {
  A: 'from-bt-orange to-bt-orange-dark',
  M: 'from-bt-teal to-bt-teal-dark',
  P: 'from-bt-purple to-[#2d2b5a]',
  S: 'from-rose-500 to-rose-600',
  D: 'from-bt-teal to-bt-teal-dark',
  J: 'from-bt-orange to-bt-orange-dark',
};

export function WebBlogPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const featured = POSTS.find(p => p.featured);
  const filtered = POSTS.filter(p => !p.featured).filter(p => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="text-white pt-16">

      {/* Hero */}
      <section className="relative py-20 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-bt-teal/8 blur-[130px] rounded-full" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeUp(0)} className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bt-orange/10 border border-bt-orange/20 text-bt-orange text-xs font-semibold mb-5">
              <BookOpen className="w-3.5 h-3.5" /> Blog & Insights
            </div>
            <h1 className="text-white font-black text-4xl sm:text-5xl leading-tight mb-4">
              Marketing intelligence.<br />
              <span className="text-white/40">Worth reading.</span>
            </h1>
            <p className="text-white/55 text-lg max-w-xl">Actionable insights, growth tactics, and AI marketing strategies from the Brandtelligence team and community.</p>
          </motion.div>

          {/* Search + categories */}
          <motion.div {...fadeUp(0.08)}>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search articles..."
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-bt-teal/50 transition-all"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${activeCategory === cat ? 'bg-bt-teal/15 border-bt-teal/35 text-bt-teal' : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.07]'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured post */}
      {featured && activeCategory === 'All' && !search && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <motion.div {...fadeUp(0)} className="group bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-bt-teal/20 transition-colors cursor-pointer">
            <div className={`h-52 sm:h-64 bg-gradient-to-br ${featured.gradient} flex items-center justify-center`}>
              <div className="text-center">
                <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-2" />
                <span className="text-white/30 text-sm">Featured Article</span>
              </div>
            </div>
            <div className="p-7">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-bt-orange text-xs font-bold uppercase tracking-widest">{featured.category}</span>
                <span className="text-white/20 text-xs">·</span>
                <span className="px-2 py-0.5 rounded-full bg-bt-orange/15 border border-bt-orange/25 text-bt-orange text-[10px] font-bold">FEATURED</span>
              </div>
              <h2 className="text-white font-black text-2xl sm:text-3xl mb-3 leading-tight group-hover:text-bt-teal transition-colors">{featured.title}</h2>
              <p className="text-white/55 text-sm leading-relaxed mb-5 max-w-2xl">{featured.excerpt}</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${authorColors[featured.authorInitial]} flex items-center justify-center text-white font-bold text-xs`}>{featured.authorInitial}</div>
                  <div>
                    <p className="text-white text-xs font-semibold">{featured.author}</p>
                    <p className="text-white/35 text-[11px]">{featured.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-white/35 text-xs ml-auto">
                  <Clock className="w-3.5 h-3.5" /> {featured.readTime} read
                </div>
                <div className="flex items-center gap-1.5 text-bt-teal text-xs font-semibold group-hover:gap-2.5 transition-all">
                  Read article <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* Article grid */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No articles found. Try a different search or category.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(({ category, title, excerpt, date, readTime, author, authorInitial, gradient }, i) => (
              <motion.div key={title} {...fadeUp(i * 0.07)} className="group bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-bt-teal/20 transition-colors cursor-pointer">
                <div className={`h-36 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                  <BookOpen className="w-8 h-8 text-white/15" />
                </div>
                <div className="p-5">
                  <span className="text-bt-orange text-[11px] font-bold uppercase tracking-wider">{category}</span>
                  <h3 className="text-white font-bold text-sm mt-1.5 mb-2.5 leading-snug group-hover:text-bt-teal transition-colors line-clamp-2">{title}</h3>
                  <p className="text-white/45 text-xs leading-relaxed line-clamp-3 mb-4">{excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${authorColors[authorInitial] || 'from-bt-teal to-bt-teal-dark'} flex items-center justify-center text-white font-bold text-[10px]`}>{authorInitial}</div>
                      <div>
                        <p className="text-white/60 text-[11px] font-medium">{author}</p>
                        <div className="flex items-center gap-1 text-white/30 text-[10px]">
                          <Clock className="w-3 h-3" /> {readTime}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/25 group-hover:text-bt-teal group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Newsletter */}
      <section className="py-20 bg-white/[0.015] border-t border-white/[0.06]">
        <div className="max-w-xl mx-auto px-4 text-center">
          <motion.div {...fadeUp(0)}>
            <h2 className="text-white font-black text-2xl sm:text-3xl mb-3">Get the latest insights in your inbox.</h2>
            <p className="text-white/50 text-sm mb-6">Weekly marketing intelligence, AI tips, and growth tactics. No spam — unsubscribe any time.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-white/[0.06] border border-white/[0.12] rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-bt-teal/50 transition-all"
              />
              <button className="px-5 py-3 rounded-xl bg-gradient-to-r from-bt-teal to-bt-teal-dark text-white font-bold text-sm shadow-lg shadow-bt-teal/25 hover:scale-105 transition-all shrink-0">
                Subscribe
              </button>
            </div>
            <p className="text-white/25 text-xs mt-3">By subscribing you agree to our Privacy Policy. Unsubscribe at any time.</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}