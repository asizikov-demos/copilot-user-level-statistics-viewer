import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface CopilotAdoptionReadModel {
  vscodeAgentUsage: AggregatedMetrics['adoption']['vscodeAgentUsage'];
  featureAdoptionData: AggregatedMetrics['adoption']['featureAdoptionData'];
  stats: AggregatedMetrics['overview']['stats'];
  dailyAdoptionTrend: AggregatedMetrics['adoption']['dailyAdoptionTrend'];
  dailyCloudAgentAdoptionData: AggregatedMetrics['adoption']['dailyCloudAgentAdoptionData'];
  dailyCodeReviewAdoptionData: AggregatedMetrics['adoption']['dailyCodeReviewAdoptionData'];
}

export function selectCopilotAdoptionReadModel(
  metrics: AggregatedMetrics
): CopilotAdoptionReadModel {
  const featureAdoptionData = metrics.adoption.featureAdoptionData;
  const vscodeAgentUsers = featureAdoptionData.vscodeAgentUsers;
  const normalizedFeatureAdoptionData = vscodeAgentUsers === undefined
    ? {
        ...featureAdoptionData,
        vscodeAgentUsers: metrics.adoption.vscodeAgentUsage.summary.activeUsers ?? 0,
      }
    : featureAdoptionData;

  return {
    vscodeAgentUsage: metrics.adoption.vscodeAgentUsage,
    featureAdoptionData: normalizedFeatureAdoptionData,
    stats: metrics.overview.stats,
    dailyAdoptionTrend: metrics.adoption.dailyAdoptionTrend,
    dailyCloudAgentAdoptionData: metrics.adoption.dailyCloudAgentAdoptionData,
    dailyCodeReviewAdoptionData: metrics.adoption.dailyCodeReviewAdoptionData,
  };
}
