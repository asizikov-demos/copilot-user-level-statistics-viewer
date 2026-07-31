import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AGGREGATED_METRICS_FIELD_KEYS,
  AGGREGATED_METRICS_SLICE_KEYS,
} from '../../__tests__/factories/aggregatedMetrics';
import { makeMetric } from '../../__tests__/factories/metrics';
import type { AggregatedMetrics } from '../../types/aggregatedMetrics';
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

import {
  aggregateMetrics,
  assembleAggregatedMetrics,
} from '../metricsAggregator';

const aggregateSliceKeys = [
  'overview',
  'users',
  'adoption',
  'impact',
  'languages',
  'clients',
  'models',
  'cli',
  'ai',
] as const satisfies readonly (keyof AggregatedMetrics)[];

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

    expect(empty.aggregated.overview.stats.reportStartDay).toBe('');
    expect(empty.aggregated.overview.stats.reportEndDay).toBe('');
    expect(empty.aggregated.users.userSummaries).toEqual([]);
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

    expect(populated.aggregated.overview.stats.reportStartDay).toBe('2024-02-01');
    expect(populated.aggregated.overview.stats.reportEndDay).toBe('2024-02-29');
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
    expect(aggregated.overview.stats.codingAgentUsers).toBe(1);
    expect(aggregated.users.userSummaries[0].used_copilot_coding_agent).toBe(true);
    expect(aggregated.users.userSummaries[0].cloud_agent_days).toBe(1);
    expect(aggregated.adoption.featureAdoptionData.codingAgentUsers).toBe(1);
    expect(aggregated.adoption.dailyCloudAgentAdoptionData).toEqual([
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

    expect(aggregated.users.userSummaries.map(user => user.user_id)).toEqual([2, 1]);
    expect(aggregated.users.userSummaries[1]).toEqual({
      user_login: 'alice',
      user_id: 1,
      total_user_initiated_interactions: 10,
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
      clients_used: ['alpha', 'copilot_cli', 'vscode'],
      used_code_completion: true,
      used_agent: true,
      used_chat: true,
      used_cli: true,
      used_copilot_coding_agent: true,
      used_copilot_code_review_active: true,
      used_copilot_code_review_passive: true,
      used_auto_mode: true,
      ai_adoption_phase: phase,
    });
    expect(aggregated.users.userSummaries[1].ai_adoption_phase).not.toBe(phase);
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

    expect(aggregated.users.userSummaries[0].top_client).toBe('alpha');
  });

  it('assembles finalized family results without copying their values', () => {
    const defaults = aggregateMetrics([]).aggregated;
    const coreStatsAggregation = {
      stats: { ...defaults.overview.stats, totalRecords: 11 },
    };
    const userSummaryAggregation = {
      userSummaries: [...defaults.users.userSummaries],
    };
    const engagementAdoptionAggregation = {
      engagementData: [...defaults.overview.engagementData],
      chatUsersData: [...defaults.overview.chatUsersData],
      chatRequestsData: [...defaults.overview.chatRequestsData],
      featureAdoptionData: { ...defaults.adoption.featureAdoptionData },
      dailyAdoptionTrend: [...defaults.adoption.dailyAdoptionTrend],
      dailyCloudAgentAdoptionData: [
        ...defaults.adoption.dailyCloudAgentAdoptionData,
      ],
      dailyCodeReviewAdoptionData: [
        ...defaults.adoption.dailyCodeReviewAdoptionData,
      ],
    };
    const impactAggregation = {
      agentImpactData: [...defaults.impact.agentImpactData],
      codeCompletionImpactData: [
        ...defaults.impact.codeCompletionImpactData,
      ],
      editModeImpactData: [...defaults.impact.editModeImpactData],
      inlineModeImpactData: [...defaults.impact.inlineModeImpactData],
      askModeImpactData: [...defaults.impact.askModeImpactData],
      cliImpactData: [...defaults.impact.cliImpactData],
      joinedImpactData: [...defaults.impact.joinedImpactData],
    };
    const languageAggregation = {
      languageStats: [...defaults.languages.languageStats],
      languageFeatureImpactData: {
        ...defaults.languages.languageFeatureImpactData,
      },
      dailyLanguageGenerationsData: {
        ...defaults.languages.dailyLanguageGenerationsData,
      },
      dailyLanguageLocData: {
        ...defaults.languages.dailyLanguageLocData,
      },
    };
    const clientAggregation = {
      ideStats: [...defaults.clients.ideStats],
      multiIDEUsersCount: 12,
      totalUniqueIDEUsers: 13,
      pluginVersionData: { ...defaults.clients.pluginVersionData },
    };
    const modelAggregation = {
      modelUsageData: [...defaults.models.modelUsageData],
      modelBreakdownData: { ...defaults.models.modelBreakdownData },
    };
    const cliAggregation = {
      dailyCliSessionData: [...defaults.cli.dailyCliSessionData],
      dailyCliTokenData: [...defaults.cli.dailyCliTokenData],
      dailyCliAdoptionTrend: [...defaults.cli.dailyCliAdoptionTrend],
    };
    const aiAggregation = {
      aiAdoptionPhaseData: [...defaults.ai.aiAdoptionPhaseData],
      usageDistributionData: [...defaults.ai.usageDistributionData],
      dailyAiCreditsData: [...defaults.ai.dailyAiCreditsData],
    };
    const aggregated = assembleAggregatedMetrics({
      coreStatsAggregation,
      userSummaryAggregation,
      engagementAdoptionAggregation,
      impactAggregation,
      languageAggregation,
      clientAggregation,
      modelAggregation,
      cliAggregation,
      aiAggregation,
    });
    expect(aggregated.overview.stats).toBe(coreStatsAggregation.stats);
    expect(aggregated.overview.engagementData).toBe(
      engagementAdoptionAggregation.engagementData
    );
    expect(aggregated.overview.chatUsersData).toBe(
      engagementAdoptionAggregation.chatUsersData
    );
    expect(aggregated.overview.chatRequestsData).toBe(
      engagementAdoptionAggregation.chatRequestsData
    );
    expect(aggregated.users.userSummaries).toBe(
      userSummaryAggregation.userSummaries
    );
    expect(aggregated.adoption.featureAdoptionData).toBe(
      engagementAdoptionAggregation.featureAdoptionData
    );
    expect(aggregated.adoption.dailyAdoptionTrend).toBe(
      engagementAdoptionAggregation.dailyAdoptionTrend
    );
    expect(aggregated.adoption.dailyCloudAgentAdoptionData).toBe(
      engagementAdoptionAggregation.dailyCloudAgentAdoptionData
    );
    expect(aggregated.adoption.dailyCodeReviewAdoptionData).toBe(
      engagementAdoptionAggregation.dailyCodeReviewAdoptionData
    );
    expect(aggregated.impact.agentImpactData).toBe(
      impactAggregation.agentImpactData
    );
    expect(aggregated.impact.codeCompletionImpactData).toBe(
      impactAggregation.codeCompletionImpactData
    );
    expect(aggregated.impact.editModeImpactData).toBe(
      impactAggregation.editModeImpactData
    );
    expect(aggregated.impact.inlineModeImpactData).toBe(
      impactAggregation.inlineModeImpactData
    );
    expect(aggregated.impact.askModeImpactData).toBe(
      impactAggregation.askModeImpactData
    );
    expect(aggregated.impact.cliImpactData).toBe(
      impactAggregation.cliImpactData
    );
    expect(aggregated.impact.joinedImpactData).toBe(
      impactAggregation.joinedImpactData
    );
    expect(aggregated.languages.languageStats).toBe(
      languageAggregation.languageStats
    );
    expect(aggregated.languages.languageFeatureImpactData).toBe(
      languageAggregation.languageFeatureImpactData
    );
    expect(aggregated.languages.dailyLanguageGenerationsData).toBe(
      languageAggregation.dailyLanguageGenerationsData
    );
    expect(aggregated.languages.dailyLanguageLocData).toBe(
      languageAggregation.dailyLanguageLocData
    );
    expect(aggregated.clients.ideStats).toBe(clientAggregation.ideStats);
    expect(aggregated.clients.multiIDEUsersCount).toBe(
      clientAggregation.multiIDEUsersCount
    );
    expect(aggregated.clients.totalUniqueIDEUsers).toBe(
      clientAggregation.totalUniqueIDEUsers
    );
    expect(aggregated.clients.pluginVersionData).toBe(
      clientAggregation.pluginVersionData
    );
    expect(aggregated.models.modelUsageData).toBe(
      modelAggregation.modelUsageData
    );
    expect(aggregated.models.modelBreakdownData).toBe(
      modelAggregation.modelBreakdownData
    );
    expect(aggregated.cli.dailyCliSessionData).toBe(
      cliAggregation.dailyCliSessionData
    );
    expect(aggregated.cli.dailyCliTokenData).toBe(
      cliAggregation.dailyCliTokenData
    );
    expect(aggregated.cli.dailyCliAdoptionTrend).toBe(
      cliAggregation.dailyCliAdoptionTrend
    );
    expect(aggregated.ai.aiAdoptionPhaseData).toBe(
      aiAggregation.aiAdoptionPhaseData
    );
    expect(aggregated.ai.usageDistributionData).toBe(
      aiAggregation.usageDistributionData
    );
    expect(aggregated.ai.dailyAiCreditsData).toBe(
      aiAggregation.dailyAiCreditsData
    );
  });

  it('owns every aggregate field once and uses a single raw-record pass', () => {
    const source = [
      makeMetric({
        user_id: 1,
        used_agent: true,
        used_chat: true,
        used_copilot_cloud_agent: true,
        used_copilot_code_review_active: true,
        ai_credits_used: 2.5,
        totals_by_ide: [ideTotal('vscode', 2)],
        totals_by_feature: [{
          feature: 'chat_panel_agent_mode',
          user_initiated_interaction_count: 3,
          code_generation_activity_count: 1,
          code_acceptance_activity_count: 1,
          loc_added_sum: 5,
          loc_deleted_sum: 1,
          loc_suggested_to_add_sum: 7,
          loc_suggested_to_delete_sum: 2,
        }],
        totals_by_language_feature: [{
          language: 'typescript',
          feature: 'code_completion',
          code_generation_activity_count: 4,
          code_acceptance_activity_count: 2,
          loc_added_sum: 6,
          loc_deleted_sum: 1,
          loc_suggested_to_add_sum: 8,
          loc_suggested_to_delete_sum: 2,
        }],
        totals_by_model_feature: [{
          model: 'gpt-5',
          feature: 'chat_panel_agent_mode',
          user_initiated_interaction_count: 3,
          code_generation_activity_count: 1,
          code_acceptance_activity_count: 1,
          loc_added_sum: 5,
          loc_deleted_sum: 1,
          loc_suggested_to_add_sum: 7,
          loc_suggested_to_delete_sum: 2,
        }],
        ai_adoption_phase: {
          phase_number: 2,
          phase: 'Accelerating',
          version: 'v2',
        },
      }),
      makeMetric({
        user_id: 2,
        used_cli: true,
        totals_by_cli: {
          session_count: 2,
          request_count: 3,
          prompt_count: 1,
          token_usage: {
            output_tokens_sum: 11,
            prompt_tokens_sum: 7,
            avg_tokens_per_request: 6,
          },
        },
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
    const groupedBytes = new TextEncoder().encode(
      JSON.stringify(aggregated)
    ).byteLength;

    expect(Object.keys(aggregated)).toEqual(aggregateSliceKeys);
    expect(Object.keys(aggregated.overview)).toEqual(
      AGGREGATED_METRICS_SLICE_KEYS.overview
    );
    expect(Object.keys(aggregated.users)).toEqual(
      AGGREGATED_METRICS_SLICE_KEYS.users
    );
    expect(Object.keys(aggregated.adoption)).toEqual(
      AGGREGATED_METRICS_SLICE_KEYS.adoption
    );
    expect(Object.keys(aggregated.impact)).toEqual(
      AGGREGATED_METRICS_SLICE_KEYS.impact
    );
    expect(Object.keys(aggregated.languages)).toEqual(
      AGGREGATED_METRICS_SLICE_KEYS.languages
    );
    expect(Object.keys(aggregated.clients)).toEqual(
      AGGREGATED_METRICS_SLICE_KEYS.clients
    );
    expect(Object.keys(aggregated.models)).toEqual(
      AGGREGATED_METRICS_SLICE_KEYS.models
    );
    expect(Object.keys(aggregated.cli)).toEqual(
      AGGREGATED_METRICS_SLICE_KEYS.cli
    );
    expect(Object.keys(aggregated.ai)).toEqual(
      AGGREGATED_METRICS_SLICE_KEYS.ai
    );
    expect(new Set(AGGREGATED_METRICS_FIELD_KEYS).size).toBe(
      AGGREGATED_METRICS_FIELD_KEYS.length
    );
    for (const key of AGGREGATED_METRICS_FIELD_KEYS) {
      expect(aggregated).not.toHaveProperty(key);
    }
    expect(aggregated).not.toHaveProperty('metrics');
    expect(groupedBytes).toBeGreaterThan(0);
    expect(iteratorRequests).toBe(1);
    expect(source).toEqual(original);
  });
});
