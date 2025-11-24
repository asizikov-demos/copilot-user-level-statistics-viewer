import { useMemo } from 'react';
import { CopilotMetrics, MetricsStats } from '../types/metrics';
import { DateRangeFilter } from '../types/filters';
import { aggregateMetrics } from '../utils/metricsAggregator';
import { getFilteredDateRange } from '../utils/dateFilters';

export function useMetricsProcessing(
  rawMetrics: CopilotMetrics[],
  originalStats: MetricsStats | null,
  dateRangeFilter: DateRangeFilter,
  removeUnknownLanguages: boolean
) {
  return useMemo(() => {
    if (!rawMetrics.length || !originalStats) {
      return {
        metrics: [],
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
        joinedImpactData: []
      };
    }

    const aggregated = aggregateMetrics(rawMetrics, {
      removeUnknownLanguages,
      dateFilter: dateRangeFilter,
      reportEndDay: originalStats.reportEndDay
    });

    // Update the date range in stats based on filter
    const { startDay, endDay } = getFilteredDateRange(dateRangeFilter, originalStats.reportStartDay, originalStats.reportEndDay);
    const updatedStats = {
      ...aggregated.stats,
      reportStartDay: startDay,
      reportEndDay: endDay
    };

    return {
      ...aggregated,
      stats: updatedStats
    };
  }, [rawMetrics, originalStats, dateRangeFilter, removeUnknownLanguages]);
}
