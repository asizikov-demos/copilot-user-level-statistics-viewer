'use client';

import React from 'react';
import { DataTableProvider, SortDirection } from './DataTableContext';
import { useSortableTable } from '../../../hooks/useSortableTable';
import { useExpandableList } from '../../../hooks/useExpandableList';

export interface DataTableProps<T> {
  data: T[];
  defaultSortField?: keyof T;
  defaultSortDirection?: SortDirection;
  initialCount?: number;
  children: React.ReactNode;
  className?: string;
  tableClassName?: string;
  containerClassName?: string;
}

export function DataTable<T>({
  data,
  defaultSortField,
  defaultSortDirection = 'desc',
  initialCount = 10,
  children,
  className = '',
  tableClassName = '',
  containerClassName = '',
}: DataTableProps<T>) {
  const {
    sortField,
    sortDirection,
    sortedItems: sortedData,
    handleSort,
  } = useSortableTable<T, keyof T>(
    data,
    defaultSortField,
    defaultSortDirection
  );

  const { visibleItems: visibleData, isExpanded, canExpand, toggleExpanded } = useExpandableList(
    sortedData,
    initialCount
  );

  const contextValue = {
    data: sortedData as unknown[],
    visibleData: visibleData as unknown[],
    sortField: sortField as string | number | symbol | null,
    sortDirection,
    handleSort: handleSort as (field: string | number | symbol) => void,
    isExpanded,
    canExpand,
    toggleExpanded,
    totalCount: data.length,
    initialCount,
  };

  return (
    <DataTableProvider value={contextValue}>
      <div className={className}>
        <div className={containerClassName || 'overflow-x-auto'}>
          <table className={tableClassName || 'w-full divide-y divide-gray-200'}>
            {children}
          </table>
        </div>
      </div>
    </DataTableProvider>
  );
}
