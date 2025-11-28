'use client';

import { UserSummary, CopilotMetrics } from '../types/metrics';
import { useUsernameTrieSearch } from '../hooks/useUsernameTrieSearch';
import { useSortableTable } from '../hooks/useSortableTable';
import { DashboardStatsCardGroup, ViewPanel } from './ui';
import MetricsTable, { TableColumn } from './ui/MetricsTable';
import type { VoidCallback } from '../types/events';

interface UniqueUsersViewProps {
  users: UserSummary[];
  rawMetrics: CopilotMetrics[];
  onBack: VoidCallback;
  onUserClick: (userLogin: string, userId: number, userMetrics: CopilotMetrics[]) => void;
}

type SortField = 'user_login' | 'total_user_initiated_interactions' | 'total_code_generation_activities' | 'total_code_acceptance_activities' | 'days_active' | 'total_loc_added' | 'total_loc_deleted' | 'total_loc_suggested_to_add' | 'total_loc_suggested_to_delete';

export default function UniqueUsersView({ users, rawMetrics, onBack, onUserClick }: UniqueUsersViewProps) {
  const { searchQuery, setSearchQuery, filteredUsers } = useUsernameTrieSearch(users);
  const { sortField, sortDirection, sortedItems: sortedUsers, handleSort } = useSortableTable<UserSummary, SortField>(
    filteredUsers,
    'total_user_initiated_interactions',
    'desc'
  );

  const handleUserClick = (user: UserSummary) => {
    const userMetrics = rawMetrics.filter(metric => metric.user_id === user.user_id);
    onUserClick(user.user_login, user.user_id, userMetrics);
  };

  const tableSortState = { field: sortField as string, direction: sortDirection };

  const headerBaseClass = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
  const valueCellClass = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';

  const columns: TableColumn<UserSummary>[] = [
    {
      id: 'user_login',
      header: 'User',
      sortable: true,
      headerClassName: `${headerBaseClass} w-1/4`,
      className: 'px-6 py-4 whitespace-nowrap',
      renderCell: (user) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-700">
                {user.user_login.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{user.user_login}</div>
            <div className="text-sm text-gray-500">ID: {user.user_id}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'total_user_initiated_interactions',
      header: 'User Interactions',
      sortable: true,
      accessor: 'total_user_initiated_interactions',
      headerClassName: `${headerBaseClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'total_code_generation_activities',
      header: 'Code Generation',
      sortable: true,
      accessor: 'total_code_generation_activities',
      headerClassName: `${headerBaseClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'total_code_acceptance_activities',
      header: 'Code Acceptance',
      sortable: true,
      accessor: 'total_code_acceptance_activities',
      headerClassName: `${headerBaseClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'total_loc_added',
      header: 'LOC Added',
      sortable: true,
      accessor: 'total_loc_added',
      headerClassName: `${headerBaseClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'total_loc_deleted',
      header: 'LOC Deleted',
      sortable: true,
      accessor: 'total_loc_deleted',
      headerClassName: `${headerBaseClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'total_loc_suggested_to_add',
      header: 'Suggested Add',
      sortable: true,
      accessor: 'total_loc_suggested_to_add',
      headerClassName: `${headerBaseClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'days_active',
      header: 'Days Active',
      sortable: true,
      accessor: 'days_active',
      headerClassName: `${headerBaseClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'features_used',
      header: 'Features Used',
      headerClassName: `${headerBaseClass} w-1/8`,
      className: 'px-6 py-4 whitespace-nowrap',
      renderCell: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.used_chat && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Chat
            </span>
          )}
          {user.used_agent && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Agent
            </span>
          )}
          {!user.used_chat && !user.used_agent && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Completion Only
            </span>
          )}
        </div>
      ),
    },
  ];
  // Calculate summary statistics
  const totalInteractions = users.reduce((sum, user) => sum + user.total_user_initiated_interactions, 0);
  const totalGeneration = users.reduce((sum, user) => sum + user.total_code_generation_activities, 0);
  const totalAcceptance = users.reduce((sum, user) => sum + user.total_code_acceptance_activities, 0);
  const chatUsers = users.filter(user => user.used_chat).length;
  const agentUsers = users.filter(user => user.used_agent).length;
  const completionOnlyUsers = users.filter(user => !user.used_chat && !user.used_agent).length;

  const summaryCards = [
    {
      value: users.length,
      label: 'Total Users',
      accent: 'blue' as const,
    },
    {
      value: totalInteractions,
      label: 'Total Interactions',
      accent: 'green' as const,
    },
    {
      value: totalGeneration,
      label: 'Code Generation',
      accent: 'purple' as const,
    },
    {
      value: totalAcceptance,
      label: 'Code Acceptance',
      accent: 'orange' as const,
    },
    {
      value: chatUsers,
      label: 'Chat Users',
      accent: 'teal' as const,
    },
    {
      value: agentUsers,
      label: 'Agent Users',
      accent: 'indigo' as const,
    },
    {
      value: completionOnlyUsers,
      label: 'Completion Only Users',
      accent: 'amber' as const,
    },
  ];

  return (
    <ViewPanel
      headerProps={{
        title: 'Unique Users',
        onBack,
      }}
      contentClassName="space-y-6"
    >
      {/* Summary Stats */}
      <DashboardStatsCardGroup
        className="mb-6"
        columns={{ base: 2, md: 3, lg: 7 }}
        gapClassName="gap-4"
        items={summaryCards}
      />

      {/* Users Table */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="mb-4">
          <label htmlFor="userSearch" className="block text-sm font-medium text-gray-700 mb-2">
            Search by user login
          </label>
          <input
            id="userSearch"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Start typing a username..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="overflow-x-auto">
          <MetricsTable<UserSummary>
            data={sortedUsers}
            columns={columns}
            sortState={tableSortState}
            onSortChange={({ field }) => handleSort(field as SortField)}
            rowClassName={() => 'hover:bg-gray-50 cursor-pointer transition-colors'}
            tableClassName="w-full divide-y divide-gray-200"
            theadClassName="bg-gray-50"
            onRowClick={(user) => handleUserClick(user)}
          />
        </div>

      {users.length === 0 && (
        <div className="text-center py-8">
            <p className="text-gray-500">No user data available</p>
        </div>
      )}
      </div>
    </ViewPanel>
  );
}
