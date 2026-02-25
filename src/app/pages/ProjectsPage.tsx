import { useNavigate } from 'react-router';
import { ArrowRight, Calendar, Users, Briefcase, Home, Edit2, Plus, Filter, Lock, CheckCircle, Send, XCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { ProfileBanner } from '../components/ProfileBanner';
import { FilterBanner, ActiveFilters } from '../components/FilterBanner';
import { EditProjectModal } from '../components/EditProjectModal';
import { useAuth } from '../components/AuthContext';
import { BackgroundLayout } from '../components/BackgroundLayout';
import {
  useProjects,
  canUserEdit,
  hasUserRequestedEdit,
  getProjectStatus,
  generateRouteSlug,
  Project,
} from '../contexts/ProjectsContext';
import { useState, useMemo, useEffect } from 'react';
import { useFoldableLayout } from '../hooks/useFoldableLayout';

/**
 * ProjectsPage
 * ─────────────────────────────────────────────────────────
 * Portfolio grid of project cards with filters.
 *
 * Responsive strategy (mobile-first):
 * - Base (320px+): single-column cards, stacked image/text, compact padding
 * - sm (640px+): wider padding, side-by-side filter/profile
 * - md (768px+): 2-column card layout (image + text side-by-side)
 * - lg (1024px+): full-size text, generous spacing
 * - Cards use auto-fit grid for project info row
 * - Touch: all buttons ≥ 44px, hover-only UI gets touch fallback
 *
 * Foldable / Dual-Screen:
 * - Profile/Filter banner uses fold-auto-grid for unconventional aspect ratios
 * - Project cards adapt to hinge-aware layout on dual-screen
 * - Stats section uses flex-wrap for squarish viewports
 * - Content avoids the hinge/seam in horizontal spanning mode
 */

export function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, addProject, updateProject, requestEditAccess } = useProjects();
  const { isDualScreen, isSquarish, spanningMode } = useFoldableLayout();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  // Modal state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [creatingProject, setCreatingProject] = useState<Project | null>(null);

  // Track which project IDs have had access requested in this session
  const [sessionRequested, setSessionRequested] = useState<Set<string>>(new Set());

  // Filter state
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    company: [],
    status: [],
    dateRange: [],
    industry: [],
    projectLead: [],
    tags: [],
  });

  // ── Filter options derived from all projects ──────────────────────────────
  const filterOptions = useMemo(() => {
    const companies = [...new Set(projects.map(p => p.client).filter(Boolean))].sort();
    const statuses = [...new Set(projects.map(p => getProjectStatus(p).label))].sort();
    const industries = [...new Set(projects.map(p => p.industry).filter(Boolean))].sort();
    const leads = [...new Set(projects.map(p => p.clientProjectLead?.name).filter(Boolean) as string[])].sort();
    const allTags = [...new Set(projects.flatMap(p => p.tags))].sort();

    const dateSet = new Set<string>();
    projects.forEach(p => {
      if (p.startDate) {
        const d = new Date(p.startDate);
        dateSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      if (p.endDate) {
        const d = new Date(p.endDate);
        dateSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    });
    const dateRanges = [...dateSet].sort().map(ym => {
      const [y, m] = ym.split('-');
      const monthName = new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short' });
      return { label: `${monthName} ${y}`, value: ym };
    });

    return {
      company: companies.map(c => ({ label: c, value: c })),
      status: statuses.map(s => ({ label: s, value: s })),
      dateRange: dateRanges,
      industry: industries.map(i => ({ label: i, value: i })),
      projectLead: leads.map(l => ({ label: l, value: l })),
      tags: allTags.map(t => ({ label: t, value: t })),
    };
  }, [projects]);

  // ── Filtered project list ─────────────────────────────────────────────────
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      if (activeFilters.company.length > 0 && !activeFilters.company.includes(project.client)) return false;
      if (activeFilters.status.length > 0) {
        const label = getProjectStatus(project).label;
        if (!activeFilters.status.includes(label)) return false;
      }
      if (activeFilters.dateRange.length > 0) {
        const months = new Set<string>();
        if (project.startDate) {
          const d = new Date(project.startDate);
          months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
        if (project.endDate) {
          const d = new Date(project.endDate);
          months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
        if (!activeFilters.dateRange.some(ym => months.has(ym))) return false;
      }
      if (activeFilters.industry.length > 0 && !activeFilters.industry.includes(project.industry)) return false;
      if (activeFilters.projectLead.length > 0) {
        if (!project.clientProjectLead?.name || !activeFilters.projectLead.includes(project.clientProjectLead.name)) return false;
      }
      if (activeFilters.tags.length > 0) {
        if (!activeFilters.tags.some(tag => project.tags.includes(tag))) return false;
      }
      return true;
    });
  }, [projects, activeFilters]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCreateClick = () => {
    const blank: Project = {
      id: `project-${Date.now()}`,
      name: '',
      client: '',
      description: '',
      details: '',
      industry: '',
      duration: '',
      teamSize: '0 members',
      image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      route: '#',
      tags: [],
      teamMembers: [],
      status: 'active',
      createdBy: user?.email ?? '',
      clientProjectLead: { name: '', phoneCode: '+1', phoneNumber: '', email: '', jobTitle: '' },
    };
    setCreatingProject(blank);
  };

  const handleSaveCreate = (created: Project) => {
    const route = generateRouteSlug(created.name);
    addProject({ ...created, route, createdBy: user?.email ?? '' });
    setCreatingProject(null);
  };

  const handleSaveEdit = (updated: Project) => {
    updateProject(updated);
    setEditingProject(null);
  };

  const handleRequestEditAccess = (projectId: string, projectName: string) => {
    if (!user) return;
    requestEditAccess(projectId, user.email);
    setSessionRequested(prev => new Set([...prev, projectId]));
    toast.success('Edit access request sent!', {
      description: `An email notification has been sent to admin for "${projectName}".`,
      duration: 5000,
      icon: '📧',
    });
  };

  return (
    <BackgroundLayout>
      {/* Main Content — fluid padding scales with viewport */}
      <div className="min-h-screen px-4 py-8 sm:px-6 md:px-8 md:py-12">
        <div className="max-w-7xl mx-auto">

          {/* ── Page Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 mb-8 md:mb-12 shadow-2xl"
          >
            {/* Back button — 44px touch target */}
            <button
              onClick={() => navigate('/')}
              className="text-white/80 hover:text-white mb-4 sm:mb-6 inline-flex items-center gap-2 text-sm transition-colors min-h-[2.75rem]"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </button>

            <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h1
                  className="text-white mb-2 sm:mb-4"
                  style={{ fontSize: 'clamp(1.75rem, 5vw, 3.5rem)' }}
                >
                  Projects
                </h1>
                <p
                  className="text-white/80 max-w-3xl"
                  style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.25rem)' }}
                >
                  Explore our portfolio of innovative solutions and successful collaborations with leading brands
                </p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <motion.button
                  onClick={handleCreateClick}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="shrink-0 bg-white hover:bg-white/90 backdrop-blur-md border border-white/40 text-teal-600 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl shadow-lg transition-colors inline-flex items-center gap-2 min-h-[2.75rem]"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Add New Project</span>
                  <span className="sm:hidden">Add</span>
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* ── Profile Banner + Filter Banner — stacked on mobile, side-by-side md+ ── */}
          {/* On dual-screen horizontal or squarish aspect, use auto-fit for flexible layout */}
          <div className={`mb-8 md:mb-12 gap-4 ${
            isDualScreen || isSquarish
              ? 'fold-auto-grid'
              : 'grid grid-cols-1 md:grid-cols-2'
          }`}>
            <ProfileBanner />
            <FilterBanner
              filterOptions={filterOptions}
              activeFilters={activeFilters}
              onFiltersChange={setActiveFilters}
            />
          </div>

          {/* ── Project Cards ── */}
          <div className="space-y-6 sm:space-y-8">
            {filteredProjects.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center"
              >
                <Filter className="w-10 h-10 sm:w-12 sm:h-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-white/70 mb-2" style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}>No projects match your filters</h3>
                <p className="text-white/50 text-sm mb-4">Try adjusting your filter criteria to see more results.</p>
                <button
                  onClick={() => setActiveFilters({ company: [], status: [], dateRange: [], industry: [], projectLead: [], tags: [] })}
                  className="text-teal-300 hover:text-teal-200 text-sm underline underline-offset-2 transition-colors min-h-[2.75rem] inline-flex items-center"
                >
                  Clear all filters
                </button>
              </motion.div>
            )}

            {filteredProjects.map((project, index) => {
              const userCanEdit = canUserEdit(project, user);
              const status = getProjectStatus(project);

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15, duration: 0.6 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-3xl overflow-hidden hover:bg-white/15 transition-all shadow-xl relative group"
                >
                  {/* Edit pencil — visible on hover (desktop) and always visible (mobile) */}
                  {userCanEdit && status.type !== 'cancelled' && (
                    <motion.button
                      onClick={() => setEditingProject(project)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 bg-white/20 backdrop-blur-md border border-white/40 hover:bg-white/30 text-white p-2.5 sm:p-3 rounded-full shadow-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center"
                      title="Edit project"
                    >
                      <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.button>
                  )}

                  {/* Request Access button — visible on hover (desktop), always visible on mobile */}
                  {!userCanEdit && status.type !== 'cancelled' && (() => {
                    const alreadyRequested =
                      sessionRequested.has(project.id) ||
                      hasUserRequestedEdit(project, user);
                    return (
                      <AnimatePresence mode="wait">
                        {alreadyRequested ? (
                          <motion.div
                            key={`confirmed-${project.id}`}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 bg-teal-500/25 backdrop-blur-md border border-teal-400/40 text-teal-200 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity pointer-events-none"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Access Requested
                          </motion.div>
                        ) : (
                          <motion.button
                            key={`request-${project.id}`}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{ duration: 0.2 }}
                            onClick={e => {
                              e.stopPropagation();
                              handleRequestEditAccess(project.id, project.name);
                            }}
                            whileHover={{ scale: 1.06 }}
                            whileTap={{ scale: 0.95 }}
                            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 bg-amber-500/80 hover:bg-amber-500 backdrop-blur-md border border-amber-400/50 text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer min-h-[2.25rem]"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Request Access
                          </motion.button>
                        )}
                      </AnimatePresence>
                    );
                  })()}

                  {/* Card body — stacked mobile, side-by-side md+ */}
                  {/* On dual-screen horizontal, each card half maps to a screen segment */}
                  <div className={`flex flex-col md:grid md:grid-cols-2 md:h-[420px] ${
                    isDualScreen && spanningMode === 'dual-horizontal' ? 'fold-span-both' : ''
                  }`}>
                    {/* Image */}
                    <div className="relative h-48 sm:h-56 md:h-full">
                      <ImageWithFallback
                        src={project.image}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                      {/* Status Badge */}
                      <div className={`absolute top-3 left-3 sm:top-4 sm:left-4 ${status.color} text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs shadow-lg backdrop-blur-sm border border-white/20`}>
                        {status.label}
                      </div>

                      {/* Access indicator badge */}
                      <div className={`absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex items-center gap-1.5 px-2 py-1 sm:px-2.5 rounded-full text-xs backdrop-blur-sm border ${
                        userCanEdit
                          ? 'bg-teal-500/30 border-teal-400/40 text-teal-100'
                          : 'bg-amber-500/20 border-amber-400/30 text-amber-200'
                      }`}>
                        {userCanEdit ? <Edit2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {userCanEdit ? 'Can Edit' : 'Read Only'}
                      </div>

                      {/* Tags Overlay — hidden on very small screens */}
                      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 hidden sm:flex flex-wrap gap-1 justify-end">
                        {project.tags.slice(0, 2).map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-2 py-0.5 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 sm:p-6 md:p-8 lg:p-10 flex flex-col md:h-full">
                      <div className="flex-1 min-h-0 overflow-hidden">
                        {/* Client */}
                        <div className="flex items-center gap-2 text-sm text-white/70 mb-2 sm:mb-3">
                          <Briefcase className="w-4 h-4 shrink-0" />
                          <span className="truncate">{project.client}</span>
                        </div>

                        {/* Project Name — fluid sizing */}
                        <h2
                          className="text-white mb-2 sm:mb-3 line-clamp-1"
                          style={{ fontSize: 'clamp(1.25rem, 3vw, 2.25rem)' }}
                        >
                          {project.name}
                        </h2>

                        {/* Description */}
                        <p className="text-white/90 mb-3 sm:mb-4 line-clamp-1" style={{ fontSize: 'clamp(0.875rem, 1.3vw, 1.125rem)' }}>
                          {project.description}
                        </p>

                        {/* Details */}
                        <p className="text-white/70 mb-4 sm:mb-6 leading-relaxed line-clamp-2 text-sm">{project.details}</p>

                        {/* Project Info — auto-fit grid */}
                        <div className="grid grid-cols-3 gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-white/20">
                          <div>
                            <div className="text-[0.65rem] sm:text-xs text-white/60 mb-1">Industry</div>
                            <div className="text-xs sm:text-sm text-white truncate">{project.industry}</div>
                          </div>
                          <div>
                            <div className="text-[0.65rem] sm:text-xs text-white/60 mb-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3 hidden sm:block" /> Duration
                            </div>
                            <div className="text-xs sm:text-sm text-white">{project.duration || '—'}</div>
                          </div>
                          <div>
                            <div className="text-[0.65rem] sm:text-xs text-white/60 mb-1 flex items-center gap-1">
                              <Users className="w-3 h-3 hidden sm:block" /> Team
                            </div>
                            <div className="text-xs sm:text-sm text-white">{project.teamSize}</div>
                          </div>
                        </div>
                      </div>

                      {/* CTA — always visible, min-h for touch */}
                      <div className="flex-shrink-0 flex flex-col gap-2 sm:gap-3 pt-3 sm:pt-4">
                        <motion.button
                          onClick={() => navigate(project.route)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`group w-full px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-lg transition-all inline-flex items-center justify-center gap-2 min-h-[2.75rem] ${
                            status.type === 'cancelled'
                              ? 'bg-white/15 backdrop-blur-md border border-white/25 text-white/90 hover:bg-white/20'
                              : 'bg-white text-teal-600'
                          }`}
                        >
                          {status.type === 'cancelled' ? (
                            <>
                              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                              <span className="text-sm sm:text-base">View Cancelled Project</span>
                            </>
                          ) : (
                            <>
                              <span className="text-sm sm:text-base">View Project Details</span>
                              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </motion.button>

                        {/* Cancelled hint */}
                        {status.type === 'cancelled' && (
                          <p className="text-center text-red-300/60 text-xs flex items-center justify-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            This project has been cancelled — view archived details
                          </p>
                        )}

                        {/* Permission hints */}
                        {status.type !== 'cancelled' && !userCanEdit && !sessionRequested.has(project.id) && !hasUserRequestedEdit(project, user) && (
                          <p className="text-center text-white/45 text-xs flex items-center justify-center gap-1 flex-wrap">
                            <Lock className="w-3 h-3" />
                            <span>Read-only — <span className="hidden sm:inline">hover the card and click </span><span className="text-amber-300/70">Request Access</span> to get edit rights</span>
                          </p>
                        )}
                        {status.type !== 'cancelled' && !userCanEdit && (sessionRequested.has(project.id) || hasUserRequestedEdit(project, user)) && (
                          <p className="text-center text-teal-300/60 text-xs flex items-center justify-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Access request sent — awaiting admin approval
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ── Stats Section ── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-12 sm:mt-16 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 md:p-12"
          >
            <h3
              className="text-white text-center mb-8 md:mb-12"
              style={{ fontSize: 'clamp(1.375rem, 3vw, 2.25rem)' }}
            >
              Why Choose Brandtelligence?
            </h3>
            <div className={`gap-6 sm:gap-8 ${
              isDualScreen || isSquarish
                ? 'fold-auto-grid'
                : 'grid grid-cols-2 md:grid-cols-4'
            }`}>
              {[
                { value: '50+', label: 'Successful Projects', gradient: 'from-purple-400 to-pink-400' },
                { value: '100+', label: 'Satisfied Clients', gradient: 'from-teal-400 to-cyan-400' },
                { value: '99%', label: 'Success Rate', gradient: 'from-orange-400 to-amber-400' },
                { value: '24/7', label: 'Support Available', gradient: 'from-cyan-400 to-blue-400' },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + idx * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                  className="text-center"
                >
                  <div
                    className={`mb-2 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}
                    style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)' }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-white/80" style={{ fontSize: 'clamp(0.7rem, 1.2vw, 1rem)' }}>{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>

      {/* ── Edit Project Modal ── */}
      <AnimatePresence>
        {editingProject && (
          <EditProjectModal
            key={`edit-${editingProject.id}`}
            project={editingProject}
            mode="edit"
            onSave={handleSaveEdit}
            onClose={() => setEditingProject(null)}
            showCancelProject={true}
          />
        )}
      </AnimatePresence>

      {/* ── Create Project Modal ── */}
      <AnimatePresence>
        {creatingProject && (
          <EditProjectModal
            key="create"
            project={creatingProject}
            mode="create"
            onSave={handleSaveCreate}
            onClose={() => setCreatingProject(null)}
          />
        )}
      </AnimatePresence>
    </BackgroundLayout>
  );
}