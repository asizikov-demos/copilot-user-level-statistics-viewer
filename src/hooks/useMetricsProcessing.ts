import { useMemo } from 'react';
import { CopilotMetrics } from '../types/metrics';
import { aggregateMetrics } from '../domain/metricsAggregator';

export function useMetricsProcessing(rawMetrics: CopilotMetrics[]) {
  return useMemo(() => {
    if (!rawMetrics.length) {
      return {
        stats: null,
        userSummaries: [],
        engagementData: [],
        chatUsersData: [],
        chatRequestsData: [],
        languageStats: [],
        modelUsageData: [],
        featureAdoptionData: null,
        pruAnalysisData: [],
        agentModeHeatmapData: [],
        modelFeatureDistributionData: [],
        agentImpactData: [],
        codeCompletionImpactData: [],
        editModeImpactData: [],
        inlineModeImpactData: [],
        askModeImpactData: [],
        cliImpactData: [],
        joinedImpactData: []
      };
    }

    return aggregateMetrics(rawMetrics);
  }, [rawMetrics]);
}
