"use client";

import React from 'react';
import { ViewPanel, MetricTileGroup, MetricTileIcon } from './ui';
import CLIUsersChart from './charts/CLIUsersChart';
import CLISessionChart from './charts/CLISessionChart';
import CLITokensChart from './charts/CLITokensChart';
import type { MetricsStats } from '../types/metrics';
import type { DailyCliSessionData, DailyCliTokenData } from '../domain/calculators/metricCalculators';
import type { VoidCallback } from '../types/events';

interface CLIAdoptionViewProps {
  stats: MetricsStats;
  dailyCliSessionData: DailyCliSessionData[];
  dailyCliTokenData: DailyCliTokenData[];
  onBack: VoidCallback;
}

export default function CLIAdoptionView({
  stats,
  dailyCliSessionData,
  dailyCliTokenData,
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

      <CLIUsersChart data={dailyCliSessionData} />
      <CLISessionChart data={dailyCliSessionData} />
      <CLITokensChart data={dailyCliTokenData} />
    </ViewPanel>
  );
}
