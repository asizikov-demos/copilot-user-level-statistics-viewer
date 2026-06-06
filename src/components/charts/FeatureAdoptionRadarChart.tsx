'use client';

import { Radar } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import { registerChartJS } from './utils/chartSetup';
import { createRadarChartOptions } from './utils/chartOptions';
import { createRadarDataset } from './utils/chartStyles';
import { chartColors } from './utils/chartColors';
import ChartContainer from '../ui/ChartContainer';
import { FEATURE_ADOPTION_RADAR_METADATA } from '../../domain/featureCategories';

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
  const radarValues = {
    agentInteractions,
    planInteractions,
    cliInteractions,
    askModeInteractions,
    editModeInteractions,
    completionInteractions,
  } as const;

  const radarItems = FEATURE_ADOPTION_RADAR_METADATA.map((item) => ({
    ...item,
    value: radarValues[item.key],
  }));

  const chartData = {
    labels: radarItems.map((item) => item.label),
    datasets: [
      createRadarDataset(
        chartColors.indigo.solid,
        'Interactions',
        radarItems.map((item) => item.value)
      ),
    ],
  };

  const options = createRadarChartOptions({
    tooltipLabelCallback: (context: TooltipItem<'radar'>) => {
      const unit = radarItems[context.dataIndex]?.unit || 'interactions';
      return `${context.label}: ${context.parsed.r.toLocaleString()} ${unit}`;
    },
  });

  const total = radarItems.reduce((sum, item) => sum + item.value, 0);

  return (
    <ChartContainer
      title="Feature Adoption"
      isEmpty={total === 0}
      emptyState="No feature adoption data available"
      className="h-full flex flex-col"
      chartHeight="flex-1 min-h-0"
      footer={
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-gray-600">
          {radarItems.map((item) => (
            <span key={item.key}>{item.summaryLabel}: <strong>{item.value.toLocaleString()}</strong></span>
          ))}
        </div>
      }
    >
      <Radar data={chartData} options={options} />
    </ChartContainer>
  );
}
