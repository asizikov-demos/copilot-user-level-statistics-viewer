import type { AggregatedMetrics } from '../types/aggregatedMetrics';
import { buildOverviewHeaderModel, type OverviewHeaderModel } from './overviewHeader';

export interface OverviewReadModel {
  reportStartDay: string;
  reportEndDay: string;
  clientReachData: AggregatedMetrics['overview']['clientReachData'];
  featureAdoptionData: AggregatedMetrics['adoption']['featureAdoptionData'];
  clientTrafficSummary: AggregatedMetrics['clients']['traffic']['summary'];
  workingPatterns: AggregatedMetrics['overview']['workingPatterns'];
  header: OverviewHeaderModel;
}

export interface ExecutiveSummaryReadModel {
  enterpriseId: string | null;
  summary: AggregatedMetrics['overview']['executiveSummary'];
  featureAdoptionData: AggregatedMetrics['adoption']['featureAdoptionData'];
}

export function selectOverviewReadModel(metrics: AggregatedMetrics): OverviewReadModel {
  const { stats } = metrics.overview;
  return {
    reportStartDay: stats.reportStartDay,
    reportEndDay: stats.reportEndDay,
    clientReachData: metrics.overview.clientReachData,
    featureAdoptionData: metrics.adoption.featureAdoptionData,
    clientTrafficSummary: metrics.clients.traffic.summary,
    workingPatterns: metrics.overview.workingPatterns,
    header: buildOverviewHeaderModel({
      uniqueUsers: stats.uniqueUsers,
      enterpriseId: stats.enterpriseId,
      reportStartDay: stats.reportStartDay,
      reportEndDay: stats.reportEndDay,
      engagementData: metrics.overview.engagementData,
      dailyAiCreditsData: metrics.ai.dailyAiCreditsData,
      dailyLocData: metrics.impact.joinedImpactData,
    }),
  };
}

export function selectExecutiveSummaryReadModel(
  metrics: AggregatedMetrics
): ExecutiveSummaryReadModel {
  return {
    enterpriseId: metrics.overview.stats.enterpriseId,
    summary: metrics.overview.executiveSummary,
    featureAdoptionData: metrics.adoption.featureAdoptionData,
  };
}
