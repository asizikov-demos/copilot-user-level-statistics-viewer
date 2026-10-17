'use client';

import { Button } from '@primer/react';
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
    <div id={sectionId} className="border-t border-default pt-6 scroll-mt-28">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-default">Impact Breakdown</h3>
          <p className="text-sm text-muted mt-1">View detailed impact by mode</p>
        </div>
        <Button onClick={onToggle} aria-expanded={isExpanded}>
          {isExpanded ? 'Hide Breakdown' : 'Show Breakdown'}
        </Button>
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
