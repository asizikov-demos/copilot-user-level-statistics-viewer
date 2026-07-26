import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface CopilotAdoptionReadModel {
  featureAdoptionData: AggregatedMetrics['featureAdoptionData'];
  agentModeHeatmapData: AggregatedMetrics['agentModeHeatmapData'];
  stats: AggregatedMetrics['stats'];
  dailyAdoptionTrend: AggregatedMetrics['dailyAdoptionTrend'];
  dailyCloudAgentAdoptionData: AggregatedMetrics['dailyCloudAgentAdoptionData'];
  dailyCodeReviewAdoptionData: AggregatedMetrics['dailyCodeReviewAdoptionData'];
}

export function selectCopilotAdoptionReadModel(
  metrics: AggregatedMetrics
): CopilotAdoptionReadModel {
  return {
    featureAdoptionData: metrics.featureAdoptionData,
    agentModeHeatmapData: metrics.agentModeHeatmapData,
    stats: metrics.stats,
    dailyAdoptionTrend: metrics.dailyAdoptionTrend,
    dailyCloudAgentAdoptionData: metrics.dailyCloudAgentAdoptionData,
    dailyCodeReviewAdoptionData: metrics.dailyCodeReviewAdoptionData,
  };
}
