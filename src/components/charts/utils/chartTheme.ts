/**
 * Resolves Primer design tokens for Chart.js, which draws on a canvas and cannot use CSS variables.
 *
 * On the client, tokens are read from the document root via `getComputedStyle`. During Next.js
 * prerendering, in Node tests, or before the token stylesheet has loaded, the static light-theme
 * values below are used instead. They match `@primer/primitives` light theme values exactly.
 */

export const LIGHT_THEME_TOKEN_FALLBACKS = {
  'data-blue-color-emphasis': '#006edb',
  'data-blue-color-muted': '#d1f0ff',
  'data-green-color-emphasis': '#30a147',
  'data-green-color-muted': '#caf7ca',
  'data-yellow-color-emphasis': '#b88700',
  'data-yellow-color-muted': '#ffec9e',
  'data-red-color-emphasis': '#df0c24',
  'data-red-color-muted': '#ffe2e0',
  'data-purple-color-emphasis': '#894ceb',
  'data-purple-color-muted': '#f1e5ff',
  'data-teal-color-emphasis': '#179b9b',
  'data-teal-color-muted': '#c7f5ef',
  'data-plum-color-emphasis': '#a830e8',
  'data-plum-color-muted': '#f8e5ff',
  'data-pink-color-emphasis': '#ce2c85',
  'data-pink-color-muted': '#ffe5f1',
  'data-gray-color-emphasis': '#808fa3',
  'data-gray-color-muted': '#e8ecf2',
  'data-coral-color-emphasis': '#d43511',
  'data-coral-color-muted': '#ffe5db',
  'data-orange-color-emphasis': '#eb670f',
  'data-orange-color-muted': '#ffe7d1',
  'data-pine-color-emphasis': '#167e53',
  'data-pine-color-muted': '#bff8db',
  'data-lime-color-emphasis': '#527a29',
  'data-lime-color-muted': '#e3f2b5',
  'data-auburn-color-emphasis': '#9d615c',
  'data-auburn-color-muted': '#f2e9e9',
  'data-olive-color-emphasis': '#64762d',
  'data-olive-color-muted': '#f0f0ad',
  'data-brown-color-emphasis': '#856d4c',
  'data-brown-color-muted': '#eeeae2',
  'data-lemon-color-emphasis': '#866e04',
  'data-lemon-color-muted': '#f7eea1',
  // Primer has only three purple-family data hues; violet and cyan need display scales to stay distinct.
  'display-indigo-scale-5': '#5a61e7',
  'display-indigo-scale-0': '#e5e9ff',
  'display-cyan-scale-3': '#00b7db',
  'display-cyan-scale-0': '#bdf4ff',
  // Data-viz tokens have two steps per hue; three-step blue categories use the display scale.
  'display-blue-scale-1': '#ade1ff',
  'display-blue-scale-4': '#0f8fff',
  'display-blue-scale-9': '#002b75',
  'fgColor-default': '#1f2328',
  'fgColor-muted': '#59636e',
  'bgColor-muted': '#f6f8fa',
  'borderColor-muted': '#d1d9e0b3',
  'fontStack-system':
    '"Mona Sans VF", -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Backtick Fix", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
} as const;

export type ChartThemeToken = keyof typeof LIGHT_THEME_TOKEN_FALLBACKS;

const resolvedTokens = new Map<ChartThemeToken, string>();

/**
 * Reads a Primer token from the document, falling back to the static light-theme value.
 * Only values found in the document are cached, so tokens are re-read once their stylesheet loads.
 */
export function readChartToken(token: ChartThemeToken): string {
  const cached = resolvedTokens.get(token);
  if (cached) return cached;

  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function' || !document.documentElement) {
    return LIGHT_THEME_TOKEN_FALLBACKS[token];
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
  if (!value) return LIGHT_THEME_TOKEN_FALLBACKS[token];

  resolvedTokens.set(token, value);
  return value;
}

/**
 * Clears resolved token values so the next read picks up the document's current theme.
 */
export function resetChartThemeCache(): void {
  resolvedTokens.clear();
}

interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(color: string): ParsedColor | null {
  const value = color.trim();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value)?.[1];
  if (hex) {
    const digits = hex.length <= 4 ? hex.split('').map(d => d + d).join('') : hex;
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: digits.length === 8 ? Math.round((parseInt(digits.slice(6, 8), 16) / 255) * 100) / 100 : 1,
    };
  }

  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(value);
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }

  return null;
}

/**
 * Normalizes hex or rgb colors to `rgb(r, g, b)` (or `rgba(...)` when translucent).
 * Unrecognized formats are returned unchanged.
 */
export function toRgbColor(color: string): string {
  const parsed = parseColor(color);
  if (!parsed) return color;
  const { r, g, b, a } = parsed;
  return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Returns the color with the given alpha. Supports hex, rgb(a) and hsl(a) inputs;
 * other formats are returned unchanged.
 */
export function withAlpha(color: string, alpha: number): string {
  const parsed = parseColor(color);
  if (parsed) return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;

  const hsl = /^hsla?\(\s*([^,]+),\s*([^,]+),\s*([^,)]+)(?:,\s*[^)]+)?\)$/i.exec(color.trim());
  if (hsl) return `hsla(${hsl[1].trim()}, ${hsl[2].trim()}, ${hsl[3].trim()}, ${alpha})`;

  return color;
}

export interface ChartTheme {
  fontFamily: string;
  /** Tick, axis title and legend text */
  textColor: string;
  /** Grid lines and axis borders */
  gridColor: string;
  /** Three-step sequential blue (light, mid, dark) for ordered categories */
  sequentialBlue: readonly [string, string, string];
}

/**
 * Resolves chart chrome colors and the font stack from Primer tokens.
 */
export function resolveChartTheme(): ChartTheme {
  return {
    fontFamily: readChartToken('fontStack-system'),
    textColor: toRgbColor(readChartToken('fgColor-muted')),
    gridColor: toRgbColor(readChartToken('borderColor-muted')),
    sequentialBlue: [
      toRgbColor(readChartToken('display-blue-scale-1')),
      toRgbColor(readChartToken('display-blue-scale-4')),
      toRgbColor(readChartToken('display-blue-scale-9')),
    ],
  };
}
