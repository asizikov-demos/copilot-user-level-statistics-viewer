'use client';

import type { TooltipItem } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createDualAxisChartOptions } from './utils/chartOptions';
import { formatShortDate } from '../../utils/formatters';
import { calculateTotal, calculateAverage, findMaxValue } from '../../domain/calculators/statsCalculators';
import { chartColors } from './utils/chartColors';
import { computeRetentionRates, computeAverageRetention } from './utils/chartStyles';
import type { DailyCliAdoptionTrend } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface CLIAdoptionTrendChartProps {
  data: DailyCliAdoptionTrend[];
}

export default function CLIAdoptionTrendChart({ data }: CLIAdoptionTrendChartProps) {
  const totalNewUsers = calculateTotal(data, d => d.newUsers);
  const avgDailyActive = calculateAverage(data, d => d.totalActiveUsers);
  const peakUsers = findMaxValue(data, d => d.totalActiveUsers);
  const cumulativeTotal = data.length > 0 ? data[data.length - 1].cumulativeUsers : 0;

  const retentionRates = computeRetentionRates(data);
  const avgRetention = computeAverageRetention(retentionRates);

  const chartData = {
    labels: data.map(d => formatShortDate(d.date)),
    datasets: [
      {
        type: 'bar' as const,
        label: 'New Users',
        data: data.map(d => d.newUsers),
        backgroundColor: chartColors.blue.alpha60,
        borderColor: chartColors.blue.solid,
        borderWidth: 1,
        yAxisID: 'y',
        stack: 'users',
      },
      {
        type: 'bar' as const,
        label: 'Returning Users',
        data: data.map(d => d.returningUsers),
        backgroundColor: chartColors.green.alpha60,
        borderColor: chartColors.green.solid,
        borderWidth: 1,
        yAxisID: 'y',
        stack: 'users',
      },
      {
        type: 'line' as const,
        label: 'Cumulative Users',
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
      yAxisLabel: 'Daily Active Users',
      y1AxisLabel: 'Cumulative Users',
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
        title: { display: true, text: 'Daily Active Users' },
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: { display: true, text: 'Cumulative Users' },
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

  return (
    <ChartContainer
      title="CLI Adoption Trend"
      description="New vs returning CLI users per day, with cumulative growth and retention rate."
      isEmpty={data.length === 0}
      emptyState="No CLI adoption data available"
      summaryStats={[
        { value: cumulativeTotal, label: 'Total CLI Users', colorClass: 'text-purple-600' },
        { value: totalNewUsers, label: 'New Users (period)', colorClass: 'text-blue-600' },
        { value: avgDailyActive.toFixed(1), label: 'Avg Daily Active', colorClass: 'text-green-600' },
        { value: peakUsers, label: 'Peak Daily Users', colorClass: 'text-indigo-600' },
        { value: `${avgRetention}%`, label: 'Avg Retention', colorClass: 'text-amber-600' },
      ]}
    >
      <div className="h-full">
        <Chart type="bar" data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
}
