import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface OverviewReadModel {
  reportStartDay: string;
  reportEndDay: string;
  engagementData: AggregatedMetrics['overview']['engagementData'];
  chatUsersData: AggregatedMetrics['overview']['chatUsersData'];
  chatRequestsData: AggregatedMetrics['overview']['chatRequestsData'];
}

export interface ExecutiveSummaryReadModel {
  reportStartDay: string;
  reportEndDay: string;
  joinedImpactData: AggregatedMetrics['impact']['joinedImpactData'];
  agentImpactData: AggregatedMetrics['impact']['agentImpactData'];
  codeCompletionImpactData: AggregatedMetrics['impact']['codeCompletionImpactData'];
  featureAdoptionData: AggregatedMetrics['adoption']['featureAdoptionData'];
}

export function selectOverviewReadModel(metrics: AggregatedMetrics): OverviewReadModel {
  return {
    reportStartDay: metrics.overview.stats.reportStartDay,
    reportEndDay: metrics.overview.stats.reportEndDay,
    engagementData: metrics.overview.engagementData,
    chatUsersData: metrics.overview.chatUsersData,
    chatRequestsData: metrics.overview.chatRequestsData,
  };
}

export function selectExecutiveSummaryReadModel(
  metrics: AggregatedMetrics
): ExecutiveSummaryReadModel {
  return {
    reportStartDay: metrics.overview.stats.reportStartDay,
    reportEndDay: metrics.overview.stats.reportEndDay,
    joinedImpactData: metrics.impact.joinedImpactData,
    agentImpactData: metrics.impact.agentImpactData,
    codeCompletionImpactData: metrics.impact.codeCompletionImpactData,
    featureAdoptionData: metrics.adoption.featureAdoptionData,
  };
}
