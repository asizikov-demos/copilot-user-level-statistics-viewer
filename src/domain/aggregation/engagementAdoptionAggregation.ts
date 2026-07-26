import type { AggregatedMetrics } from '../../types/aggregatedMetrics';
import type { CopilotMetrics } from '../../types/metrics';
import {
  accumulateCloudAgentAdoption,
  accumulateCodeReviewAdoptionSignal,
  computeDailyCloudAgentAdoptionData,
  computeDailyCodeReviewAdoptionData,
  createAdvancedAdoptionAccumulator,
  type AdvancedAdoptionAccumulator,
} from '../calculators/advancedAdoptionCalculator';
import {
  accumulateChatFeature,
  computeChatRequestsData,
  computeChatUsersData,
  createChatAccumulator,
  type ChatAccumulator,
} from '../calculators/chatCalculator';
import type { CliUsageForDownstreamCalculations } from '../calculators/cliUsageCalculator';
import {
  accumulateEngagement,
  computeAdoptionTrend,
  computeEngagementData,
  createEngagementAccumulator,
  type EngagementAccumulator,
} from '../calculators/engagementCalculator';
import {
  accumulateCliAdoption,
  accumulateCodeReviewAdoption,
  accumulateCodingAgentAdoption,
  accumulateFeatureAdoption,
  computeFeatureAdoptionData,
  createFeatureAdoptionAccumulator,
  type FeatureAdoptionAccumulator,
} from '../calculators/featureAdoptionCalculator';

export interface EngagementAdoptionAggregationAccumulator {
  engagement: EngagementAccumulator;
  chat: ChatAccumulator;
  featureAdoption: FeatureAdoptionAccumulator;
  advancedAdoption: AdvancedAdoptionAccumulator;
}

export type EngagementAdoptionAggregationResult = Pick<
  AggregatedMetrics,
  | 'engagementData'
  | 'chatUsersData'
  | 'chatRequestsData'
  | 'featureAdoptionData'
  | 'dailyAdoptionTrend'
  | 'dailyCloudAgentAdoptionData'
  | 'dailyCodeReviewAdoptionData'
>;

export function createEngagementAdoptionAggregationAccumulator(
): EngagementAdoptionAggregationAccumulator {
  return {
    engagement: createEngagementAccumulator(),
    chat: createChatAccumulator(),
    featureAdoption: createFeatureAdoptionAccumulator(),
    advancedAdoption: createAdvancedAdoptionAccumulator(),
  };
}

export function accumulateEngagementAdoptionAggregation(
  accumulator: EngagementAdoptionAggregationAccumulator,
  metric: CopilotMetrics,
  usedCopilotCloudAgent: boolean
): void {
  const date = metric.day;
  const userId = metric.user_id;
  const usedActiveCodeReview = metric.used_copilot_code_review_active ?? false;
  const usedPassiveCodeReview = metric.used_copilot_code_review_passive ?? false;

  accumulateEngagement(accumulator.engagement, date, userId);
  accumulateCliAdoption(accumulator.featureAdoption, userId, metric.used_cli);
  accumulateCodingAgentAdoption(
    accumulator.featureAdoption,
    userId,
    usedCopilotCloudAgent
  );
  accumulateCodeReviewAdoption(
    accumulator.featureAdoption,
    userId,
    usedActiveCodeReview || usedPassiveCodeReview
  );
  accumulateCloudAgentAdoption(
    accumulator.advancedAdoption,
    date,
    userId,
    usedCopilotCloudAgent
  );
  accumulateCodeReviewAdoptionSignal(
    accumulator.advancedAdoption,
    date,
    userId,
    usedActiveCodeReview,
    usedPassiveCodeReview
  );

  for (const feature of metric.totals_by_feature) {
    accumulateFeatureAdoption(
      accumulator.featureAdoption,
      userId,
      feature.feature,
      feature.user_initiated_interaction_count,
      feature.code_generation_activity_count
    );
    accumulateChatFeature(
      accumulator.chat,
      date,
      userId,
      feature.feature,
      feature.user_initiated_interaction_count
    );
  }
}

export function finalizeEngagementAdoptionAggregation(
  accumulator: EngagementAdoptionAggregationAccumulator,
  cliUsage: CliUsageForDownstreamCalculations
): EngagementAdoptionAggregationResult {
  return {
    engagementData: computeEngagementData(accumulator.engagement, cliUsage),
    chatUsersData: computeChatUsersData(accumulator.chat, cliUsage),
    chatRequestsData: computeChatRequestsData(accumulator.chat, cliUsage),
    featureAdoptionData: computeFeatureAdoptionData(accumulator.featureAdoption),
    dailyAdoptionTrend: computeAdoptionTrend(accumulator.engagement, cliUsage),
    dailyCloudAgentAdoptionData: computeDailyCloudAgentAdoptionData(
      accumulator.advancedAdoption
    ),
    dailyCodeReviewAdoptionData: computeDailyCodeReviewAdoptionData(
      accumulator.advancedAdoption
    ),
  };
}
