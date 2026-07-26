import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface CopilotAdoptionReadModel {
  featureAdoptionData: AggregatedMetrics['adoption']['featureAdoptionData'];
  agentModeHeatmapData: AggregatedMetrics['adoption']['agentModeHeatmapData'];
  stats: AggregatedMetrics['overview']['stats'];
  dailyAdoptionTrend: AggregatedMetrics['adoption']['dailyAdoptionTrend'];
  dailyCloudAgentAdoptionData: AggregatedMetrics['adoption']['dailyCloudAgentAdoptionData'];
  dailyCodeReviewAdoptionData: AggregatedMetrics['adoption']['dailyCodeReviewAdoptionData'];
}

export function selectCopilotAdoptionReadModel(
  metrics: AggregatedMetrics
): CopilotAdoptionReadModel {
  return {
    featureAdoptionData: metrics.adoption.featureAdoptionData,
    agentModeHeatmapData: metrics.adoption.agentModeHeatmapData,
    stats: metrics.overview.stats,
    dailyAdoptionTrend: metrics.adoption.dailyAdoptionTrend,
    dailyCloudAgentAdoptionData: metrics.adoption.dailyCloudAgentAdoptionData,
    dailyCodeReviewAdoptionData: metrics.adoption.dailyCodeReviewAdoptionData,
  };
}
