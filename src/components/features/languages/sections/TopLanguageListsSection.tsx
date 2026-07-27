import { useMemo } from 'react';
import type { LanguageStats } from '../../../../domain/calculators/metricCalculators';
import { rankBySelector, sortBySelector } from '../../../../utils/sorting';
import MetricsTable, { type TableColumn } from '../../../ui/MetricsTable';
import {
  formatAcceptanceRate,
  MAX_LANGUAGES_TO_SHOW,
  narrowCellClassName,
  narrowCellRightClassName,
  narrowHeaderClassName,
  narrowHeaderRightClassName,
  tableRowClassName,
} from './languageTableUtils';

interface TopLanguageListsSectionProps {
  sectionId: string;
  languages: LanguageStats[];
}

export default function TopLanguageListsSection({
  sectionId,
  languages,
}: TopLanguageListsSectionProps) {
  const languagesByGenerations = useMemo(
    () => sortBySelector(languages, lang => lang.totalGenerations, 'desc'),
    [languages],
  );

  const languagesByUsers = useMemo(
    () => sortBySelector(languages, lang => lang.uniqueUsers, 'desc'),
    [languages],
  );

  const generationRankMap = useMemo(
    () => rankBySelector(languages, lang => lang.language, lang => lang.totalGenerations),
    [languages],
  );

  const userRankMap = useMemo(
    () => rankBySelector(languages, lang => lang.language, lang => lang.uniqueUsers),
    [languages],
  );

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
      headerClassName: narrowHeaderRightClassName,
      className: narrowCellRightClassName,
      renderCell: (lang) => (
        <div>{lang.totalGenerations.toLocaleString()}</div>
      ),
    },
    {
      id: 'acceptanceRate',
      header: 'Acceptance Rate',
      headerClassName: narrowHeaderRightClassName,
      className: narrowCellRightClassName,
      renderCell: (lang) => (
        <div>{formatAcceptanceRate(lang)}%</div>
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
      headerClassName: narrowHeaderRightClassName,
      className: narrowCellRightClassName,
      renderCell: (lang) => (
        <div>{lang.uniqueUsers.toLocaleString()}</div>
      ),
    },
    {
      id: 'avgEngagements',
      header: 'Avg Engagements',
      headerClassName: narrowHeaderRightClassName,
      className: narrowCellRightClassName,
      renderCell: (lang) => {
        const avgEngagements = lang.uniqueUsers > 0
          ? (lang.totalEngagements / lang.uniqueUsers).toFixed(1)
          : '0.0';
        return <div>{avgEngagements}</div>;
      },
    },
  ];

  return (
    <div id={sectionId} className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200 scroll-mt-28">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages by Code Generations</h3>
        <MetricsTable
          data={languagesByGenerations}
          columns={languagesByGenerationsColumns}
          rowClassName={tableRowClassName}
          tableClassName="w-full divide-y divide-gray-200"
          tableContainerClassName="overflow-x-auto border border-gray-200"
          theadClassName="bg-gray-50"
          initialCount={MAX_LANGUAGES_TO_SHOW}
          buttonCollapsedLabel={(total) => `Show All ${total} Languages`}
          buttonExpandedLabel="Show Less"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages by Number of Users</h3>
        <MetricsTable
          data={languagesByUsers}
          columns={languagesByUsersColumns}
          rowClassName={tableRowClassName}
          tableClassName="w-full divide-y divide-gray-200"
          tableContainerClassName="overflow-x-auto border border-gray-200"
          theadClassName="bg-gray-50"
          initialCount={MAX_LANGUAGES_TO_SHOW}
          buttonCollapsedLabel={(total) => `Show All ${total} Languages`}
          buttonExpandedLabel="Show Less"
        />
      </div>
    </div>
  );
}
