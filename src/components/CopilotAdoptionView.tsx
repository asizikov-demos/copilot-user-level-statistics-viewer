"use client";

import React from 'react';
import FeatureAdoptionChart from './charts/FeatureAdoptionChart';
import AgentModeHeatmapChart from './charts/AgentModeHeatmapChart';
import AdoptionTrendChart from './charts/AdoptionTrendChart';
import { ViewPanel } from './ui';
import type { FeatureAdoptionData, AgentModeHeatmapData } from '../domain/calculators/metricCalculators';
import type { DailyAdoptionTrend } from '../domain/calculators/metricCalculators';
import type { MetricsStats } from '../types/metrics';

interface CopilotAdoptionViewProps {
  featureAdoptionData: FeatureAdoptionData | null;
  agentModeHeatmapData: AgentModeHeatmapData[];
  stats: MetricsStats;
  dailyAdoptionTrend: DailyAdoptionTrend[];
}

export default function CopilotAdoptionView({ featureAdoptionData, agentModeHeatmapData, stats, dailyAdoptionTrend }: CopilotAdoptionViewProps) {
  return (
    <ViewPanel
      headerProps={{
        title: 'Copilot Adoption Analysis',
        description: 'Understand Copilot feature adoption patterns and Agent Mode usage intensity across days.',
      }}
      contentClassName="space-y-10"
    >
      <FeatureAdoptionChart
        data={
          featureAdoptionData || {
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
          }
        }
      />
      <AgentModeHeatmapChart data={agentModeHeatmapData || []} />
      <AdoptionTrendChart
        data={dailyAdoptionTrend}
        reportStartDay={stats.reportStartDay}
        reportEndDay={stats.reportEndDay}
      />
    </ViewPanel>
  );
}
