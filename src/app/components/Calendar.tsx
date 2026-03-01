import { useState, useMemo } from 'react';
import { Instagram, Facebook, Linkedin, Twitter, List, Calendar as CalendarIcon, Hash, Clock } from 'lucide-react';
import { SiTiktok, SiTelegram } from 'react-icons/si';
import { useContent, type ContentCard } from '../contexts/ContentContext';
import { useDashboardTheme } from './saas/DashboardThemeContext';
import { FoldableContainer } from './FoldableContainer';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

type ViewMode = 'list' | 'calendar';

// ─── Component ────────────────────────────────────────────────────────────────

export function Calendar() {
  const { getCardsByProject } = useContent();
  const { isDark } = useDashboardTheme();
  const projectCards = getCardsByProject('1'); // vCard SaaS project

  // Only show cards that have a scheduled date (i.e. belong on the calendar)
  const scheduledCards = useMemo(
    () => projectCards.filter(c => c.scheduledDate).sort((a, b) => (a.scheduledDate! > b.scheduledDate! ? 1 : -1)),
    [projectCards],
  );

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey | 'All'>('All');
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const filteredPosts = useMemo(() => {
    if (selectedPlatform === 'All') return scheduledCards;
    return scheduledCards.filter(c => c.platform === selectedPlatform);
  }, [selectedPlatform, scheduledCards]);

  const platforms: (PlatformKey | 'All')[] = ['All', 'instagram', 'facebook', 'linkedin', 'twitter', 'tiktok', 'telegram'];

  // Group by date for list view
  const groupedByDate = useMemo(() => {
    const groups: Record<string, ContentCard[]> = {};
    filteredPosts.forEach(card => {
      const d = card.scheduledDate!;
      if (!groups[d]) groups[d] = [];
      groups[d].push(card);
    });
    return groups;
  }, [filteredPosts]);

  // Calendar grid — determine month from scheduled content, defaulting to March 2026
  const calendarMonth = useMemo(() => {
    if (scheduledCards.length > 0) {
      const d = new Date(scheduledCards[0].scheduledDate!);
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    return { year: 2026, month: 2 };
  }, [scheduledCards]);

  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (null | { day: number; dateString: string; posts: ContentCard[] })[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);

    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const postsForDay = filteredPosts.filter(c => c.scheduledDate === dateString);
      days.push({ day, dateString, posts: postsForDay });
    }
    return days;
  }, [calendarMonth, filteredPosts]);

  const monthLabel = useMemo(() => {
    const { year, month } = calendarMonth;
    return new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [calendarMonth]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const selectedCardData = selectedPost ? scheduledCards.find(c => c.id === selectedPost) : null;

  // ── Status badge ──
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

  // ── Platform breakdown for tabletop controls panel ──
  const platformBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPosts.forEach(c => {
      counts[c.platform] = (counts[c.platform] || 0) + 1;
    });
    return counts;
  }, [filteredPosts]);

  // ── Shared UI fragments ──

  const filterControls = (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-white">Filter by Platform</h2>

        {/* View Mode Toggle */}
        <div className="flex gap-2 bg-white/10 border border-white/15 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm min-h-[2.75rem] ${
              viewMode === 'list'
                ? 'bg-white/20 text-white shadow-lg border border-white/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm min-h-[2.75rem] ${
              viewMode === 'calendar'
                ? 'bg-white/20 text-white shadow-lg border border-white/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            Calendar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {platforms.map(platform => (
          <button
            key={platform}
            onClick={() => setSelectedPlatform(platform)}
            className={`px-4 py-2 rounded-xl transition-all min-h-[2.75rem] ${
              selectedPlatform === platform
                ? 'bg-white/25 text-white shadow-lg border border-white/40'
                : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {platform === 'All' ? 'All' : platformDisplayNames[platform] || platform}
          </button>
        ))}
      </div>
    </div>
  );

  const listView = (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-6 shadow-xl">
      <h2 className="text-2xl font-semibold text-white mb-6">{monthLabel} Content Calendar</h2>

      {Object.keys(groupedByDate).length === 0 && (
        <p className="text-white/50 text-center py-8">No scheduled content found for this filter.</p>
      )}

      <div className="space-y-6">
        {Object.entries(groupedByDate).map(([date, posts]) => (
          <div key={date} className="border-l-4 border-teal-400 pl-4">
            <h3 className="text-lg font-semibold text-white mb-3">{formatDate(date)}</h3>

            <div className="space-y-3">
              {posts.map(card => {
                const pKey = card.platform as PlatformKey;
                const Icon = platformIcons[pKey] || Instagram;
                const color = platformColors[pKey] || 'bg-purple-600';
                return (
                  <div
                    key={card.id}
                    onClick={() => setSelectedPost(card.id)}
                    className="bg-white/5 rounded-xl p-4 hover:bg-white/10 cursor-pointer transition-all border border-white/10 hover:border-white/25 hover:shadow-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`${color} p-2 rounded-lg text-white flex-shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-semibold text-white">{platformDisplayNames[card.platform] || card.platform}</span>
                          <span className="text-white/40">·</span>
                          <span className="text-sm text-white/60">{card.postType || card.title}</span>
                          <span className="text-white/40">·</span>
                          <span className="text-sm text-white/60">{formatTime(card.scheduledTime)}</span>
                          {statusBadge(card)}
                        </div>

                        <p className="text-white/70 text-sm line-clamp-2 mb-2">{card.caption}</p>

                        <div className="flex flex-wrap gap-1">
                          {card.hashtags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="text-xs text-teal-300 bg-teal-500/15 px-2 py-1 rounded-lg border border-teal-400/20">
                              #{tag}
                            </span>
                          ))}
                          {card.hashtags.length > 3 && (
                            <span className="text-xs text-white/50 px-2 py-1">+{card.hashtags.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const calendarGridView = (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-6 shadow-xl">
      <h2 className="text-2xl font-semibold text-white mb-6">{monthLabel}</h2>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-semibold text-white/80 py-2">{day}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((dayData, index) => (
          <div
            key={index}
            className={`min-h-[140px] border rounded-xl p-2 ${
              dayData
                ? 'bg-white/5 hover:bg-white/10 border-white/15 transition-colors'
                : 'bg-white/[0.02] border-white/5'
            }`}
          >
            {dayData && (
              <>
                <div className="font-semibold text-white/90 mb-2">{dayData.day}</div>
                <div className="space-y-1.5">
                  {dayData.posts.map(card => {
                    const pKey = card.platform as PlatformKey;
                    const Icon = platformIcons[pKey] || Instagram;
                    const color = platformColors[pKey] || 'bg-purple-600';
                    const captionPreview = card.caption.split('\n')[0].substring(0, 40) + (card.caption.length > 40 ? '...' : '');
                    return (
                      <div
                        key={card.id}
                        onClick={() => setSelectedPost(card.id)}
                        className={`${color} text-white text-xs p-2 rounded-lg cursor-pointer hover:opacity-90 transition-opacity shadow-md`}
                        title={`${platformDisplayNames[card.platform] || card.platform} - ${card.postType || card.title}\n${card.caption}`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <Icon className="w-3 h-3 flex-shrink-0" />
                          <span className="font-semibold">{card.postType || 'Post'}</span>
                        </div>
                        <div className="text-[10px] leading-tight opacity-90 line-clamp-2">{captionPreview}</div>
                        <div className="text-[9px] opacity-75 mt-0.5">{formatTime(card.scheduledTime)}</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-white/15">
        <h3 className="font-semibold text-white mb-3">Platform Legend</h3>
        <div className="flex flex-wrap gap-3">
          {platforms.filter(p => p !== 'All').map(platform => {
            const Icon = platformIcons[platform as PlatformKey];
            return (
              <div key={platform} className="flex items-center gap-2">
                <div className={`${platformColors[platform as PlatformKey]} w-4 h-4 rounded`} />
                <span className="text-sm text-white/70">{platformDisplayNames[platform] || platform}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const contentView = viewMode === 'list' ? listView : calendarGridView;

  // ── Tabletop bottom controls panel ──
  const tabletopControls = (
    <div className="space-y-4 p-2">
      {/* View toggle + platform filter */}
      {filterControls}

      {/* Quick stats summary */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Hash className="w-4 h-4 text-teal-300" />
          <h3 className="text-sm font-semibold text-white">Content Summary</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              {filteredPosts.length}
            </div>
            <div className="text-white/50 text-xs">Total Posts</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {Object.keys(groupedByDate).length}
            </div>
            <div className="text-white/50 text-xs">Active Days</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              {Object.keys(platformBreakdown).length}
            </div>
            <div className="text-white/50 text-xs">Platforms</div>
          </div>
        </div>

        {/* Per-platform mini breakdown */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
          {Object.entries(platformBreakdown).map(([platform, count]) => {
            const Icon = platformIcons[platform as PlatformKey] || Instagram;
            const color = platformColors[platform as PlatformKey] || 'bg-purple-600';
            return (
              <div
                key={platform}
                className={`${color} text-white text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 min-h-[2rem]`}
              >
                <Icon className="w-3 h-3" />
                <span className="font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Currently viewing indicator */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
        <Clock className="w-4 h-4 text-white/40" />
        <span className="text-white/60 text-xs">
          Viewing <span className="text-white font-medium">{monthLabel}</span>
          {selectedPlatform !== 'All' && (
            <> · <span className="text-teal-300">{platformDisplayNames[selectedPlatform] || selectedPlatform}</span></>
          )}
          {' '}· <span className="text-white/40">{viewMode === 'list' ? 'List' : 'Calendar'} view</span>
        </span>
      </div>
    </div>
  );

  return (
    <>
      <FoldableContainer
        topContent={
          <div className="overflow-y-auto p-2 space-y-4">
            <h2 className="text-xl font-semibold text-white px-2 pt-2">{monthLabel}</h2>
            {contentView}
          </div>
        }
        bottomContent={tabletopControls}
      >
        {/* ── Standard single-screen layout ── */}
        <div className="space-y-6">
          {filterControls}
          {contentView}
        </div>
      </FoldableContainer>

      {/* ── Post Detail Modal — always outside FoldableContainer ── */}
      {selectedCardData && (() => {
        const pKey = selectedCardData.platform as PlatformKey;
        const Icon = platformIcons[pKey] || Instagram;
        const color = platformColors[pKey] || 'bg-purple-600';
        return (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedPost(null)}
          >
            <div
              className={`backdrop-blur-xl border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl fold-modal-safe ${isDark ? 'border-white/20' : 'border-gray-200'}`}
              style={{ background: isDark ? 'rgba(26,16,53,0.95)' : 'rgba(255,255,255,0.98)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`${color} p-3 rounded-xl text-white shadow-lg`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {platformDisplayNames[selectedCardData.platform] || selectedCardData.platform}
                    </h3>
                    <p className="text-sm text-white/60">
                      {formatDate(selectedCardData.scheduledDate!)} at {formatTime(selectedCardData.scheduledTime)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-white/40 hover:text-white text-2xl transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 min-h-[2.75rem] min-w-[2.75rem]"
                >
                  ×
                </button>
              </div>

              {/* Status */}
              <div className="mb-4">{statusBadge(selectedCardData)}</div>

              <div className="space-y-4">
                {selectedCardData.postType && (
                  <div>
                    <label className="text-sm font-semibold text-white/80 block mb-1">Post Type</label>
                    <p className="text-white">{selectedCardData.postType}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-semibold text-white/80 block mb-1">Caption</label>
                  <p className="text-white/90 whitespace-pre-wrap bg-white/5 rounded-xl p-4 border border-white/10">
                    {selectedCardData.caption}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-white/80 block mb-1">Hashtags</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCardData.hashtags.map((tag, idx) => (
                      <span key={idx} className="text-sm text-teal-300 bg-teal-500/15 px-3 py-1 rounded-full border border-teal-400/20">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedCardData.visualDescription && (
                  <div>
                    <label className="text-sm font-semibold text-white/80 block mb-1">Visual Description</label>
                    <p className="text-white/80 bg-purple-500/10 rounded-xl p-4 border border-purple-400/15">
                      {selectedCardData.visualDescription}
                    </p>
                  </div>
                )}

                {selectedCardData.callToAction && (
                  <div>
                    <label className="text-sm font-semibold text-white/80 block mb-1">Call to Action</label>
                    <p className="text-emerald-300 font-medium bg-emerald-500/10 rounded-xl p-4 border border-emerald-400/15">
                      {selectedCardData.callToAction}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}