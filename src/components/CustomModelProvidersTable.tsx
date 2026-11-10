'use client';

import { useState } from 'react';
import type { CustomModelProviderUsage, CustomModelUsageEntry } from '../types/metrics';
import { formatNumber } from '../utils/formatters';
import { getCustomModelIcon } from './icons/ModelIcons';
import EmptyState from './ui/EmptyState';
import DisclosureSection from './ui/DisclosureSection';
import MetricsTable, { type TableColumn } from './ui/MetricsTable';
import TableCard from './ui/TableCard';
import TablePagination from './ui/TablePagination';

const numericStyles = {
  headerClassName: 'px-4 py-2 text-right',
  className: 'px-4 py-2 text-right text-sm text-default tabular-nums',
};

const PAGE_SIZE = 10;

function formatShare(interactions: number, totalInteractions: number): string {
  const share = totalInteractions > 0 ? (interactions / totalInteractions) * 100 : 0;
  if (share > 0 && share < 0.05) return '<0.1%';
  return `${share.toFixed(1)}%`;
}

export default function CustomModelProvidersTable({
  providers,
  totalInteractions,
}: {
  providers: CustomModelProviderUsage[];
  totalInteractions: number;
}) {
  const [pagination, setPagination] = useState({ providers, page: 1 });
  const dataChanged = pagination.providers !== providers;
  if (dataChanged) setPagination({ providers, page: 1 });
  const page = dataChanged ? 1 : Math.min(pagination.page, Math.max(1, Math.ceil(providers.length / PAGE_SIZE)));
  const visibleProviders = providers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const columns: TableColumn<CustomModelUsageEntry>[] = [
    {
      id: 'model',
      header: 'Model',
      renderCell: row => {
        const Icon = getCustomModelIcon(row.model);
        return (
          <span className="flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0" aria-hidden="true"><Icon /></span>
            <span className="break-words min-w-0">{row.model}</span>
          </span>
        );
      },
      headerClassName: 'px-4 py-2 text-left',
      className: 'px-4 py-2 text-sm text-default break-words',
    },
    { id: 'interactions', header: 'Interactions', renderCell: row => formatNumber(row.interactions), ...numericStyles },
    { id: 'share', header: 'Share', renderCell: row => formatShare(row.interactions, totalInteractions), ...numericStyles },
    { id: 'users', header: 'Users', renderCell: row => formatNumber(row.users), ...numericStyles },
  ];

  return (
    <TableCard
      title="Custom Model Providers"
      className="print:break-inside-avoid"
      description="Expand a provider to see its reported models. Share is the portion of all model interactions in the report, including assumed code-completion interactions, not API requests. Users are distinct and may overlap between rows. Prefixes (or URL origins) are reported labels, not proof of vendor identity or BYOK usage."
      footer={providers.length > 0 && (
        <TablePagination
          itemCount={providers.length}
          currentPage={page}
          itemLabel="providers"
          pageSize={PAGE_SIZE}
          onPageChange={nextPage => setPagination({ providers, page: nextPage })}
        />
      )}
    >
      {providers.length === 0 ? (
        <EmptyState
          heading="No custom model providers"
          description="No provider-prefixed models with interactions were found in this report."
        />
      ) : (
        <div className="px-6 py-4 space-y-3">
          {visibleProviders.map(provider => (
            <DisclosureSection
              key={provider.provider}
              defaultExpanded={false}
              containerClassName="border border-default rounded-md overflow-hidden"
              buttonClassName="flex items-center justify-between w-full px-4 py-3 bg-muted hover:bg-[var(--control-bgColor-hover)] transition-colors"
              contentClassName="border-t border-default"
              labelClassName="flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 pr-3 min-w-0"
              label={
                <>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[var(--fgColor-muted)]" aria-hidden="true" />
                    <span className="text-sm font-semibold text-default truncate" title={provider.provider}>{provider.provider}</span>{' '}
                    <span className="text-xs text-muted flex-shrink-0">
                      {provider.models.length} {provider.models.length === 1 ? 'model' : 'models'}
                    </span>{' '}
                  </span>
                  <span className="text-xs text-muted tabular-nums flex-shrink-0">
                    {formatNumber(provider.interactions)} interactions
                    <span className="text-disabled"> · </span>
                    {formatShare(provider.interactions, totalInteractions)}
                    <span className="text-disabled"> · </span>
                    {formatNumber(provider.users)} unique users
                  </span>
                </>
              }
            >
              <div role="region" aria-label={`${provider.provider} models`}>
                <MetricsTable
                  data={provider.models}
                  columns={columns}
                  getRowKey={model => model.model}
                  pageSize={provider.models.length > PAGE_SIZE ? PAGE_SIZE : undefined}
                  itemLabel={`${provider.provider} models`}
                  tableClassName="w-full"
                  tableContainerClassName="overflow-x-auto"
                  theadClassName="bg-muted border-b border-default"
                  tbodyClassName="divide-y divide-muted"
                  rowClassName={() => 'hover:bg-muted'}
                />
              </div>
            </DisclosureSection>
          ))}
        </div>
      )}
    </TableCard>
  );
}
