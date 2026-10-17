import { afterEach, describe, it, expect, vi } from 'vitest';
import {
  categoricalColors,
  chartColors,
  getIdeColor,
  getSequentialColor,
  hasIdeColor,
  rgbToRgba,
} from './chartColors';
import { resetChartThemeCache } from './chartTheme';

afterEach(() => {
  vi.unstubAllGlobals();
  resetChartThemeCache();
});

describe('chartColors', () => {
  it('resolves Primer data-viz tokens to rgb strings with derived alpha variants', () => {
    expect(chartColors.blue).toEqual({
      solid: 'rgb(0, 110, 219)',
      alpha: 'rgba(0, 110, 219, 0.1)',
      alpha60: 'rgba(0, 110, 219, 0.6)',
      muted: 'rgb(209, 240, 255)',
    });
    expect(chartColors.amber.solid).toBe('rgb(184, 135, 0)');
  });

  it('keeps every named solid color distinct', () => {
    const solids = Object.values(chartColors).map(color => color.solid);
    expect(new Set(solids).size).toBe(solids.length);
  });

  it('reads token values from the document when available', () => {
    vi.stubGlobal('document', { documentElement: {} });
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (name: string) => (name === '--data-green-color-emphasis' ? '#010203' : ''),
    }));

    expect(chartColors.green.solid).toBe('rgb(1, 2, 3)');
    expect(chartColors.green.alpha60).toBe('rgba(1, 2, 3, 0.6)');
    expect(chartColors.red.solid).toBe('rgb(223, 12, 36)');
  });
});

describe('getSequentialColor', () => {
  it('cycles through distinct categorical colors without gray', () => {
    const colors = categoricalColors.map(color => color.solid);

    expect(new Set(colors).size).toBe(colors.length);
    expect(colors).not.toContain(chartColors.gray.solid);
    expect(getSequentialColor(0)).toBe(chartColors.blue.solid);
    expect(getSequentialColor(categoricalColors.length + 2)).toBe(getSequentialColor(2));
    expect(getSequentialColor(-1)).toBe(colors[colors.length - 1]);
  });
});

describe('getIdeColor', () => {
  it.each([
    ['VSCode', 'vscode'],
    ['  JetBrains  ', 'jetbrains'],
    ['visual_studio', 'visualstudio'],
  ])('resolves %j to the same brand color as %s', (variant, canonical) => {
    expect(hasIdeColor(variant)).toBe(true);
    expect(getIdeColor(variant, 0)).toBe(getIdeColor(canonical, 0));
  });

  it('uses a brand color independent of the fallback index for known IDEs', () => {
    expect(getIdeColor('vscode', 3)).toBe(getIdeColor('vscode', 0));
  });

  it('cycles through the categorical palette for unknown IDEs', () => {
    expect(hasIdeColor('unknown_ide')).toBe(false);
    expect(getIdeColor('unknown_ide', 1)).toBe(getSequentialColor(1));
    expect(getIdeColor('unknown_ide', categoricalColors.length + 3)).toBe(getSequentialColor(3));
  });
});

describe('rgbToRgba', () => {
  it('applies alpha to rgb and hex colors', () => {
    expect(rgbToRgba('rgb(34, 197, 94)', 0.5)).toBe('rgba(34, 197, 94, 0.5)');
    expect(rgbToRgba('#000000', 0.2)).toBe('rgba(0, 0, 0, 0.2)');
  });
});
