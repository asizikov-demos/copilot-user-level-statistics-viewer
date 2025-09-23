'use client';

import { LanguageStats } from '../utils/metricsParser';
import { useState } from 'react';

interface LanguagesViewProps {
  languages: LanguageStats[];
  onBack: () => void;
}

type SortField = 'language' | 'totalGenerations' | 'totalAcceptances' | 'totalEngagements' | 'uniqueUsers' | 'locAdded' | 'locDeleted' | 'locSuggestedToAdd' | 'locSuggestedToDelete';
type SortDirection = 'asc' | 'desc';

export default function LanguagesView({ languages, onBack }: LanguagesViewProps) {
  const [sortField, setSortField] = useState<SortField>('totalEngagements');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedGenerations, setExpandedGenerations] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState(false);
  const [expandedFull, setExpandedFull] = useState(false);

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
  const totalLocSuggestedToAdd = languages.reduce((sum, lang) => sum + lang.locSuggestedToAdd, 0);
  const totalLocSuggestedToDelete = languages.reduce((sum, lang) => sum + lang.locSuggestedToDelete, 0);

  // Create sorted lists for the two tables
  const languagesByGenerations = [...languages].sort((a, b) => b.totalGenerations - a.totalGenerations);
  const languagesByUsers = [...languages].sort((a, b) => b.uniqueUsers - a.uniqueUsers);

  // Determine how many items to show
  const maxItemsToShow = 10;
  const generationsToShow = expandedGenerations ? languagesByGenerations : languagesByGenerations.slice(0, maxItemsToShow);
  const usersToShow = expandedUsers ? languagesByUsers : languagesByUsers.slice(0, maxItemsToShow);
  const fullTableToShow = expandedFull ? sortedLanguages : sortedLanguages.slice(0, maxItemsToShow);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Programming Languages Analysis</h2>
            <p className="text-gray-600 mt-1">Detailed breakdown of language usage patterns</p>
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
  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{totalLanguages}</div>
          <div className="text-sm text-gray-600">Total Languages</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">{totalEngagements.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Total Engagements</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{totalGenerations.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Code Generations</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">{totalAcceptances.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Code Acceptances</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-teal-600">{totalUsers.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Max Users/Lang</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">{totalLocAdded.toLocaleString()}</div>
          <div className="text-sm text-gray-600">LOC Added</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-rose-600">{totalLocDeleted.toLocaleString()}</div>
          <div className="text-sm text-gray-600">LOC Deleted</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-teal-600">{totalLocSuggestedToAdd.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Suggested Add</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-indigo-600">{totalLocSuggestedToDelete.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Suggested Delete</div>
        </div>
      </div>

      {/* Two Column Layout for Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Languages by Number of Generations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages by Code Generations</h3>
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
                {generationsToShow.map((lang, index) => {
                  const acceptanceRate = lang.totalGenerations > 0 
                    ? ((lang.totalAcceptances / lang.totalGenerations) * 100).toFixed(1)
                    : '0.0';
                  
                  return (
                    <tr key={lang.language} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 mr-3">
                            <div className="h-8 w-8 rounded bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                              {index + 1}
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
          {languagesByGenerations.length > maxItemsToShow && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setExpandedGenerations(!expandedGenerations)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
              >
                {expandedGenerations ? 'Show Less' : `Show All ${languagesByGenerations.length} Languages`}
              </button>
            </div>
          )}
        </div>

        {/* Languages by Number of Users */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages by Number of Users</h3>
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
                {usersToShow.map((lang, index) => {
                  const avgEngagements = lang.uniqueUsers > 0 
                    ? (lang.totalEngagements / lang.uniqueUsers).toFixed(1)
                    : '0.0';
                  
                  return (
                    <tr key={lang.language} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 mr-3">
                            <div className="h-8 w-8 rounded bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
                              {index + 1}
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
          {languagesByUsers.length > maxItemsToShow && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setExpandedUsers(!expandedUsers)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
              >
                {expandedUsers ? 'Show Less' : `Show All ${languagesByUsers.length} Languages`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full Languages Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Languages Breakdown</h3>
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
                  <button onClick={() => handleSort('locSuggestedToDelete')} className="flex items-center hover:text-gray-700 focus:outline-none">Suggested Delete {getSortIcon('locSuggestedToDelete')}</button>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acceptance Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fullTableToShow.map((lang) => {
                const acceptanceRate = lang.totalGenerations > 0 
                  ? ((lang.totalAcceptances / lang.totalGenerations) * 100).toFixed(1)
                  : '0.0';
                
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
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{lang.locSuggestedToDelete.toLocaleString()}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{acceptanceRate}%</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedLanguages.length > maxItemsToShow && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setExpandedFull(!expandedFull)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded-md transition-colors"
            >
              {expandedFull ? 'Show Less' : `Show All ${sortedLanguages.length} Languages`}
            </button>
          </div>
        )}

        {languages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No language data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
