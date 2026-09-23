import type { AggregatedMetrics } from '../types/aggregatedMetrics';
import { buildOverviewHeaderModel, type OverviewHeaderModel } from './overviewHeader';

export interface OverviewReadModel {
  reportStartDay: string;
  reportEndDay: string;
  engagementData: AggregatedMetrics['overview']['engagementData'];
  chatUsersData: AggregatedMetrics['overview']['chatUsersData'];
  chatRequestsData: AggregatedMetrics['overview']['chatRequestsData'];
  header: OverviewHeaderModel;
}

export interface ExecutiveSummaryReadModel {
  reportStartDay: string;
  reportEndDay: string;
  enterpriseId: string | null;
  joinedImpactData: AggregatedMetrics['impact']['joinedImpactData'];
  agentImpactData: AggregatedMetrics['impact']['agentImpactData'];
  codeCompletionImpactData: AggregatedMetrics['impact']['codeCompletionImpactData'];
  featureAdoptionData: AggregatedMetrics['adoption']['featureAdoptionData'];
}

export function selectOverviewReadModel(metrics: AggregatedMetrics): OverviewReadModel {
  const { stats } = metrics.overview;
  return {
    reportStartDay: stats.reportStartDay,
    reportEndDay: stats.reportEndDay,
    engagementData: metrics.overview.engagementData,
    chatUsersData: metrics.overview.chatUsersData,
    chatRequestsData: metrics.overview.chatRequestsData,
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
    reportStartDay: metrics.overview.stats.reportStartDay,
    reportEndDay: metrics.overview.stats.reportEndDay,
    enterpriseId: metrics.overview.stats.enterpriseId,
    joinedImpactData: metrics.impact.joinedImpactData,
    agentImpactData: metrics.impact.agentImpactData,
    codeCompletionImpactData: metrics.impact.codeCompletionImpactData,
    featureAdoptionData: metrics.adoption.featureAdoptionData,
  };
}
