/**
 * Centralized color palette for Chart.js charts, backed by Primer data-visualization tokens.
 * Values are resolved from CSS custom properties on access (see `chartTheme.ts`), with a static
 * light-theme fallback for prerendering and tests.
 */
import { getIDEMetadata, IDE_METADATA_BY_KEY } from '../../../utils/ideMetadata';
import { readChartToken, toRgbColor, withAlpha, type ChartThemeToken } from './chartTheme';

export interface ChartColor {
  /** Opaque emphasis color for lines, borders and bars */
  readonly solid: string;
  /** Emphasis color at 10% opacity, for area fills */
  readonly alpha: string;
  /** Emphasis color at 60% opacity, for translucent bars */
  readonly alpha60: string;
  /** Opaque muted tint of the same hue */
  readonly muted: string;
}

function createTokenColor(emphasis: ChartThemeToken, muted: ChartThemeToken): ChartColor {
  return {
    get solid() {
      return toRgbColor(readChartToken(emphasis));
    },
    get alpha() {
      return withAlpha(readChartToken(emphasis), 0.1);
    },
    get alpha60() {
      return withAlpha(readChartToken(emphasis), 0.6);
    },
    get muted() {
      return toRgbColor(readChartToken(muted));
    },
  };
}

/**
 * Base chart colors. Names are kept from the pre-Primer palette; each maps to a Primer data-viz hue.
 */
export const chartColors = {
  red: createTokenColor('data-red-color-emphasis', 'data-red-color-muted'),
  green: createTokenColor('data-green-color-emphasis', 'data-green-color-muted'),
  blue: createTokenColor('data-blue-color-emphasis', 'data-blue-color-muted'),
  purple: createTokenColor('data-purple-color-emphasis', 'data-purple-color-muted'),
  amber: createTokenColor('data-yellow-color-emphasis', 'data-yellow-color-muted'),
  teal: createTokenColor('data-teal-color-emphasis', 'data-teal-color-muted'),
  indigo: createTokenColor('data-plum-color-emphasis', 'data-plum-color-muted'),
  pink: createTokenColor('data-pink-color-emphasis', 'data-pink-color-muted'),
  gray: createTokenColor('data-gray-color-emphasis', 'data-gray-color-muted'),
  violet: createTokenColor('display-indigo-scale-5', 'display-indigo-scale-0'),
  cyan: createTokenColor('display-cyan-scale-3', 'display-cyan-scale-0'),
  rose: createTokenColor('data-coral-color-emphasis', 'data-coral-color-muted'),
  orange: createTokenColor('data-orange-color-emphasis', 'data-orange-color-muted'),
  black: createTokenColor('fgColor-default', 'bgColor-muted'),
} as const satisfies Record<string, ChartColor>;

/**
 * Feature-specific colors for consistent representation
 */
export const featureColors = {
  askMode: chartColors.green,
  agentMode: chartColors.blue,
  editMode: chartColors.black,
  inlineMode: chartColors.amber,
  planMode: chartColors.purple,
  codeCompletion: chartColors.green,
  cli: chartColors.rose,
  other: chartColors.gray,
} as const;

/**
 * Chat mode colors (subset of feature colors for chat-specific charts)
 */
export const chatModeColors = {
  ask: chartColors.green,
  agent: chartColors.blue,
  edit: chartColors.black,
  inline: chartColors.amber,
  plan: chartColors.purple,
  cli: chartColors.rose,
} as const;

export const modelCategoryColors = {
  Lightweight: chartColors.green,
  Versatile: chartColors.blue,
  Powerful: chartColors.purple,
  Uncategorized: chartColors.gray,
} as const;

export const modelVendorColors = {
  OpenAI: chartColors.black,
  Anthropic: chartColors.orange,
  Google: chartColors.blue,
  GitHub: chartColors.violet,
  Microsoft: chartColors.green,
  xAI: chartColors.gray,
  'Moonshot AI': chartColors.cyan,
  Unattributed: chartColors.amber,
} as const;

/**
 * IDE/client brand colors for consistent representation across distribution and activity charts.
 * Keys are lowercase identifiers matching the values returned by the API (e.g. 'vscode', 'jetbrains').
 * Both 'visualstudio' and 'visual_studio' are supported as aliases.
 */
export const ideColors: Record<string, string> = Object.entries(IDE_METADATA_BY_KEY).reduce<Record<string, string>>(
  (colors, [key, metadata]) => {
    if (metadata.color) {
      colors[key] = metadata.color;
    }
    return colors;
  },
  {}
);

/**
 * Check whether the given IDE key has a configured brand color.
 * @param ideKey - IDE identifier (e.g. 'vscode', 'jetbrains')
 */
export function hasIdeColor(ideKey: string): boolean {
  return typeof getIDEMetadata(ideKey)?.color === 'string';
}

/**
 * Get a color for the given IDE key, falling back to the categorical palette for unknown IDEs.
 * @param ideKey - IDE identifier (e.g. 'vscode', 'jetbrains')
 * @param fallbackIndex - Index into the categorical palette for unknown IDEs (wraps around)
 */
export function getIdeColor(ideKey: string, fallbackIndex: number): string {
  return getIDEMetadata(ideKey)?.color ?? getSequentialColor(fallbackIndex);
}

/**
 * Categorical palette for datasets with dynamic/unknown categories. Gray is excluded so it stays
 * available for "other" and "unknown" series.
 */
export const categoricalColors: readonly ChartColor[] = [
  chartColors.blue,
  chartColors.green,
  chartColors.amber,
  chartColors.red,
  chartColors.purple,
  chartColors.teal,
  chartColors.indigo,
  chartColors.pink,
  chartColors.orange,
  createTokenColor('data-pine-color-emphasis', 'data-pine-color-muted'),
  chartColors.rose,
  createTokenColor('data-lime-color-emphasis', 'data-lime-color-muted'),
  createTokenColor('data-auburn-color-emphasis', 'data-auburn-color-muted'),
  createTokenColor('data-olive-color-emphasis', 'data-olive-color-muted'),
  createTokenColor('data-brown-color-emphasis', 'data-brown-color-muted'),
  createTokenColor('data-lemon-color-emphasis', 'data-lemon-color-muted'),
];

/**
 * Get a solid color from the categorical palette by index (wraps around)
 * @param index - Index in the color sequence
 */
export function getSequentialColor(index: number): string {
  const length = categoricalColors.length;
  return categoricalColors[((index % length) + length) % length].solid;
}

/**
 * Language brand colors used by charts with dynamic language series.
 */
export const languageColors: Readonly<Record<string, string>> = {
  javascript: '#F7DF1E',
  typescript: '#3178C6',
  python: '#3776AB',
  java: '#ED8B00',
  csharp: '#239120',
  cpp: '#00599C',
  c: '#A8B9CC',
  go: '#00ADD8',
  rust: '#000000',
  php: '#777BB4',
  ruby: '#CC342D',
  swift: '#FA7343',
  kotlin: '#7F52FF',
  scala: '#DC322F',
  dart: '#0175C2',
  html: '#E34F26',
  css: '#1572B6',
  scss: '#CF649A',
  less: '#1D365D',
  json: '#64748B',
  xml: '#0060AC',
  yaml: '#CB171E',
  markdown: '#083FA1',
  shell: '#89E051',
  bash: '#4EAA25',
  powershell: '#5391FE',
  sql: '#E38C00',
  r: '#276DC3',
  matlab: '#E16737',
  perl: '#39457E',
  lua: '#2C2D72',
  haskell: '#5E5086',
  elixir: '#6E4A7E',
  erlang: '#B83998',
  clojure: '#5881D8',
  fsharp: '#378BBA',
  ocaml: '#EC6813',
  elm: '#60B5CC',
  solidity: '#363636',
  assembly: '#6E4C13',
};

/**
 * Get a stable brand color for known languages or a non-wrapping generated fallback.
 */
export function getLanguageColor(language: string, fallbackIndex: number): string {
  return languageColors[language.toLowerCase()] ?? generateHslColor(fallbackIndex);
}

/**
 * Generate HSL color based on index (useful for dynamic datasets)
 * @param index - Index for color generation
 * @param saturation - Saturation percentage (default: 70)
 * @param lightness - Lightness percentage (default: 55)
 */
export function generateHslColor(
  index: number,
  saturation: number = 70,
  lightness: number = 55
): string {
  const hue = (index * 55) % 360;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Convert an RGB or hex color to RGBA with the specified alpha
 * @param rgb - Color string (e.g., 'rgb(34, 197, 94)' or '#22c55e')
 * @param alpha - Alpha value (0-1)
 */
export function rgbToRgba(rgb: string, alpha: number): string {
  return withAlpha(rgb, alpha);
}
