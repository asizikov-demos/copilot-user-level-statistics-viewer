'use client';

import { useState } from 'react';
import type { UserSummary } from '../types/metrics';
import { useUsernameTrieSearch } from '../hooks/useUsernameTrieSearch';
import { useSortableTable } from '../hooks/useSortableTable';
import { ViewPanel } from './ui';
import DashboardStatsCard from './ui/DashboardStatsCard';
import StatsGrid from './ui/StatsGrid';
import MetricsTable, { TableColumn } from './ui/MetricsTable';

interface UniqueUsersViewProps {
  users: UserSummary[];
  onUserClick: (userLogin: string, userId: number) => void;
}

type SortField = 'user_login' | 'total_user_initiated_interactions' | 'total_code_generation_activities' | 'days_active' | 'total_loc_added' | 'total_loc_deleted';

export default function UniqueUsersView({ users, onUserClick }: UniqueUsersViewProps) {
  const [filterByAttention, setFilterByAttention] = useState(false);

  const attentionUsers = users.filter(u => u.flags.length > 0);
  const displayUsers = filterByAttention ? attentionUsers : users;

  const { searchQuery, setSearchQuery, filteredUsers } = useUsernameTrieSearch(displayUsers);
  const { sortField, sortDirection, sortedItems: sortedUsers, handleSort } = useSortableTable<UserSummary, SortField>(
    filteredUsers,
    'total_user_initiated_interactions',
    'desc'
  );

  const handleUserClick = (user: UserSummary) => {
    onUserClick(user.user_login, user.user_id);
  };

  const tableSortState = { field: sortField as string, direction: sortDirection };

  const headerBaseClass = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
  const headerRightClass = 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider';
  const valueCellClass = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right';

  const columns: TableColumn<UserSummary>[] = [
    {
      id: 'user_login',
      header: 'USER',
      sortable: true,
      headerClassName: `${headerBaseClass} w-1/4`,
      className: 'px-6 py-4 whitespace-nowrap',
      renderCell: (user) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 relative">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-700">
                {user.user_login.charAt(0).toUpperCase()}
              </span>
            </div>
            {user.flags.length > 0 && (
              <span
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 border border-orange-300 text-orange-600"
                title={user.flags.map(f => f.label).join(', ')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </span>
            )}
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
      header: 'INTERACTIONS',
      sortable: true,
      accessor: 'total_user_initiated_interactions',
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'total_code_generation_activities',
      header: 'GENERATIONS',
      sortable: true,
      accessor: 'total_code_generation_activities',
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'total_loc_added',
      header: 'LOC ADDED',
      sortable: true,
      accessor: 'total_loc_added',
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'total_loc_deleted',
      header: 'LOC DELETED',
      sortable: true,
      accessor: 'total_loc_deleted',
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'days_active',
      header: 'DAYS ACTIVE',
      sortable: true,
      accessor: 'days_active',
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'features_used',
      header: 'FEATURES USED',
      headerClassName: 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4',
      className: 'px-6 py-4 whitespace-nowrap min-w-[280px] text-right',
      renderCell: (user) => (
        <div className="flex flex-wrap gap-1 justify-end">
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
          {user.used_cli && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
              CLI
            </span>
          )}
          {user.used_copilot_coding_agent && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
              Cloud Agent
            </span>
          )}
          {user.total_code_generation_activities > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Completions
            </span>
          )}
        </div>
      ),
    },
  ];
  const chatUsers = users.filter(user => user.used_chat).length;
  const agentUsers = users.filter(user => user.used_agent).length;
  const cliUsers = users.filter(user => user.used_cli).length;
  const completionUsers = users.filter(user => user.total_code_generation_activities > 0).length;
  const hasAttention = attentionUsers.length > 0;

  const columnCount = (hasAttention ? 6 : 5) as 5 | 6;

  return (
    <ViewPanel
      headerProps={{
        title: 'Unique Users',
      }}
      contentClassName="space-y-6"
    >
      {/* Summary Stats */}
      <StatsGrid className="mb-6" columns={{ base: 2, md: columnCount }} gapClassName="gap-4">
        <DashboardStatsCard value={users.length} label="Total Users" accent="blue" />
        <DashboardStatsCard value={chatUsers} label="Chat Users" accent="teal" />
        <DashboardStatsCard value={agentUsers} label="Agent Users" accent="indigo" />
        <DashboardStatsCard value={cliUsers} label="CLI Users" accent="rose" />
        <DashboardStatsCard value={completionUsers} label="Completion Users" accent="amber" />
        {hasAttention && (
          <button
            type="button"
            onClick={() => setFilterByAttention(prev => !prev)}
            className="text-left w-full"
          >
            <DashboardStatsCard
              value={attentionUsers.length}
              label="Requires Attention"
              accent="orange"
              tone={filterByAttention ? 'tint' : 'neutral'}
              className={filterByAttention ? 'ring-2 ring-orange-400' : 'hover:ring-2 hover:ring-orange-300 cursor-pointer'}
            />
          </button>
        )}
      </StatsGrid>

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
        <div className="overflow-x-auto border border-gray-200">
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
