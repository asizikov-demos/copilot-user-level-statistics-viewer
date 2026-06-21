"use client";

import React from 'react';
import FeatureAdoptionChart from './charts/FeatureAdoptionChart';
import AgentModeHeatmapChart from './charts/AgentModeHeatmapChart';
import AdoptionTrendChart from './charts/AdoptionTrendChart';
import CloudAgentAdoptionChart from './charts/CloudAgentAdoptionChart';
import CodeReviewAdoptionChart from './charts/CodeReviewAdoptionChart';
import { ViewPanel } from './ui';
import type {
  FeatureAdoptionData,
  AgentModeHeatmapData,
  DailyAdoptionTrend,
  DailyCloudAgentAdoptionData,
  DailyCodeReviewAdoptionData,
} from '../domain/calculators/metricCalculators';
import type { MetricsStats } from '../types/metrics';

interface CopilotAdoptionViewProps {
  featureAdoptionData: FeatureAdoptionData | null;
  agentModeHeatmapData: AgentModeHeatmapData[];
  stats: MetricsStats;
  dailyAdoptionTrend: DailyAdoptionTrend[];
  dailyCloudAgentAdoptionData?: DailyCloudAgentAdoptionData[];
  dailyCodeReviewAdoptionData?: DailyCodeReviewAdoptionData[];
}

const EMPTY_FEATURE_ADOPTION_DATA: FeatureAdoptionData = {
  totalUsers: 0,
  completionUsers: 0,
  completionOnlyUsers: 0,
  chatUsers: 0,
  agentModeUsers: 0,
  askModeUsers: 0,
  inlineModeUsers: 0,
  planModeUsers: 0,
  cliUsers: 0,
  codingAgentUsers: 0,
  codeReviewUsers: 0,
  advancedUsers: 0,
};

export default function CopilotAdoptionView({
  featureAdoptionData,
  agentModeHeatmapData,
  stats,
  dailyAdoptionTrend,
  dailyCloudAgentAdoptionData = [],
  dailyCodeReviewAdoptionData = [],
}: CopilotAdoptionViewProps) {
  const adoptionData = featureAdoptionData ?? EMPTY_FEATURE_ADOPTION_DATA;
  const hasCloudAgentAdoption = adoptionData.codingAgentUsers > 0;
  const hasCodeReviewAdoption = adoptionData.codeReviewUsers > 0;

  return (
    <ViewPanel
      headerProps={{
        title: 'Copilot Adoption Analysis',
        description: 'Understand Copilot feature adoption patterns and Agent Mode usage intensity across days.',
      }}
      contentClassName="space-y-10"
    >
      <FeatureAdoptionChart
        data={adoptionData}
      />
      <AgentModeHeatmapChart data={agentModeHeatmapData || []} />
      {hasCloudAgentAdoption && (
        <CloudAgentAdoptionChart
          data={dailyCloudAgentAdoptionData}
          reportStartDay={stats.reportStartDay}
          reportEndDay={stats.reportEndDay}
        />
      )}
      {hasCodeReviewAdoption && (
        <CodeReviewAdoptionChart
          data={dailyCodeReviewAdoptionData}
          reportStartDay={stats.reportStartDay}
          reportEndDay={stats.reportEndDay}
        />
      )}
      <AdoptionTrendChart
        data={dailyAdoptionTrend}
        reportStartDay={stats.reportStartDay}
        reportEndDay={stats.reportEndDay}
      />
    </ViewPanel>
  );
}
