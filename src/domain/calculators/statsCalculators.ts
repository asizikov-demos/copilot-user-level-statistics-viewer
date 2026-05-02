/**
 * Centralized statistical calculation utilities for charts.
 * Reduces duplication of average, total, max, and min calculations.
 */

/**
 * Compare two ISO-8601 date strings (YYYY-MM-DD) in ascending order.
 * Lexicographic comparison is correct and faster than Date construction.
 */
export const compareDatesAsc = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

/**
 * Compare two objects with a `date` string field in ascending order.
 */
export const compareByDateAsc = <T extends { date: string }>(a: T, b: T): number =>
  compareDatesAsc(a.date, b.date);

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
  return data.reduce(
    (max, item) => Math.max(max, accessor(item)),
    accessor(data[0])
  );
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
  return data.reduce(
    (min, item) => Math.min(min, accessor(item)),
    accessor(data[0])
  );
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

  let maxItem = data[0];
  let maxValue = accessor(maxItem);

  for (let i = 1; i < data.length; i++) {
    const currentValue = accessor(data[i]);
    if (currentValue > maxValue) {
      maxItem = data[i];
      maxValue = currentValue;
    }
  }

  return maxItem;
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

  let minItem = data[0];
  let minValue = accessor(minItem);

  for (let i = 1; i < data.length; i++) {
    const currentValue = accessor(data[i]);
    if (currentValue < minValue) {
      minItem = data[i];
      minValue = currentValue;
    }
  }

  return minItem;
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
