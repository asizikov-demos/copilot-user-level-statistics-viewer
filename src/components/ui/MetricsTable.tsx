'use client';

import { Fragment, Key, ReactNode, useState } from 'react';
import type { SortDirection } from '../../types/sort';
import { SortIndicator, getSortIndicatorAriaSort } from './SortIndicator';
import TablePagination from './TablePagination';
import { cn } from '../../utils/cn';
import styles from './MetricsTable.module.css';

export type { SortDirection };

export interface SortState {
  field: string;
  direction: SortDirection;
}

export interface TableColumn<T> {
  id: string;
  header: ReactNode;
  accessor?: keyof T;
  renderCell?: (item: T, index: number) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface MetricsTableProps<T> {
  data: ReadonlyArray<T>;
  columns: ReadonlyArray<TableColumn<T>>;
  sortState?: SortState;
  onSortChange?: (next: SortState) => void;
  rowClassName?: (item: T, index: number) => string | undefined;
  tableClassName?: string;
  tableContainerClassName?: string;
  theadClassName?: string;
  tbodyClassName?: string;
  onRowClick?: (item: T, index: number) => void;
  getRowKey?: (item: T, index: number) => Key;
  renderExpandedRow?: (item: T, index: number) => ReactNode;
  /** When set, paginates rows and resets to the first page when data changes. */
  pageSize?: number;
  itemLabel?: string;
  /** Content rendered when data is empty. */
  emptyState?: ReactNode;
}

export function MetricsTable<T>({
  data,
  columns,
  sortState,
  onSortChange,
  rowClassName,
  tableClassName,
  tableContainerClassName,
  theadClassName,
  tbodyClassName,
  onRowClick,
  getRowKey,
  renderExpandedRow,
  pageSize,
  itemLabel = 'items',
  emptyState,
}: MetricsTableProps<T>) {
  const headerBaseClass = 'px-6 py-3 text-left';
  const cellBaseClass = cn(styles.defaultCell, 'px-6 py-4 whitespace-nowrap');

  const [pagination, setPagination] = useState({ data, pageSize, page: 1 });
  if (pageSize !== undefined && (!Number.isSafeInteger(pageSize) || pageSize < 1)) {
    throw new Error('Table page size must be a positive safe integer.');
  }
  const dataChanged = pagination.data !== data || pagination.pageSize !== pageSize;
  if (dataChanged) {
    setPagination({ data, pageSize, page: 1 });
  }
  const pageCount = pageSize === undefined ? 1 : Math.max(1, Math.ceil(data.length / pageSize));
  const currentPage = dataChanged ? 1 : Math.min(pagination.page, pageCount);
  const pageStart = pageSize === undefined ? 0 : (currentPage - 1) * pageSize;
  const visibleItems = pageSize === undefined
    ? data
    : data.slice(pageStart, pageStart + pageSize);

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const table = (
    <table
      className={cn(styles.table, tableClassName ?? styles.defaultTable)}
      data-component="MetricsTable"
    >
        <thead className={theadClassName ?? styles.defaultHead}>
          <tr>
            {columns.map((column) => {
              const isSortable = Boolean(onSortChange && column.sortable);
              const isActive = Boolean(sortState && sortState.field === column.id);
              const headerClassName = column.headerClassName ?? headerBaseClass;
              const ariaSortValue = isSortable
                ? getSortIndicatorAriaSort(isActive, sortState?.direction ?? 'asc')
                : undefined;

              if (!isSortable) {
                return (
                  <th key={column.id} scope="col" className={headerClassName}>
                    {column.header}
                  </th>
                );
              }

              const nextDirection: SortDirection = isActive && sortState?.direction === 'asc' ? 'desc' : 'asc';

              const isRightAligned = headerClassName.includes('text-right');

              return (
                <th key={column.id} scope="col" className={headerClassName} aria-sort={ariaSortValue}>
                  <button
                    type="button"
                    onClick={() => onSortChange?.({ field: column.id, direction: nextDirection })}
                    className={styles.sortButton}
                    data-align={isRightAligned ? 'end' : 'start'}
                  >
                    {column.header}
                    <SortIndicator active={isActive} direction={sortState?.direction ?? 'asc'} />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className={tbodyClassName ?? styles.defaultBody}>
          {visibleItems.map((item, visibleIndex) => {
            const index = pageStart + visibleIndex;
            const rowClass = rowClassName?.(item, index) ?? '';
            const rowKey = getRowKey?.(item, index) ?? index;
            const expandedRow = renderExpandedRow?.(item, index);

            return (
              <Fragment key={rowKey}>
                <tr
                  className={rowClass}
                  onClick={onRowClick ? () => onRowClick(item, index) : undefined}
                >
                  {columns.map((column) => {
                    const cellClassName = column.className ?? cellBaseClass;

                    if (column.renderCell) {
                      return (
                        <td key={column.id} className={cellClassName}>
                          {column.renderCell(item, index)}
                        </td>
                      );
                    }

                    if (column.accessor) {
                      const value = item[column.accessor];
                      return (
                        <td key={column.id} className={cellClassName}>
                          {typeof value === 'number' ? value.toLocaleString() : String(value)}
                        </td>
                      );
                    }

                    return (
                      <td key={column.id} className={cellClassName} />
                    );
                  })}
                </tr>
                {expandedRow != null && (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-4 sm:px-6">
                      {expandedRow}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
  );

  return (
    <>
      {tableContainerClassName ? (
        <div className={tableContainerClassName}>
          {table}
        </div>
      ) : table}
      {pageSize !== undefined && data.length > 0 && (
        <div className="mt-4">
          <TablePagination
            itemCount={data.length}
            currentPage={currentPage}
            itemLabel={itemLabel}
            pageSize={pageSize}
            onPageChange={page => setPagination({ data, pageSize, page })}
          />
        </div>
      )}
    </>
  );
}

export default MetricsTable;
