import type { TooltipItem } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { createDistributionBarChartConfig } from './distributionBarChart';

const tooltipFor = (dataIndex: number) => ({ dataIndex }) as TooltipItem<'bar'>;

describe('createDistributionBarChartConfig', () => {
  const entries = [
    { label: 'VS Code', value: 3000, color: 'rgb(0, 0, 1)' },
    { label: 'JetBrains', value: 1000, color: 'rgb(0, 0, 2)', unit: 'seats' },
  ];

  it('builds a single horizontal bar dataset with per-category colors', () => {
    const { chartData, options } = createDistributionBarChartConfig({ entries, datasetLabel: 'Users', unit: 'users' });

    expect(chartData.labels).toEqual(['VS Code', 'JetBrains']);
    expect(chartData.datasets).toHaveLength(1);
    expect(chartData.datasets[0]).toMatchObject({
      label: 'Users',
      data: [3000, 1000],
      backgroundColor: ['rgb(0, 0, 1)', 'rgb(0, 0, 2)'],
      borderColor: ['rgb(0, 0, 1)', 'rgb(0, 0, 2)'],
    });
    expect(options.indexAxis).toBe('y');
    expect(options.plugins.legend.display).toBe(false);
  });

  it('labels tooltips with the value, unit and share of the total', () => {
    const { options } = createDistributionBarChartConfig({ entries, datasetLabel: 'Users', unit: 'users' });
    const label = options.plugins.tooltip.callbacks.label;

    expect(label?.(tooltipFor(0))).toBe(`${(3000).toLocaleString()} users (75.0%)`);
    expect(label?.(tooltipFor(1))).toBe(`${(1000).toLocaleString()} seats (25.0%)`);
  });

  it('omits the share when disabled and handles an all-zero total', () => {
    const zeroEntries = [{ label: 'A', value: 0, color: 'red' }];
    const withoutShare = createDistributionBarChartConfig({ entries, datasetLabel: 'X', unit: 'items', showShare: false });
    const zeroTotal = createDistributionBarChartConfig({ entries: zeroEntries, datasetLabel: 'X', unit: 'items' });

    expect(withoutShare.options.plugins.tooltip.callbacks.label?.(tooltipFor(0))).toBe(`${(3000).toLocaleString()} items`);
    expect(zeroTotal.options.plugins.tooltip.callbacks.label?.(tooltipFor(0))).toBe('0 items (0.0%)');
  });
});
