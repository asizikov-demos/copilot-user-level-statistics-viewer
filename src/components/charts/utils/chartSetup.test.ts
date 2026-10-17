import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyChartTheme, ChartJS, registerChartJS } from './chartSetup';
import { LIGHT_THEME_TOKEN_FALLBACKS, resetChartThemeCache } from './chartTheme';

afterEach(() => {
  vi.unstubAllGlobals();
  resetChartThemeCache();
  applyChartTheme();
});

describe('registerChartJS', () => {
  it('registers cartesian chart components and applies Primer defaults', () => {
    registerChartJS();

    expect(ChartJS.registry.getElement('bar')).toBeDefined();
    expect(ChartJS.registry.getElement('line')).toBeDefined();
    expect(ChartJS.defaults.font.family).toBe(LIGHT_THEME_TOKEN_FALLBACKS['fontStack-system']);
    expect(ChartJS.defaults.color).toBe('rgb(89, 99, 110)');
    expect(ChartJS.defaults.borderColor).toBe('rgba(209, 217, 224, 0.7)');
  });
});

describe('applyChartTheme', () => {
  it('re-reads document tokens when refreshed', () => {
    applyChartTheme();
    vi.stubGlobal('document', { documentElement: {} });
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (name: string) => (name === '--fgColor-muted' ? '#010203' : ''),
    }));

    applyChartTheme({ refresh: true });

    expect(ChartJS.defaults.color).toBe('rgb(1, 2, 3)');
  });
});
