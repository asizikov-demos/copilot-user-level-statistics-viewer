import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../__tests__/factories/metrics';
import type { CopilotMetrics } from '../../types/metrics';

const { resolveCopilotCloudAgentUsage } = vi.hoisted(() => ({
  resolveCopilotCloudAgentUsage: vi.fn(
    (
      metric: Pick<
        CopilotMetrics,
        'used_copilot_coding_agent' | 'used_copilot_cloud_agent'
      >
    ) =>
      metric.used_copilot_cloud_agent
      ?? metric.used_copilot_coding_agent
      ?? false
  ),
}));

vi.mock('../copilotCloudAgentUsage', () => ({
  resolveCopilotCloudAgentUsage,
}));

import { aggregateMetrics } from '../metricsAggregator';

const aggregateKeys = [
  'stats',
  'userSummaries',
  'engagementData',
  'chatUsersData',
  'chatRequestsData',
  'languageStats',
  'modelUsageData',
  'featureAdoptionData',
  'agentModeHeatmapData',
  'agentImpactData',
  'codeCompletionImpactData',
  'editModeImpactData',
  'inlineModeImpactData',
  'askModeImpactData',
  'cliImpactData',
  'joinedImpactData',
  'ideStats',
  'multiIDEUsersCount',
  'totalUniqueIDEUsers',
  'pluginVersionData',
  'languageFeatureImpactData',
  'dailyLanguageGenerationsData',
  'dailyLanguageLocData',
  'modelBreakdownData',
  'dailyCliSessionData',
  'dailyCliTokenData',
  'dailyCliAdoptionTrend',
  'dailyAdoptionTrend',
  'dailyCloudAgentAdoptionData',
  'dailyCodeReviewAdoptionData',
  'aiAdoptionPhaseData',
  'usageDistributionData',
  'dailyAiCreditsData',
];

const ideTotal = (ide: string, interactions: number) => ({
  ide,
  user_initiated_interaction_count: interactions,
  code_generation_activity_count: 0,
  code_acceptance_activity_count: 0,
  loc_added_sum: 0,
  loc_deleted_sum: 0,
  loc_suggested_to_add_sum: 0,
  loc_suggested_to_delete_sum: 0,
});

describe('metrics aggregation orchestration characterization', () => {
  beforeEach(() => {
    resolveCopilotCloudAgentUsage.mockClear();
  });

  it('preserves empty and first-record report metadata for stats and user details', () => {
    const empty = aggregateMetrics([]);

    expect(empty.aggregated.stats.reportStartDay).toBe('');
    expect(empty.aggregated.stats.reportEndDay).toBe('');
    expect(empty.aggregated.userSummaries).toEqual([]);
    expect(empty.userDetailAccumulator.reportStartDay).toBe('');
    expect(empty.userDetailAccumulator.reportEndDay).toBe('');

    const first = makeMetric({
      report_start_day: '2024-02-01',
      report_end_day: '2024-02-29',
    });
    const second = makeMetric({
      report_start_day: '2024-03-01',
      report_end_day: '2024-03-31',
    });
    const populated = aggregateMetrics([first, second]);

    expect(populated.aggregated.stats.reportStartDay).toBe('2024-02-01');
    expect(populated.aggregated.stats.reportEndDay).toBe('2024-02-29');
    expect(populated.userDetailAccumulator.reportStartDay).toBe('2024-02-01');
    expect(populated.userDetailAccumulator.reportEndDay).toBe('2024-02-29');
  });

  it('resolves the shared cloud-agent signal once per record for all aggregate families', () => {
    const metric = makeMetric({
      user_id: 7,
      day: '2024-01-17',
      used_copilot_coding_agent: false,
      used_copilot_cloud_agent: true,
    });

    const { aggregated } = aggregateMetrics([metric]);

    expect(resolveCopilotCloudAgentUsage).toHaveBeenCalledOnce();
    expect(resolveCopilotCloudAgentUsage).toHaveBeenCalledWith(metric);
    expect(aggregated.stats.codingAgentUsers).toBe(1);
    expect(aggregated.userSummaries[0].used_copilot_coding_agent).toBe(true);
    expect(aggregated.userSummaries[0].cloud_agent_days).toBe(1);
    expect(aggregated.featureAdoptionData.codingAgentUsers).toBe(1);
    expect(aggregated.dailyCloudAgentAdoptionData).toEqual([
      { date: '2024-01-17', uniqueUsers: 1 },
    ]);
  });

  it('preserves every user-summary counter, flag, day set, and final ordering rule', () => {
    const phase = {
      phase_number: 2,
      phase: 'Accelerating',
      version: 'v2',
    };
    const firstUserEarlier = makeMetric({
      user_id: 1,
      user_login: 'alice',
      day: '2024-01-15',
      user_initiated_interaction_count: 3,
      code_generation_activity_count: 4,
      code_acceptance_activity_count: 2,
      loc_added_sum: 10,
      loc_deleted_sum: 12,
      loc_suggested_to_add_sum: 14,
      loc_suggested_to_delete_sum: 16,
      ai_credits_used: 1.5,
      used_chat: true,
      used_copilot_cloud_agent: true,
      used_copilot_code_review_active: true,
      totals_by_ide: [
        ideTotal(' vscode ', 3),
        ideTotal('jetbrains', 0),
      ],
      ai_adoption_phase: {
        phase_number: 1,
        phase: 'Exploring',
        version: 'v1',
      },
    });
    const firstUserLater = makeMetric({
      user_id: 1,
      user_login: 'alice',
      day: '2024-01-16',
      user_initiated_interaction_count: 7,
      code_generation_activity_count: 6,
      code_acceptance_activity_count: 5,
      loc_added_sum: -2,
      loc_deleted_sum: -3,
      loc_suggested_to_add_sum: -4,
      loc_suggested_to_delete_sum: -5,
      ai_credits_used: 2.5,
      used_agent: true,
      used_cli: true,
      used_copilot_code_review_passive: true,
      totals_by_ide: [ideTotal('alpha', 1), ideTotal('vscode', 1)],
      totals_by_model_feature: [{
        model: ' Auto ',
        feature: 'agent_edit',
        user_initiated_interaction_count: 0,
        code_generation_activity_count: 1,
        code_acceptance_activity_count: 0,
        loc_added_sum: 0,
        loc_deleted_sum: 0,
        loc_suggested_to_add_sum: 0,
        loc_suggested_to_delete_sum: 0,
      }],
      ai_adoption_phase: phase,
    });
    const secondUser = makeMetric({
      user_id: 2,
      user_login: 'bob',
      user_initiated_interaction_count: 20,
    });

    const { aggregated } = aggregateMetrics([
      firstUserEarlier,
      firstUserLater,
      secondUser,
    ]);

    expect(aggregated.userSummaries.map(user => user.user_id)).toEqual([2, 1]);
    expect(aggregated.userSummaries[1]).toEqual({
      user_login: 'alice',
      user_id: 1,
      total_user_initiated_interactions: 10,
      total_code_generation_activities: 10,
      total_code_acceptance_activities: 7,
      total_loc_added: 8,
      total_loc_deleted: 9,
      total_loc_suggested_to_add: 10,
      total_loc_suggested_to_delete: 11,
      total_ai_credits_used: 4,
      net_loc_contribution: -1,
      days_active: 2,
      cloud_agent_days: 1,
      code_review_days: 2,
      top_client: 'vscode',
      used_agent: true,
      used_chat: true,
      used_cli: true,
      used_copilot_coding_agent: true,
      used_copilot_code_review_active: true,
      used_copilot_code_review_passive: true,
      used_auto_mode: true,
      ai_adoption_phase: phase,
    });
    expect(aggregated.userSummaries[1].ai_adoption_phase).not.toBe(phase);
  });

  it('preserves client positive guards, CLI fallback, and lexical tie-breaking', () => {
    const metric = makeMetric({
      used_cli: true,
      totals_by_ide: [
        ideTotal(' zebra ', 1),
        ideTotal('alpha', 1),
        ideTotal('ignored', -1),
        ideTotal('   ', 10),
      ],
    });

    const { aggregated } = aggregateMetrics([metric]);

    expect(aggregated.userSummaries[0].top_client).toBe('alpha');
  });

  it('keeps the flat aggregate key order, does not mutate input, and owns one raw-record pass', () => {
    const source = [
      makeMetric({
        user_id: 1,
        totals_by_ide: [ideTotal('vscode', 2)],
      }),
      makeMetric({
        user_id: 2,
        used_cli: true,
      }),
    ];
    const original = structuredClone(source);
    let iteratorRequests = 0;
    const metrics = new Proxy(source, {
      get(target, property, receiver) {
        if (property === Symbol.iterator) {
          iteratorRequests++;
        }
        return Reflect.get(target, property, receiver);
      },
    });

    const { aggregated } = aggregateMetrics(metrics);

    expect(Object.keys(aggregated)).toEqual(aggregateKeys);
    expect(iteratorRequests).toBe(1);
    expect(source).toEqual(original);
  });
});
