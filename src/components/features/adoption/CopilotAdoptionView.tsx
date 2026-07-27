"use client";

import React from 'react';
import { ViewPanel } from '../../ui';
import { COPILOT_ADOPTION_SECTIONS } from '../../layout/contextSections';
import type { CopilotAdoptionReadModel } from '../../../read-models/adoption';
import { AdoptionTrendSection } from './sections/AdoptionTrendSection';
import { AgentModeHeatmapSection } from './sections/AgentModeHeatmapSection';
import { CloudAgentAdoptionSection } from './sections/CloudAgentAdoptionSection';
import { CodeReviewAdoptionSection } from './sections/CodeReviewAdoptionSection';
import { FeatureAdoptionSection } from './sections/FeatureAdoptionSection';

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
      <FeatureAdoptionSection sectionId={featureSection.id} data={adoptionData} />
      <AgentModeHeatmapSection sectionId={heatmapSection.id} data={agentModeHeatmapData || []} />
      {hasCloudAgentAdoption && (
        <CloudAgentAdoptionSection
          data={dailyCloudAgentAdoptionData}
          reportStartDay={stats.reportStartDay}
          reportEndDay={stats.reportEndDay}
        />
      )}
      {hasCodeReviewAdoption && (
        <CodeReviewAdoptionSection
          data={dailyCodeReviewAdoptionData}
          reportStartDay={stats.reportStartDay}
          reportEndDay={stats.reportEndDay}
        />
      )}
      <AdoptionTrendSection
        sectionId={trendSection.id}
        data={dailyAdoptionTrend}
        reportStartDay={stats.reportStartDay}
        reportEndDay={stats.reportEndDay}
      />
    </ViewPanel>
  );
}
