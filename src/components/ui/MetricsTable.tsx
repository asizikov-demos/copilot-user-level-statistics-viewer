import { Key, ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc';

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

function SortIndicator({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) {
    return (
      <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }

  return direction === 'asc' ? (
    <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4l9 16 9-16H3z" />
    </svg>
  ) : (
    <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 20L12 4 3 20h18z" />
    </svg>
  );
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
              ? (isActive ? (sortState?.direction === 'asc' ? 'ascending' : 'descending') : 'none')
              : undefined;

            if (!isSortable) {
              return (
                <th key={column.id} scope="col" className={headerClassName}>
                  {column.header}
                </th>
              );
            }

            const nextDirection: SortDirection = isActive && sortState?.direction === 'asc' ? 'desc' : 'asc';

            return (
              <th key={column.id} scope="col" className={headerClassName} aria-sort={ariaSortValue}>
                <button
                  type="button"
                  onClick={() => onSortChange?.({ field: column.id, direction: nextDirection })}
                  className="flex items-center hover:text-gray-700 focus:outline-none"
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
