import { useEffect, useMemo, useState } from 'react';
import type { LanguageStats } from '../../../../domain/calculators/metricCalculators';
import { rankBySelector, sortBySelector } from '../../../../utils/sorting';
import MetricsTable, { type TableColumn } from '../../../ui/MetricsTable';
import TableCard from '../../../ui/TableCard';
import TablePagination from '../../../ui/TablePagination';
import {
  formatAcceptanceRate,
  LANGUAGES_PER_PAGE,
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

  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [languagesByNetLocImpact]);
  const pageCount = Math.max(1, Math.ceil(languagesByNetLocImpact.length / LANGUAGES_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const pagedLanguages = languagesByNetLocImpact.slice(
    (currentPage - 1) * LANGUAGES_PER_PAGE,
    currentPage * LANGUAGES_PER_PAGE,
  );

  const languagesByNetImpactColumns: TableColumn<LanguageStats>[] = [
    {
      id: 'rank',
      header: 'Rank',
      headerClassName: narrowHeaderClassName,
      className: narrowCellClassName,
      renderCell: (lang) => {
        const rank = netImpactRankMap.get(lang.language);
        return <div className="text-sm font-medium text-default">{rank ?? '–'}</div>;
      },
    },
    {
      id: 'language',
      header: 'Language',
      headerClassName: narrowHeaderClassName,
      className: narrowCellClassName,
      renderCell: (lang) => (
        <div className="text-sm font-medium text-default">{lang.language}</div>
      ),
    },
    {
      id: 'netImpact',
      header: 'Net LOC Impact',
      headerClassName: narrowHeaderRightClassName,
      className: narrowCellRightClassName,
      renderCell: (lang) => {
        const netLocImpact = lang.locAdded - lang.locDeleted;
        const impactColor = netLocImpact > 0 ? 'text-success' : netLocImpact < 0 ? 'text-danger' : 'text-muted';
        const impactTone = netLocImpact > 0 ? 'positive' : netLocImpact < 0 ? 'negative' : 'neutral';
        return (
          <div className={`font-medium ${impactColor}`} data-tone={impactTone}>
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
    <div id={sectionId} className="mt-6 pt-6 border-t border-default scroll-mt-28">
      <TableCard
        title="Net Productivity Impact by Language"
        description="Net LOC impact estimates how much accepted code Copilot is changing per language, combining lines of code added and deleted."
        footer={languagesByNetLocImpact.length > 0 ? (
          <TablePagination
            itemCount={languagesByNetLocImpact.length}
            currentPage={currentPage}
            pageSize={LANGUAGES_PER_PAGE}
            itemLabel="languages"
            onPageChange={setPage}
          />
        ) : null}
      >
        <MetricsTable
          data={pagedLanguages}
          columns={languagesByNetImpactColumns}
          rowClassName={tableRowClassName}
          tableClassName="w-full divide-y divide-default"
          tableContainerClassName="overflow-x-auto"
          theadClassName="bg-muted"
          getRowKey={lang => lang.language}
        />
      </TableCard>
    </div>
  );
}
