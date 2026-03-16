/**
 * Centralized statistical calculation utilities for charts.
 * Reduces duplication of average, total, max, and min calculations.
 */

/**
 * Calculate the average of values extracted from an array.
 * Returns 0 if the array is empty.
 * @param data - Array of items
 * @param accessor - Function to extract numeric value from each item
 * @param decimals - Number of decimal places (default: 2)
 */
export function calculateAverage<T>(
  data: T[],
  accessor: (item: T) => number,
  decimals: number = 2
): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, item) => acc + accessor(item), 0);
  const factor = Math.pow(10, decimals);
  return Math.round((sum / data.length) * factor) / factor;
}

/**
 * Calculate the sum of values extracted from an array.
 * @param data - Array of items
 * @param accessor - Function to extract numeric value from each item
 */
export function calculateTotal<T>(
  data: T[],
  accessor: (item: T) => number
): number {
  return data.reduce((acc, item) => acc + accessor(item), 0);
}

/**
 * Find the maximum value in an array.
 * Returns 0 if the array is empty.
 * @param data - Array of items
 * @param accessor - Function to extract numeric value from each item
 */
export function findMaxValue<T>(
  data: T[],
  accessor: (item: T) => number
): number {
  if (data.length === 0) return 0;
  return Math.max(...data.map(accessor));
}

/**
 * Find the minimum value in an array.
 * Returns 0 if the array is empty.
 * @param data - Array of items
 * @param accessor - Function to extract numeric value from each item
 */
export function findMinValue<T>(
  data: T[],
  accessor: (item: T) => number
): number {
  if (data.length === 0) return 0;
  return Math.min(...data.map(accessor));
}

/**
 * Find the item with the maximum value in an array.
 * Returns undefined if the array is empty.
 * @param data - Array of items
 * @param accessor - Function to extract numeric value from each item
 */
export function findMaxItem<T>(
  data: T[],
  accessor: (item: T) => number
): T | undefined {
  if (data.length === 0) return undefined;
  return data.reduce((max, item) => 
    accessor(item) > accessor(max) ? item : max, 
    data[0]
  );
}

/**
 * Find the item with the minimum value in an array.
 * Returns undefined if the array is empty.
 * @param data - Array of items
 * @param accessor - Function to extract numeric value from each item
 */
export function findMinItem<T>(
  data: T[],
  accessor: (item: T) => number
): T | undefined {
  if (data.length === 0) return undefined;
  return data.reduce((min, item) => 
    accessor(item) < accessor(min) ? item : min, 
    data[0]
  );
}

/**
 * Calculate a percentage from a numerator and denominator.
 * Returns 0 if the denominator is 0.
 * @param numerator - The part value
 * @param denominator - The whole value
 * @param decimals - Number of decimal places (default: 2)
 */
export function calculatePercentage(
  numerator: number,
  denominator: number,
  decimals: number = 2
): number {
  if (denominator === 0) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((numerator / denominator) * 100 * factor) / factor;
}

/**
 * Calculate multiple statistics at once for efficiency.
 * @param data - Array of items
 * @param accessor - Function to extract numeric value from each item
 */
export function calculateStats<T>(
  data: T[],
  accessor: (item: T) => number
): {
  average: number;
  total: number;
  max: number;
  min: number;
  count: number;
} {
  if (data.length === 0) {
    return { average: 0, total: 0, max: 0, min: 0, count: 0 };
  }

  const values = data.map(accessor);
  const total = values.reduce((sum, v) => sum + v, 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const average = Math.round((total / values.length) * 100) / 100;

  return { average, total, max, min, count: data.length };
}
