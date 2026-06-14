import { describe, it, expect } from 'vitest';
import {
  createAdoptionTrendChartConfig,
  createAdoptionTrendSummaryStats,
  getAdoptionTrendMetrics,
  padAdoptionTrendData,
} from './adoptionTrendChart';

describe('padAdoptionTrendData', () => {
  it('fills missing days with zeros and carries forward cumulative users', () => {
    const padded = padAdoptionTrendData(
      [
        { date: '2024-01-01', newUsers: 2, returningUsers: 0, totalActiveUsers: 2, cumulativeUsers: 2 },
        { date: '2024-01-03', newUsers: 1, returningUsers: 1, totalActiveUsers: 2, cumulativeUsers: 3 },
      ],
      '2024-01-01',
      '2024-01-03'
    );

    expect(padded).toEqual([
      { date: '2024-01-01', newUsers: 2, returningUsers: 0, totalActiveUsers: 2, cumulativeUsers: 2 },
      { date: '2024-01-02', newUsers: 0, returningUsers: 0, totalActiveUsers: 0, cumulativeUsers: 2 },
      { date: '2024-01-03', newUsers: 1, returningUsers: 1, totalActiveUsers: 2, cumulativeUsers: 3 },
    ]);
  });
});

describe('getAdoptionTrendMetrics', () => {
  const data = [
    { date: '2024-01-01', newUsers: 3, returningUsers: 1, totalActiveUsers: 4, cumulativeUsers: 3 },
    { date: '2024-01-02', newUsers: 0, returningUsers: 0, totalActiveUsers: 0, cumulativeUsers: 3 },
    { date: '2024-01-03', newUsers: 1, returningUsers: 3, totalActiveUsers: 4, cumulativeUsers: 4 },
  ];

  it('computes metrics using all days by default', () => {
    expect(getAdoptionTrendMetrics(data)).toEqual({
      totalNewUsers: 4,
      avgDailyActive: 8 / 3,
      peakUsers: 4,
      cumulativeTotal: 4,
      avgRetention: 50,
    });
  });

  it('computes averages using active days only when configured', () => {
    expect(getAdoptionTrendMetrics(data, { useActiveDaysForAverages: true })).toEqual({
      totalNewUsers: 4,
      avgDailyActive: 4,
      peakUsers: 4,
      cumulativeTotal: 4,
      avgRetention: 50,
    });
  });
});

describe('createAdoptionTrendChartConfig', () => {
  it('builds the shared datasets and tooltip body', () => {
    const data = [
      { date: '2024-01-01', newUsers: 2, returningUsers: 1, totalActiveUsers: 3, cumulativeUsers: 2 },
      { date: '2024-01-02', newUsers: 0, returningUsers: 0, totalActiveUsers: 0, cumulativeUsers: 2 },
    ];

    const { chartData, options, retentionRates } = createAdoptionTrendChartConfig({
      data,
      yAxisLabel: 'Daily Active Users',
      y1AxisLabel: 'Cumulative Users',
      datasetLabels: { newUsers: 'New Auto Users' },
    });

    expect(chartData.datasets).toHaveLength(4);
    expect(chartData.datasets[0].label).toBe('New Auto Users');
    expect(chartData.datasets[2]).toMatchObject({
      label: 'Cumulative Users',
      type: 'line',
      borderDash: [5, 3],
      yAxisID: 'y1',
    });
    expect(chartData.datasets[3]).toMatchObject({
      label: 'Retention Rate',
      type: 'line',
      borderDash: [5, 3],
      yAxisID: 'y2',
    });
    expect(retentionRates).toEqual([33.3, null]);

    const tooltipLines = options.plugins.tooltip.callbacks.afterBody([{ dataIndex: 1 }]);
    expect(tooltipLines).toEqual([
      '',
      'Total Active: 0',
      'New: 0',
      'Returning: 0',
      'Cumulative: 2',
      'Retention: N/A',
    ]);
  });
});

describe('padAdoptionTrendData for CLI report range', () => {
  it('includes inactive report days in display series while raw metrics are unaffected by padding', () => {
    const rawData = [
      { date: '2024-01-01', newUsers: 2, returningUsers: 0, totalActiveUsers: 2, cumulativeUsers: 2 },
      { date: '2024-01-03', newUsers: 1, returningUsers: 1, totalActiveUsers: 2, cumulativeUsers: 3 },
    ];

    const paddedData = padAdoptionTrendData(rawData, '2024-01-01', '2024-01-03');

    // Display series includes the inactive day
    expect(paddedData).toHaveLength(3);
    expect(paddedData[1]).toEqual({
      date: '2024-01-02',
      newUsers: 0,
      returningUsers: 0,
      totalActiveUsers: 0,
      cumulativeUsers: 2,
    });

    // Summary metrics computed from raw data are not diluted by padded zeros
    const metricsFromRaw = getAdoptionTrendMetrics(rawData);
    const metricsFromPadded = getAdoptionTrendMetrics(paddedData);

    expect(metricsFromRaw.totalNewUsers).toBe(3);
    expect(metricsFromRaw.avgDailyActive).toBe(2);
    // Padded version includes the zero-filled day so avgDailyActive is lower
    expect(metricsFromPadded.avgDailyActive).toBeCloseTo(4 / 3, 5);
    // totalNewUsers and cumulativeTotal are unaffected since zeros don't add users
    expect(metricsFromRaw.totalNewUsers).toBe(metricsFromPadded.totalNewUsers);
    expect(metricsFromRaw.cumulativeTotal).toBe(metricsFromPadded.cumulativeTotal);
  });
});

describe('createAdoptionTrendSummaryStats', () => {
  it('returns consistent summary stat wiring', () => {
    const summary = createAdoptionTrendSummaryStats(
      {
        totalNewUsers: 5,
        avgDailyActive: 2.5,
        peakUsers: 4,
        cumulativeTotal: 8,
        avgRetention: 62.5,
      },
      { totalUsersLabel: 'Total Auto Users', newUsersColorClass: 'text-violet-600' }
    );

    expect(summary).toEqual([
      { value: 8, label: 'Total Auto Users', colorClass: 'text-purple-600' },
      { value: 5, label: 'New Users (period)', colorClass: 'text-violet-600' },
      { value: '2.5', label: 'Avg Daily Active', colorClass: 'text-green-600' },
      { value: 4, label: 'Peak Daily Users', colorClass: 'text-indigo-600' },
      { value: '62.5%', label: 'Avg Retention', colorClass: 'text-amber-600' },
    ]);
  });
});
