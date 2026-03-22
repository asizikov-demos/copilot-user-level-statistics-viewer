'use client';

import type { TooltipItem } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { useMemo } from 'react';
import { registerChartJS } from './utils/chartSetup';
import { createDualAxisChartOptions } from './utils/chartOptions';
import { formatShortDate, generateDateRange } from '../../utils/formatters';
import { calculateTotal, calculateAverage, findMaxValue } from '../../domain/calculators/statsCalculators';
import { chartColors } from './utils/chartColors';
import { computeRetentionRates, computeAverageRetention } from './utils/chartStyles';
import type { DailyAdoptionTrend } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface AdoptionTrendChartProps {
  data: DailyAdoptionTrend[];
  reportStartDay: string;
  reportEndDay: string;
}

export default function AdoptionTrendChart({ data, reportStartDay, reportEndDay }: AdoptionTrendChartProps) {
  const totalNewUsers = calculateTotal(data, d => d.newUsers);
  const avgDailyActive = calculateAverage(data, d => d.totalActiveUsers);
  const peakUsers = findMaxValue(data, d => d.totalActiveUsers);
  const cumulativeTotal = data.length > 0 ? data[data.length - 1].cumulativeUsers : 0;

  const avgRetention = computeAverageRetention(data);

  const paddedData = useMemo(() => {
    const allDays = generateDateRange(reportStartDay, reportEndDay);
    const dataMap = new Map(data.map(d => [d.date, d]));
    let lastCumulative = 0;

    return allDays.map(date => {
      const existing = dataMap.get(date);
      if (existing) {
        lastCumulative = existing.cumulativeUsers;
        return existing;
      }
      return {
        date,
        newUsers: 0,
        returningUsers: 0,
        totalActiveUsers: 0,
        cumulativeUsers: lastCumulative,
      };
    });
  }, [data, reportStartDay, reportEndDay]);

  const paddedRetentionRates = computeRetentionRates(paddedData);

  const chartData = {
    labels: paddedData.map(d => formatShortDate(d.date)),
    datasets: [
      {
        type: 'bar' as const,
        label: 'New Users',
        data: paddedData.map(d => d.newUsers),
        backgroundColor: chartColors.blue.alpha60,
        borderColor: chartColors.blue.solid,
        borderWidth: 1,
        yAxisID: 'y',
        stack: 'users',
      },
      {
        type: 'bar' as const,
        label: 'Returning Users',
        data: paddedData.map(d => d.returningUsers),
        backgroundColor: chartColors.green.alpha60,
        borderColor: chartColors.green.solid,
        borderWidth: 1,
        yAxisID: 'y',
        stack: 'users',
      },
      {
        type: 'line' as const,
        label: 'Cumulative Users',
        data: paddedData.map(d => d.cumulativeUsers),
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
        data: paddedRetentionRates,
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
        const day = paddedData[dataIndex];
        const retention = paddedRetentionRates[dataIndex];
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
      title="User Adoption Trend"
      description="New vs returning users per day across all surfaces, with cumulative growth and retention rate."
      isEmpty={data.length === 0}
      emptyState="No adoption data available"
      summaryStats={[
        { value: cumulativeTotal, label: 'Total Users', colorClass: 'text-purple-600' },
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
