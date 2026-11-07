import { useEffect, useMemo, useState } from 'react';
import { SegmentedControl } from '@primer/react';
import { CodeIcon } from '@primer/octicons-react';
import type { LanguageStats } from '../../../../domain/calculators/metricCalculators';
import { sortByField } from '../../../../utils/sorting';
import EmptyState from '../../../ui/EmptyState';
import MetricsTable, { type SortState as TableSortState, type TableColumn } from '../../../ui/MetricsTable';
import TableCard from '../../../ui/TableCard';
import TablePagination from '../../../ui/TablePagination';
import {
  formatAcceptanceRate,
  LANGUAGES_PER_PAGE,
  tableRowClassName,
  wideCellRightClassName,
  wideHeaderRightClassName,
} from './languageTableUtils';

interface CompleteLanguagesBreakdownSectionProps {
  sectionId: string;
  languages: LanguageStats[];
}

type BreakdownMode = 'totals' | 'normalized';
const BREAKDOWN_MODES: readonly BreakdownMode[] = ['totals', 'normalized'];
type SortField = keyof LanguageStats;

export default function CompleteLanguagesBreakdownSection({
  sectionId,
  languages,
}: CompleteLanguagesBreakdownSectionProps) {
  const [mode, setMode] = useState<BreakdownMode>('totals');
  const [totalsSortState, setTotalsSortState] = useState<TableSortState>({
    field: 'totalEngagements',
    direction: 'desc',
  });

  const [normalizedSortState, setNormalizedSortState] = useState<TableSortState>({
    field: 'generationsPerUser',
    direction: 'desc',
  });
  const tableSortState = mode === 'totals' ? totalsSortState : normalizedSortState;

  const sortedLanguages = useMemo(() => {
    return sortByField(languages, tableSortState.field as SortField, tableSortState.direction);
  }, [languages, tableSortState]);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [sortedLanguages]);
  const pageCount = Math.max(1, Math.ceil(sortedLanguages.length / LANGUAGES_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pagedLanguages = sortedLanguages.slice(
    (currentPage - 1) * LANGUAGES_PER_PAGE,
    currentPage * LANGUAGES_PER_PAGE,
  );

  const handleTableSortChange = (next: TableSortState) => {
    if (mode === 'totals') {
      setTotalsSortState(next);
    } else {
      setNormalizedSortState(next);
    }
  };

  const completeLanguagesColumns: TableColumn<LanguageStats>[] = [
    {
      id: 'language',
      header: 'Language',
      sortable: true,
      className: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-default',
      renderCell: (lang) => (
        <div className="text-sm font-medium text-default">{lang.language}</div>
      ),
    },
    {
      id: 'totalEngagements',
      header: 'Total Engagements',
      sortable: true,
      accessor: 'totalEngagements',
      headerClassName: wideHeaderRightClassName,
      className: wideCellRightClassName,
    },
    {
      id: 'totalGenerations',
      header: 'Generations',
      sortable: true,
      accessor: 'totalGenerations',
      headerClassName: wideHeaderRightClassName,
      className: wideCellRightClassName,
    },
    {
      id: 'totalAcceptances',
      header: 'Acceptances',
      sortable: true,
      accessor: 'totalAcceptances',
      headerClassName: wideHeaderRightClassName,
      className: wideCellRightClassName,
    },
    {
      id: 'uniqueUsers',
      header: 'Unique Users',
      sortable: true,
      accessor: 'uniqueUsers',
      headerClassName: wideHeaderRightClassName,
      className: wideCellRightClassName,
    },
    {
      id: 'locAdded',
      header: 'LOC Added',
      sortable: true,
      accessor: 'locAdded',
      headerClassName: wideHeaderRightClassName,
      className: wideCellRightClassName,
    },
    {
      id: 'locDeleted',
      header: 'LOC Deleted',
      sortable: true,
      accessor: 'locDeleted',
      headerClassName: wideHeaderRightClassName,
      className: wideCellRightClassName,
    },
    {
      id: 'locSuggestedToAdd',
      header: 'Suggested Add',
      sortable: true,
      accessor: 'locSuggestedToAdd',
      headerClassName: wideHeaderRightClassName,
      className: wideCellRightClassName,
    },
    {
      id: 'netLocImpact',
      header: 'Net LOC Impact',
      headerClassName: wideHeaderRightClassName,
      className: wideCellRightClassName,
      renderCell: (lang) => {
        const netLocImpact = lang.locAdded - lang.locDeleted;
        const impactColor = netLocImpact > 0 ? 'text-success' : netLocImpact < 0 ? 'text-danger' : 'text-muted';
        return (
          <div className={`text-sm font-medium ${impactColor}`}>
            {netLocImpact.toLocaleString()}
          </div>
        );
      },
    },
    {
      id: 'acceptanceRate',
      header: 'Acceptance Rate',
      headerClassName: wideHeaderRightClassName,
      className: wideCellRightClassName,
      renderCell: (lang) => (
        <div className="text-sm text-default">{formatAcceptanceRate(lang)}%</div>
      ),
    },
  ];

  const normalizedColumns: TableColumn<LanguageStats>[] = [
    completeLanguagesColumns[0],
    {
      id: 'uniqueUsers',
      header: 'Observed Language Users',
      sortable: true,
      accessor: 'uniqueUsers',
      headerClassName: wideHeaderRightClassName,
      className: wideCellRightClassName,
    },
    completeLanguagesColumns[2],
    {
      id: 'generationsPerUser',
      header: 'Generations / Observed User',
      sortable: true,
      headerClassName: wideHeaderRightClassName,
      className: wideCellRightClassName,
      renderCell: (lang) => lang.generationsPerUser == null
        ? '-'
        : lang.generationsPerUser.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }),
    },
    {
      id: 'generationShare',
      header: 'Share of Language Generations',
      sortable: true,
      headerClassName: wideHeaderRightClassName,
      className: wideCellRightClassName,
      renderCell: (lang) => lang.generationShare == null
        ? '-'
        : lang.generationShare.toLocaleString(undefined, { style: 'percent', maximumFractionDigits: 1 }),
    },
  ];

  return (
    <div id={sectionId} className="mt-6 pt-6 border-t border-default scroll-mt-28">
      <TableCard
        title="Complete Languages Breakdown"
        headerActions={
          <div className="max-w-full overflow-x-auto">
            <SegmentedControl
              aria-label="Language breakdown view"
              onChange={(selectedIndex) => setMode(BREAKDOWN_MODES[selectedIndex] ?? 'totals')}
            >
              {BREAKDOWN_MODES.map((view) => (
                <SegmentedControl.Button key={view} selected={mode === view}>
                  {view === 'totals' ? 'Totals' : 'Normalized'}
                </SegmentedControl.Button>
              ))}
            </SegmentedControl>
          </div>
        }
        description={
          <>
            <p>Switch between language totals and normalized per-user metrics.</p>
            {mode === 'normalized' && (
              <p>
                Across the uploaded period, generations are divided by distinct users with a reported
                language-feature entry, including zero-activity entries. Users can appear in multiple languages;
                these are not all developers coding that language. Share uses generations across all reported
                language rows, including hidden rows. A dash means the denominator is zero.
                These describe recorded activity, not weekly rates or productivity.
              </p>
            )}
          </>
        }
        footer={sortedLanguages.length > 0 ? (
          <TablePagination
            itemCount={sortedLanguages.length}
            currentPage={currentPage}
            pageSize={LANGUAGES_PER_PAGE}
            itemLabel="languages"
            onPageChange={setPage}
          />
        ) : null}
      >
        <MetricsTable
          data={pagedLanguages}
          columns={mode === 'totals' ? completeLanguagesColumns : normalizedColumns}
          sortState={tableSortState}
          onSortChange={handleTableSortChange}
          rowClassName={tableRowClassName}
          tableClassName="w-full divide-y divide-default"
          tableContainerClassName="overflow-x-auto"
          theadClassName="bg-muted"
          getRowKey={lang => lang.language}
        />

        {languages.length === 0 && (
          <EmptyState icon={CodeIcon} heading="No language data available" headingAs="h4" />
        )}
      </TableCard>
    </div>
  );
}
