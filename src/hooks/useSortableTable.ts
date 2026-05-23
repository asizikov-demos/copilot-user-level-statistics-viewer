"use client";

import { useState, useMemo } from 'react';
import type { SortDirection } from '../types/sort';
import { sortByField, toggleSortDirection } from '../utils/sorting';

export type { SortDirection };

export interface SortableTableResult<T, K extends keyof T> {
  sortField: K | null;
  sortDirection: SortDirection;
  sortedItems: T[];
  handleSort: (field: K) => void;
}

export function getNextSortState<K extends PropertyKey>(
  currentField: K | null,
  currentDirection: SortDirection,
  nextField: K
): { sortField: K; sortDirection: SortDirection } {
  if (currentField === nextField) {
    return {
      sortField: nextField,
      sortDirection: toggleSortDirection(currentDirection),
    };
  }

  return {
    sortField: nextField,
    sortDirection: 'desc',
  };
}

export function useSortableTable<T, K extends keyof T>(
  items: T[],
  defaultSortField?: K,
  defaultSortDirection: SortDirection = 'desc'
): SortableTableResult<T, K> {
  const [sortField, setSortField] = useState<K | null>(defaultSortField ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  const handleSort = (field: K) => {
    const nextState = getNextSortState(sortField, sortDirection, field);
    setSortField(nextState.sortField);
    setSortDirection(nextState.sortDirection);
  };

  const sortedItems = useMemo(
    () => sortByField(items, sortField, sortDirection),
    [items, sortField, sortDirection]
  );

  return { sortField, sortDirection, sortedItems, handleSort };
}
