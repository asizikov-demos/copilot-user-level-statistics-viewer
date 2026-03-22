'use client';

/**
 * Centralized dataset styling presets for Chart.js charts.
 * Reduces duplication across chart components.
 */

/**
 * Default styling for line chart datasets
 */
export const lineDatasetDefaults = {
  borderWidth: 2,
  fill: false,
  tension: 0.1,
  pointBorderColor: 'white',
  pointBorderWidth: 2,
  pointRadius: 4,
  pointHoverRadius: 6,
};

/**
 * Default styling for filled area line charts
 */
export const filledLineDatasetDefaults = {
  ...lineDatasetDefaults,
  fill: true,
};

/**
 * Default styling for bar chart datasets
 */
export const barDatasetDefaults = {
  borderWidth: 1,
};

/**
 * Creates a line dataset with consistent styling
 * @param color - RGB color string (e.g., 'rgb(34, 197, 94)')
 * @param label - Dataset label
 * @param data - Array of data points
 * @param options - Additional options to override defaults
 */
export function createLineDataset(
  color: string,
  label: string,
  data: (number | null)[],
  options: Partial<typeof lineDatasetDefaults & { fill: boolean }> = {}
) {
  const alphaColor = color.replace('rgb', 'rgba').replace(')', ', 0.1)');
  
  return {
    ...lineDatasetDefaults,
    label,
    data,
    borderColor: color,
    backgroundColor: alphaColor,
    pointBackgroundColor: color,
    ...options,
  };
}

/**
 * Creates a filled area line dataset with consistent styling
 * @param color - RGB color string (e.g., 'rgb(59, 130, 246)')
 * @param label - Dataset label
 * @param data - Array of data points
 * @param options - Additional options to override defaults
 */
export function createFilledLineDataset(
  color: string,
  label: string,
  data: (number | null)[],
  options: Partial<typeof filledLineDatasetDefaults> = {}
) {
  return createLineDataset(color, label, data, { fill: true, ...options });
}

/**
 * Creates a bar dataset with consistent styling
 * @param color - RGB or HSL color string
 * @param label - Dataset label
 * @param data - Array of data points
 * @param options - Additional options to override defaults
 */
export function createBarDataset(
  color: string,
  label: string,
  data: number[],
  options: Record<string, unknown> = {}
) {
  return {
    ...barDatasetDefaults,
    label,
    data,
    backgroundColor: color,
    borderColor: color,
    ...options,
  };
}

export function computeRetentionRates(
  data: Array<{ returningUsers: number; totalActiveUsers: number }>
): (number | null)[] {
  return data.map(d =>
    d.totalActiveUsers > 0 ? Math.round((d.returningUsers / d.totalActiveUsers) * 1000) / 10 : null
  );
}

export function computeAverageRetention(
  data: Array<{ returningUsers: number; totalActiveUsers: number }>
): number {
  const totalReturning = data.reduce((sum, d) => sum + d.returningUsers, 0);
  const totalActive = data.reduce((sum, d) => sum + d.totalActiveUsers, 0);
  if (totalActive === 0) return 0;
  return Math.round((totalReturning / totalActive) * 1000) / 10;
}
