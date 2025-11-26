'use client';

import { UserSummary, CopilotMetrics } from '../types/metrics';
import { useUsernameTrieSearch } from '../hooks/useUsernameTrieSearch';
import SectionHeader from './ui/SectionHeader';
import DashboardStatsCard from './ui/DashboardStatsCard';
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableColumn,
  DataTableEmptyState,
} from './ui/DataTable';
import type { VoidCallback } from '../types/events';

interface UniqueUsersViewProps {
  users: UserSummary[];
  rawMetrics: CopilotMetrics[];
  onBack: VoidCallback;
  onUserClick: (userLogin: string, userId: number, userMetrics: CopilotMetrics[]) => void;
}

export default function UniqueUsersView({ users, rawMetrics, onBack, onUserClick }: UniqueUsersViewProps) {
  const { searchQuery, setSearchQuery, filteredUsers } = useUsernameTrieSearch(users);

  const handleUserClick = (user: UserSummary) => {
    const userMetrics = rawMetrics.filter(metric => metric.user_id === user.user_id);
    onUserClick(user.user_login, user.user_id, userMetrics);
  };

  // Calculate summary statistics
  const totalInteractions = users.reduce((sum, user) => sum + user.total_user_initiated_interactions, 0);
  const totalGeneration = users.reduce((sum, user) => sum + user.total_code_generation_activities, 0);
  const totalAcceptance = users.reduce((sum, user) => sum + user.total_code_acceptance_activities, 0);
  const chatUsers = users.filter(user => user.used_chat).length;
  const agentUsers = users.filter(user => user.used_agent).length;
  const completionOnlyUsers = users.filter(user => !user.used_chat && !user.used_agent).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <SectionHeader
          title="Unique Users"
          onBack={onBack}
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
        <DataTable
          data={filteredUsers}
          defaultSortField="total_user_initiated_interactions"
          defaultSortDirection="desc"
        >
          <DataTableHeader className="bg-gray-50">
            <DataTableColumn<UserSummary> field="user_login" sortable width="25%">User</DataTableColumn>
            <DataTableColumn<UserSummary> field="total_user_initiated_interactions" sortable>User Interactions</DataTableColumn>
            <DataTableColumn<UserSummary> field="total_code_generation_activities" sortable>Code Generation</DataTableColumn>
            <DataTableColumn<UserSummary> field="total_code_acceptance_activities" sortable>Code Acceptance</DataTableColumn>
            <DataTableColumn<UserSummary> field="total_loc_added" sortable>LOC Added</DataTableColumn>
            <DataTableColumn<UserSummary> field="total_loc_deleted" sortable>LOC Deleted</DataTableColumn>
            <DataTableColumn<UserSummary> field="total_loc_suggested_to_add" sortable>Suggested Add</DataTableColumn>
            <DataTableColumn<UserSummary> field="days_active" sortable>Days Active</DataTableColumn>
            <DataTableColumn>Features Used</DataTableColumn>
          </DataTableHeader>
          <DataTableBody<UserSummary>
            onRowClick={handleUserClick}
          >
            {(user) => (
              <>
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
              </>
            )}
          </DataTableBody>
          <DataTableEmptyState message="No user data available" />
        </DataTable>
      </div>
    </div>
  );
}
