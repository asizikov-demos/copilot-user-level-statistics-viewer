import { describe, expect, it } from 'vitest';
import { formatShortDate } from '../../../utils/formatters';
import { createDailyBarChartConfig, padDailyReportRangeData } from './dailyBarChart';

describe('padDailyReportRangeData', () => {
  it('fills the report range and supports post-processing for derived fields', () => {
    const padded = padDailyReportRangeData(
      [
        { date: '2024-01-01', activeUsers: 3, passiveUsers: 1 },
        { date: '2024-01-03', activeUsers: 2, passiveUsers: 4 },
      ],
      '2024-01-01',
      '2024-01-03',
      day => day.date,
      date => ({ date, activeUsers: 0, passiveUsers: 0 }),
      day => ({
        ...day,
        totalUsers: Math.max(day.activeUsers, day.passiveUsers),
      }),
    );

    expect(padded).toEqual([
      { date: '2024-01-01', activeUsers: 3, passiveUsers: 1, totalUsers: 3 },
      { date: '2024-01-02', activeUsers: 0, passiveUsers: 0, totalUsers: 0 },
      { date: '2024-01-03', activeUsers: 2, passiveUsers: 4, totalUsers: 4 },
    ]);
  });
});

describe('createDailyBarChartConfig', () => {
  it('builds common date labels, bar datasets, and base options', () => {
    const { chartData, options } = createDailyBarChartConfig({
      data: [
        { date: '2024-01-01', valueA: 5, valueB: 2 },
        { date: '2024-01-02', valueA: 0, valueB: 1 },
      ],
      getDate: day => day.date,
      series: [
        { color: 'rgb(1, 2, 3)', label: 'A', getValue: day => day.valueA },
        {
          color: 'rgb(4, 5, 6)',
          label: 'B',
          getValue: day => day.valueB,
          datasetOptions: { borderColor: 'rgb(7, 8, 9)' },
        },
      ],
      options: {
        xAxisLabel: 'Date',
        yAxisLabel: 'Values',
        showLegend: false,
      },
    });

    expect(chartData.labels).toEqual(['2024-01-01', '2024-01-02'].map(formatShortDate));
    expect(chartData.datasets).toHaveLength(2);
    expect(chartData.datasets[0]).toMatchObject({
      label: 'A',
      data: [5, 0],
      backgroundColor: 'rgb(1, 2, 3)',
      borderColor: 'rgb(1, 2, 3)',
    });
    expect(chartData.datasets[1]).toMatchObject({
      label: 'B',
      data: [2, 1],
      backgroundColor: 'rgb(4, 5, 6)',
      borderColor: 'rgb(7, 8, 9)',
    });
    expect(options.plugins?.legend?.display).toBe(false);
    expect(options.scales?.x?.title).toMatchObject({ display: true, text: 'Date' });
    expect(options.scales?.y?.title).toMatchObject({ display: true, text: 'Values' });
  });
});
