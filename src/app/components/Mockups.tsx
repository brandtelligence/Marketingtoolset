import { useState, useMemo } from 'react';
import { Instagram, Facebook, Linkedin, Twitter, Download } from 'lucide-react';
import { SiTiktok, SiTelegram } from 'react-icons/si';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useContent, type ContentCard } from '../contexts/ContentContext';
import { useDashboardTheme } from './saas/DashboardThemeContext';
import { useFoldableLayout } from '../hooks/useFoldableLayout';

// ─── Platform Visuals ─────────────────────────────────────────────────────────

type PlatformKey = 'instagram' | 'facebook' | 'linkedin' | 'twitter' | 'tiktok' | 'telegram';

const platformColors: Record<PlatformKey, string> = {
  instagram: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500',
  facebook: 'bg-blue-600',
  linkedin: 'bg-blue-700',
  twitter: 'bg-sky-500',
  tiktok: 'bg-black',
  telegram: 'bg-sky-500',
};

const platformIcons: Record<PlatformKey, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  tiktok: SiTiktok,
  telegram: SiTelegram,
};

const platformDisplayNames: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  twitter: 'X (Twitter)', tiktok: 'TikTok', telegram: 'Telegram',
};

// Stock images used for mockup visuals when no card media is available
const stockImages = [
  'https://images.unsplash.com/photo-1758599543117-f996daf4978b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHByb2Zlc3Npb25hbCUyMHNtYXJ0cGhvbmUlMjBkaWdpdGFsfGVufDF8fHx8MTc3MTg0NDcwOXww&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1762158008280-3dcb1d1cbd99?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZXR3b3JraW5nJTIwaGFuZHNoYWtlJTIwcHJvZmVzc2lvbmFsfGVufDF8fHx8MTc3MTg0NDcwOXww&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1587906697341-bfbde76785c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbWFydHBob25lJTIwY29udGFjdGxlc3MlMjBwYXltZW50fGVufDF8fHx8MTc3MTg0NDcxNXww&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1548839186-d3eaf749120f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZW1wbGF0ZSUyMGRlc2lnbiUyMG1vY2t1cHxlbnwxfHx8fDE3NzE4NDQ3MTB8MA&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1723609276367-a3abbe1967b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2NpYWwlMjBtZWRpYSUyMHBob25lJTIwc2NyZWVufGVufDF8fHx8MTc3MTg0NDcxMHww&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1759661966728-4a02e3c6ed91?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmFseXRpY3MlMjBkYXNoYm9hcmQlMjBkYXRhfGVufDF8fHx8MTc3MTgwMjM5NHww&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1646153114001-495dfb56506d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjB3b3Jrc3BhY2UlMjB0ZWNofGVufDF8fHx8MTc3MTg0MTUyOHww&ixlib=rb-4.1.0&q=80&w=1080',
];

/** Format 24-h "14:00" → "02:00 PM" */
function formatTime(time24?: string): string {
  if (!time24) return '';
  const [hStr, m] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Mockups() {
  const { getCardsByProject } = useContent();
  const projectCards = getCardsByProject('1');
  const { isDualScreen, isSquarish } = useFoldableLayout();
  const { theme, isDark } = useDashboardTheme();

  // Show first 7 scheduled cards (Week 1) for mockups, sorted by date
  const weekOnePosts = useMemo(() => {
    const scheduled = projectCards
      .filter(c => c.scheduledDate)
      .sort((a, b) => (a.scheduledDate! > b.scheduledDate! ? 1 : -1));
    return scheduled.slice(0, 7);
  }, [projectCards]);

  const [selectedMockup, setSelectedMockup] = useState<string | null>(null);

  const selectedPost = selectedMockup ? weekOnePosts.find(c => c.id === selectedMockup) : null;

  // Resolve an image for a card (prefer card media, fall back to stock)
  const getCardImage = (card: ContentCard, index: number) =>
    card.mediaUrl || stockImages[index % stockImages.length];

  // Status badge
  const statusBadge = (card: ContentCard) => {
    const map: Record<string, { label: string; cls: string }> = {
      draft: { label: 'Draft', cls: 'bg-gray-500/20 text-gray-300 border-gray-400/20' },
      pending_approval: { label: 'Pending', cls: 'bg-amber-500/20 text-amber-300 border-amber-400/20' },
      approved: { label: 'Approved', cls: 'bg-teal-500/20 text-teal-300 border-teal-400/20' },
      scheduled: { label: 'Scheduled', cls: 'bg-blue-500/20 text-blue-300 border-blue-400/20' },
      published: { label: 'Published', cls: 'bg-green-500/20 text-green-300 border-green-400/20' },
      rejected: { label: 'Rejected', cls: 'bg-red-500/20 text-red-300 border-red-400/20' },
    };
    const s = map[card.status] || map.draft;
    return <span className={`text-xs px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>;
  };

  // Compute summary stats from ALL scheduled cards
  const allScheduled = useMemo(
    () => projectCards.filter(c => c.scheduledDate).sort((a, b) => (a.scheduledDate! > b.scheduledDate! ? 1 : -1)),
    [projectCards],
  );

  const summaryStats = useMemo(() => {
    const platforms = new Set(weekOnePosts.map(c => c.platform));
    const hashtags = weekOnePosts.reduce((sum, c) => sum + c.hashtags.length, 0);
    return {
      totalPosts: weekOnePosts.length,
      platforms: platforms.size,
      hashtags,
      totalAll: allScheduled.length,
    };
  }, [weekOnePosts, allScheduled]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-semibold text-white mb-2">Week 1 Social Media Mockups</h2>
        <p className="text-white/60">
          {weekOnePosts.length > 0
            ? `${new Date(weekOnePosts[0].scheduledDate!).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${new Date(weekOnePosts[weekOnePosts.length - 1].scheduledDate!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · Click any post to see details`
            : 'No scheduled posts yet'}
        </p>
      </div>

      {/* Mockups Grid */}
      <div className={`gap-6 ${
        isDualScreen || isSquarish
          ? 'fold-auto-grid'
          : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {weekOnePosts.map((card, index) => {
          const pKey = card.platform as PlatformKey;
          const Icon = platformIcons[pKey] || Instagram;
          const color = platformColors[pKey] || 'bg-purple-600';
          const fmtDate = new Date(card.scheduledDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          return (
            <div
              key={card.id}
              onClick={() => setSelectedMockup(card.id)}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden hover:bg-white/15 hover:border-white/30 hover:shadow-2xl transition-all cursor-pointer group shadow-xl"
            >
              {/* Platform Header */}
              <div className={`${color} p-3 text-white flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold">{platformDisplayNames[card.platform] || card.platform}</span>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(card)}
                  <span className="text-xs opacity-90">{fmtDate}</span>
                </div>
              </div>

              {/* Post Visual */}
              <div className="relative aspect-square bg-gradient-to-br from-purple-900/30 to-teal-900/30">
                <ImageWithFallback
                  src={getCardImage(card, index)}
                  alt={card.visualDescription || card.title}
                  className="w-full h-full object-cover"
                />

                {/* Post type badge */}
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium border border-white/10">
                  {card.postType || 'Post'}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  <div className="text-white opacity-0 group-hover:opacity-100 transition-all text-center px-4">
                    <p className="font-semibold mb-1">View Details</p>
                    <p className="text-xs text-white/80">Click to see full caption & hashtags</p>
                  </div>
                </div>
              </div>

              {/* Post Caption Preview */}
              <div className="p-4">
                <p className="text-sm text-white/70 line-clamp-3 mb-3">{card.caption}</p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {card.hashtags.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="text-xs text-teal-300">#{tag}</span>
                  ))}
                  {card.hashtags.length > 2 && (
                    <span className="text-xs text-white/40">+{card.hashtags.length - 2}</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>🕐 {formatTime(card.scheduledTime)}</span>
                  {card.callToAction && (
                    <span className="text-teal-300 font-medium">{card.callToAction}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Full Mockup Modal ─────────────────────────────────────────────── */}
      {selectedPost && (() => {
        const pKey = selectedPost.platform as PlatformKey;
        const Icon = platformIcons[pKey] || Instagram;
        const color = platformColors[pKey] || 'bg-purple-600';
        const postIndex = weekOnePosts.findIndex(c => c.id === selectedPost.id);

        return (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedMockup(null)}
          >
            <div
              className={`backdrop-blur-xl border rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl fold-modal-safe ${isDark ? 'border-white/20' : 'border-gray-200'}`}
              style={{ background: isDark ? 'rgba(26,16,53,0.95)' : 'rgba(255,255,255,0.98)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="grid md:grid-cols-2">
                {/* Left: Phone mockup */}
                <div className={`relative ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <div className="p-8">
                    <div className="bg-[#1a1035] rounded-3xl shadow-2xl overflow-hidden border-8 border-white/20 mockup-device">
                      {/* Platform header */}
                      <div className={`${color} p-4 text-white flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold">vCard SaaS</p>
                            <p className="text-xs opacity-80">{formatTime(selectedPost.scheduledTime)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Post image */}
                      <ImageWithFallback
                        src={getCardImage(selectedPost, postIndex)}
                        alt={selectedPost.visualDescription || selectedPost.title}
                        className="w-full aspect-square object-cover"
                      />

                      {/* Engagement bar */}
                      <div className="p-4 border-b border-white/10">
                        <div className="flex items-center gap-4 text-white/60 mb-3">
                          <button className="flex items-center gap-1 hover:text-red-400 transition-colors">
                            <span className="text-xl">❤️</span>
                            <span className="text-sm">1.2K</span>
                          </button>
                          <button className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                            <span className="text-xl">💬</span>
                            <span className="text-sm">89</span>
                          </button>
                          <button className="flex items-center gap-1 hover:text-green-400 transition-colors">
                            <span className="text-xl">↗️</span>
                            <span className="text-sm">Share</span>
                          </button>
                        </div>
                      </div>

                      {/* Caption preview */}
                      <div className="p-4">
                        <p className="text-sm text-white/80 line-clamp-2">
                          <span className="font-semibold text-white">vCard SaaS</span> {selectedPost.caption.split('\n')[0]}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Details */}
                <div className="p-6 overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`${color} p-3 rounded-xl text-white shadow-lg`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {platformDisplayNames[selectedPost.platform] || selectedPost.platform}
                        </h3>
                        <p className="text-sm text-white/60">{selectedPost.postType || selectedPost.title}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedMockup(null)}
                      className="text-white/40 hover:text-white text-3xl leading-none transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
                    >
                      ×
                    </button>
                  </div>

                  {/* Status */}
                  <div className="mb-4">{statusBadge(selectedPost)}</div>

                  <div className="space-y-5">
                    {/* Schedule */}
                    <div className="bg-teal-500/10 border border-teal-400/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-teal-300 mb-1">
                        <span className="text-lg">📅</span>
                        <span className="font-semibold">Scheduled Post</span>
                      </div>
                      <p className="text-sm text-teal-200/80">
                        {new Date(selectedPost.scheduledDate!).toLocaleDateString('en-US', {
                          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                        })}{' '}
                        at {formatTime(selectedPost.scheduledTime)}
                      </p>
                    </div>

                    {/* Caption */}
                    <div>
                      <label className="text-sm font-semibold text-white/80 block mb-2">Caption</label>
                      <p className="text-white/80 whitespace-pre-wrap text-sm leading-relaxed bg-white/5 rounded-xl p-4 border border-white/10">
                        {selectedPost.caption}
                      </p>
                    </div>

                    {/* Hashtags */}
                    <div>
                      <label className="text-sm font-semibold text-white/80 block mb-2">
                        Hashtags ({selectedPost.hashtags.length})
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedPost.hashtags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-sm text-teal-300 bg-teal-500/15 px-3 py-1.5 rounded-full border border-teal-400/20 hover:bg-teal-500/25 transition-colors"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Visual Description */}
                    {selectedPost.visualDescription && (
                      <div>
                        <label className="text-sm font-semibold text-white/80 block mb-2">Visual Concept</label>
                        <p className="text-sm text-white/70 bg-purple-500/10 rounded-xl p-4 border border-purple-400/15">
                          {selectedPost.visualDescription}
                        </p>
                      </div>
                    )}

                    {/* CTA */}
                    {selectedPost.callToAction && (
                      <div>
                        <label className="text-sm font-semibold text-white/80 block mb-2">Call to Action</label>
                        <p className="text-sm font-medium text-emerald-300 bg-emerald-500/10 rounded-xl p-4 border border-emerald-400/15">
                          {selectedPost.callToAction}
                        </p>
                      </div>
                    )}

                    {/* Download */}
                    <button className="w-full bg-gradient-to-r from-purple-600 to-teal-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-purple-500 hover:to-teal-500 transition-all shadow-lg hover:shadow-xl border border-white/10">
                      <Download className="w-5 h-5" />
                      Export Post Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Week Summary */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Week 1 Summary</h3>
        <div className={`gap-4 ${
          isDualScreen || isSquarish
            ? 'fold-auto-grid'
            : 'grid grid-cols-2 md:grid-cols-4'
        }`}>
          {[
            { value: String(summaryStats.totalPosts), label: 'Week 1 Posts', gradient: 'from-purple-400 to-pink-400' },
            { value: String(summaryStats.platforms), label: 'Platforms', gradient: 'from-teal-400 to-cyan-400' },
            { value: `~${summaryStats.hashtags}`, label: 'Hashtags Used', gradient: 'from-orange-400 to-amber-400' },
            { value: String(summaryStats.totalAll), label: 'Total Scheduled', gradient: 'from-green-400 to-emerald-400' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white/10 border border-white/15 rounded-xl p-4 backdrop-blur-sm text-center">
              <p className={`text-3xl font-bold mb-1 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                {stat.value}
              </p>
              <p className="text-sm text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}