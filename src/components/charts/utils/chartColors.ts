/**
 * Centralized color palette for Chart.js charts.
 * Provides consistent colors across all chart components.
 */

/**
 * Base chart colors with solid and alpha variants
 */
export const chartColors = {
  red: {
    solid: 'rgb(239, 68, 68)',
    alpha: 'rgba(239, 68, 68, 0.1)',
    alpha60: 'rgba(239, 68, 68, 0.6)',
  },
  green: {
    solid: 'rgb(34, 197, 94)',
    alpha: 'rgba(34, 197, 94, 0.1)',
    alpha60: 'rgba(34, 197, 94, 0.6)',
  },
  blue: {
    solid: 'rgb(59, 130, 246)',
    alpha: 'rgba(59, 130, 246, 0.1)',
    alpha60: 'rgba(59, 130, 246, 0.6)',
  },
  purple: {
    solid: 'rgb(147, 51, 234)',
    alpha: 'rgba(147, 51, 234, 0.1)',
    alpha60: 'rgba(147, 51, 234, 0.6)',
  },
  amber: {
    solid: 'rgb(245, 158, 11)',
    alpha: 'rgba(245, 158, 11, 0.1)',
    alpha60: 'rgba(245, 158, 11, 0.6)',
  },
  teal: {
    solid: 'rgb(20, 184, 166)',
    alpha: 'rgba(20, 184, 166, 0.1)',
    alpha60: 'rgba(20, 184, 166, 0.6)',
  },
  indigo: {
    solid: 'rgb(99, 102, 241)',
    alpha: 'rgba(99, 102, 241, 0.1)',
    alpha60: 'rgba(99, 102, 241, 0.6)',
  },
  pink: {
    solid: 'rgb(236, 72, 153)',
    alpha: 'rgba(236, 72, 153, 0.1)',
    alpha60: 'rgba(236, 72, 153, 0.6)',
  },
  gray: {
    solid: 'rgb(156, 163, 175)',
    alpha: 'rgba(156, 163, 175, 0.1)',
    alpha60: 'rgba(156, 163, 175, 0.6)',
  },
  violet: {
    solid: 'rgb(168, 85, 247)',
    alpha: 'rgba(168, 85, 247, 0.1)',
    alpha60: 'rgba(168, 85, 247, 0.6)',
  },
  cyan: {
    solid: 'rgb(6, 182, 212)',
    alpha: 'rgba(6, 182, 212, 0.1)',
    alpha60: 'rgba(6, 182, 212, 0.6)',
  },
  rose: {
    solid: 'rgb(244, 63, 94)',
    alpha: 'rgba(244, 63, 94, 0.1)',
    alpha60: 'rgba(244, 63, 94, 0.6)',
  },
  orange: {
    solid: 'rgb(249, 115, 22)',
    alpha: 'rgba(249, 115, 22, 0.1)',
    alpha60: 'rgba(249, 115, 22, 0.6)',
  },
  black: {
    solid: 'rgb(23, 23, 23)',
    alpha: 'rgba(23, 23, 23, 0.1)',
    alpha60: 'rgba(23, 23, 23, 0.6)',
  },
} as const;

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

/**
 * IDE/client brand colors for consistent representation across distribution and activity charts.
 * Keys are lowercase identifiers matching the values returned by the API (e.g. 'vscode', 'jetbrains').
 * Both 'visualstudio' and 'visual_studio' are supported as aliases.
 */
export const ideColors: Record<string, string> = {
  vscode: '#007ACC',
  visualstudio: '#68217A',
  visual_studio: '#68217A',
  jetbrains: '#FC801D',
  vim: '#019733',
  neovim: '#57A143',
  emacs: '#9266CC',
  eclipse: '#2C2255',
  sublime_text: '#FF9800',
  xcode: '#29ABE2',
  intellij: '#FC801D',
  copilot_cli: '#DB61A2',
  zed: '#F9CE49',
};

/**
 * Fallback colors used sequentially for IDEs not present in `ideColors`.
 */
export const ideFallbackColors: readonly string[] = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#14B8A6',
];

/**
 * Get a color for the given IDE key, falling back to an indexed palette for unknown IDEs.
 * @param ideKey - IDE identifier (e.g. 'vscode', 'jetbrains'); normalized to lowercase + trim
 * @param fallbackIndex - Index into `ideFallbackColors` for unknown IDEs (wraps around)
 */
export function getIdeColor(ideKey: string, fallbackIndex: number): string {
  const key = ideKey.toLowerCase().trim();
  return ideColors[key] ?? ideFallbackColors[fallbackIndex % ideFallbackColors.length];
}

/**
 * Default color sequence for datasets with dynamic/unknown categories
 */
export const defaultColorSequence = [
  chartColors.blue.solid,
  chartColors.green.solid,
  chartColors.amber.solid,
  chartColors.red.solid,
  chartColors.purple.solid,
  chartColors.teal.solid,
  chartColors.indigo.solid,
  chartColors.pink.solid,
] as const;

/**
 * Get a color from the sequence by index (wraps around)
 * @param index - Index in the color sequence
 */
export function getSequentialColor(index: number): string {
  return defaultColorSequence[index % defaultColorSequence.length];
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
 * Convert RGB to RGBA with specified alpha
 * @param rgb - RGB color string (e.g., 'rgb(34, 197, 94)')
 * @param alpha - Alpha value (0-1)
 */
export function rgbToRgba(rgb: string, alpha: number): string {
  return rgb.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
}
