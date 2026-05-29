import type { SortDirection } from '../types/sort';

/**
 * Generic comparator for sorting arrays of objects by a field.
 * Handles string (case-insensitive) and numeric comparisons.
 */
export function sortByField<T, K extends keyof T>(
  items: readonly T[],
  sortField: K | null,
  sortDirection: SortDirection,
): T[] {
  if (sortField == null) return [...items];

  return [...items].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase() as T[K];
      bVal = bVal.toLowerCase() as T[K];
    }

    if (sortDirection === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });
}

export function toggleSortDirection(current: SortDirection): SortDirection {
  return current === 'asc' ? 'desc' : 'asc';
}

/**
 * Sort an array by a computed selector function.
 * The selector may return a string or number; strings are compared as-is
 * (apply any desired normalisation, e.g. toLowerCase(), inside the selector).
 */
export function sortBySelector<T>(
  items: readonly T[],
  selector: (item: T) => string | number,
  direction: SortDirection = 'desc',
): T[] {
  return [...items].sort((a, b) => {
    const aVal = selector(a);
    const bVal = selector(b);
    if (direction === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });
}

/**
 * Return the top-N items ranked by a numeric selector in descending order.
 * Equivalent to sortBySelector(items, selector, 'desc').slice(0, n).
 */
export function takeTopBySelector<T>(
  items: readonly T[],
  selector: (item: T) => number,
  n: number,
): T[] {
  return sortBySelector(items, selector, 'desc').slice(0, n);
}

/**
 * Build a rank map (1-based) keyed by the string returned from keySelector,
 * ordered by valueSelector descending.  Items with equal values receive
 * consecutive ranks in their original relative order (stable sort).
 */
export function rankBySelector<T>(
  items: readonly T[],
  keySelector: (item: T) => string,
  valueSelector: (item: T) => number,
): Map<string, number> {
  const sorted = sortBySelector(items, valueSelector, 'desc');
  const map = new Map<string, number>();
  sorted.forEach((item, index) => map.set(keySelector(item), index + 1));
  return map;
}
