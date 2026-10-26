'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, FormControl, Pagination, Select, TextInput } from '@primer/react';
import { FilterIcon, SearchIcon } from '@primer/octicons-react';
import { Bar } from 'react-chartjs-2';
import { registerChartJS } from '../../charts/utils/chartSetup';
import { createBaseChartOptions, yAxisFormatters } from '../../charts/utils/chartOptions';
import { createBarDataset } from '../../charts/utils/chartStyles';
import { formatShortDate } from '../../../utils/formatters';
import { useSortableTable } from '../../../hooks/useSortableTable';
import MetricsTable, { type TableColumn } from '../../ui/MetricsTable';
import EmptyState from '../../ui/EmptyState';
import type { CustomizationsReadModel } from '../../../read-models/customizations';
import { CUSTOMIZATION_TYPES, type CustomizationItemStats, type CustomizationType } from '../../../types/customizationsOverview';
import { CUSTOMIZATION_META } from './meta';
import { Sparkline, formatNumber, formatPercent } from './shared';

registerChartJS();

const PAGE_SIZE = 20;

interface ExplorerRow extends CustomizationItemStats {
  category: CustomizationType;
  categoryTitle: string;
  perUser: number;
}

type SortField = 'name' | 'categoryTitle' | 'totalEvents' | 'users' | 'activeDays' | 'perUser';

function ItemDetails({ row, days }: { row: ExplorerRow; days: string[] }) {
  const color = CUSTOMIZATION_META[row.category].color.solid;
  const data = {
    labels: days.map(formatShortDate),
    datasets: [createBarDataset(color, CUSTOMIZATION_META[row.category].measure, row.dailyEvents)],
  };
  const options = createBaseChartOptions({ yTicksCallback: yAxisFormatters.localeNumber, xMaxRotation: 45, xAutoSkip: true, showLegend: false });
  const top = Math.max(row.topUsers[0]?.events ?? 1, 1);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div>
        <h4 className="mb-2 mt-0 text-sm font-semibold text-default">Daily {CUSTOMIZATION_META[row.category].measure}</h4>
        <div className="h-48"><Bar data={data} options={options} /></div>
      </div>
      <div>
        <h4 className="mb-2 mt-0 text-sm font-semibold text-default">Heaviest users</h4>
        <ol className="m-0 list-none space-y-1 p-0">
          {row.topUsers.slice(0, 8).map(u => (
            <li key={u.login} className="flex items-center gap-3 text-sm">
              <span className="w-36 truncate text-default">{u.login}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bgColor-muted)]">
                <span className="block h-full rounded-full" style={{ width: `${(u.events / top) * 100}%`, background: color }} />
              </span>
              <span className="w-12 text-right tabular-nums text-muted">{formatNumber(u.events)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Searchable, sortable, paginated table of every customization item; rows expand for details. */
export default function ExplorerTable({ model }: { model: CustomizationsReadModel }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CustomizationType | 'all'>('all');
  const [includeUnnamed, setIncludeUnnamed] = useState(false);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const all = useMemo<ExplorerRow[]>(
    () => CUSTOMIZATION_TYPES.flatMap(c =>
      model.types[c].items.map(item => ({
        ...item,
        category: c,
        categoryTitle: CUSTOMIZATION_META[c].title,
        perUser: item.totalEvents / Math.max(item.users, 1),
      })),
    ),
    [model],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(r => (includeUnnamed || !r.unnamed) && (category === 'all' || r.category === category) && (!q || r.name.toLowerCase().includes(q)));
  }, [all, query, category, includeUnnamed]);

  const { sortField, sortDirection, sortedItems, handleSort } = useSortableTable<ExplorerRow, SortField>(filtered, 'totalEvents', 'desc');
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const paged = useMemo(() => sortedItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sortedItems, page]);
  const pageStart = sortedItems.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, sortedItems.length);
  const rowKey = (r: ExplorerRow) => `${r.category}:${r.name}`;

  useEffect(() => { setPage(1); setExpanded(null); }, [query, category, includeUnnamed, sortField, sortDirection, model]);
  useEffect(() => { setPage(p => Math.min(p, totalPages)); }, [totalPages]);

  const hasFilters = query !== '' || category !== 'all' || includeUnnamed;
  const numeric = { headerClassName: 'px-6 py-3 text-right', className: 'px-6 py-3 text-right text-sm tabular-nums text-default whitespace-nowrap' };

  const columns: TableColumn<ExplorerRow>[] = [
    {
      id: 'name',
      header: 'Name',
      sortable: true,
      className: 'px-6 py-3 text-sm text-default break-words',
      renderCell: r => (
        <>
          <span className="font-medium">{r.name}</span>
          {r.unnamed && <span className="text-muted">{r.name === 'other' ? ' (custom / private)' : ' (names hidden)'}</span>}
        </>
      ),
    },
    {
      id: 'categoryTitle',
      header: 'Type',
      sortable: true,
      className: 'px-6 py-3 text-sm whitespace-nowrap',
      renderCell: r => (
        <span className="inline-flex items-center gap-2 text-default">
          <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: CUSTOMIZATION_META[r.category].color.solid }} />
          {CUSTOMIZATION_META[r.category].singular}
        </span>
      ),
    },
    { id: 'totalEvents', header: 'Events', sortable: true, renderCell: r => formatNumber(r.totalEvents), ...numeric },
    { id: 'users', header: 'Users', sortable: true, renderCell: r => `${formatNumber(r.users)} (${formatPercent((r.users / model.totalUsers) * 100)})`, ...numeric },
    { id: 'activeDays', header: 'Active days', sortable: true, renderCell: r => `${r.activeDays} / ${model.dates.length}`, ...numeric },
    { id: 'perUser', header: 'Per user', sortable: true, renderCell: r => formatNumber(r.perUser), ...numeric },
    {
      id: 'trend',
      header: 'Trend',
      headerClassName: 'px-6 py-3 text-right',
      className: 'px-6 py-3 text-right',
      renderCell: r => <Sparkline values={r.dailyEvents} width={80} height={22} color={CUSTOMIZATION_META[r.category].color.solid} />,
    },
  ];

  return (
    <section aria-labelledby="explorer-heading" className="space-y-4 border-t border-default pt-6">
      <div>
        <h2 id="explorer-heading" className="m-0 text-xl font-semibold text-default">Explorer</h2>
        <p className="mt-1 text-sm text-muted">Every reported customization. Click a row for its daily activity and heaviest users.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.3fr)_auto_auto] md:items-end">
        <FormControl id="customizationSearch">
          <FormControl.Label>Search by name</FormControl.Label>
          <TextInput block type="search" leadingVisual={SearchIcon} value={query} onChange={e => setQuery(e.target.value)} placeholder="Start typing a name..." />
        </FormControl>
        <FormControl id="customizationType">
          <FormControl.Label>Type</FormControl.Label>
          <Select block value={category} onChange={e => setCategory(e.target.value as CustomizationType | 'all')}>
            <Select.Option value="all">All types</Select.Option>
            {CUSTOMIZATION_TYPES.map(c => <Select.Option key={c} value={c}>{CUSTOMIZATION_META[c].title}</Select.Option>)}
          </Select>
        </FormControl>
        <label className="flex items-center gap-2 pb-2 text-sm text-default">
          <input type="checkbox" checked={includeUnnamed} onChange={e => setIncludeUnnamed(e.target.checked)} />
          Include unnamed buckets
        </label>
        <Button onClick={() => { setQuery(''); setCategory('all'); setIncludeUnnamed(false); }} disabled={!hasFilters}>Clear</Button>
      </div>
      <p className="m-0 text-sm text-muted">Showing {sortedItems.length.toLocaleString()} of {all.filter(r => includeUnnamed || !r.unnamed).length.toLocaleString()} items</p>
      <div className="overflow-x-auto border border-default bg-default">
        <MetricsTable<ExplorerRow>
          data={paged}
          columns={columns}
          sortState={{ field: sortField as string, direction: sortDirection }}
          onSortChange={({ field }) => handleSort(field as SortField)}
          getRowKey={rowKey}
          rowClassName={() => 'hover:bg-muted cursor-pointer transition-colors'}
          tableClassName="w-full divide-y divide-default"
          theadClassName="bg-muted"
          onRowClick={r => setExpanded(prev => (prev === rowKey(r) ? null : rowKey(r)))}
          renderExpandedRow={r => (expanded === rowKey(r) ? <ItemDetails row={r} days={model.dates} /> : null)}
        />
      </div>
      {sortedItems.length > PAGE_SIZE && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-sm text-muted">Showing {pageStart.toLocaleString()}-{pageEnd.toLocaleString()} of {sortedItems.length.toLocaleString()} items</p>
          <Pagination pageCount={totalPages} currentPage={page} onPageChange={(e, p) => { e.preventDefault(); setPage(p); }} />
        </div>
      )}
      {sortedItems.length === 0 && (
        <EmptyState icon={FilterIcon} heading="No items match the filters" description="Try a different search or clear the filters." />
      )}
    </section>
  );
}
