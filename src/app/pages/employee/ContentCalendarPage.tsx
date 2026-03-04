/**
 * ContentCalendarPage  —  /app/calendar
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone calendar view for all content cards, showing scheduled posts
 * in a month grid. Wraps ContentCalendarView with the employee shell.
 */

import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { CalendarDays } from 'lucide-react';
import { BackgroundLayout } from '../../components/BackgroundLayout';
import { EmployeeNav }      from '../../components/EmployeeNav';
import { ProfileBanner }    from '../../components/ProfileBanner';
import { ContentCalendarView } from '../../components/ai/ContentCalendarView';
import { useContent, type ContentCard } from '../../contexts/ContentContext';
import { useDashboardTheme } from '../../components/saas/DashboardThemeContext';
import { employeeTheme }    from '../../utils/employeeTheme';
import { useSEO }           from '../../hooks/useSEO';
import { CardDetailModal }  from './ContentBoardPage';

export function ContentCalendarPage() {
  const { cards } = useContent();
  const { isDark } = useDashboardTheme();
  const et = employeeTheme(isDark);
  const [viewCard, setViewCard] = useState<ContentCard | null>(null);

  useSEO({
    title:       'Content Calendar',
    description: 'Calendar view of all scheduled and published content across platforms.',
    noindex:     true,
  });

  return (
    <BackgroundLayout>
      <EmployeeNav />
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-4">
        <ProfileBanner />

        {/* Page header */}
        <div>
          <h1 className={`text-lg font-bold ${et.text} flex items-center gap-2`}>
            <CalendarDays className="w-5 h-5" style={{ color: '#0BA4AA' }} />
            Content Calendar
          </h1>
          <p className={`text-xs ${et.textFaint} mt-0.5`}>
            View all scheduled content across platforms in a calendar layout
          </p>
        </div>

        <ContentCalendarView
          cards={cards}
          onOpenDetail={(card) => setViewCard(card)}
        />
      </div>

      <AnimatePresence>
        {viewCard && (
          <CardDetailModal card={viewCard} isDark={isDark} onClose={() => setViewCard(null)} />
        )}
      </AnimatePresence>
    </BackgroundLayout>
  );
}
