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

  const [generationsPage, setGenerationsPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  useEffect(() => { setGenerationsPage(1); }, [languagesByGenerations]);
  useEffect(() => { setUsersPage(1); }, [languagesByUsers]);
  const generationsPageCount = Math.max(1, Math.ceil(languagesByGenerations.length / LANGUAGES_PER_PAGE));
  const usersPageCount = Math.max(1, Math.ceil(languagesByUsers.length / LANGUAGES_PER_PAGE));
  const currentGenerationsPage = Math.min(generationsPage, generationsPageCount);
  const currentUsersPage = Math.min(usersPage, usersPageCount);
  const pagedLanguagesByGenerations = languagesByGenerations.slice(
    (currentGenerationsPage - 1) * LANGUAGES_PER_PAGE,
    currentGenerationsPage * LANGUAGES_PER_PAGE,
  );
  const pagedLanguagesByUsers = languagesByUsers.slice(
    (currentUsersPage - 1) * LANGUAGES_PER_PAGE,
    currentUsersPage * LANGUAGES_PER_PAGE,
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
              <div className="h-8 w-8 rounded bg-accent-emphasis flex items-center justify-center text-on-emphasis text-xs font-bold">
                {rank}
              </div>
            </div>
            <div className="text-sm font-medium text-default">{lang.language}</div>
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
              <div className="h-8 w-8 rounded bg-success-emphasis flex items-center justify-center text-on-emphasis text-xs font-bold">
                {rank}
              </div>
            </div>
            <div className="text-sm font-medium text-default">{lang.language}</div>
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
    <div id={sectionId} className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6 pt-6 border-t border-default scroll-mt-28">
      <TableCard
        title="Languages by Code Generations"
        description="Ranked by total code generations."
        footer={languagesByGenerations.length > 0 ? (
          <TablePagination
            itemCount={languagesByGenerations.length}
            currentPage={currentGenerationsPage}
            pageSize={LANGUAGES_PER_PAGE}
            itemLabel="languages"
            onPageChange={setGenerationsPage}
          />
        ) : null}
      >
        <MetricsTable
          data={pagedLanguagesByGenerations}
          columns={languagesByGenerationsColumns}
          rowClassName={tableRowClassName}
          tableClassName="w-full divide-y divide-default"
          tableContainerClassName="overflow-x-auto"
          theadClassName="bg-muted"
          getRowKey={lang => lang.language}
        />
      </TableCard>

      <TableCard
        title="Languages by Number of Users"
        description="Ranked by unique user count."
        footer={languagesByUsers.length > 0 ? (
          <TablePagination
            itemCount={languagesByUsers.length}
            currentPage={currentUsersPage}
            pageSize={LANGUAGES_PER_PAGE}
            itemLabel="languages"
            onPageChange={setUsersPage}
          />
        ) : null}
      >
        <MetricsTable
          data={pagedLanguagesByUsers}
          columns={languagesByUsersColumns}
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
