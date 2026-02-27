import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, ChevronDown, ChevronUp, Timer } from 'lucide-react';
import { type ContentCard } from '../../contexts/ContentContext';
import {
  getSlaHoursElapsed, formatSlaAge,
  SLA_WARNING_HOURS, SLA_BREACH_HOURS,
} from '../../utils/sla';
import { useAuth } from '../AuthContext';
import { useSlaConfig } from '../../hooks/useSlaConfig';

// ─── Creator stats shape ──────────────────────────────────────────────────────

interface CreatorStats {
  name:         string;
  initials:     string;
  totalCards:   number;
  published:    number;
  approved:     number;
  decisioned:   number;
  approvalRate: number | null;
  draft:        number;
  pending:      number;
  platforms:    string[];
  /** Average hours elapsed for currently-pending cards by this creator. null = no pending cards. */
  avgSlaHours:  number | null;
}

type SortKey = 'published' | 'cards' | 'approval' | 'wait';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const platformDotColors: Record<string, string> = {
  instagram: 'bg-pink-400',   facebook: 'bg-blue-500',   twitter:  'bg-sky-300',
  linkedin:  'bg-blue-400',   tiktok:   'bg-cyan-400',   youtube:  'bg-red-500',
  pinterest: 'bg-red-400',    snapchat: 'bg-yellow-300', threads:  'bg-gray-200',
  reddit:    'bg-orange-500', whatsapp: 'bg-green-400',  telegram: 'bg-sky-400',
};

const AVATAR_GRADIENTS = [
  'from-teal-500 to-purple-600',   'from-orange-500 to-pink-500',
  'from-blue-500 to-teal-400',     'from-purple-500 to-blue-500',
  'from-green-400 to-teal-500',    'from-pink-500 to-purple-500',
  'from-amber-400 to-orange-500',
];

function avatarGradient(name: string): string {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base leading-none">🥇</span>;
  if (rank === 2) return <span className="text-base leading-none">🥈</span>;
  if (rank === 3) return <span className="text-base leading-none">🥉</span>;
  return (
    <span className="w-5 h-5 flex items-center justify-center text-[11px] font-bold text-white/30">
      {rank}
    </span>
  );
}

function SortPill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        active ? 'bg-white/15 text-white shadow-sm' : 'text-white/40 hover:text-white/70 hover:bg-white/8'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface ContentLeaderboardProps {
  cards: ContentCard[];
  projectName: string;
}

export function ContentLeaderboard({ cards, projectName }: ContentLeaderboardProps) {
  const [sortBy,     setSortBy]     = useState<SortKey>('published');
  const [expanded,   setExpanded]   = useState(true);

  const { user } = useAuth();
  const { warningHours, breachHours } = useSlaConfig(user?.tenantId ?? undefined);

  // ── Compute per-creator stats (pure derivation, no server call) ──────────
  const allStats = useMemo<CreatorStats[]>(() => {
    const map: Record<string, CreatorStats> = {};

    cards.forEach(card => {
      const name = card.createdBy || 'Unknown';
      if (!map[name]) {
        map[name] = {
          name, initials: getInitials(name),
          totalCards: 0, published: 0, approved: 0, decisioned: 0,
          approvalRate: null, draft: 0, pending: 0, platforms: [],
          avgSlaHours: null,
        };
      }
      const s = map[name];
      s.totalCards++;

      const st = card.status;
      if (st === 'published')                                          s.published++;
      if (['approved','scheduled','published'].includes(st))           s.approved++;
      if (['approved','scheduled','published','rejected'].includes(st)) s.decisioned++;
      if (st === 'draft')            s.draft++;
      if (st === 'pending_approval') s.pending++;
      if (!s.platforms.includes(card.platform)) s.platforms.push(card.platform);
    });

    // Compute approval rates + avgSlaHours
    return Object.values(map).map(s => {
      const pendingCards = cards.filter(c => c.createdBy === s.name && c.status === 'pending_approval');
      const slaHours     = pendingCards
        .map(c => getSlaHoursElapsed(c))
        .filter((h): h is number => h !== null);
      const avgSlaHours  = slaHours.length > 0
        ? slaHours.reduce((a, b) => a + b, 0) / slaHours.length
        : null;

      return {
        ...s,
        approvalRate: s.decisioned > 0 ? (s.approved / s.decisioned) * 100 : null,
        avgSlaHours,
      };
    });
  }, [cards]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => [...allStats].sort((a, b) => {
    if (sortBy === 'published') return b.published  - a.published;
    if (sortBy === 'cards')     return b.totalCards - a.totalCards;
    if (sortBy === 'wait') {
      // Longest-waiting first; null (no pending cards) goes last
      if (a.avgSlaHours === null && b.avgSlaHours === null) return 0;
      if (a.avgSlaHours === null) return 1;
      if (b.avgSlaHours === null) return -1;
      return b.avgSlaHours - a.avgSlaHours;
    }
    // approval: null rates go last
    if (a.approvalRate === null && b.approvalRate === null) return 0;
    if (a.approvalRate === null) return 1;
    if (b.approvalRate === null) return -1;
    return b.approvalRate - a.approvalRate;
  }), [allStats, sortBy]);

  const PAGE = 5;
  const displayed = expanded ? sorted : sorted.slice(0, PAGE);
  const hasMore   = sorted.length > PAGE;

  // ── Empty state ───────────────────────────────────────────────────────────
  if (allStats.length === 0) {
    return (
      <div className="py-8 text-center">
        <Trophy className="w-8 h-8 text-white/12 mx-auto mb-2" />
        <p className="text-white/30 text-sm">No content cards yet.</p>
        <p className="text-white/20 text-xs mt-1">
          The leaderboard will populate as creators add cards to this project.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Sort tabs ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-xl p-1">
          <SortPill label="Top Published"   active={sortBy === 'published'} onClick={() => setSortBy('published')} />
          <SortPill label="Most Cards"      active={sortBy === 'cards'}     onClick={() => setSortBy('cards')}     />
          <SortPill label="Best Approval %" active={sortBy === 'approval'}  onClick={() => setSortBy('approval')}  />
          <SortPill label="Longest Wait"    active={sortBy === 'wait'}      onClick={() => setSortBy('wait')}      />
        </div>

        <span className="text-white/20 text-[10px]">{sorted.length} creator{sorted.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Column header ── */}
      <div className="grid grid-cols-[2rem_2.5rem_1fr_3rem_3.5rem_4rem_4rem] items-center gap-2 px-3 text-[9px] font-semibold text-white/20 uppercase tracking-wider">
        <span></span>
        <span></span>
        <span>Creator</span>
        <span className="text-right hidden sm:block">Cards</span>
        <span className="text-right">Published</span>
        <span className="text-right hidden sm:block">Approval</span>
        <span className="text-right hidden md:block">Avg. Wait</span>
      </div>

      {/* ── Creator rows ── */}
      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {displayed.map((s, idx) => {
            const rank = sorted.indexOf(s) + 1;
            const grad = avatarGradient(s.name);

            const rowBg =
              rank === 1 ? 'bg-yellow-500/6  border-yellow-400/15' :
              rank === 2 ? 'bg-slate-400/5   border-slate-300/10'  :
              rank === 3 ? 'bg-orange-500/5  border-orange-400/10' :
                           'bg-white/3       border-white/8';

            const rateColor =
              s.approvalRate === null  ? 'text-white/25' :
              s.approvalRate >= 80     ? 'text-green-300' :
              s.approvalRate >= 60     ? 'text-teal-300'  :
              s.approvalRate >= 40     ? 'text-amber-300' :
                                         'text-red-300';

            const barColor =
              s.approvalRate === null  ? ''            :
              s.approvalRate >= 80     ? 'bg-green-400' :
              s.approvalRate >= 60     ? 'bg-teal-400'  :
              s.approvalRate >= 40     ? 'bg-amber-400' :
                                         'bg-red-400';

            return (
              <motion.div
                key={s.name}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.2, delay: idx * 0.035 }}
                className={`grid grid-cols-[2rem_2.5rem_1fr_3rem_3.5rem_4rem_4rem] items-center gap-2 px-3 py-2.5 rounded-xl border transition-all hover:bg-white/5 ${rowBg}`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center">
                  <RankBadge rank={rank} />
                </div>

                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0`}>
                  <span className="text-white text-[10px] font-black">{s.initials}</span>
                </div>

                {/* Name + platforms */}
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${rank <= 3 ? 'text-white' : 'text-white/80'}`}>
                    {s.name}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {s.platforms.slice(0, 5).map(p => (
                      <span
                        key={p}
                        title={p}
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${platformDotColors[p] ?? 'bg-white/25'}`}
                      />
                    ))}
                    {s.platforms.length > 5 && (
                      <span className="text-[9px] text-white/20">+{s.platforms.length - 5}</span>
                    )}
                    {s.pending > 0 && (
                      <span className="ml-1 text-[9px] font-semibold text-amber-400 bg-amber-500/15 border border-amber-400/20 px-1.5 py-0.5 rounded-full">
                        {s.pending} pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Total cards */}
                <div className="text-right hidden sm:block">
                  <p className="text-white/70 text-sm font-semibold">{s.totalCards}</p>
                </div>

                {/* Published */}
                <div className="text-right">
                  <p className={`text-sm font-bold ${s.published > 0 ? 'text-green-300' : 'text-white/25'}`}>
                    {s.published}
                  </p>
                </div>

                {/* Approval rate + mini bar */}
                <div className="hidden sm:block text-right">
                  <p className={`text-sm font-bold ${rateColor}`}>
                    {s.approvalRate !== null ? `${s.approvalRate.toFixed(0)}%` : '—'}
                  </p>
                  <div className="w-full h-1 bg-white/8 rounded-full overflow-hidden mt-0.5">
                    {s.approvalRate !== null && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(s.approvalRate, 100)}%` }}
                        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 + idx * 0.05 }}
                        className={`h-full rounded-full ${barColor}`}
                      />
                    )}
                  </div>
                </div>

                {/* Avg. SLA wait */}
                <div className="hidden md:block text-right">
                  {s.avgSlaHours !== null ? (
                    <>
                      <p className={`text-sm font-bold ${
                        s.avgSlaHours >= breachHours  ? 'text-red-300'
                        : s.avgSlaHours >= warningHours ? 'text-amber-300'
                        : 'text-white/50'
                      }`}>
                        {formatSlaAge(s.avgSlaHours)}
                      </p>
                      <p className="text-white/20 text-[9px] mt-0.5">
                        {s.pending} pending
                      </p>
                    </>
                  ) : (
                    <p className="text-white/20 text-xs">—</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Show more / less ── */}
      {hasMore && (
        <motion.button
          onClick={() => setExpanded(v => !v)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 mx-auto transition-all px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          {expanded ? (
            <><ChevronUp className="w-3.5 h-3.5" /> Show fewer</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5" /> Show {sorted.length - PAGE} more creator{sorted.length - PAGE !== 1 ? 's' : ''}</>
          )}
        </motion.button>
      )}

      {/* ── Footer note ── */}
      <p className="text-white/15 text-[10px] text-center pt-1 border-t border-white/6">
        Approval % = (approved + scheduled + published) ÷ all decisioned cards
      </p>
    </div>
  );
}