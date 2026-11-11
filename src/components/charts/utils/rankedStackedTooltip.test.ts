import type { Chart, TooltipItem } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { createRankedStackedTooltip, truncateMiddle } from './rankedStackedTooltip';

const chart = {
  data: {
    datasets: [
      { label: 'a', data: [5] },
      { label: 'b', data: [0] },
      { label: 'c', data: [20] },
      { label: 'd', data: [1] },
    ],
  },
} as unknown as Chart;

const item = (datasetIndex: number) => ({
  chart,
  dataIndex: 0,
  datasetIndex,
  dataset: chart.data.datasets[datasetIndex],
  parsed: { y: chart.data.datasets[datasetIndex].data[0] },
}) as unknown as TooltipItem<'bar'>;

describe('createRankedStackedTooltip', () => {
  it('hides zero values and limits to the top series, summarizing the rest', () => {
    const tooltip = createRankedStackedTooltip({ maxItems: 2, itemNoun: 'models' });
    expect([0, 1, 2, 3].filter(i => tooltip.filter(item(i)))).toEqual([0, 2]);
    expect(tooltip.callbacks.footer([item(2)])).toEqual(['+ 1 more models (1)', 'Total: 26 interactions']);
    expect(tooltip.callbacks.label(item(2))).toBe('c: 20 (77%)');
  });

  it('truncates long labels in the middle', () => {
    expect(truncateMiddle('abcdefghijklmnop', 8)).toBe('abcd…nop');
  });
});
