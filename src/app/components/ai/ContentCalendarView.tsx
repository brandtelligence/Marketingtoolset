import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronRight, CalendarDays,
  Clock, ExternalLink, FileText,
} from 'lucide-react';
import {
  SiInstagram, SiFacebook, SiX, SiLinkedin, SiTiktok,
  SiYoutube, SiPinterest, SiSnapchat, SiThreads, SiReddit, SiWhatsapp,
  SiTelegram,
} from 'react-icons/si';
import { type ContentCard } from '../../contexts/ContentContext';
import { useDashboardTheme } from '../saas/DashboardThemeContext';
import { employeeTheme } from '../../utils/employeeTheme';

// ─── Platform metadata ────────────────────────────────────────────────────────

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: SiInstagram, facebook: SiFacebook, twitter: SiX,
  linkedin:  SiLinkedin,  tiktok:   SiTiktok,   youtube:  SiYoutube,
  pinterest: SiPinterest, snapchat: SiSnapchat,  threads:  SiThreads,
  reddit:    SiReddit,    whatsapp: SiWhatsapp,  telegram: SiTelegram,
};

const platformIconColors: Record<string, string> = {
  instagram: 'text-pink-400',   facebook: 'text-blue-500',   twitter:  'text-sky-300',
  linkedin:  'text-blue-400',   tiktok:   'text-cyan-400',   youtube:  'text-red-500',
  pinterest: 'text-red-400',    snapchat: 'text-yellow-300', threads:  'text-gray-200',
  reddit:    'text-orange-500', whatsapp: 'text-green-400',  telegram: 'text-sky-400',
};

const platformNames: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook',        twitter:  'X (Twitter)',
  linkedin:  'LinkedIn',  tiktok:   'TikTok',          youtube:  'YouTube',
  pinterest: 'Pinterest', snapchat: 'Snapchat',        threads:  'Threads',
  reddit:    'Reddit',    whatsapp: 'WhatsApp',         telegram: 'Telegram',
};

// ─── Status helpers ───────────────────────────────────────────────────────────

function getStatusDotClass(card: ContentCard, today: string): string {
  if (card.status === 'scheduled' && card.scheduledDate && card.scheduledDate < today) {
    return 'bg-orange-400'; // overdue
  }
  const map: Record<string, string> = {
    draft:            'bg-gray-400',
    pending_approval: 'bg-amber-400',
    approved:         'bg-teal-400',
    scheduled:        'bg-blue-400',
    published:        'bg-green-400',
    rejected:         'bg-red-400',
  };
  return map[card.status] || 'bg-white/30';
}

const statusBadgeClasses: Record<string, string> = {
  draft:            'bg-gray-500/15 text-gray-300 border-gray-400/15',
  pending_approval: 'bg-amber-500/15 text-amber-300 border-amber-400/15',
  approved:         'bg-teal-500/15 text-teal-300 border-teal-400/15',
  scheduled:        'bg-blue-500/15 text-blue-300 border-blue-400/15',
  published:        'bg-green-500/15 text-green-300 border-green-400/15',
  rejected:         'bg-red-500/15 text-red-300 border-red-400/15',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft', pending_approval: 'Pending', approved: 'Approved',
  scheduled: 'Scheduled', published: 'Published', rejected: 'Rejected',
};

// ─── Calendar grid builder (Mon-first) ───────────────────────────────────────

function buildCalendarWeeks(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0, Sun=6

  const days: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDate; d++) {
    days.push(
      `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    );
  }
  while (days.length % 7 !== 0) days.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function localDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const TODAY_CAL = localDateStr();

const DOW_LABELS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Legend entries ───────────────────────────────────────────────────────────

const LEGEND = [
  { label: 'Scheduled', cls: 'bg-blue-400'   },
  { label: 'Published', cls: 'bg-green-400'  },
  { label: 'Overdue',   cls: 'bg-orange-400' },
  { label: 'Approved',  cls: 'bg-teal-400'   },
  { label: 'Pending',   cls: 'bg-amber-400'  },
  { label: 'Draft',     cls: 'bg-gray-400'   },
  { label: 'Rejected',  cls: 'bg-red-400'    },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContentCalendarViewProps {
  cards: ContentCard[];
  onOpenDetail: (card: ContentCard) => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ContentCalendarView({ cards, onOpenDetail }: ContentCalendarViewProps) {
  const _nowInit = new Date();
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);

  const [displayYear,  setDisplayYear]  = useState(_nowInit.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(_nowInit.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(TODAY_CAL);

  // ── Card-by-date index (only cards with a scheduledDate) ──────────────────
  const cardsByDate = useMemo(() => {
    const map: Record<string, ContentCard[]> = {};
    cards.forEach(c => {
      if (!c.scheduledDate) return;
      if (!map[c.scheduledDate]) map[c.scheduledDate] = [];
      map[c.scheduledDate].push(c);
    });
    return map;
  }, [cards]);

  // ── Calendar grid ─────────────────────────────────────────────────────────
  const weeks = useMemo(
    () => buildCalendarWeeks(displayYear, displayMonth),
    [displayYear, displayMonth]
  );

  // ── Month stats ───────────────────────────────────────────────────────────
  const monthPrefix = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}`;

  const { mScheduled, mOverdue, mPublished, mPending, mTotal } = useMemo(() => {
    const thisMonth = cards.filter(c => c.scheduledDate?.startsWith(monthPrefix));
    return {
      mScheduled: thisMonth.filter(c => c.status === 'scheduled' && c.scheduledDate! >= TODAY_CAL).length,
      mOverdue:   thisMonth.filter(c => c.status === 'scheduled' && c.scheduledDate! < TODAY_CAL).length,
      mPublished: thisMonth.filter(c => c.status === 'published').length,
      mPending:   thisMonth.filter(c => c.status === 'pending_approval').length,
      mTotal:     thisMonth.length,
    };
  }, [cards, monthPrefix]);

  // ── Navigation ────────────────────────────────────────────────────────────
  function prevMonth() {
    setSelectedDate(null);
    if (displayMonth === 0) { setDisplayMonth(11); setDisplayYear(y => y - 1); }
    else setDisplayMonth(m => m - 1);
  }
  function nextMonth() {
    setSelectedDate(null);
    if (displayMonth === 11) { setDisplayMonth(0); setDisplayYear(y => y + 1); }
    else setDisplayMonth(m => m + 1);
  }
  function goToToday() {
    const n = new Date();
    setDisplayYear(n.getFullYear());
    setDisplayMonth(n.getMonth());
    setSelectedDate(TODAY_CAL);
  }

  // ── Selected day cards (sorted by scheduledTime) ──────────────────────────
  const selectedDayCards = useMemo(() => {
    if (!selectedDate) return [];
    return [...(cardsByDate[selectedDate] || [])].sort((a, b) => {
      if (!a.scheduledTime) return 1;
      if (!b.scheduledTime) return -1;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });
  }, [selectedDate, cardsByDate]);

  // Format selected date for display
  const formattedSelectedDate = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  const isCurrentMonthView =
    displayYear  === _nowInit.getFullYear() &&
    displayMonth === _nowInit.getMonth();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Month nav + stats ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">

        {/* Navigation controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={prevMonth}
            className={`p-2 rounded-xl ${et.surfaceAlt} border ${et.border} ${et.textMd} hover:${isDark ? 'text-white' : 'text-gray-900'} ${et.hover} transition-all`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className={`${et.text} font-semibold text-base min-w-[11rem] text-center`}>
            {MONTH_NAMES[displayMonth]} {displayYear}
          </span>

          <button
            onClick={nextMonth}
            className={`p-2 rounded-xl ${et.surfaceAlt} border ${et.border} ${et.textMd} hover:${isDark ? 'text-white' : 'text-gray-900'} ${et.hover} transition-all`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isCurrentMonthView && (
            <button
              onClick={goToToday}
              className="text-[11px] font-semibold text-teal-300/80 hover:text-teal-200 px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-400/20 hover:bg-teal-500/15 transition-all"
            >
              Today
            </button>
          )}
        </div>

        {/* Stats pills */}
        <div className="flex flex-wrap gap-1.5 sm:ml-auto">
          {mTotal === 0 ? (
            <span className={`${et.textFaint} text-[10px] italic py-1`}>No content scheduled this month</span>
          ) : (
            <>
              {mScheduled > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-blue-500/12 border border-blue-400/20 text-blue-300 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  {mScheduled} scheduled
                </span>
              )}
              {mPublished > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-green-500/12 border border-green-400/20 text-green-300 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  {mPublished} published
                </span>
              )}
              {mOverdue > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-orange-500/12 border border-orange-400/20 text-orange-300 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                  {mOverdue} overdue
                </span>
              )}
              {mPending > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-amber-500/12 border border-amber-400/20 text-amber-300 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  {mPending} pending
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Day-of-week headers ── */}
      <div className="grid grid-cols-7 gap-1">
        {DOW_LABELS.map(dow => (
          <div key={dow} className={`text-center ${et.textFaint} text-[10px] sm:text-xs font-semibold pb-1`}>
            <span className="hidden sm:inline">{dow}</span>
            <span className="sm:hidden">{dow.charAt(0)}</span>
          </div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((dateStr, di) => {
              // Empty cell (padding day from adjacent month)
              if (!dateStr) {
                return (
                  <div
                    key={`empty-${wi}-${di}`}
                    className={`min-h-[4rem] sm:min-h-[5.5rem] rounded-xl border opacity-20 ${isDark ? 'bg-white/2 border-white/5' : 'bg-gray-50/50 border-gray-200/30'}`}
                  />
                );
              }

              const dayCells  = cardsByDate[dateStr] || [];
              const isToday   = dateStr === TODAY_CAL;
              const isSelected = dateStr === selectedDate;
              const dayNum    = parseInt(dateStr.split('-')[2], 10);

              // Overdue: any scheduled card with past date
              const hasOverdue = dayCells.some(
                c => c.status === 'scheduled' && c.scheduledDate! < TODAY_CAL
              );

              // Dots: up to 3 visible, rest counted as overflow
              const visibleDots = dayCells.slice(0, 3);
              const overflow    = dayCells.length - 3;

              // Cell border + bg logic
              let cellCls: string;
              if (isSelected) {
                cellCls = 'border-purple-400/60 bg-purple-500/15 shadow-purple-500/10 shadow-md';
              } else if (isToday) {
                cellCls = 'border-teal-400/50 bg-teal-500/10 hover:bg-teal-500/15';
              } else if (hasOverdue) {
                cellCls = 'border-orange-400/30 bg-orange-500/5 hover:bg-orange-500/10';
              } else if (dayCells.length > 0) {
                cellCls = isDark ? 'border-white/12 bg-white/5 hover:bg-white/8' : 'border-gray-200 bg-white hover:bg-gray-50';
              } else {
                cellCls = isDark ? 'border-white/8 bg-white/2 hover:bg-white/5' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-100/80';
              }

              // Day number colour
              const dayNumCls = isSelected
                ? 'text-purple-200'
                : isToday
                  ? 'text-teal-300'
                  : dayCells.length > 0
                    ? (isDark ? 'text-white/80' : 'text-gray-800')
                    : (isDark ? 'text-white/25' : 'text-gray-400');

              return (
                <motion.button
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`min-h-[4rem] sm:min-h-[5.5rem] rounded-xl border p-1.5 sm:p-2 flex flex-col transition-all text-left relative ${cellCls}`}
                >
                  {/* Day number */}
                  <span className={`text-[11px] sm:text-sm font-semibold leading-none ${dayNumCls}`}>
                    {dayNum}
                  </span>

                  {/* Today indicator dot (top-right) */}
                  {isToday && !isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-teal-400" />
                  )}

                  {/* Status dots */}
                  {dayCells.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-auto pt-1">
                      {visibleDots.map((card, idx) => (
                        <span
                          key={idx}
                          className={`w-2 h-2 rounded-full ${getStatusDotClass(card, TODAY_CAL)}`}
                        />
                      ))}
                      {overflow > 0 && (
                        <span className={`text-[8px] sm:text-[9px] ${et.textFaint} leading-tight self-end`}>
                          +{overflow}
                        </span>
                      )}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Legend ── */}
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 border-t ${isDark ? 'border-white/8' : 'border-gray-200'}`}>
        {LEGEND.map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${cls} shrink-0`} />
            <span className={`${et.textFaint} text-[10px]`}>{label}</span>
          </div>
        ))}
        <span className={`${isDark ? 'text-white/15' : 'text-gray-300'} text-[10px] ml-auto hidden sm:block`}>
          Click a date to see its cards below
        </span>
      </div>

      {/* ── Selected day card panel ── */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className={`${isDark ? 'bg-white/5' : 'bg-white'} border border-purple-400/20 rounded-2xl overflow-hidden`}
          >
            {/* Panel header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-white/8' : 'border-gray-200'} bg-purple-500/5`}>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-purple-400 shrink-0" />
                <span className={`${et.text} font-semibold text-sm`}>{formattedSelectedDate}</span>
                <span className={`${et.textFaint} text-xs`}>
                  · {selectedDayCards.length} card{selectedDayCards.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className={`${et.textFaint} hover:${isDark ? 'text-white/60' : 'text-gray-600'} text-[11px] transition-colors px-2 py-1 rounded-lg ${et.hover}`}
              >
                ✕ Close
              </button>
            </div>

            {/* Card list */}
            {selectedDayCards.length === 0 ? (
              <div className="py-10 text-center">
                <FileText className={`w-8 h-8 ${isDark ? 'text-white/12' : 'text-gray-200'} mx-auto mb-2`} />
                <p className={`${et.textFaint} text-sm`}>No content cards scheduled for this date</p>
                <p className={`${isDark ? 'text-white/20' : 'text-gray-300'} text-[11px] mt-1`}>
                  Cards appear here when their scheduled date matches
                </p>
              </div>
            ) : (
              <div className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-100'}`}>
                {selectedDayCards.map((card, idx) => {
                  const PIcon     = platformIcons[card.platform];
                  const iconCls   = platformIconColors[card.platform] || 'text-white/40';
                  const isOverdue = card.status === 'scheduled' && card.scheduledDate! < TODAY_CAL;

                  const badgeCls   = isOverdue
                    ? 'bg-orange-500/15 text-orange-300 border-orange-400/15'
                    : statusBadgeClasses[card.status] || 'bg-white/10 text-white/60 border-white/10';
                  const badgeLabel = isOverdue ? 'Overdue' : (statusLabels[card.status] || card.status);

                  return (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`flex items-center gap-3 px-4 py-3 ${et.hover} transition-all`}
                    >
                      {/* Platform icon badge */}
                      <div className={`shrink-0 w-8 h-8 rounded-lg ${et.surfaceAlt} border ${et.border} flex items-center justify-center`}>
                        {PIcon
                          ? <PIcon className={`w-4 h-4 ${iconCls}`} />
                          : <FileText className={`w-4 h-4 ${et.textFaint}`} />
                        }
                      </div>

                      {/* Title + meta */}
                      <div className="flex-1 min-w-0">
                        <p className={`${et.text} text-sm font-medium truncate`}>{card.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`${et.textFaint} text-[10px]`}>
                            {platformNames[card.platform] || card.platform}
                          </span>
                          {card.scheduledTime && (
                            <>
                              <span className={`${isDark ? 'text-white/15' : 'text-gray-300'}`}>·</span>
                              <span className={`flex items-center gap-0.5 ${et.textFaint} text-[10px]`}>
                                <Clock className="w-2.5 h-2.5" />
                                {card.scheduledTime}
                              </span>
                            </>
                          )}
                          {card.createdBy && (
                            <>
                              <span className={`${isDark ? 'text-white/15' : 'text-gray-300'}`}>·</span>
                              <span className={`${isDark ? 'text-white/25' : 'text-gray-400'} text-[10px] truncate max-w-[6rem]`}>
                                {card.createdBy}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${badgeCls}`}>
                        {badgeLabel}
                      </span>

                      {/* Open detail */}
                      <button
                        onClick={() => onOpenDetail(card)}
                        className={`shrink-0 flex items-center gap-1 text-[11px] ${et.textFaint} hover:text-teal-300 px-2 py-1.5 rounded-lg hover:bg-teal-500/10 transition-all border border-transparent hover:border-teal-400/20`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="hidden sm:inline">Details</span>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}