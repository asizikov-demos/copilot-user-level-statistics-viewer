import type { Chart, TooltipItem } from 'chart.js';
import { createPrimerTooltipStyle } from './tooltipStyle';

interface RankedStackedTooltipOptions {
  maxItems?: number;
  maxLabelLength?: number;
  unit?: string;
  itemNoun?: string;
}

function value(chart: Chart, datasetIndex: number, dataIndex: number): number {
  const raw = chart.data.datasets[datasetIndex]?.data[dataIndex];
  return typeof raw === 'number' ? raw : 0;
}

function dayRanking(chart: Chart, dataIndex: number): { ranked: number[]; total: number } {
  const entries = chart.data.datasets
    .map((_, index) => ({ index, amount: value(chart, index, dataIndex) }))
    .filter(entry => chart.isDatasetVisible(entry.index));
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const ranked = entries
    .filter(entry => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.index - b.index)
    .map(entry => entry.index);
  return { ranked, total };
}

export function truncateMiddle(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label;
  const keep = maxLength - 1;
  const head = Math.ceil(keep * 0.45);
  return `${label.slice(0, head)}…${label.slice(label.length - (keep - head))}`;
}

/**
 * Primer-styled tooltip for stacked bars with many series: a light surface with a border,
 * zero-value series hidden, the largest series first, and the remainder summarized.
 */
export function createRankedStackedTooltip(options: RankedStackedTooltipOptions = {}) {
  const { maxItems = 8, maxLabelLength = 44, unit = 'interactions', itemNoun = 'series' } = options;

  return {
    ...createPrimerTooltipStyle(),
    usePointStyle: true,
    itemSort: (a: TooltipItem<'bar'>, b: TooltipItem<'bar'>) =>
      (b.parsed.y ?? 0) - (a.parsed.y ?? 0) || a.datasetIndex - b.datasetIndex,
    filter: (item: TooltipItem<'bar'>) =>
      dayRanking(item.chart, item.dataIndex).ranked.slice(0, maxItems).includes(item.datasetIndex),
    callbacks: {
      labelColor: (item: TooltipItem<'bar'>) => {
        const color = item.dataset.backgroundColor;
        const fill = typeof color === 'string' ? color : 'transparent';
        return { borderColor: fill, backgroundColor: fill, borderRadius: 2 };
      },
      label: (item: TooltipItem<'bar'>) => {
        const amount = item.parsed.y ?? 0;
        const { total } = dayRanking(item.chart, item.dataIndex);
        const share = total > 0 ? ` (${Math.round((amount / total) * 100)}%)` : '';
        return `${truncateMiddle(item.dataset.label ?? '', maxLabelLength)}: ${amount.toLocaleString()}${share}`;
      },
      footer: (items: TooltipItem<'bar'>[]) => {
        if (!items.length) return '';
        const { chart, dataIndex } = items[0];
        const { ranked, total } = dayRanking(chart, dataIndex);
        const lines = [`Total: ${total.toLocaleString()} ${unit}`];
        const hidden = ranked.slice(maxItems);
        if (hidden.length > 0) {
          const hiddenTotal = hidden.reduce((sum, index) => sum + value(chart, index, dataIndex), 0);
          lines.unshift(`+ ${hidden.length} more ${itemNoun} (${hiddenTotal.toLocaleString()})`);
        }
        return lines;
      },
    },
  };
}
