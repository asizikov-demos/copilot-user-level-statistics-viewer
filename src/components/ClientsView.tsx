'use client';

import React from 'react';
import type { IDEStatsData } from '../types/metrics';
import { getIDEIcon, formatIDEName } from './icons/IDEIcons';
import MetricsTable, { TableColumn } from './ui/MetricsTable';
import { ViewPanel } from './ui';
import { useSortableTable } from '../hooks/useSortableTable';
import IDEDistributionChart from './charts/IDEDistributionChart';
import CLIOverlapChart from './charts/CLIOverlapChart';
import IDEInsights from './IDEInsights';

type IDEStats = IDEStatsData;

interface IDEViewProps {
  ideStats: IDEStatsData[];
  multiIDEUsersCount: number;
  totalUniqueIDEUsers: number;
  cliUsers: number;
  cliSessions: number;
}

export default function ClientsView({ ideStats, multiIDEUsersCount, totalUniqueIDEUsers, cliUsers, cliSessions }: IDEViewProps) {

  const allClients: IDEStats[] = React.useMemo(() => {
    if (cliUsers <= 0) return ideStats;
    const cliEntry: IDEStats = {
      ide: 'copilot_cli',
      uniqueUsers: cliUsers,
      cliOverlapUsers: 0,
      totalEngagements: cliSessions,
      totalGenerations: 0,
      totalAcceptances: 0,
      locAdded: 0,
      locDeleted: 0,
      locSuggestedToAdd: 0,
      locSuggestedToDelete: 0,
    };
    return [...ideStats, cliEntry];
  }, [ideStats, cliUsers, cliSessions]);

  const {
    sortField: usersSortField,
    sortDirection: usersSortDirection,
    sortedItems: sortedIdesByUsers,
    handleSort: handleUsersSort,
  } = useSortableTable<IDEStats, keyof IDEStats>(allClients, 'uniqueUsers', 'desc');

  const {
    sortField: engagementsSortField,
    sortDirection: engagementsSortDirection,
    sortedItems: sortedIdesByEngagements,
    handleSort: handleEngagementsSort,
  } = useSortableTable<IDEStats, keyof IDEStats>(allClients, 'totalEngagements', 'desc');

  const headerClass = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
  const headerRightClass = 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider';
  const cellClass = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right';

  const renderIDEInfo = (ide: IDEStats) => {
    const IDEIcon = getIDEIcon(ide.ide);
    return (
      <div className="flex items-center">
        <div className="flex-shrink-0 mr-3">
          <IDEIcon />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">
            {formatIDEName(ide.ide)}
          </div>
          <div className="text-sm text-gray-500">
            {ide.ide}
          </div>
        </div>
      </div>
    );
  };

  const renderAcceptanceRate = (ide: IDEStats) => {
    const acceptanceRate = ide.totalGenerations > 0
      ? (ide.totalAcceptances / ide.totalGenerations * 100).toFixed(1)
      : '0.0';
    return <div className="text-sm text-gray-900 text-right">{acceptanceRate}%</div>;
  };

  const createColumns = (primary: { field: keyof IDEStats; label: string }): TableColumn<IDEStats>[] => [
    {
      id: 'ide',
      header: 'CLIENT',
      sortable: true,
      headerClassName: headerClass,
      className: 'px-6 py-4 whitespace-nowrap',
      renderCell: (ide) => renderIDEInfo(ide),
    },
    {
      id: primary.field as string,
      header: primary.label,
      sortable: true,
      accessor: primary.field,
      headerClassName: headerRightClass,
      className: `${cellClass} font-medium`,
    },
    {
      id: 'totalGenerations',
      header: 'GENERATIONS',
      sortable: true,
      accessor: 'totalGenerations',
      headerClassName: headerRightClass,
      className: cellClass,
    },
    {
      id: 'totalAcceptances',
      header: 'ACCEPTANCES',
      sortable: true,
      accessor: 'totalAcceptances',
      headerClassName: headerRightClass,
      className: cellClass,
    },
    {
      id: 'locAdded',
      header: 'LOC ADDED',
      sortable: true,
      accessor: 'locAdded',
      headerClassName: headerRightClass,
      className: cellClass,
    },
    {
      id: 'locDeleted',
      header: 'LOC DELETED',
      sortable: true,
      accessor: 'locDeleted',
      headerClassName: headerRightClass,
      className: cellClass,
    },
    {
      id: 'locSuggestedToAdd',
      header: 'SUGGESTED ADD',
      sortable: true,
      accessor: 'locSuggestedToAdd',
      headerClassName: headerRightClass,
      className: cellClass,
    },
    {
      id: 'locSuggestedToDelete',
      header: 'SUGGESTED DELETE',
      sortable: true,
      accessor: 'locSuggestedToDelete',
      headerClassName: headerRightClass,
      className: cellClass,
    },
    {
      id: 'acceptanceRate',
      header: 'ACCEPTANCE RATE',
      headerClassName: headerRightClass,
      className: cellClass,
      renderCell: (ide) => renderAcceptanceRate(ide),
    },
  ];

  const usersColumns = createColumns({ field: 'uniqueUsers', label: 'UNIQUE USERS' });
  const engagementsColumns = createColumns({ field: 'totalEngagements', label: 'ENGAGEMENTS' });

  return (
    <ViewPanel
      headerProps={{
        title: 'Client Analysis',
        description: 'Overview of IDE and CLI usage across your organization.',
      }}
      contentClassName="space-y-8"
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <IDEDistributionChart ideStats={ideStats} cliUsers={cliUsers} />
          <CLIOverlapChart ideStats={ideStats} />
        </div>

        <div className="bg-white rounded-md border border-[#d1d9e0]">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Insights</h3>
          </div>
          <div className="px-6 py-4">
            <IDEInsights
              ideStats={ideStats}
              multiIDEUsersCount={multiIDEUsersCount}
              totalUniqueIDEUsers={totalUniqueIDEUsers}
              cliUsers={cliUsers}
            />
          </div>
        </div>

        <div className="bg-white rounded-md border border-[#d1d9e0]">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Clients Ordered by Number of Users</h3>
          </div>
          <MetricsTable<IDEStats>
            data={sortedIdesByUsers}
            columns={usersColumns}
            sortState={{ field: usersSortField as string, direction: usersSortDirection }}
            onSortChange={({ field }) => handleUsersSort(field as keyof IDEStats)}
            tableClassName="w-full divide-y divide-gray-200"
            theadClassName="bg-gray-50"
            rowClassName={(_, index) => `${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-50`}
          />
        </div>

        <div className="bg-white rounded-md border border-[#d1d9e0]">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Clients Ordered by Number of Engagements</h3>
          </div>
          <MetricsTable<IDEStats>
            data={sortedIdesByEngagements}
            columns={engagementsColumns}
            sortState={{ field: engagementsSortField as string, direction: engagementsSortDirection }}
            onSortChange={({ field }) => handleEngagementsSort(field as keyof IDEStats)}
            tableClassName="w-full divide-y divide-gray-200"
            theadClassName="bg-gray-50"
            rowClassName={(_, index) => `${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-50`}
          />
        </div>
      </div>
    </ViewPanel>
  );
}
