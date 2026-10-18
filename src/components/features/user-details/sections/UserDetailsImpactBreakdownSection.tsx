'use client';

import { Button } from '@primer/react';
import { ChevronDownIcon, ChevronUpIcon } from '@primer/octicons-react';
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
  const charts = [
    {
      data: agentImpact,
      title: 'Copilot Agent Mode Impact',
      description: 'Daily lines of code added and deleted through Copilot Agent Mode sessions.',
      emptyStateMessage: 'No agent mode impact data available.',
    },
    {
      data: askModeImpact,
      title: 'Ask Mode Impact',
      description: 'Daily lines of code added and deleted through Copilot Chat Ask Mode sessions.',
      emptyStateMessage: 'No Ask Mode impact data available.',
    },
    {
      data: completionImpact,
      title: 'Completions Impact',
      description: 'Daily lines of code added and deleted when developers accept Copilot code completions.',
      emptyStateMessage: 'No code completion impact data available.',
    },
    {
      data: copilotAppImpact,
      title: 'Copilot App Impact',
      description: 'Daily lines of code added and deleted through Copilot App sessions.',
      emptyStateMessage: 'No Copilot App impact data available.',
    },
    {
      data: cliImpact,
      title: 'CLI Impact',
      description: 'Daily lines of code added and deleted through Copilot CLI sessions.',
      emptyStateMessage: 'No CLI impact data available.',
    },
  ].filter(chart => chart.data.some(entry => entry.locAdded !== 0 || entry.locDeleted !== 0));

  if (charts.length === 0) return null;

  return (
    <div id={sectionId} className="border-t border-default pt-6 scroll-mt-28">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-default">Impact Breakdown</h3>
        <p className="text-sm text-muted mt-1">View detailed impact by mode</p>
      </div>

      {isExpanded && (
        <div id={`${sectionId}-content`} className="space-y-8 mt-4">
          {charts.map(chart => (
            <ModeImpactChart key={chart.title} {...chart} />
          ))}
        </div>
      )}

      <div className="mt-2">
        <Button
          variant="invisible"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={`${sectionId}-content`}
          trailingVisual={isExpanded ? ChevronUpIcon : ChevronDownIcon}
        >
          {isExpanded ? 'Show less' : 'Show impact by mode'}
        </Button>
      </div>
    </div>
  );
}
