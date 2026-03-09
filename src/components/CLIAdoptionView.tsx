"use client";

import React from 'react';
import { ViewPanel, MetricTileGroup, MetricTileIcon } from './ui';
import CLIAdoptionTrendChart from './charts/CLIAdoptionTrendChart';
import CLIAdoptionInsights from './CLIAdoptionInsights';
import CLIUsersChart from './charts/CLIUsersChart';
import CLISessionChart from './charts/CLISessionChart';
import CLITokensChart from './charts/CLITokensChart';
import type { MetricsStats } from '../types/metrics';
import type { DailyCliSessionData, DailyCliTokenData, DailyCliAdoptionTrend } from '../domain/calculators/metricCalculators';
import type { VoidCallback } from '../types/events';

interface CLIAdoptionViewProps {
  stats: MetricsStats;
  dailyCliSessionData: DailyCliSessionData[];
  dailyCliTokenData: DailyCliTokenData[];
  dailyCliAdoptionTrend: DailyCliAdoptionTrend[];
  onBack: VoidCallback;
}

export default function CLIAdoptionView({
  stats,
  dailyCliSessionData,
  dailyCliTokenData,
  dailyCliAdoptionTrend,
  onBack,
}: CLIAdoptionViewProps) {
  const cliShare = stats.uniqueUsers > 0
    ? Math.round((stats.cliUsers / stats.uniqueUsers) * 1000) / 10
    : 0;

  return (
    <ViewPanel
      headerProps={{
        title: 'CLI Adoption',
        onBack,
        backButtonLabel: '← Back to Overview',
      }}
      contentClassName="space-y-8"
    >
      <MetricTileGroup
        items={[
          {
            title: 'CLI Users',
            value: stats.cliUsers,
            subtitle: `${cliShare}% of ${stats.uniqueUsers.toLocaleString()} unique users`,
            accent: 'indigo',
            icon: <MetricTileIcon name="cli-users" />,
          },
          {
            title: 'Unique Users',
            value: stats.uniqueUsers,
            accent: 'blue',
            icon: <MetricTileIcon name="unique-users" />,
          },
        ]}
        columns={{ base: 1, md: 2, lg: 2 }}
      />

      <CLIAdoptionInsights stats={stats} trend={dailyCliAdoptionTrend} />

      <CLIAdoptionTrendChart data={dailyCliAdoptionTrend} />
      <CLIUsersChart data={dailyCliSessionData} />
      <CLISessionChart data={dailyCliSessionData} />
      <CLITokensChart data={dailyCliTokenData} />
    </ViewPanel>
  );
}
