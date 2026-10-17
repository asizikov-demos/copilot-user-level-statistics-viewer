import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LIGHT_THEME_TOKEN_FALLBACKS,
  readChartToken,
  resetChartThemeCache,
  resolveChartTheme,
  toRgbColor,
  withAlpha,
  type ChartThemeToken,
} from './chartTheme';

const primerCssDir = join(process.cwd(), 'node_modules/@primer/primitives/dist/css');

function readPrimerTokens(...files: string[]): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const file of files) {
    const css = readFileSync(join(primerCssDir, file), 'utf8');
    for (const match of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
      if (!tokens.has(match[1])) tokens.set(match[1], match[2].trim());
    }
  }
  return tokens;
}

function stubDocumentTokens(tokens: Record<string, string>) {
  const getPropertyValue = vi.fn((name: string) => tokens[name] ?? '');
  vi.stubGlobal('document', { documentElement: {} });
  vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue }));
  return getPropertyValue;
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetChartThemeCache();
});

describe('LIGHT_THEME_TOKEN_FALLBACKS', () => {
  it('matches the installed @primer/primitives light theme', () => {
    const primerTokens = readPrimerTokens(
      'functional/themes/light.css',
      'functional/typography/typography.css',
    );

    for (const [token, fallback] of Object.entries(LIGHT_THEME_TOKEN_FALLBACKS)) {
      expect(primerTokens.get(token), token).toBe(fallback);
    }
  });
});

describe('readChartToken', () => {
  it('uses the static light-theme fallback without a document', () => {
    expect(readChartToken('data-blue-color-emphasis')).toBe('#006edb');
  });

  it('reads tokens from the document root and caches them', () => {
    const getPropertyValue = stubDocumentTokens({ '--data-blue-color-emphasis': ' #123456 ' });

    expect(readChartToken('data-blue-color-emphasis')).toBe('#123456');
    expect(readChartToken('data-blue-color-emphasis')).toBe('#123456');
    expect(getPropertyValue).toHaveBeenCalledTimes(1);
  });

  it('falls back without caching when the document does not define the token', () => {
    const getPropertyValue = stubDocumentTokens({});

    expect(readChartToken('data-red-color-emphasis')).toBe(LIGHT_THEME_TOKEN_FALLBACKS['data-red-color-emphasis']);
    readChartToken('data-red-color-emphasis');
    expect(getPropertyValue).toHaveBeenCalledTimes(2);
  });

  it('re-reads tokens after the cache is reset', () => {
    stubDocumentTokens({ '--fgColor-muted': '#111111' });
    expect(readChartToken('fgColor-muted')).toBe('#111111');

    stubDocumentTokens({ '--fgColor-muted': '#222222' });
    expect(readChartToken('fgColor-muted')).toBe('#111111');
    resetChartThemeCache();
    expect(readChartToken('fgColor-muted')).toBe('#222222');
  });
});

describe('color helpers', () => {
  it.each([
    ['#006edb', 'rgb(0, 110, 219)'],
    ['#fff', 'rgb(255, 255, 255)'],
    ['#d1d9e0b3', 'rgba(209, 217, 224, 0.7)'],
    ['rgb(1, 2, 3)', 'rgb(1, 2, 3)'],
    ['hsl(10, 50%, 50%)', 'hsl(10, 50%, 50%)'],
  ])('toRgbColor(%s) -> %s', (input, expected) => {
    expect(toRgbColor(input)).toBe(expected);
  });

  it.each([
    ['rgb(34, 197, 94)', 'rgba(34, 197, 94, 0.1)'],
    ['#006edb', 'rgba(0, 110, 219, 0.1)'],
    ['rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.1)'],
    ['hsl(210, 70%, 55%)', 'hsla(210, 70%, 55%, 0.1)'],
    ['currentColor', 'currentColor'],
  ])('withAlpha(%s, 0.1) -> %s', (input, expected) => {
    expect(withAlpha(input, 0.1)).toBe(expected);
  });
});

describe('resolveChartTheme', () => {
  it('maps Primer tokens to chart roles', () => {
    const theme = resolveChartTheme();
    const fallback = (token: ChartThemeToken) => LIGHT_THEME_TOKEN_FALLBACKS[token];

    expect(theme).toEqual({
      fontFamily: fallback('fontStack-system'),
      textColor: 'rgb(89, 99, 110)',
      gridColor: 'rgba(209, 217, 224, 0.7)',
      sequentialBlue: ['rgb(173, 225, 255)', 'rgb(15, 143, 255)', 'rgb(0, 43, 117)'],
    });
  });
});
