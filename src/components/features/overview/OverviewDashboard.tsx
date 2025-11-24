'use client';

import React from 'react';
import { MetricsStats } from '../../../types/metrics';
import { DailyEngagementData, DailyChatUsersData, DailyChatRequestsData } from '../../../utils/metricCalculators';
import FilterPanel from '../../FilterPanel';
import MetricTile from '../../ui/MetricTile';
import EngagementChart from '../../charts/EngagementChart';
import ChatUsersChart from '../../charts/ChatUsersChart';
import ChatRequestsChart from '../../charts/ChatRequestsChart';
import { DateRangeFilter } from '../../../types/filters';
import { ViewMode, VIEW_MODES } from '../../../types/navigation';

interface OverviewDashboardProps {
  stats: MetricsStats;
  originalStats: MetricsStats | null;
  enterpriseName: string | null;
  engagementData: DailyEngagementData[];
  chatUsersData: DailyChatUsersData[];
  chatRequestsData: DailyChatRequestsData[];
  dateRange: DateRangeFilter;
  removeUnknownLanguages: boolean;
  onDateRangeChange: (range: DateRangeFilter) => void;
  onRemoveUnknownLanguagesChange: (remove: boolean) => void;
  onNavigate: (view: ViewMode) => void;
  onModelSelect: (model: string) => void;
  onReset: () => void;
}

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  stats,
  originalStats,
  enterpriseName,
  engagementData,
  chatUsersData,
  chatRequestsData,
  dateRange,
  removeUnknownLanguages,
  onDateRangeChange,
  onRemoveUnknownLanguagesChange,
  onNavigate,
  onModelSelect,
  onReset,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="flex gap-6">
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl text-gray-900">
            <span className="font-semibold">Metrics Overview</span> - Data covers the period from <strong>{formatDate(stats.reportStartDay)}</strong> to <strong>{formatDate(stats.reportEndDay)}</strong>
            {enterpriseName && (
              <>
                {' '}for Enterprise <strong>{enterpriseName}</strong>
              </>
            )}
          </h2>
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
          >
            Upload New File
          </button>
        </div>
      
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
          <MetricTile
            title="Total Records"
            value={stats.totalRecords}
            accent="green"
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          <MetricTile
            title="Unique Users"
            value={stats.uniqueUsers}
            accent="blue"
            interactive
            onClick={() => onNavigate(VIEW_MODES.USERS)}
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>}
          />
          <MetricTile
            title="Top Language"
            value={stats.topLanguage?.name || 'N/A'}
            subtitle={`${stats.topLanguage?.engagements?.toLocaleString() || '0'} engagements`}
            accent="purple"
            interactive
            onClick={() => onNavigate(VIEW_MODES.LANGUAGES)}
            size="md"
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
          />
          <MetricTile
            title="Top IDE"
            value={stats.topIde?.name || 'N/A'}
            subtitle={`${stats.topIde?.entries?.toLocaleString() || '0'} users`}
            accent="orange"
            interactive
            onClick={() => onNavigate(VIEW_MODES.IDES)}
            size="md"
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6 mt-6">
          <MetricTile
            title="Copilot Impact"
            value={'Insights'}
            subtitle="Understand Impact for your organization"
            accent="indigo"
            interactive
            onClick={() => onNavigate(VIEW_MODES.COPILOT_IMPACT)}
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>}
          />
          <MetricTile
            title="PRU Usage Analysis"
            value={'Insights'}
            subtitle="Understand Premium Model utilization"
            accent="purple"
            interactive
            onClick={() => onNavigate(VIEW_MODES.PRU_USAGE)}
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18M9 7h12M9 11h12M9 15h12M3 7h.01M3 11h.01M3 15h.01M9 19h12M3 19h.01" /></svg>}
          />
          <MetricTile
            title="Copilot Adoption Analysis"
            value={'Insights'}
            subtitle="Understand Copilot Adoption in your organization"
            accent="violet"
            interactive
            onClick={() => onNavigate(VIEW_MODES.COPILOT_ADOPTION)}
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          />
          <MetricTile
            title="Top Model"
            value={stats.topModel?.name || 'N/A'}
            subtitle={`${stats.topModel?.engagements?.toLocaleString() || '0'} engagements`}
            accent="indigo"
            size="md"
            interactive={!!stats.topModel && stats.topModel.name !== 'N/A'}
            disabled={!stats.topModel || stats.topModel.name === 'N/A'}
            onClick={() => {
              if (stats.topModel && stats.topModel.name !== 'N/A') {
                onModelSelect(stats.topModel.name);
              }
            }}
            icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>}
          />
        </div>

        <div className="mt-8 w-full">
          <EngagementChart data={engagementData} />
        </div>

        <div className="mt-8 w-full">
          <ChatUsersChart data={chatUsersData} />
        </div>

        <div className="mt-8 w-full">
          <ChatRequestsChart data={chatRequestsData} />
        </div>
      </div>

      <div className="w-64 flex-shrink-0">
        <FilterPanel
          onDateRangeChange={onDateRangeChange}
          currentFilter={dateRange}
          reportStartDay={originalStats?.reportStartDay || ''}
          reportEndDay={originalStats?.reportEndDay || ''}
          removeUnknownLanguages={removeUnknownLanguages}
          onRemoveUnknownLanguagesChange={onRemoveUnknownLanguagesChange}
        />
        <div className="mt-4">
          <button
            onClick={() => onNavigate(VIEW_MODES.DATA_QUALITY)}
            className="w-full px-4 py-2 text-sm font-medium text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-md transition-colors"
          >
            Data Quality Analysis
          </button>
          <button
            onClick={() => onNavigate(VIEW_MODES.CUSTOMER_EMAIL)}
            className="w-full mt-3 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
          >
            Executive Summary Email
          </button>
        </div>
      </div>
    </div>
  );
};

export default OverviewDashboard;
