'use client';

import React from 'react';
import { MetricsStats } from '../../../types/metrics';
import { DailyEngagementData, DailyChatUsersData, DailyChatRequestsData } from '../../../domain/calculators/metricCalculators';
import FilterPanel from '../../FilterPanel';
import { MetricTileGroup, MetricTileIcon } from '../../ui';
import EngagementChart from '../../charts/EngagementChart';
import ChatUsersChart from '../../charts/ChatUsersChart';
import ChatRequestsChart from '../../charts/ChatRequestsChart';
import { DateRangeFilter } from '../../../types/filters';
import { ViewMode, VIEW_MODES } from '../../../types/navigation';
import type { VoidCallback, ValueCallback, BooleanFilterCallback } from '../../../types/events';

interface OverviewDashboardProps {
  stats: MetricsStats;
  originalStats: MetricsStats | null;
  enterpriseName: string | null;
  engagementData: DailyEngagementData[];
  chatUsersData: DailyChatUsersData[];
  chatRequestsData: DailyChatRequestsData[];
  dateRange: DateRangeFilter;
  removeUnknownLanguages: boolean;
  onDateRangeChange: ValueCallback<DateRangeFilter>;
  onRemoveUnknownLanguagesChange: BooleanFilterCallback;
  onNavigate: ValueCallback<ViewMode>;
  onModelSelect: ValueCallback<string>;
  onReset: VoidCallback;
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
      
        <MetricTileGroup
          items={[
            {
              title: 'Total Records',
              value: stats.totalRecords,
              accent: 'green',
              icon: <MetricTileIcon name="records" />,
            },
            {
              title: 'Unique Users',
              value: stats.uniqueUsers,
              accent: 'blue',
              interactive: true,
              onClick: () => onNavigate(VIEW_MODES.USERS),
              icon: <MetricTileIcon name="unique-users" />,
            },
            {
              title: 'Top Language',
              value: stats.topLanguage?.name || 'N/A',
              subtitle: `${stats.topLanguage?.engagements?.toLocaleString() || '0'} engagements`,
              accent: 'purple',
              interactive: true,
              onClick: () => onNavigate(VIEW_MODES.LANGUAGES),
              size: 'md',
              icon: <MetricTileIcon name="top-language" />,
            },
            {
              title: 'Top IDE',
              value: stats.topIde?.name || 'N/A',
              subtitle: `${stats.topIde?.entries?.toLocaleString() || '0'} users`,
              accent: 'orange',
              interactive: true,
              onClick: () => onNavigate(VIEW_MODES.IDES),
              size: 'md',
              icon: <MetricTileIcon name="top-ide" />,
            },
          ]}
          columns={{ base: 1, md: 2, lg: 4 }}
        />

        <MetricTileGroup
          className="mt-6"
          items={[
            {
              title: 'Copilot Impact',
              value: 'Insights',
              subtitle: 'Understand Impact for your organization',
              accent: 'indigo',
              interactive: true,
              onClick: () => onNavigate(VIEW_MODES.COPILOT_IMPACT),
              icon: <MetricTileIcon name="impact" />,
            },
            {
              title: 'PRU Usage Analysis',
              value: 'Insights',
              subtitle: 'Understand Premium Model utilization',
              accent: 'purple',
              interactive: true,
              onClick: () => onNavigate(VIEW_MODES.PRU_USAGE),
              icon: <MetricTileIcon name="pru-usage" />,
            },
            {
              title: 'Copilot Adoption Analysis',
              value: 'Insights',
              subtitle: 'Understand Copilot Adoption in your organization',
              accent: 'violet',
              interactive: true,
              onClick: () => onNavigate(VIEW_MODES.COPILOT_ADOPTION),
              icon: <MetricTileIcon name="copilot-adoption" />,
            },
            {
              title: 'Top Model',
              value: stats.topModel?.name || 'N/A',
              subtitle: `${stats.topModel?.engagements?.toLocaleString() || '0'} engagements`,
              accent: 'indigo',
              size: 'md',
              interactive: !!stats.topModel && stats.topModel.name !== 'N/A',
              disabled: !stats.topModel || stats.topModel.name === 'N/A',
              onClick: () => {
                if (stats.topModel && stats.topModel.name !== 'N/A') {
                  onModelSelect(stats.topModel.name);
                }
              },
              icon: <MetricTileIcon name="top-model" />,
            },
          ]}
          columns={{ base: 1, md: 2, lg: 4 }}
        />

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
      </div>
    </div>
  );
};

export default OverviewDashboard;
