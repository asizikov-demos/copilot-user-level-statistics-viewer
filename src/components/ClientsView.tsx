'use client';

import React from 'react';
import type { ClientTrafficSummary } from '../types/clientTraffic';
import type { IDEStatsData } from '../types/metrics';
import { getIDEIcon, formatIDEName } from './icons/IDEIcons';
import MetricsTable, { TableColumn } from './ui/MetricsTable';
import TableCard from './ui/TableCard';
import TablePagination, { TABLE_PAGE_SIZE } from './ui/TablePagination';
import { ViewPanel } from './ui';
import { useSortableTable } from '../hooks/useSortableTable';
import IDEDistributionChart from './charts/IDEDistributionChart';
import CLIOverlapChart from './charts/CLIOverlapChart';
import DailyIDEUsersChart from './charts/DailyIDEUsersChart';
import IDEInsights from './IDEInsights';
import { CLIENT_ANALYSIS_SECTIONS } from './layout/contextSections';
import { appendCliClientStatsRow } from '../domain/calculators/clientActivityRows';
import type { ClientsReadModel } from '../read-models/clients';

type IDEStats = IDEStatsData;

const TRAFFIC_METRIC_COLUMNS = [
  ['activeUsers', 'Active Users'],
  ['requestCount', 'Model Requests'],
  ['reportedSessionCount', 'Reported Sessions'],
  ['promptTokens', 'Prompt Tokens'],
  ['outputTokens', 'Output Tokens'],
  ['avgTokensPerRequest', 'Tokens / Request'],
] as const;
type TrafficSortField = 'client' | typeof TRAFFIC_METRIC_COLUMNS[number][0];

interface IDEViewProps {
  model: ClientsReadModel;
}

export default function ClientsView({ model }: IDEViewProps) {
  const {
    ideStats,
    multiIDEUsersCount,
    totalUniqueIDEUsers,
    cliUsers,
    cliSessions,
    cliLocAdded,
    cliLocDeleted,
    dailyIdeUsersData,
    reportStartDay,
    reportEndDay,
  } = model;

  const allClients: IDEStats[] = React.useMemo(() => {
    return appendCliClientStatsRow(ideStats, {
      users: cliUsers,
      sessions: cliSessions,
      locAdded: cliLocAdded,
      locDeleted: cliLocDeleted,
    });
  }, [ideStats, cliUsers, cliSessions, cliLocAdded, cliLocDeleted]);

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

  const [usersPage, setUsersPage] = React.useState(1);
  const [engagementsPage, setEngagementsPage] = React.useState(1);
  React.useEffect(() => { setUsersPage(1); }, [sortedIdesByUsers]);
  React.useEffect(() => { setEngagementsPage(1); }, [sortedIdesByEngagements]);
  const currentUsersPage = Math.min(usersPage, Math.max(1, Math.ceil(sortedIdesByUsers.length / TABLE_PAGE_SIZE)));
  const currentEngagementsPage = Math.min(engagementsPage, Math.max(1, Math.ceil(sortedIdesByEngagements.length / TABLE_PAGE_SIZE)));
  const pagedIdesByUsers = sortedIdesByUsers.slice((currentUsersPage - 1) * TABLE_PAGE_SIZE, currentUsersPage * TABLE_PAGE_SIZE);
  const pagedIdesByEngagements = sortedIdesByEngagements.slice((currentEngagementsPage - 1) * TABLE_PAGE_SIZE, currentEngagementsPage * TABLE_PAGE_SIZE);

  const headerClass = 'px-6 py-3 text-left';
  const headerRightClass = 'px-6 py-3 text-right';
  const cellClass = 'px-6 py-4 whitespace-nowrap text-sm text-default text-right';

  const { sortedItems: sortedTraffic, sortField: trafficSortField, sortDirection: trafficSortDirection,
    handleSort: handleTrafficSort } = useSortableTable<ClientTrafficSummary, TrafficSortField>(
      model.traffic.summary.clients, 'requestCount', 'desc'
    );
  const [trafficPage, setTrafficPage] = React.useState(1);
  React.useEffect(() => { setTrafficPage(1); }, [sortedTraffic]);
  const currentTrafficPage = Math.min(trafficPage, Math.max(1, Math.ceil(sortedTraffic.length / TABLE_PAGE_SIZE)));
  const pagedTraffic = sortedTraffic.slice((currentTrafficPage - 1) * TABLE_PAGE_SIZE, currentTrafficPage * TABLE_PAGE_SIZE);
  const trafficColumns: TableColumn<ClientTrafficSummary>[] = [
    {
      id: 'client', header: 'Client', sortable: true,
      renderCell: (client) => {
        const Icon = getIDEIcon(client.client);
        return (
          <span className="inline-flex items-center gap-3">
            <span aria-hidden="true"><Icon /></span>
            <span className="font-medium">{formatIDEName(client.client)}</span>
          </span>
        );
      },
    },
    ...TRAFFIC_METRIC_COLUMNS.map(([field, header]): TableColumn<ClientTrafficSummary> => ({
      id: field, header, sortable: true,
      headerClassName: headerRightClass,
      className: cellClass,
      renderCell: (client) => client[field]?.toLocaleString(undefined, {
        maximumFractionDigits: field === 'avgTokensPerRequest' ? 1 : 0,
      }) ?? 'Not available',
    })),
  ];
  const trafficSummary = model.traffic.summary;

  const renderIDEInfo = (ide: IDEStats) => {
    const IDEIcon = getIDEIcon(ide.ide);
    return (
      <div className="flex items-center">
        <div className="flex-shrink-0 mr-3">
          <IDEIcon />
        </div>
        <div>
          <div className="text-sm font-medium text-default">
            {formatIDEName(ide.ide)}
          </div>
          <div className="text-sm text-muted">
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
    return <div className="text-sm text-default text-right">{acceptanceRate}%</div>;
  };

  const createColumns = (primary: { field: keyof IDEStats; label: string }): TableColumn<IDEStats>[] => [
    {
      id: 'ide',
      header: 'Client',
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
      header: 'Generations',
      sortable: true,
      accessor: 'totalGenerations',
      headerClassName: headerRightClass,
      className: cellClass,
    },
    {
      id: 'totalAcceptances',
      header: 'Acceptances',
      sortable: true,
      accessor: 'totalAcceptances',
      headerClassName: headerRightClass,
      className: cellClass,
    },
    {
      id: 'locAdded',
      header: 'LOC Added',
      sortable: true,
      accessor: 'locAdded',
      headerClassName: headerRightClass,
      className: cellClass,
    },
    {
      id: 'locDeleted',
      header: 'LOC Deleted',
      sortable: true,
      accessor: 'locDeleted',
      headerClassName: headerRightClass,
      className: cellClass,
    },
    {
      id: 'locSuggestedToAdd',
      header: 'Suggested Add',
      sortable: true,
      accessor: 'locSuggestedToAdd',
      headerClassName: headerRightClass,
      className: cellClass,
    },
    {
      id: 'locSuggestedToDelete',
      header: 'Suggested Delete',
      sortable: true,
      accessor: 'locSuggestedToDelete',
      headerClassName: headerRightClass,
      className: cellClass,
    },
    {
      id: 'acceptanceRate',
      header: 'Acceptance Rate',
      headerClassName: headerRightClass,
      className: cellClass,
      renderCell: (ide) => renderAcceptanceRate(ide),
    },
  ];

  const usersColumns = createColumns({ field: 'uniqueUsers', label: 'Unique Users' });
  const engagementsColumns = createColumns({ field: 'totalEngagements', label: 'Engagements' });
  const [trafficSection, distributionSection, dailyIdeUsersSection, insightsSection, usersSection, engagementsSection] = CLIENT_ANALYSIS_SECTIONS;

  return (
    <ViewPanel
      headerProps={{
        title: 'Client Analysis',
        description: 'Model traffic from Copilot clients, alongside IDE and CLI activity.',
      }}
      contentClassName="space-y-8"
    >
      <div className="space-y-8">
        <TableCard
          id={trafficSection.id}
          className="scroll-mt-28"
          title="Model traffic by client"
          headingAs="h3"
          description={
            <p>
              Successful model calls, not prompts or editor interactions. Active users made at least one
              model request; users can appear under multiple clients.
            </p>
          }
          footer={trafficSummary.reportedRecords > 0 && sortedTraffic.length > 0 ? (
            <TablePagination itemCount={sortedTraffic.length} currentPage={currentTrafficPage} itemLabel="clients" onPageChange={setTrafficPage} />
          ) : null}
        >
          {trafficSummary.reportedRecords === 0 ? (
            <p className="px-6 py-4 text-sm text-muted">Client model traffic is not reported in this upload. Editor and CLI activity remain available below.</p>
          ) : sortedTraffic.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted">No client model traffic was reported in the available records.</p>
          ) : (
            <MetricsTable<ClientTrafficSummary>
              data={pagedTraffic}
              columns={trafficColumns}
              sortState={{ field: trafficSortField ?? 'requestCount', direction: trafficSortDirection }}
              onSortChange={({ field }) => {
                if (field === 'client') handleTrafficSort('client');
                else {
                  const key = TRAFFIC_METRIC_COLUMNS.find(([key]) => key === field)?.[0];
                  if (key) handleTrafficSort(key);
                }
              }}
              getRowKey={client => client.client}
              tableContainerClassName="overflow-x-auto"
              rowClassName={() => 'hover:bg-muted'}
            />
          )}
        </TableCard>

        <div id={distributionSection.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6 scroll-mt-28">
          <IDEDistributionChart ideStats={ideStats} cliUsers={cliUsers} />
          <CLIOverlapChart ideStats={ideStats} />
        </div>

        <div id={dailyIdeUsersSection.id} className="scroll-mt-28">
          <DailyIDEUsersChart
            data={dailyIdeUsersData}
            reportStartDay={reportStartDay}
            reportEndDay={reportEndDay}
            telemetryWarnings={model.telemetryWarnings}
          />
        </div>

        <div id={insightsSection.id} className="bg-default rounded-md border border-default scroll-mt-28">
          <div className="px-6 py-4 border-b border-default">
            <h3 className="text-lg font-semibold text-default">Insights</h3>
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

        <TableCard
          id={usersSection.id}
          className="scroll-mt-28"
          title="Clients Ordered by Number of Users"
          headingAs="h3"
          description={<p>Compare clients by user count, with generation, acceptance, and code-change totals for context.</p>}
          footer={sortedIdesByUsers.length > 0 ? (
            <TablePagination itemCount={sortedIdesByUsers.length} currentPage={currentUsersPage} itemLabel="clients" onPageChange={setUsersPage} />
          ) : null}
        >
          <MetricsTable<IDEStats>
            data={pagedIdesByUsers}
            columns={usersColumns}
            sortState={{ field: usersSortField as string, direction: usersSortDirection }}
            onSortChange={({ field }) => handleUsersSort(field as keyof IDEStats)}
            rowClassName={() => 'hover:bg-muted'}
            tableContainerClassName="overflow-x-auto"
            getRowKey={ide => ide.ide}
          />
        </TableCard>

        <TableCard
          id={engagementsSection.id}
          className="scroll-mt-28"
          title="Clients Ordered by Number of Engagements"
          headingAs="h3"
          description={<p>Compare clients by engagement count, alongside generation, acceptance, and code-change totals.</p>}
          footer={sortedIdesByEngagements.length > 0 ? (
            <TablePagination itemCount={sortedIdesByEngagements.length} currentPage={currentEngagementsPage} itemLabel="clients" onPageChange={setEngagementsPage} />
          ) : null}
        >
          <MetricsTable<IDEStats>
            data={pagedIdesByEngagements}
            columns={engagementsColumns}
            sortState={{ field: engagementsSortField as string, direction: engagementsSortDirection }}
            onSortChange={({ field }) => handleEngagementsSort(field as keyof IDEStats)}
            rowClassName={() => 'hover:bg-muted'}
            tableContainerClassName="overflow-x-auto"
            getRowKey={ide => ide.ide}
          />
        </TableCard>
      </div>
    </ViewPanel>
  );
}
