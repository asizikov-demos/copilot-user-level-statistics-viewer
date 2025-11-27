'use client';

import React from 'react';
import { CopilotMetrics } from '../types/metrics';
import { getIDEIcon, formatIDEName } from './icons/IDEIcons';
import DashboardStatsCard from './ui/DashboardStatsCard';
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableColumn,
} from './ui/DataTable';
import { ViewPanel, MetricTileIcon } from './ui';
import type { VoidCallback } from '../types/events';

interface IDEStats {
  ide: string;
  uniqueUsers: number;
  totalEngagements: number;
  totalGenerations: number;
  totalAcceptances: number;
  locAdded: number;
  locDeleted: number;
  locSuggestedToAdd: number;
  locSuggestedToDelete: number;
}

interface IDEViewProps {
  metrics: CopilotMetrics[];
  onBack: VoidCallback;
}

export default function IDEView({ metrics, onBack }: IDEViewProps) {
  const calculateIDEStats = (): IDEStats[] => {
    const ideMap = new Map<string, {
      users: Set<number>;
      totalEngagements: number;
      totalGenerations: number;
      totalAcceptances: number;
      locAdded: number;
      locDeleted: number;
      locSuggestedToAdd: number;
      locSuggestedToDelete: number;
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
            locAdded: 0,
            locDeleted: 0,
            locSuggestedToAdd: 0,
            locSuggestedToDelete: 0
          });
        }

        const ideStats = ideMap.get(ide)!;
        ideStats.users.add(metric.user_id);
        ideStats.totalGenerations += ideTotal.code_generation_activity_count;
        ideStats.totalAcceptances += ideTotal.code_acceptance_activity_count;
        ideStats.totalEngagements += ideTotal.user_initiated_interaction_count;
        ideStats.locAdded += ideTotal.loc_added_sum;
        ideStats.locDeleted += ideTotal.loc_deleted_sum;
        ideStats.locSuggestedToAdd += ideTotal.loc_suggested_to_add_sum;
        ideStats.locSuggestedToDelete += ideTotal.loc_suggested_to_delete_sum;
      }
    }

    return Array.from(ideMap.entries())
      .map(([ide, stats]) => ({
        ide,
        uniqueUsers: stats.users.size,
        totalEngagements: stats.totalEngagements,
        totalGenerations: stats.totalGenerations,
        totalAcceptances: stats.totalAcceptances,
        locAdded: stats.locAdded,
        locDeleted: stats.locDeleted,
        locSuggestedToAdd: stats.locSuggestedToAdd,
        locSuggestedToDelete: stats.locSuggestedToDelete
      }));
  };

  const ideStats = calculateIDEStats();
  const idesByUsers = [...ideStats].sort((a, b) => b.uniqueUsers - a.uniqueUsers);
  const idesByEngagements = [...ideStats].sort((a, b) => b.totalEngagements - a.totalEngagements);

  const totalIDEs = ideStats.length;
  const sumUsersPerIDE = ideStats.reduce((sum, ide) => sum + ide.uniqueUsers, 0);
  const averageUsersPerIDE = totalIDEs > 0 ? Math.round((sumUsersPerIDE / totalIDEs) * 10) / 10 : 0;

  const userIdToIDEs = new Map<number, Set<string>>();
  for (const metric of metrics) {
    const idesForUser = userIdToIDEs.get(metric.user_id) ?? new Set<string>();
    for (const ideTotal of metric.totals_by_ide) {
      idesForUser.add(ideTotal.ide);
    }
    if (idesForUser.size > 0) {
      userIdToIDEs.set(metric.user_id, idesForUser);
    }
  }

  const multiIDEUsersCount = Array.from(userIdToIDEs.values()).filter(ides => ides.size > 1).length;
  const totalUniqueIDEUsers = userIdToIDEs.size;
  const topIDE = idesByUsers[0];
  const topIDEUserShare = topIDE && totalUniqueIDEUsers > 0
    ? Math.round((topIDE.uniqueUsers / totalUniqueIDEUsers) * 1000) / 10
    : 0;

  const renderIDERow = (ide: IDEStats, sortBy: 'users' | 'engagements') => {
    const IDEIcon = getIDEIcon(ide.ide);
    const acceptanceRate = ide.totalGenerations > 0 
      ? (ide.totalAcceptances / ide.totalGenerations * 100).toFixed(1)
      : '0.0';
    
    return (
      <>
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
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.locAdded.toLocaleString()}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.locDeleted.toLocaleString()}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.locSuggestedToAdd.toLocaleString()}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ide.locSuggestedToDelete.toLocaleString()}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {acceptanceRate}%
        </td>
      </>
    );
  };

  return (
    <ViewPanel
      headerProps={{
        title: 'IDE Statistics',
        description: 'Overview of IDE usage across your organization.',
        onBack,
      }}
      contentClassName="space-y-8"
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardStatsCard
            value={totalIDEs}
            label="Total IDEs"
            accent="blue"
            tone="tint"
            icon={<MetricTileIcon name="top-ide" />}
          />

          <DashboardStatsCard
            value={averageUsersPerIDE}
            label="Avg Users per IDE"
            accent="green"
            tone="tint"
            icon={<MetricTileIcon name="average-users" />}
          />

          <DashboardStatsCard
            value={multiIDEUsersCount}
            label="Multi-IDE Users"
            accent="purple"
            tone="tint"
            icon={<MetricTileIcon name="multi-ide" />}
          />

          {topIDE && (
            <DashboardStatsCard
              value={`${topIDEUserShare.toLocaleString()}%`}
              label={`${formatIDEName(topIDE.ide)} User Share`}
              accent="teal"
              tone="tint"
              icon={<MetricTileIcon name="share" />}
            />
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">IDEs Ordered by Number of Users</h3>
          </div>
          <DataTable
            data={idesByUsers}
            defaultSortField="uniqueUsers"
            defaultSortDirection="desc"
          >
            <DataTableHeader>
              <DataTableColumn<IDEStats> field="ide" sortable>IDE</DataTableColumn>
              <DataTableColumn<IDEStats> field="uniqueUsers" sortable>Unique Users</DataTableColumn>
              <DataTableColumn<IDEStats> field="totalGenerations" sortable>Generations</DataTableColumn>
              <DataTableColumn<IDEStats> field="totalAcceptances" sortable>Acceptances</DataTableColumn>
              <DataTableColumn<IDEStats> field="locAdded" sortable>LOC Added</DataTableColumn>
              <DataTableColumn<IDEStats> field="locDeleted" sortable>LOC Deleted</DataTableColumn>
              <DataTableColumn<IDEStats> field="locSuggestedToAdd" sortable>Suggested Add</DataTableColumn>
              <DataTableColumn<IDEStats> field="locSuggestedToDelete" sortable>Suggested Delete</DataTableColumn>
              <DataTableColumn>Acceptance Rate</DataTableColumn>
            </DataTableHeader>
            <DataTableBody<IDEStats>
              rowClassName={(_, index) => index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
            >
              {(ide) => renderIDERow(ide, 'users')}
            </DataTableBody>
          </DataTable>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">IDEs Ordered by Number of Engagements</h3>
          </div>
          <DataTable
            data={idesByEngagements}
            defaultSortField="totalEngagements"
            defaultSortDirection="desc"
          >
            <DataTableHeader>
              <DataTableColumn<IDEStats> field="ide" sortable>IDE</DataTableColumn>
              <DataTableColumn<IDEStats> field="totalEngagements" sortable>Total Engagements</DataTableColumn>
              <DataTableColumn<IDEStats> field="totalGenerations" sortable>Generations</DataTableColumn>
              <DataTableColumn<IDEStats> field="totalAcceptances" sortable>Acceptances</DataTableColumn>
              <DataTableColumn<IDEStats> field="locAdded" sortable>LOC Added</DataTableColumn>
              <DataTableColumn<IDEStats> field="locDeleted" sortable>LOC Deleted</DataTableColumn>
              <DataTableColumn<IDEStats> field="locSuggestedToAdd" sortable>Suggested Add</DataTableColumn>
              <DataTableColumn<IDEStats> field="locSuggestedToDelete" sortable>Suggested Delete</DataTableColumn>
              <DataTableColumn>Acceptance Rate</DataTableColumn>
            </DataTableHeader>
            <DataTableBody<IDEStats>
              rowClassName={(_, index) => index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
            >
              {(ide) => renderIDERow(ide, 'engagements')}
            </DataTableBody>
          </DataTable>
        </div>
      </div>
    </ViewPanel>
  );
}
