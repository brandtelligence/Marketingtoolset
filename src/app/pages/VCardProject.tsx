import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar } from '../components/Calendar';
import { Mockups } from '../components/Mockups';
import { CalendarDays, ImageIcon, ArrowLeft, Sparkles, LayoutGrid } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { ProfileBanner } from '../components/ProfileBanner';
import { BackgroundLayout } from '../components/BackgroundLayout';
import { CreateContentWizard } from '../components/ai/CreateContentWizard';
import { ContentBoard } from '../components/ai/ContentBoard';
import { useFoldableLayout } from '../hooks/useFoldableLayout';
import { FoldableContainer } from '../components/FoldableContainer';

/**
 * VCardProject
 * ─────────────────────────────────────────────────────────
 * Source page for the vCard SaaS project with tabbed views
 * (Calendar, Mockups, Content Board).
 *
 * Responsive strategy (mobile-first):
 * - Base (320px+): stacked header, horizontal-scroll tab bar
 * - sm (640px+): side-by-side header + tabs
 * - md (768px+): 2-col overview grid
 * - lg (1024px+): wider container padding
 * - Tab bar uses overflow-x-auto for touch-scrollable navigation on mobile
 * - All interactive targets ≥ 44px
 *
 * Foldable / Dual-Screen:
 * - Uses FoldableContainer for explicit dual-pane: overview on left, active view on right
 * - Single-screen fallback uses fold-auto-grid on squarish viewports
 * - Content area adapts with hinge-safe padding
 */

type View = 'calendar' | 'mockups' | 'content-board';

export function VCardProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<View>('calendar');
  const [showContentWizard, setShowContentWizard] = useState(false);
  const { isDualScreen, isSquarish } = useFoldableLayout();

  // Auth guard
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  return (
    <BackgroundLayout>
      {/* ── Header Banner ── */}
      <div className="bg-white/5 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Back Button — 44px touch target */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              onClick={() => navigate('/projects')}
              className="text-white/70 hover:text-white inline-flex items-center gap-2 text-sm w-fit transition-colors min-h-[2.75rem]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </motion.button>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Title block */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="text-sm text-teal-300 mb-1">vCard.brandtelligence.my</div>
                <h1
                  className="text-white"
                  style={{ fontSize: 'clamp(1.5rem, 3.5vw, 1.875rem)' }}
                >
                  vCard SaaS
                </h1>
                <p className="text-white/60 mt-1 text-sm sm:text-base">Social Media Content Calendar &amp; Mockups</p>
              </motion.div>

              {/* View Toggle — horizontal-scrollable on mobile */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none"
              >
                <div className="flex gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-md border border-white/20 p-1 rounded-xl w-max sm:w-auto">
                  {/* Tab buttons — min-h-[2.75rem] for touch */}
                  <button
                    onClick={() => setActiveView('calendar')}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all whitespace-nowrap min-h-[2.75rem] text-sm ${
                      activeView === 'calendar'
                        ? 'bg-white/20 text-white shadow-lg border border-white/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <CalendarDays className="w-4 h-4" />
                    Calendar
                  </button>
                  <button
                    onClick={() => setActiveView('mockups')}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all whitespace-nowrap min-h-[2.75rem] text-sm ${
                      activeView === 'mockups'
                        ? 'bg-white/20 text-white shadow-lg border border-white/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Mockups
                  </button>
                  <button
                    onClick={() => setActiveView('content-board')}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all whitespace-nowrap min-h-[2.75rem] text-sm ${
                      activeView === 'content-board'
                        ? 'bg-white/20 text-white shadow-lg border border-white/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Content Board
                  </button>
                  <button
                    onClick={() => setShowContentWizard(true)}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all bg-gradient-to-r from-teal-500/80 to-purple-500/80 text-white hover:from-teal-500 hover:to-purple-500 shadow-lg whitespace-nowrap min-h-[2.75rem] text-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    Create Content
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Banner */}
      {user && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
          <ProfileBanner />
        </div>
      )}

      {/* Project Overview + Main Content area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <FoldableContainer
          leftContent={
            <div className="space-y-6 sm:space-y-8 overflow-y-auto">
              {/* Overview Panel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-6 shadow-xl"
              >
                <h2 className="text-white mb-3 sm:mb-4" style={{ fontSize: 'clamp(1.125rem, 2vw, 1.25rem)' }}>
                  Project Overview
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white mb-2">Objective</h3>
                    <p className="text-white/70 leading-relaxed text-sm">
                      Create a comprehensive 1-month social media marketing strategy to promote vCard SaaS platform,
                      increase brand awareness, and drive user acquisition across multiple social media channels.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-white mb-2">Deliverables</h3>
                    <ul className="text-white/70 space-y-1 text-sm">
                      <li>• 31 social media posts (full month calendar)</li>
                      <li>• Content across 5 platforms</li>
                      <li>• 7 professional mockups for Week 1</li>
                      <li>• Complete captions, hashtags, and CTAs</li>
                    </ul>
                  </div>
                </div>

                {/* Stats — 2x2 grid for left panel */}
                <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-white/15">
                  {[
                    { value: '31', label: 'Total Posts', gradient: 'from-purple-400 to-pink-400' },
                    { value: '5', label: 'Platforms', gradient: 'from-teal-400 to-cyan-400' },
                    { value: '7', label: 'Mockups', gradient: 'from-orange-400 to-amber-400' },
                    { value: '100%', label: 'Ready to Post', gradient: 'from-green-400 to-emerald-400' },
                  ].map((stat, idx) => (
                    <div key={idx} className="text-center">
                      <div
                        className={`mb-1 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent text-xl font-bold`}
                      >
                        {stat.value}
                      </div>
                      <div className="text-white/60 text-xs">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Tab legend for dual-screen context */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
                <p className="text-white/50 text-xs mb-2 uppercase tracking-wider">Active View</p>
                <p className="text-white text-sm font-medium">
                  {activeView === 'calendar' ? '📅 Calendar' : activeView === 'mockups' ? '🖼️ Mockups' : '📋 Content Board'}
                </p>
                <p className="text-white/40 text-xs mt-1">Displayed on the right panel →</p>
              </div>
            </div>
          }
          rightContent={
            <div className="overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                {activeView === 'calendar' ? <Calendar /> : activeView === 'mockups' ? <Mockups /> : (
                  <ContentBoard
                    projectId="1"
                    projectTeamMembers={['tm1', 'tm2', 'tm3', 'tm4', 'tm5', 'tm6', 'tm7', 'tm8']}
                    projectName="vCard SaaS"
                  />
                )}
              </motion.div>
            </div>
          }
        >
          {/* Single-screen fallback: original stacked layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-xl"
          >
            <h2 className="text-white mb-3 sm:mb-4" style={{ fontSize: 'clamp(1.125rem, 2vw, 1.25rem)' }}>
              Project Overview
            </h2>
            <div className={`gap-4 sm:gap-6 ${
              isSquarish
                ? 'fold-auto-grid'
                : 'grid grid-cols-1 md:grid-cols-2'
            }`}>
              <div>
                <h3 className="text-white mb-2">Objective</h3>
                <p className="text-white/70 leading-relaxed text-sm sm:text-base">
                  Create a comprehensive 1-month social media marketing strategy to promote vCard SaaS platform,
                  increase brand awareness, and drive user acquisition across multiple social media channels.
                </p>
              </div>
              <div>
                <h3 className="text-white mb-2">Deliverables</h3>
                <ul className="text-white/70 space-y-1 text-sm sm:text-base">
                  <li>• 31 social media posts (full month calendar)</li>
                  <li>• Content across 5 platforms (Instagram, Facebook, LinkedIn, Twitter, TikTok)</li>
                  <li>• 7 professional mockups for Week 1</li>
                  <li>• Complete captions, hashtags, and CTAs</li>
                </ul>
              </div>
            </div>

            {/* Stats — 2 col mobile, 4 col md+ */}
            <div className={`gap-3 sm:gap-4 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-white/15 ${
              isSquarish
                ? 'fold-auto-grid'
                : 'grid grid-cols-2 md:grid-cols-4'
            }`}>
              {[
                { value: '31', label: 'Total Posts', gradient: 'from-purple-400 to-pink-400' },
                { value: '5', label: 'Platforms', gradient: 'from-teal-400 to-cyan-400' },
                { value: '7', label: 'Mockups', gradient: 'from-orange-400 to-amber-400' },
                { value: '100%', label: 'Ready to Post', gradient: 'from-green-400 to-emerald-400' },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                  className="text-center"
                >
                  <div
                    className={`mb-1 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}
                    style={{ fontSize: 'clamp(1.5rem, 3vw, 1.875rem)' }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-white/60 text-xs sm:text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {activeView === 'calendar' ? <Calendar /> : activeView === 'mockups' ? <Mockups /> : (
              <ContentBoard
                projectId="1"
                projectTeamMembers={['tm1', 'tm2', 'tm3', 'tm4', 'tm5', 'tm6', 'tm7', 'tm8']}
                projectName="vCard SaaS"
              />
            )}
          </motion.div>
        </FoldableContainer>
      </div>

      {/* AI Content Wizard */}
      <AnimatePresence>
        {showContentWizard && (
          <CreateContentWizard
            projectId="1"
            projectName="vCard SaaS"
            projectDescription="A comprehensive SaaS platform enabling professionals to create, share, and manage digital business cards with NFC technology, QR codes, and real-time analytics."
            onClose={() => setShowContentWizard(false)}
          />
        )}
      </AnimatePresence>
    </BackgroundLayout>
  );
}