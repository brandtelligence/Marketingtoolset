import { CreateContentWizard } from '../components/ai/CreateContentWizard';
import { ContentBoard } from '../components/ai/ContentBoard';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Calendar, Users, Briefcase, Edit2, Tag,
  Lock, Mail, Phone, User, CheckCircle, Clock, Send,
  ShieldCheck, Building2, XCircle, AlertTriangle, Archive, Sparkles,
} from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { ProfileBanner } from '../components/ProfileBanner';
import { BackgroundLayout } from '../components/BackgroundLayout';
import { EmployeeNav } from '../components/EmployeeNav';
import { EditProjectModal } from '../components/EditProjectModal';
import { useAuth } from '../components/AuthContext';
import {
  useProjects,
  canUserEdit,
  hasUserRequestedEdit,
  getProjectStatus,
  availableTeamMembers,
} from '../contexts/ProjectsContext';
import { useFoldableLayout } from '../hooks/useFoldableLayout';
import { FoldableContainer } from '../components/FoldableContainer';
import { useDashboardTheme } from '../components/saas/DashboardThemeContext';

/**
 * ProjectDetailPage
 * ─────────────────────────────────────────────────────────
 * Detailed view for a single project with hero image,
 * info panels, team sidebar, and content board.
 *
 * Responsive strategy (mobile-first):
 * - Base (320px+): single column, compact padding
 * - sm (640px+): wider spacing
 * - md (768px+): hero image taller, side-by-side info panels
 * - lg (1024px+): 3-col grid (2 + sidebar)
 * - Touch: all action buttons ≥ 44px
 *
 * Foldable / Dual-Screen:
 * - Uses FoldableContainer for explicit dual-pane: info panels on left, sidebar+content board on right
 * - Single-screen fallback uses standard grid with fold-auto-grid on squarish viewports
 * - Cancelled project banner spans across segments safely
 * - Content board grid uses auto-fit for flexible aspect ratios
 */

export function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, updateProject, requestEditAccess } = useProjects();
  const { isDualScreen, isSquarish, spanningMode } = useFoldableLayout();
  const { isDark } = useDashboardTheme();

  // ── Theme helpers ──────────────────────────────────────────────────────────
  const glass   = isDark ? 'bg-white/10 backdrop-blur-md border border-white/20' : 'bg-white/80 backdrop-blur-md border border-gray-200/60 shadow-sm';
  const heading = isDark ? 'text-white' : 'text-gray-900';
  const sub     = isDark ? 'text-white/70' : 'text-gray-600';
  const textSm  = isDark ? 'text-white/80' : 'text-gray-700';
  const muted   = isDark ? 'text-white/60' : 'text-gray-500';
  const dim     = isDark ? 'text-white/50' : 'text-gray-400';
  const faint   = isDark ? 'text-white/40' : 'text-gray-400';
  const bdr     = isDark ? 'border-white/20' : 'border-gray-200';
  const bdrSm   = isDark ? 'border-white/15' : 'border-gray-200';
  const iconDim = isDark ? 'text-white/50' : 'text-gray-400';
  const tagCls  = isDark ? 'bg-white/15 backdrop-blur-sm border border-white/25 text-white' : 'bg-gray-100 border border-gray-200 text-gray-700';

  const [isEditing, setIsEditing] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [showContentWizard, setShowContentWizard] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  // Find project by matching route slug
  const project = projects.find(p => {
    const routeSlug = p.route.replace('/projects/', '');
    return routeSlug === slug;
  });

  if (!project) {
    return (
      <BackgroundLayout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className={`${glass} rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center max-w-md w-full`}>
            <Briefcase className={`w-12 h-12 sm:w-16 sm:h-16 ${faint} mx-auto mb-4`} />
            <h2 className={`${heading} mb-2`} style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }}>Project Not Found</h2>
            <p className={`${muted} mb-6 text-sm sm:text-base`}>This project doesn't exist or has been removed.</p>
            <button
              onClick={() => navigate('/app/projects')}
              className="inline-flex items-center gap-2 bg-white text-teal-600 px-5 py-3 rounded-xl hover:shadow-lg transition-all min-h-[2.75rem]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </button>
          </div>
        </div>
      </BackgroundLayout>
    );
  }

  const hasEdit = canUserEdit(project, user);
  const alreadyRequested = hasUserRequestedEdit(project, user) || requestSent;
  const status = getProjectStatus(project);

  const handleRequestEdit = () => {
    if (!user) return;
    requestEditAccess(project.id, user.email);
    setRequestSent(true);
  };

  const handleSaveEdit = (updated: typeof project) => {
    updateProject(updated);
    setIsEditing(false);
  };

  // Format dates nicely
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  /* ── Shared panel renderers (used by both foldable + single-screen layouts) ── */

  const OverviewPanel = () => (
    <div className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl`}>
      <h2 className={`${heading} mb-3 sm:mb-4`} style={{ fontSize: 'clamp(1.125rem, 2vw, 1.25rem)' }}>Project Overview</h2>
      <p className={`${textSm} leading-relaxed text-sm sm:text-base`}>{project.details}</p>
      <div className={`grid grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t ${bdr}`}>
        <div className="text-center">
          <div className={`text-[0.65rem] sm:text-xs ${muted} mb-1`}>Industry</div>
          <div className={`text-xs sm:text-sm ${heading}`}>{project.industry || '—'}</div>
        </div>
        <div className="text-center">
          <div className={`text-[0.65rem] sm:text-xs ${muted} mb-1 flex items-center justify-center gap-1`}>
            <Calendar className="w-3 h-3 hidden sm:block" /> Duration
          </div>
          <div className={`text-xs sm:text-sm ${heading}`}>{project.duration || '—'}</div>
        </div>
        <div className="text-center">
          <div className={`text-[0.65rem] sm:text-xs ${muted} mb-1 flex items-center justify-center gap-1`}>
            <Users className="w-3 h-3 hidden sm:block" /> Team
          </div>
          <div className={`text-xs sm:text-sm ${heading}`}>{project.teamSize}</div>
        </div>
      </div>
    </div>
  );

  const DatesPanel = () => (
    <div className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl`}>
      <h2 className={`${heading} mb-3 sm:mb-4 flex items-center gap-2`} style={{ fontSize: 'clamp(1.125rem, 2vw, 1.25rem)' }}>
        <Calendar className={`w-5 h-5 ${isDark ? 'text-teal-300' : 'text-teal-600'}`} />
        Project Timeline
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        <div>
          <div className={`text-xs ${muted} mb-1`}>Start Date</div>
          <div className={`${heading} text-sm sm:text-base`}>{formatDate(project.startDate)}</div>
        </div>
        <div>
          <div className={`text-xs ${muted} mb-1`}>End Date</div>
          <div className={`${heading} text-sm sm:text-base`}>{formatDate(project.endDate)}</div>
        </div>
      </div>
    </div>
  );

  const TagsPanel = () => project.tags.length > 0 ? (
    <div className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl`}>
      <h2 className={`${heading} mb-3 sm:mb-4 flex items-center gap-2`} style={{ fontSize: 'clamp(1.125rem, 2vw, 1.25rem)' }}>
        <Tag className={`w-5 h-5 ${isDark ? 'text-purple-300' : 'text-purple-600'}`} />
        Tags
      </h2>
      <div className="flex flex-wrap gap-2">
        {project.tags.map((tag, i) => (
          <span key={i} className={`${tagCls} px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm`}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  ) : null;

  const TeamPanel = () => (
    <div className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl`}>
      <h2 className={`${heading} mb-3 sm:mb-4 flex items-center gap-2`} style={{ fontSize: 'clamp(1rem, 1.5vw, 1.125rem)' }}>
        <Users className={`w-5 h-5 ${isDark ? 'text-teal-300' : 'text-teal-600'}`} />
        Team Members
      </h2>
      <div className="space-y-2.5 sm:space-y-3">
        {project.teamMembers.length === 0 ? (
          <p className={`${dim} text-sm`}>No team members assigned.</p>
        ) : (
          project.teamMembers.map(memberId => {
            const member = availableTeamMembers.find(m => m.id === memberId);
            if (!member) return null;
            return (
              <div key={memberId} className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs shrink-0">
                  {member.firstName[0]}{member.lastName[0]}
                </div>
                <div className="min-w-0">
                  <div className={`${heading} text-sm truncate`}>{member.firstName} {member.lastName}</div>
                  <div className={`${dim} text-xs truncate`}>{member.jobTitle}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const ClientLeadPanel = () => (
    <div className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl`}>
      <h2 className={`${heading} mb-3 sm:mb-4 flex items-center gap-2`} style={{ fontSize: 'clamp(1rem, 1.5vw, 1.125rem)' }}>
        <User className={`w-5 h-5 ${isDark ? 'text-orange-300' : 'text-orange-600'}`} />
        Client Project Lead
      </h2>
      <div className="space-y-2.5 sm:space-y-3">
        <div>
          <div className={`${heading} text-sm sm:text-base`}>{project.clientProjectLead.name || '—'}</div>
          <div className={`${muted} text-xs mt-0.5`}>{project.clientProjectLead.jobTitle || '—'}</div>
        </div>
        <div className={`space-y-2 pt-2 border-t ${bdrSm}`}>
          <div className="flex items-center gap-2 text-sm">
            <Phone className={`w-3.5 h-3.5 ${iconDim} shrink-0`} />
            {hasEdit ? (
              <span className={`${textSm} text-xs sm:text-sm`}>
                {project.clientProjectLead.phoneCode} {project.clientProjectLead.phoneNumber || '—'}
              </span>
            ) : (
              <span className={`${faint} italic text-xs`}>Hidden — request edit access to view</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className={`w-3.5 h-3.5 ${iconDim} shrink-0`} />
            {hasEdit ? (
              <span className={`${textSm} truncate text-xs sm:text-sm`}>{project.clientProjectLead.email || '—'}</span>
            ) : (
              <span className={`${faint} italic text-xs`}>Hidden — request edit access to view</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm pt-1">
          <Building2 className={`w-3.5 h-3.5 ${iconDim} shrink-0`} />
          <span className={`${textSm} truncate text-xs sm:text-sm`}>{project.client}</span>
        </div>
      </div>
    </div>
  );

  const RequestAccessPanel = () => !hasEdit && status.type !== 'cancelled' ? (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className={`${isDark ? 'bg-amber-500/10' : 'bg-amber-50'} backdrop-blur-md border-2 border-amber-400/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl`}
    >
      <div className="flex items-start gap-3 mb-3 sm:mb-4">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-500/20 border border-amber-400/30 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
          <Lock className={`w-4 h-4 sm:w-5 sm:h-5 ${isDark ? 'text-amber-300' : 'text-amber-600'}`} />
        </div>
        <div>
          <h3 className={`${isDark ? 'text-amber-200' : 'text-amber-700'} text-sm`}>Need Edit Access?</h3>
          <p className={`${muted} text-xs mt-1 leading-relaxed`}>
            You're viewing this project in read-only mode. Request edit access from the project lead.
          </p>
        </div>
      </div>
      {alreadyRequested ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-teal-500/20 border border-teal-400/30 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3"
        >
          <CheckCircle className="w-4 h-4 text-teal-300 shrink-0" />
          <div>
            <div className={`${isDark ? 'text-teal-200' : 'text-teal-700'} text-sm`}>Request Sent</div>
            <div className={`${isDark ? 'text-teal-300/70' : 'text-teal-600'} text-xs`}>The project lead has been notified.</div>
          </div>
        </motion.div>
      ) : (
        <motion.button
          onClick={handleRequestEdit}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full inline-flex items-center justify-center gap-2 bg-amber-500/80 hover:bg-amber-500 text-white px-4 py-2.5 sm:py-3 rounded-xl text-sm shadow-lg transition-all border border-amber-400/40 min-h-[2.75rem]"
        >
          <Send className="w-4 h-4" />
          Request Edit Permission
        </motion.button>
      )}
      {alreadyRequested && (
        <div className={`flex items-center gap-1.5 mt-3 ${faint} text-xs justify-center`}>
          <Clock className="w-3 h-3" />
          Pending approval
        </div>
      )}
    </motion.div>
  ) : null;

  const ContentBoardPanel = () => status.type !== 'cancelled' ? (
    <div className={`${glass} rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl`}>
      <ContentBoard
        projectId={project.id}
        projectTeamMembers={project.teamMembers}
        projectName={project.name}
      />
    </div>
  ) : null;

  return (
    <BackgroundLayout>
      <EmployeeNav />
      {/* Main Content */}
      <div className="min-h-screen px-4 py-6 sm:px-6 md:px-8">
        <div className="max-w-6xl mx-auto">

          {/* ── Back + Profile Banner row ── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 sm:mb-8"
          >
            <button
              onClick={() => navigate('/app/projects')}
              className={`${sub} ${isDark ? 'hover:text-white' : 'hover:text-gray-900'} mb-4 sm:mb-5 inline-flex items-center gap-2 text-sm transition-colors`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProfileBanner />

              {/* Permission badge panel */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className={`${isDark ? 'bg-white/10 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md shadow-sm'} border rounded-2xl p-4 md:p-5 shadow-xl flex items-center gap-3 sm:gap-4 ${
                  hasEdit ? 'border-teal-400/40' : 'border-amber-400/40'
                }`}
              >
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${
                  hasEdit ? 'bg-teal-500/20 border border-teal-400/30' : 'bg-amber-500/20 border border-amber-400/30'
                }`}>
                  {hasEdit
                    ? <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-teal-300" />
                    : <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm mb-0.5 ${hasEdit ? (isDark ? 'text-teal-200' : 'text-teal-700') : (isDark ? 'text-amber-200' : 'text-amber-700')}`}>
                    {hasEdit ? 'Edit Access Granted' : 'Read-Only Access'}
                  </div>
                  <p className={`${muted} text-xs leading-snug`}>
                    {hasEdit
                      ? 'You are a member of this project and can edit its details.'
                      : 'You are not assigned to this project. You may view all details but cannot make changes.'}
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* ── Hero Image + Title ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden mb-6 sm:mb-8 shadow-2xl"
          >
            <div className="h-48 sm:h-64 md:h-72 lg:h-96 relative">
              <ImageWithFallback
                src={project.image}
                alt={project.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              {/* Status badge */}
              <div className={`absolute top-3 right-3 sm:top-5 sm:right-5 ${status.color} text-white px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm shadow-lg backdrop-blur-sm border border-white/20`}>
                {status.label}
              </div>

              {/* Action buttons — stacked on mobile for touch */}
              <div className="absolute top-3 left-3 sm:top-5 sm:left-5 flex flex-col gap-2">
                {/* Edit button */}
                {hasEdit && status.type !== 'cancelled' && (
                  <motion.button
                    onClick={() => setIsEditing(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/40 hover:bg-white/30 text-white px-3 py-2 sm:px-4 rounded-xl text-sm shadow-lg transition-all min-h-[2.75rem]"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit Project</span>
                  </motion.button>
                )}

                {/* Create Content button */}
                {status.type !== 'cancelled' && (
                  <motion.button
                    onClick={() => setShowContentWizard(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500/80 to-purple-500/80 backdrop-blur-md border border-white/30 hover:from-teal-500 hover:to-purple-500 text-white px-3 py-2 sm:px-4 rounded-xl text-sm shadow-lg transition-all min-h-[2.75rem]"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">Create Content</span>
                  </motion.button>
                )}
              </div>

              {/* Title overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
                <div className="flex items-center gap-2 text-white/70 text-xs sm:text-sm mb-1 sm:mb-2">
                  <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{project.client}</span>
                </div>
                <h1
                  className="text-white mb-1 sm:mb-2"
                  style={{ fontSize: 'clamp(1.375rem, 4vw, 3rem)' }}
                >
                  {project.name}
                </h1>
                <p className="text-white/80 text-sm sm:text-base md:text-lg">{project.description}</p>
              </div>
            </div>
          </motion.div>

          {/* ── Cancelled Project Banner ── */}
          {status.type === 'cancelled' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className={`mb-6 sm:mb-8 ${isDark ? 'bg-red-500/10' : 'bg-red-50'} backdrop-blur-md border-2 border-red-400/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3 sm:gap-4 flex-1">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-red-500/20 border border-red-400/30 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5 sm:w-7 sm:h-7 text-red-400" />
                  </div>
                  <div>
                    <h3 className={`${isDark ? 'text-red-200' : 'text-red-700'} text-base sm:text-lg`}>Project Cancelled</h3>
                    <p className={`${muted} text-xs sm:text-sm mt-1 leading-relaxed`}>
                      This project has been cancelled and is archived for reference only. All project data below is preserved as read-only.
                    </p>
                  </div>
                </div>

                {/* Status chips — stack on mobile */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:ml-auto shrink-0">
                  <div className={`flex items-center gap-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} border rounded-xl px-3 py-2 sm:px-4 sm:py-2.5`}>
                    <Archive className={`w-4 h-4 ${dim}`} />
                    <div>
                      <div className={`${faint} text-[10px] uppercase tracking-wider`}>Status</div>
                      <div className="text-red-300 text-xs sm:text-sm">Archived</div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} border rounded-xl px-3 py-2 sm:px-4 sm:py-2.5`}>
                    <Calendar className={`w-4 h-4 ${dim}`} />
                    <div>
                      <div className={`${faint} text-[10px] uppercase tracking-wider`}>Active Period</div>
                      <div className={`${textSm} text-xs sm:text-sm`}>
                        {formatDate(project.startDate)} — {formatDate(project.endDate)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cancellation note */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-red-400/15 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400/70 shrink-0 mt-0.5" />
                <p className={`${dim} text-xs leading-relaxed`}>
                  Editing is disabled for cancelled projects. If you believe this project should be reactivated, please contact a super admin or the original project creator.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Details Grid — uses FoldableContainer for explicit dual-pane on foldable devices ── */}
          <FoldableContainer
            className="mb-6 sm:mb-8"
            leftContent={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-4 sm:space-y-6 overflow-y-auto"
              >
                <OverviewPanel />
                <DatesPanel />
                <TagsPanel />
              </motion.div>
            }
            rightContent={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="space-y-4 sm:space-y-6 overflow-y-auto"
              >
                <TeamPanel />
                <ClientLeadPanel />
                <RequestAccessPanel />
                <ContentBoardPanel />
              </motion.div>
            }
          >
            {/* ── Single-screen fallback: original grid layout ── */}
            <div className={`gap-4 sm:gap-6 mb-6 sm:mb-8 ${
              isSquarish
                ? 'fold-auto-grid'
                : 'grid grid-cols-1 lg:grid-cols-3'
            }`}>
              {/* Left: Project Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-4 sm:space-y-6 lg:col-span-2"
              >
                <OverviewPanel />
                <DatesPanel />
                <TagsPanel />
              </motion.div>

              {/* Right: Sidebar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="space-y-4 sm:space-y-6"
              >
                <TeamPanel />
                <ClientLeadPanel />
                <RequestAccessPanel />
              </motion.div>
            </div>

            {/* ── Content Board Section (single-screen only) ── */}
            <ContentBoardPanel />
          </FoldableContainer>

        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <EditProjectModal
            project={project}
            onSave={handleSaveEdit}
            onClose={() => setIsEditing(false)}
            showCancelProject={true}
          />
        )}
      </AnimatePresence>

      {/* AI Content Wizard */}
      <AnimatePresence>
        {showContentWizard && project && (
          <CreateContentWizard
            projectId={project.id}
            projectName={project.name}
            projectDescription={project.details}
            onClose={() => setShowContentWizard(false)}
          />
        )}
      </AnimatePresence>
    </BackgroundLayout>
  );
}