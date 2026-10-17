'use client';

import { Bar } from 'react-chartjs-2';
import { registerChartJS } from '../../../charts/utils/chartSetup';
import { createDistributionBarChartConfig } from '../../../charts/utils/distributionBarChart';
import { chartColors } from '../../../charts/utils/chartColors';
import ChartContainer from '../../../ui/ChartContainer';
import { FEATURE_ADOPTION_RADAR_METADATA } from '../../../../domain/featureCategories';

registerChartJS();

interface UserFeatureAdoptionChartProps {
  agentInteractions: number;
  planInteractions: number;
  cliInteractions: number;
  askModeInteractions: number;
  editModeInteractions: number;
  completionInteractions: number;
}

export default function UserFeatureAdoptionChart({
  agentInteractions,
  planInteractions,
  cliInteractions,
  askModeInteractions,
  editModeInteractions,
  completionInteractions,
}: UserFeatureAdoptionChartProps) {
  const featureValues = {
    agentInteractions,
    planInteractions,
    cliInteractions,
    askModeInteractions,
    editModeInteractions,
    completionInteractions,
  } as const;

  const featureItems = FEATURE_ADOPTION_RADAR_METADATA.map((item) => ({
    ...item,
    value: featureValues[item.key],
  }));

  const featureColor = chartColors.indigo.solid;
  const { chartData, options } = createDistributionBarChartConfig({
    entries: featureItems.map((item) => ({
      label: item.label,
      value: item.value,
      color: featureColor,
      unit: item.unit,
    })),
    datasetLabel: 'Interactions',
    unit: 'interactions',
    showShare: false,
  });

  const total = featureItems.reduce((sum, item) => sum + item.value, 0);

  return (
    <ChartContainer
      title="Feature Adoption"
      isEmpty={total === 0}
      emptyState="No feature adoption data available"
      className="h-full flex flex-col"
      chartHeight="flex-1 min-h-0"
      footer={
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted">
          {featureItems.map((item) => (
            <span key={item.key}>{item.summaryLabel}: <strong>{item.value.toLocaleString()}</strong></span>
          ))}
        </div>
      }
    >
      <Bar data={chartData} options={options} />
    </ChartContainer>
  );
}
