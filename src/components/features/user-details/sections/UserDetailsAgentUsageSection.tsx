'use client';

import type { AgentActivity } from '../../../../types/agentActivity';
import AgentActivityChart from '../../../charts/AgentActivityChart';

interface UserDetailsAgentUsageSectionProps {
  sectionId: string;
  activity: AgentActivity;
  reportStartDay: string;
  reportEndDay: string;
}

export default function UserDetailsAgentUsageSection({
  sectionId,
  activity,
  reportStartDay,
  reportEndDay,
}: UserDetailsAgentUsageSectionProps) {
  const hasActivity = Object.values(activity.summary).some(
    counts => counts.sessions !== null || counts.userInputs !== null,
  );
  if (!hasActivity) return null;

  return (
    <div id={sectionId} className="scroll-mt-28 border-t border-default pt-6">
      <h3 className="text-lg font-semibold text-default mb-4">
        Agent-native activity
      </h3>
      <AgentActivityChart data={activity} reportStartDay={reportStartDay} reportEndDay={reportEndDay} />
    </div>
  );
}
