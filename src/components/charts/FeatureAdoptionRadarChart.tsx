'use client';

import { Radar } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import { registerChartJS } from './utils/chartSetup';
import { createRadarChartOptions } from './utils/chartOptions';
import { createRadarDataset } from './utils/chartStyles';
import { chartColors } from './utils/chartColors';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface FeatureAdoptionRadarChartProps {
  agentInteractions: number;
  planInteractions: number;
  cliInteractions: number;
  askModeInteractions: number;
  editModeInteractions: number;
  completionInteractions: number;
}

export default function FeatureAdoptionRadarChart({
  agentInteractions,
  planInteractions,
  cliInteractions,
  askModeInteractions,
  editModeInteractions,
  completionInteractions,
}: FeatureAdoptionRadarChartProps) {
  const chartData = {
    labels: ['Agent Mode', 'Plan Mode', 'CLI', 'Ask Mode', 'Edit Mode', 'Completions'],
    datasets: [
      createRadarDataset(
        chartColors.indigo.solid,
        'Interactions',
        [agentInteractions, planInteractions, cliInteractions, askModeInteractions, editModeInteractions, completionInteractions]
      ),
    ],
  };

  const options = createRadarChartOptions({
    tooltipLabelCallback: (context: TooltipItem<'radar'>) => {
      const unit = context.label === 'Completions' ? 'acceptances' : 'interactions';
      return `${context.label}: ${context.parsed.r.toLocaleString()} ${unit}`;
    },
  });

  const total = agentInteractions + planInteractions + cliInteractions + askModeInteractions + editModeInteractions + completionInteractions;

  return (
    <ChartContainer
      title="Feature Adoption"
      isEmpty={total === 0}
      emptyState="No feature adoption data available"
      className="h-full flex flex-col"
      chartHeight="flex-1 min-h-0"
      footer={
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-gray-600">
          <span>Agent: <strong>{agentInteractions.toLocaleString()}</strong></span>
          <span>Plan: <strong>{planInteractions.toLocaleString()}</strong></span>
          <span>CLI: <strong>{cliInteractions.toLocaleString()}</strong></span>
          <span>Ask: <strong>{askModeInteractions.toLocaleString()}</strong></span>
          <span>Edit: <strong>{editModeInteractions.toLocaleString()}</strong></span>
          <span>Completions: <strong>{completionInteractions.toLocaleString()}</strong></span>
        </div>
      }
    >
      <Radar data={chartData} options={options} />
    </ChartContainer>
  );
}
