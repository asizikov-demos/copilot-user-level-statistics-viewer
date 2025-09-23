'use client';

import { useState, useMemo, useEffect } from 'react';
import { CopilotMetrics, MetricsStats } from '../types/metrics';
import { 
  parseMetricsFile, 
  calculateStats, 
  calculateUserSummaries, 
  calculateDailyEngagement, 
  calculateDailyChatUsers, 
  calculateDailyChatRequests, 
  calculateLanguageStats, 
  filterUnknownLanguages,
  calculateDailyModelUsage,
  calculateFeatureAdoption,
  calculateDailyPRUAnalysis,
  calculateAgentModeHeatmap,
  calculateModelFeatureDistribution,
  calculateAgentImpactData,
  calculateCodeCompletionImpactData
} from '../utils/metricsParser';
import { filterMetricsByDateRange, getFilteredDateRange } from '../utils/dateFilters';
import UniqueUsersView from '../components/UniqueUsersView';
import UserDetailsView from '../components/UserDetailsView';
import LanguagesView from '../components/LanguagesView';
import IDEView from '../components/IDEView';
import EngagementChart from '../components/EngagementChart';
import ChatUsersChart from '../components/ChatUsersChart';
import ChatRequestsChart from '../components/ChatRequestsChart';
import PRUModelUsageChart from '../components/PRUModelUsageChart';
import FeatureAdoptionChart from '../components/FeatureAdoptionChart';
import PRUCostAnalysisChart from '../components/PRUCostAnalysisChart';
import AgentModeHeatmapChart from '../components/AgentModeHeatmapChart';
import ModelFeatureDistributionChart from '../components/ModelFeatureDistributionChart';
import CodingAgentImpactChart from '../components/CodingAgentImpactChart';
import CodeCompletionImpactChart from '../components/CodeCompletionImpactChart';
import DataQualityAnalysisView from '../components/DataQualityAnalysisView';
import FilterPanel, { DateRangeFilter } from '../components/FilterPanel';
import MetricTile from '../components/MetricTile';
import { useMetricsData } from '../components/MetricsContext';

type ViewMode = 'overview' | 'users' | 'userDetails' | 'languages' | 'ides' | 'dataQuality';

export default function Home() {
  // Publish filtered metrics to context so other pages (e.g., Copilot Impact Analysis) can consume.
  const { setFilteredData } = useMetricsData();
  const [rawMetrics, setRawMetrics] = useState<CopilotMetrics[]>([]);
  const [originalStats, setOriginalStats] = useState<MetricsStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('overview');
  const [selectedUser, setSelectedUser] = useState<{
    login: string;
    id: number;
    metrics: CopilotMetrics[];
  } | null>(null);
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('all');
  const [removeUnknownLanguages, setRemoveUnknownLanguages] = useState<boolean>(false);

  // Calculate filtered data based on date range and language filters
  const filteredData = useMemo(() => {
    if (!rawMetrics.length || !originalStats) {
      return {
        metrics: [],
        stats: null,
        userSummaries: [],
        engagementData: [],
        chatUsersData: [],
        chatRequestsData: [],
        languageStats: [],
        modelUsageData: [],
        featureAdoptionData: null,
        pruAnalysisData: [],
        agentModeHeatmapData: [],
        modelFeatureDistributionData: [],
        agentImpactData: [],
        codeCompletionImpactData: []
      };
    }

    // Apply language filter first if enabled
    const processedMetrics = removeUnknownLanguages ? filterUnknownLanguages(rawMetrics) : rawMetrics;
    
    // Then apply date range filter
    const filteredMetrics = filterMetricsByDateRange(processedMetrics, dateRangeFilter, originalStats.reportEndDay);
    const filteredStats = calculateStats(filteredMetrics);
    const filteredUserSummaries = calculateUserSummaries(filteredMetrics);
    const filteredEngagementData = calculateDailyEngagement(filteredMetrics);
    const filteredChatUsersData = calculateDailyChatUsers(filteredMetrics);
    const filteredChatRequestsData = calculateDailyChatRequests(filteredMetrics);
    const filteredLanguageStats = calculateLanguageStats(filteredMetrics);
    
    // Calculate PRU analysis data
    const filteredModelUsageData = calculateDailyModelUsage(filteredMetrics);
    const filteredFeatureAdoptionData = calculateFeatureAdoption(filteredMetrics);
    const filteredPRUAnalysisData = calculateDailyPRUAnalysis(filteredMetrics);
    const filteredAgentModeHeatmapData = calculateAgentModeHeatmap(filteredMetrics);
    const filteredModelFeatureDistributionData = calculateModelFeatureDistribution(filteredMetrics);
    const filteredAgentImpactData = calculateAgentImpactData(filteredMetrics);
    const filteredCodeCompletionImpactData = calculateCodeCompletionImpactData(filteredMetrics);

    // Update the date range in stats based on filter
    const { startDay, endDay } = getFilteredDateRange(dateRangeFilter, originalStats.reportStartDay, originalStats.reportEndDay);
    const updatedStats = {
      ...filteredStats,
      reportStartDay: startDay,
      reportEndDay: endDay
    };

    return {
      metrics: filteredMetrics,
      stats: updatedStats,
      userSummaries: filteredUserSummaries,
      engagementData: filteredEngagementData,
      chatUsersData: filteredChatUsersData,
      chatRequestsData: filteredChatRequestsData,
      languageStats: filteredLanguageStats,
      modelUsageData: filteredModelUsageData,
      featureAdoptionData: filteredFeatureAdoptionData,
      pruAnalysisData: filteredPRUAnalysisData,
      agentModeHeatmapData: filteredAgentModeHeatmapData,
      modelFeatureDistributionData: filteredModelFeatureDistributionData,
      agentImpactData: filteredAgentImpactData,
      codeCompletionImpactData: filteredCodeCompletionImpactData
    };
  }, [rawMetrics, originalStats, dateRangeFilter, removeUnknownLanguages]);

  const { 
    metrics, 
    stats, 
    userSummaries, 
    engagementData, 
    chatUsersData, 
    chatRequestsData, 
    languageStats,
    modelUsageData,
    featureAdoptionData,
    pruAnalysisData,
    agentModeHeatmapData,
    modelFeatureDistributionData,
    agentImpactData,
    codeCompletionImpactData
  } = filteredData;

  // Sync filtered data into global context whenever recalculated (only when stats exist to avoid empty placeholder overwriting non-empty state during transitions).
  useEffect(() => {
    if (stats) {
      setFilteredData(filteredData as any);
    }
  }, [filteredData, stats, setFilteredData]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const fileContent = await file.text();
      const parsedMetrics = parseMetricsFile(fileContent);
      const calculatedStats = calculateStats(parsedMetrics);
      
      setRawMetrics(parsedMetrics);
      setOriginalStats(calculatedStats);
    } catch (err) {
      setError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetData = () => {
    setOriginalStats(null);
    setRawMetrics([]);
    setError(null);
    setCurrentView('overview');
    setSelectedUser(null);
    setDateRangeFilter('all');
    setRemoveUnknownLanguages(false);
  };

  const handleDateRangeChange = (filter: DateRangeFilter) => {
    setDateRangeFilter(filter);
  };

  const handleRemoveUnknownLanguagesChange = (remove: boolean) => {
    setRemoveUnknownLanguages(remove);
  };

  const handleUserClick = (userLogin: string, userId: number, userMetrics: CopilotMetrics[]) => {
    setSelectedUser({
      login: userLogin,
      id: userId,
      metrics: userMetrics
    });
    setCurrentView('userDetails');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            GitHub Copilot Usage Metrics Viewer
          </h1>
          <p className="text-gray-600">
            Upload your GitHub Copilot User Level metrics json-file to view usage statistics
          </p>
        </div>

        {/* File Upload Section */}
        {!stats && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Metrics File</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  Click to upload or drag and drop
                </span>
                <span className="text-xs text-gray-500">JSON files only</span>
              </label>
            </div>
            
            {isLoading && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-gray-600">Processing file...</span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Show Data Quality Analysis View */}
        {stats && currentView === 'dataQuality' && (
          <DataQualityAnalysisView 
            metrics={metrics} 
            onBack={() => setCurrentView('overview')} 
          />
        )}

        {/* Show Languages View */}
        {stats && currentView === 'languages' && (
          <LanguagesView 
            languages={languageStats} 
            onBack={() => setCurrentView('overview')} 
          />
        )}

        {/* Show IDE View */}
        {stats && currentView === 'ides' && (
          <IDEView 
            metrics={metrics} 
            onBack={() => setCurrentView('overview')} 
          />
        )}

        {/* Show Unique Users View */}
        {stats && currentView === 'users' && (
          <UniqueUsersView 
            users={userSummaries} 
            rawMetrics={metrics}
            onBack={() => setCurrentView('overview')} 
            onUserClick={handleUserClick}
          />
        )}

        {/* Show User Details View */}
        {stats && currentView === 'userDetails' && selectedUser && (
          <UserDetailsView
            userMetrics={selectedUser.metrics}
            userLogin={selectedUser.login}
            userId={selectedUser.id}
            onBack={() => setCurrentView('users')}
          />
        )}

        {/* Statistics Section */}
        {stats && currentView === 'overview' && (
          <div className="flex gap-6">
            {/* Main Content */}
            <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl text-gray-900">
                  <span className="font-semibold">Metrics Overview</span> - Data covers the period from <strong>{formatDate(stats.reportStartDay)}</strong> to <strong>{formatDate(stats.reportEndDay)}</strong>
                </h2>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setCurrentView('dataQuality')}
                    className="px-4 py-2 text-sm font-medium text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-md transition-colors"
                  >
                    Data Quality Analysis
                  </button>
                  <button
                    onClick={resetData}
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                  >
                    Upload New File
                  </button>
                </div>
              </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
              <MetricTile
                title="Total Records"
                value={stats.totalRecords}
                accent="green"
                icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              />
              <MetricTile
                title="Chat Users"
                value={stats.chatUsers}
                accent="emerald"
                subtitle={`Out of ${stats.uniqueUsers.toLocaleString()} unique users`}
                icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
              />
              <MetricTile
                title="Agent Mode Users"
                value={stats.agentUsers}
                accent="violet"
                subtitle={`Out of ${stats.uniqueUsers.toLocaleString()} unique users`}
                icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
              />
              <MetricTile
                title="Completion Only Users"
                value={stats.completionOnlyUsers}
                accent="amber"
                subtitle={`Out of ${stats.uniqueUsers.toLocaleString()} unique users`}
                icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6 mt-6">
              <MetricTile
                title="Unique Users"
                value={stats.uniqueUsers}
                accent="blue"
                interactive
                onClick={() => setCurrentView('users')}
                icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>}
              />
              <MetricTile
                title="Top Language"
                value={stats.topLanguage?.name || 'N/A'}
                subtitle={`${stats.topLanguage?.engagements?.toLocaleString() || '0'} engagements`}
                accent="purple"
                interactive
                onClick={() => setCurrentView('languages')}
                size="md"
                icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
              />
              <MetricTile
                title="Top IDE"
                value={stats.topIde?.name || 'N/A'}
                subtitle={`${stats.topIde?.entries?.toLocaleString() || '0'} users`}
                accent="orange"
                interactive
                onClick={() => setCurrentView('ides')}
                size="md"
                icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
              />
              <MetricTile
                title="Top Model"
                value={stats.topModel?.name || 'N/A'}
                subtitle={`${stats.topModel?.engagements?.toLocaleString() || '0'} engagements`}
                accent="indigo"
                size="md"
                icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>}
                showArrow={false}
              />
            </div>

            {/* Copilot Impact Tile Row (new row among existing metric tiles) */}
            <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-4 gap-6 mt-6">
              <MetricTile
                title="Copilot Impact"
                value={''}
                subtitle="Understand Impact for your organization"
                accent="indigo"
                href="/copilot-impact"
                showArrow={true}
                icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>}
              />
            </div>

            {/* Daily Engagement Chart */}
            <div className="mt-8 w-full">
              <EngagementChart data={engagementData} />
            </div>

            {/* Daily Chat Users Trends Chart */}
            <div className="mt-8 w-full">
              <ChatUsersChart data={chatUsersData} />
            </div>

            {/* Daily Chat Requests Chart */}
            <div className="mt-8 w-full">
              <ChatRequestsChart data={chatRequestsData} />
            </div>


            {/* PRU Analysis Section */}
            <div className="mt-8">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Premium Request Units (PRU) Analysis</h3>
                <p className="text-gray-600 text-sm">
                  Analyze premium model usage, service value, and feature adoption patterns. Premium models like Claude and Gemini consume PRUs, representing the value of enhanced AI services provided.
                </p>
                {/* Debug info */}
                <div className="text-xs text-gray-500 mt-2">
                  Model Usage Data: {modelUsageData?.length || 0} records, 
                  Feature Adoption: {featureAdoptionData ? 'Available' : 'Not available'},
                  PRU Analysis: {pruAnalysisData?.length || 0} records
                </div>
              </div>

              {/* PRU Model Usage Chart */}
              <div className="mb-8 w-full">
                <PRUModelUsageChart data={modelUsageData || []} />
              </div>

              {/* Feature Adoption Chart */}
              <div className="mb-8 w-full">
                <FeatureAdoptionChart data={featureAdoptionData || {
                  totalUsers: 0,
                  completionUsers: 0,
                  chatUsers: 0,
                  agentModeUsers: 0,
                  askModeUsers: 0,
                  editModeUsers: 0,
                  inlineModeUsers: 0,
                  codeReviewUsers: 0
                }} />
              </div>

              {/* PRU Service Value Analysis Chart */}
              <div className="mb-8 w-full">
                <PRUCostAnalysisChart data={pruAnalysisData || []} />
              </div>

              {/* Agent Mode Heatmap Chart */}
              <div className="mb-8 w-full">
                <AgentModeHeatmapChart data={agentModeHeatmapData || []} />
              </div>

              {/* Model Feature Distribution Chart */}
              <div className="mb-8 w-full">
                <ModelFeatureDistributionChart data={modelFeatureDistributionData || []} />
              </div>
            </div>

            </div>

            {/* Side Panel */}
            <div className="w-64 flex-shrink-0">
              <FilterPanel
                onDateRangeChange={handleDateRangeChange}
                currentFilter={dateRangeFilter}
                reportStartDay={originalStats?.reportStartDay || ''}
                reportEndDay={originalStats?.reportEndDay || ''}
                removeUnknownLanguages={removeUnknownLanguages}
                onRemoveUnknownLanguagesChange={handleRemoveUnknownLanguagesChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
