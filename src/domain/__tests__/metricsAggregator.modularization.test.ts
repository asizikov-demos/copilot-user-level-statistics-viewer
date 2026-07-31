import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../__tests__/factories/metrics';
import { aggregateMetrics } from '../metricsAggregator';

const feature = (
  name: string,
  interactions: number,
  generations: number,
  locAdded: number,
  locDeleted: number
) => ({
  feature: name,
  user_initiated_interaction_count: interactions,
  code_generation_activity_count: generations,
  code_acceptance_activity_count: 0,
  loc_added_sum: locAdded,
  loc_deleted_sum: locDeleted,
  loc_suggested_to_add_sum: 0,
  loc_suggested_to_delete_sum: 0,
});

describe('metrics aggregation modularization boundary', () => {
  it('preserves cross-family outputs, ordering, single counting, and input records', () => {
    const metrics = [
      makeMetric({
        day: '2024-01-16',
        user_id: 1,
        user_login: 'alice',
        ai_credits_used: 7,
        used_cli: true,
        used_copilot_cloud_agent: true,
        used_copilot_code_review_passive: true,
        ai_adoption_phase: {
          phase_number: 2,
          phase: 'Accelerating',
          version: 'v2',
        },
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
          feature('chat_panel_ask_mode', 3, 0, 10, 2),
          feature('chat_panel_agent_mode', 4, 0, 8, 1),
          feature('code_completion', 1, 2, 20, 5),
          feature('copilot_cli', 2, 0, 6, 1),
        ],
      }),
      makeMetric({
        day: '2024-01-15',
        user_id: 1,
        user_login: 'alice',
        ai_credits_used: 5,
        ai_adoption_phase: {
          phase_number: 1,
          phase: 'Exploring',
          version: 'v1',
        },
        totals_by_feature: [
          feature('code_completion', 1, 1, 4, 1),
        ],
      }),
      makeMetric({
        day: '2024-01-15',
        user_id: 2,
        user_login: 'bob',
        ai_credits_used: 0,
        used_copilot_code_review_active: true,
        totals_by_feature: [
          feature('chat_inline', 2, 0, 5, 2),
        ],
      }),
    ];
    const originalMetrics = structuredClone(metrics);

    const { aggregated } = aggregateMetrics(metrics);

    expect(metrics).toEqual(originalMetrics);
    expect(aggregated.overview.engagementData).toEqual([
      {
        date: '2024-01-15',
        activeUsers: 2,
        totalUsers: 2,
        engagementPercentage: 100,
      },
      {
        date: '2024-01-16',
        activeUsers: 1,
        totalUsers: 2,
        engagementPercentage: 50,
      },
    ]);
    expect(aggregated.overview.chatUsersData).toEqual([
      {
        date: '2024-01-15',
        askModeUsers: 0,
        agentModeUsers: 0,
        editModeUsers: 0,
        inlineModeUsers: 1,
        planModeUsers: 0,
        cliUsers: 0,
      },
      {
        date: '2024-01-16',
        askModeUsers: 1,
        agentModeUsers: 1,
        editModeUsers: 0,
        inlineModeUsers: 0,
        planModeUsers: 0,
        cliUsers: 1,
      },
    ]);
    expect(aggregated.overview.chatRequestsData).toEqual([
      {
        date: '2024-01-15',
        askModeRequests: 0,
        agentModeRequests: 0,
        editModeRequests: 0,
        inlineModeRequests: 2,
        planModeRequests: 0,
        cliSessions: 0,
      },
      {
        date: '2024-01-16',
        askModeRequests: 3,
        agentModeRequests: 4,
        editModeRequests: 0,
        inlineModeRequests: 0,
        planModeRequests: 0,
        cliSessions: 2,
      },
    ]);
    expect(aggregated.adoption.featureAdoptionData).toEqual({
      totalUsers: 2,
      completionUsers: 1,
      completionOnlyUsers: 0,
      chatUsers: 2,
      agentModeUsers: 1,
      askModeUsers: 1,
      inlineModeUsers: 1,
      planModeUsers: 0,
      cliUsers: 1,
      appUsers: 0,
      codingAgentUsers: 1,
      codeReviewUsers: 2,
      advancedUsers: 1,
    });
    expect(aggregated.adoption.dailyCloudAgentAdoptionData).toEqual([
      { date: '2024-01-16', uniqueUsers: 1 },
    ]);
    expect(aggregated.adoption.dailyCodeReviewAdoptionData).toEqual([
      {
        date: '2024-01-15',
        activeUsers: 1,
        passiveUsers: 0,
        totalUsers: 1,
      },
      {
        date: '2024-01-16',
        activeUsers: 0,
        passiveUsers: 1,
        totalUsers: 1,
      },
    ]);
    expect(aggregated.impact.agentImpactData).toEqual([
      {
        date: '2024-01-15',
        locAdded: 0,
        locDeleted: 0,
        netChange: 0,
        userCount: 0,
        totalUniqueUsers: 2,
      },
      {
        date: '2024-01-16',
        locAdded: 8,
        locDeleted: 1,
        netChange: 7,
        userCount: 1,
        totalUniqueUsers: 2,
      },
    ]);
    expect(aggregated.impact.codeCompletionImpactData.map(day => day.netChange)).toEqual([
      3,
      15,
    ]);
    expect(aggregated.impact.editModeImpactData.map(day => day.netChange)).toEqual([0, 0]);
    expect(aggregated.impact.inlineModeImpactData.map(day => day.netChange)).toEqual([3, 0]);
    expect(aggregated.impact.askModeImpactData.map(day => day.netChange)).toEqual([0, 8]);
    expect(aggregated.impact.cliImpactData.map(day => day.netChange)).toEqual([0, 5]);
    expect(aggregated.impact.joinedImpactData.map(day => day.netChange)).toEqual([6, 35]);

    expect(aggregated.ai.aiAdoptionPhaseData.map(data => ({
      phase: data.phase.phase_number,
      users: data.userCount,
      credits: data.avgAiCreditsUsed,
    }))).toEqual([
      { phase: 2, users: 1, credits: 12 },
      { phase: -1, users: 1, credits: 0 },
    ]);
    expect(aggregated.ai.usageDistributionData.map(bucket => bucket.id)).toEqual([
      'power',
      'heavy',
      'typical',
      'light',
    ]);
    expect(aggregated.ai.usageDistributionData.map(bucket => bucket.userCount)).toEqual([
      0,
      0,
      2,
      0,
    ]);
    expect(aggregated.ai.dailyAiCreditsData).toEqual([
      { date: '2024-01-15', aiCreditsUsed: 5, users: 1 },
      { date: '2024-01-16', aiCreditsUsed: 7, users: 1 },
    ]);
  });
});
