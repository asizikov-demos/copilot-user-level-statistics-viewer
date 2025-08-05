'use client';

import React from 'react';
import { CopilotMetrics } from '../types/metrics';
import { getIDEIcon, formatIDEName } from '../utils/ideIcons';

interface IDEStats {
  ide: string;
  uniqueUsers: number;
  totalEngagements: number;
  totalGenerations: number;
  totalAcceptances: number;
  totalGeneratedLoc: number;
  totalAcceptedLoc: number;
}

interface IDEViewProps {
  metrics: CopilotMetrics[];
  onBack: () => void;
}

export default function IDEView({ metrics, onBack }: IDEViewProps) {
  // Calculate IDE statistics
  const calculateIDEStats = (): IDEStats[] => {
    const ideMap = new Map<string, {
      users: Set<number>;
      totalEngagements: number;
      totalGenerations: number;
      totalAcceptances: number;
      totalGeneratedLoc: number;
      totalAcceptedLoc: number;
    }>();

    for (const metric of metrics) {
      for (const ideTotal of metric.totals_by_ide) {
        const ide = ideTotal.ide;
        
        if (!ideMap.has(ide)) {
          ideMap.set(ide, {
            users: new Set(),
            totalEngagements: 0,
            totalGenerations: 0,
            totalAcceptances: 0,
            totalGeneratedLoc: 0,
            totalAcceptedLoc: 0
          });
        }

        const ideStats = ideMap.get(ide)!;
        ideStats.users.add(metric.user_id);
        ideStats.totalGenerations += ideTotal.code_generation_activity_count;
        ideStats.totalAcceptances += ideTotal.code_acceptance_activity_count;
        ideStats.totalEngagements += ideTotal.user_initiated_interaction_count;
        ideStats.totalGeneratedLoc += ideTotal.generated_loc_sum;
        ideStats.totalAcceptedLoc += ideTotal.accepted_loc_sum;
      }
    }

    return Array.from(ideMap.entries())
      .map(([ide, stats]) => ({
        ide,
        uniqueUsers: stats.users.size,
        totalEngagements: stats.totalEngagements,
        totalGenerations: stats.totalGenerations,
        totalAcceptances: stats.totalAcceptances,
        totalGeneratedLoc: stats.totalGeneratedLoc,
        totalAcceptedLoc: stats.totalAcceptedLoc
      }));
  };

  const ideStats = calculateIDEStats();
  const idesByUsers = [...ideStats].sort((a, b) => b.uniqueUsers - a.uniqueUsers);
  const idesByEngagements = [...ideStats].sort((a, b) => b.totalEngagements - a.totalEngagements);

  const renderIDETable = (ides: IDEStats[], title: string, sortBy: 'users' | 'engagements') => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IDE
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {sortBy === 'users' ? 'Unique Users' : 'Total Engagements'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Generations
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acceptances
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Generated LOC
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Accepted LOC
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acceptance Rate
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ides.map((ide, index) => {
              const IDEIcon = getIDEIcon(ide.ide);
              const acceptanceRate = ide.totalGenerations > 0 
                ? (ide.totalAcceptances / ide.totalGenerations * 100).toFixed(1)
                : '0.0';
              
              return (
                <tr key={ide.ide} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sortBy === 'users' ? ide.uniqueUsers.toLocaleString() : ide.totalEngagements.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ide.totalGenerations.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ide.totalAcceptances.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ide.totalGeneratedLoc.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ide.totalAcceptedLoc.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {acceptanceRate}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">IDE Statistics</h2>
            <p className="text-gray-600">Overview of IDE usage across your organization</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Total IDEs</p>
                <p className="text-2xl font-bold text-blue-900">{ideStats.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Total Users</p>
                <p className="text-2xl font-bold text-green-900">
                  {ideStats.reduce((sum, ide) => sum + ide.uniqueUsers, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">Total Engagements</p>
                <p className="text-2xl font-bold text-purple-900">
                  {ideStats.reduce((sum, ide) => sum + ide.totalEngagements, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* IDEs by Number of Users */}
        {renderIDETable(idesByUsers, 'IDEs Ordered by Number of Users', 'users')}

        {/* IDEs by Number of Engagements */}
        {renderIDETable(idesByEngagements, 'IDEs Ordered by Number of Engagements', 'engagements')}
      </div>
    </div>
  );
}
