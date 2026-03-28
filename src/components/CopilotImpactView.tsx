"use client";

import React from 'react';
import ModeImpactChart from './charts/ModeImpactChart';
import { ViewPanel } from './ui';
import type { AgentImpactData, CodeCompletionImpactData, ModeImpactData } from '../domain/calculators/metricCalculators';
interface CopilotImpactViewProps {
  agentImpactData: AgentImpactData[];
  codeCompletionImpactData: CodeCompletionImpactData[];
  editModeImpactData: ModeImpactData[];
  inlineModeImpactData: ModeImpactData[];
  askModeImpactData: ModeImpactData[];
  cliImpactData: ModeImpactData[];
  planModeImpactData: ModeImpactData[];
  joinedImpactData: ModeImpactData[];
}

export default function CopilotImpactView({ agentImpactData, codeCompletionImpactData, editModeImpactData, inlineModeImpactData, askModeImpactData, cliImpactData, planModeImpactData, joinedImpactData }: CopilotImpactViewProps) {
  return (
    <ViewPanel
      headerProps={{
        title: 'Copilot Impact Analysis',
        description:
          'Analyze the impact and productivity gains from Copilot features, including code completion, agent mode, edit mode, and inline mode contributions to your codebase.',
      }}
      contentClassName="space-y-8"
    >
      <ModeImpactChart
        data={joinedImpactData || []}
        title="Combined Copilot Impact"
        description="Aggregate impact across Code Completion, Ask Mode, Agent Mode, Edit Mode, Plan Mode, Inline Mode, and CLI activities."
        emptyStateMessage="No combined impact data available."
      />
      <ModeImpactChart
        data={agentImpactData || []}
        title="Copilot Agent Mode Impact"
        description="Daily lines of code added and deleted through Copilot Agent Mode sessions."
        emptyStateMessage="No agent mode impact data available."
      />
      <ModeImpactChart
        data={askModeImpactData || []}
        title="Copilot Ask Mode Impact"
        description="Daily lines of code added and deleted through Copilot Chat Ask Mode sessions."
        emptyStateMessage="No Ask Mode impact data available."
      />
      <ModeImpactChart
        data={codeCompletionImpactData || []}
        title="Code Completion Impact"
        description="Daily lines of code added and deleted when developers accept Copilot code completions."
        emptyStateMessage="No code completion impact data available."
      />
      <ModeImpactChart
        data={editModeImpactData || []}
        title="Copilot Edit Mode Impact"
        description="Daily lines of code added and deleted through Copilot's Edit Mode sessions."
        emptyStateMessage="No Edit Mode impact data available."
      />
      <ModeImpactChart
        data={inlineModeImpactData || []}
        title="Copilot Inline Mode Impact"
        description="Daily lines of code added and deleted when developers work inline with Copilot."
        emptyStateMessage="No Inline Mode impact data available."
      />
      <ModeImpactChart
        data={cliImpactData || []}
        title="Copilot CLI Impact"
        description="Daily lines of code added and deleted through Copilot CLI sessions."
        emptyStateMessage="No CLI impact data available."
      />
      <ModeImpactChart
        data={planModeImpactData || []}
        title="Copilot Plan Mode Impact"
        description="Daily lines of code added and deleted through Copilot Plan Mode sessions."
        emptyStateMessage="No Plan Mode impact data available."
      />
    </ViewPanel>
  );
}
