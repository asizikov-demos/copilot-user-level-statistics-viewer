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
      shareDatasetLabel: 'Premium',
      shareLabel: 'Premium share',
      shareSeparator: ' · ',
    });

    expect(footer([tooltipItem('Premium', 0), tooltipItem('Base', 0)])).toBe('Total: 0 · Premium share: 0.0%');
    expect(footer([tooltipItem('Base', 10)])).toBe('Total: 10 · Premium share: 0.0%');
  });

  it('computes non-zero share from the named dataset', () => {
    const footer = createStackedTotalWithShareFooter({
      shareDatasetLabel: 'Premium',
      shareLabel: 'Premium share',
      shareSeparator: ' · ',
    });

    expect(footer([tooltipItem('Premium', 25), tooltipItem('Base', 75)])).toBe('Total: 100 · Premium share: 25.0%');
  });
});
