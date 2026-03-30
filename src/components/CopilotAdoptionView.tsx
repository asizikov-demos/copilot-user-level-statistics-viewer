"use client";

import React from 'react';
import FeatureAdoptionChart from './charts/FeatureAdoptionChart';
import AgentModeHeatmapChart from './charts/AgentModeHeatmapChart';
import AdoptionTrendChart from './charts/AdoptionTrendChart';
import { MetricTileGroup, MetricTileIcon, ViewPanel } from './ui';
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
      <MetricTileGroup
        title="User Adoption Metrics"
        columns={{ base: 1, md: 3, lg: 5 }}
        items={[
          {
            title: 'Chat Users',
            value: stats.chatUsers,
            accent: 'emerald',
            subtitle: `Out of ${stats.uniqueUsers.toLocaleString()} unique users`,
            icon: <MetricTileIcon name="chat-users" />,
          },
          {
            title: 'Agent Mode Users',
            value: stats.agentUsers,
            accent: 'violet',
            subtitle: `Out of ${stats.uniqueUsers.toLocaleString()} unique users`,
            icon: <MetricTileIcon name="agent-users" />,
          },
          {
            title: 'CLI Users',
            value: stats.cliUsers,
            accent: 'indigo',
            subtitle: `Out of ${stats.uniqueUsers.toLocaleString()} unique users`,
            icon: <MetricTileIcon name="cli-users" />,
          },
          {
            title: 'Cloud Agent Users',
            value: stats.codingAgentUsers,
            accent: 'teal',
            subtitle: `Out of ${stats.uniqueUsers.toLocaleString()} unique users`,
            icon: <MetricTileIcon name="agent-users" />,
          },
          {
            title: 'Completion Only Users',
            value: stats.completionOnlyUsers,
            accent: 'amber',
            subtitle: `Out of ${stats.uniqueUsers.toLocaleString()} unique users`,
            icon: <MetricTileIcon name="completion-only-users" />,
          },
        ]}
      />
      <FeatureAdoptionChart
        data={
          featureAdoptionData || {
            totalUsers: 0,
            completionUsers: 0,
            completionOnlyUsers: 0,
            chatUsers: 0,
            agentModeUsers: 0,
            askModeUsers: 0,
            editModeUsers: 0,
            inlineModeUsers: 0,
            planModeUsers: 0,
            cliUsers: 0,
            codingAgentUsers: 0,
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
