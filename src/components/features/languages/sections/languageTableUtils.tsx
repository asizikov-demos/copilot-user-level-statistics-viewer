import type { LanguageStats } from '../../../../domain/calculators/metricCalculators';

export const MAX_LANGUAGES_TO_SHOW = 10;

export const tableRowClassName = () => 'hover:bg-gray-50';

export const narrowHeaderClassName = 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
export const narrowHeaderRightClassName = 'px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider';
export const narrowCellClassName = 'px-4 py-4 whitespace-nowrap text-sm text-gray-900';
export const narrowCellRightClassName = 'px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right';
export const wideCellRightClassName = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right';
export const wideHeaderRightClassName = 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider';

export function formatAcceptanceRate(lang: LanguageStats) {
  return lang.totalGenerations > 0
    ? ((lang.totalAcceptances / lang.totalGenerations) * 100).toFixed(1)
    : '0.0';
}
