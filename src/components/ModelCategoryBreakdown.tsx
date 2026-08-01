'use client';

import type { ModelCategoryDetailRow } from '../types/metrics';
import type { ModelCategoryTable } from '../read-models/models';
import { formatNumber } from '../utils/formatters';
import { modelCategoryColors } from './charts/utils/chartColors';
import { getModelIcon } from './icons/ModelIcons';
import DisclosureSection from './ui/DisclosureSection';
import MetricsTable, { TableColumn } from './ui/MetricsTable';

interface ModelCategoryBreakdownProps {
  categoryTables: ModelCategoryTable[];
}

const HEADER_CLASS = 'px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
const NUMERIC_HEADER_CLASS = 'px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider';
const CELL_CLASS = 'px-4 py-2 whitespace-nowrap text-sm text-gray-900';
const NUMERIC_CELL_CLASS = `${CELL_CLASS} text-right tabular-nums`;

/** Keeps sub-0.05% models from all rendering as an indistinguishable "0.0%". */
function formatShare(share: number): string {
  if (share > 0 && share < 0.05) return '<0.1%';
  return `${share.toFixed(1)}%`;
}

const columns: TableColumn<ModelCategoryDetailRow>[] = [
  {
    id: 'displayName',
    header: 'Model',
    renderCell: (row) => {
      const Icon = getModelIcon(row.model);
      return (
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0" aria-hidden="true">
            <Icon />
          </span>
          <span className="truncate" title={row.model}>{row.displayName}</span>
        </div>
      );
    },
    className: `${CELL_CLASS} max-w-xs`,
    headerClassName: HEADER_CLASS,
  },
  {
    id: 'interactions',
    header: 'Interactions',
    renderCell: (row) => formatNumber(row.interactions),
    className: NUMERIC_CELL_CLASS,
    headerClassName: NUMERIC_HEADER_CLASS,
  },
  {
    id: 'sharePercentage',
    header: 'Share',
    renderCell: (row) => formatShare(row.sharePercentage),
    className: NUMERIC_CELL_CLASS,
    headerClassName: NUMERIC_HEADER_CLASS,
  },
  {
    id: 'users',
    header: 'Users',
    renderCell: (row) => formatNumber(row.users),
    className: NUMERIC_CELL_CLASS,
    headerClassName: NUMERIC_HEADER_CLASS,
  },
];

export default function ModelCategoryBreakdown({ categoryTables }: ModelCategoryBreakdownProps) {
  if (categoryTables.length === 0) return null;

  return (
    <div className="bg-white rounded-md border border-[#d1d9e0] print:border-gray-300 print:break-inside-avoid">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Models by Category</h3>
        <p className="text-sm text-gray-600 mt-1">
          Expand a category to see which models it covers. Share is the model&apos;s portion of all
          user-initiated interactions in the report.
        </p>
      </div>
      <div className="px-6 py-4 space-y-3">
        {categoryTables.map(table => (
          <DisclosureSection
            key={table.category}
            defaultExpanded={false}
            containerClassName="border border-gray-200 rounded-md overflow-hidden"
            buttonClassName="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            contentClassName="border-t border-gray-200"
            labelClassName="flex flex-1 items-center justify-between gap-4 pr-3 min-w-0"
            label={
              <>
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: modelCategoryColors[table.category].solid }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-gray-900 truncate">{table.category}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {table.rows.length} {table.rows.length === 1 ? 'model' : 'models'}
                  </span>
                </span>
                <span className="text-xs text-gray-600 tabular-nums flex-shrink-0">
                  {formatNumber(table.interactions)} interactions
                  <span className="text-gray-400"> · </span>
                  {formatShare(table.sharePercentage)}
                  <span className="text-gray-400"> · </span>
                  {formatNumber(table.users)} unique users
                </span>
              </>
            }
          >
            <MetricsTable
              data={table.rows}
              columns={columns}
              getRowKey={(row) => row.model}
              tableClassName="w-full"
              tableContainerClassName="overflow-x-auto"
              theadClassName="bg-gray-50 border-b border-gray-200"
              tbodyClassName="divide-y divide-gray-100"
              rowClassName={() => 'hover:bg-gray-50'}
            />
          </DisclosureSection>
        ))}
      </div>
    </div>
  );
}
