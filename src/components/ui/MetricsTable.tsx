'use client';

import { Fragment, Key, ReactNode } from 'react';
import { Button } from '@primer/react';
import { ChevronDownIcon, ChevronUpIcon } from '@primer/octicons-react';
import type { SortDirection } from '../../types/sort';
import type { ToggleCallback } from '../../types/events';
import { SortIndicator, getSortIndicatorAriaSort } from './SortIndicator';
import {
  useExpandableList,
  type ExpandableLabelResolver,
  type ExpandButtonAlignment,
  resolveExpandableToggleLabel,
} from '../../hooks/useExpandableList';
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
  /** When set, enables progressive disclosure: only this many rows are shown initially. */
  initialCount?: number;
  defaultExpanded?: boolean;
  buttonCollapsedLabel?: ExpandableLabelResolver;
  buttonExpandedLabel?: ExpandableLabelResolver;
  buttonClassName?: string;
  buttonContainerClassName?: string;
  buttonAlignment?: ExpandButtonAlignment;
  buttonAriaLabel?: string;
  buttonTestId?: string;
  onToggle?: ToggleCallback;
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
  initialCount,
  defaultExpanded = false,
  buttonCollapsedLabel,
  buttonExpandedLabel,
  buttonClassName,
  buttonContainerClassName,
  buttonAlignment = 'center',
  buttonAriaLabel,
  buttonTestId,
  onToggle,
  emptyState,
}: MetricsTableProps<T>) {
  const headerBaseClass = 'px-6 py-3 text-left';
  const cellBaseClass = cn(styles.defaultCell, 'px-6 py-4 whitespace-nowrap');

  const resolvedInitialCount = initialCount ?? data.length;
  const {
    visibleItems,
    isExpanded,
    canExpand,
    totalCount,
    toggleExpanded,
  } = useExpandableList(data as T[], resolvedInitialCount, { defaultExpanded, onToggle });

  const toggleLabel = resolveExpandableToggleLabel(
    isExpanded,
    totalCount,
    buttonCollapsedLabel,
    buttonExpandedLabel,
  );

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
          {visibleItems.map((item, index) => {
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
      {canExpand && (
        <div
          className={cn(styles.expandContainer, buttonContainerClassName ?? 'mt-4')}
          data-align={buttonAlignment}
        >
          <Button
            type="button"
            onClick={toggleExpanded}
            className={buttonClassName}
            trailingVisual={isExpanded ? ChevronUpIcon : ChevronDownIcon}
            aria-expanded={isExpanded}
            aria-label={buttonAriaLabel ?? toggleLabel}
            data-testid={buttonTestId}
          >
            {toggleLabel}
          </Button>
        </div>
      )}
    </>
  );
}

export default MetricsTable;
