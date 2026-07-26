import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface AiCreditsReadModel {
  reportStartDay: AggregatedMetrics['overview']['stats']['reportStartDay'];
  reportEndDay: AggregatedMetrics['overview']['stats']['reportEndDay'];
  dailyAiCreditsData: AggregatedMetrics['ai']['dailyAiCreditsData'];
  userSummaries: AggregatedMetrics['users']['userSummaries'];
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
  const { userSummaries } = metrics.users;
  const { dailyAiCreditsData = [], usageDistributionData = [] } = metrics.ai;

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
