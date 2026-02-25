import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Filter, LayoutGrid, List, Search,
  FileText, Clock, CheckCircle, CalendarDays, Check, XCircle, Loader2,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  SiInstagram, SiFacebook, SiX, SiLinkedin, SiTiktok,
  SiYoutube, SiPinterest, SiSnapchat, SiThreads, SiReddit, SiWhatsapp,
  SiTelegram,
} from 'react-icons/si';
import { useAuth } from '../AuthContext';
import { useContent, createCardId, type ContentCard, type ContentStatus } from '../../contexts/ContentContext';
import { ContentCardCompact, ContentCardDetail } from './ContentCard';
import { socialPlatforms } from './aiEngine';
import { useFoldableLayout } from '../../hooks/useFoldableLayout';

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

const statusFilters: { value: ContentStatus | 'all'; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { value: 'all', label: 'All', icon: LayoutGrid, color: 'text-white/60' },
  { value: 'draft', label: 'Draft', icon: FileText, color: 'text-gray-300' },
  { value: 'pending_approval', label: 'Pending', icon: Clock, color: 'text-amber-300' },
  { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-teal-300' },
  { value: 'scheduled', label: 'Scheduled', icon: CalendarDays, color: 'text-blue-300' },
  { value: 'published', label: 'Published', icon: Check, color: 'text-green-300' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-300' },
];

// ─── ContentBoard ─────────────────────────────────────────────────────────────

interface ContentBoardProps {
  projectId: string;
  projectTeamMembers: string[];
  projectName: string;
}

export function ContentBoard({ projectId, projectTeamMembers, projectName }: ContentBoardProps) {
  const { user } = useAuth();
  const { getCardsByProject, addCard, isLoading, isSynced } = useContent();
  const cards = getCardsByProject(projectId);
  const { isDualScreen, isSquarish } = useFoldableLayout();

  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<ContentCard | null>(null);
  const [showNewCardForm, setShowNewCardForm] = useState(false);

  // ── Pagination ──
  const CARDS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  // ── New card form state ──
  const [newPlatform, setNewPlatform] = useState('instagram');
  const [newTitle, setNewTitle] = useState('');
  const [newCaption, setNewCaption] = useState('');

  // Filtered cards
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

  // Reset page when filters change
  const totalPages = Math.max(1, Math.ceil(filteredCards.length / CARDS_PER_PAGE));
  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    return filteredCards.slice(start, start + CARDS_PER_PAGE);
  }, [filteredCards, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, platformFilter, searchQuery]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: cards.length };
    cards.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return counts;
  }, [cards]);

  // Unique platforms in cards
  const usedPlatforms = useMemo(() => {
    const set = new Set(cards.map(c => c.platform));
    return Array.from(set);
  }, [cards]);

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
      hashtags: [],
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
    setShowNewCardForm(false);
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Content Board
            <span className="bg-white/10 text-white/60 text-xs px-2 py-0.5 rounded-full font-normal">{cards.length} cards</span>
            {isLoading && (
              <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
            )}
            {!isLoading && isSynced && (
              <span className="flex items-center gap-1 text-[10px] text-teal-400/60 font-normal">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                Synced
              </span>
            )}
          </h2>
          <p className="text-white/50 text-xs mt-0.5">Manage, edit, and approve content for {projectName}</p>
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

      {/* ── Status filter pills — horizontal scroll on mobile ── */}
      <div className="overflow-x-auto -mx-1 px-1 scrollbar-none">
        <div className="flex gap-1.5 sm:gap-2 w-max sm:w-auto sm:flex-wrap">
          {statusFilters.map(sf => {
            const SfIcon = sf.icon;
            const count = statusCounts[sf.value] || 0;
            const isActive = statusFilter === sf.value;
            return (
              <button
                key={sf.value}
                onClick={() => setStatusFilter(sf.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all border whitespace-nowrap min-h-[2.25rem] ${
                  isActive
                    ? 'bg-white/15 border-white/30 text-white'
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70'
                }`}
              >
                <SfIcon className={`w-3 h-3 ${isActive ? sf.color : ''}`} />
                {sf.label}
                {count > 0 && <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-white/30'}`}>({count})</span>}
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

              {/* Platform selector */}
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Platform</label>
                <div className="flex flex-wrap gap-2">
                  {socialPlatforms.map(p => {
                    const PIcon = platformIcons[p.id];
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

              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Title</label>
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
                  placeholder="Write your caption..."
                  rows={3}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-400/50 transition-all resize-none"
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
                  onClick={() => { setShowNewCardForm(false); setNewTitle(''); setNewCaption(''); }}
                  className="text-white/50 hover:text-white text-sm px-4 py-2 rounded-xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cards Grid ── */}
      {/* On dual-screen / squarish, use auto-fit for flexible aspect ratios */}
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
            {paginatedCards.map(card => (
              <ContentCardCompact
                key={card.id}
                card={card}
                projectTeamMembers={projectTeamMembers}
                onOpenDetail={setSelectedCard}
              />
            ))}
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

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {selectedCard && (
          <ContentCardDetail
            card={selectedCard}
            projectTeamMembers={projectTeamMembers}
            onClose={() => setSelectedCard(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}