import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Edit3, Upload, Trash2, Send, Check, XCircle,
  Clock, CalendarDays, ChevronDown, ChevronUp,
  Image as ImageIcon, Video, Music, FileText, User,
  CheckCircle, AlertTriangle, Shield, Eye, RotateCcw, Mail, Loader2,
  Zap, Sparkles, Heart, MessageCircle, Repeat2, TrendingUp, Timer,
} from 'lucide-react';
import {
  SiInstagram, SiFacebook, SiX, SiLinkedin, SiTiktok,
  SiYoutube, SiPinterest, SiSnapchat, SiThreads, SiReddit, SiWhatsapp,
  SiTelegram,
} from 'react-icons/si';
import { useAuth } from '../AuthContext';
import { availableTeamMembers } from '../../contexts/ProjectsContext';
import {
  useContent,
  createCardId,
  type ContentCard as ContentCardType,
  type ContentStatus,
  type AuditEntry,
  type EngagementData,
  type AiPromptHistoryEntry,
} from '../../contexts/ContentContext';
import { toast } from 'sonner';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../utils/authHeaders';
import { AIMediaGenerator, type GeneratedMedia } from './AIMediaGenerator';
import { CardCommentThread } from './CardCommentThread';
import { ClientFeedbackPanel } from './ClientFeedbackPanel';
import { ShareForReviewDialog } from './ShareForReviewDialog';
import { PublishModal } from '../publishing/PublishModal';
import {
  getSlaHoursElapsed,
  getSlaStartTime, formatSlaAge,
  getSlaStatusWith, getSlaRemainingHoursWith,
  SLA_BREACH_HOURS, SLA_WARNING_HOURS,
} from '../../utils/sla';
import { useSlaConfig } from '../../hooks/useSlaConfig';

// ─── Mock Email Notification ──────────────────────────────────────────────────

interface EmailNotification {
  to: string;
  toName: string;
  subject: string;
  body: string;
  sentAt: Date;
}

function sendMockEmailNotification(notification: EmailNotification): EmailNotification {
  // In production, this would call a real email API (e.g. SendGrid, Mailgun, SES)
  console.log(`[Mock Email] To: ${notification.to} | Subject: ${notification.subject}`);
  console.log(`[Mock Email] Body: ${notification.body}`);
  return notification;
}

function notifyCreator(
  card: ContentCardType,
  action: 'approved' | 'rejected' | 'reverted_to_draft',
  performedBy: string,
  reason?: string,
): { entry: Omit<AuditEntry, 'id'>; notification: EmailNotification } {
  const actionLabels = {
    approved: { verb: 'approved', emoji: '✅', subject: 'Your content has been approved' },
    rejected: { verb: 'rejected', emoji: '❌', subject: 'Your content has been rejected' },
    reverted_to_draft: { verb: 'reverted to draft', emoji: '🔄', subject: 'Your content has been reverted to draft' },
  };

  const { verb, emoji, subject } = actionLabels[action];
  const platformName = platformNames[card.platform] || card.platform;

  const bodyLines = [
    `Hi ${card.createdBy},`,
    '',
    `Your content "${card.title}" on ${platformName} has been ${verb} by ${performedBy}.`,
  ];

  if (reason) {
    bodyLines.push('', `Reason: ${reason}`);
  }

  bodyLines.push('', 'Please log in to the Brandtelligence portal to view details.', '', '— Brandtelligence AI Content Studio');

  const notification = sendMockEmailNotification({
    to: card.createdByEmail,
    toName: card.createdBy,
    subject: `${emoji} ${subject} — "${card.title}"`,
    body: bodyLines.join('\n'),
    sentAt: new Date(),
  });

  const entry: Omit<AuditEntry, 'id'> = {
    action: 'email_notification',
    performedBy: 'System',
    performedByEmail: 'system',
    timestamp: new Date(),
    details: `Email notification sent to ${card.createdBy} (${card.createdByEmail}): Content ${verb} by ${performedBy}${reason ? ` — "${reason}"` : ''}`,
  };

  toast.success(`Email sent to ${card.createdBy}`, {
    description: `Notified about content ${verb}`,
    icon: emoji,
    duration: 4000,
  });

  return { entry, notification };
}

// ─── Brand icons ──────────────────────────────────────────────────────────────

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

const statusConfig: Record<ContentStatus, { label: string; color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft:              { label: 'Draft',             color: 'text-gray-300',   bg: 'bg-gray-500/20',   border: 'border-gray-400/30', icon: FileText },
  pending_approval:   { label: 'Pending Approval',  color: 'text-amber-300',  bg: 'bg-amber-500/20',  border: 'border-amber-400/30', icon: Clock },
  approved:           { label: 'Approved',          color: 'text-teal-300',   bg: 'bg-teal-500/20',   border: 'border-teal-400/30', icon: CheckCircle },
  scheduled:          { label: 'Scheduled',         color: 'text-blue-300',   bg: 'bg-blue-500/20',   border: 'border-blue-400/30', icon: CalendarDays },
  published:          { label: 'Published',         color: 'text-green-300',  bg: 'bg-green-500/20',  border: 'border-green-400/30', icon: Check },
  rejected:           { label: 'Rejected',          color: 'text-red-300',    bg: 'bg-red-500/20',    border: 'border-red-400/30', icon: XCircle },
};

// ─── Schedule-status helpers ───────────────────────────────────────────────────
// Computed once per module load; safe for a single-session SPA.
const _now = new Date();
const TODAY_STR = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

type ScheduledStatus = 'due_today' | 'overdue' | 'future' | null;

function getScheduledStatus(card: ContentCardType): ScheduledStatus {
  if (card.status !== 'scheduled' || !card.scheduledDate) return null;
  if (card.scheduledDate === TODAY_STR) return 'due_today';
  if (card.scheduledDate < TODAY_STR)  return 'overdue';
  return 'future';
}

// ─── SLA sub-components ───────────────────────────────────────────────────────

/** Compact pill badge — renders null for non-pending and 'ok' status cards. */
function SlaBadge({
  card,
  warningHours = SLA_WARNING_HOURS,
  breachHours  = SLA_BREACH_HOURS,
}: {
  card: ContentCardType;
  warningHours?: number;
  breachHours?:  number;
}) {
  const status = getSlaStatusWith(card, warningHours, breachHours);
  if (!status || status === 'ok') return null;
  const hours = getSlaHoursElapsed(card)!;
  const cfg = status === 'breached'
    ? { label: 'SLA Breached', dot: 'bg-red-400 animate-pulse',   color: 'text-red-300',   bg: 'bg-red-500/10 border-red-400/20'    }
    : { label: 'At Risk',      dot: 'bg-amber-400 animate-pulse', color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-400/20' };
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label} · {formatSlaAge(hours)}
    </div>
  );
}

/** Full SLA countdown panel for the detail modal — shown only for pending_approval. */
function SlaDetailPanel({
  card,
  warningHours = SLA_WARNING_HOURS,
  breachHours  = SLA_BREACH_HOURS,
}: {
  card:          ContentCardType;
  warningHours?: number;
  breachHours?:  number;
}) {
  const status = getSlaStatusWith(card, warningHours, breachHours);
  if (!status) return null;

  const hours     = getSlaHoursElapsed(card)!;
  const remaining = getSlaRemainingHoursWith(card, breachHours);
  const startTime = getSlaStartTime(card);
  const breachAt  = new Date(startTime.getTime() + breachHours * 60 * 60 * 1000);
  const pct       = Math.min((hours / breachHours) * 100, 100);
  const overBy    = Math.max(0, hours - breachHours);

  const panelCls = status === 'breached'
    ? 'bg-red-500/8 border-red-400/20'
    : status === 'warning'
      ? 'bg-amber-500/8 border-amber-400/20'
      : 'bg-white/5 border-white/10';

  const barCls = status === 'breached' ? 'bg-red-400'   : status === 'warning' ? 'bg-amber-400' : 'bg-green-400';

  const badge = status === 'breached'
    ? { label: 'SLA Breached', dot: 'bg-red-400 animate-pulse',   color: 'text-red-300',   bg: 'bg-red-500/10 border-red-400/20'    }
    : status === 'warning'
      ? { label: 'At Risk',    dot: 'bg-amber-400 animate-pulse', color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-400/20' }
      : { label: 'On Time',   dot: 'bg-green-400',               color: 'text-green-300', bg: 'bg-green-500/8 border-green-400/15' };

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${panelCls}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="w-3.5 h-3.5 text-white/50" />
          <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Approval SLA</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${badge.bg} ${badge.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
          {badge.label}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-white/30 text-[10px] mb-0.5">Time elapsed</p>
          <p className={`font-bold text-sm ${status === 'breached' ? 'text-red-300' : status === 'warning' ? 'text-amber-300' : 'text-white/80'}`}>
            {formatSlaAge(hours)}
          </p>
        </div>
        <div>
          <p className="text-white/30 text-[10px] mb-0.5">
            {remaining > 0 ? 'Time remaining' : 'Exceeded by'}
          </p>
          <p className={`font-bold text-sm ${remaining > 0 ? 'text-white/80' : 'text-red-300'}`}>
            {remaining > 0 ? formatSlaAge(remaining) : formatSlaAge(overBy)}
          </p>
        </div>
      </div>

      {/* Progress bar with threshold markers */}
      <div>
        <div className="flex justify-between text-[9px] text-white/25 mb-1.5">
          <span>Submitted</span>
          <span>{warningHours}h ⚠ warn</span>
          <span>{breachHours}h 🔴 breach</span>
        </div>
        <div className="relative h-2 bg-white/8 rounded-full overflow-hidden">
          <div
            className="absolute top-0 bottom-0 w-px bg-amber-400/50 z-10"
            style={{ left: `${(warningHours / breachHours) * 100}%` }}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={`h-full rounded-full ${barCls}`}
          />
        </div>
      </div>

      {/* Breach deadline */}
      <p className="text-white/25 text-[10px] flex items-center gap-1.5">
        <Timer className="w-3 h-3 shrink-0" />
        Breach threshold:&nbsp;
        {breachAt.toLocaleString('en-MY', {
          weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
      </p>
    </div>
  );
}

// ─── Inline Approval Strip ────────────────────────────────────────────────────
// Rendered inside ContentCardCompact when the current user is a designated
// approver and the card is in pending_approval status.
// Decisions (approve / reject) are made without opening the detail modal.

interface InlineApprovalStripProps {
  card: ContentCardType;
}

function InlineApprovalStrip({ card }: InlineApprovalStripProps) {
  const { user } = useAuth();
  const { updateCard, logApprovalEvent } = useContent();

  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [busy,            setBusy]            = useState(false);

  const userName  = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  const userEmail = user?.email ?? '';

  // ── Approve ──
  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);

    const approverMember = availableTeamMembers.find(m =>
      user &&
      m.firstName.toLowerCase() === user.firstName.toLowerCase() &&
      m.lastName.toLowerCase() === user.lastName.toLowerCase()
    );

    const now       = new Date();
    const newStatus: ContentStatus = card.scheduledDate ? 'scheduled' : 'approved';

    const entries: Omit<AuditEntry, 'id'>[] = [
      {
        action: 'approved',
        performedBy: userName,
        performedByEmail: userEmail,
        timestamp: now,
        details: 'Content approved via inline action strip',
      },
    ];

    if (card.scheduledDate) {
      entries.push({
        action: 'scheduled',
        performedBy: 'System',
        performedByEmail: 'system',
        timestamp: now,
        details: `Auto-scheduled for ${card.scheduledDate}${card.scheduledTime ? ` at ${card.scheduledTime}` : ''} on ${platformNames[card.platform]}`,
      });
    }

    const updated: ContentCardType = {
      ...card,
      status: newStatus,
      approvedBy: approverMember?.id,
      approvedByName: userName,
      approvedAt: now,
      auditLog: [
        ...card.auditLog,
        ...entries.map((e, i) => ({ ...e, id: `audit_${Date.now()}_${i}` })),
      ],
    };

    updateCard(updated);

    // Notify creator and append email-notification audit entry
    const { entry: notifEntry } = notifyCreator(card, 'approved', userName);
    updateCard({
      ...updated,
      auditLog: [...updated.auditLog, { ...notifEntry, id: `audit_${Date.now()}_notify` }],
    });

    logApprovalEvent({
      id: crypto.randomUUID(),
      cardId: card.id,
      cardTitle: card.title,
      platform: platformNames[card.platform] || card.platform,
      action: 'approved',
      performedBy: userName,
      performedByEmail: userEmail,
      timestamp: now.toISOString(),
    });

    setBusy(false);
  };

  // ── Confirm reject ──
  const handleConfirmReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!rejectionReason.trim() || busy) return;
    setBusy(true);

    const rejecterMember = availableTeamMembers.find(m =>
      user &&
      m.firstName.toLowerCase() === user.firstName.toLowerCase() &&
      m.lastName.toLowerCase() === user.lastName.toLowerCase()
    );

    const now = new Date();
    const entry: Omit<AuditEntry, 'id'> = {
      action: 'rejected',
      performedBy: userName,
      performedByEmail: userEmail,
      timestamp: now,
      details: rejectionReason.trim(),
    };

    const updated: ContentCardType = {
      ...card,
      status: 'rejected',
      rejectedBy: rejecterMember?.id,
      rejectedByName: userName,
      rejectedAt: now,
      rejectionReason: rejectionReason.trim(),
      auditLog: [...card.auditLog, { ...entry, id: `audit_${Date.now()}` }],
    };

    updateCard(updated);

    const { entry: notifEntry } = notifyCreator(card, 'rejected', userName, rejectionReason.trim());
    updateCard({
      ...updated,
      auditLog: [...updated.auditLog, { ...notifEntry, id: `audit_${Date.now()}_notify` }],
    });

    logApprovalEvent({
      id: crypto.randomUUID(),
      cardId: card.id,
      cardTitle: card.title,
      platform: platformNames[card.platform] || card.platform,
      action: 'rejected',
      performedBy: userName,
      performedByEmail: userEmail,
      reason: rejectionReason.trim(),
      timestamp: now.toISOString(),
    });

    setShowRejectInput(false);
    setRejectionReason('');
    setBusy(false);
  };

  // ── Render: rejection reason textarea ──
  if (showRejectInput) {
    return (
      <div
        className="mt-3 pt-3 border-t border-red-400/20 space-y-2"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-red-300/80 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Rejection reason required
        </p>
        <textarea
          autoFocus
          value={rejectionReason}
          onChange={e => setRejectionReason(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') { e.stopPropagation(); setShowRejectInput(false); setRejectionReason(''); }
          }}
          placeholder="Why is this content being rejected?"
          rows={2}
          className="w-full bg-white/8 border border-red-400/30 rounded-xl px-3 py-2 text-white text-xs placeholder-white/30 focus:outline-none focus:border-red-400/50 resize-none transition-all"
          onClick={e => e.stopPropagation()}
        />
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleConfirmReject}
            disabled={!rejectionReason.trim() || busy}
            className="flex items-center gap-1.5 flex-1 justify-center bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 text-xs font-semibold px-3 py-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <XCircle className="w-3.5 h-3.5" />}
            Confirm Reject
          </motion.button>
          <button
            onClick={e => { e.stopPropagation(); setShowRejectInput(false); setRejectionReason(''); }}
            className="text-white/40 hover:text-white/60 text-xs px-3 py-2 rounded-lg hover:bg-white/8 transition-all shrink-0"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Render: approve / reject button row ──
  return (
    <div
      className="mt-3 pt-3 border-t border-amber-400/20 flex gap-2"
      onClick={e => e.stopPropagation()}
    >
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        onClick={handleApprove}
        disabled={busy}
        className="flex items-center gap-1.5 flex-1 justify-center bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/30 text-teal-300 text-xs font-semibold px-3 py-2 rounded-lg transition-all disabled:opacity-40"
      >
        {busy
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Check className="w-3.5 h-3.5" />}
        Approve
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        onClick={e => { e.stopPropagation(); setShowRejectInput(true); }}
        disabled={busy}
        className="flex items-center gap-1.5 flex-1 justify-center bg-red-500/10 hover:bg-red-500/20 border border-red-400/20 text-red-300/80 hover:text-red-300 text-xs font-semibold px-3 py-2 rounded-lg transition-all disabled:opacity-40"
      >
        <XCircle className="w-3.5 h-3.5" />
        Reject
      </motion.button>
    </div>
  );
}

// ─── Inline Publish Strip ─────────────────────────────────────────────────────
// Rendered inside ContentCardCompact for any `scheduled` card whose
// scheduledDate is today or in the past.  One-click → confirm → published.

function InlinePublishStrip({ card }: { card: ContentCardType }) {
  const { user } = useAuth();
  const { updateCard } = useContent();
  const [confirming, setConfirming] = useState(false);
  const [busy,       setBusy]       = useState(false);

  const handlePublish = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);

    const now       = new Date();
    const userName  = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
    const userEmail = user?.email ?? '';

    const entry = {
      id: `audit_${now.getTime()}`,
      action: 'published' as const,
      performedBy: userName,
      performedByEmail: userEmail,
      timestamp: now,
      details: `Marked as published on ${platformNames[card.platform] || card.platform}`,
    };

    updateCard({ ...card, status: 'published', auditLog: [...card.auditLog, entry] });

    toast.success('🚀 Published!', {
      description: `"${card.title}" is now live on ${platformNames[card.platform] || card.platform}`,
      duration: 5000,
    });

    setBusy(false);
  };

  // ── Confirm step ──
  if (confirming) {
    return (
      <div
        className="mt-3 pt-3 border-t border-green-400/20 space-y-2"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-green-300/80 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
          <Zap className="w-3 h-3" /> Confirm publish
        </p>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handlePublish}
            disabled={busy}
            className="flex items-center gap-1.5 flex-1 justify-center bg-green-500/20 hover:bg-green-500/30 border border-green-400/35 text-green-300 text-xs font-semibold px-3 py-2 rounded-lg transition-all disabled:opacity-40"
          >
            {busy
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Check className="w-3.5 h-3.5" />}
            Yes, publish now
          </motion.button>
          <button
            onClick={e => { e.stopPropagation(); setConfirming(false); }}
            className="text-white/40 hover:text-white/60 text-xs px-3 py-2 rounded-lg hover:bg-white/8 transition-all shrink-0"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Default: single publish button ──
  return (
    <div
      className="mt-3 pt-3 border-t border-green-400/20"
      onClick={e => e.stopPropagation()}
    >
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        onClick={e => { e.stopPropagation(); setConfirming(true); }}
        className="flex items-center gap-1.5 w-full justify-center bg-green-500/12 hover:bg-green-500/22 border border-green-400/25 hover:border-green-400/45 text-green-300 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
      >
        <Zap className="w-3.5 h-3.5" /> Mark as Published
      </motion.button>
    </div>
  );
}

// ─── Compact Card ─────────────────────────────────────────────────────────────

interface ContentCardProps {
  card: ContentCardType;
  projectTeamMembers: string[];
  onOpenDetail: (card: ContentCardType) => void;
  /** Bulk approval mode props — all optional; defaults keep existing behaviour */
  bulkMode?:       boolean;
  isSelectable?:   boolean;  // current user can approve this specific card
  isSelected?:     boolean;
  onToggleSelect?: (id: string) => void;
}

export function ContentCardCompact({
  card, projectTeamMembers, onOpenDetail,
  bulkMode = false, isSelectable = false, isSelected = false, onToggleSelect,
}: ContentCardProps) {
  const { user } = useAuth();
  const { warningHours, breachHours } = useSlaConfig(user?.tenantId ?? undefined);
  const PlatformIcon = platformIcons[card.platform];
  const sc = statusConfig[card.status];
  const StatusIcon = sc.icon;

  // Is the current user a designated approver who can action this card?
  const canApprove = card.status === 'pending_approval' && card.approvers.some(appId => {
    const member = availableTeamMembers.find(m => m.id === appId);
    return member && user &&
      member.firstName.toLowerCase() === user.firstName.toLowerCase() &&
      member.lastName.toLowerCase() === user.lastName.toLowerCase();
  });

  const scheduledStatus = getScheduledStatus(card);

  // ── Bulk-mode derived classes ─────────────────────────────────────────────
  const borderCls = bulkMode
    ? isSelected
      ? 'border-teal-400/75 shadow-teal-500/15 ring-1 ring-teal-400/25'
      : isSelectable
        ? 'border-white/20 hover:border-white/40'
        : 'border-white/5 opacity-40'
    : canApprove
      ? 'border-amber-400/50 shadow-amber-500/10 hover:border-amber-400/70'
      : scheduledStatus === 'due_today'
        ? 'border-green-400/40 shadow-green-500/8 hover:border-green-400/60'
        : scheduledStatus === 'overdue'
          ? 'border-orange-400/35 shadow-orange-500/8 hover:border-orange-400/55'
          : 'border-white/15 hover:border-white/30';

  const cursorCls = bulkMode
    ? isSelectable ? 'cursor-pointer' : 'cursor-not-allowed pointer-events-none'
    : 'cursor-pointer';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={!bulkMode || isSelectable ? { y: -2 } : undefined}
      onClick={() => {
        if (bulkMode) { if (isSelectable) onToggleSelect?.(card.id); return; }
        onOpenDetail(card);
      }}
      className={`relative bg-white/8 backdrop-blur-md rounded-2xl overflow-hidden transition-all group shadow-lg hover:shadow-xl border ${borderCls} ${cursorCls}`}
    >
      {/* ── Bulk checkbox overlay — top-left corner ── */}
      {bulkMode && isSelectable && (
        <div
          className={`absolute top-3 left-3 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shadow-md ${
            isSelected
              ? 'bg-teal-500 border-teal-400'
              : 'bg-black/50 border-white/50 group-hover:border-white/80'
          }`}
          onClick={e => { e.stopPropagation(); onToggleSelect?.(card.id); }}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>
      )}

      {/* ── Card status header strip ── */}
      {bulkMode && isSelectable ? (
        /* In bulk mode: compact amber/teal header */
        <div className={`flex items-center gap-1.5 border-b px-4 py-1.5 ${
          isSelected
            ? 'bg-teal-500/10 border-teal-400/20'
            : 'bg-amber-500/8 border-amber-400/15'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isSelected ? 'bg-teal-400' : 'bg-amber-400 animate-pulse'
          }`} />
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${
            isSelected ? 'text-teal-300/80' : 'text-amber-300/70'
          }`}>
            {isSelected ? 'Selected for bulk action' : 'Tap to select'}
          </span>
        </div>
      ) : !bulkMode && canApprove ? (
        /* Normal mode: "Awaiting your approval" banner */
        <div className="flex items-center gap-1.5 bg-amber-500/12 border-b border-amber-400/20 px-4 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="text-amber-300/90 text-[10px] font-semibold uppercase tracking-wider">
            Awaiting your approval
          </span>
        </div>
      ) : !bulkMode && scheduledStatus === 'due_today' ? (
        /* Due today: pulsing green banner */
        <div className="flex items-center justify-between gap-2 bg-green-500/10 border-b border-green-400/20 px-4 py-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="text-green-300/90 text-[10px] font-semibold uppercase tracking-wider">
              Due today — ready to publish
            </span>
          </div>
          <Zap className="w-3 h-3 text-green-400/70 shrink-0" />
        </div>
      ) : !bulkMode && scheduledStatus === 'overdue' ? (
        /* Overdue: orange warning banner */
        <div className="flex items-center justify-between gap-2 bg-orange-500/10 border-b border-orange-400/20 px-4 py-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-orange-400 shrink-0" />
            <span className="text-orange-300/90 text-[10px] font-semibold uppercase tracking-wider">
              Overdue — publish now
            </span>
          </div>
          <span className="text-orange-300/50 text-[9px] shrink-0">
            {card.scheduledDate}
          </span>
        </div>
      ) : null}

      {/* ── Media preview ── */}
      {card.mediaUrl && (
        <div className="h-36 relative overflow-hidden">
          {card.mediaType === 'image' ? (
            <img src={card.mediaUrl} alt="" className="w-full h-full object-cover" />
          ) : card.mediaType === 'video' ? (
            <div className="w-full h-full bg-gradient-to-br from-purple-900/80 to-gray-900/80 flex items-center justify-center">
              <Video className="w-10 h-10 text-white/40" />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-teal-900/80 to-gray-900/80 flex items-center justify-center">
              <Music className="w-10 h-10 text-white/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

          {/* Status badge on media */}
          <div className={`absolute top-2 right-2 ${sc.bg} ${sc.border} border rounded-full px-2.5 py-0.5 flex items-center gap-1`}>
            <StatusIcon className={`w-3 h-3 ${sc.color}`} />
            <span className={`text-[10px] font-semibold ${sc.color}`}>{sc.label}</span>
          </div>
        </div>
      )}

      {/* ── Card body ── */}
      <div className="p-4">
        {/* Platform + Status (if no media) */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {PlatformIcon && <PlatformIcon className={`w-4 h-4 ${platformColors[card.platform]}`} />}
            <span className="text-white/60 text-xs">{platformNames[card.platform]}</span>
          </div>
          {!card.mediaUrl && (
            <div className={`${sc.bg} ${sc.border} border rounded-full px-2 py-0.5 flex items-center gap-1`}>
              <StatusIcon className={`w-3 h-3 ${sc.color}`} />
              <span className={`text-[10px] font-semibold ${sc.color}`}>{sc.label}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-white font-semibold text-sm mb-1 line-clamp-1">{card.title}</h3>

        {/* Caption preview */}
        <p className="text-white/50 text-xs line-clamp-2 mb-3">{card.caption}</p>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-white/40">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{card.createdBy}</span>
          </div>
          {card.scheduledDate && (
            <div className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              <span>{new Date(card.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              {card.scheduledTime && <span>at {card.scheduledTime}</span>}
            </div>
          )}
        </div>

        {/* Approval info */}
        {card.approvedByName && (
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5 text-[10px]">
            <CheckCircle className="w-3 h-3 text-teal-400" />
            <span className="text-teal-300/70">Approved by {card.approvedByName}</span>
          </div>
        )}
        {card.rejectedByName && (
          <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5 text-[10px]">
            <XCircle className="w-3 h-3 text-red-400" />
            <span className="text-red-300/70">Rejected by {card.rejectedByName}</span>
          </div>
        )}

        {/* ── SLA warning badge — shows for warning/breached pending cards ── */}
        {card.status === 'pending_approval' && (
          <div className="mt-2">
            <SlaBadge card={card} warningHours={warningHours} breachHours={breachHours} />
          </div>
        )}

        {/* ── Inline approval strip — suppressed in bulk mode (floating bar handles it) ── */}
        {canApprove && !bulkMode && <InlineApprovalStrip card={card} />}

        {/* ── Inline publish strip — due today or overdue scheduled cards ── */}
        {(scheduledStatus === 'due_today' || scheduledStatus === 'overdue') && !bulkMode && (
          <InlinePublishStrip card={card} />
        )}
      </div>
    </motion.div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

interface ContentCardDetailProps {
  card: ContentCardType;
  projectTeamMembers: string[];
  onClose: () => void;
}

export function ContentCardDetail({ card: initialCard, projectTeamMembers, onClose }: ContentCardDetailProps) {
  const { user } = useAuth();
  const { updateCard, addAuditEntry, deleteCard, logApprovalEvent } = useContent();
  const { warningHours, breachHours } = useSlaConfig(user?.tenantId ?? undefined);

  const [card, setCard] = useState<ContentCardType>(initialCard);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editCaption, setEditCaption] = useState(card.caption);
  const [editHashtags, setEditHashtags] = useState(card.hashtags.join(', '));
  const [editDate, setEditDate] = useState(card.scheduledDate || '');
  const [editTime, setEditTime] = useState(card.scheduledTime || '');
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>(card.approvers);
  const [showApproverSelector, setShowApproverSelector] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showRevertInput, setShowRevertInput] = useState(false);
  const [revertReason, setRevertReason] = useState('');

  // ── AI Media Generator ────────────────────────────────────────────────────
  const [showAIGenerator,  setShowAIGenerator]  = useState(false);

  // ── Publish Modal ─────────────────────────────────────────────────────────
  const [showPublishModal, setShowPublishModal] = useState(false);

  // ── Share for Client Review ───────────────────────────────────────────────
  const [showShareReview,  setShowShareReview]  = useState(false);

  const handleAIMediaAttach = (media: GeneratedMedia) => {
    // Build prompt history entry if we have prompt metadata
    const promptEntry: AiPromptHistoryEntry | undefined = media.promptUsed
      ? {
          id:          `ph_${Date.now()}`,
          prompt:      media.promptUsed,
          tab:         media.type as 'image' | 'video',
          style:       media.styleUsed ?? '',
          aspectRatio: media.aspectRatioUsed ?? '1:1',
          generatedAt: new Date().toISOString(),
        }
      : undefined;

    const updated: ContentCardType = {
      ...card,
      mediaUrl:      media.url,
      mediaType:     media.type as 'image' | 'video',
      mediaFileName: media.filename,
      lastEditedBy:  userName,
      lastEditedAt:  new Date(),
      // Prepend to history, keep most recent 5
      aiPromptHistory: promptEntry
        ? [promptEntry, ...(card.aiPromptHistory ?? []).slice(0, 4)]
        : card.aiPromptHistory,
    };

    const entry: Omit<AuditEntry, 'id'> = {
      action:           'media_uploaded',
      performedBy:      userName,
      performedByEmail: userEmail,
      timestamp:        new Date(),
      details:          `AI-generated ${media.type} attached via AI Media Generator${media.styleUsed ? ` (${media.styleUsed} · ${media.aspectRatioUsed})` : ''}`,
    };
    updated.auditLog = [...card.auditLog, { ...entry, id: `audit_${Date.now()}` }];
    setCard(updated);
    updateCard(updated);
    setShowAIGenerator(false);
  };

  // ── AI caption refiner ────────────────────────────────────────────────────
  const [aiGenerating,    setAiGenerating]    = useState(false);
  const [aiResult,        setAiResult]        = useState<{ caption: string; hashtags: string[] } | null>(null);
  const [displayedCaption, setDisplayedCaption] = useState('');

  // Typewriter animation when a new AI result arrives
  useEffect(() => {
    if (!aiResult) { setDisplayedCaption(''); return; }
    let i = 0;
    const text = aiResult.caption;
    setDisplayedCaption('');
    const iv = setInterval(() => {
      i++;
      setDisplayedCaption(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, 6);
    return () => clearInterval(iv);
  }, [aiResult]);

  const handleAiRefine = async () => {
    setAiGenerating(true);
    setAiResult(null);
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-309fe679/ai/refine-caption`,
        {
          method: 'POST',
          headers: await getAuthHeaders(true),
          body: JSON.stringify({
            platform:         card.platform,
            title:            editTitle || card.title,
            caption:          editCaption,
            postType:         card.postType,
            visualDescription: card.visualDescription,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error('AI generation failed', { description: data.error ?? `HTTP ${res.status}` });
        return;
      }
      setAiResult({ caption: data.caption ?? '', hashtags: data.hashtags ?? [] });
    } catch (err) {
      toast.error('AI generation failed', { description: String(err) });
    } finally {
      setAiGenerating(false);
    }
  };

  // ── Engagement metrics ────────────────────────────────────────────────────
  const [showEngageForm,   setShowEngageForm]   = useState(false);
  const [engageLikes,      setEngageLikes]      = useState<string>(String(card.engagementData?.likes    ?? ''));
  const [engageComments,   setEngageComments]   = useState<string>(String(card.engagementData?.comments ?? ''));
  const [engageShares,     setEngageShares]     = useState<string>(String(card.engagementData?.shares   ?? ''));
  const [engageReach,      setEngageReach]      = useState<string>(String(card.engagementData?.reach    ?? ''));

  const handleSaveEngagement = () => {
    const data: EngagementData = {
      likes:     engageLikes     !== '' ? Number(engageLikes)    : undefined,
      comments:  engageComments  !== '' ? Number(engageComments) : undefined,
      shares:    engageShares    !== '' ? Number(engageShares)   : undefined,
      reach:     engageReach     !== '' ? Number(engageReach)    : undefined,
      updatedAt: new Date().toISOString(),
    };
    const updated: ContentCardType = { ...card, engagementData: data };
    const entry: Omit<AuditEntry, 'id'> = {
      action: 'edited',
      performedBy: userName,
      performedByEmail: userEmail,
      timestamp: new Date(),
      details: `Engagement metrics updated — ${[
        data.likes    !== undefined ? `${data.likes.toLocaleString()} likes`    : '',
        data.comments !== undefined ? `${data.comments.toLocaleString()} comments` : '',
        data.shares   !== undefined ? `${data.shares.toLocaleString()} shares`  : '',
        data.reach    !== undefined ? `${data.reach.toLocaleString()} reach`    : '',
      ].filter(Boolean).join(', ')}`,
    };
    updated.auditLog = [...card.auditLog, { ...entry, id: `audit_${Date.now()}` }];
    setCard(updated);
    updateCard(updated);
    setShowEngageForm(false);
    toast.success('Engagement metrics saved', { description: 'Data will appear in the Analytics dashboard.', duration: 3000 });
  };

  const applyAiResult = () => {
    if (!aiResult) return;
    setEditCaption(aiResult.caption);
    setEditHashtags(aiResult.hashtags.join(', '));
    setAiResult(null);
    toast.success('AI caption applied', { description: 'Caption and hashtags updated — review and save.' });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  const userEmail = user?.email || '';

  const sc = statusConfig[card.status];
  const StatusIcon = sc.icon;
  const PlatformIcon = platformIcons[card.platform];

  const scheduledStatus = getScheduledStatus(card);

  // Is user an approver for this card?
  const isApprover = card.approvers.some(appId => {
    const member = availableTeamMembers.find(m => m.id === appId);
    return member && user &&
      member.firstName.toLowerCase() === user.firstName.toLowerCase() &&
      member.lastName.toLowerCase() === user.lastName.toLowerCase();
  });

  const canApprove = isApprover && card.status === 'pending_approval';

  // ── Save edits ──
  const handleSaveEdit = () => {
    const updated: ContentCardType = {
      ...card,
      title: editTitle,
      caption: editCaption,
      hashtags: editHashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean),
      scheduledDate: editDate || undefined,
      scheduledTime: editTime || undefined,
      approvers: selectedApprovers,
      lastEditedBy: userName,
      lastEditedAt: new Date(),
    };

    const entry: Omit<AuditEntry, 'id'> = {
      action: 'edited',
      performedBy: userName,
      performedByEmail: userEmail,
      timestamp: new Date(),
      details: 'Content updated — title, caption, or schedule modified',
    };

    updated.auditLog = [...card.auditLog, { ...entry, id: `audit_${Date.now()}` }];
    setCard(updated);
    updateCard(updated);
    setIsEditing(false);
  };

  // ── Media upload ──
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    let mediaType: 'image' | 'video' | 'music' = 'image';
    if (file.type.startsWith('video/')) mediaType = 'video';
    else if (file.type.startsWith('audio/')) mediaType = 'music';

    const updated: ContentCardType = {
      ...card,
      mediaUrl: url,
      mediaType,
      mediaFileName: file.name,
      lastEditedBy: userName,
      lastEditedAt: new Date(),
    };

    const entry: Omit<AuditEntry, 'id'> = {
      action: 'media_uploaded',
      performedBy: userName,
      performedByEmail: userEmail,
      timestamp: new Date(),
      details: `Uploaded ${mediaType}: ${file.name}`,
    };

    updated.auditLog = [...card.auditLog, { ...entry, id: `audit_${Date.now()}` }];
    setCard(updated);
    updateCard(updated);
  };

  const handleRemoveMedia = () => {
    const updated: ContentCardType = {
      ...card,
      mediaUrl: undefined,
      mediaType: undefined,
      mediaFileName: undefined,
      lastEditedBy: userName,
      lastEditedAt: new Date(),
    };

    const entry: Omit<AuditEntry, 'id'> = {
      action: 'media_removed',
      performedBy: userName,
      performedByEmail: userEmail,
      timestamp: new Date(),
      details: 'Media asset removed',
    };

    updated.auditLog = [...card.auditLog, { ...entry, id: `audit_${Date.now()}` }];
    setCard(updated);
    updateCard(updated);
  };

  // ── Submit for approval ──
  const handleSubmitForApproval = () => {
    if (selectedApprovers.length === 0) {
      setShowApproverSelector(true);
      return;
    }

    const approverNames = selectedApprovers
      .map(id => { const m = availableTeamMembers.find(tm => tm.id === id); return m ? `${m.firstName} ${m.lastName}` : id; })
      .join(', ');

    const updated: ContentCardType = {
      ...card,
      status: 'pending_approval',
      approvers: selectedApprovers,
      rejectedBy: undefined,
      rejectedByName: undefined,
      rejectedAt: undefined,
      rejectionReason: undefined,
    };

    const entry: Omit<AuditEntry, 'id'> = {
      action: 'submitted_for_approval',
      performedBy: userName,
      performedByEmail: userEmail,
      timestamp: new Date(),
      details: `Submitted for approval to: ${approverNames}`,
    };

    updated.auditLog = [...card.auditLog, { ...entry, id: `audit_${Date.now()}` }];
    setCard(updated);
    updateCard(updated);

    // Log submit event for real-time notification
    logApprovalEvent({
      id: crypto.randomUUID(),
      cardId: card.id,
      cardTitle: card.title,
      platform: platformNames[card.platform] || card.platform,
      action: 'submitted_for_approval',
      performedBy: userName,
      performedByEmail: userEmail,
      timestamp: new Date().toISOString(),
    });
  };

  // ── Approve ──
  const handleApprove = () => {
    const approverMember = availableTeamMembers.find(m =>
      user &&
      m.firstName.toLowerCase() === user.firstName.toLowerCase() &&
      m.lastName.toLowerCase() === user.lastName.toLowerCase()
    );

    const updated: ContentCardType = {
      ...card,
      status: card.scheduledDate ? 'scheduled' : 'approved',
      approvedBy: approverMember?.id,
      approvedByName: userName,
      approvedAt: new Date(),
    };

    const entries: Omit<AuditEntry, 'id'>[] = [
      {
        action: 'approved',
        performedBy: userName,
        performedByEmail: userEmail,
        timestamp: new Date(),
        details: 'Content approved',
      },
    ];

    if (card.scheduledDate) {
      entries.push({
        action: 'scheduled',
        performedBy: 'System',
        performedByEmail: 'system',
        timestamp: new Date(),
        details: `Auto-scheduled for ${new Date(card.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${card.scheduledTime ? ` at ${card.scheduledTime}` : ''} on ${platformNames[card.platform]}`,
      });
    }

    updated.auditLog = [
      ...card.auditLog,
      ...entries.map((e, i) => ({ ...e, id: `audit_${Date.now()}_${i}` })),
    ];
    setCard(updated);
    updateCard(updated);

    // Notify creator
    const { entry: notificationEntry } = notifyCreator(card, 'approved', userName);
    updated.auditLog = [...updated.auditLog, { ...notificationEntry, id: `audit_${Date.now()}_notify` }];
    setCard(updated);
    updateCard(updated);

    // Log approval event
    logApprovalEvent({
      id: crypto.randomUUID(),
      cardId: card.id,
      cardTitle: card.title,
      platform: platformNames[card.platform] || card.platform,
      action: 'approved',
      performedBy: userName,
      performedByEmail: userEmail,
      timestamp: new Date().toISOString(),
    });
  };

  // ── Reject ──
  const handleReject = () => {
    if (!rejectionReason.trim()) return;

    const rejecterMember = availableTeamMembers.find(m =>
      user &&
      m.firstName.toLowerCase() === user.firstName.toLowerCase() &&
      m.lastName.toLowerCase() === user.lastName.toLowerCase()
    );

    const updated: ContentCardType = {
      ...card,
      status: 'rejected',
      rejectedBy: rejecterMember?.id,
      rejectedByName: userName,
      rejectedAt: new Date(),
      rejectionReason: rejectionReason.trim(),
    };

    const entry: Omit<AuditEntry, 'id'> = {
      action: 'rejected',
      performedBy: userName,
      performedByEmail: userEmail,
      timestamp: new Date(),
      details: rejectionReason.trim(),
    };

    updated.auditLog = [...card.auditLog, { ...entry, id: `audit_${Date.now()}` }];
    setCard(updated);
    updateCard(updated);
    setShowRejectInput(false);
    setRejectionReason('');

    // Notify creator
    const { entry: notificationEntry } = notifyCreator(card, 'rejected', userName, rejectionReason.trim());
    updated.auditLog = [...updated.auditLog, { ...notificationEntry, id: `audit_${Date.now()}_notify` }];
    setCard(updated);
    updateCard(updated);

    // Log rejection event for real-time notification
    logApprovalEvent({
      id: crypto.randomUUID(),
      cardId: card.id,
      cardTitle: card.title,
      platform: platformNames[card.platform] || card.platform,
      action: 'rejected',
      performedBy: userName,
      performedByEmail: userEmail,
      reason: rejectionReason.trim(),
      timestamp: new Date().toISOString(),
    });
  };

  // ── Revert to draft ──
  const handleRevertToDraft = () => {
    if (!revertReason.trim()) return;

    const updated: ContentCardType = {
      ...card,
      status: 'draft',
      approvedBy: undefined,
      approvedByName: undefined,
      approvedAt: undefined,
      rejectedBy: undefined,
      rejectedByName: undefined,
      rejectedAt: undefined,
      rejectionReason: undefined,
    };

    const entry: Omit<AuditEntry, 'id'> = {
      action: 'status_changed',
      performedBy: userName,
      performedByEmail: userEmail,
      timestamp: new Date(),
      details: `Reverted to draft status for re-editing: ${revertReason.trim()}`,
    };

    updated.auditLog = [...card.auditLog, { ...entry, id: `audit_${Date.now()}` }];
    setCard(updated);
    updateCard(updated);
    setShowRevertInput(false);
    setRevertReason('');

    // Notify creator
    const { entry: notificationEntry } = notifyCreator(card, 'reverted_to_draft', userName, revertReason.trim());
    updated.auditLog = [...updated.auditLog, { ...notificationEntry, id: `audit_${Date.now()}_notify` }];
    setCard(updated);
    updateCard(updated);

    // Log revert event for real-time notification
    logApprovalEvent({
      id: crypto.randomUUID(),
      cardId: card.id,
      cardTitle: card.title,
      platform: platformNames[card.platform] || card.platform,
      action: 'reverted_to_draft',
      performedBy: userName,
      performedByEmail: userEmail,
      reason: revertReason.trim(),
      timestamp: new Date().toISOString(),
    });
  };

  // ── Mark as Published ──
  const handleMarkAsPublished = () => {
    const now = new Date();
    const entry: Omit<AuditEntry, 'id'> = {
      action: 'published',
      performedBy: userName,
      performedByEmail: userEmail,
      timestamp: now,
      details: `Marked as published on ${platformNames[card.platform] || card.platform}`,
    };
    const updated: ContentCardType = {
      ...card,
      status: 'published',
      auditLog: [...card.auditLog, { ...entry, id: `audit_${now.getTime()}` }],
    };
    setCard(updated);
    updateCard(updated);
    toast.success('🚀 Published!', {
      description: `"${card.title}" is now live on ${platformNames[card.platform] || card.platform}`,
      duration: 5000,
    });
  };

  const toggleApprover = (memberId: string) => {
    setSelectedApprovers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const auditActionLabels: Record<string, { label: string; color: string }> = {
    created: { label: 'Created', color: 'text-blue-400' },
    edited: { label: 'Edited', color: 'text-purple-400' },
    media_uploaded: { label: 'Media Uploaded', color: 'text-cyan-400' },
    media_removed: { label: 'Media Removed', color: 'text-orange-400' },
    submitted_for_approval: { label: 'Submitted for Approval', color: 'text-amber-400' },
    approved: { label: 'Approved', color: 'text-teal-400' },
    rejected: { label: 'Rejected', color: 'text-red-400' },
    scheduled: { label: 'Scheduled', color: 'text-blue-400' },
    published: { label: 'Published', color: 'text-green-400' },
    status_changed: { label: 'Status Changed', color: 'text-gray-400' },
    email_notification: { label: 'Email Notification', color: 'text-indigo-400' },
  };

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-gradient-to-br from-gray-900/95 via-purple-900/90 to-gray-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col fold-modal-safe"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            {PlatformIcon && (
              <div className={`w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center`}>
                <PlatformIcon className={`w-5 h-5 ${platformColors[card.platform]}`} />
              </div>
            )}
            <div>
              <h2 className="text-white font-bold text-sm">{platformNames[card.platform]}</h2>
              <div className={`flex items-center gap-1.5 mt-0.5 ${sc.bg} ${sc.border} border rounded-full px-2 py-0.5 w-fit`}>
                <StatusIcon className={`w-3 h-3 ${sc.color}`} />
                <span className={`text-[10px] font-semibold ${sc.color}`}>{sc.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (card.status === 'draft' || card.status === 'rejected') && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── SLA Status Panel (pending_approval only) ── */}
          {card.status === 'pending_approval' && (
            <SlaDetailPanel card={card} warningHours={warningHours} breachHours={breachHours} />
          )}

          {/* ── Media Section ── */}
          <div>
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Media Asset</label>
            {card.mediaUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-white/15">
                {card.mediaType === 'image' ? (
                  <img src={card.mediaUrl} alt="" className="w-full h-48 object-cover" />
                ) : card.mediaType === 'video' ? (
                  <div className="w-full h-48 bg-gradient-to-br from-purple-900/60 to-gray-900/60 flex flex-col items-center justify-center gap-2">
                    <Video className="w-12 h-12 text-white/30" />
                    <span className="text-white/50 text-xs">{card.mediaFileName || 'Video file'}</span>
                  </div>
                ) : (
                  <div className="w-full h-32 bg-gradient-to-br from-teal-900/60 to-gray-900/60 flex flex-col items-center justify-center gap-2">
                    <Music className="w-12 h-12 text-white/30" />
                    <span className="text-white/50 text-xs">{card.mediaFileName || 'Audio file'}</span>
                  </div>
                )}

                {/* Overlay actions */}
                {(card.status === 'draft' || card.status === 'rejected') && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => setShowAIGenerator(true)}
                      className="flex items-center gap-1.5 bg-teal-500/30 backdrop-blur-sm border border-teal-400/40 text-teal-200 px-3 py-2 rounded-lg text-xs hover:bg-teal-500/50 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> AI Replace
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white px-3 py-2 rounded-lg text-xs hover:bg-white/30 transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload
                    </button>
                    <button
                      onClick={handleRemoveMedia}
                      className="flex items-center gap-1.5 bg-red-500/30 backdrop-blur-sm border border-red-400/40 text-red-200 px-3 py-2 rounded-lg text-xs hover:bg-red-500/40 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* AI generate button */}
                {(card.status === 'draft' || card.status === 'rejected') && (
                  <button
                    onClick={() => setShowAIGenerator(true)}
                    className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold text-sm transition-all
                      bg-gradient-to-r from-teal-500/20 to-purple-500/20 hover:from-teal-500/30 hover:to-purple-500/30
                      border border-teal-400/25 hover:border-teal-400/45 text-teal-300 hover:text-teal-200
                      shadow-inner"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate with AI
                    <span className="text-[10px] text-teal-400/50 font-normal">· Image or Video</span>
                  </button>
                )}

                {/* Manual upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-white/15 rounded-xl flex flex-col items-center justify-center gap-1.5 text-white/30 hover:text-white/50 hover:border-white/25 transition-all"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-xs">Upload image, video, or audio</span>
                  <span className="text-[10px] text-white/20">Click to browse files</span>
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={handleMediaUpload}
              className="hidden"
            />
          </div>

          {/* ── Title & Caption ── */}
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Title</label>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-400/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                {/* Caption label + AI Refine button */}
                <div className="flex items-center justify-between">
                  <label className="text-white/50 text-xs uppercase tracking-wider">Caption</label>
                  <button
                    type="button"
                    onClick={handleAiRefine}
                    disabled={aiGenerating}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-300 hover:text-purple-200 px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-400/20 hover:border-purple-400/35 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiGenerating
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                      : <><Sparkles className="w-3 h-3" /> AI Refine</>
                    }
                  </button>
                </div>

                <textarea
                  value={editCaption}
                  onChange={e => setEditCaption(e.target.value)}
                  rows={5}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-400/50 transition-all resize-none"
                />

                {/* AI result panel */}
                <AnimatePresence>
                  {aiResult && (
                    <motion.div
                      key="ai-result"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-purple-500/8 border border-purple-400/25 rounded-xl p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-purple-300 text-xs font-semibold">AI-Generated Caption</span>
                            <span className="text-white/20 text-[10px]">— {platformNames[card.platform]}-optimised</span>
                          </div>
                          <button
                            onClick={() => setAiResult(null)}
                            className="text-white/20 hover:text-white/50 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Typewriter caption */}
                        <p className="text-white/85 text-sm leading-relaxed whitespace-pre-line min-h-[2.5rem]">
                          {displayedCaption}
                          {displayedCaption.length < aiResult.caption.length && (
                            <span className="inline-block w-0.5 h-3.5 bg-purple-400 ml-0.5 animate-pulse align-middle" />
                          )}
                        </p>

                        {/* Hashtag pills */}
                        {aiResult.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {aiResult.hashtags.map((tag, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-400/20 px-2 py-0.5 rounded-full"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={applyAiResult}
                            className="flex items-center gap-1.5 flex-1 justify-center bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/35 text-purple-200 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                          >
                            <Check className="w-3.5 h-3.5" /> Apply Caption &amp; Hashtags
                          </motion.button>
                          <button
                            onClick={() => setAiResult(null)}
                            className="text-white/40 hover:text-white/70 text-xs px-3 py-2 rounded-xl hover:bg-white/8 transition-all"
                          >
                            Discard
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Hashtags (comma separated)</label>
                <input
                  value={editHashtags}
                  onChange={e => setEditHashtags(e.target.value)}
                  placeholder="e.g. marketing, digital, brand"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-400/50 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Schedule Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-400/50 transition-all [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Schedule Time</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={e => setEditTime(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-400/50 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Save / Cancel */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all hover:shadow-teal-500/20"
                >
                  <Check className="w-4 h-4" /> Save Changes
                </button>
                <button
                  onClick={() => { setIsEditing(false); setEditTitle(card.title); setEditCaption(card.caption); setEditHashtags(card.hashtags.join(', ')); }}
                  className="px-4 py-2.5 text-white/60 hover:text-white text-sm rounded-xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Content</label>
              <h3 className="text-white font-bold mb-2">{card.title}</h3>
              <p className="text-white/70 text-sm whitespace-pre-line leading-relaxed">{card.caption}</p>
              {card.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {card.hashtags.map((tag, i) => (
                    <span key={i} className="bg-white/10 border border-white/15 text-white/60 text-xs px-2 py-0.5 rounded-full">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Schedule Info (view mode) ── */}
          {!isEditing && (card.scheduledDate || card.scheduledTime) && (
            <div className={`border rounded-xl p-3 flex items-center gap-3 ${
              scheduledStatus === 'due_today'
                ? 'bg-green-500/8 border-green-400/25'
                : scheduledStatus === 'overdue'
                  ? 'bg-orange-500/8 border-orange-400/25'
                  : 'bg-white/5 border-white/10'
            }`}>
              <CalendarDays className={`w-5 h-5 shrink-0 ${
                scheduledStatus === 'due_today' ? 'text-green-400'
                  : scheduledStatus === 'overdue' ? 'text-orange-400'
                  : 'text-blue-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="text-white/80 text-sm font-medium">
                  {card.scheduledDate && new Date(card.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  {card.scheduledTime && ` at ${card.scheduledTime}`}
                </div>
                <div className="text-white/40 text-xs">Scheduled publish time on {platformNames[card.platform]}</div>
              </div>
              {/* Due today / overdue badge */}
              {scheduledStatus === 'due_today' && (
                <span className="flex items-center gap-1 bg-green-500/15 border border-green-400/35 text-green-300 text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse shrink-0">
                  <Zap className="w-3 h-3" /> DUE TODAY
                </span>
              )}
              {scheduledStatus === 'overdue' && (
                <span className="flex items-center gap-1 bg-orange-500/15 border border-orange-400/35 text-orange-300 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
                  <AlertTriangle className="w-3 h-3" /> OVERDUE
                </span>
              )}
            </div>
          )}

          {/* ── Rejection Notice ── */}
          {card.status === 'rejected' && card.rejectionReason && (
            <div className="bg-red-500/10 border border-red-400/25 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-300 font-semibold text-sm">Rejected by {card.rejectedByName}</span>
              </div>
              <p className="text-white/60 text-sm pl-6">{card.rejectionReason}</p>
            </div>
          )}

          {/* ── Approvers Section ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/50 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Approvers
              </label>
              {(card.status === 'draft' || card.status === 'rejected') && (
                <button
                  onClick={() => setShowApproverSelector(!showApproverSelector)}
                  className="text-teal-400 hover:text-teal-300 text-xs flex items-center gap-1 transition-colors"
                >
                  {showApproverSelector ? 'Done' : 'Select Approvers'}
                  {showApproverSelector ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            {/* Approver selector */}
            <AnimatePresence>
              {showApproverSelector && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 bg-white/5 border border-white/10 rounded-xl p-3">
                    {projectTeamMembers.map(memberId => {
                      const member = availableTeamMembers.find(m => m.id === memberId);
                      if (!member) return null;
                      const isSelected = selectedApprovers.includes(memberId);
                      return (
                        <button
                          key={memberId}
                          onClick={() => toggleApprover(memberId)}
                          className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all text-xs ${
                            isSelected
                              ? 'bg-teal-500/20 border border-teal-400/40 text-white'
                              : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                            isSelected ? 'bg-teal-500 text-white' : 'bg-white/15 text-white/50'
                          }`}>
                            {isSelected ? <Check className="w-3 h-3" /> : `${member.firstName[0]}${member.lastName[0]}`}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate">{member.firstName} {member.lastName}</div>
                            <div className="text-white/40 text-[10px] truncate">{member.jobTitle}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Current approvers display */}
            {selectedApprovers.length > 0 && !showApproverSelector && (
              <div className="flex flex-wrap gap-2">
                {selectedApprovers.map(id => {
                  const member = availableTeamMembers.find(m => m.id === id);
                  if (!member) return null;
                  const isTheApprover = card.approvedBy === id;
                  return (
                    <div
                      key={id}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
                        isTheApprover
                          ? 'bg-teal-500/20 border border-teal-400/30 text-teal-300'
                          : 'bg-white/10 border border-white/15 text-white/60'
                      }`}
                    >
                      {isTheApprover && <CheckCircle className="w-3 h-3" />}
                      {member.firstName} {member.lastName}
                    </div>
                  );
                })}
                <span className="text-white/30 text-[10px] self-center ml-1">(1 approval needed)</span>
              </div>
            )}

            {selectedApprovers.length === 0 && !showApproverSelector && (
              <p className="text-white/30 text-xs">No approvers selected</p>
            )}
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex flex-wrap gap-2">
            {/* Submit for approval */}
            {(card.status === 'draft' || card.status === 'rejected') && (
              <button
                onClick={handleSubmitForApproval}
                className="flex items-center gap-2 bg-amber-500/80 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all border border-amber-400/40"
              >
                <Send className="w-4 h-4" />
                {selectedApprovers.length === 0 ? 'Select Approvers & Submit' : 'Submit for Approval'}
              </button>
            )}

            {/* Approve / Reject (for approvers) */}
            {canApprove && !showRejectInput && (
              <>
                <button
                  onClick={handleApprove}
                  className="flex items-center gap-2 bg-teal-500/80 hover:bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all border border-teal-400/40"
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => setShowRejectInput(true)}
                  className="flex items-center gap-2 bg-red-500/30 hover:bg-red-500/50 text-red-200 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border border-red-400/30"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </>
            )}

            {/* ── Mark as Published — for scheduled cards ── */}
            {card.status === 'scheduled' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleMarkAsPublished}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all border ${
                  scheduledStatus === 'due_today'
                    ? 'bg-green-500/80 hover:bg-green-500 border-green-400/50 text-white shadow-green-500/20'
                    : scheduledStatus === 'overdue'
                      ? 'bg-orange-500/80 hover:bg-orange-500 border-orange-400/50 text-white shadow-orange-500/20'
                      : 'bg-green-500/20 hover:bg-green-500/35 border-green-400/30 text-green-300'
                }`}
              >
                <Zap className="w-4 h-4" />
                {scheduledStatus === 'overdue' ? 'Publish Now (Overdue)' : 'Mark as Published'}
              </motion.button>
            )}

            {/* ── Publish to Social Channels ── */}
            {(card.status === 'approved' || card.status === 'scheduled') && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowPublishModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border
                  bg-gradient-to-r from-teal-500/25 to-sky-500/25 hover:from-teal-500/40 hover:to-sky-500/40
                  border-teal-400/35 hover:border-teal-400/55 text-teal-200 hover:text-white shadow-sm"
              >
                <Send className="w-4 h-4" />
                Publish to Socials
              </motion.button>
            )}

            {/* Share for Client Review — available for any non-draft card */}
            {card.status !== 'draft' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowShareReview(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all border
                  bg-[#F47A20]/10 hover:bg-[#F47A20]/20 border-[#F47A20]/30 hover:border-[#F47A20]/50
                  text-[#F47A20] hover:text-white shadow-sm"
              >
                <Eye className="w-4 h-4" />
                Share for Client Review
              </motion.button>
            )}

            {/* Revert to draft */}
            {(card.status === 'rejected' || card.status === 'pending_approval') && (
              <button
                onClick={() => setShowRevertInput(true)}
                className="flex items-center gap-2 text-white/50 hover:text-white text-xs px-3 py-2 rounded-lg hover:bg-white/10 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Revert to Draft
              </button>
            )}
          </div>

          {/* Reject reason input */}
          <AnimatePresence>
            {showRejectInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-red-500/10 border border-red-400/25 rounded-xl p-4 space-y-3">
                  <label className="text-red-300 text-xs font-semibold">Reason for rejection</label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Explain what needs to be changed..."
                    rows={3}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400/50 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={!rejectionReason.trim()}
                      className="flex items-center gap-1.5 bg-red-500/60 hover:bg-red-500/80 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Confirm Rejection
                    </button>
                    <button
                      onClick={() => { setShowRejectInput(false); setRejectionReason(''); }}
                      className="text-white/50 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Revert reason input */}
          <AnimatePresence>
            {showRevertInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-red-500/10 border border-red-400/25 rounded-xl p-4 space-y-3">
                  <label className="text-red-300 text-xs font-semibold">Reason for reverting to draft</label>
                  <textarea
                    value={revertReason}
                    onChange={e => setRevertReason(e.target.value)}
                    placeholder="Explain why you're reverting to draft..."
                    rows={3}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-400/50 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleRevertToDraft}
                      disabled={!revertReason.trim()}
                      className="flex items-center gap-1.5 bg-red-500/60 hover:bg-red-500/80 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Confirm Revert
                    </button>
                    <button
                      onClick={() => { setShowRevertInput(false); setRevertReason(''); }}
                      className="text-white/50 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Engagement Metrics (published cards only) ── */}
          {card.status === 'published' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-white/50 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Engagement Metrics
                </label>
                {!showEngageForm && (
                  <button
                    onClick={() => setShowEngageForm(true)}
                    className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
                  >
                    {card.engagementData ? 'Edit' : '+ Log Metrics'}
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait">
                {showEngageForm ? (
                  /* ── Edit form ── */
                  <motion.div
                    key="engage-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-green-500/6 border border-green-400/20 rounded-xl p-4 space-y-3">
                      <p className="text-white/40 text-[11px]">Enter the latest metrics from your social platform dashboard.</p>
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          { label: 'Likes',     icon: Heart,          state: engageLikes,    set: setEngageLikes    },
                          { label: 'Comments',  icon: MessageCircle,  state: engageComments, set: setEngageComments },
                          { label: 'Shares',    icon: Repeat2,        state: engageShares,   set: setEngageShares   },
                          { label: 'Reach',     icon: Eye,            state: engageReach,    set: setEngageReach    },
                        ] as const).map(({ label, icon: Icon, state, set }) => (
                          <div key={label}>
                            <label className="text-white/40 text-[10px] uppercase tracking-wide flex items-center gap-1 mb-1">
                              <Icon className="w-3 h-3" /> {label}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={state}
                              onChange={e => set(e.target.value)}
                              placeholder="0"
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-400/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={handleSaveEngagement}
                          className="flex items-center gap-1.5 flex-1 justify-center bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/35 text-teal-200 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                        >
                          <Check className="w-3.5 h-3.5" /> Save Metrics
                        </motion.button>
                        <button
                          onClick={() => setShowEngageForm(false)}
                          className="text-white/40 hover:text-white/70 text-xs px-3 py-2 rounded-xl hover:bg-white/8 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : card.engagementData ? (
                  /* ── Metrics display ── */
                  <motion.div
                    key="engage-display"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-4 gap-2"
                  >
                    {([
                      { label: 'Likes',    icon: Heart,         value: card.engagementData.likes,    color: 'text-pink-400',  bg: 'bg-pink-500/10 border-pink-400/15'  },
                      { label: 'Comments', icon: MessageCircle, value: card.engagementData.comments, color: 'text-blue-400',  bg: 'bg-blue-500/10 border-blue-400/15'  },
                      { label: 'Shares',   icon: Repeat2,       value: card.engagementData.shares,   color: 'text-green-400', bg: 'bg-green-500/10 border-green-400/15' },
                      { label: 'Reach',    icon: Eye,           value: card.engagementData.reach,    color: 'text-purple-400',bg: 'bg-purple-500/10 border-purple-400/15'},
                    ] as const).map(({ label, icon: Icon, value, color, bg }) => (
                      <div key={label} className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 ${bg}`}>
                        <Icon className={`w-3.5 h-3.5 ${color}`} />
                        <p className={`text-sm font-bold ${value !== undefined ? 'text-white' : 'text-white/20'}`}>
                          {value !== undefined ? value.toLocaleString() : '—'}
                        </p>
                        <p className="text-white/35 text-[9px] uppercase tracking-wide">{label}</p>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  /* ── Empty prompt ── */
                  <motion.div
                    key="engage-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-between gap-3 border-2 border-dashed border-green-400/12 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <TrendingUp className="w-4 h-4 text-white/15 shrink-0" />
                      <div>
                        <p className="text-white/40 text-xs font-medium">No engagement data logged yet</p>
                        <p className="text-white/20 text-[10px]">Track likes, comments, shares &amp; reach</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowEngageForm(true)}
                      className="shrink-0 text-[11px] font-semibold text-teal-400 hover:text-teal-300 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-400/20 transition-all"
                    >
                      + Log Metrics
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Creator & Meta Info ── */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-white/40 mb-0.5">Created by</div>
              <div className="text-white/80 font-medium">{card.createdBy}</div>
              <div className="text-white/40 text-[10px]">{formatDateTime(card.createdAt)}</div>
            </div>
            {card.lastEditedBy && (
              <div>
                <div className="text-white/40 mb-0.5">Last edited by</div>
                <div className="text-white/80 font-medium">{card.lastEditedBy}</div>
                <div className="text-white/40 text-[10px]">{card.lastEditedAt && formatDateTime(card.lastEditedAt)}</div>
              </div>
            )}
            {card.approvedByName && (
              <div>
                <div className="text-white/40 mb-0.5">Approved by</div>
                <div className="text-teal-300 font-medium">{card.approvedByName}</div>
                <div className="text-white/40 text-[10px]">{card.approvedAt && formatDateTime(card.approvedAt)}</div>
              </div>
            )}
            {card.rejectedByName && (
              <div>
                <div className="text-white/40 mb-0.5">Rejected by</div>
                <div className="text-red-300 font-medium">{card.rejectedByName}</div>
                <div className="text-white/40 text-[10px]">{card.rejectedAt && formatDateTime(card.rejectedAt)}</div>
              </div>
            )}
          </div>

          {/* ── Comment Thread ── */}
          <CardCommentThread cardId={card.id} />

          {/* ── Client Feedback Panel ── */}
          <ClientFeedbackPanel cardId={card.id} />

          {/* ── Audit Trail ── */}
          <div>
            <button
              onClick={() => setShowAuditLog(!showAuditLog)}
              className="flex items-center justify-between w-full text-white/50 hover:text-white/70 text-xs uppercase tracking-wider transition-colors py-2"
            >
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Audit Trail ({card.auditLog.length} entries)
              </span>
              {showAuditLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <AnimatePresence>
              {showAuditLog && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    {card.auditLog.map((entry, i) => {
                      const cfg = auditActionLabels[entry.action] || { label: entry.action, color: 'text-white/50' };
                      return (
                        <div
                          key={entry.id}
                          className={`flex items-start gap-3 px-4 py-3 ${i < card.auditLog.length - 1 ? 'border-b border-white/5' : ''}`}
                        >
                          {/* Timeline dot */}
                          <div className="flex flex-col items-center pt-1">
                            {entry.action === 'email_notification' ? (
                              <Mail className={`w-3.5 h-3.5 ${cfg.color} shrink-0`} />
                            ) : (
                              <div className={`w-2 h-2 rounded-full ${cfg.color.replace('text-', 'bg-')}`} />
                            )}
                            {i < card.auditLog.length - 1 && <div className="w-px flex-1 bg-white/10 mt-1" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold text-xs ${cfg.color}`}>{cfg.label}</span>
                              <span className="text-white/30 text-[10px]">by {entry.performedBy}</span>
                            </div>
                            {entry.details && (
                              <p className="text-white/50 text-[11px] mt-0.5 leading-relaxed">{entry.details}</p>
                            )}
                            <div className="text-white/25 text-[10px] mt-1">{formatDateTime(entry.timestamp)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>

    {/* ── AI Media Generator modal ──────────────────────────────────────── */}
    {showAIGenerator && (
      <AIMediaGenerator
        card={card}
        promptHistory={card.aiPromptHistory}
        onAttach={handleAIMediaAttach}
        onClose={() => setShowAIGenerator(false)}
      />
    )}

    {/* ── Publish Modal ─────────────────────────────────────────────────── */}
    {showPublishModal && (
      <PublishModal
        card={card}
        tenantId={(card as any).tenantId ?? user?.tenantId ?? ''}
        onClose={() => setShowPublishModal(false)}
      />
    )}

    {/* ── Share for Client Review ────────────────────────────────────── */}
    {showShareReview && (
      <ShareForReviewDialog
        cards={[card]}
        tenantId={(card as any).tenantId ?? user?.tenantId ?? ''}
        onClose={() => setShowShareReview(false)}
      />
    )}
  </>
  );
}