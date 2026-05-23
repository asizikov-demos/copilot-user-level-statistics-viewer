'use client';

import type { TooltipItem } from 'chart.js';
import { createDualAxisChartOptions } from './chartOptions';
import { formatShortDate, generateDateRange } from '../../../utils/formatters';
import { padSeriesWithCarryForward } from '../../../utils/timeSeries';
import { createBarDataset, createLineDataset, computeAverageRetention, computeRetentionRates } from './chartStyles';
import { chartColors } from './chartColors';
import type { SummaryStatItem } from '../../ui/ChartContainer';

export interface AdoptionTrendPoint {
  date: string;
  newUsers: number;
  returningUsers: number;
  totalActiveUsers: number;
  cumulativeUsers: number;
}

interface AdoptionTrendDatasetLabels {
  newUsers: string;
  returningUsers: string;
  cumulativeUsers: string;
  retentionRate: string;
}

interface AdoptionTrendChartConfig {
  data: AdoptionTrendPoint[];
  yAxisLabel: string;
  y1AxisLabel: string;
  newUsersBarColor?: { background: string; border: string };
  datasetLabels?: Partial<AdoptionTrendDatasetLabels>;
  yStepSize?: number;
}

interface AdoptionTrendMetricConfig {
  useActiveDaysForAverages?: boolean;
}

interface AdoptionTrendSummaryConfig {
  totalUsersLabel: string;
  newUsersColorClass?: string;
}

interface AdoptionTrendMetrics {
  totalNewUsers: number;
  avgDailyActive: number;
  peakUsers: number;
  cumulativeTotal: number;
  avgRetention: number;
}

const defaultDatasetLabels: AdoptionTrendDatasetLabels = {
  newUsers: 'New Users',
  returningUsers: 'Returning Users',
  cumulativeUsers: 'Cumulative Users',
  retentionRate: 'Retention Rate',
};

export function getAdoptionTrendMetrics(
  data: AdoptionTrendPoint[],
  config: AdoptionTrendMetricConfig = {}
): AdoptionTrendMetrics {
  const { useActiveDaysForAverages = false } = config;
  const avgSourceData = useActiveDaysForAverages ? data.filter(d => d.totalActiveUsers > 0) : data;

  const totalNewUsers = data.reduce((sum, d) => sum + d.newUsers, 0);
  const avgDailyActive = avgSourceData.length > 0
    ? avgSourceData.reduce((sum, d) => sum + d.totalActiveUsers, 0) / avgSourceData.length
    : 0;
  const peakUsers = data.reduce((max, d) => Math.max(max, d.totalActiveUsers), 0);
  const cumulativeTotal = data.length > 0 ? data[data.length - 1].cumulativeUsers : 0;
  const avgRetention = computeAverageRetention(avgSourceData);

  return { totalNewUsers, avgDailyActive, peakUsers, cumulativeTotal, avgRetention };
}

export function createAdoptionTrendSummaryStats(
  metrics: AdoptionTrendMetrics,
  config: AdoptionTrendSummaryConfig
): SummaryStatItem[] {
  const { totalUsersLabel, newUsersColorClass = 'text-blue-600' } = config;

  return [
    { value: metrics.cumulativeTotal, label: totalUsersLabel, colorClass: 'text-purple-600' },
    { value: metrics.totalNewUsers, label: 'New Users (period)', colorClass: newUsersColorClass },
    { value: metrics.avgDailyActive.toFixed(1), label: 'Avg Daily Active', colorClass: 'text-green-600' },
    { value: metrics.peakUsers, label: 'Peak Daily Users', colorClass: 'text-indigo-600' },
    { value: `${metrics.avgRetention}%`, label: 'Avg Retention', colorClass: 'text-amber-600' },
  ];
}

export function padAdoptionTrendData(
  data: AdoptionTrendPoint[],
  reportStartDay: string,
  reportEndDay: string
): AdoptionTrendPoint[] {
  const allDays = generateDateRange(reportStartDay, reportEndDay);
  const dataMap = new Map(data.map(d => [d.date, d]));

  return padSeriesWithCarryForward(
    allDays,
    dataMap,
    0,
    (entry) => entry.cumulativeUsers,
    (date, lastCumulative) => ({
      date,
      newUsers: 0,
      returningUsers: 0,
      totalActiveUsers: 0,
      cumulativeUsers: lastCumulative,
    })
  );
}

export function createAdoptionTrendChartConfig(config: AdoptionTrendChartConfig) {
  const {
    data,
    yAxisLabel,
    y1AxisLabel,
    yStepSize,
    datasetLabels: labelOverrides,
    newUsersBarColor = { background: chartColors.blue.alpha60, border: chartColors.blue.solid },
  } = config;

  const labels = { ...defaultDatasetLabels, ...labelOverrides };
  const retentionRates = computeRetentionRates(data);

  const chartData = {
    labels: data.map(d => formatShortDate(d.date)),
    datasets: [
      createBarDataset(
        newUsersBarColor.background,
        labels.newUsers,
        data.map(d => d.newUsers),
        {
          type: 'bar',
          borderColor: newUsersBarColor.border,
          yAxisID: 'y',
          stack: 'users',
        }
      ),
      createBarDataset(
        chartColors.green.alpha60,
        labels.returningUsers,
        data.map(d => d.returningUsers),
        {
          type: 'bar',
          borderColor: chartColors.green.solid,
          yAxisID: 'y',
          stack: 'users',
        }
      ),
      createLineDataset(
        chartColors.purple.solid,
        labels.cumulativeUsers,
        data.map(d => d.cumulativeUsers),
        {
          type: 'line',
          borderWidth: 3,
          borderDash: [5, 3],
          fill: false,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          backgroundColor: chartColors.purple.alpha,
          pointBackgroundColor: chartColors.purple.solid,
          yAxisID: 'y1',
        }
      ),
      createLineDataset(chartColors.amber.solid, labels.retentionRate, retentionRates, {
        type: 'line',
        borderWidth: 2,
        borderDash: [5, 3],
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
        spanGaps: true,
        backgroundColor: chartColors.amber.alpha,
        pointBackgroundColor: chartColors.amber.solid,
        yAxisID: 'y2',
      }),
    ],
  };

  const options = {
    ...createDualAxisChartOptions({
      xAxisLabel: 'Date',
      yAxisLabel,
      y1AxisLabel,
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
        title: { display: true, text: yAxisLabel },
        beginAtZero: true,
        ...(yStepSize !== undefined ? { ticks: { stepSize: yStepSize } } : {}),
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: { display: true, text: y1AxisLabel },
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

  return { chartData, options, retentionRates };
}
