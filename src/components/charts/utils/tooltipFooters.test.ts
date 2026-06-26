import type { TooltipItem } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { createStackedTotalFooter, createStackedTotalWithShareFooter } from './tooltipFooters';

type StackedTooltipItem = TooltipItem<'line' | 'bar'>;

function tooltipItem(label: string, y: number): StackedTooltipItem {
  return {
    dataset: { label },
    parsed: { y },
  } as StackedTooltipItem;
}

describe('tooltip footer helpers', () => {
  it('returns empty footer for empty items', () => {
    const footer = createStackedTotalFooter();
    expect(footer([])).toBe('');
  });

  it('formats stacked total using provided locale formatter and unit', () => {
    const footer = createStackedTotalFooter({
      unit: 'interactions',
      totalFormatter: value => new Intl.NumberFormat('de-DE').format(value),
    });

    expect(footer([tooltipItem('A', 1200), tooltipItem('B', 34)])).toBe('Total: 1.234 interactions');
  });

  it('supports disabling locale formatting for totals', () => {
    const footer = createStackedTotalFooter({ useLocaleFormatting: false });
    expect(footer([tooltipItem('A', 1200), tooltipItem('B', 34)])).toBe('Total: 1234');
  });

  it('formats stacked total with share and zero-total fallback', () => {
    const footer = createStackedTotalWithShareFooter({
      shareDatasetLabel: 'Selected',
      shareLabel: 'Selected share',
      shareSeparator: ' · ',
    });

    expect(footer([tooltipItem('Selected', 0), tooltipItem('Other', 0)])).toBe('Total: 0 · Selected share: 0.0%');
    expect(footer([tooltipItem('Other', 10)])).toBe('Total: 10 · Selected share: 0.0%');
  });

  it('computes non-zero share from the named dataset', () => {
    const footer = createStackedTotalWithShareFooter({
      shareDatasetLabel: 'Selected',
      shareLabel: 'Selected share',
      shareSeparator: ' · ',
    });

    expect(footer([tooltipItem('Selected', 25), tooltipItem('Other', 75)])).toBe('Total: 100 · Selected share: 25.0%');
  });
});
