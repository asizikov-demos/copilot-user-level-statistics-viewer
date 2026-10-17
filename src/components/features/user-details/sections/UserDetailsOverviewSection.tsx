'use client';

import type { UserDayData } from '../../../../types/metrics';
import ActivityCalendar from '../day-details/ActivityCalendar';
import FeatureAdoptionRadarChart from '../charts/FeatureAdoptionRadarChart';

interface UserDetailsOverviewSectionProps {
  sectionId: string;
  days: UserDayData[];
  reportStartDay: string;
  reportEndDay: string;
  daysActive: number;
  onDayClick: (date: string, dayData?: UserDayData) => void;
  agentInteractions: number;
  planInteractions: number;
  cliInteractions: number;
  askModeInteractions: number;
  editModeInteractions: number;
  completionInteractions: number;
}

export default function UserDetailsOverviewSection({
  sectionId,
  days,
  reportStartDay,
  reportEndDay,
  daysActive,
  onDayClick,
  agentInteractions,
  planInteractions,
  cliInteractions,
  askModeInteractions,
  editModeInteractions,
  completionInteractions,
}: UserDetailsOverviewSectionProps) {
  return (
    <div id={sectionId} className="grid grid-cols-1 lg:grid-cols-3 gap-6 scroll-mt-28">
      <div className="lg:col-span-2">
        <ActivityCalendar
          days={days}
          reportStartDay={reportStartDay}
          reportEndDay={reportEndDay}
          title="Activity Calendar"
          activeDaysCount={daysActive}
          onDayClick={onDayClick}
        />
      </div>
      <div className="lg:col-span-1">
        <FeatureAdoptionRadarChart
          agentInteractions={agentInteractions}
          planInteractions={planInteractions}
          cliInteractions={cliInteractions}
          askModeInteractions={askModeInteractions}
          editModeInteractions={editModeInteractions}
          completionInteractions={completionInteractions}
        />
      </div>
    </div>
  );
}
