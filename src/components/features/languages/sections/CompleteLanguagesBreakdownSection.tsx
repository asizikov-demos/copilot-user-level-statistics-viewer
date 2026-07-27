import { useMemo, useState } from 'react';
import type { LanguageStats } from '../../../../domain/calculators/metricCalculators';
import { sortBySelector } from '../../../../utils/sorting';
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

type SortField = 'language' | 'totalGenerations' | 'totalAcceptances' | 'totalEngagements' | 'uniqueUsers' | 'locAdded' | 'locDeleted' | 'locSuggestedToAdd' | 'locSuggestedToDelete';

export default function CompleteLanguagesBreakdownSection({
  sectionId,
  languages,
}: CompleteLanguagesBreakdownSectionProps) {
  const [tableSortState, setTableSortState] = useState<TableSortState>({
    field: 'totalEngagements',
    direction: 'desc',
  });

  const sortSelectors = useMemo<Record<SortField, (lang: LanguageStats) => string | number>>(
    () => ({
      language: (lang) => lang.language.toLowerCase(),
      totalGenerations: (lang) => lang.totalGenerations,
      totalAcceptances: (lang) => lang.totalAcceptances,
      totalEngagements: (lang) => lang.totalEngagements,
      uniqueUsers: (lang) => lang.uniqueUsers,
      locAdded: (lang) => lang.locAdded,
      locDeleted: (lang) => lang.locDeleted,
      locSuggestedToAdd: (lang) => lang.locSuggestedToAdd,
      locSuggestedToDelete: (lang) => lang.locSuggestedToDelete,
    }),
    [],
  );

  const sortedLanguages = useMemo(() => {
    const field = (tableSortState.field as SortField) || 'totalEngagements';
    const selector = sortSelectors[field];
    return sortBySelector(languages, selector, tableSortState.direction);
  }, [languages, sortSelectors, tableSortState]);

  const handleTableSortChange = (next: TableSortState) => {
    const field = (next.field as SortField) || 'totalEngagements';
    setTableSortState({ field, direction: next.direction });
  };

  const completeLanguagesColumns: TableColumn<LanguageStats>[] = [
    {
      id: 'language',
      header: 'Language',
      sortable: true,
      className: 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900',
      renderCell: (lang) => (
        <div className="text-sm font-medium text-gray-900">{lang.language}</div>
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
        const impactColor = netLocImpact > 0 ? 'text-green-600' : netLocImpact < 0 ? 'text-rose-600' : 'text-gray-500';
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
        <div className="text-sm text-gray-900">{formatAcceptanceRate(lang)}%</div>
      ),
    },
  ];

  return (
    <div id={sectionId} className="mt-6 pt-6 border-t border-gray-200 scroll-mt-28">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Languages Breakdown</h3>
      <MetricsTable
        data={sortedLanguages}
        columns={completeLanguagesColumns}
        sortState={tableSortState}
        onSortChange={handleTableSortChange}
        rowClassName={tableRowClassName}
        tableClassName="w-full divide-y divide-gray-200"
        tableContainerClassName="overflow-x-auto border border-gray-200"
        theadClassName="bg-gray-50"
        initialCount={MAX_LANGUAGES_TO_SHOW}
        buttonCollapsedLabel={(total) => `Show All ${total} Languages`}
        buttonExpandedLabel="Show Less"
      />

      {languages.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No language data available</p>
        </div>
      )}
    </div>
  );
}
