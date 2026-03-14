"use client";

import { useState, useMemo } from 'react';
import type { SortDirection } from '../types/sort';
import { sortByField, toggleSortDirection } from '../utils/sorting';

export type { SortDirection };

export interface SortableTableResult<T, K extends keyof T> {
  sortField: K;
  sortDirection: SortDirection;
  sortedItems: T[];
  handleSort: (field: K) => void;
}

export function useSortableTable<T, K extends keyof T>(
  items: T[],
  defaultSortField: K,
  defaultSortDirection: SortDirection = 'desc'
): SortableTableResult<T, K> {
  const [sortField, setSortField] = useState<K>(defaultSortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  const handleSort = (field: K) => {
    if (sortField === field) {
      setSortDirection(toggleSortDirection);
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedItems = useMemo(
    () => sortByField(items, sortField, sortDirection),
    [items, sortField, sortDirection]
  );

  return { sortField, sortDirection, sortedItems, handleSort };
}
