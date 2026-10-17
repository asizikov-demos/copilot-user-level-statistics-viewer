import type { LanguageStats } from '../../../../domain/calculators/metricCalculators';

export const MAX_LANGUAGES_TO_SHOW = 10;

export const tableRowClassName = () => 'hover:bg-muted';

export const narrowHeaderClassName = 'px-4 py-3 text-left';
export const narrowHeaderRightClassName = 'px-4 py-3 text-right';
export const narrowCellClassName = 'px-4 py-4 whitespace-nowrap text-sm text-default';
export const narrowCellRightClassName = 'px-4 py-4 whitespace-nowrap text-sm text-default text-right';
export const wideCellRightClassName = 'px-6 py-4 whitespace-nowrap text-sm text-default text-right';
export const wideHeaderRightClassName = 'px-6 py-3 text-right';

export function formatAcceptanceRate(lang: LanguageStats) {
  return lang.totalGenerations > 0
    ? ((lang.totalAcceptances / lang.totalGenerations) * 100).toFixed(1)
    : '0.0';
}
