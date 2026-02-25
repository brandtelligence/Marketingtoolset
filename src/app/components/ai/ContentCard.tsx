import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Edit3, Upload, Trash2, Send, Check, XCircle,
  Clock, CalendarDays, ChevronDown, ChevronUp,
  Image as ImageIcon, Video, Music, FileText, User,
  CheckCircle, AlertTriangle, Shield, Eye, RotateCcw, Mail,
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
} from '../../contexts/ContentContext';
import { toast } from 'sonner';

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

// ─── Compact Card ─────────────────────────────────────────────────────────────

interface ContentCardProps {
  card: ContentCardType;
  projectTeamMembers: string[];
  onOpenDetail: (card: ContentCardType) => void;
}

export function ContentCardCompact({ card, projectTeamMembers, onOpenDetail }: ContentCardProps) {
  const PlatformIcon = platformIcons[card.platform];
  const sc = statusConfig[card.status];
  const StatusIcon = sc.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      onClick={() => onOpenDetail(card)}
      className="bg-white/8 backdrop-blur-md border border-white/15 rounded-2xl overflow-hidden cursor-pointer hover:border-white/30 transition-all group shadow-lg hover:shadow-xl"
    >
      {/* Media preview */}
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

      {/* Card body */}
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  const userEmail = user?.email || '';

  const sc = statusConfig[card.status];
  const StatusIcon = sc.icon;
  const PlatformIcon = platformIcons[card.platform];

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
      id: `evt_${Date.now()}_sub`,
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
      id: `evt_${Date.now()}`,
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
      id: `evt_${Date.now()}_rej`,
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
      id: `evt_${Date.now()}_rev`,
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
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white px-3 py-2 rounded-lg text-xs hover:bg-white/30 transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" /> Replace
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
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 text-white/40 hover:text-white/60 hover:border-white/30 transition-all"
              >
                <Upload className="w-6 h-6" />
                <span className="text-xs">Upload image, video, or audio</span>
                <span className="text-[10px] text-white/30">Click to browse files</span>
              </button>
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
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Caption</label>
                <textarea
                  value={editCaption}
                  onChange={e => setEditCaption(e.target.value)}
                  rows={5}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-400/50 transition-all resize-none"
                />
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
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-blue-400 shrink-0" />
              <div>
                <div className="text-white/80 text-sm font-medium">
                  {card.scheduledDate && new Date(card.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  {card.scheduledTime && ` at ${card.scheduledTime}`}
                </div>
                <div className="text-white/40 text-xs">Scheduled publish time on {platformNames[card.platform]}</div>
              </div>
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
  );
}