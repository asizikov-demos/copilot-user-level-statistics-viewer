import type { Chart, TooltipItem } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { createRankedStackedTooltip, truncateMiddle } from './rankedStackedTooltip';

const hiddenIndexes = new Set<number>();

const chart = {
  isDatasetVisible: (index: number) => !hiddenIndexes.has(index),
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
    expect([0, 1, 2, 3].map(item).filter(tooltip.filter).map(row => row.datasetIndex)).toEqual([0, 2]);
    expect(tooltip.callbacks.footer([item(2)])).toEqual(['+ 1 more models (1)', 'Total: 26 interactions']);
    expect(tooltip.callbacks.label(item(2))).toBe('c: 20 (77%)');
  });

  it('ignores legend-hidden series when ranking and totaling', () => {
    hiddenIndexes.add(2);
    try {
      const tooltip = createRankedStackedTooltip({ maxItems: 1 });
      expect([0, 1, 2, 3].map(item).filter(tooltip.filter).map(row => row.datasetIndex)).toEqual([0]);
      expect(tooltip.callbacks.label(item(0))).toBe('a: 5 (83%)');
      expect(tooltip.callbacks.footer([item(0)])).toEqual(['+ 1 more series (1)', 'Total: 6 interactions']);
    } finally {
      hiddenIndexes.clear();
    }
  });

  it('computes the ranking once across filter, label and footer, and invalidates on change', () => {
    const reads = { count: 0 };
    const datasets = [
      { label: 'a', data: [5] },
      { label: 'c', data: [20] },
    ];
    const counting = {
      isDatasetVisible: (index: number) => {
        reads.count++;
        return !hiddenIndexes.has(index);
      },
      data: { datasets },
    } as unknown as Chart;
    const countItem = (datasetIndex: number) =>
      ({
        chart: counting,
        dataIndex: 0,
        datasetIndex,
        dataset: datasets[datasetIndex],
        parsed: { y: datasets[datasetIndex].data[0] },
      }) as unknown as TooltipItem<'bar'>;
    const tooltip = createRankedStackedTooltip();
    const run = () => {
      [countItem(0), countItem(1)].filter(tooltip.filter);
      tooltip.callbacks.label(countItem(0));
      return tooltip.callbacks.footer([countItem(0)]);
    };

    run();
    expect(reads.count).toBe(datasets.length);

    hiddenIndexes.add(1);
    try {
      expect(run()).toEqual(['Total: 5 interactions']);
    } finally {
      hiddenIndexes.clear();
    }

    datasets[0] = { label: 'a', data: [7] };
    expect(run()).toEqual(['Total: 27 interactions']);
  });

  it('refreshes ranking, totals and shares after an in-place value update', () => {
    const datasets = [
      { label: 'a', data: [5] },
      { label: 'b', data: [20] },
    ];
    const mutableChart = {
      data: { datasets },
      isDatasetVisible: () => true,
    } as unknown as Chart;
    const tooltip = createRankedStackedTooltip({ maxItems: 1 });
    const update = () => datasets.map((dataset, datasetIndex) => ({
      chart: mutableChart,
      dataset,
      datasetIndex,
      dataIndex: 0,
      parsed: { y: dataset.data[0] },
    }) as TooltipItem<'bar'>).filter(tooltip.filter);

    const before = update();
    expect(before.map(row => row.datasetIndex)).toEqual([1]);
    expect(tooltip.callbacks.label(before[0])).toBe('b: 20 (80%)');
    expect(tooltip.callbacks.footer(before)).toEqual(['+ 1 more series (5)', 'Total: 25 interactions']);

    datasets[0].data[0] = 50;
    const after = update();
    expect(after.map(row => row.datasetIndex)).toEqual([0]);
    expect(tooltip.callbacks.label(after[0])).toBe('a: 50 (71%)');
    expect(tooltip.callbacks.footer(after)).toEqual(['+ 1 more series (20)', 'Total: 70 interactions']);
  });

  it('truncates long labels in the middle', () => {
    expect(truncateMiddle('abcdefghijklmnop', 8)).toBe('abcd…nop');
  });
});
