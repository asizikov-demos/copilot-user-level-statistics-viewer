import { useMemo } from 'react';
import { CopilotMetrics, MetricsStats } from '../types/metrics';
import { aggregateMetrics } from '../domain/metricsAggregator';

export function useMetricsProcessing(
  rawMetrics: CopilotMetrics[],
  originalStats: MetricsStats | null
) {
  return useMemo(() => {
    if (!rawMetrics.length || !originalStats) {
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

    const aggregated = aggregateMetrics(rawMetrics);

    return {
      ...aggregated,
      stats: aggregated.stats
    };
  }, [rawMetrics, originalStats]);
}
