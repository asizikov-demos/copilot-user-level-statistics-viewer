'use client';

import { useEffect, useMemo, useState } from 'react';
import type { UserSummary } from '../types/metrics';
import { useUsernameTrieSearch } from '../hooks/useUsernameTrieSearch';
import { useSortableTable } from '../hooks/useSortableTable';
import { formatAiAdoptionPhase, formatAiCreditCost } from '../utils/formatters';
import { formatIDEName } from '../utils/ideNames';
import { getIDEIcon } from './icons/IDEIcons';
import { ViewPanel } from './ui';
import DashboardStatsCard from './ui/DashboardStatsCard';
import StatsGrid from './ui/StatsGrid';
import MetricsTable, { TableColumn } from './ui/MetricsTable';

interface UniqueUsersViewProps {
  users: UserSummary[];
  onUserClick: (userLogin: string, userId: number) => void;
}

type SortField = 'user_login' | 'total_user_initiated_interactions' | 'total_code_generation_activities' | 'total_ai_credits_used' | 'days_active' | 'net_loc_contribution' | 'cloud_agent_days' | 'code_review_days' | 'top_client';
const USERS_PER_PAGE = 500;

function ClientIcon({ client }: { client: string }) {
  const Icon = getIDEIcon(client);

  return (
    <span aria-hidden="true" className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center">
      <Icon />
    </span>
  );
}

export default function UniqueUsersView({ users, onUserClick }: UniqueUsersViewProps) {
  const { searchQuery, setSearchQuery, filteredUsers } = useUsernameTrieSearch(users);
  const { sortField, sortDirection, sortedItems: sortedUsers, handleSort } = useSortableTable<UserSummary, SortField>(
    filteredUsers,
    'total_user_initiated_interactions',
    'desc'
  );
  const [currentPage, setCurrentPage] = useState(1);

  const handleUserClick = (user: UserSummary) => {
    onUserClick(user.user_login, user.user_id);
  };

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / USERS_PER_PAGE));
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return sortedUsers.slice(start, start + USERS_PER_PAGE);
  }, [currentPage, sortedUsers]);
  const pageStart = sortedUsers.length === 0 ? 0 : (currentPage - 1) * USERS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * USERS_PER_PAGE, sortedUsers.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDirection, users]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{user.user_login}</div>
            <div className="text-sm text-gray-500">ID: {user.user_id}</div>
          </div>
        </div>
      ),
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
      id: 'total_ai_credits_used',
      header: 'AI COST',
      sortable: true,
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
      renderCell: (user) => formatAiCreditCost(user.total_ai_credits_used),
    },
    {
      id: 'net_loc_contribution',
      header: 'LOC IMPACT',
      sortable: true,
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
      renderCell: (user) => (
        <span className="whitespace-nowrap tabular-nums">
          <span className="text-green-600">+{user.total_loc_added.toLocaleString()}</span>
          <span className="text-gray-400">/</span>
          <span className="text-red-600">-{user.total_loc_deleted.toLocaleString()}</span>
        </span>
      ),
    },
    {
      id: 'cloud_agent_days',
      header: 'CLOUD AGENT',
      sortable: true,
      accessor: 'cloud_agent_days',
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'code_review_days',
      header: 'CODE REVIEW',
      sortable: true,
      accessor: 'code_review_days',
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
    },
    {
      id: 'top_client',
      header: 'CLIENT',
      sortable: true,
      headerClassName: `${headerRightClass} w-1/8`,
      className: valueCellClass,
      renderCell: (user) => user.top_client ? (
        <span className="inline-flex items-center justify-end gap-2">
          <ClientIcon client={user.top_client} />
          {formatIDEName(user.top_client)}
        </span>
      ) : '-',
    },
    {
      id: 'ai_adoption_phase',
      header: 'AI ADOPTION',
      headerClassName: `${headerRightClass} w-[15%] whitespace-nowrap`,
      className: 'px-6 py-4 whitespace-nowrap text-right',
      renderCell: (user) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {formatAiAdoptionPhase(user.ai_adoption_phase)}
        </span>
      ),
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
          {(user.used_copilot_code_review_active || user.used_copilot_code_review_passive) && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
              Code Review
            </span>
          )}
          {user.used_auto_mode && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
              Auto Mode
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
  const codeReviewUsers = users.filter(user => user.used_copilot_code_review_active || user.used_copilot_code_review_passive).length;
  const cliUsers = users.filter(user => user.used_cli).length;
  const completionUsers = users.filter(user => user.total_code_generation_activities > 0).length;

  return (
    <ViewPanel
      headerProps={{
        title: 'Unique Users',
      }}
      contentClassName="space-y-6"
    >
      {/* Summary Stats */}
      <StatsGrid className="mb-6" columns={{ base: 2, md: 6 }} gapClassName="gap-4">
        <DashboardStatsCard value={users.length} label="Total Users" accent="blue" />
        <DashboardStatsCard value={chatUsers} label="Chat Users" accent="teal" />
        <DashboardStatsCard value={agentUsers} label="Agent Users" accent="indigo" />
        <DashboardStatsCard value={codeReviewUsers} label="Code Review Users" accent="cyan" />
        <DashboardStatsCard value={cliUsers} label="CLI Users" accent="rose" />
        <DashboardStatsCard value={completionUsers} label="Completion Users" accent="amber" />
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
            data={pagedUsers}
            columns={columns}
            sortState={tableSortState}
            onSortChange={({ field }) => handleSort(field as SortField)}
            rowClassName={() => 'hover:bg-gray-50 cursor-pointer transition-colors'}
            tableClassName="w-full divide-y divide-gray-200"
            theadClassName="bg-gray-50"
            onRowClick={(user) => handleUserClick(user)}
          />
        </div>
        {sortedUsers.length > USERS_PER_PAGE && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              Showing {pageStart.toLocaleString()}-{pageEnd.toLocaleString()} of {sortedUsers.length.toLocaleString()} users
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50 disabled:hover:bg-white"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-md disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50 disabled:hover:bg-white"
              >
                Next
              </button>
            </div>
          </div>
        )}

      {users.length === 0 && (
        <div className="text-center py-8">
            <p className="text-gray-500">No user data available</p>
        </div>
      )}
      </div>
    </ViewPanel>
  );
}
