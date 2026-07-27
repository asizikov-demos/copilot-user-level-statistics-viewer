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

interface NetProductivityImpactSectionProps {
  sectionId: string;
  languages: LanguageStats[];
}

export default function NetProductivityImpactSection({
  sectionId,
  languages,
}: NetProductivityImpactSectionProps) {
  const languagesByNetLocImpact = useMemo(
    () => sortBySelector(languages, lang => lang.locAdded - lang.locDeleted, 'desc'),
    [languages],
  );

  const netImpactRankMap = useMemo(
    () => rankBySelector(languages, lang => lang.language, lang => lang.locAdded - lang.locDeleted),
    [languages],
  );

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
      headerClassName: narrowHeaderRightClassName,
      className: narrowCellRightClassName,
      renderCell: (lang) => {
        const netLocImpact = lang.locAdded - lang.locDeleted;
        const impactColor = netLocImpact > 0 ? 'text-green-600' : netLocImpact < 0 ? 'text-rose-600' : 'text-gray-500';
        return (
          <div className={`font-medium ${impactColor}`}>
            {netLocImpact.toLocaleString()}
          </div>
        );
      },
    },
    {
      id: 'totalGenerations',
      header: 'Total Generations',
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

  return (
    <div id={sectionId} className="mt-6 pt-6 border-t border-gray-200 scroll-mt-28">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Net Productivity Impact by Language</h3>
      <p className="text-sm text-gray-500 mb-4">
        Net LOC impact estimates how much accepted code Copilot is changing per language, combining lines of code added and deleted.
      </p>
      <MetricsTable
        data={languagesByNetLocImpact}
        columns={languagesByNetImpactColumns}
        rowClassName={tableRowClassName}
        tableClassName="w-full divide-y divide-gray-200"
        tableContainerClassName="overflow-x-auto border border-gray-200"
        theadClassName="bg-gray-50"
        initialCount={MAX_LANGUAGES_TO_SHOW}
        buttonCollapsedLabel={(total) => `Show All ${total} Languages`}
        buttonExpandedLabel="Show Less"
      />
    </div>
  );
}
