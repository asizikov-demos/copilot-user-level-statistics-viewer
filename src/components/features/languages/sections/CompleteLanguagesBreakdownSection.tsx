import { useMemo, useState } from 'react';
import { SegmentedControl } from '@primer/react';
import { CodeIcon } from '@primer/octicons-react';
import type { LanguageStats } from '../../../../domain/calculators/metricCalculators';
import { sortByField } from '../../../../utils/sorting';
import EmptyState from '../../../ui/EmptyState';
import MetricsTable, { type SortState as TableSortState, type TableColumn } from '../../../ui/MetricsTable';
import {
  formatAcceptanceRate,
  MAX_LANGUAGES_TO_SHOW,
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
      <h3 className="text-lg font-semibold text-default mb-4">Complete Languages Breakdown</h3>
      <div className="mb-4 max-w-full overflow-x-auto">
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
      {mode === 'normalized' && (
        <p className="text-sm text-muted mb-4">
          Across the uploaded period, generations are divided by distinct users with a reported
          language-feature entry, including zero-activity entries. Users can appear in multiple languages;
          these are not all developers coding that language. Share uses generations across all reported
          language rows, including hidden rows. A dash means the denominator is zero.
          These describe recorded activity, not weekly rates or productivity.
        </p>
      )}
      <MetricsTable
        data={sortedLanguages}
        columns={mode === 'totals' ? completeLanguagesColumns : normalizedColumns}
        sortState={tableSortState}
        onSortChange={handleTableSortChange}
        rowClassName={tableRowClassName}
        tableClassName="w-full divide-y divide-default"
        tableContainerClassName="overflow-x-auto border border-default"
        theadClassName="bg-muted"
        initialCount={MAX_LANGUAGES_TO_SHOW}
        buttonCollapsedLabel={(total) => `Show All ${total} Languages`}
        buttonExpandedLabel="Show Less"
      />

      {languages.length === 0 && (
        <EmptyState icon={CodeIcon} heading="No language data available" headingAs="h4" />
      )}
    </div>
  );
}
