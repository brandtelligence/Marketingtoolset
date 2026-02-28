import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus, Filter, LayoutGrid, Search,
  FileText, Clock, CheckCircle, CalendarDays, Check, XCircle, Loader2,
  ChevronLeft, ChevronRight, CheckSquare2, Square, X,
  ShieldCheck, AlertTriangle, BarChart2, Users, Trophy, Sparkles, Timer,
  Share2,
} from 'lucide-react';
import {
  SiInstagram, SiFacebook, SiX, SiLinkedin, SiTiktok,
  SiYoutube, SiPinterest, SiSnapchat, SiThreads, SiReddit, SiWhatsapp,
  SiTelegram,
} from 'react-icons/si';
import { toast } from 'sonner';
import { useAuth } from '../AuthContext';
import {
  useContent, createCardId,
  type ContentCard, type ContentStatus,
} from '../../contexts/ContentContext';
import { availableTeamMembers } from '../../contexts/ProjectsContext';
import { ContentCardCompact, ContentCardDetail } from './ContentCard';
import { ShareForReviewDialog } from './ShareForReviewDialog';
import { AutoPublishFailureBanner } from './AutoPublishFailureBanner';
import { ContentAnalyticsDashboard } from './ContentAnalyticsDashboard';
import { ContentCalendarView } from './ContentCalendarView';
import { ContentLeaderboard } from './ContentLeaderboard';
import { socialPlatforms } from './aiEngine';
import { useFoldableLayout } from '../../hooks/useFoldableLayout';
import { projectId as supabaseProjectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHeaders';
import {
  getSlaStatusWith, getSlaHoursElapsed, formatSlaAge,
  SLA_BREACH_HOURS, SLA_WARNING_HOURS,
} from '../../utils/sla';
import { useSlaConfig } from '../../hooks/useSlaConfig';

// ─── Platform brand icons ─────────────────────────────────────────────────────

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: SiInstagram, facebook: SiFacebook, twitter: SiX,
  linkedin: SiLinkedin, tiktok: SiTiktok, youtube: SiYoutube,
  pinterest: SiPinterest, snapchat: SiSnapchat, threads: SiThreads,
  reddit: SiReddit, whatsapp: SiWhatsapp, telegram: SiTelegram,
};

const platformColors: Record<string, string> = {
  instagram: 'text-pink-400', facebook: 'text-blue-500', twitter: 'text-white',
  linkedin: 'text-blue-400', tiktok: 'text-white', youtube: 'text-red-500',
  pinterest: 'text-red-400', snapchat: 'text-yellow-300', threads: 'text-white',
  reddit: 'text-orange-500', whatsapp: 'text-green-400', telegram: 'text-sky-400',
};

const platformNames: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', twitter: 'X (Twitter)',
  linkedin: 'LinkedIn', tiktok: 'TikTok', youtube: 'YouTube',
  pinterest: 'Pinterest', snapchat: 'Snapchat', threads: 'Threads',
  reddit: 'Reddit', whatsapp: 'WhatsApp Business', telegram: 'Telegram',
};

const statusFilters: {
  value: ContentStatus | 'all';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { value: 'all',              label: 'All',       icon: LayoutGrid,   color: 'text-white/60' },
  { value: 'draft',            label: 'Draft',     icon: FileText,     color: 'text-gray-300' },
  { value: 'pending_approval', label: 'Pending',   icon: Clock,        color: 'text-amber-300' },
  { value: 'approved',         label: 'Approved',  icon: CheckCircle,  color: 'text-teal-300' },
  { value: 'scheduled',        label: 'Scheduled', icon: CalendarDays, color: 'text-blue-300' },
  { value: 'published',        label: 'Published', icon: Check,        color: 'text-green-300' },
  { value: 'rejected',         label: 'Rejected',  icon: XCircle,      color: 'text-red-300' },
];

// ─── ContentBoard ─────────────────────────────────────────────────────────────

interface ContentBoardProps {
  projectId: string;
  projectTeamMembers: string[];
  projectName: string;
}

export function ContentBoard({ projectId, projectTeamMembers, projectName }: ContentBoardProps) {
  const { user } = useAuth();
  const {
    getCardsByProject, addCard, updateCard,
    isLoading, isSynced,
  } = useContent();
  const cards = getCardsByProject(projectId);
  const { isDualScreen, isSquarish } = useFoldableLayout();

  // ── Filters ──
  const [statusFilter,   setStatusFilter]   = useState<ContentStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [selectedCard,   setSelectedCard]   = useState<ContentCard | null>(null);
  const [showNewCardForm, setShowNewCardForm] = useState(false);

  // ── Pagination ──
  const CARDS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  // ── New card form ──
  const [newPlatform,       setNewPlatform]       = useState('instagram');
  const [newTitle,          setNewTitle]          = useState('');
  const [newCaption,        setNewCaption]        = useState('');
  const [newHashtags,       setNewHashtags]       = useState('');
  const [briefGenerating,   setBriefGenerating]   = useState(false);

  // ── Bulk approval mode ────────────────────────────────────────────────────
  const [bulkMode,            setBulkMode]            = useState(false);
  const [selectedIds,         setSelectedIds]         = useState<Set<string>>(new Set());
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectReason,    setBulkRejectReason]    = useState('');
  const [bulkBusy,            setBulkBusy]            = useState(false);

  // ── Bulk "Share for Review" mode ──────────────────────────────────────────
  // Allows selecting any non-draft card to bundle into a client review link.
  const [bulkShareMode,       setBulkShareMode]       = useState(false);
  const [showBulkShareDialog, setShowBulkShareDialog] = useState(false);

  // ── Analytics panel ───────────────────────────────────────────────────────
  const [showAnalytics,    setShowAnalytics]    = useState(false);
  const [showLeaderboard,  setShowLeaderboard]  = useState(false);

  // ── Per-tenant SLA thresholds ─────────────────────────────────────────────
  const { warningHours, breachHours } = useSlaConfig(user?.tenantId ?? undefined);

  // ── SLA counts (project-wide across all pending cards) ───────────────────
  const slaBreachedCount = useMemo(
    () => cards.filter(c => c.status === 'pending_approval' && getSlaStatusWith(c, warningHours, breachHours) === 'breached').length,
    [cards, warningHours, breachHours],
  );
  const slaWarningCount = useMemo(
    () => cards.filter(c => c.status === 'pending_approval' && getSlaStatusWith(c, warningHours, breachHours) === 'warning').length,
    [cards, warningHours, breachHours],
  );

  // ── One-time login SLA toast + escalation email ───────────────────────────
  // Fires 900 ms after initial load resolves, once per session.
  const slaNotifiedRef  = useRef(false);
  const slaEscalatedRef = useRef(false);
  useEffect(() => {
    if (slaNotifiedRef.current || !user || isLoading) return;
    const t = setTimeout(() => {
      slaNotifiedRef.current = true;
      const myBreached = cards.filter(c => myActionableIds.has(c.id) && getSlaStatusWith(c, warningHours, breachHours) === 'breached');
      const myWarning  = cards.filter(c => myActionableIds.has(c.id) && getSlaStatusWith(c, warningHours, breachHours) === 'warning');

      // ── In-app toast notifications ──
      if (myBreached.length > 0) {
        toast.error(
          `⏰ ${myBreached.length} SLA-breached card${myBreached.length !== 1 ? 's' : ''} need your decision`,
          {
            description: `In ${projectName}: waiting >${breachHours}h for your approval. Open the Pending filter to review.`,
            duration: 8000,
          },
        );
      } else if (myWarning.length > 0) {
        toast.warning(
          `⚠️ ${myWarning.length} card${myWarning.length !== 1 ? 's' : ''} approaching SLA deadline`,
          {
            description: `In ${projectName}: ${myWarning.length > 1 ? 'these cards have' : 'a card has'} been pending >${warningHours}h.`,
            duration: 6000,
          },
        );
      }

      // ── Escalation email (TENANT_ADMIN / SUPER_ADMIN only, breached cards only) ──
      const allBreached = cards.filter(c =>
        c.status === 'pending_approval' &&
        getSlaStatusWith(c, warningHours, breachHours) === 'breached',
      );
      const canEscalate = user.role === 'TENANT_ADMIN' || user.role === 'SUPER_ADMIN';
      if (!slaEscalatedRef.current && canEscalate && allBreached.length > 0 && user.tenantId) {
        slaEscalatedRef.current = true;
        (async () => {
          try {
            const payload = {
              tenantId: user.tenantId,
              breachHours,
              cards: allBreached.map(c => ({
                id:           c.id,
                title:        c.title,
                platform:     c.platform,
                createdBy:    c.createdBy,
                hoursElapsed: getSlaHoursElapsed(c) ?? 0,
              })),
              escalateTo: [{ name: `${user.firstName} ${user.lastName}`, email: user.email }],
            };
            const res = await fetch(
              `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-309fe679/sla/escalate`,
              {
                method:  'POST',
                headers: await getAuthHeaders(true),
                body:    JSON.stringify(payload),
              },
            );
            const data = await res.json();
            if (data.sent > 0) {
              toast.info(
                `📧 Escalation email sent for ${data.sent} SLA-breached card${data.sent !== 1 ? 's' : ''}`,
                { description: 'Your team has been notified via email.', duration: 5000 },
              );
            }
          } catch (err) {
            console.log('[sla/escalate] client error:', err);
          }
        })();
      }
    }, 900);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user]);

  // ── View mode (grid vs calendar) ──────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');

  // ── Filtered cards ──
  const filteredCards = useMemo(() => {
    let result = cards;
    if (statusFilter !== 'all') result = result.filter(c => c.status === statusFilter);
    if (platformFilter !== 'all') result = result.filter(c => c.platform === platformFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.caption.toLowerCase().includes(q) ||
        c.createdBy.toLowerCase().includes(q)
      );
    }
    return result;
  }, [cards, statusFilter, platformFilter, searchQuery]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredCards.length / CARDS_PER_PAGE));
  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    return filteredCards.slice(start, start + CARDS_PER_PAGE);
  }, [filteredCards, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [statusFilter, platformFilter, searchQuery]);

  // Exit bulk mode when filters change; clear selection when page changes
  useEffect(() => {
    if (bulkMode) { setBulkMode(false); setSelectedIds(new Set()); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, platformFilter, searchQuery]);

  useEffect(() => {
    // When navigating pages in bulk mode, keep mode but clear selection
    // so the user re-picks on each page (avoids off-page invisible selections)
    if (bulkMode) setSelectedIds(new Set());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // ── Status counts ──
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: cards.length };
    cards.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return counts;
  }, [cards]);

  // ── My actionable pending cards ──
  // Cards the current user is a designated approver for.
  const myActionableIds = useMemo<Set<string>>(() => {
    if (!user) return new Set();
    return new Set(
      cards
        .filter(c =>
          c.status === 'pending_approval' &&
          c.approvers.some(appId => {
            const member = availableTeamMembers.find(m => m.id === appId);
            return member &&
              member.firstName.toLowerCase() === user.firstName.toLowerCase() &&
              member.lastName.toLowerCase() === user.lastName.toLowerCase();
          })
        )
        .map(c => c.id)
    );
  }, [cards, user]);

  const myPendingCount = myActionableIds.size;

  // ── Due-today / overdue scheduled cards ──────────────────────────────────
  const _nowCB = new Date();
  const _todayCB = `${_nowCB.getFullYear()}-${String(_nowCB.getMonth() + 1).padStart(2, '0')}-${String(_nowCB.getDate()).padStart(2, '0')}`;

  const dueTodayCount = useMemo(
    () => cards.filter(c => c.status === 'scheduled' && c.scheduledDate === _todayCB).length,
    [cards]
  );
  const overdueCount = useMemo(
    () => cards.filter(c => c.status === 'scheduled' && c.scheduledDate !== undefined && c.scheduledDate < _todayCB).length,
    [cards]
  );

  // Actionable cards on the current page (for Select All on this page).
  // In share mode any non-draft card is actionable; in approval mode only the user's pending cards.
  const pageActionableIds = useMemo(
    () => new Set(
      paginatedCards
        .filter(c => bulkShareMode ? c.status !== 'draft' : myActionableIds.has(c.id))
        .map(c => c.id)
    ),
    [paginatedCards, myActionableIds, bulkShareMode]
  );

  const allPageSelected =
    pageActionableIds.size > 0 &&
    [...pageActionableIds].every(id => selectedIds.has(id));

  // ── Unique platforms ──
  const usedPlatforms = useMemo(
    () => Array.from(new Set(cards.map(c => c.platform))),
    [cards]
  );

  // ── Toggle bulk approval mode ──
  const toggleBulkMode = () => {
    setBulkMode(v => {
      if (v) setSelectedIds(new Set());
      return !v;
    });
    setBulkShareMode(false); // mutually exclusive
    setSelectedIds(new Set());
  };

  // ── Toggle bulk share-for-review mode ──
  const toggleBulkShareMode = () => {
    setBulkShareMode(v => {
      if (v) setSelectedIds(new Set());
      return !v;
    });
    setBulkMode(false); // mutually exclusive
    setSelectedIds(new Set());
  };

  // ── Toggle individual card selection ──
  const handleToggleSelect = (cardId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  // ── Select / deselect all on current page ──
  const handleSelectAllPage = () => {
    if (allPageSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pageActionableIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pageActionableIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  // ── All non-draft card IDs (for share-all-global in share mode) ──
  const allShareableIds = useMemo(
    () => new Set(cards.filter(c => c.status !== 'draft').map(c => c.id)),
    [cards]
  );

  // ── Select all actionable across all pages ──
  const handleSelectAllGlobal = () => {
    if (bulkShareMode) {
      if (selectedIds.size === allShareableIds.size) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(allShareableIds));
      }
    } else {
      if (selectedIds.size === myActionableIds.size) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(myActionableIds));
      }
    }
  };

  // ── Bulk Approve ──────────────────────────────────────────────────────────
  const handleBulkApprove = () => {
    if (selectedIds.size === 0 || bulkBusy || !user) return;
    setBulkBusy(true);

    const now       = new Date();
    const userName  = `${user.firstName} ${user.lastName}`;
    const userEmail = user.email;

    const approverMember = availableTeamMembers.find(m =>
      m.firstName.toLowerCase() === user.firstName.toLowerCase() &&
      m.lastName.toLowerCase() === user.lastName.toLowerCase()
    );

    let count = 0;
    for (const cardId of selectedIds) {
      const card = cards.find(c => c.id === cardId);
      if (!card || card.status !== 'pending_approval') continue;

      const newStatus = card.scheduledDate ? 'scheduled' : 'approved';
      const entries: any[] = [
        {
          id: `audit_${now.getTime()}_${count}_0`,
          action: 'approved',
          performedBy: userName,
          performedByEmail: userEmail,
          timestamp: now,
          details: `Bulk approved — batch of ${selectedIds.size} card${selectedIds.size !== 1 ? 's' : ''}`,
        },
      ];
      if (card.scheduledDate) {
        entries.push({
          id: `audit_${now.getTime()}_${count}_1`,
          action: 'scheduled',
          performedBy: 'System',
          performedByEmail: 'system',
          timestamp: now,
          details: `Auto-scheduled for ${card.scheduledDate}${card.scheduledTime ? ` at ${card.scheduledTime}` : ''}`,
        });
      }

      updateCard({
        ...card,
        status: newStatus,
        approvedBy: approverMember?.id,
        approvedByName: userName,
        approvedAt: now,
        auditLog: [...card.auditLog, ...entries],
      });
      count++;
    }

    toast.success(`✅ ${count} card${count !== 1 ? 's' : ''} approved`, {
      description: `Bulk approved by ${userName}. Cards moved to approved / scheduled status.`,
      duration: 6000,
    });

    setSelectedIds(new Set());
    setBulkMode(false);
    setBulkBusy(false);
  };

  // ── Bulk Reject ───────────────────────────────────────────────────────────
  const handleBulkReject = () => {
    if (selectedIds.size === 0 || !bulkRejectReason.trim() || bulkBusy || !user) return;
    setBulkBusy(true);

    const now       = new Date();
    const userName  = `${user.firstName} ${user.lastName}`;
    const userEmail = user.email;
    const reason    = bulkRejectReason.trim();

    const rejecterMember = availableTeamMembers.find(m =>
      m.firstName.toLowerCase() === user.firstName.toLowerCase() &&
      m.lastName.toLowerCase() === user.lastName.toLowerCase()
    );

    let count = 0;
    for (const cardId of selectedIds) {
      const card = cards.find(c => c.id === cardId);
      if (!card || card.status !== 'pending_approval') continue;

      const entry = {
        id: `audit_${now.getTime()}_${count}`,
        action: 'rejected' as const,
        performedBy: userName,
        performedByEmail: userEmail,
        timestamp: now,
        details: `Bulk rejected — ${reason}`,
      };

      updateCard({
        ...card,
        status: 'rejected',
        rejectedBy: rejecterMember?.id,
        rejectedByName: userName,
        rejectedAt: now,
        rejectionReason: reason,
        auditLog: [...card.auditLog, entry],
      });
      count++;
    }

    toast(`❌ ${count} card${count !== 1 ? 's' : ''} rejected`, {
      description: `Bulk rejected by ${userName}: "${reason.slice(0, 60)}${reason.length > 60 ? '…' : ''}"`,
      duration: 6000,
    });

    setBulkRejectReason('');
    setShowBulkRejectModal(false);
    setSelectedIds(new Set());
    setBulkMode(false);
    setBulkBusy(false);
  };

  // ── Create card ──
  const handleCreateCard = () => {
    if (!newTitle.trim() || !user) return;
    const userName = `${user.firstName} ${user.lastName}`;
    const card: ContentCard = {
      id: createCardId(),
      projectId,
      platform: newPlatform,
      channel: 'social-media',
      title: newTitle.trim(),
      caption: newCaption.trim(),
      hashtags: newHashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean),
      status: 'draft',
      approvers: [],
      createdBy: userName,
      createdByEmail: user.email,
      createdAt: new Date(),
      auditLog: [{
        id: `audit_${Date.now()}`,
        action: 'created',
        performedBy: userName,
        performedByEmail: user.email,
        timestamp: new Date(),
        details: 'Content card created manually',
      }],
    };
    addCard(card);
    setNewTitle('');
    setNewCaption('');
    setNewHashtags('');
    setShowNewCardForm(false);
  };

  /** Calls the AI refine-caption route to pre-fill caption + hashtags in the new card form. */
  const handleGenerateBrief = async () => {
    if (!newTitle.trim()) return;
    setBriefGenerating(true);
    try {
      const res = await fetch(
        `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-309fe679/ai/refine-caption`,
        {
          method: 'POST',
          headers: await getAuthHeaders(true),
          body: JSON.stringify({ platform: newPlatform, title: newTitle.trim(), caption: '' }),
        }
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error('Brief generation failed', { description: data.error ?? `HTTP ${res.status}` });
        return;
      }
      if (data.caption)        setNewCaption(data.caption);
      if (data.hashtags?.length) setNewHashtags(data.hashtags.join(', '));
      toast.success('✨ Brief generated', {
        description: `Caption and hashtags ready for ${platformNames[newPlatform] ?? newPlatform}`,
        duration: 3000,
      });
    } catch (err) {
      toast.error('Brief generation failed', { description: String(err) });
    } finally {
      setBriefGenerating(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Content Board
            <span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full font-normal">
              {cards.length} cards
            </span>
            {isLoading && <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />}
            {!isLoading && isSynced && (
              <span className="flex items-center gap-1 text-[10px] text-teal-400/60 font-normal">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                Synced
              </span>
            )}
          </h2>
          <p className="text-white/50 text-xs mt-0.5">
            Manage, edit, and approve content for {projectName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk approve toggle — only when the user has pending cards to action */}
          {myPendingCount > 0 && (
            <motion.button
              onClick={toggleBulkMode}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-all ${
                bulkMode
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 shadow-amber-500/10 shadow-md'
                  : 'bg-white/8 border-white/15 text-white/70 hover:bg-white/15 hover:text-white hover:border-white/25'
              }`}
            >
              {bulkMode
                ? <><X className="w-4 h-4" /> Exit Bulk Mode</>
                : <><CheckSquare2 className="w-4 h-4" /> Bulk Approve</>
              }
            </motion.button>
          )}

          {/* Share for Review toggle — always visible */}
          <motion.button
            onClick={toggleBulkShareMode}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-all ${
              bulkShareMode
                ? 'bg-[#F47A20]/20 border-[#F47A20]/40 text-[#F47A20] shadow-orange-500/10 shadow-md'
                : 'bg-white/8 border-white/15 text-white/70 hover:bg-white/15 hover:text-white hover:border-white/25'
            }`}
          >
            {bulkShareMode
              ? <><X className="w-4 h-4" /> Exit Share Mode</>
              : <><Share2 className="w-4 h-4" /><span className="hidden sm:inline">Share for Review</span></>
            }
          </motion.button>

          {/* Analytics toggle */}
          <motion.button
            onClick={() => setShowAnalytics(v => !v)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-all ${
              showAnalytics
                ? 'bg-purple-500/20 border-purple-400/40 text-purple-300 shadow-purple-500/10 shadow-md'
                : 'bg-white/8 border-white/15 text-white/70 hover:bg-white/15 hover:text-white hover:border-white/25'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </motion.button>

          {/* Leaderboard toggle */}
          <motion.button
            onClick={() => setShowLeaderboard(v => !v)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-all ${
              showLeaderboard
                ? 'bg-blue-500/20 border-blue-400/40 text-blue-300 shadow-blue-500/10 shadow-md'
                : 'bg-white/8 border-white/15 text-white/70 hover:bg-white/15 hover:text-white hover:border-white/25'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Leaderboard</span>
          </motion.button>

          {/* View mode toggle (Grid / Calendar) */}
          <div className="flex items-center gap-0.5 bg-white/8 border border-white/15 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/8'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Grid</span>
            </button>
            <button
              onClick={() => {
                setViewMode('calendar');
                if (bulkMode) { setBulkMode(false); setSelectedIds(new Set()); }
              }}
              title="Calendar view"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/8'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Calendar</span>
            </button>
          </div>

          <motion.button
            onClick={() => setShowNewCardForm(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg hover:shadow-teal-500/20 transition-all"
          >
            <Plus className="w-4 h-4" /> New Content Card
          </motion.button>
        </div>
      </div>

      {/* ── Analytics micro-dashboard (collapsible) ── */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            key="analytics-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="bg-white/5 border border-purple-400/20 rounded-2xl p-5">
              {/* Panel header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-purple-400" />
                  <h3 className="text-white font-semibold text-sm">Content Analytics</h3>
                  <span className="text-white/30 text-[10px]">— {projectName}</span>
                </div>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <ContentAnalyticsDashboard cards={cards} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Leaderboard micro-dashboard (collapsible) ── */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            key="leaderboard-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="bg-white/5 border border-blue-400/20 rounded-2xl p-5">
              {/* Panel header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-blue-400" />
                  <h3 className="text-white font-semibold text-sm">Content Leaderboard</h3>
                  <span className="text-white/30 text-[10px]">— {projectName}</span>
                </div>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <ContentLeaderboard cards={cards} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Auto-publish failure alert banner ── */}
      {user?.tenantId && (
        <AutoPublishFailureBanner
          tenantId={user.tenantId}
          onOpenCard={(cardId) => {
            const card = cards.find(c => c.id === cardId);
            if (card) setSelectedCard(card);
          }}
        />
      )}

      {/* ── Bulk approval mode instruction banner ── */}
      <AnimatePresence>
        {bulkMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-amber-400/30 bg-amber-500/8">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-amber-200 text-xs font-semibold">
                    Bulk Approval Mode — {myPendingCount} card{myPendingCount !== 1 ? 's' : ''} awaiting your decision
                  </p>
                  <p className="text-amber-300/50 text-[10px] mt-0.5">
                    Tap cards with a checkbox to select them, then use the action bar below to approve or reject.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSelectAllGlobal}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300/80 hover:text-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-500/10 transition-all shrink-0 border border-amber-400/20"
              >
                {selectedIds.size === myActionableIds.size
                  ? <><Square className="w-3 h-3" /> Clear all</>
                  : <><CheckSquare2 className="w-3 h-3" /> Select all {myActionableIds.size}</>
                }
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bulk share-for-review mode instruction banner ── */}
      <AnimatePresence>
        {bulkShareMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[#F47A20]/30 bg-[#F47A20]/6">
              <div className="flex items-center gap-2.5">
                <Share2 className="w-4 h-4 text-[#F47A20] shrink-0" />
                <div>
                  <p className="text-orange-200 text-xs font-semibold">
                    Share for Review Mode — select cards to send to a client
                  </p>
                  <p className="text-orange-300/50 text-[10px] mt-0.5">
                    Any non-draft card can be selected. A single shareable review link will be generated.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSelectAllGlobal}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#F47A20]/80 hover:text-[#F47A20] px-3 py-1.5 rounded-lg hover:bg-[#F47A20]/10 transition-all shrink-0 border border-[#F47A20]/20"
              >
                {selectedIds.size === allShareableIds.size
                  ? <><Square className="w-3 h-3" /> Clear all</>
                  : <><CheckSquare2 className="w-3 h-3" /> Select all {allShareableIds.size}</>
                }
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── My approval queue callout (non-bulk, non-share mode only) ── */}
      <AnimatePresence>
        {!bulkMode && !bulkShareMode && myPendingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-amber-400/30 bg-amber-500/8 cursor-pointer hover:bg-amber-500/12 transition-all"
              onClick={() => setStatusFilter('pending_approval')}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <p className="text-amber-200 text-xs font-semibold">
                  {myPendingCount === 1
                    ? '1 content card is awaiting your approval'
                    : `${myPendingCount} content cards are awaiting your approval`}
                </p>
              </div>
              <span className="text-amber-300/60 text-[10px] font-medium shrink-0">
                View all →
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Due-today / overdue scheduled callout ── */}
      <AnimatePresence>
        {!bulkMode && (dueTodayCount > 0 || overdueCount > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${
                overdueCount > 0
                  ? 'border-orange-400/30 bg-orange-500/8 hover:bg-orange-500/12'
                  : 'border-green-400/30 bg-green-500/8 hover:bg-green-500/12'
              }`}
              onClick={() => setStatusFilter('scheduled')}
            >
              <div className="flex items-center gap-2.5">
                {overdueCount > 0 ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                )}
                <p className={`text-xs font-semibold ${overdueCount > 0 ? 'text-orange-200' : 'text-green-200'}`}>
                  {overdueCount > 0
                    ? `${overdueCount} overdue post${overdueCount !== 1 ? 's' : ''} — scheduled date passed without publishing`
                    : `${dueTodayCount} post${dueTodayCount !== 1 ? 's are' : ' is'} due today and ready to publish`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {dueTodayCount > 0 && overdueCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-green-300/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    {dueTodayCount} today
                  </span>
                )}
                <span className={`text-[10px] font-medium ${overdueCount > 0 ? 'text-orange-300/60' : 'text-green-300/60'}`}>
                  View →
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SLA breach / warning callout ── */}
      <AnimatePresence>
        {!bulkMode && (slaBreachedCount > 0 || slaWarningCount > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${
                slaBreachedCount > 0
                  ? 'border-red-400/30 bg-red-500/8 hover:bg-red-500/12'
                  : 'border-amber-400/30 bg-amber-500/8 hover:bg-amber-500/12'
              }`}
              onClick={() => setStatusFilter('pending_approval')}
            >
              <div className="flex items-center gap-2.5">
                <Timer className={`w-3.5 h-3.5 shrink-0 ${slaBreachedCount > 0 ? 'text-red-400' : 'text-amber-400'}`} />
                <p className={`text-xs font-semibold ${slaBreachedCount > 0 ? 'text-red-200' : 'text-amber-200'}`}>
                  {slaBreachedCount > 0
                    ? `${slaBreachedCount} pending card${slaBreachedCount !== 1 ? 's' : ''} exceeded the ${SLA_BREACH_HOURS}h approval SLA`
                    : `${slaWarningCount} pending card${slaWarningCount !== 1 ? 's' : ''} approaching the ${SLA_BREACH_HOURS}h approval SLA`}
                </p>
                {slaBreachedCount > 0 && slaWarningCount > 0 && (
                  <span className="hidden sm:block text-[10px] text-amber-300/60 shrink-0">
                    +{slaWarningCount} at risk
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium shrink-0 ${slaBreachedCount > 0 ? 'text-red-300/60' : 'text-amber-300/60'}`}>
                Review →
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status filter pills ── */}
      <div className="overflow-x-auto -mx-1 px-1 scrollbar-none">
        <div className="flex gap-1.5 sm:gap-2 w-max sm:w-auto sm:flex-wrap">
          {statusFilters.map(sf => {
            const SfIcon     = sf.icon;
            const count      = statusCounts[sf.value] || 0;
            const isActive   = statusFilter === sf.value;
            const showMyBadge = sf.value === 'pending_approval' && myPendingCount > 0;
            return (
              <button
                key={sf.value}
                onClick={() => setStatusFilter(sf.value)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all border whitespace-nowrap min-h-[2.25rem] ${
                  isActive
                    ? showMyBadge
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                      : 'bg-white/15 border-white/30 text-white'
                    : showMyBadge
                      ? 'bg-amber-500/10 border-amber-400/30 text-amber-300/80 hover:bg-amber-500/15 hover:text-amber-200'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70'
                }`}
              >
                {showMyBadge
                  ? <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  : <SfIcon className={`w-3 h-3 ${isActive ? sf.color : ''}`} />
                }
                {sf.label}
                {count > 0 && (
                  <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-white/30'}`}>
                    ({count})
                  </span>
                )}
                {showMyBadge && (
                  <span className="ml-0.5 bg-amber-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {myPendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search + Platform filter ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search content cards..."
            className="w-full bg-white/8 border border-white/15 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-teal-400/40 transition-all"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-white/8 border border-white/15 rounded-xl px-3 py-1.5">
          <Filter className="w-3.5 h-3.5 text-white/30" />
          <select
            value={platformFilter}
            onChange={e => setPlatformFilter(e.target.value)}
            className="bg-transparent text-white text-xs focus:outline-none appearance-none cursor-pointer pr-4"
          >
            <option value="all" className="bg-gray-900">All Platforms</option>
            {usedPlatforms.map(p => (
              <option key={p} value={p} className="bg-gray-900">{platformNames[p] || p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── New Card Form ── */}
      <AnimatePresence>
        {showNewCardForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/8 backdrop-blur-md border border-teal-400/30 rounded-2xl p-5 space-y-3">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-400" /> Create New Content Card
              </h3>

              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Platform</label>
                <div className="flex flex-wrap gap-2">
                  {socialPlatforms.map(p => {
                    const PIcon      = platformIcons[p.id];
                    const isSelected = newPlatform === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setNewPlatform(p.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all border ${
                          isSelected
                            ? 'bg-white/15 border-teal-400/50 text-white'
                            : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                        }`}
                      >
                        {PIcon && <PIcon className={`w-3.5 h-3.5 ${isSelected ? platformColors[p.id] : 'text-white/40'}`} />}
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title + AI brief button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-white/50 text-xs">Title</label>
                  {newTitle.trim() && (
                    <button
                      type="button"
                      onClick={handleGenerateBrief}
                      disabled={briefGenerating}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-300 hover:text-purple-200 px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-400/20 hover:border-purple-400/35 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {briefGenerating
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                        : <><Sparkles className="w-3 h-3" /> Generate Brief</>
                      }
                    </button>
                  )}
                </div>
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Content card title..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-400/50 transition-all"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Caption (optional)</label>
                <textarea
                  value={newCaption}
                  onChange={e => setNewCaption(e.target.value)}
                  placeholder="Write your caption or click ✨ Generate Brief..."
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-400/50 transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Hashtags (comma separated)</label>
                <input
                  value={newHashtags}
                  onChange={e => setNewHashtags(e.target.value)}
                  placeholder="e.g. marketing, digital, brand"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-400/50 transition-all"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCreateCard}
                  disabled={!newTitle.trim()}
                  className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" /> Create Card
                </button>
                <button
                  onClick={() => { setShowNewCardForm(false); setNewTitle(''); setNewCaption(''); setNewHashtags(''); }}
                  className="text-white/50 hover:text-white text-sm px-4 py-2 rounded-xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cards Grid OR Calendar View ── */}
      <AnimatePresence mode="wait">
        {viewMode === 'calendar' ? (
          <motion.div
            key="calendar-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="bg-white/5 border border-blue-400/15 rounded-2xl p-5"
          >
            {/* Calendar panel header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-400" />
                <h3 className="text-white font-semibold text-sm">Content Calendar</h3>
                <span className="text-white/30 text-[10px]">— {projectName}</span>
                {(statusFilter !== 'all' || platformFilter !== 'all') && (
                  <span className="text-[10px] font-semibold text-blue-300 bg-blue-500/12 border border-blue-400/20 px-2 py-0.5 rounded-full">
                    Filtered
                  </span>
                )}
              </div>
              <button
                onClick={() => setViewMode('grid')}
                className="text-white/25 hover:text-white/60 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <ContentCalendarView
              cards={filteredCards}
              onOpenDetail={setSelectedCard}
            />
          </motion.div>
        ) : (
          <motion.div
            key="grid-view"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {/* ── Cards Grid ── */}
            {paginatedCards.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <h3 className="text-white/50 font-semibold mb-1">No content cards found</h3>
                <p className="text-white/30 text-sm">
                  {cards.length === 0
                    ? 'Create your first content card or use the AI Content Studio to generate content.'
                    : 'Try adjusting your filters to see more cards.'}
                </p>
              </motion.div>
            ) : (
              <motion.div
                layout
                className={
                  isDualScreen || isSquarish
                    ? 'fold-auto-grid'
                    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                }
              >
                <AnimatePresence>
                  {paginatedCards.map(card => {
                    // In approval mode: only cards the user can approve are selectable.
                    // In share mode: any non-draft card is selectable.
                    const isSelectable = bulkShareMode
                      ? card.status !== 'draft'
                      : myActionableIds.has(card.id);
                    const isSelected   = selectedIds.has(card.id);
                    return (
                      <ContentCardCompact
                        key={card.id}
                        card={card}
                        projectTeamMembers={projectTeamMembers}
                        onOpenDetail={setSelectedCard}
                        bulkMode={bulkMode || bulkShareMode}
                        isSelectable={isSelectable}
                        isSelected={isSelected}
                        onToggleSelect={handleToggleSelect}
                      />
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── Pagination Controls ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center mt-4">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 bg-white/8 border border-white/15 rounded-xl px-3 py-1.5 text-white/50 hover:text-white/70 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <span className="mx-2 text-white/50 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 bg-white/8 border border-white/15 rounded-xl px-3 py-1.5 text-white/50 hover:text-white/70 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating bulk SHARE action bar ── */}
      <AnimatePresence>
        {bulkShareMode && viewMode === 'grid' && (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="sticky bottom-4 z-40 flex justify-center pointer-events-none"
          >
            <div
              className="pointer-events-auto flex flex-col sm:flex-row items-center gap-3 px-5 py-3.5 rounded-2xl border border-[#F47A20]/25 shadow-2xl shadow-black/60"
              style={{ background: 'rgba(15,10,40,0.94)', backdropFilter: 'blur(20px)' }}
            >
              {/* Count */}
              <div>
                <p className="text-white font-semibold text-sm leading-tight">
                  {selectedIds.size === 0 ? 'Select non-draft cards' : `${selectedIds.size} card${selectedIds.size !== 1 ? 's' : ''} selected`}
                </p>
                <p className="text-white/35 text-[10px] leading-tight">Click cards to add to the review bundle</p>
              </div>

              <div className="hidden sm:block h-8 w-px bg-white/10" />

              {/* Share button */}
              <motion.button
                whileHover={{ scale: selectedIds.size > 0 ? 1.03 : 1 }}
                whileTap={{ scale: selectedIds.size > 0 ? 0.97 : 1 }}
                onClick={() => selectedIds.size > 0 && setShowBulkShareDialog(true)}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-2 bg-[#F47A20]/20 hover:bg-[#F47A20]/35 border border-[#F47A20]/40 text-[#F47A20] px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed min-w-[10rem] justify-center"
              >
                <Share2 className="w-4 h-4" />
                Share{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </motion.button>

              {/* Exit */}
              <button
                onClick={() => { setBulkShareMode(false); setSelectedIds(new Set()); }}
                className="p-2 rounded-xl text-white/35 hover:text-white/70 hover:bg-white/8 transition-all"
                title="Exit share mode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating bulk APPROVE action bar (grid mode only) ── */}
      <AnimatePresence>
        {bulkMode && viewMode === 'grid' && (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="sticky bottom-4 z-40 flex justify-center pointer-events-none"
          >
            <div
              className="pointer-events-auto flex flex-col sm:flex-row items-center gap-3 px-5 py-3.5 rounded-2xl border border-white/15 shadow-2xl shadow-black/60"
              style={{
                background: 'rgba(15,10,40,0.92)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              {/* Left: selection summary */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Page select-all checkbox */}
                <button
                  onClick={handleSelectAllPage}
                  disabled={pageActionableIds.size === 0}
                  className="flex items-center gap-1.5 text-[11px] text-white/50 hover:text-white/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  title="Select / deselect all on this page"
                >
                  {allPageSelected
                    ? <CheckSquare2 className="w-4 h-4 text-amber-400" />
                    : <Square className="w-4 h-4" />
                  }
                  <span className="hidden sm:inline">
                    {allPageSelected ? 'Deselect page' : 'Select page'}
                  </span>
                </button>

                <div className="hidden sm:block h-4 w-px bg-white/10" />

                {/* Count */}
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">
                    {selectedIds.size === 0
                      ? 'Select cards'
                      : `${selectedIds.size} card${selectedIds.size !== 1 ? 's' : ''} selected`}
                  </p>
                  <p className="text-white/35 text-[10px] leading-tight">
                    {myActionableIds.size} actionable across all pages
                  </p>
                </div>

                {/* Select all global */}
                {myActionableIds.size > pageActionableIds.size && (
                  <button
                    onClick={handleSelectAllGlobal}
                    className="hidden sm:flex items-center gap-1 text-[10px] text-amber-300/70 hover:text-amber-200 px-2 py-1 rounded-lg hover:bg-amber-500/10 transition-all border border-amber-400/15"
                  >
                    {selectedIds.size === myActionableIds.size
                      ? 'Clear all'
                      : `All ${myActionableIds.size}`}
                  </button>
                )}
              </div>

              <div className="hidden sm:block h-8 w-px bg-white/10" />

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Approve */}
                <motion.button
                  whileHover={{ scale: selectedIds.size > 0 ? 1.03 : 1 }}
                  whileTap={{ scale: selectedIds.size > 0 ? 0.97 : 1 }}
                  onClick={handleBulkApprove}
                  disabled={selectedIds.size === 0 || bulkBusy}
                  className="flex items-center gap-2 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-300 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed min-w-[7rem] justify-center"
                >
                  {bulkBusy
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Check className="w-4 h-4" />}
                  Approve{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                </motion.button>

                {/* Reject */}
                <motion.button
                  whileHover={{ scale: selectedIds.size > 0 ? 1.03 : 1 }}
                  whileTap={{ scale: selectedIds.size > 0 ? 0.97 : 1 }}
                  onClick={() => setShowBulkRejectModal(true)}
                  disabled={selectedIds.size === 0 || bulkBusy}
                  className="flex items-center gap-2 bg-red-500/15 hover:bg-red-500/25 border border-red-400/30 text-red-300 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed min-w-[7rem] justify-center"
                >
                  <XCircle className="w-4 h-4" />
                  Reject{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                </motion.button>

                {/* Exit */}
                <button
                  onClick={() => { setBulkMode(false); setSelectedIds(new Set()); }}
                  className="p-2 rounded-xl text-white/35 hover:text-white/70 hover:bg-white/8 transition-all"
                  title="Exit bulk mode"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bulk reject modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBulkRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/65"
              style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
              onClick={() => setShowBulkRejectModal(false)}
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-red-400/20 p-6 shadow-2xl"
              style={{ background: 'rgba(15,10,40,0.97)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-400/25 flex items-center justify-center shrink-0 mt-0.5">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base leading-tight">
                    Reject {selectedIds.size} card{selectedIds.size !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-white/45 text-xs mt-1">
                    This rejection reason will be applied to all {selectedIds.size} selected card{selectedIds.size !== 1 ? 's' : ''} and sent to their creators.
                  </p>
                </div>
              </div>

              {/* Reason textarea */}
              <textarea
                autoFocus
                value={bulkRejectReason}
                onChange={e => setBulkRejectReason(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') setShowBulkRejectModal(false);
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleBulkReject();
                }}
                placeholder="Why are these cards being rejected? Provide clear feedback for the team…"
                rows={4}
                className="w-full bg-white/8 border border-red-400/30 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-red-400/60 resize-none transition-all mb-4"
              />

              {/* Character count hint */}
              <p className="text-white/25 text-[10px] -mt-3 mb-4 text-right">
                {bulkRejectReason.length} chars · Ctrl+Enter to submit
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleBulkReject}
                  disabled={!bulkRejectReason.trim() || bulkBusy}
                  className="flex items-center gap-2 flex-1 justify-center bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {bulkBusy
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <XCircle className="w-4 h-4" />}
                  Confirm Reject ({selectedIds.size})
                </motion.button>

                <button
                  onClick={() => setShowBulkRejectModal(false)}
                  className="text-white/50 hover:text-white/80 px-5 py-2.5 rounded-xl hover:bg-white/8 transition-all text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Card detail modal ── */}
      <AnimatePresence>
        {selectedCard && (
          <ContentCardDetail
            card={selectedCard}
            projectTeamMembers={projectTeamMembers}
            onClose={() => setSelectedCard(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Bulk Share for Review dialog ── */}
      {showBulkShareDialog && (
        <ShareForReviewDialog
          cards={cards.filter(c => selectedIds.has(c.id))}
          tenantId={user?.tenantId ?? ''}
          onClose={() => {
            setShowBulkShareDialog(false);
            setBulkShareMode(false);
            setSelectedIds(new Set());
          }}
        />
      )}
    </div>
  );
}