"use client";

import React from 'react';
import { ViewPanel } from './ui';
import CLIAdoptionTrendChart from './charts/CLIAdoptionTrendChart';
import CLIUsersChart from './charts/CLIUsersChart';
import CLISessionChart from './charts/CLISessionChart';
import CLITokensChart from './charts/CLITokensChart';
import ModelsUsageChart from './charts/ModelsUsageChart';
import { CLI_ADOPTION_SECTIONS } from './layout/contextSections';
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

  const [trendSection, usersSection, sessionsSection, tokensSection, modelsSection] = CLI_ADOPTION_SECTIONS;

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

      <div id={trendSection.id} className="scroll-mt-28">
        <CLIAdoptionTrendChart data={dailyCliAdoptionTrend} stats={stats} />
      </div>
      <div id={usersSection.id} className="scroll-mt-28">
        <CLIUsersChart data={dailyCliSessionData} />
      </div>
      <div id={sessionsSection.id} className="scroll-mt-28">
        <CLISessionChart data={dailyCliSessionData} />
      </div>
      <div id={tokensSection.id} className="scroll-mt-28">
        <CLITokensChart data={dailyCliTokenData} />
      </div>
      <div id={modelsSection.id} className="scroll-mt-28">
        <ModelsUsageChart modelEntries={cliModelEntries} dates={cliModelDates} totalInteractions={cliModelTotal} variant="cli" />
      </div>
    </ViewPanel>
  );
}
