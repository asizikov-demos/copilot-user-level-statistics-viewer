import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface AiCreditsReadModel {
  reportStartDay: AggregatedMetrics['overview']['stats']['reportStartDay'];
  reportEndDay: AggregatedMetrics['overview']['stats']['reportEndDay'];
  dailyAiCreditsData: AggregatedMetrics['ai']['dailyAiCreditsData'];
  creditsSummary: AggregatedMetrics['ai']['creditsSummary'];
  usageDistributionData: AggregatedMetrics['ai']['usageDistributionData'];
  totalAiCreditsUsed: number;
  onUserClick: (userLogin: string, userId: number) => void;
}

export function selectAiCreditsReadModel(
  metrics: AggregatedMetrics,
  onUserClick: AiCreditsReadModel['onUserClick']
): AiCreditsReadModel {
  const {
    stats: { reportStartDay, reportEndDay },
  } = metrics.overview;
  const { creditsSummary, dailyAiCreditsData = [], usageDistributionData = [] } = metrics.ai;

  return {
    reportStartDay,
    reportEndDay,
    dailyAiCreditsData,
    creditsSummary,
    usageDistributionData,
    totalAiCreditsUsed: creditsSummary.totalAiCreditsUsed,
    onUserClick,
  };
}
