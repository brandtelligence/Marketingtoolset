/**
 * ContentAnalyticsPage  —  /app/analytics
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone page wrapping ContentAnalyticsDashboard with the employee shell.
 * Shows engagement metrics, platform breakdown, and content pipeline analytics.
 */

import { BackgroundLayout } from '../../components/BackgroundLayout';
import { EmployeeNav }      from '../../components/EmployeeNav';
import { ProfileBanner }    from '../../components/ProfileBanner';
import { ContentAnalyticsDashboard } from '../../components/ai/ContentAnalyticsDashboard';
import { useContent }       from '../../contexts/ContentContext';
import { useSEO }           from '../../hooks/useSEO';

export function ContentAnalyticsPage() {
  const { cards } = useContent();

  useSEO({
    title:       'Content Analytics',
    description: 'Analytics dashboard with engagement metrics, platform breakdown, and content pipeline insights.',
    noindex:     true,
  });

  return (
    <BackgroundLayout>
      <EmployeeNav />
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-4">
        <ProfileBanner />
        <ContentAnalyticsDashboard cards={cards} />
      </div>
    </BackgroundLayout>
  );
}
