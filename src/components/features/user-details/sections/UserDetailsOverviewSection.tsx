'use client';

import type { UserDayData } from '../../../../types/metrics';
import type { UserReportingQuality } from '../../../../types/reportingQuality';
import type { ActivityCalendarData } from '../../../../domain/calculators/activityCalendarCalculator';
import ActivityCalendar from '../day-details/ActivityCalendar';
import FeatureAdoptionRadarChart from '../charts/FeatureAdoptionRadarChart';

interface UserDetailsOverviewSectionProps {
  sectionId: string;
  days: UserDayData[];
  reportStartDay: string;
  reportEndDay: string;
  activityCalendar: ActivityCalendarData;
  reportingQuality: UserReportingQuality;
  onDayClick: (date: string, dayData?: UserDayData) => void;
  agentInteractions: number;
  planInteractions: number;
  cliInteractions: number;
  cloudAgentDays: number;
  copilotAppInteractions: number;
  completionInteractions: number;
}

export default function UserDetailsOverviewSection({
  sectionId,
  days,
  reportStartDay,
  reportEndDay,
  activityCalendar,
  reportingQuality,
  onDayClick,
  agentInteractions,
  planInteractions,
  cliInteractions,
  cloudAgentDays,
  copilotAppInteractions,
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
          activity={activityCalendar}
          reportingQuality={reportingQuality}
          onDayClick={onDayClick}
        />
      </div>
      <div className="lg:col-span-1">
        <FeatureAdoptionRadarChart
          agentInteractions={agentInteractions}
          planInteractions={planInteractions}
          cliInteractions={cliInteractions}
          cloudAgentDays={cloudAgentDays}
          copilotAppInteractions={copilotAppInteractions}
          completionInteractions={completionInteractions}
        />
      </div>
    </div>
  );
}
