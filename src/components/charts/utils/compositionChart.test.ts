import type { TooltipItem } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { chartColors } from './chartColors';
import {
  COMPOSITION_OTHER_LABEL,
  createCompositionChartConfig,
  formatCompositionShare,
  groupCompositionEntries,
  hasCompositionData,
  type CompositionEntry,
} from './compositionChart';

const entry = (label: string, value: number): CompositionEntry => ({ label, value, color: `color-${label}` });

const tooltipFor = (dataIndex: number) => ({ dataIndex }) as TooltipItem<'doughnut'>;

describe('hasCompositionData', () => {
  it('requires at least one positive, finite value', () => {
    expect(hasCompositionData(undefined)).toBe(false);
    expect(hasCompositionData([])).toBe(false);
    expect(hasCompositionData([entry('Zero', 0), entry('NaN', Number.NaN), entry('Negative', -1)])).toBe(false);
    expect(hasCompositionData([entry('Zero', 0), entry('A', 1)])).toBe(true);
  });
});

describe('groupCompositionEntries', () => {
  it('drops non-positive and non-finite values and ranks the rest largest first', () => {
    const group = groupCompositionEntries([
      entry('A', 10),
      entry('Zero', 0),
      entry('B', 30),
      entry('Negative', -5),
      entry('NaN', Number.NaN),
      entry('Infinite', Number.POSITIVE_INFINITY),
      entry('C', 60),
    ]);

    expect(group.total).toBe(100);
    expect(group.slices.map(slice => [slice.label, slice.share])).toEqual([
      ['C', 60],
      ['B', 30],
      ['A', 10],
    ]);
    expect(group.slices.every(slice => !slice.isOther)).toBe(true);
    expect(group.otherEntries).toEqual([]);
  });

  it('keeps input order for equal values', () => {
    const group = groupCompositionEntries([entry('First', 5), entry('Second', 5), entry('Third', 5)]);

    expect(group.slices.map(slice => slice.label)).toEqual(['First', 'Second', 'Third']);
  });

  it('keeps up to five entries without grouping', () => {
    const group = groupCompositionEntries([1, 2, 3, 4, 5].map(value => entry(`E${value}`, value)));

    expect(group.slices).toHaveLength(5);
    expect(group.otherEntries).toEqual([]);
  });

  it('folds the long tail into a gray "Other" slice after the top four', () => {
    const group = groupCompositionEntries([
      entry('F', 4),
      entry('A', 40),
      entry('B', 20),
      entry('G', 2),
      entry('C', 15),
      entry('D', 10),
      entry('E', 9),
    ]);

    expect(group.total).toBe(100);
    expect(group.slices.map(slice => slice.label)).toEqual(['A', 'B', 'C', 'D', COMPOSITION_OTHER_LABEL]);
    expect(group.slices[4]).toEqual({
      label: COMPOSITION_OTHER_LABEL,
      value: 15,
      color: chartColors.gray.solid,
      share: 15,
      isOther: true,
    });
    expect(group.otherEntries.map(slice => [slice.label, slice.value, slice.share])).toEqual([
      ['E', 9, 9],
      ['F', 4, 4],
      ['G', 2, 2],
    ]);
  });

  it('respects a custom slice limit', () => {
    const group = groupCompositionEntries([entry('A', 3), entry('B', 2), entry('C', 1)], 2);

    expect(group.slices.map(slice => [slice.label, slice.value])).toEqual([
      ['A', 3],
      [COMPOSITION_OTHER_LABEL, 3],
    ]);
    expect(group.otherEntries.map(slice => slice.label)).toEqual(['B', 'C']);
  });

  it('returns an empty composition when nothing is positive', () => {
    expect(groupCompositionEntries([entry('A', 0)])).toEqual({ slices: [], otherEntries: [], total: 0 });
  });
});

describe('formatCompositionShare', () => {
  it('formats shares with one decimal', () => {
    expect(formatCompositionShare(12.345)).toBe('12.3%');
    expect(formatCompositionShare(0)).toBe('0.0%');
    expect(formatCompositionShare(100)).toBe('100.0%');
  });

  it('never rounds a partial share to 0% or 100%', () => {
    expect(formatCompositionShare(0.04)).toBe('<0.1%');
    expect(formatCompositionShare(99.97)).toBe('>99.9%');
  });
});

describe('createCompositionChartConfig', () => {
  const group = groupCompositionEntries([
    { label: 'VS Code', value: 3000, color: 'rgb(0, 0, 1)' },
    { label: 'JetBrains', value: 1000, color: 'rgb(0, 0, 2)' },
  ]);

  it('builds one dataset with slice colors separated by the surface color', () => {
    const { chartData, options } = createCompositionChartConfig({
      group,
      unit: 'interactions',
      cutout: 0,
      borderColor: 'rgb(246, 248, 250)',
    });

    expect(chartData.labels).toEqual(['VS Code', 'JetBrains']);
    expect(chartData.datasets).toHaveLength(1);
    expect(chartData.datasets[0]).toMatchObject({
      data: [3000, 1000],
      backgroundColor: ['rgb(0, 0, 1)', 'rgb(0, 0, 2)'],
      borderColor: 'rgb(246, 248, 250)',
      borderWidth: 2,
    });
    expect(options.cutout).toBe(0);
    expect(options.plugins.legend.display).toBe(false);
  });

  it('titles tooltips with the slice name and labels them with the value, unit and share', () => {
    const { options } = createCompositionChartConfig({ group, unit: 'interactions', cutout: '60%', borderColor: 'white' });
    const { title, label } = options.plugins.tooltip.callbacks;

    expect(title?.([tooltipFor(1)])).toBe('JetBrains');
    expect(title?.([])).toBe('');
    expect(label?.(tooltipFor(0))).toBe(`${(3000).toLocaleString()} interactions (75.0%)`);
    expect(label?.(tooltipFor(1))).toBe(`${(1000).toLocaleString()} interactions (25.0%)`);
  });

  it('drops the slice separator for a single full-circle slice', () => {
    const single = groupCompositionEntries([{ label: 'VS Code', value: 5, color: 'rgb(0, 0, 1)' }]);
    const { chartData } = createCompositionChartConfig({ group: single, unit: 'interactions', cutout: 0, borderColor: 'white' });

    expect(chartData.datasets[0].borderWidth).toBe(0);
  });
});
