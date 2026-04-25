'use client';

import type { TooltipItem } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createDualAxisChartOptions } from './utils/chartOptions';
import { chartColors } from './utils/chartColors';
import { computeAverageRetention, computeRetentionRates } from './utils/chartStyles';
import { formatShortDate } from '../../utils/formatters';
import type { AutoModeAdoptionTrendEntry } from '../../types/metrics';
import ChartContainer from '../ui/ChartContainer';
import InsightsCard from '../ui/InsightsCard';

registerChartJS();

interface AutoModeAdoptionTrendChartProps {
  data: AutoModeAdoptionTrendEntry[];
}

export default function AutoModeAdoptionTrendChart({ data }: AutoModeAdoptionTrendChartProps) {
  const activeData = data.filter(d => d.totalActiveUsers > 0);
  const totalNewUsers = data.reduce((sum, d) => sum + d.newUsers, 0);
  const avgDailyActive = activeData.length > 0
    ? activeData.reduce((sum, d) => sum + d.totalActiveUsers, 0) / activeData.length
    : 0;
  const peakUsers = data.reduce((max, d) => Math.max(max, d.totalActiveUsers), 0);
  const cumulativeTotal = data.length > 0 ? data[data.length - 1].cumulativeUsers : 0;
  const retentionRates = computeRetentionRates(data);
  const avgRetention = computeAverageRetention(activeData);

  const chartData = {
    labels: data.map(d => formatShortDate(d.date)),
    datasets: [
      {
        type: 'bar' as const,
        label: 'New Auto Users',
        data: data.map(d => d.newUsers),
        backgroundColor: chartColors.violet.alpha60,
        borderColor: chartColors.violet.solid,
        borderWidth: 1,
        yAxisID: 'y',
        stack: 'users',
      },
      {
        type: 'bar' as const,
        label: 'Returning Auto Users',
        data: data.map(d => d.returningUsers),
        backgroundColor: chartColors.green.alpha60,
        borderColor: chartColors.green.solid,
        borderWidth: 1,
        yAxisID: 'y',
        stack: 'users',
      },
      {
        type: 'line' as const,
        label: 'Cumulative Auto Users',
        data: data.map(d => d.cumulativeUsers),
        backgroundColor: chartColors.purple.alpha,
        borderColor: chartColors.purple.solid,
        borderWidth: 3,
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        yAxisID: 'y1',
      },
      {
        type: 'line' as const,
        label: 'Retention Rate',
        data: retentionRates,
        backgroundColor: chartColors.amber.alpha,
        borderColor: chartColors.amber.solid,
        borderWidth: 2,
        borderDash: [5, 3],
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
        spanGaps: true,
        yAxisID: 'y2',
      },
    ],
  };

  const options = {
    ...createDualAxisChartOptions({
      xAxisLabel: 'Date',
      yAxisLabel: 'Daily Active Auto Users',
      y1AxisLabel: 'Cumulative Auto Users',
      tooltipAfterBodyCallback: (context: TooltipItem<'line' | 'bar'>[]) => {
        const dataIndex = context[0].dataIndex;
        const day = data[dataIndex];
        const retention = retentionRates[dataIndex];
        return [
          '',
          `Total Active: ${day.totalActiveUsers}`,
          `New: ${day.newUsers}`,
          `Returning: ${day.returningUsers}`,
          `Cumulative: ${day.cumulativeUsers}`,
          `Retention: ${retention !== null ? `${retention}%` : 'N/A'}`,
        ];
      },
    }),
    scales: {
      x: {
        stacked: true,
        display: true,
        title: { display: true, text: 'Date' },
        ticks: { maxRotation: 45, autoSkip: true },
      },
      y: {
        stacked: true,
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: 'Daily Active Auto Users' },
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: { display: true, text: 'Cumulative Auto Users' },
        beginAtZero: true,
        grid: { drawOnChartArea: false },
      },
      y2: {
        type: 'linear' as const,
        display: false,
        min: 0,
        max: 100,
      },
    },
  };

  const insightVariant = avgRetention >= 50 ? 'green' : cumulativeTotal > 0 ? 'blue' : 'orange';

  return (
    <ChartContainer
      title="Auto Mode Adoption Trend"
      description="New vs returning users choosing Copilot Auto mode per day, with cumulative growth and retention rate."
      isEmpty={data.length === 0 || cumulativeTotal === 0}
      emptyState="No Auto mode adoption data available"
      summaryStats={[
        { value: cumulativeTotal, label: 'Total Auto Users', colorClass: 'text-purple-600' },
        { value: totalNewUsers, label: 'New Users (period)', colorClass: 'text-violet-600' },
        { value: avgDailyActive.toFixed(1), label: 'Avg Daily Active', colorClass: 'text-green-600' },
        { value: peakUsers, label: 'Peak Daily Users', colorClass: 'text-indigo-600' },
        { value: `${avgRetention}%`, label: 'Avg Retention', colorClass: 'text-amber-600' },
      ]}
      footer={cumulativeTotal > 0 ? (
        <InsightsCard title="Auto Mode Adoption" variant={insightVariant}>
          Auto mode reached {cumulativeTotal.toLocaleString()} unique users in this reporting window, with a peak of {peakUsers.toLocaleString()} active users on a single day.
          {avgRetention > 0 && ` Average retention across active Auto days is ${avgRetention}%.`}
        </InsightsCard>
      ) : undefined}
    >
      <div className="h-full">
        <Chart type="bar" data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
}
