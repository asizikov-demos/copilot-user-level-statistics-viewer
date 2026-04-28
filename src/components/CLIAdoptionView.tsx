"use client";

import React from 'react';
import { ViewPanel } from './ui';
import CLIAdoptionTrendChart from './charts/CLIAdoptionTrendChart';
import CLIUsersChart from './charts/CLIUsersChart';
import CLISessionChart from './charts/CLISessionChart';
import CLITokensChart from './charts/CLITokensChart';
import ModelsUsageChart from './charts/ModelsUsageChart';
import type { MetricsStats, ModelDailyUsageEntry } from '../types/metrics';
import type { DailyCliSessionData, DailyCliTokenData, DailyCliAdoptionTrend } from '../domain/calculators/metricCalculators';
interface CLIAdoptionViewProps {
  stats: MetricsStats;
  dailyCliSessionData: DailyCliSessionData[];
  dailyCliTokenData: DailyCliTokenData[];
  dailyCliAdoptionTrend: DailyCliAdoptionTrend[];
  cliModelEntries: ModelDailyUsageEntry[];
  cliModelDates: string[];
  cliModelTotal: number;
}

export default function CLIAdoptionView({
  stats,
  dailyCliSessionData,
  dailyCliTokenData,
  dailyCliAdoptionTrend,
  cliModelEntries,
  cliModelDates,
  cliModelTotal,
}: CLIAdoptionViewProps) {
  const cliShare = stats.uniqueUsers > 0
    ? Math.round((stats.cliUsers / stats.uniqueUsers) * 1000) / 10
    : 0;

  return (
    <ViewPanel
      headerProps={{
        title: 'CLI Adoption',
        description: (
          <p className="text-gray-600 text-sm mt-1">
            This report contains <strong>{stats.cliUsers.toLocaleString()}</strong> GitHub Copilot CLI users out of <strong>{stats.uniqueUsers.toLocaleString()}</strong> (<strong>{cliShare}%</strong>)
          </p>
        ),
      }}
      contentClassName="space-y-8"
    >

      <CLIAdoptionTrendChart data={dailyCliAdoptionTrend} stats={stats} />
      <CLIUsersChart data={dailyCliSessionData} />
      <CLISessionChart data={dailyCliSessionData} />
      <CLITokensChart data={dailyCliTokenData} />
      <ModelsUsageChart modelEntries={cliModelEntries} dates={cliModelDates} totalInteractions={cliModelTotal} variant="cli" />
    </ViewPanel>
  );
}
