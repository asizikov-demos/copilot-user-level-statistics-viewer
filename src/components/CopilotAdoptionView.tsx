"use client";

import React from 'react';
import FeatureAdoptionChart from './charts/FeatureAdoptionChart';
import AgentModeHeatmapChart from './charts/AgentModeHeatmapChart';
import AdoptionTrendChart from './charts/AdoptionTrendChart';
import CloudAgentAdoptionChart from './charts/CloudAgentAdoptionChart';
import CodeReviewAdoptionChart from './charts/CodeReviewAdoptionChart';
import { ViewPanel } from './ui';
import { COPILOT_ADOPTION_SECTIONS } from './layout/contextSections';
import type { CopilotAdoptionReadModel } from '../read-models/adoption';

interface CopilotAdoptionViewProps {
  model: CopilotAdoptionReadModel;
}

const EMPTY_FEATURE_ADOPTION_DATA: CopilotAdoptionReadModel['featureAdoptionData'] = {
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

export default function CopilotAdoptionView({ model }: CopilotAdoptionViewProps) {
  const {
    featureAdoptionData,
    agentModeHeatmapData,
    stats,
    dailyAdoptionTrend,
    dailyCloudAgentAdoptionData,
    dailyCodeReviewAdoptionData,
  } = model;
  const adoptionData = featureAdoptionData ?? EMPTY_FEATURE_ADOPTION_DATA;
  const hasCloudAgentAdoption = adoptionData.codingAgentUsers > 0;
  const hasCodeReviewAdoption = adoptionData.codeReviewUsers > 0;
  const [featureSection, heatmapSection, trendSection] = COPILOT_ADOPTION_SECTIONS;

  return (
    <ViewPanel
      headerProps={{
        title: 'Copilot Adoption Analysis',
        description: 'Understand Copilot feature adoption patterns and Agent Mode usage intensity across days.',
      }}
      contentClassName="space-y-10"
    >
      <div id={featureSection.id} className="scroll-mt-28">
        <FeatureAdoptionChart
          data={adoptionData}
        />
      </div>
      <div id={heatmapSection.id} className="scroll-mt-28">
        <AgentModeHeatmapChart data={agentModeHeatmapData || []} />
      </div>
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
      <div id={trendSection.id} className="scroll-mt-28">
        <AdoptionTrendChart
          data={dailyAdoptionTrend}
          reportStartDay={stats.reportStartDay}
          reportEndDay={stats.reportEndDay}
        />
      </div>
    </ViewPanel>
  );
}
