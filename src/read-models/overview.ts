import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface OverviewReadModel {
  reportStartDay: string;
  reportEndDay: string;
  engagementData: AggregatedMetrics['engagementData'];
  chatUsersData: AggregatedMetrics['chatUsersData'];
  chatRequestsData: AggregatedMetrics['chatRequestsData'];
}

export interface ExecutiveSummaryReadModel {
  reportStartDay: string;
  reportEndDay: string;
  joinedImpactData: AggregatedMetrics['joinedImpactData'];
  agentImpactData: AggregatedMetrics['agentImpactData'];
  codeCompletionImpactData: AggregatedMetrics['codeCompletionImpactData'];
  featureAdoptionData: AggregatedMetrics['featureAdoptionData'];
}

export function selectOverviewReadModel(metrics: AggregatedMetrics): OverviewReadModel {
  return {
    reportStartDay: metrics.stats.reportStartDay,
    reportEndDay: metrics.stats.reportEndDay,
    engagementData: metrics.engagementData,
    chatUsersData: metrics.chatUsersData,
    chatRequestsData: metrics.chatRequestsData,
  };
}

export function selectExecutiveSummaryReadModel(
  metrics: AggregatedMetrics
): ExecutiveSummaryReadModel {
  return {
    reportStartDay: metrics.stats.reportStartDay,
    reportEndDay: metrics.stats.reportEndDay,
    joinedImpactData: metrics.joinedImpactData,
    agentImpactData: metrics.agentImpactData,
    codeCompletionImpactData: metrics.codeCompletionImpactData,
    featureAdoptionData: metrics.featureAdoptionData,
  };
}
