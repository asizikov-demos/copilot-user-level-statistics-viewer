"use client";

import React, { createContext, useContext, useState } from 'react';
import {
  DailyEngagementData,
  DailyChatUsersData,
  DailyChatRequestsData,
  LanguageStats,
  DailyModelUsageData,
  FeatureAdoptionData,
  DailyPRUAnalysisData,
  AgentModeHeatmapData,
  ModelFeatureDistributionData,
  AgentImpactData,
  CodeCompletionImpactData,
  ModeImpactData
} from '../utils/metricsParser';
import { CopilotMetrics, MetricsStats, UserSummary } from '../types/metrics';

// Strongly typed shape of the filtered metrics data shared via context.
export interface FilteredMetricsData {
  metrics: CopilotMetrics[];
  stats: MetricsStats | null;
  userSummaries: UserSummary[];
  engagementData: DailyEngagementData[];
  chatUsersData: DailyChatUsersData[];
  chatRequestsData: DailyChatRequestsData[];
  languageStats: LanguageStats[];
  modelUsageData: DailyModelUsageData[];
  featureAdoptionData: FeatureAdoptionData | null;
  pruAnalysisData: DailyPRUAnalysisData[];
  agentModeHeatmapData: AgentModeHeatmapData[];
  modelFeatureDistributionData: ModelFeatureDistributionData[];
  agentImpactData: AgentImpactData[];
  codeCompletionImpactData: CodeCompletionImpactData[];
  editModeImpactData: ModeImpactData[];
  inlineModeImpactData: ModeImpactData[];
  askModeImpactData: ModeImpactData[];
  joinedImpactData: ModeImpactData[];
}

interface MetricsContextValue {
  filteredData: FilteredMetricsData | null;
  setFilteredData: (data: FilteredMetricsData | null) => void;
}

const MetricsContext = createContext<MetricsContextValue | undefined>(undefined);

export const MetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filteredData, setFilteredData] = useState<FilteredMetricsData | null>(null);

  return (
    <MetricsContext.Provider value={{ filteredData, setFilteredData }}>
      {children}
    </MetricsContext.Provider>
  );
};

export function useMetricsData(): MetricsContextValue {
  const ctx = useContext(MetricsContext);
  if (!ctx) {
    throw new Error('useMetricsData must be used within a MetricsProvider');
  }
  return ctx;
}
