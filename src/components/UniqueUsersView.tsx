'use client';

import { UserSummary, CopilotMetrics } from '../types/metrics';
import { useUsernameTrieSearch } from '../hooks/useUsernameTrieSearch';
import { useSortableTable } from '../hooks/useSortableTable';
import DashboardStatsCard from './ui/DashboardStatsCard';
import { ViewPanel } from './ui';
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4l9 16 9-16H3z" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 20L12 4 3 20h18z" />
      </svg>
    );
  };

  const renderSortButton = (field: SortField, label: string) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center hover:text-gray-700 focus:outline-none"
    >
      {label}
      {getSortIcon(field)}
    </button>
  );
  // Calculate summary statistics
  const totalInteractions = users.reduce((sum, user) => sum + user.total_user_initiated_interactions, 0);
  const totalGeneration = users.reduce((sum, user) => sum + user.total_code_generation_activities, 0);
  const totalAcceptance = users.reduce((sum, user) => sum + user.total_code_acceptance_activities, 0);
  const chatUsers = users.filter(user => user.used_chat).length;
  const agentUsers = users.filter(user => user.used_agent).length;
  const completionOnlyUsers = users.filter(user => !user.used_chat && !user.used_agent).length;

  return (
    <ViewPanel
      headerProps={{
        title: 'Unique Users',
        onBack,
      }}
      contentClassName="space-y-6"
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
        <DashboardStatsCard
          value={users.length}
          label="Total Users"
          accent="blue"
        />
        <DashboardStatsCard
          value={totalInteractions}
          label="Total Interactions"
          accent="green"
        />
        <DashboardStatsCard
          value={totalGeneration}
          label="Code Generation"
          accent="purple"
        />
        <DashboardStatsCard
          value={totalAcceptance}
          label="Code Acceptance"
          accent="orange"
        />
        <DashboardStatsCard
          value={chatUsers}
          label="Chat Users"
          accent="teal"
        />
        <DashboardStatsCard
          value={agentUsers}
          label="Agent Users"
          accent="indigo"
        />
        <DashboardStatsCard
          value={completionOnlyUsers}
          label="Completion Only Users"
          accent="amber"
        />
      </div>

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
          <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                {renderSortButton('user_login', 'User')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                {renderSortButton('total_user_initiated_interactions', 'User Interactions')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                {renderSortButton('total_code_generation_activities', 'Code Generation')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                {renderSortButton('total_code_acceptance_activities', 'Code Acceptance')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                {renderSortButton('total_loc_added', 'LOC Added')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                {renderSortButton('total_loc_deleted', 'LOC Deleted')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                {renderSortButton('total_loc_suggested_to_add', 'Suggested Add')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                {renderSortButton('days_active', 'Days Active')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                Features Used
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedUsers.map((user) => (
              <tr 
                key={user.user_id} 
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleUserClick(user)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
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
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.total_user_initiated_interactions.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.total_code_generation_activities.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.total_code_acceptance_activities.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{user.total_loc_added.toLocaleString()}</div></td>
                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{user.total_loc_deleted.toLocaleString()}</div></td>
                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{user.total_loc_suggested_to_add.toLocaleString()}</div></td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.days_active}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
