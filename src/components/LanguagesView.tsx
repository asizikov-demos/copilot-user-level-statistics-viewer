'use client';

import { LanguageStats } from '../domain/calculators/metricCalculators';
import { useState } from 'react';
import ExpandableTableSection from './ui/ExpandableTableSection';
import DashboardStatsCard from './ui/DashboardStatsCard';
import { ViewPanel } from './ui';
import type { VoidCallback } from '../types/events';

interface LanguagesViewProps {
  languages: LanguageStats[];
  onBack: VoidCallback;
}

type SortField = 'language' | 'totalGenerations' | 'totalAcceptances' | 'totalEngagements' | 'uniqueUsers' | 'locAdded' | 'locDeleted' | 'locSuggestedToAdd' | 'locSuggestedToDelete';
type SortDirection = 'asc' | 'desc';

export default function LanguagesView({ languages, onBack }: LanguagesViewProps) {
  const [sortField, setSortField] = useState<SortField>('totalEngagements');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedLanguages = [...languages].sort((a, b) => {
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
  const totalLanguages = languages.length;
  const totalGenerations = languages.reduce((sum, lang) => sum + lang.totalGenerations, 0);
  const totalAcceptances = languages.reduce((sum, lang) => sum + lang.totalAcceptances, 0);
  const totalEngagements = languages.reduce((sum, lang) => sum + lang.totalEngagements, 0);
  const totalUsers = Math.max(...languages.map(lang => lang.uniqueUsers), 0);
  const totalLocAdded = languages.reduce((sum, lang) => sum + lang.locAdded, 0);
  const totalLocDeleted = languages.reduce((sum, lang) => sum + lang.locDeleted, 0);

  const totalNetLocImpact = totalLocAdded - totalLocDeleted;

  // Create sorted lists for the two tables
  const languagesByGenerations = [...languages].sort((a, b) => b.totalGenerations - a.totalGenerations);
  const languagesByUsers = [...languages].sort((a, b) => b.uniqueUsers - a.uniqueUsers);
  const languagesByNetLocImpact = [...languages].sort((a, b) => (b.locAdded - b.locDeleted) - (a.locAdded - a.locDeleted));

  // Determine how many items to show
  const maxItemsToShow = 10;
  return (
    <ViewPanel
      headerProps={{
        title: 'Programming Languages Analysis',
        description: 'Detailed breakdown of language usage patterns',
        onBack,
        descriptionClassName: 'text-gray-600 mt-1',
      }}
      contentClassName="space-y-6"
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4 mb-6">
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200">
        {/* Languages by Number of Generations */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages by Code Generations</h3>
          <ExpandableTableSection
            items={languagesByGenerations}
            initialCount={maxItemsToShow}
            buttonCollapsedLabel={(total) => `Show All ${total} Languages`}
            buttonExpandedLabel="Show Less"
          >
            {({ visibleItems }) => (
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Language
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Generations
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acceptance Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {visibleItems.map((lang) => {
                      const acceptanceRate = lang.totalGenerations > 0 
                        ? ((lang.totalAcceptances / lang.totalGenerations) * 100).toFixed(1)
                        : '0.0';
                      const globalRank = languagesByGenerations.findIndex((candidate) => candidate === lang) + 1;

                      return (
                        <tr key={lang.language} className="hover:bg-gray-50">
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ExpandableTableSection>
        </div>

        {/* Languages by Number of Users */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages by Number of Users</h3>
          <ExpandableTableSection
            items={languagesByUsers}
            initialCount={maxItemsToShow}
            buttonCollapsedLabel={(total) => `Show All ${total} Languages`}
            buttonExpandedLabel="Show Less"
          >
            {({ visibleItems }) => (
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Language
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Users
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Engagements
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {visibleItems.map((lang) => {
                      const avgEngagements = lang.uniqueUsers > 0 
                        ? (lang.totalEngagements / lang.uniqueUsers).toFixed(1)
                        : '0.0';
                      const globalRank = languagesByUsers.findIndex((candidate) => candidate === lang) + 1;

                      return (
                        <tr key={lang.language} className="hover:bg-gray-50">
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
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ExpandableTableSection>
        </div>
      </div>

      {/* Net Productivity Impact by Language */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Net Productivity Impact by Language</h3>
        <p className="text-sm text-gray-500 mb-4">
          Net LOC impact estimates how much accepted code Copilot is changing per language, combining lines of code added and deleted.
        </p>
        <ExpandableTableSection
          items={languagesByNetLocImpact}
          initialCount={maxItemsToShow}
          buttonCollapsedLabel={(total) => `Show All ${total} Languages`}
          buttonExpandedLabel="Show Less"
        >
          {({ visibleItems }) => (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Language
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net LOC Impact
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Generations
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acceptance Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visibleItems.map((lang) => {
                    const acceptanceRate = lang.totalGenerations > 0
                      ? ((lang.totalAcceptances / lang.totalGenerations) * 100).toFixed(1)
                      : '0.0';
                    const netLocImpact = lang.locAdded - lang.locDeleted;
                    const rank = languagesByNetLocImpact.findIndex((candidate) => candidate === lang) + 1;

                    const impactColor = netLocImpact > 0 ? 'text-green-600' : netLocImpact < 0 ? 'text-rose-600' : 'text-gray-500';

                    return (
                      <tr key={lang.language} className="hover:bg-gray-50">
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ExpandableTableSection>
      </div>

      {/* Full Languages Table */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Languages Breakdown</h3>
        <ExpandableTableSection
          items={sortedLanguages}
          initialCount={maxItemsToShow}
          buttonCollapsedLabel={(total) => `Show All ${total} Languages`}
          buttonExpandedLabel="Show Less"
        >
          {({ visibleItems }) => (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('language')}
                        className="flex items-center hover:text-gray-700 focus:outline-none"
                      >
                        Language
                        {getSortIcon('language')}
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('totalEngagements')}
                        className="flex items-center hover:text-gray-700 focus:outline-none"
                      >
                        Total Engagements
                        {getSortIcon('totalEngagements')}
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('totalGenerations')}
                        className="flex items-center hover:text-gray-700 focus:outline-none"
                      >
                        Generations
                        {getSortIcon('totalGenerations')}
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('totalAcceptances')}
                        className="flex items-center hover:text-gray-700 focus:outline-none"
                      >
                        Acceptances
                        {getSortIcon('totalAcceptances')}
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('uniqueUsers')}
                        className="flex items-center hover:text-gray-700 focus:outline-none"
                      >
                        Unique Users
                        {getSortIcon('uniqueUsers')}
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('locAdded')}
                        className="flex items-center hover:text-gray-700 focus:outline-none"
                      >
                        LOC Added
                        {getSortIcon('locAdded')}
                      </button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button onClick={() => handleSort('locDeleted')} className="flex items-center hover:text-gray-700 focus:outline-none">LOC Deleted {getSortIcon('locDeleted')}</button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button onClick={() => handleSort('locSuggestedToAdd')} className="flex items-center hover:text-gray-700 focus:outline-none">Suggested Add {getSortIcon('locSuggestedToAdd')}</button>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net LOC Impact
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acceptance Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visibleItems.map((lang) => {
                    const acceptanceRate = lang.totalGenerations > 0 
                      ? ((lang.totalAcceptances / lang.totalGenerations) * 100).toFixed(1)
                      : '0.0';

                    const netLocImpact = lang.locAdded - lang.locDeleted;
                    const impactColor = netLocImpact > 0 ? 'text-green-600' : netLocImpact < 0 ? 'text-rose-600' : 'text-gray-500';

                    return (
                      <tr key={lang.language} className="hover:bg-gray-50">
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ExpandableTableSection>

        {languages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No language data available</p>
          </div>
        )}
      </div>
    </ViewPanel>
  );
}
