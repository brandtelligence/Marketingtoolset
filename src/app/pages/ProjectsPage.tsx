import { useNavigate } from 'react-router';
import {
  ArrowRight, Calendar, Users, Briefcase, Home, Edit2, Plus,
  Filter, Lock, CheckCircle, Send, XCircle, AlertTriangle, Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { ProfileBanner } from '../components/ProfileBanner';
import { FilterBanner, ActiveFilters } from '../components/FilterBanner';
import { EditProjectModal } from '../components/EditProjectModal';
import { EmployeeNav } from '../components/EmployeeNav';
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

export function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { projects, addProject, updateProject, requestEditAccess } = useProjects();
  const { isDualScreen, isSquarish, spanningMode } = useFoldableLayout();

  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

  const [editingProject,  setEditingProject]  = useState<Project | null>(null);
  const [creatingProject, setCreatingProject] = useState<Project | null>(null);
  const [sessionRequested, setSessionRequested] = useState<Set<string>>(new Set());

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    company: [], status: [], dateRange: [], industry: [], projectLead: [], tags: [],
  });

  const filterOptions = useMemo(() => {
    const companies = [...new Set(projects.map(p => p.client).filter(Boolean))].sort();
    const statuses  = [...new Set(projects.map(p => getProjectStatus(p).label))].sort();
    const industries = [...new Set(projects.map(p => p.industry).filter(Boolean))].sort();
    const leads     = [...new Set(projects.map(p => p.clientProjectLead?.name).filter(Boolean) as string[])].sort();
    const allTags   = [...new Set(projects.flatMap(p => p.tags))].sort();

    const dateSet = new Set<string>();
    projects.forEach(p => {
      ['startDate', 'endDate'].forEach(k => {
        const v = (p as any)[k];
        if (v) {
          const d = new Date(v);
          dateSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      });
    });
    const dateRanges = [...dateSet].sort().map(ym => {
      const [y, m] = ym.split('-');
      const monthName = new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short' });
      return { label: `${monthName} ${y}`, value: ym };
    });

    return {
      company:     companies.map(c => ({ label: c, value: c })),
      status:      statuses.map(s => ({ label: s, value: s })),
      dateRange:   dateRanges,
      industry:    industries.map(i => ({ label: i, value: i })),
      projectLead: leads.map(l => ({ label: l, value: l })),
      tags:        allTags.map(t => ({ label: t, value: t })),
    };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      if (activeFilters.company.length > 0 && !activeFilters.company.includes(project.client)) return false;
      if (activeFilters.status.length > 0) {
        if (!activeFilters.status.includes(getProjectStatus(project).label)) return false;
      }
      if (activeFilters.dateRange.length > 0) {
        const months = new Set<string>();
        ['startDate', 'endDate'].forEach(k => {
          const v = (project as any)[k];
          if (v) {
            const d = new Date(v);
            months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
          }
        });
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

  const handleCreateClick = () => {
    setCreatingProject({
      id: `project-${Date.now()}`, name: '', client: '', description: '', details: '',
      industry: '', duration: '', teamSize: '0 members',
      image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      route: '#', tags: [], teamMembers: [], status: 'active',
      createdBy: user?.email ?? '',
      clientProjectLead: { name: '', phoneCode: '+60', phoneNumber: '', email: '', jobTitle: '' },
    });
  };

  const handleSaveCreate = (created: Project) => {
    addProject({ ...created, route: generateRouteSlug(created.name), createdBy: user?.email ?? '' });
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
      duration: 5000, icon: '📧',
    });
  };

  return (
    <BackgroundLayout>
      {/* ── Employee top nav ── */}
      <EmployeeNav />

      <div className="min-h-screen px-4 py-6 sm:px-6 md:px-8">
        <div className="max-w-7xl mx-auto">

          {/* ── Page header ── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 sm:p-8 mb-6 shadow-xl"
          >
            <button
              onClick={() => navigate('/')}
              className="text-white/70 hover:text-white mb-4 inline-flex items-center gap-2 text-sm transition-colors"
            >
              <Home className="w-4 h-4" /> Back to Home
            </button>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-white text-3xl sm:text-4xl font-bold mb-1">Projects</h1>
                <p className="text-white/70 text-sm sm:text-base max-w-2xl">
                  Explore our portfolio of innovative solutions and successful collaborations
                </p>
              </div>
              <motion.button
                onClick={handleCreateClick}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all"
                style={{ background: '#0BA4AA' }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add New Project</span>
                <span className="sm:hidden">Add</span>
              </motion.button>
            </div>
          </motion.div>

          {/* ── Profile + Filter banners ── */}
          <div className={`mb-6 gap-4 ${isDualScreen || isSquarish ? 'fold-auto-grid' : 'grid grid-cols-1 md:grid-cols-2'}`}>
            <ProfileBanner />
            <FilterBanner filterOptions={filterOptions} activeFilters={activeFilters} onFiltersChange={setActiveFilters} />
          </div>

          {/* ── Project cards ── */}
          <div className="space-y-5">
            {filteredProjects.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-10 text-center"
              >
                <Filter className="w-10 h-10 text-white/30 mx-auto mb-3" />
                <h3 className="text-white/70 text-lg mb-1">No projects match your filters</h3>
                <p className="text-white/50 text-sm mb-4">Try adjusting your criteria to see more results.</p>
                <button
                  onClick={() => setActiveFilters({ company: [], status: [], dateRange: [], industry: [], projectLead: [], tags: [] })}
                  className="text-teal-300 hover:text-teal-200 text-sm underline underline-offset-2 transition-colors"
                >
                  Clear all filters
                </button>
              </motion.div>
            )}

            {filteredProjects.map((project, index) => {
              const userCanEdit = canUserEdit(project, user);
              const alreadyRequested = sessionRequested.has(project.id) || hasUserRequestedEdit(project, user);
              const status = getProjectStatus(project);
              const isCancelled = status.type === 'cancelled';

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.45 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden shadow-xl hover:bg-white/[0.13] hover:border-white/30 transition-all duration-300"
                >
                  {/* ── Two-column layout: image | content ── */}
                  <div className={`flex flex-col md:flex-row md:h-[360px] ${
                    isDualScreen && spanningMode === 'dual-horizontal' ? 'fold-span-both' : ''
                  }`}>

                    {/* ── Image pane ── */}
                    <div className="relative h-52 md:h-full md:w-2/5 shrink-0">
                      <ImageWithFallback
                        src={project.image}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />

                      {/* Darkening gradient — bottom only */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {/* Status badge — top left */}
                      <span className={`absolute top-3 left-3 ${status.color} text-white text-xs px-2.5 py-1 rounded-full shadow-md backdrop-blur-sm border border-white/20 font-medium`}>
                        {status.label}
                      </span>

                      {/* Tags — bottom left, max 2 */}
                      {project.tags.length > 0 && (
                        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 max-w-[calc(100%-1.5rem)]">
                          {project.tags.slice(0, 2).map((tag, i) => (
                            <span key={i} className="flex items-center gap-1 bg-black/40 backdrop-blur-sm border border-white/20 text-white/90 text-[0.65rem] px-2 py-0.5 rounded-full">
                              <Tag className="w-2.5 h-2.5" />{tag}
                            </span>
                          ))}
                          {project.tags.length > 2 && (
                            <span className="bg-black/40 backdrop-blur-sm border border-white/20 text-white/60 text-[0.65rem] px-2 py-0.5 rounded-full">
                              +{project.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── Content pane ── */}
                    <div className="flex flex-col flex-1 p-5 sm:p-6 min-h-0">

                      {/* Row 1: client + action buttons */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-1.5 text-white/60 text-xs min-w-0">
                          <Briefcase className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{project.client}</span>
                        </div>

                        {/* Permission controls — always visible */}
                        {!isCancelled && (
                          <div className="shrink-0 flex items-center gap-2">
                            {userCanEdit ? (
                              <button
                                onClick={() => setEditingProject(project)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
                                style={{ background: 'rgba(11,164,170,0.25)', border: '1px solid rgba(11,164,170,0.4)' }}
                              >
                                <Edit2 className="w-3 h-3" /> Edit
                              </button>
                            ) : alreadyRequested ? (
                              <span className="flex items-center gap-1 text-xs text-teal-300/80 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg">
                                <CheckCircle className="w-3 h-3" /> Requested
                              </span>
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); handleRequestEditAccess(project.id, project.name); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
                                style={{ background: 'rgba(244,122,32,0.25)', border: '1px solid rgba(244,122,32,0.4)' }}
                              >
                                <Send className="w-3 h-3" /> Request Access
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Row 2: project name */}
                      <h2 className="text-white text-xl sm:text-2xl font-bold leading-tight mb-2 line-clamp-1">
                        {project.name}
                      </h2>

                      {/* Row 3: description */}
                      <p className="text-white/75 text-sm leading-relaxed mb-1 line-clamp-2">
                        {project.description}
                      </p>

                      {/* Row 4: details */}
                      <p className="text-white/55 text-xs leading-relaxed mb-4 line-clamp-2">
                        {project.details}
                      </p>

                      {/* Spacer */}
                      <div className="flex-1" />

                      {/* Row 5: meta info grid */}
                      <div className="grid grid-cols-3 gap-3 pb-4 mb-4 border-b border-white/15">
                        <div>
                          <p className="text-white/40 text-[0.6rem] uppercase tracking-wider mb-0.5">Industry</p>
                          <p className="text-white text-xs font-medium truncate">{project.industry || '—'}</p>
                        </div>
                        <div>
                          <p className="text-white/40 text-[0.6rem] uppercase tracking-wider mb-0.5 flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" /> Duration
                          </p>
                          <p className="text-white text-xs font-medium">{project.duration || '—'}</p>
                        </div>
                        <div>
                          <p className="text-white/40 text-[0.6rem] uppercase tracking-wider mb-0.5 flex items-center gap-0.5">
                            <Users className="w-2.5 h-2.5" /> Team
                          </p>
                          <p className="text-white text-xs font-medium">{project.teamSize}</p>
                        </div>
                      </div>

                      {/* Row 6: CTA */}
                      <motion.button
                        onClick={() => navigate(project.route)}
                        whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          isCancelled
                            ? 'bg-white/10 border border-white/20 text-white/70 hover:bg-white/15'
                            : 'text-white shadow-lg hover:brightness-110'
                        }`}
                        style={isCancelled ? {} : { background: '#0BA4AA' }}
                      >
                        {isCancelled ? (
                          <>
                            <XCircle className="w-4 h-4 text-red-400" />
                            View Cancelled Project
                          </>
                        ) : (
                          <>
                            View Project Details
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                          </>
                        )}
                      </motion.button>

                      {isCancelled && (
                        <p className="text-center text-red-300/50 text-xs flex items-center justify-center gap-1 mt-2">
                          <AlertTriangle className="w-3 h-3" /> Archived — project was cancelled
                        </p>
                      )}

                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ── Stats section ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-10 shadow-xl"
          >
            <h3 className="text-white text-xl sm:text-2xl font-bold text-center mb-8">
              Why Choose Brandtelligence?
            </h3>
            <div className={`gap-6 ${isDualScreen || isSquarish ? 'fold-auto-grid' : 'grid grid-cols-2 md:grid-cols-4'}`}>
              {[
                { value: '50+',  label: 'Successful Projects', from: 'from-purple-400', to: 'to-pink-400' },
                { value: '100+', label: 'Satisfied Clients',   from: 'from-teal-400',  to: 'to-cyan-400' },
                { value: '99%',  label: 'Success Rate',        from: 'from-orange-400',to: 'to-amber-400' },
                { value: '24/7', label: 'Support Available',   from: 'from-cyan-400',  to: 'to-blue-400' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.08, duration: 0.4 }}
                  whileHover={{ scale: 1.04 }}
                  className="text-center"
                >
                  <div className={`text-4xl sm:text-5xl font-extrabold mb-1.5 bg-gradient-to-r ${stat.from} ${stat.to} bg-clip-text text-transparent`}>
                    {stat.value}
                  </div>
                  <div className="text-white/70 text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {editingProject && (
          <EditProjectModal
            key={`edit-${editingProject.id}`}
            project={editingProject}
            mode="edit"
            onSave={handleSaveEdit}
            onClose={() => setEditingProject(null)}
            showCancelProject
          />
        )}
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
