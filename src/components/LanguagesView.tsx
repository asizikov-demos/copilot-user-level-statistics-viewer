'use client';

import { LanguageStats } from '../domain/calculators/metricCalculators';
import { useMemo, useState } from 'react';
import ExpandableTableSection from './ui/ExpandableTableSection';
import MetricsTable, { SortDirection, SortState as TableSortState, TableColumn } from './ui/MetricsTable';
import { DashboardStatsCardGroup, ViewPanel } from './ui';
import type { VoidCallback } from '../types/events';

interface LanguagesViewProps {
  languages: LanguageStats[];
  onBack: VoidCallback;
}

type SortField = 'language' | 'totalGenerations' | 'totalAcceptances' | 'totalEngagements' | 'uniqueUsers' | 'locAdded' | 'locDeleted' | 'locSuggestedToAdd' | 'locSuggestedToDelete';

const compareSortableValues = (a: string | number, b: string | number, direction: SortDirection) => {
  if (typeof a === 'string' && typeof b === 'string') {
    const result = a.localeCompare(b);
    return direction === 'asc' ? result : -result;
  }

  const aNumber = Number(a);
  const bNumber = Number(b);

  if (aNumber === bNumber) {
    return 0;
  }

  if (direction === 'asc') {
    return aNumber < bNumber ? -1 : 1;
  }

  return aNumber > bNumber ? -1 : 1;
};

const formatAcceptanceRate = (lang: LanguageStats) => {
  return lang.totalGenerations > 0
    ? ((lang.totalAcceptances / lang.totalGenerations) * 100).toFixed(1)
    : '0.0';
};

export default function LanguagesView({ languages, onBack }: LanguagesViewProps) {
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
    const direction = tableSortState.direction;

    return [...languages].sort((a, b) => {
      const aVal = selector(a);
      const bVal = selector(b);
      return compareSortableValues(aVal, bVal, direction);
    });
  }, [languages, sortSelectors, tableSortState]);

  const handleTableSortChange = (next: TableSortState) => {
    const field = (next.field as SortField) || 'totalEngagements';
    setTableSortState({ field, direction: next.direction });
  };

  // Calculate summary statistics
  const totalLanguages = languages.length;
  const totalGenerations = languages.reduce((sum, lang) => sum + lang.totalGenerations, 0);
  const totalAcceptances = languages.reduce((sum, lang) => sum + lang.totalAcceptances, 0);
  const totalEngagements = languages.reduce((sum, lang) => sum + lang.totalEngagements, 0);
  const totalUsers = Math.max(...languages.map(lang => lang.uniqueUsers), 0);
  const totalLocAdded = languages.reduce((sum, lang) => sum + lang.locAdded, 0);
  const totalLocDeleted = languages.reduce((sum, lang) => sum + lang.locDeleted, 0);

  const totalNetLocImpact = totalLocAdded - totalLocDeleted;

  const netLocImpactAccent: 'green' | 'rose' = totalNetLocImpact >= 0 ? 'green' : 'rose';

  const summaryCards = [
    {
      value: totalLanguages,
      label: 'Total Languages',
      accent: 'blue' as const,
    },
    {
      value: totalEngagements,
      label: 'Total Engagements',
      accent: 'purple' as const,
    },
    {
      value: totalGenerations,
      label: 'Code Generations',
      accent: 'green' as const,
    },
    {
      value: totalAcceptances,
      label: 'Code Acceptances',
      accent: 'orange' as const,
    },
    {
      value: totalUsers,
      label: 'Max Users/Lang',
      accent: 'teal' as const,
    },
    {
      value: totalLocAdded,
      label: 'LOC Added',
      accent: 'orange' as const,
    },
    {
      value: totalLocDeleted,
      label: 'LOC Deleted',
      accent: 'rose' as const,
    },
    {
      value: totalNetLocImpact,
      label: 'Net LOC Impact',
      accent: netLocImpactAccent,
    },
  ];

  // Create sorted lists for the two tables
  const languagesByGenerations = useMemo(
    () => [...languages].sort((a, b) => b.totalGenerations - a.totalGenerations),
    [languages],
  );

  const languagesByUsers = useMemo(
    () => [...languages].sort((a, b) => b.uniqueUsers - a.uniqueUsers),
    [languages],
  );

  const languagesByNetLocImpact = useMemo(
    () => [...languages].sort((a, b) => (b.locAdded - b.locDeleted) - (a.locAdded - a.locDeleted)),
    [languages],
  );

  const generationRankMap = useMemo(() => {
    const map = new Map<string, number>();
    languagesByGenerations.forEach((lang, index) => {
      map.set(lang.language, index + 1);
    });
    return map;
  }, [languagesByGenerations]);

  const userRankMap = useMemo(() => {
    const map = new Map<string, number>();
    languagesByUsers.forEach((lang, index) => {
      map.set(lang.language, index + 1);
    });
    return map;
  }, [languagesByUsers]);

  const netImpactRankMap = useMemo(() => {
    const map = new Map<string, number>();
    languagesByNetLocImpact.forEach((lang, index) => {
      map.set(lang.language, index + 1);
    });
    return map;
  }, [languagesByNetLocImpact]);

  const narrowHeaderClassName = 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
  const narrowCellClassName = 'px-4 py-4 whitespace-nowrap text-sm text-gray-900';
  const wideCellClassName = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';

  const languagesByGenerationsColumns: TableColumn<LanguageStats>[] = [
    {
      id: 'language',
      header: 'Language',
      headerClassName: narrowHeaderClassName,
      className: narrowCellClassName,
      renderCell: (lang) => {
        const rank = generationRankMap.get(lang.language) ?? '-';
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-8 w-8 mr-3">
              <div className="h-8 w-8 rounded bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                {rank}
              </div>
            </div>
            <div className="text-sm font-medium text-gray-900">{lang.language}</div>
          </div>
        );
      },
    },
    {
      id: 'generations',
      header: 'Generations',
      headerClassName: narrowHeaderClassName,
      className: narrowCellClassName,
      renderCell: (lang) => (
        <div className="text-sm text-gray-900">{lang.totalGenerations.toLocaleString()}</div>
      ),
    },
    {
      id: 'acceptanceRate',
      header: 'Acceptance Rate',
      headerClassName: narrowHeaderClassName,
      className: narrowCellClassName,
      renderCell: (lang) => (
        <div className="text-sm text-gray-900">{formatAcceptanceRate(lang)}%</div>
      ),
    },
  ];

  const languagesByUsersColumns: TableColumn<LanguageStats>[] = [
    {
      id: 'language',
      header: 'Language',
      headerClassName: narrowHeaderClassName,
      className: narrowCellClassName,
      renderCell: (lang) => {
        const rank = userRankMap.get(lang.language) ?? '-';
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-8 w-8 mr-3">
              <div className="h-8 w-8 rounded bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                {rank}
              </div>
            </div>
            <div className="text-sm font-medium text-gray-900">{lang.language}</div>
          </div>
        );
      },
    },
    {
      id: 'users',
      header: 'Users',
      headerClassName: narrowHeaderClassName,
      className: narrowCellClassName,
      renderCell: (lang) => (
        <div className="text-sm text-gray-900">{lang.uniqueUsers.toLocaleString()}</div>
      ),
    },
    {
      id: 'avgEngagements',
      header: 'Avg Engagements',
      headerClassName: narrowHeaderClassName,
      className: narrowCellClassName,
      renderCell: (lang) => {
        const avgEngagements = lang.uniqueUsers > 0
          ? (lang.totalEngagements / lang.uniqueUsers).toFixed(1)
          : '0.0';
        return <div className="text-sm text-gray-900">{avgEngagements}</div>;
      },
    },
  ];

  const languagesByNetImpactColumns: TableColumn<LanguageStats>[] = [
    {
      id: 'rank',
      header: 'Rank',
      headerClassName: narrowHeaderClassName,
      className: narrowCellClassName,
      renderCell: (lang) => {
        const rank = netImpactRankMap.get(lang.language);
        return <div className="text-sm font-medium text-gray-900">{rank ?? '–'}</div>;
      },
    },
    {
      id: 'language',
      header: 'Language',
      headerClassName: narrowHeaderClassName,
      className: narrowCellClassName,
      renderCell: (lang) => (
        <div className="text-sm font-medium text-gray-900">{lang.language}</div>
      ),
    },
    {
      id: 'netImpact',
      header: 'Net LOC Impact',
      headerClassName: narrowHeaderClassName,
      className: narrowCellClassName,
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
      id: 'totalGenerations',
      header: 'Total Generations',
      headerClassName: narrowHeaderClassName,
      className: narrowCellClassName,
      renderCell: (lang) => (
        <div className="text-sm text-gray-900">{lang.totalGenerations.toLocaleString()}</div>
      ),
    },
    {
      id: 'acceptanceRate',
      header: 'Acceptance Rate',
      headerClassName: narrowHeaderClassName,
      className: narrowCellClassName,
      renderCell: (lang) => (
        <div className="text-sm text-gray-900">{formatAcceptanceRate(lang)}%</div>
      ),
    },
  ];

  const tableRowClassName = () => 'hover:bg-gray-50';

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
      className: wideCellClassName,
    },
    {
      id: 'totalGenerations',
      header: 'Generations',
      sortable: true,
      accessor: 'totalGenerations',
      className: wideCellClassName,
    },
    {
      id: 'totalAcceptances',
      header: 'Acceptances',
      sortable: true,
      accessor: 'totalAcceptances',
      className: wideCellClassName,
    },
    {
      id: 'uniqueUsers',
      header: 'Unique Users',
      sortable: true,
      accessor: 'uniqueUsers',
      className: wideCellClassName,
    },
    {
      id: 'locAdded',
      header: 'LOC Added',
      sortable: true,
      accessor: 'locAdded',
      className: wideCellClassName,
    },
    {
      id: 'locDeleted',
      header: 'LOC Deleted',
      sortable: true,
      accessor: 'locDeleted',
      className: wideCellClassName,
    },
    {
      id: 'locSuggestedToAdd',
      header: 'Suggested Add',
      sortable: true,
      accessor: 'locSuggestedToAdd',
      className: wideCellClassName,
    },
    {
      id: 'netLocImpact',
      header: 'Net LOC Impact',
      className: wideCellClassName,
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
      className: wideCellClassName,
      renderCell: (lang) => (
        <div className="text-sm text-gray-900">{formatAcceptanceRate(lang)}%</div>
      ),
    },
  ];

  // Determine how many items to show
  const maxItemsToShow = 10;
  return (
    <ViewPanel
      headerProps={{
        title: 'Programming Languages Analysis',
        description: 'Detailed breakdown of language usage patterns',
        onBack,
        descriptionClassName: 'text-gray-600 mt-1',
      }}
      contentClassName="space-y-6"
    >
      {/* Summary Stats */}
      <DashboardStatsCardGroup
        className="mb-6"
        columns={{ base: 2, md: 4, lg: 9 }}
        gapClassName="gap-4"
        items={summaryCards}
      />

      {/* Two Column Layout for Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200">
        {/* Languages by Number of Generations */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages by Code Generations</h3>
          <ExpandableTableSection
            items={languagesByGenerations}
            initialCount={maxItemsToShow}
            buttonCollapsedLabel={(total) => `Show All ${total} Languages`}
            buttonExpandedLabel="Show Less"
          >
            {({ visibleItems }) => (
              <div className="overflow-x-auto">
                <MetricsTable
                  data={visibleItems}
                  columns={languagesByGenerationsColumns}
                  rowClassName={tableRowClassName}
                  tableClassName="w-full divide-y divide-gray-200"
                  theadClassName="bg-gray-50"
                />
              </div>
            )}
          </ExpandableTableSection>
        </div>

        {/* Languages by Number of Users */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages by Number of Users</h3>
          <ExpandableTableSection
            items={languagesByUsers}
            initialCount={maxItemsToShow}
            buttonCollapsedLabel={(total) => `Show All ${total} Languages`}
            buttonExpandedLabel="Show Less"
          >
            {({ visibleItems }) => (
              <div className="overflow-x-auto">
                <MetricsTable
                  data={visibleItems}
                  columns={languagesByUsersColumns}
                  rowClassName={tableRowClassName}
                  tableClassName="w-full divide-y divide-gray-200"
                  theadClassName="bg-gray-50"
                />
              </div>
            )}
          </ExpandableTableSection>
        </div>
      </div>

      {/* Net Productivity Impact by Language */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Net Productivity Impact by Language</h3>
        <p className="text-sm text-gray-500 mb-4">
          Net LOC impact estimates how much accepted code Copilot is changing per language, combining lines of code added and deleted.
        </p>
        <ExpandableTableSection
          items={languagesByNetLocImpact}
          initialCount={maxItemsToShow}
          buttonCollapsedLabel={(total) => `Show All ${total} Languages`}
          buttonExpandedLabel="Show Less"
        >
          {({ visibleItems }) => (
            <div className="overflow-x-auto">
              <MetricsTable
                data={visibleItems}
                columns={languagesByNetImpactColumns}
                rowClassName={tableRowClassName}
                tableClassName="w-full divide-y divide-gray-200"
                theadClassName="bg-gray-50"
              />
            </div>
          )}
        </ExpandableTableSection>
      </div>

      {/* Full Languages Table */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Languages Breakdown</h3>
        <ExpandableTableSection
          items={sortedLanguages}
          initialCount={maxItemsToShow}
          buttonCollapsedLabel={(total) => `Show All ${total} Languages`}
          buttonExpandedLabel="Show Less"
        >
          {({ visibleItems }) => (
            <div className="overflow-x-auto">
              <MetricsTable
                data={visibleItems}
                columns={completeLanguagesColumns}
                sortState={tableSortState}
                onSortChange={handleTableSortChange}
                rowClassName={tableRowClassName}
                tableClassName="w-full divide-y divide-gray-200"
                theadClassName="bg-gray-50"
              />
            </div>
          )}
        </ExpandableTableSection>

        {languages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No language data available</p>
          </div>
        )}
      </div>
    </ViewPanel>
  );
}
