import type { TooltipItem } from 'chart.js';

type StackedTooltipItem = TooltipItem<'line' | 'bar'>;

type NumberFormatter = (value: number) => string;

interface StackedTotalFooterOptions {
  totalLabel?: string;
  unit?: string;
  totalFormatter?: NumberFormatter;
}

interface StackedTotalWithShareFooterOptions extends StackedTotalFooterOptions {
  shareDatasetLabel: string;
  shareLabel?: string;
  shareDigits?: number;
  shareSeparator?: string;
}

function parsedValue(item: StackedTooltipItem): number {
  return typeof item.parsed.y === 'number' ? item.parsed.y : 0;
}

function formatTotal(value: number, options: StackedTotalFooterOptions): string {
  const totalLabel = options.totalLabel ?? 'Total';
  const totalFormatter = options.totalFormatter ?? (v => v.toLocaleString());
  const unit = options.unit ? ` ${options.unit}` : '';
  return `${totalLabel}: ${totalFormatter(value)}${unit}`;
}

export function createStackedTotalFooter(options: StackedTotalFooterOptions = {}) {
  return (items: StackedTooltipItem[]) => {
    if (!items.length) return '';
    const dayTotal = items.reduce((sum, item) => sum + parsedValue(item), 0);
    return formatTotal(dayTotal, options);
  };
}

export function createStackedTotalWithShareFooter(options: StackedTotalWithShareFooterOptions) {
  const shareLabel = options.shareLabel ?? 'Share';
  const shareDigits = options.shareDigits ?? 1;
  const shareSeparator = options.shareSeparator ?? ' | ';

  return (items: StackedTooltipItem[]) => {
    if (!items.length) return '';

    const dayTotal = items.reduce((sum, item) => sum + parsedValue(item), 0);
    const shareDatasetValue = items.find(item => item.dataset.label === options.shareDatasetLabel);
    const shareValue = shareDatasetValue ? parsedValue(shareDatasetValue) : 0;
    const share = dayTotal > 0 ? ((shareValue / dayTotal) * 100).toFixed(shareDigits) : (0).toFixed(shareDigits);

    return `${formatTotal(dayTotal, options)}${shareSeparator}${shareLabel}: ${share}%`;
  };
}
