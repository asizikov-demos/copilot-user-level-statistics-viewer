import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import {
  accumulateCliAggregation,
  createCliAggregationAccumulator,
  getCliUsageForDownstreamCalculations,
} from '../cliAggregation';
import {
  accumulateEngagementAdoptionAggregation,
  createEngagementAdoptionAggregationAccumulator,
  finalizeEngagementAdoptionAggregation,
} from '../engagementAdoptionAggregation';

describe('engagement and adoption aggregation orchestration', () => {
  it('preserves empty engagement, chat, adoption, and advanced-adoption defaults', () => {
    const cliUsage = getCliUsageForDownstreamCalculations(
      createCliAggregationAccumulator()
    );

    expect(finalizeEngagementAdoptionAggregation(
      createEngagementAdoptionAggregationAccumulator(),
      cliUsage
    )).toEqual({
      engagementData: [],
      chatUsersData: [],
      chatRequestsData: [],
      featureAdoptionData: {
        totalUsers: 0,
        completionUsers: 0,
        completionOnlyUsers: 0,
        chatUsers: 0,
        agentModeUsers: 0,
        askModeUsers: 0,
        inlineModeUsers: 0,
        planModeUsers: 0,
        cliUsers: 0,
        appUsers: 0,
        codingAgentUsers: 0,
        codeReviewUsers: 0,
        advancedUsers: 0,
      },
      dailyAdoptionTrend: [],
      dailyCloudAgentAdoptionData: [],
      dailyCodeReviewAdoptionData: [],
    });
  });

  it('coordinates feature signals and consumes CLI daily sessions without accumulating CLI twice', () => {
    const accumulator = createEngagementAdoptionAggregationAccumulator();
    const cliAccumulator = createCliAggregationAccumulator();
    const cliMetric = makeMetric({
      day: '2024-01-16',
      user_id: 1,
      used_cli: true,
      used_copilot_code_review_active: true,
      used_copilot_code_review_passive: true,
      totals_by_cli: {
        session_count: 2,
        request_count: 4,
        prompt_count: 3,
        token_usage: {
          output_tokens_sum: 100,
          prompt_tokens_sum: 50,
          avg_tokens_per_request: 37.5,
        },
      },
      totals_by_feature: [
        {
          feature: 'chat_panel_agent_mode',
          user_initiated_interaction_count: 5,
          code_generation_activity_count: 0,
          code_acceptance_activity_count: 0,
          loc_added_sum: 0,
          loc_deleted_sum: 0,
          loc_suggested_to_add_sum: 0,
          loc_suggested_to_delete_sum: 0,
        },
      ],
    });
    const completionMetric = makeMetric({
      day: '2024-01-15',
      user_id: 2,
      totals_by_feature: [
        {
          feature: 'code_completion',
          user_initiated_interaction_count: 0,
          code_generation_activity_count: 1,
          code_acceptance_activity_count: 0,
          loc_added_sum: 0,
          loc_deleted_sum: 0,
          loc_suggested_to_add_sum: 0,
          loc_suggested_to_delete_sum: 0,
        },
      ],
    });

    accumulateCliAggregation(cliAccumulator, cliMetric);
    accumulateCliAggregation(cliAccumulator, completionMetric);
    accumulateEngagementAdoptionAggregation(accumulator, cliMetric, true);
    accumulateEngagementAdoptionAggregation(accumulator, completionMetric, false);

    const result = finalizeEngagementAdoptionAggregation(
      accumulator,
      getCliUsageForDownstreamCalculations(cliAccumulator)
    );

    expect(result.engagementData.map(day => day.date)).toEqual([
      '2024-01-15',
      '2024-01-16',
    ]);
    expect(result.chatRequestsData[1]).toEqual({
      date: '2024-01-16',
      askModeRequests: 0,
      agentModeRequests: 5,
      editModeRequests: 0,
      inlineModeRequests: 0,
      planModeRequests: 0,
      cliSessions: 2,
    });
    expect(result.featureAdoptionData).toMatchObject({
      totalUsers: 2,
      completionUsers: 1,
      completionOnlyUsers: 1,
      agentModeUsers: 1,
      cliUsers: 1,
      codingAgentUsers: 1,
      codeReviewUsers: 1,
      advancedUsers: 1,
    });
    expect(result.dailyCloudAgentAdoptionData).toEqual([
      { date: '2024-01-16', uniqueUsers: 1 },
    ]);
    expect(result.dailyCodeReviewAdoptionData).toEqual([
      {
        date: '2024-01-16',
        activeUsers: 1,
        passiveUsers: 1,
        totalUsers: 1,
      },
    ]);
  });
});
