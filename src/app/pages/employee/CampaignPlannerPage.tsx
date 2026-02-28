/**
 * CampaignPlannerPage  —  /app/campaign
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-flow social media campaign planner powered by GPT-4o.
 * Wraps SocialCalendarPlanner with the standard employee shell.
 */

import { BackgroundLayout } from '../../components/BackgroundLayout';
import { EmployeeNav }      from '../../components/EmployeeNav';
import { ProfileBanner }    from '../../components/ProfileBanner';
import { SocialCalendarPlanner } from '../../components/ai/SocialCalendarPlanner';

export function CampaignPlannerPage() {
  return (
    <BackgroundLayout>
      <EmployeeNav />
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-4">
        <ProfileBanner />
        <SocialCalendarPlanner />
      </div>
    </BackgroundLayout>
  );
}
