'use client';

import { LanguageStats } from '../utils/metricCalculators';
import { useMemo } from 'react';
import SectionHeader from './ui/SectionHeader';
import DashboardStatsCard from './ui/DashboardStatsCard';
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableColumn,
  DataTableExpandButton,
  DataTableEmptyState,
} from './ui/DataTable';
import type { VoidCallback } from '../types/events';

interface LanguagesViewProps {
  languages: LanguageStats[];
  onBack: VoidCallback;
}

export default function LanguagesView({ languages, onBack }: LanguagesViewProps) {

  // Calculate summary statistics
  const totalLanguages = languages.length;
  const totalGenerations = languages.reduce((sum, lang) => sum + lang.totalGenerations, 0);
  const totalAcceptances = languages.reduce((sum, lang) => sum + lang.totalAcceptances, 0);
  const totalEngagements = languages.reduce((sum, lang) => sum + lang.totalEngagements, 0);
  const totalUsers = Math.max(...languages.map(lang => lang.uniqueUsers), 0);
  const totalLocAdded = languages.reduce((sum, lang) => sum + lang.locAdded, 0);
  const totalLocDeleted = languages.reduce((sum, lang) => sum + lang.locDeleted, 0);

  const totalNetLocImpact = totalLocAdded - totalLocDeleted;

  // Create sorted lists for the two tables
  const languagesByGenerations = useMemo(() => [...languages].sort((a, b) => b.totalGenerations - a.totalGenerations), [languages]);
  const languagesByUsers = useMemo(() => [...languages].sort((a, b) => b.uniqueUsers - a.uniqueUsers), [languages]);
  const languagesByNetLocImpact = useMemo(() => [...languages].sort((a, b) => (b.locAdded - b.locDeleted) - (a.locAdded - a.locDeleted)), [languages]);

  // Determine how many items to show
  const maxItemsToShow = 10;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <SectionHeader
          title="Programming Languages Analysis"
          description="Detailed breakdown of language usage patterns"
          onBack={onBack}
          descriptionClassName="text-gray-600 mt-1"
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
        <DashboardStatsCard
          value={totalLanguages}
          label="Total Languages"
          accent="blue"
        />
        <DashboardStatsCard
          value={totalEngagements}
          label="Total Engagements"
          accent="purple"
        />
        <DashboardStatsCard
          value={totalGenerations}
          label="Code Generations"
          accent="green"
        />
        <DashboardStatsCard
          value={totalAcceptances}
          label="Code Acceptances"
          accent="orange"
        />
        <DashboardStatsCard
          value={totalUsers}
          label="Max Users/Lang"
          accent="teal"
        />
        <DashboardStatsCard
          value={totalLocAdded}
          label="LOC Added"
          accent="orange"
        />
        <DashboardStatsCard
          value={totalLocDeleted}
          label="LOC Deleted"
          accent="rose"
        />
          <DashboardStatsCard
            value={totalNetLocImpact}
            label="Net LOC Impact"
            accent={totalNetLocImpact >= 0 ? 'green' : 'rose'}
          />
      </div>

      {/* Two Column Layout for Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Languages by Number of Generations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages by Code Generations</h3>
          <DataTable
            data={languagesByGenerations}
            defaultSortField="totalGenerations"
            defaultSortDirection="desc"
            initialCount={maxItemsToShow}
          >
            <DataTableHeader className="bg-gray-50">
              <DataTableColumn<LanguageStats> field="language" sortable className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</DataTableColumn>
              <DataTableColumn<LanguageStats> field="totalGenerations" sortable className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generations</DataTableColumn>
              <DataTableColumn className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance Rate</DataTableColumn>
            </DataTableHeader>
            <DataTableBody<LanguageStats>
              rowClassName={() => 'hover:bg-gray-50'}
            >
              {(lang) => {
                const acceptanceRate = lang.totalGenerations > 0 
                  ? ((lang.totalAcceptances / lang.totalGenerations) * 100).toFixed(1)
                  : '0.0';
                const globalRank = languagesByGenerations.findIndex((candidate) => candidate === lang) + 1;

                return (
                  <>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 mr-3">
                          <div className="h-8 w-8 rounded bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {globalRank}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{lang.language}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lang.totalGenerations.toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{acceptanceRate}%</div>
                    </td>
                  </>
                );
              }}
            </DataTableBody>
            <DataTableExpandButton
              collapsedLabel={(total) => `Show All ${total} Languages`}
              expandedLabel="Show Less"
            />
          </DataTable>
        </div>

        {/* Languages by Number of Users */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages by Number of Users</h3>
          <DataTable
            data={languagesByUsers}
            defaultSortField="uniqueUsers"
            defaultSortDirection="desc"
            initialCount={maxItemsToShow}
          >
            <DataTableHeader className="bg-gray-50">
              <DataTableColumn<LanguageStats> field="language" sortable className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</DataTableColumn>
              <DataTableColumn<LanguageStats> field="uniqueUsers" sortable className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</DataTableColumn>
              <DataTableColumn className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Engagements</DataTableColumn>
            </DataTableHeader>
            <DataTableBody<LanguageStats>
              rowClassName={() => 'hover:bg-gray-50'}
            >
              {(lang) => {
                const avgEngagements = lang.uniqueUsers > 0 
                  ? (lang.totalEngagements / lang.uniqueUsers).toFixed(1)
                  : '0.0';
                const globalRank = languagesByUsers.findIndex((candidate) => candidate === lang) + 1;

                return (
                  <>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 mr-3">
                          <div className="h-8 w-8 rounded bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                            {globalRank}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{lang.language}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lang.uniqueUsers.toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{avgEngagements}</div>
                    </td>
                  </>
                );
              }}
            </DataTableBody>
            <DataTableExpandButton
              collapsedLabel={(total) => `Show All ${total} Languages`}
              expandedLabel="Show Less"
            />
          </DataTable>
        </div>
      </div>

      {/* Net Productivity Impact by Language */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Net Productivity Impact by Language</h3>
        <p className="text-sm text-gray-500 mb-4">
          Net LOC impact estimates how much accepted code Copilot is changing per language, combining lines of code added and deleted.
        </p>
        <DataTable
          data={languagesByNetLocImpact}
          initialCount={maxItemsToShow}
        >
          <DataTableHeader className="bg-gray-50">
            <DataTableColumn className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</DataTableColumn>
            <DataTableColumn<LanguageStats> field="language" sortable className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</DataTableColumn>
            <DataTableColumn className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net LOC Impact</DataTableColumn>
            <DataTableColumn<LanguageStats> field="totalGenerations" sortable className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Generations</DataTableColumn>
            <DataTableColumn className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acceptance Rate</DataTableColumn>
          </DataTableHeader>
          <DataTableBody<LanguageStats>
            rowClassName={() => 'hover:bg-gray-50'}
          >
            {(lang) => {
              const acceptanceRate = lang.totalGenerations > 0
                ? ((lang.totalAcceptances / lang.totalGenerations) * 100).toFixed(1)
                : '0.0';
              const netLocImpact = lang.locAdded - lang.locDeleted;
              const rank = languagesByNetLocImpact.findIndex((candidate) => candidate === lang) + 1;

              const impactColor = netLocImpact > 0 ? 'text-green-600' : netLocImpact < 0 ? 'text-rose-600' : 'text-gray-500';

              return (
                <>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{rank}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{lang.language}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${impactColor}`}>
                      {netLocImpact.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{lang.totalGenerations.toLocaleString()}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{acceptanceRate}%</div>
                  </td>
                </>
              );
            }}
          </DataTableBody>
          <DataTableExpandButton
            collapsedLabel={(total) => `Show All ${total} Languages`}
            expandedLabel="Show Less"
          />
        </DataTable>
      </div>

      {/* Full Languages Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Languages Breakdown</h3>
        <DataTable
          data={languages}
          defaultSortField="totalEngagements"
          defaultSortDirection="desc"
          initialCount={maxItemsToShow}
        >
          <DataTableHeader className="bg-gray-50">
            <DataTableColumn<LanguageStats> field="language" sortable>Language</DataTableColumn>
            <DataTableColumn<LanguageStats> field="totalEngagements" sortable>Total Engagements</DataTableColumn>
            <DataTableColumn<LanguageStats> field="totalGenerations" sortable>Generations</DataTableColumn>
            <DataTableColumn<LanguageStats> field="totalAcceptances" sortable>Acceptances</DataTableColumn>
            <DataTableColumn<LanguageStats> field="uniqueUsers" sortable>Unique Users</DataTableColumn>
            <DataTableColumn<LanguageStats> field="locAdded" sortable>LOC Added</DataTableColumn>
            <DataTableColumn<LanguageStats> field="locDeleted" sortable>LOC Deleted</DataTableColumn>
            <DataTableColumn<LanguageStats> field="locSuggestedToAdd" sortable>Suggested Add</DataTableColumn>
            <DataTableColumn>Net LOC Impact</DataTableColumn>
            <DataTableColumn>Acceptance Rate</DataTableColumn>
          </DataTableHeader>
          <DataTableBody<LanguageStats>
            rowClassName={() => 'hover:bg-gray-50'}
          >
            {(lang) => {
              const acceptanceRate = lang.totalGenerations > 0 
                ? ((lang.totalAcceptances / lang.totalGenerations) * 100).toFixed(1)
                : '0.0';

              const netLocImpact = lang.locAdded - lang.locDeleted;
              const impactColor = netLocImpact > 0 ? 'text-green-600' : netLocImpact < 0 ? 'text-rose-600' : 'text-gray-500';

              return (
                <>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{lang.language}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{lang.totalEngagements.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{lang.totalGenerations.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{lang.totalAcceptances.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{lang.uniqueUsers.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{lang.locAdded.toLocaleString()}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{lang.locDeleted.toLocaleString()}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{lang.locSuggestedToAdd.toLocaleString()}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${impactColor}`}>
                      {netLocImpact.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{acceptanceRate}%</div>
                  </td>
                </>
              );
            }}
          </DataTableBody>
          <DataTableExpandButton
            collapsedLabel={(total) => `Show All ${total} Languages`}
            expandedLabel="Show Less"
          />
          <DataTableEmptyState message="No language data available" />
        </DataTable>
      </div>
    </div>
  );
}
