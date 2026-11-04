'use client';

import { Chart } from 'react-chartjs-2';
import { useMemo } from 'react';
import { registerChartJS } from './utils/chartSetup';
import { createAdoptionTrendChartConfig, createAdoptionTrendSummaryStats, getAdoptionTrendMetrics, padAdoptionTrendData } from './utils/adoptionTrendChart';
import { computeCliInsights } from './utils/cliAdoptionInsights';
import type { DailyCliAdoptionTrend } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';
import InsightsCard from '../ui/InsightsCard';
import type { MetricsStats } from '../../types/metrics';

registerChartJS();

interface CLIAdoptionTrendChartProps {
  data: DailyCliAdoptionTrend[];
  stats: MetricsStats;
  client?: 'CLI' | 'Copilot App';
  clientUsers?: number;
}

export default function CLIAdoptionTrendChart({ data, stats, client = 'CLI', clientUsers = stats.cliUsers }: CLIAdoptionTrendChartProps) {
  const metrics = getAdoptionTrendMetrics(data);
  const insights = computeCliInsights(stats, data, { client, clientUsers });
  const paddedData = useMemo(
    () => padAdoptionTrendData(data, stats.reportStartDay, stats.reportEndDay),
    [data, stats.reportStartDay, stats.reportEndDay]
  );
  const { chartData, options } = createAdoptionTrendChartConfig({
    data: paddedData,
    yAxisLabel: 'Daily Active Users',
    y1AxisLabel: 'Cumulative Users',
    yStepSize: 1,
  });

  return (
    <ChartContainer
      title={`${client} Adoption Trend`}
      description={`New vs returning ${client} users per day, with cumulative growth and retention rate.`}
      isEmpty={data.length === 0}
      emptyState={`No ${client} adoption data available`}
      summaryStats={createAdoptionTrendSummaryStats(metrics, { totalUsersLabel: `Total ${client} Users` })}
      footer={
        insights.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, i) => (
              <InsightsCard key={i} title={insight.title} variant={insight.variant}>
                {insight.message}
              </InsightsCard>
            ))}
          </div>
        ) : undefined
      }
    >
      <div className="h-full">
        <Chart type="bar" data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
}
