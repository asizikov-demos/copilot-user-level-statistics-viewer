"use client";

import React from 'react';
import SectionHeader from './ui/SectionHeader';
import ModeImpactChart from './charts/ModeImpactChart';
import FeatureAdoptionChart from './charts/FeatureAdoptionChart';
import PremiumModelsUsageChart from './charts/PremiumModelsUsageChart';
import type { CopilotMetrics } from '../types/metrics';
import type { FeatureAdoptionData, AgentImpactData, CodeCompletionImpactData, ModeImpactData } from '../utils/metricsParser';

interface CustomerEmailViewProps {
  metrics: CopilotMetrics[];
  featureAdoptionData: FeatureAdoptionData | null;
  joinedImpactData: ModeImpactData[];
  agentImpactData: AgentImpactData[];
  codeCompletionImpactData: CodeCompletionImpactData[];
  onBack: () => void;
}

export default function CustomerEmailView({
  metrics,
  featureAdoptionData,
  joinedImpactData,
  agentImpactData,
  codeCompletionImpactData,
  onBack
}: CustomerEmailViewProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <SectionHeader
        title="Customer Email Report"
        description="Curated summary of key Copilot impact, adoption, and premium model usage metrics suitable for sharing in a customer-facing update."
        onBack={onBack}
        className="mb-6"
      />

      <div className="space-y-8">
        <ModeImpactChart
          data={joinedImpactData || []}
          title="Combined Copilot Impact"
          description="Aggregate impact across Code Completion, Agent Mode, Edit Mode, and Inline Mode activities."
          emptyStateMessage="No combined impact data available."
        />
        <ModeImpactChart
          data={agentImpactData || []}
          title="Copilot Agent Mode Impact"
          description="Daily lines of code added and deleted through Copilot Agent Mode sessions."
          emptyStateMessage="No agent mode impact data available."
        />
        <ModeImpactChart
          data={codeCompletionImpactData || []}
          title="Code Completion Impact"
          description="Daily lines of code added and deleted when developers accept Copilot code completions."
          emptyStateMessage="No code completion impact data available."
        />
        <div>
          <FeatureAdoptionChart data={featureAdoptionData as FeatureAdoptionData} />
        </div>
        <div>
          <PremiumModelsUsageChart metrics={metrics} />
        </div>
      </div>
    </div>
  );
}
