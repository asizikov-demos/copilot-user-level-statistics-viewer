'use client';

import { Chart } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { chartColors } from './utils/chartColors';
import {
  createAdoptionTrendChartConfig,
  createAdoptionTrendSummaryStats,
  getAdoptionTrendMetrics,
} from './utils/adoptionTrendChart';
import type { AutoModeAdoptionTrendEntry } from '../../types/metrics';
import ChartContainer from '../ui/ChartContainer';
import InsightsCard from '../ui/InsightsCard';

registerChartJS();

interface AutoModeAdoptionTrendChartProps {
  data: AutoModeAdoptionTrendEntry[];
}

export default function AutoModeAdoptionTrendChart({ data }: AutoModeAdoptionTrendChartProps) {
  const metrics = getAdoptionTrendMetrics(data, { useActiveDaysForAverages: true });
  const { chartData, options } = createAdoptionTrendChartConfig({
    data,
    yAxisLabel: 'Daily Active Auto Users',
    y1AxisLabel: 'Cumulative Auto Users',
    yStepSize: 1,
    datasetLabels: {
      newUsers: 'New Auto Users',
      returningUsers: 'Returning Auto Users',
      cumulativeUsers: 'Cumulative Auto Users',
    },
    newUsersBarColor: { background: chartColors.violet.alpha60, border: chartColors.violet.solid },
  });

  const insightVariant = metrics.avgRetention >= 50 ? 'green' : metrics.cumulativeTotal > 0 ? 'blue' : 'orange';

  return (
    <ChartContainer
      title="Auto Mode Adoption Trend"
      description="New vs returning users choosing Copilot Auto mode per day, with cumulative growth and retention rate."
      isEmpty={data.length === 0 || metrics.cumulativeTotal === 0}
      emptyState="No Auto mode adoption data available"
      summaryStats={createAdoptionTrendSummaryStats(metrics, {
        totalUsersLabel: 'Total Auto Users',
        newUsersColorClass: 'text-violet-600',
      })}
      footer={metrics.cumulativeTotal > 0 ? (
        <InsightsCard title="Auto Mode Adoption" variant={insightVariant}>
          Auto mode reached {metrics.cumulativeTotal.toLocaleString()} unique users in this reporting window, with a peak of {metrics.peakUsers.toLocaleString()} active users on a single day.
          {metrics.avgRetention > 0 && ` Average retention across active Auto days is ${metrics.avgRetention}%.`}
        </InsightsCard>
      ) : undefined}
    >
      <div className="h-full">
        <Chart type="bar" data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
}
