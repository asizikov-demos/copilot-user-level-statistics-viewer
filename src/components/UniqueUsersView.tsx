'use client';

import { UserSummary, CopilotMetrics } from '../types/metrics';
import { useState } from 'react';

interface UniqueUsersViewProps {
  users: UserSummary[];
  rawMetrics: CopilotMetrics[];
  onBack: () => void;
  onUserClick: (userLogin: string, userId: number, userMetrics: CopilotMetrics[]) => void;
}

type SortField = 'user_login' | 'total_user_initiated_interactions' | 'total_code_generation_activities' | 'total_code_acceptance_activities' | 'days_active' | 'total_loc_added' | 'total_loc_deleted' | 'total_loc_suggested_to_add' | 'total_loc_suggested_to_delete';
type SortDirection = 'asc' | 'desc';

export default function UniqueUsersView({ users, rawMetrics, onBack, onUserClick }: UniqueUsersViewProps) {
  const [sortField, setSortField] = useState<SortField>('total_user_initiated_interactions');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleUserClick = (user: UserSummary) => {
    const userMetrics = rawMetrics.filter(metric => metric.user_id === user.user_id);
    onUserClick(user.user_login, user.user_id, userMetrics);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal as string).toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });

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
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Unique Users</h2>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md transition-colors"
          >
            ← Back to Overview
          </button>
        </div>
      </div>

      {/* Summary Stats */}
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{users.length}</div>
          <div className="text-sm text-gray-600">Total Users</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{totalInteractions.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Interactions</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">{totalGeneration.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Code Generation</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">{totalAcceptance.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Code Acceptance</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-teal-600">{chatUsers}</div>
          <div className="text-sm text-gray-600">Chat Users</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-indigo-600">{agentUsers}</div>
          <div className="text-sm text-gray-600">Agent Users</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-amber-600">{completionOnlyUsers}</div>
          <div className="text-sm text-gray-600">Completion Only Users</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                <button
                  onClick={() => handleSort('user_login')}
                  className="flex items-center hover:text-gray-700 focus:outline-none"
                >
                  User
                  {getSortIcon('user_login')}
                </button>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                <button
                  onClick={() => handleSort('total_user_initiated_interactions')}
                  className="flex items-center hover:text-gray-700 focus:outline-none"
                >
                  User Interactions
                  {getSortIcon('total_user_initiated_interactions')}
                </button>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                <button
                  onClick={() => handleSort('total_code_generation_activities')}
                  className="flex items-center hover:text-gray-700 focus:outline-none"
                >
                  Code Generation
                  {getSortIcon('total_code_generation_activities')}
                </button>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                <button
                  onClick={() => handleSort('total_code_acceptance_activities')}
                  className="flex items-center hover:text-gray-700 focus:outline-none"
                >
                  Code Acceptance
                  {getSortIcon('total_code_acceptance_activities')}
                </button>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                <button onClick={() => handleSort('total_loc_added')} className="flex items-center hover:text-gray-700 focus:outline-none">LOC Added {getSortIcon('total_loc_added')}</button>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                <button onClick={() => handleSort('total_loc_deleted')} className="flex items-center hover:text-gray-700 focus:outline-none">LOC Deleted {getSortIcon('total_loc_deleted')}</button>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                <button onClick={() => handleSort('total_loc_suggested_to_add')} className="flex items-center hover:text-gray-700 focus:outline-none">Suggested Add {getSortIcon('total_loc_suggested_to_add')}</button>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                <button onClick={() => handleSort('total_loc_suggested_to_delete')} className="flex items-center hover:text-gray-700 focus:outline-none">Suggested Delete {getSortIcon('total_loc_suggested_to_delete')}</button>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                <button
                  onClick={() => handleSort('days_active')}
                  className="flex items-center hover:text-gray-700 focus:outline-none"
                >
                  Days Active
                  {getSortIcon('days_active')}
                </button>
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
                <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{user.total_loc_suggested_to_delete.toLocaleString()}</div></td>
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
    </div>
  );
}
