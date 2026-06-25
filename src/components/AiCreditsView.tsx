'use client';

import React, { useMemo } from 'react';
import AiCreditsChart from './charts/AiCreditsChart';
import { ViewPanel } from './ui';
import MetricsTable, { TableColumn } from './ui/MetricsTable';
import { formatAiAdoptionPhase, formatAiCreditCost, formatModelDisplayName, formatNumber, formatPercentage } from '../utils/formatters';
import { formatIDEName, getIDEIcon } from './icons/IDEIcons';
import { getModelIcon } from './icons/ModelIcons';
import type { DailyAiCreditsData, AiAdoptionPhaseTopEntry, UsageDistributionBucket } from '../domain/calculators/metricCalculators';
import type { MetricsStats, UserSummary } from '../types/metrics';

interface AiCreditsViewProps {
  stats: MetricsStats;
  dailyAiCreditsData: DailyAiCreditsData[];
  userSummaries: UserSummary[];
  usageDistributionData: UsageDistributionBucket[];
  onUserClick: (userLogin: string, userId: number) => void;
}

function formatAverage(value: number): string {
  return formatNumber(value, 1);
}

function renderTopModelEntries(entries: AiAdoptionPhaseTopEntry[]) {
  if (entries.length === 0) {
    return <span className="text-sm text-gray-400">No data</span>;
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const ModelIcon = getModelIcon(entry.name);
        return (
          <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex-shrink-0">
                <ModelIcon />
              </div>
              <span className="truncate text-gray-900" title={entry.name}>
                {formatModelDisplayName(entry.name)}
              </span>
            </div>
            <span className="whitespace-nowrap text-xs text-gray-500" title={`${entry.uniqueUsers.toLocaleString()} users`}>
              {entry.total.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function renderTopClientEntries(entries: AiAdoptionPhaseTopEntry[]) {
  if (entries.length === 0) {
    return <span className="text-sm text-gray-400">No data</span>;
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => {
        const ClientIcon = getIDEIcon(entry.name);
        return (
          <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex-shrink-0">
                <ClientIcon />
              </div>
              <span className="truncate text-gray-900" title={entry.name}>
                {formatIDEName(entry.name)}
              </span>
            </div>
            <span className="whitespace-nowrap text-xs text-gray-500" title={`${entry.uniqueUsers.toLocaleString()} users`}>
              {entry.total.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface TopAiCreditsUser extends UserSummary {
  creditsShare: number;
}

const TOP_USER_COUNT = 5;

export default function AiCreditsView({ stats, dailyAiCreditsData, userSummaries, usageDistributionData, onUserClick }: AiCreditsViewProps) {
  const hasAiCreditsData = dailyAiCreditsData.some(entry => entry.aiCreditsUsed > 0);

  const topUsers = useMemo<TopAiCreditsUser[]>(() => {
    const totalCredits = userSummaries.reduce((sum, user) => sum + user.total_ai_credits_used, 0);
    return userSummaries
      .filter(user => user.total_ai_credits_used > 0)
      .sort((a, b) => b.total_ai_credits_used - a.total_ai_credits_used)
      .slice(0, TOP_USER_COUNT)
      .map(user => ({
        ...user,
        creditsShare: totalCredits > 0 ? (user.total_ai_credits_used / totalCredits) * 100 : 0,
      }));
  }, [userSummaries]);

  const headerBaseClass = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
  const headerRightClass = 'px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider';
  const valueCellClass = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right';

  const columns: TableColumn<TopAiCreditsUser>[] = [
    {
      id: 'user_login',
      header: 'USERNAME',
      headerClassName: headerBaseClass,
      className: 'px-6 py-4 whitespace-nowrap',
      renderCell: (user) => (
        <button
          type="button"
          onClick={() => onUserClick(user.user_login, user.user_id)}
          className="flex items-center text-left group"
        >
          <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-blue-700">
              {user.user_login.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="ml-3 text-sm font-medium text-blue-600 group-hover:text-blue-800 group-hover:underline">{user.user_login}</div>
        </button>
      ),
    },
    {
      id: 'days_active',
      header: 'DAYS ACTIVE',
      headerClassName: headerRightClass,
      className: valueCellClass,
      renderCell: (user) => formatNumber(user.days_active),
    },
    {
      id: 'total_ai_credits_used',
      header: 'AI CREDITS',
      headerClassName: headerRightClass,
      className: valueCellClass,
      renderCell: (user) => formatAiCreditCost(user.total_ai_credits_used),
    },
    {
      id: 'creditsShare',
      header: 'SHARE',
      headerClassName: headerRightClass,
      className: valueCellClass,
      renderCell: (user) => formatPercentage(user.creditsShare),
    },
    {
      id: 'net_loc_contribution',
      header: 'LOC IMPACT',
      headerClassName: headerRightClass,
      className: valueCellClass,
      renderCell: (user) => (
        <span className="whitespace-nowrap tabular-nums">
          <span className="text-green-600">+{user.total_loc_added.toLocaleString()}</span>
          <span className="text-gray-400">/</span>
          <span className="text-red-600">-{user.total_loc_deleted.toLocaleString()}</span>
        </span>
      ),
    },
    {
      id: 'ai_adoption_phase',
      header: 'AI ADOPTION',
      headerClassName: `${headerRightClass} whitespace-nowrap`,
      className: 'px-6 py-4 whitespace-nowrap text-right',
      renderCell: (user) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {formatAiAdoptionPhase(user.ai_adoption_phase)}
        </span>
      ),
    },
  ];

  const distributionColumns: TableColumn<UsageDistributionBucket>[] = [
    {
      id: 'bucket',
      header: 'Segment',
      headerClassName: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]',
      className: 'px-6 py-4 align-top',
      renderCell: (bucket) => (
        <div>
          <div className="text-sm font-semibold text-gray-900">{bucket.label}</div>
          <div className="text-xs text-gray-500">{bucket.description}</div>
        </div>
      ),
    },
    {
      id: 'userCount',
      header: 'Users',
      headerClassName: headerRightClass,
      className: `${valueCellClass} font-medium align-top`,
      renderCell: (bucket) => bucket.userCount.toLocaleString(),
    },
    {
      id: 'totalAiCreditsUsed',
      header: 'Total AI Credits',
      headerClassName: headerRightClass,
      className: `${valueCellClass} font-medium align-top`,
      renderCell: (bucket) => formatAiCreditCost(bucket.totalAiCreditsUsed),
    },
    {
      id: 'avgAiCreditsUsed',
      header: 'Avg AI Credits',
      headerClassName: headerRightClass,
      className: `${valueCellClass} align-top`,
      renderCell: (bucket) => formatAiCreditCost(bucket.avgAiCreditsUsed),
    },
    {
      id: 'avgDaysActive',
      header: 'Avg Active Days',
      headerClassName: headerRightClass,
      className: `${valueCellClass} align-top`,
      renderCell: (bucket) => formatAverage(bucket.avgDaysActive),
    },
    {
      id: 'totalLocImpact',
      header: 'Total LOC Impact',
      headerClassName: headerRightClass,
      className: `${valueCellClass} align-top`,
      renderCell: (bucket) => (
        <span className="whitespace-nowrap tabular-nums">
          <span className="text-green-600">+{bucket.totalLocAdded.toLocaleString()}</span>
          <span className="text-gray-400">/</span>
          <span className="text-red-600">-{bucket.totalLocDeleted.toLocaleString()}</span>
        </span>
      ),
    },
    {
      id: 'topModels',
      header: 'Top Models - interactions',
      headerClassName: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]',
      className: 'px-6 py-4 align-top',
      renderCell: (bucket) => renderTopModelEntries(bucket.topModels),
    },
    {
      id: 'topClients',
      header: 'Top Clients - activity',
      headerClassName: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]',
      className: 'px-6 py-4 align-top',
      renderCell: (bucket) => renderTopClientEntries(bucket.topClients),
    },
  ];

  const hasDistributionData = usageDistributionData.some((bucket) => bucket.userCount > 0);

  return (
    <ViewPanel
      headerProps={{
        title: 'AI Credits',
        description: 'AI credit consumption across the reporting period.',
      }}
      contentClassName="space-y-8"
    >
      {hasAiCreditsData ? (
        <div id="ai-credits-daily-consumption" className="scroll-mt-28">
          <AiCreditsChart
            data={dailyAiCreditsData}
            reportStartDay={stats.reportStartDay}
            reportEndDay={stats.reportEndDay}
          />
        </div>
      ) : (
        <div id="ai-credits-daily-consumption" className="scroll-mt-28 rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
          No AI credit consumption was recorded during the reporting period.
        </div>
      )}

      <div id="ai-credits-top-users" className="space-y-3 scroll-mt-28">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Top 5 Users by AI Credits Consumption</h3>
          <p className="text-sm text-gray-600">Users with the highest AI credit usage and their share of total credits consumed.</p>
        </div>
        {topUsers.length > 0 ? (
          <MetricsTable
            data={topUsers}
            columns={columns}
            getRowKey={(user) => user.user_id}
            tableContainerClassName="overflow-x-auto border border-gray-200 rounded-lg"
            tableClassName="min-w-full divide-y divide-gray-200"
            theadClassName="bg-gray-50"
            tbodyClassName="bg-white divide-y divide-gray-200"
          />
        ) : (
          <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
            No AI credit consumption was recorded during the reporting period.
          </div>
        )}
      </div>

      <div id="ai-credits-usage-distribution" className="space-y-3 scroll-mt-28">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Usage Distribution</h3>
          <p className="text-sm text-gray-600">Users segmented by AI credit consumption. Averages are calculated per user within each segment.</p>
        </div>
        {hasDistributionData ? (
          <MetricsTable<UsageDistributionBucket>
            data={usageDistributionData}
            columns={distributionColumns}
            getRowKey={(bucket) => bucket.id}
            tableContainerClassName="overflow-x-auto border border-gray-200 rounded-lg"
            tableClassName="min-w-full divide-y divide-gray-200"
            theadClassName="bg-gray-50"
            rowClassName={(_, index) => `${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
          />
        ) : (
          <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
            No AI credit consumption was recorded during the reporting period.
          </div>
        )}
      </div>
    </ViewPanel>
  );
}
