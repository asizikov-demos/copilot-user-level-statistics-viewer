'use client';

import React, { createContext, useContext } from 'react';
import type { SortDirection } from '../../../types/sort';

export type { SortDirection };

export interface DataTableContextValue {
  data: unknown[];
  visibleData: unknown[];
  sortField: string | number | symbol | null;
  sortDirection: SortDirection;
  handleSort: (field: string | number | symbol) => void;
  isExpanded: boolean;
  canExpand: boolean;
  toggleExpanded: () => void;
  totalCount: number;
  initialCount: number;
}

const DataTableContext = createContext<DataTableContextValue | null>(null);

export function DataTableProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: DataTableContextValue;
}) {
  return (
    <DataTableContext.Provider value={value}>
      {children}
    </DataTableContext.Provider>
  );
}

export function useDataTableContext<T>(): {
  data: T[];
  visibleData: T[];
  sortField: keyof T | null;
  sortDirection: SortDirection;
  handleSort: (field: keyof T) => void;
  isExpanded: boolean;
  canExpand: boolean;
  toggleExpanded: () => void;
  totalCount: number;
  initialCount: number;
} {
  const context = useContext(DataTableContext);
  if (!context) {
    throw new Error('DataTable compound components must be used within a DataTable');
  }
  return context as {
    data: T[];
    visibleData: T[];
    sortField: keyof T | null;
    sortDirection: SortDirection;
    handleSort: (field: keyof T) => void;
    isExpanded: boolean;
    canExpand: boolean;
    toggleExpanded: () => void;
    totalCount: number;
    initialCount: number;
  };
}
