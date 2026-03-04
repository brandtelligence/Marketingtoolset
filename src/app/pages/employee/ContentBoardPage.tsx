/**
 * ContentBoardPage  —  /app/board
 * ─────────────────────────────────────────────────────────────────────────────
 * Kanban-style Content Board with drag-and-drop columns, bulk operations,
 * and CSV/PDF export.
 *
 * Features:
 *   - 6 status columns: Draft, Pending, Approved, Scheduled, Published, Rejected
 *   - Drag cards between columns to change status
 *   - Multi-select cards for bulk approve / reject / schedule / delete
 *   - Export filtered content to CSV or printable PDF
 *   - 3 view modes: Kanban (drag-and-drop), List (table), Grid (card grid)
 *   - URL query param persistence for filters and view mode
 *   - Full dark/light theme support
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  FileText, Clock, CheckCircle2, CalendarDays, Send, XCircle,
  GripVertical, Check, X, Filter, Download, FileSpreadsheet,
  Printer, CheckSquare, Square, Trash2, ArrowRight, Search,
  MoreHorizontal, Eye, ChevronDown, AlertTriangle, Sparkles,
  Columns3, List, LayoutGrid, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { BackgroundLayout } from '../../components/BackgroundLayout';
import { EmployeeNav } from '../../components/EmployeeNav';
import { ProfileBanner } from '../../components/ProfileBanner';
import { useAuth } from '../../components/AuthContext';
import { useContent, type ContentCard, type ContentStatus } from '../../contexts/ContentContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { employeeTheme } from '../../utils/employeeTheme';
import { useSEO } from '../../hooks/useSEO';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAG_TYPE = 'CONTENT_CARD';

const COLUMNS: { status: ContentStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { status: 'draft',            label: 'Draft',     color: '#94a3b8', icon: <FileText className="w-4 h-4" />     },
  { status: 'pending_approval', label: 'Pending',   color: '#F47A20', icon: <Clock className="w-4 h-4" />        },
  { status: 'approved',         label: 'Approved',  color: '#0BA4AA', icon: <CheckCircle2 className="w-4 h-4" /> },
  { status: 'scheduled',        label: 'Scheduled', color: '#a855f7', icon: <CalendarDays className="w-4 h-4" /> },
  { status: 'published',        label: 'Published', color: '#22c55e', icon: <Send className="w-4 h-4" />         },
  { status: 'rejected',         label: 'Rejected',  color: '#ef4444', icon: <XCircle className="w-4 h-4" />      },
];

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '📘', twitter: '🐦', linkedin: '💼',
  tiktok: '🎵', youtube: '📺', general: '📄', whatsapp: '💬', telegram: '✈️',
};

// Allowed status transitions for drag-and-drop
const ALLOWED_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  draft:            ['pending_approval'],
  pending_approval: ['approved', 'rejected', 'draft'],
  approved:         ['scheduled', 'draft'],
  scheduled:        ['approved', 'published'],
  published:        [],
  rejected:         ['draft'],
};

// ─── Sorting ──────────────────────────────────────────────────────────────────

type SortField = 'title' | 'platform' | 'status' | 'project' | 'scheduled' | 'created';
type SortDir   = 'asc' | 'desc';

const STATUS_ORDER: Record<ContentStatus, number> = {
  draft: 0, pending_approval: 1, approved: 2, scheduled: 3, published: 4, rejected: 5,
};

const ALL_STATUSES: ContentStatus[] = [
  'draft', 'pending_approval', 'approved', 'scheduled', 'published', 'rejected',
];

// ─── Kanban Card (Draggable) ──────────────────────────────────────────────────

interface KanbanCardProps {
  card: ContentCard;
  isDark: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onViewCard: (card: ContentCard) => void;
  projectName: string;
}

function KanbanCard({ card, isDark, isSelected, onToggleSelect, onViewCard, projectName }: KanbanCardProps) {
  const et = employeeTheme(isDark);
  const [{ isDragging }, dragRef] = useDrag({
    type: DRAG_TYPE,
    item: { id: card.id, currentStatus: card.status },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const emoji = PLATFORM_EMOJI[card.platform] ?? '📄';

  return (
    <div
      ref={dragRef as any}
      className={`group relative ${et.glassInner} p-3 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-40 scale-95' : 'opacity-100'
      } ${isSelected ? (isDark ? 'ring-2 ring-[#0BA4AA]/60 bg-[#0BA4AA]/8' : 'ring-2 ring-[#0BA4AA]/40 bg-[#0BA4AA]/5') : ''}`}
    >
      {/* Select checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleSelect(card.id); }}
        className={`absolute top-2 left-2 z-10 transition-all ${
          isSelected || 'opacity-0 group-hover:opacity-100'
        }`}
      >
        {isSelected
          ? <CheckSquare className="w-4 h-4 text-[#0BA4AA]" />
          : <Square className={`w-4 h-4 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
        }
      </button>

      {/* Drag handle */}
      <div className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Card content */}
      <div className="pl-5" onClick={() => onViewCard(card)}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-sm">{emoji}</span>
          <span className={`text-[10px] font-medium capitalize ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            {card.platform}
          </span>
        </div>
        <p className={`text-xs font-semibold leading-snug truncate ${et.text}`}>{card.title}</p>
        <p className={`text-[10px] ${et.textFaint} truncate mt-0.5`}>{projectName}</p>

        {card.scheduledDate && (
          <div className={`flex items-center gap-1 mt-2 text-[10px] ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
            <CalendarDays className="w-3 h-3" />
            {card.scheduledDate}{card.scheduledTime ? ` at ${card.scheduledTime}` : ''}
          </div>
        )}

        {card.caption && (
          <p className={`text-[10px] ${et.textFaint} mt-1.5 line-clamp-2 leading-relaxed`}>
            {card.caption.slice(0, 80)}{card.caption.length > 80 ? '...' : ''}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className={`text-[9px] ${et.textFaint}`}>
            by {card.createdBy}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onViewCard(card); }}
            className={`text-[10px] flex items-center gap-0.5 transition-colors ${
              isDark ? 'text-white/30 hover:text-[#0BA4AA]' : 'text-gray-400 hover:text-[#0BA4AA]'
            }`}
          >
            <Eye className="w-3 h-3" /> View
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column (Drop Target) ──────────────────────────────────────────────

interface KanbanColumnProps {
  status: ContentStatus;
  label: string;
  color: string;
  icon: React.ReactNode;
  cards: ContentCard[];
  isDark: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onViewCard: (card: ContentCard) => void;
  onDropCard: (cardId: string, newStatus: ContentStatus) => void;
  getProjectName: (projectId: string) => string;
}

function KanbanColumn({
  status, label, color, icon, cards, isDark, selectedIds,
  onToggleSelect, onViewCard, onDropCard, getProjectName,
}: KanbanColumnProps) {
  const et = employeeTheme(isDark);

  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: DRAG_TYPE,
    canDrop: (item: { id: string; currentStatus: ContentStatus }) => {
      if (item.currentStatus === status) return false;
      return ALLOWED_TRANSITIONS[item.currentStatus]?.includes(status) ?? false;
    },
    drop: (item: { id: string; currentStatus: ContentStatus }) => {
      onDropCard(item.id, status);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const selectedInColumn = cards.filter(c => selectedIds.has(c.id)).length;

  return (
    <div
      ref={dropRef as any}
      className={`flex flex-col min-w-[260px] max-w-[300px] flex-1 rounded-2xl transition-all ${
        isOver && canDrop
          ? isDark ? 'bg-[#0BA4AA]/8 border-2 border-[#0BA4AA]/40' : 'bg-[#0BA4AA]/5 border-2 border-[#0BA4AA]/30'
          : isOver && !canDrop
            ? isDark ? 'bg-red-500/8 border-2 border-red-500/30' : 'bg-red-500/5 border-2 border-red-400/30'
            : isDark ? 'bg-white/[0.03] border border-white/8' : 'bg-gray-50/80 border border-gray-200/60'
      }`}
    >
      {/* Column header */}
      <div className="px-3 py-3 flex items-center gap-2 shrink-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}18` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <span className={`text-xs font-semibold ${et.text} flex-1`}>{label}</span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: `${color}18`, color }}
        >
          {cards.length}
        </span>
        {selectedInColumn > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#0BA4AA]/15 text-[#0BA4AA]">
            {selectedInColumn} sel
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 max-h-[calc(100vh-320px)] scrollbar-thin">
        {cards.length === 0 ? (
          <div className={`flex items-center justify-center py-8 text-[11px] ${et.textFaint}`}>
            {isOver && canDrop ? 'Drop here' : 'No cards'}
          </div>
        ) : (
          cards.map(card => (
            <KanbanCard
              key={card.id}
              card={card}
              isDark={isDark}
              isSelected={selectedIds.has(card.id)}
              onToggleSelect={onToggleSelect}
              onViewCard={onViewCard}
              projectName={getProjectName(card.projectId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Card Detail Modal ────────────────────────────────────────────────────────

export function CardDetailModal({ card, isDark, onClose }: { card: ContentCard; isDark: boolean; onClose: () => void }) {
  const et = employeeTheme(isDark);
  const { projects } = useProjects();
  const project = projects.find(p => p.id === card.projectId);
  const col = COLUMNS.find(c => c.status === card.status)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative ${et.glass} p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto`}
      >
        <button onClick={onClose} className={`absolute top-4 right-4 ${et.textFaint} hover:${et.text}`}>
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">{PLATFORM_EMOJI[card.platform] ?? '📄'}</span>
          <div>
            <h3 className={`text-sm font-bold ${et.text}`}>{card.title}</h3>
            <p className={`text-[11px] ${et.textFaint}`}>{project?.name ?? 'Unknown'} · {card.platform}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{ background: `${col.color}18`, color: col.color }}
          >
            {col.label}
          </span>
          {card.scheduledDate && (
            <span className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
              <CalendarDays className="w-3 h-3" />
              {card.scheduledDate} {card.scheduledTime ?? ''}
            </span>
          )}
        </div>

        {card.caption && (
          <div className="mb-4">
            <p className={`text-[10px] font-semibold ${et.textMd} mb-1`}>Caption</p>
            <p className={`text-xs ${et.textSm} whitespace-pre-wrap leading-relaxed`}>{card.caption}</p>
          </div>
        )}

        {card.hashtags.length > 0 && (
          <div className="mb-4">
            <p className={`text-[10px] font-semibold ${et.textMd} mb-1`}>Hashtags</p>
            <div className="flex flex-wrap gap-1">
              {card.hashtags.map(tag => (
                <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-md ${isDark ? 'bg-[#0BA4AA]/10 text-[#0BA4AA] border border-[#0BA4AA]/20' : 'bg-teal-50 text-teal-700 border border-teal-200'}`}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <p className={`text-[10px] font-semibold ${et.textMd} mb-1`}>Details</p>
          <div className={`grid grid-cols-2 gap-2 text-[11px] ${et.textSm}`}>
            <div>Created by: <span className="font-medium">{card.createdBy}</span></div>
            <div>Created: <span className="font-medium">{card.createdAt.toLocaleDateString()}</span></div>
            {card.approvedByName && <div>Approved by: <span className="font-medium">{card.approvedByName}</span></div>}
            {card.rejectedByName && <div>Rejected by: <span className="font-medium">{card.rejectedByName}</span></div>}
          </div>
        </div>

        {card.rejectionReason && (
          <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${isDark ? 'bg-red-500/8 text-red-300 border border-red-500/20' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{card.rejectionReason}</span>
          </div>
        )}

        {card.auditLog.length > 0 && (
          <div className="mt-4">
            <p className={`text-[10px] font-semibold ${et.textMd} mb-2`}>Audit Trail ({card.auditLog.length})</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {card.auditLog.slice().reverse().map(entry => (
                <div key={entry.id} className={`text-[10px] flex items-start gap-2 px-2 py-1.5 rounded-lg ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                  <span className={`${et.textFaint} shrink-0 mt-0.5`}>
                    {entry.timestamp instanceof Date ? entry.timestamp.toLocaleString() : new Date(entry.timestamp).toLocaleString()}
                  </span>
                  <span className={et.textSm}>
                    <span className="font-medium">{entry.performedBy}</span>{' '}
                    {entry.action.replace(/_/g, ' ')}
                    {entry.details ? ` — ${entry.details}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Bulk Schedule Modal ──────────────────────────────────────────────────────

function BulkScheduleModal({
  count, isDark, onClose, onConfirm,
}: {
  count: number; isDark: boolean; onClose: () => void;
  onConfirm: (date: string, time: string) => void;
}) {
  const et = employeeTheme(isDark);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative ${et.glass} p-6 w-full max-w-sm`}
      >
        <h3 className={`text-sm font-bold ${et.text} mb-1`}>Schedule {count} card{count !== 1 ? 's' : ''}</h3>
        <p className={`text-xs ${et.textFaint} mb-4`}>Set the publish date and time for all selected cards.</p>

        <div className="space-y-3 mb-5">
          <div>
            <label className={`text-[10px] font-semibold ${et.textMd} mb-1 block`}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={et.inputCls}
            />
          </div>
          <div>
            <label className={`text-[10px] font-semibold ${et.textMd} mb-1 block`}>Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={et.inputCls}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              isDark ? 'bg-white/8 text-white/60 hover:bg-white/12' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (date) onConfirm(date, time); else toast.error('Please select a date'); }}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-[#a855f7] text-white hover:bg-[#9333ea] transition-all"
          >
            Schedule All
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Export Helpers ────────────────────────────────────────────────────────────

function exportToCSV(cards: ContentCard[], getProjectName: (id: string) => string) {
  const headers = ['Title', 'Platform', 'Channel', 'Status', 'Project', 'Created By', 'Created At', 'Scheduled Date', 'Scheduled Time', 'Caption', 'Hashtags'];
  const rows = cards.map(c => [
    `"${c.title.replace(/"/g, '""')}"`,
    c.platform,
    c.channel,
    c.status.replace(/_/g, ' '),
    `"${getProjectName(c.projectId).replace(/"/g, '""')}"`,
    c.createdBy,
    c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    c.scheduledDate ?? '',
    c.scheduledTime ?? '',
    `"${(c.caption ?? '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    c.hashtags.map(t => `#${t}`).join(' '),
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `content-board-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportToPrint(cards: ContentCard[], getProjectName: (id: string) => string) {
  const statusLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Content Board Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #111; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { font-size: 12px; color: #666; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
        td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
        tr:nth-child(even) { background: #fafafa; }
        .status { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; }
        .status-draft { background: #f1f5f9; color: #64748b; }
        .status-pending_approval { background: #fff7ed; color: #ea580c; }
        .status-approved { background: #ecfdf5; color: #059669; }
        .status-scheduled { background: #faf5ff; color: #9333ea; }
        .status-published { background: #f0fdf4; color: #16a34a; }
        .status-rejected { background: #fef2f2; color: #dc2626; }
        .caption { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>Content Board Report</h1>
      <p class="meta">Generated ${new Date().toLocaleString()} — ${cards.length} content cards</p>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Platform</th>
            <th>Status</th>
            <th>Project</th>
            <th>Created By</th>
            <th>Scheduled</th>
            <th>Caption</th>
          </tr>
        </thead>
        <tbody>
          ${cards.map(c => `
            <tr>
              <td><strong>${c.title}</strong></td>
              <td>${c.platform}</td>
              <td><span class="status status-${c.status}">${statusLabel(c.status)}</span></td>
              <td>${getProjectName(c.projectId)}</td>
              <td>${c.createdBy}</td>
              <td>${c.scheduledDate ? `${c.scheduledDate}${c.scheduledTime ? ' ' + c.scheduledTime : ''}` : '—'}</td>
              <td class="caption">${(c.caption ?? '').slice(0, 60)}${(c.caption ?? '').length > 60 ? '...' : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ContentBoardPage() {
  const { user } = useAuth();
  const { cards, updateCard, deleteCard } = useContent();
  const { projects } = useProjects();
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);
  const navigate = useNavigate();

  useSEO({
    title: 'Content Board',
    description: 'Kanban board for managing content cards with drag-and-drop, bulk operations, and export.',
    noindex: true,
  });

  // ── State ──────────────────────────────────────────────────────────────────

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewCard, setViewCard] = useState<ContentCard | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // ── URL Query Params (single source of truth) ─────────────────────────────

  const [searchParams, setSearchParams] = useSearchParams();

  const filterPlatform = searchParams.get('platform') || 'all';
  const filterProject  = searchParams.get('project')  || 'all';
  const searchQuery    = searchParams.get('search')   || '';
  const viewMode       = (searchParams.get('view') as 'kanban' | 'list' | 'grid') || 'kanban';

  const setFilter = useCallback((key: string, value: string, defaultVal: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === defaultVal) next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setFilterPlatform = useCallback((v: string) => setFilter('platform', v, 'all'), [setFilter]);
  const setFilterProject  = useCallback((v: string) => setFilter('project', v, 'all'),  [setFilter]);
  const setSearchQuery    = useCallback((v: string) => setFilter('search', v, ''),       [setFilter]);
  const setViewMode       = useCallback((v: string) => setFilter('view', v, 'kanban'),   [setFilter]);

  // Sort & status filter from URL params
  const sortBy    = (searchParams.get('sort') as SortField) || 'created';
  const sortDir   = (searchParams.get('dir') as SortDir) || 'desc';
  const statusRaw = searchParams.get('statuses');
  const visibleStatuses = useMemo<Set<ContentStatus>>(() => {
    if (!statusRaw) return new Set(ALL_STATUSES);
    const parsed = statusRaw.split(',').filter(s => ALL_STATUSES.includes(s as ContentStatus)) as ContentStatus[];
    return parsed.length > 0 ? new Set(parsed) : new Set(ALL_STATUSES);
  }, [statusRaw]);

  const setSortBy = useCallback((field: SortField) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const currentSort = prev.get('sort') || 'created';
      const currentDir  = prev.get('dir')  || 'desc';
      if (currentSort === field) {
        next.set('dir', currentDir === 'asc' ? 'desc' : 'asc');
      } else {
        next.set('sort', field);
        next.set('dir', 'asc');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const toggleStatusVisibility = useCallback((status: ContentStatus) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const currentRaw = prev.get('statuses');
      let current: Set<ContentStatus>;
      if (!currentRaw) {
        current = new Set(ALL_STATUSES);
      } else {
        const parsed = currentRaw.split(',').filter(s => ALL_STATUSES.includes(s as ContentStatus)) as ContentStatus[];
        current = parsed.length > 0 ? new Set(parsed) : new Set(ALL_STATUSES);
      }
      if (current.has(status)) {
        current.delete(status);
        if (current.size === 0) current = new Set(ALL_STATUSES);
      } else {
        current.add(status);
      }
      if (current.size === ALL_STATUSES.length) {
        next.delete('statuses');
      } else {
        next.set('statuses', [...current].join(','));
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const statusFilterRef = useRef<HTMLDivElement>(null);

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === '1') { e.preventDefault(); setViewMode('kanban'); toast.success('Switched to Kanban view', { duration: 1500 }); }
      if (ctrl && e.key === '2') { e.preventDefault(); setViewMode('list');   toast.success('Switched to List view',   { duration: 1500 }); }
      if (ctrl && e.key === '3') { e.preventDefault(); setViewMode('grid');   toast.success('Switched to Grid view',   { duration: 1500 }); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [setViewMode]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (statusFilterRef.current && !statusFilterRef.current.contains(e.target as Node)) setShowStatusFilter(false);
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const getProjectName = useCallback(
    (projectId: string) => projects.find(p => p.id === projectId)?.name ?? 'Unknown',
    [projects],
  );

  const filteredCards = useMemo(() => {
    let result = cards;
    // Status visibility filter
    if (visibleStatuses.size < ALL_STATUSES.length) {
      result = result.filter(c => visibleStatuses.has(c.status));
    }
    if (filterPlatform !== 'all') result = result.filter(c => c.platform === filterPlatform);
    if (filterProject !== 'all') result = result.filter(c => c.projectId === filterProject);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.caption?.toLowerCase().includes(q) ||
        c.platform.toLowerCase().includes(q) ||
        c.createdBy.toLowerCase().includes(q)
      );
    }
    return result;
  }, [cards, filterPlatform, filterProject, searchQuery, visibleStatuses]);

  // Sorted cards for List & Grid views
  const sortedCards = useMemo(() => {
    const arr = [...filteredCards];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return dir * a.title.localeCompare(b.title);
        case 'platform':
          return dir * a.platform.localeCompare(b.platform);
        case 'status':
          return dir * ((STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0));
        case 'project': {
          const pa = getProjectName(a.projectId);
          const pb = getProjectName(b.projectId);
          return dir * pa.localeCompare(pb);
        }
        case 'scheduled': {
          const da = a.scheduledDate ?? '';
          const db = b.scheduledDate ?? '';
          return dir * da.localeCompare(db);
        }
        case 'created':
        default: {
          const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
          const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
          return dir * (ta - tb);
        }
      }
    });
    return arr;
  }, [filteredCards, sortBy, sortDir, getProjectName]);

  const cardsByStatus = useMemo(() => {
    const map: Record<ContentStatus, ContentCard[]> = {
      draft: [], pending_approval: [], approved: [], scheduled: [], published: [], rejected: [],
    };
    filteredCards.forEach(c => map[c.status]?.push(c));
    return map;
  }, [filteredCards]);

  const platforms = useMemo(
    () => [...new Set(cards.map(c => c.platform))].sort(),
    [cards],
  );

  const selectedCards = useMemo(
    () => cards.filter(c => selectedIds.has(c.id)),
    [cards, selectedIds],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === filteredCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCards.map(c => c.id)));
    }
  }, [filteredCards, selectedIds.size]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleDropCard = useCallback((cardId: string, newStatus: ContentStatus) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const userName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'System';

    const updated: ContentCard = {
      ...card,
      status: newStatus,
      lastEditedBy: userName,
      lastEditedAt: new Date(),
      auditLog: [
        ...card.auditLog,
        {
          id: `audit_dnd_${Date.now()}`,
          action: 'status_changed',
          performedBy: userName,
          performedByEmail: user?.email ?? 'system',
          timestamp: new Date(),
          details: `Status changed from ${card.status.replace(/_/g, ' ')} to ${newStatus.replace(/_/g, ' ')} via Kanban board`,
        },
      ],
    };

    // Set approval/rejection metadata
    if (newStatus === 'approved') {
      updated.approvedByName = userName;
      updated.approvedAt = new Date();
    } else if (newStatus === 'rejected') {
      updated.rejectedByName = userName;
      updated.rejectedAt = new Date();
    }

    updateCard(updated);
    toast.success(`"${card.title}" moved to ${newStatus.replace(/_/g, ' ')}`);
  }, [cards, updateCard, user]);

  // ── Bulk Actions ───────────────────────────────────────────────────────────

  const bulkApprove = useCallback(() => {
    const userName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'System';
    let count = 0;
    selectedCards.forEach(card => {
      if (card.status === 'pending_approval') {
        updateCard({
          ...card,
          status: 'approved',
          approvedByName: userName,
          approvedAt: new Date(),
          lastEditedBy: userName,
          lastEditedAt: new Date(),
          auditLog: [
            ...card.auditLog,
            {
              id: `audit_bulk_${Date.now()}_${card.id}`,
              action: 'approved',
              performedBy: userName,
              performedByEmail: user?.email ?? 'system',
              timestamp: new Date(),
              details: 'Bulk approved via Content Board',
            },
          ],
        });
        count++;
      }
    });
    clearSelection();
    if (count > 0) toast.success(`${count} card${count !== 1 ? 's' : ''} approved`);
    else toast.info('No pending cards in selection to approve');
  }, [selectedCards, updateCard, user, clearSelection]);

  const bulkReject = useCallback(() => {
    const userName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'System';
    let count = 0;
    selectedCards.forEach(card => {
      if (card.status === 'pending_approval') {
        updateCard({
          ...card,
          status: 'rejected',
          rejectedByName: userName,
          rejectedAt: new Date(),
          rejectionReason: 'Bulk rejected via Content Board',
          lastEditedBy: userName,
          lastEditedAt: new Date(),
          auditLog: [
            ...card.auditLog,
            {
              id: `audit_bulk_rej_${Date.now()}_${card.id}`,
              action: 'rejected',
              performedBy: userName,
              performedByEmail: user?.email ?? 'system',
              timestamp: new Date(),
              details: 'Bulk rejected via Content Board',
            },
          ],
        });
        count++;
      }
    });
    clearSelection();
    if (count > 0) toast.success(`${count} card${count !== 1 ? 's' : ''} rejected`);
    else toast.info('No pending cards in selection to reject');
  }, [selectedCards, updateCard, user, clearSelection]);

  const bulkSchedule = useCallback((date: string, time: string) => {
    const userName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'System';
    let count = 0;
    selectedCards.forEach(card => {
      if (card.status === 'approved' || card.status === 'draft') {
        updateCard({
          ...card,
          status: 'scheduled',
          scheduledDate: date,
          scheduledTime: time,
          lastEditedBy: userName,
          lastEditedAt: new Date(),
          auditLog: [
            ...card.auditLog,
            {
              id: `audit_bulk_sched_${Date.now()}_${card.id}`,
              action: 'scheduled',
              performedBy: userName,
              performedByEmail: user?.email ?? 'system',
              timestamp: new Date(),
              details: `Bulk scheduled for ${date} at ${time} via Content Board`,
            },
          ],
        });
        count++;
      }
    });
    clearSelection();
    setShowScheduleModal(false);
    if (count > 0) toast.success(`${count} card${count !== 1 ? 's' : ''} scheduled for ${date}`);
    else toast.info('No draft/approved cards in selection to schedule');
  }, [selectedCards, updateCard, user, clearSelection]);

  const bulkDelete = useCallback(() => {
    if (!confirm(`Delete ${selectedCards.length} selected card${selectedCards.length !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    selectedCards.forEach(card => deleteCard(card.id));
    clearSelection();
    toast.success(`${selectedCards.length} card${selectedCards.length !== 1 ? 's' : ''} deleted`);
  }, [selectedCards, deleteCard, clearSelection]);

  // ── Pending counts for action buttons ──────────────────────────────────────

  const pendingInSelection = selectedCards.filter(c => c.status === 'pending_approval').length;
  const schedulableInSelection = selectedCards.filter(c => c.status === 'approved' || c.status === 'draft').length;

  return (
    <BackgroundLayout>
      <EmployeeNav />
      <DndProvider backend={HTML5Backend}>
        <div className="max-w-[1600px] mx-auto px-4 py-6 flex flex-col gap-4">
          <ProfileBanner />

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className={`text-lg font-bold ${et.text} flex items-center gap-2`}>
                <Columns3 className="w-5 h-5" style={{ color: '#0BA4AA' }} />
                Content Board
              </h1>
              <p className={`text-xs ${et.textFaint} mt-0.5`}>
                {filteredCards.length} card{filteredCards.length !== 1 ? 's' : ''}{' '}
                {filterPlatform !== 'all' || filterProject !== 'all' || searchQuery || visibleStatuses.size < ALL_STATUSES.length ? '(filtered)' : ''}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${et.textFaint}`} />
                <label htmlFor="board-search" className="sr-only">Search content cards</label>
                <input
                  id="board-search"
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${et.inputCls} pl-8 !py-2 !text-xs w-44`}
                />
              </div>

              {/* Platform filter */}
              <label htmlFor="board-platform" className="sr-only">Filter by platform</label>
              <select
                id="board-platform"
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className={`${et.selectCls} !py-2 !text-xs w-32`}
              >
                <option value="all">All platforms</option>
                {platforms.map(p => (
                  <option key={p} value={p}>{PLATFORM_EMOJI[p] ?? '📄'} {p}</option>
                ))}
              </select>

              {/* Project filter */}
              <label htmlFor="board-project" className="sr-only">Filter by project</label>
              <select
                id="board-project"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className={`${et.selectCls} !py-2 !text-xs w-36`}
              >
                <option value="all">All projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Status filter dropdown */}
              <div className="relative" ref={statusFilterRef}>
                <button
                  onClick={() => setShowStatusFilter(!showStatusFilter)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    visibleStatuses.size < ALL_STATUSES.length
                      ? 'bg-[#0BA4AA]/10 text-[#0BA4AA] border border-[#0BA4AA]/30'
                      : isDark ? 'bg-white/8 text-white/70 hover:bg-white/12 border border-white/15' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Status
                  {visibleStatuses.size < ALL_STATUSES.length && (
                    <span className="text-[9px] font-bold bg-[#0BA4AA]/20 px-1.5 py-0.5 rounded-full">
                      {visibleStatuses.size}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {showStatusFilter && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className={`absolute right-0 top-full mt-1 w-52 rounded-xl border shadow-lg z-30 overflow-hidden ${
                        isDark ? 'bg-[#0a0823]/95 border-white/15' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className={`px-3 py-2 border-b text-[10px] font-semibold flex items-center justify-between ${isDark ? 'border-white/8 text-white/50' : 'border-gray-100 text-gray-400'}`}>
                        <span>Filter by status</span>
                        <button
                          onClick={() => {
                            setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('statuses'); return next; }, { replace: true });
                          }}
                          className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${isDark ? 'text-[#0BA4AA] hover:bg-[#0BA4AA]/10' : 'text-[#0BA4AA] hover:bg-[#0BA4AA]/5'}`}
                        >
                          Show all
                        </button>
                      </div>
                      {COLUMNS.map(col => {
                        const isActive = visibleStatuses.has(col.status);
                        const count = cards.filter(c => c.status === col.status).length;
                        return (
                          <button
                            key={col.status}
                            onClick={() => toggleStatusVisibility(col.status)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                              isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                              isActive
                                ? 'bg-[#0BA4AA] border-[#0BA4AA] text-white'
                                : isDark ? 'border-white/20 bg-transparent' : 'border-gray-300 bg-transparent'
                            }`}>
                              {isActive && <Check className="w-3 h-3" />}
                            </div>
                            <div
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: col.color }}
                            />
                            <span className={`flex-1 text-left font-medium ${isActive ? (isDark ? 'text-white/80' : 'text-gray-700') : (isDark ? 'text-white/30' : 'text-gray-400')}`}>
                              {col.label}
                            </span>
                            <span className={`text-[10px] ${isDark ? 'text-white/25' : 'text-gray-300'}`}>{count}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Export dropdown */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isDark ? 'bg-white/8 text-white/70 hover:bg-white/12 border border-white/15' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                  <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className={`absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-lg z-30 overflow-hidden ${
                        isDark ? 'bg-[#0a0823]/95 border-white/15' : 'bg-white border-gray-200'
                      }`}
                    >
                      <button
                        onClick={() => { exportToCSV(filteredCards, getProjectName); setShowExportMenu(false); toast.success('CSV exported'); }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors ${isDark ? 'text-white/70 hover:bg-white/8' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                        Export as CSV
                      </button>
                      <button
                        onClick={() => { exportToPrint(filteredCards, getProjectName); setShowExportMenu(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors ${isDark ? 'text-white/70 hover:bg-white/8' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-500" />
                        Print / Save PDF
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Create content shortcut */}
              <button
                onClick={() => navigate('/app/content')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#0BA4AA] text-white hover:bg-[#0BA4AA]/90 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Create
              </button>

              {/* View mode toggle */}
              <div className={`flex items-center rounded-xl overflow-hidden border ${isDark ? 'border-white/15 bg-white/5' : 'border-gray-200 bg-white'}`}>
                {([
                  { mode: 'kanban', icon: <Columns3 className="w-3.5 h-3.5" />, title: 'Kanban view (Ctrl+1)' },
                  { mode: 'list',   icon: <List className="w-3.5 h-3.5" />,     title: 'List view (Ctrl+2)' },
                  { mode: 'grid',   icon: <LayoutGrid className="w-3.5 h-3.5" />, title: 'Grid view (Ctrl+3)' },
                ] as const).map(v => (
                  <button
                    key={v.mode}
                    onClick={() => setViewMode(v.mode)}
                    title={v.title}
                    className={`px-2.5 py-2 transition-all ${
                      viewMode === v.mode
                        ? isDark ? 'bg-[#0BA4AA]/20 text-[#0BA4AA]' : 'bg-[#0BA4AA]/10 text-[#0BA4AA]'
                        : isDark ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {v.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Bulk Actions Bar ───────────────────────────────────────────── */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className={`${et.glass} px-4 py-3 flex items-center gap-3 flex-wrap`}
              >
                <div className="flex items-center gap-2">
                  <button onClick={selectAll} className={`text-[11px] font-medium ${isDark ? 'text-[#0BA4AA]' : 'text-[#0BA4AA]'} hover:underline`}>
                    {selectedIds.size === filteredCards.length ? 'Deselect all' : 'Select all'}
                  </button>
                  <span className={`text-[11px] ${et.textFaint}`}>·</span>
                  <span className={`text-xs font-semibold ${et.text}`}>
                    {selectedIds.size} selected
                  </span>
                  <button onClick={clearSelection} className={`${et.textFaint} hover:text-red-400 transition-colors`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className={`h-5 w-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

                {/* Approve */}
                <button
                  onClick={bulkApprove}
                  disabled={pendingInSelection === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark ? 'bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/25' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve{pendingInSelection > 0 ? ` (${pendingInSelection})` : ''}
                </button>

                {/* Reject */}
                <button
                  onClick={bulkReject}
                  disabled={pendingInSelection === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark ? 'bg-red-500/12 text-red-400 hover:bg-red-500/20 border border-red-500/25' : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject{pendingInSelection > 0 ? ` (${pendingInSelection})` : ''}
                </button>

                {/* Schedule */}
                <button
                  onClick={() => setShowScheduleModal(true)}
                  disabled={schedulableInSelection === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark ? 'bg-purple-500/12 text-purple-400 hover:bg-purple-500/20 border border-purple-500/25' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Schedule{schedulableInSelection > 0 ? ` (${schedulableInSelection})` : ''}
                </button>

                {/* Delete */}
                <button
                  onClick={bulkDelete}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    isDark ? 'bg-red-500/8 text-red-400/70 hover:bg-red-500/15 border border-red-500/15' : 'bg-red-50/50 text-red-500 hover:bg-red-100 border border-red-200'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── View: Kanban / List / Grid ─────────────────────────────────── */}

          {viewMode === 'kanban' && (
            <>
              <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
                {COLUMNS.map(col => (
                  <KanbanColumn
                    key={col.status}
                    status={col.status}
                    label={col.label}
                    color={col.color}
                    icon={col.icon}
                    cards={cardsByStatus[col.status]}
                    isDark={isDark}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onViewCard={setViewCard}
                    onDropCard={handleDropCard}
                    getProjectName={getProjectName}
                  />
                ))}
              </div>

              {/* ── Status Transition Guide ──────────────────────────────────── */}
              <div className={`${et.glassInner} px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1`}>
                <span className={`text-[10px] font-semibold ${et.textMd}`}>Drag transitions:</span>
                {[
                  { from: 'Draft', to: 'Pending', color: '#F47A20' },
                  { from: 'Pending', to: 'Approved / Rejected / Draft', color: '#0BA4AA' },
                  { from: 'Approved', to: 'Scheduled / Draft', color: '#a855f7' },
                  { from: 'Scheduled', to: 'Published / Approved', color: '#22c55e' },
                ].map(t => (
                  <span key={t.from} className={`text-[9px] ${et.textFaint} flex items-center gap-1`}>
                    <span className="font-medium" style={{ color: t.color }}>{t.from}</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                    <span>{t.to}</span>
                  </span>
                ))}
              </div>
            </>
          )}

          {viewMode === 'list' && (
            <div className={`${et.glass} overflow-hidden`}>
              {/* Table header — sortable columns */}
              <div className={`grid grid-cols-[auto_1fr_100px_120px_100px_120px_80px] gap-3 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider border-b ${isDark ? 'border-white/8 text-white/40' : 'border-gray-200 text-gray-400'}`}>
                <div className="w-6" />
                {([
                  { field: 'title' as SortField, label: 'Title' },
                  { field: 'platform' as SortField, label: 'Platform' },
                  { field: 'status' as SortField, label: 'Status' },
                  { field: 'project' as SortField, label: 'Project' },
                  { field: 'scheduled' as SortField, label: 'Scheduled' },
                ]).map(col => {
                  const isActive = sortBy === col.field;
                  return (
                    <button
                      key={col.field}
                      onClick={() => setSortBy(col.field)}
                      className={`flex items-center gap-1 text-left transition-colors ${
                        isActive ? 'text-[#0BA4AA]' : ''
                      } hover:text-[#0BA4AA]`}
                    >
                      {col.label}
                      {isActive ? (
                        sortDir === 'asc'
                          ? <ArrowUp className="w-3 h-3" />
                          : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </button>
                  );
                })}
                <div className="text-right">Actions</div>
              </div>

              {/* Table rows */}
              {sortedCards.length === 0 ? (
                <div className={`flex items-center justify-center py-16 text-sm ${et.textFaint}`}>
                  No content cards match your filters.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {sortedCards.map(card => {
                    const col = COLUMNS.find(c => c.status === card.status)!;
                    const emoji = PLATFORM_EMOJI[card.platform] ?? '📄';
                    const isSelected = selectedIds.has(card.id);
                    return (
                      <div
                        key={card.id}
                        className={`grid grid-cols-[auto_1fr_100px_120px_100px_120px_80px] gap-3 px-4 py-3 items-center transition-colors group ${
                            isSelected
                              ? isDark ? 'bg-[#0BA4AA]/6' : 'bg-[#0BA4AA]/4'
                              : isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50/60'
                          }`}
                      >
                        {/* Checkbox */}
                        <button onClick={() => toggleSelect(card.id)} className="w-6 flex justify-center">
                          {isSelected
                            ? <CheckSquare className="w-4 h-4 text-[#0BA4AA]" />
                            : <Square className={`w-4 h-4 ${isDark ? 'text-white/20 group-hover:text-white/40' : 'text-gray-300 group-hover:text-gray-400'}`} />
                          }
                        </button>

                        {/* Title */}
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${et.text}`}>{card.title}</p>
                          {card.caption && (
                            <p className={`text-[10px] ${et.textFaint} truncate mt-0.5`}>
                              {card.caption.slice(0, 60)}{card.caption.length > 60 ? '...' : ''}
                            </p>
                          )}
                        </div>

                        {/* Platform */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{emoji}</span>
                          <span className={`text-[11px] capitalize ${et.textMd}`}>{card.platform}</span>
                        </div>

                        {/* Status */}
                        <div>
                          <span
                            className="text-[10px] font-semibold px-2 py-1 rounded-full"
                            style={{ background: `${col.color}18`, color: col.color }}
                          >
                            {col.label}
                          </span>
                        </div>

                        {/* Project */}
                        <span className={`text-[11px] ${et.textMd} truncate`}>
                          {getProjectName(card.projectId)}
                        </span>

                        {/* Scheduled */}
                        <div>
                          {card.scheduledDate ? (
                            <div className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                              <CalendarDays className="w-3 h-3 shrink-0" />
                              <span>{card.scheduledDate}</span>
                            </div>
                          ) : (
                            <span className={`text-[10px] ${et.textFaint}`}>—</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => setViewCard(card)}
                            className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                              isDark ? 'text-white/30 hover:text-[#0BA4AA] hover:bg-[#0BA4AA]/8' : 'text-gray-400 hover:text-[#0BA4AA] hover:bg-[#0BA4AA]/5'
                            }`}
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {viewMode === 'grid' && (
            <div>
              {sortedCards.length === 0 ? (
                <div className={`${et.glass} flex items-center justify-center py-16 text-sm ${et.textFaint}`}>
                  No content cards match your filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {sortedCards.map(card => {
                    const col = COLUMNS.find(c => c.status === card.status)!;
                    const emoji = PLATFORM_EMOJI[card.platform] ?? '📄';
                    const isSelected = selectedIds.has(card.id);
                    return (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`${et.glass} p-4 group cursor-pointer transition-all ${
                          isSelected
                            ? isDark ? 'ring-2 ring-[#0BA4AA]/60 bg-[#0BA4AA]/5' : 'ring-2 ring-[#0BA4AA]/40 bg-[#0BA4AA]/3'
                            : ''
                        }`}
                        onClick={() => setViewCard(card)}
                      >
                        {/* Top row: checkbox + status + platform */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSelect(card.id); }}
                              className={`transition-all ${isSelected || 'opacity-0 group-hover:opacity-100'}`}
                            >
                              {isSelected
                                ? <CheckSquare className="w-4 h-4 text-[#0BA4AA]" />
                                : <Square className={`w-4 h-4 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                              }
                            </button>
                            <span className="text-lg">{emoji}</span>
                            <span className={`text-[10px] font-medium capitalize ${et.textFaint}`}>{card.platform}</span>
                          </div>
                          <span
                            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: `${col.color}18`, color: col.color }}
                          >
                            {col.label}
                          </span>
                        </div>

                        {/* Title + caption */}
                        <p className={`text-sm font-semibold leading-snug ${et.text} line-clamp-2`}>{card.title}</p>
                        <p className={`text-[11px] ${et.textFaint} mt-1 truncate`}>{getProjectName(card.projectId)}</p>

                        {card.caption && (
                          <p className={`text-[10px] ${et.textFaint} mt-2 line-clamp-3 leading-relaxed`}>
                            {card.caption}
                          </p>
                        )}

                        {/* Bottom meta */}
                        <div className={`flex items-center justify-between mt-3 pt-2.5 border-t ${et.border}`}>
                          <span className={`text-[9px] ${et.textFaint}`}>by {card.createdBy}</span>
                          {card.scheduledDate ? (
                            <div className={`text-[9px] flex items-center gap-1 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                              <CalendarDays className="w-2.5 h-2.5" />
                              {card.scheduledDate}
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setViewCard(card); }}
                              className={`text-[9px] flex items-center gap-0.5 ${isDark ? 'text-white/25 hover:text-[#0BA4AA]' : 'text-gray-400 hover:text-[#0BA4AA]'} transition-colors`}
                            >
                              <Eye className="w-2.5 h-2.5" /> View
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DndProvider>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {viewCard && (
          <CardDetailModal card={viewCard} isDark={isDark} onClose={() => setViewCard(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScheduleModal && (
          <BulkScheduleModal
            count={schedulableInSelection}
            isDark={isDark}
            onClose={() => setShowScheduleModal(false)}
            onConfirm={bulkSchedule}
          />
        )}
      </AnimatePresence>
    </BackgroundLayout>
  );
}