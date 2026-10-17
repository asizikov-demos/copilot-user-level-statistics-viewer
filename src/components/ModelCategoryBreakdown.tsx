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

const HEADER_CLASS = 'px-4 py-2 text-left text-xs font-medium text-muted uppercase tracking-wider';
const NUMERIC_HEADER_CLASS = 'px-4 py-2 text-right text-xs font-medium text-muted uppercase tracking-wider';
const CELL_CLASS = 'px-4 py-2 whitespace-nowrap text-sm text-default';
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
    <div className="bg-default rounded-md border border-default print:border-default print:break-inside-avoid">
      <div className="px-6 py-4 border-b border-default">
        <h3 className="text-lg font-semibold text-default">Models by Category</h3>
        <p className="text-sm text-muted mt-1">
          Expand a category to see which models it covers. Share is the model&apos;s portion of all
          user-initiated interactions in the report.
        </p>
      </div>
      <div className="px-6 py-4 space-y-3">
        {categoryTables.map(table => (
          <DisclosureSection
            key={table.category}
            defaultExpanded={false}
            containerClassName="border border-default rounded-md overflow-hidden"
            buttonClassName="flex items-center justify-between w-full px-4 py-3 bg-muted hover:bg-[var(--control-bgColor-hover)] transition-colors"
            contentClassName="border-t border-default"
            labelClassName="flex flex-1 items-center justify-between gap-4 pr-3 min-w-0"
            label={
              <>
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: modelCategoryColors[table.category].solid }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-default truncate">{table.category}</span>
                  <span className="text-xs text-muted flex-shrink-0">
                    {table.rows.length} {table.rows.length === 1 ? 'model' : 'models'}
                  </span>
                </span>
                <span className="text-xs text-muted tabular-nums flex-shrink-0">
                  {formatNumber(table.interactions)} interactions
                  <span className="text-disabled"> · </span>
                  {formatShare(table.sharePercentage)}
                  <span className="text-disabled"> · </span>
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
              theadClassName="bg-muted border-b border-default"
              tbodyClassName="divide-y divide-muted"
              rowClassName={() => 'hover:bg-muted'}
            />
          </DisclosureSection>
        ))}
      </div>
    </div>
  );
}
