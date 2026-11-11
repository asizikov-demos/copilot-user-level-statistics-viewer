import { readChartToken, toRgbColor } from './chartTheme';

/**
 * Primer-style tooltip surface: light background, muted border, default text.
 */
export function createPrimerTooltipStyle() {
  return {
    backgroundColor: toRgbColor(readChartToken('bgColor-default')),
    borderColor: toRgbColor(readChartToken('borderColor-muted')),
    borderWidth: 1,
    titleColor: toRgbColor(readChartToken('fgColor-default')),
    bodyColor: toRgbColor(readChartToken('fgColor-default')),
    footerColor: toRgbColor(readChartToken('fgColor-default')),
    padding: 12,
    cornerRadius: 6,
    boxPadding: 4,
    bodySpacing: 6,
    titleMarginBottom: 8,
    footerMarginTop: 10,
    titleFont: { weight: 'bold' as const, size: 13 },
    bodyFont: { size: 12 },
    footerFont: { weight: 'bold' as const, size: 12 },
  };
}
