'use client';

import React from 'react';
import { useDataTableContext } from './DataTableContext';
import { SortIndicator, getSortIndicatorAriaSort } from '../SortIndicator';

export interface DataTableColumnProps<T = unknown> {
  field?: keyof T;
  sortable?: boolean;
  children: React.ReactNode;
  className?: string;
  width?: string;
}

export function DataTableColumn<T>({
  field,
  sortable = false,
  children,
  className = '',
  width,
}: DataTableColumnProps<T>) {
  const { sortField, sortDirection, handleSort } = useDataTableContext<T>();

  const baseClassName =
    className ||
    'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
  const style = width ? { width } : undefined;

  if (sortable && field) {
    const isActive = sortField === field;

    return (
      <th scope="col" className={baseClassName} style={style} aria-sort={getSortIndicatorAriaSort(isActive, sortDirection)}>
        <button
          type="button"
          onClick={() => handleSort(field)}
          className="flex items-center hover:text-gray-700 focus:outline-none"
        >
          {children}
          <SortIndicator active={isActive} direction={sortDirection} />
        </button>
      </th>
    );
  }

  return (
    <th scope="col" className={baseClassName} style={style}>
      {children}
    </th>
  );
}

