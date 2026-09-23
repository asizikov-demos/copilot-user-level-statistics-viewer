'use client';

import type { AgentActivity } from '../../../../types/agentActivity';
import type { CopilotCliAndAppUsageReadModel } from '../../../../read-models/userDetails';
import AgentActivityChart from '../../../charts/AgentActivityChart';
import CLITokensChart from '../../../charts/CLITokensChart';

interface UserDetailsAgentUsageSectionProps {
  sectionId: string;
  activity: AgentActivity;
  tokenUsage: CopilotCliAndAppUsageReadModel;
  reportStartDay: string;
  reportEndDay: string;
}

export default function UserDetailsAgentUsageSection({
  sectionId,
  activity,
  tokenUsage,
  reportStartDay,
  reportEndDay,
}: UserDetailsAgentUsageSectionProps) {
  const hasActivity = Object.values(activity.summary).some(
    counts => counts.sessions !== null || counts.userInputs !== null,
  );
  if (!hasActivity && !tokenUsage.hasActivity) return null;

  return (
    <div id={sectionId} className="scroll-mt-28 border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Agent-native activity
      </h3>
      <div className="space-y-8">
        <AgentActivityChart data={activity} reportStartDay={reportStartDay} reportEndDay={reportEndDay} />
        {tokenUsage.hasActivity && (
          <CLITokensChart
            data={tokenUsage.dailyCliTokenData}
            appData={tokenUsage.hasAppActivity ? tokenUsage.dailyAppTokenData : undefined}
          />
        )}
      </div>
    </div>
  );
}
