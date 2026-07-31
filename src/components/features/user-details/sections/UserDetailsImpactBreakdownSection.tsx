'use client';

import type { ModeImpactData } from '../../../../domain/calculators/metricCalculators';
import ModeImpactChart from '../../../charts/ModeImpactChart';

interface UserDetailsImpactBreakdownSectionProps {
  sectionId: string;
  isExpanded: boolean;
  onToggle: () => void;
  agentImpact: ModeImpactData[];
  askModeImpact: ModeImpactData[];
  completionImpact: ModeImpactData[];
  copilotAppImpact: ModeImpactData[];
  cliImpact: ModeImpactData[];
}

export default function UserDetailsImpactBreakdownSection({
  sectionId,
  isExpanded,
  onToggle,
  agentImpact,
  askModeImpact,
  completionImpact,
  copilotAppImpact,
  cliImpact,
}: UserDetailsImpactBreakdownSectionProps) {
  return (
    <div id={sectionId} className="border-t border-gray-200 pt-6 scroll-mt-28">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Impact Breakdown</h3>
          <p className="text-sm text-gray-600 mt-1">View detailed impact by mode</p>
        </div>
        <button
          onClick={onToggle}
          className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
        >
          {isExpanded ? 'Hide Breakdown' : 'Show Breakdown'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-8 mt-6">
          <ModeImpactChart
            data={agentImpact}
            title="Copilot Agent Mode Impact"
            description="Daily lines of code added and deleted through Copilot Agent Mode sessions."
            emptyStateMessage="No agent mode impact data available."
          />
          <ModeImpactChart
            data={askModeImpact}
            title="Ask Mode Impact"
            description="Daily lines of code added and deleted through Copilot Chat Ask Mode sessions."
            emptyStateMessage="No Ask Mode impact data available."
          />
          <ModeImpactChart
            data={completionImpact}
            title="Completions Impact"
            description="Daily lines of code added and deleted when developers accept Copilot code completions."
            emptyStateMessage="No code completion impact data available."
          />
          <ModeImpactChart
            data={copilotAppImpact}
            title="Copilot App Impact"
            description="Daily lines of code added and deleted through Copilot App sessions."
            emptyStateMessage="No Copilot App impact data available."
          />
          <ModeImpactChart
            data={cliImpact}
            title="CLI Impact"
            description="Daily lines of code added and deleted through Copilot CLI sessions."
            emptyStateMessage="No CLI impact data available."
          />
        </div>
      )}
    </div>
  );
}
