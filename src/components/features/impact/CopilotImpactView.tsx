"use client";

import React from 'react';
import { ViewPanel } from '../../ui';
import { COPILOT_IMPACT_SECTIONS } from '../../layout/contextSections';
import type { CopilotImpactReadModel } from '../../../read-models/impact';
import { IMPACT_MODE_CONFIGS } from './impactModeConfigs';
import { ImpactModeSection } from './sections/ImpactModeSection';

interface CopilotImpactViewProps {
  model: CopilotImpactReadModel;
}

export default function CopilotImpactView({ model }: CopilotImpactViewProps) {
  const {
    agentImpactData,
    codeCompletionImpactData,
    editModeImpactData,
    inlineModeImpactData,
    askModeImpactData,
    cliImpactData,
    joinedImpactData,
  } = model;
  const impactDataByMode = {
    combined: joinedImpactData,
    agent: agentImpactData,
    cli: cliImpactData,
    codeCompletion: codeCompletionImpactData,
    ask: askModeImpactData,
    inline: inlineModeImpactData,
    edit: editModeImpactData,
  } as const;

  return (
    <ViewPanel
      headerProps={{
        title: 'Copilot Impact Analysis',
        description:
          'Analyze the impact and productivity gains from Copilot features, including code completion, agent mode, edit mode, and inline mode contributions to your codebase.',
      }}
      contentClassName="space-y-8"
    >
      {IMPACT_MODE_CONFIGS.map((config, index) => (
        <ImpactModeSection
          key={config.mode}
          sectionId={COPILOT_IMPACT_SECTIONS[index].id}
          data={impactDataByMode[config.mode] || []}
          config={config}
        />
      ))}
    </ViewPanel>
  );
}
