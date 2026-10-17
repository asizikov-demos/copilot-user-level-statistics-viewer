'use client';

import React, { useMemo } from 'react';
import AiCreditsChart from './charts/AiCreditsChart';
import { ViewPanel } from './ui';
import EmptyState from './ui/EmptyState';
import MetricsTable, { TableColumn } from './ui/MetricsTable';
import TopEntriesList from './ui/TopEntriesList';
import InitialAvatar from './ui/InitialAvatar';
import AiCreditsStatementCard from './AiCreditsStatementCard';
import { buildAiCreditsStatement } from '../read-models/aiCreditsStatement';
import type { AiCreditsReadModel } from '../read-models/aiCredits';
import { formatAiCreditCost, formatModelDisplayName, formatNumber, formatPercentage } from '../utils/formatters';
import { formatIDEName, getIDEIcon } from './icons/IDEIcons';
import AiAdoptionPhaseLabel from './features/ai-adoption-phases/AiAdoptionPhaseLabel';
import { getModelIcon } from './icons/ModelIcons';
import type { UsageDistributionBucket } from '../domain/calculators/metricCalculators';
import type { UserSummary } from '../types/metrics';

interface AiCreditsViewProps {
  model: AiCreditsReadModel;
}

function formatAverage(value: number): string {
  return formatNumber(value, 1);
}

interface TopAiCreditsUser extends UserSummary {
  creditsShare: number;
}

const TOP_USER_COUNT = 5;

export default function AiCreditsView({ model }: AiCreditsViewProps) {
  const {
    reportStartDay,
    reportEndDay,
    dailyAiCreditsData,
    userSummaries,
    usageDistributionData,
    totalAiCreditsUsed,
    onUserClick,
  } = model;
  const hasAiCreditsData = dailyAiCreditsData.some(entry => entry.aiCreditsUsed > 0);
  const statement = useMemo(
    () => buildAiCreditsStatement(userSummaries, dailyAiCreditsData),
    [userSummaries, dailyAiCreditsData]
  );

  const topUsers = useMemo<TopAiCreditsUser[]>(() => {
    return userSummaries
      .filter(user => user.total_ai_credits_used > 0)
      .sort((a, b) => b.total_ai_credits_used - a.total_ai_credits_used)
      .slice(0, TOP_USER_COUNT)
      .map(user => ({
        ...user,
        creditsShare: totalAiCreditsUsed > 0
          ? (user.total_ai_credits_used / totalAiCreditsUsed) * 100
          : 0,
      }));
  }, [totalAiCreditsUsed, userSummaries]);

  const headerBaseClass = 'px-6 py-3 text-left';
  const headerRightClass = 'px-6 py-3 text-right';
  const valueCellClass = 'px-6 py-4 whitespace-nowrap text-sm text-default text-right';

  const columns: TableColumn<TopAiCreditsUser>[] = [
    {
      id: 'user_login',
      header: 'Username',
      headerClassName: headerBaseClass,
      className: 'px-6 py-4 whitespace-nowrap',
      renderCell: (user) => (
        <button
          type="button"
          onClick={() => onUserClick(user.user_login, user.user_id)}
          className="group flex items-center rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-outlineColor)]"
        >
          <InitialAvatar name={user.user_login} size="medium" />
          <span className="ml-3 text-sm font-medium text-link group-hover:underline">{user.user_login}</span>
        </button>
      ),
    },
    {
      id: 'days_active',
      header: 'Days Active',
      headerClassName: headerRightClass,
      className: valueCellClass,
      renderCell: (user) => formatNumber(user.days_active),
    },
    {
      id: 'total_ai_credits_used',
      header: 'AI Credits',
      headerClassName: headerRightClass,
      className: valueCellClass,
      renderCell: (user) => formatAiCreditCost(user.total_ai_credits_used),
    },
    {
      id: 'creditsShare',
      header: 'Share',
      headerClassName: headerRightClass,
      className: valueCellClass,
      renderCell: (user) => formatPercentage(user.creditsShare),
    },
    {
      id: 'net_loc_contribution',
      header: 'LOC Impact',
      headerClassName: headerRightClass,
      className: valueCellClass,
      renderCell: (user) => (
        <span className="whitespace-nowrap tabular-nums">
          <span className="text-success">+{user.total_loc_added.toLocaleString()}</span>
          <span className="text-disabled">/</span>
          <span className="text-danger">-{user.total_loc_deleted.toLocaleString()}</span>
        </span>
      ),
    },
    {
      id: 'ai_adoption_phase',
      header: 'AI Adoption',
      headerClassName: `${headerRightClass} whitespace-nowrap`,
      className: 'px-6 py-4 whitespace-nowrap text-right',
      renderCell: (user) => (
        <AiAdoptionPhaseLabel phase={user.ai_adoption_phase} />
      ),
    },
  ];

  const distributionColumns: TableColumn<UsageDistributionBucket>[] = [
    {
      id: 'bucket',
      header: 'Segment',
      headerClassName: `${headerBaseClass} min-w-[200px]`,
      className: 'px-6 py-4 align-top',
      renderCell: (bucket) => (
        <div>
          <div className="text-sm font-semibold text-default">{bucket.label}</div>
          <div className="text-xs text-muted">{bucket.description}</div>
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
          <span className="text-success">+{bucket.totalLocAdded.toLocaleString()}</span>
          <span className="text-disabled">/</span>
          <span className="text-danger">-{bucket.totalLocDeleted.toLocaleString()}</span>
        </span>
      ),
    },
    {
      id: 'avgLocImpact',
      header: 'Avg LOC Impact',
      headerClassName: headerRightClass,
      className: `${valueCellClass} align-top`,
      renderCell: (bucket) => (
        <span className="whitespace-nowrap tabular-nums">
          <span className="text-success">+{formatAverage(bucket.avgLocAdded)}</span>
          <span className="text-disabled">/</span>
          <span className="text-danger">-{formatAverage(bucket.avgLocDeleted)}</span>
        </span>
      ),
    },
    {
      id: 'topModels',
      header: 'Top Models - interactions',
      headerClassName: `${headerBaseClass} min-w-[180px]`,
      className: 'px-6 py-4 align-top',
      renderCell: (bucket) => (
        <TopEntriesList
          entries={bucket.topModels}
          formatName={formatModelDisplayName}
          getIcon={getModelIcon}
        />
      ),
    },
    {
      id: 'topClients',
      header: 'Top Clients - activity',
      headerClassName: `${headerBaseClass} min-w-[180px]`,
      className: 'px-6 py-4 align-top',
      renderCell: (bucket) => (
        <TopEntriesList
          entries={bucket.topClients}
          formatName={formatIDEName}
          getIcon={getIDEIcon}
        />
      ),
    },
  ];

  const hasDistributionData = usageDistributionData.some((bucket) => bucket.userCount > 0);

  return (
    <ViewPanel
      headerProps={{
        title: 'AI Credits',
        description: 'AI credit consumption across the reporting period.',
      }}
      afterHeader={<AiCreditsStatementCard statement={statement} />}
      contentClassName="space-y-8"
    >
      {hasAiCreditsData ? (
        <div id="ai-credits-daily-consumption" className="scroll-mt-28">
          <AiCreditsChart
            data={dailyAiCreditsData}
            reportStartDay={reportStartDay}
            reportEndDay={reportEndDay}
          />
        </div>
      ) : (
        <div id="ai-credits-daily-consumption" className="scroll-mt-28">
          <EmptyState
            heading="No AI credit consumption was recorded during the reporting period."
            border
          />
        </div>
      )}

      <div id="ai-credits-top-users" className="space-y-3 scroll-mt-28">
        <div>
          <h3 className="text-base font-semibold text-default">Top 5 Users by AI Credits Consumption</h3>
          <p className="text-sm text-muted">Users with the highest AI credit usage and their share of total credits consumed.</p>
        </div>
        {topUsers.length > 0 ? (
          <MetricsTable
            data={topUsers}
            columns={columns}
            getRowKey={(user) => user.user_id}
            tableContainerClassName="overflow-x-auto border border-default rounded-lg"
            tableClassName="min-w-full"
          />
        ) : (
          <EmptyState
            heading="No AI credit consumption was recorded during the reporting period."
            headingAs="h4"
            border
          />
        )}
      </div>

      <div id="ai-credits-usage-distribution" className="space-y-3 scroll-mt-28">
        <div>
          <h3 className="text-base font-semibold text-default">Usage Distribution</h3>
          <p className="text-sm text-muted">Users segmented by AI credit consumption. Averages are calculated per user within each segment.</p>
        </div>
        {hasDistributionData ? (
          <MetricsTable<UsageDistributionBucket>
            data={usageDistributionData}
            columns={distributionColumns}
            getRowKey={(bucket) => bucket.id}
            tableContainerClassName="overflow-x-auto border border-default rounded-lg"
            tableClassName="min-w-full"
          />
        ) : (
          <EmptyState
            heading="No AI credit consumption was recorded during the reporting period."
            headingAs="h4"
            border
          />
        )}
      </div>
    </ViewPanel>
  );
}
