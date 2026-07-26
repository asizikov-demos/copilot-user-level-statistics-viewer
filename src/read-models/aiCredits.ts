import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface AiCreditsReadModel {
  reportStartDay: AggregatedMetrics['stats']['reportStartDay'];
  reportEndDay: AggregatedMetrics['stats']['reportEndDay'];
  dailyAiCreditsData: AggregatedMetrics['dailyAiCreditsData'];
  userSummaries: AggregatedMetrics['userSummaries'];
  usageDistributionData: AggregatedMetrics['usageDistributionData'];
  totalAiCreditsUsed: number;
  onUserClick: (userLogin: string, userId: number) => void;
}

export function selectAiCreditsReadModel(
  metrics: AggregatedMetrics,
  onUserClick: AiCreditsReadModel['onUserClick']
): AiCreditsReadModel {
  const {
    stats: { reportStartDay, reportEndDay },
    dailyAiCreditsData = [],
    userSummaries,
    usageDistributionData = [],
  } = metrics;

  return {
    reportStartDay,
    reportEndDay,
    dailyAiCreditsData,
    userSummaries,
    usageDistributionData,
    totalAiCreditsUsed: userSummaries.reduce(
      (total, user) => total + user.total_ai_credits_used,
      0
    ),
    onUserClick,
  };
}
