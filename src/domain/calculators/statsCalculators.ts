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

  let max = accessor(data[0]);

  for (let index = 1; index < data.length; index += 1) {
    max = Math.max(max, accessor(data[index]));
  }

  return max;
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

  let min = accessor(data[0]);

  for (let index = 1; index < data.length; index += 1) {
    min = Math.min(min, accessor(data[index]));
  }

  return min;
}

/**
 * Find the minimum and maximum values in an array in a single pass.
 * Returns 0 for both values if the array is empty.
 * @param data - Array of items
 * @param accessor - Function to extract numeric value from each item
 */
export function findMinMaxValues<T>(
  data: T[],
  accessor: (item: T) => number
): {
  min: number;
  max: number;
} {
  if (data.length === 0) return { min: 0, max: 0 };

  let min = accessor(data[0]);
  let max = min;

  for (let index = 1; index < data.length; index += 1) {
    const value = accessor(data[index]);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  return { min, max };
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

  const initialItem = data[0];
  let maxItem = initialItem;
  let maxValue = accessor(initialItem);

  for (let index = 1; index < data.length; index += 1) {
    const item = data[index];
    const value = accessor(item);

    if (value > maxValue) {
      maxItem = item;
      maxValue = value;
    }
  }

  return maxItem;
}

/**
 * Find the items with the minimum and maximum values in an array in a single pass.
 * Returns undefined if the array is empty.
 * @param data - Array of items
 * @param accessor - Function to extract numeric value from each item
 */
export function findMinMaxItems<T>(
  data: T[],
  accessor: (item: T) => number
): {
  minItem: T;
  maxItem: T;
} | undefined {
  if (data.length === 0) return undefined;

  const initialItem = data[0];
  let minItem = initialItem;
  let minValue = accessor(initialItem);
  let maxItem = initialItem;
  let maxValue = minValue;

  for (let index = 1; index < data.length; index += 1) {
    const item = data[index];
    const value = accessor(item);

    if (value < minValue) {
      minItem = item;
      minValue = value;
    }

    if (value > maxValue) {
      maxItem = item;
      maxValue = value;
    }
  }

  return { minItem, maxItem };
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

  const initialItem = data[0];
  let minItem = initialItem;
  let minValue = accessor(initialItem);

  for (let index = 1; index < data.length; index += 1) {
    const item = data[index];
    const value = accessor(item);

    if (value < minValue) {
      minItem = item;
      minValue = value;
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

  const initialValue = accessor(data[0]);
  let total = initialValue;
  let max = initialValue;
  let min = initialValue;

  for (let index = 1; index < data.length; index += 1) {
    const value = accessor(data[index]);
    total += value;
    max = Math.max(max, value);
    min = Math.min(min, value);
  }

  const average = Math.round((total / data.length) * 100) / 100;

  return { average, total, max, min, count: data.length };
}
