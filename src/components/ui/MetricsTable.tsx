import { Key, ReactNode } from 'react';
import type { SortDirection } from '../../types/sort';
import { SortIndicator, getSortIndicatorAriaSort } from './SortIndicator';

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
  theadClassName?: string;
  tbodyClassName?: string;
  onRowClick?: (item: T, index: number) => void;
  getRowKey?: (item: T, index: number) => Key;
}


export function MetricsTable<T>({
  data,
  columns,
  sortState,
  onSortChange,
  rowClassName,
  tableClassName,
  theadClassName,
  tbodyClassName,
  onRowClick,
  getRowKey,
}: MetricsTableProps<T>) {
  const headerBaseClass = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
  const cellBaseClass = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';

  return (
    <table className={tableClassName ?? 'w-full divide-y divide-gray-200'}>
      <thead className={theadClassName ?? 'bg-gray-50'}>
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
            const buttonClassName = isRightAligned
              ? 'flex items-center w-full justify-end hover:text-gray-700 focus:outline-none uppercase tracking-wider'
              : 'flex items-center hover:text-gray-700 focus:outline-none uppercase tracking-wider';

            return (
              <th key={column.id} scope="col" className={headerClassName} aria-sort={ariaSortValue}>
                <button
                  type="button"
                  onClick={() => onSortChange?.({ field: column.id, direction: nextDirection })}
                  className={buttonClassName}
                >
                  {column.header}
                  <SortIndicator active={isActive} direction={sortState?.direction ?? 'asc'} />
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className={tbodyClassName ?? 'bg-white divide-y divide-gray-200'}>
        {data.map((item, index) => {
          const rowClass = rowClassName?.(item, index) ?? '';
          const rowKey = getRowKey?.(item, index) ?? index;

          return (
            <tr
              key={rowKey}
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
          );
        })}
      </tbody>
    </table>
  );
}

export default MetricsTable;
