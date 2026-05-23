'use client';

import { Chart } from 'react-chartjs-2';
import { useMemo } from 'react';
import { registerChartJS } from './utils/chartSetup';
import {
  createAdoptionTrendChartConfig,
  createAdoptionTrendSummaryStats,
  getAdoptionTrendMetrics,
  padAdoptionTrendData,
} from './utils/adoptionTrendChart';
import type { DailyAdoptionTrend } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface AdoptionTrendChartProps {
  data: DailyAdoptionTrend[];
  reportStartDay: string;
  reportEndDay: string;
}

export default function AdoptionTrendChart({ data, reportStartDay, reportEndDay }: AdoptionTrendChartProps) {
  const metrics = getAdoptionTrendMetrics(data);
  const paddedData = useMemo(
    () => padAdoptionTrendData(data, reportStartDay, reportEndDay),
    [data, reportStartDay, reportEndDay]
  );
  const { chartData, options } = createAdoptionTrendChartConfig({
    data: paddedData,
    yAxisLabel: 'Daily Active Users',
    y1AxisLabel: 'Cumulative Users',
  });

  return (
    <ChartContainer
      title="User Adoption Trend"
      description="New vs returning users per day across all surfaces, with cumulative growth and retention rate."
      isEmpty={data.length === 0}
      emptyState="No adoption data available"
      summaryStats={createAdoptionTrendSummaryStats(metrics, { totalUsersLabel: 'Total Users' })}
    >
      <div className="h-full">
        <Chart type="bar" data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
}
