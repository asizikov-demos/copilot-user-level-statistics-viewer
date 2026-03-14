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
