import { describe, expect, it } from 'vitest';
import {
  AGGREGATED_METRICS_FIELD_KEYS,
  AGGREGATED_METRICS_SLICE_KEYS,
} from '../../__tests__/factories/aggregatedMetrics';
import { makeMetric } from '../../__tests__/factories/metrics';
import {
  makeCliTotals,
  makeFeatureTotal,
  makeIdeTotal,
  makeLanguageFeatureTotal,
  makeModelFeatureTotal,
} from '../../__tests__/factories/metricTotals';
import type { AggregatedMetrics } from '../../types/aggregatedMetrics';
import {
  aggregateMetrics,
  assembleAggregatedMetrics,
} from '../metricsAggregator';

const feature = (
  name: string,
  interactions: number,
  generations: number,
  locAdded: number,
  locDeleted: number
) => makeFeatureTotal(name, interactions, {
  code_generation_activity_count: generations,
  loc_added_sum: locAdded,
  loc_deleted_sum: locDeleted,
});

const emptyAggregateContract: Array<{
  slice: keyof AggregatedMetrics;
  expected: object;
}> = [
  {
    slice: 'overview',
    expected: {
      stats: {
        uniqueUsers: 0,
        totalRecords: 0,
        reportStartDay: '',
        reportEndDay: '',
        enterpriseId: null,
        topIde: { name: 'N/A', entries: 0 },
        topLanguage: { name: 'N/A', engagements: 0 },
        topModel: { name: 'N/A', engagements: 0 },
      },
      engagementData: [],
      chatUsersData: [],
      chatRequestsData: [],
    },
  },
  { slice: 'users', expected: { userSummaries: [] } },
  {
    slice: 'adoption',
    expected: {
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
        vscodeAgentUsers: 0,
        codingAgentUsers: 0,
        codeReviewUsers: 0,
        advancedUsers: 0,
      },
      dailyAdoptionTrend: [],
      dailyCloudAgentAdoptionData: [],
      dailyCodeReviewAdoptionData: [],
      vscodeAgentUsage: {
        summary: {
          activeUsers: null,
          sessionCount: null,
          userMessages: null,
          recordCount: 0,
          usageReportedRecords: 0,
          sessionsReportedRecords: 0,
          messagesReportedRecords: 0,
        },
        daily: [],
      },
    },
  },
  {
    slice: 'impact',
    expected: {
      agentImpactData: [],
      codeCompletionImpactData: [],
      editModeImpactData: [],
      inlineModeImpactData: [],
      askModeImpactData: [],
      copilotAppImpactData: [],
      cliImpactData: [],
      joinedImpactData: [],
    },
  },
  {
    slice: 'languages',
    expected: {
      languageStats: [],
      languageFeatureImpactData: { rows: [], features: [] },
      dailyLanguageGenerationsData: { dates: [], languages: [], data: {}, totals: {} },
      dailyLanguageLocData: { dates: [], languages: [], data: {}, totals: {} },
    },
  },
  {
    slice: 'clients',
    expected: {
      telemetryWarnings: [],
      ideStats: [],
      multiIDEUsersCount: 0,
      totalUniqueIDEUsers: 0,
      pluginVersionData: {
        jetbrains: [],
        vscode: [],
        totalUniqueIntellijUsers: 0,
        totalUniqueVsCodeUsers: 0,
      },
      dailyIdeUsersData: [],
    },
  },
  {
    slice: 'models',
    expected: {
      modelUsageData: [],
      modelBreakdownData: {
        allModels: [],
        modelCategories: [],
        modelVendors: [],
        autoModels: [],
        cliModels: [],
        autoModeAdoptionTrend: [],
        dates: [],
        modelTotal: 0,
        cliTotal: 0,
        unknownTotal: 0,
      },
    },
  },
  {
    slice: 'cli',
    expected: {
      dailyCliSessionData: [],
      dailyCliTokenData: [],
      dailyCliAdoptionTrend: [],
    },
  },
  {
    slice: 'ai',
    expected: {
      aiAdoptionPhaseData: [],
      dailyAiCreditsData: [],
      usageDistributionData: ['power', 'heavy', 'typical', 'light'].map(id => ({
        id,
        userCount: 0,
        avgAiCreditsUsed: 0,
      })),
    },
  },
  {
    slice: 'productivity',
    expected: {
      totalActiveUsers: 0,
      surfaceSummaries: ['ide', 'cli', 'copilotApp'].map(surface => ({
        surface,
        uniqueUsers: 0,
      })),
      dailyProductivity: [],
      cohortSummaries: ['ideOnly', 'cliOnly', 'copilotAppOnly', 'multiSurface'].map(cohort => ({
        cohort,
        users: 0,
      })),
    },
  },
];

describe('metrics aggregation contract', () => {
  describe('empty input', () => {
    it.each(emptyAggregateContract)('finalizes the $slice slice to its defaults', ({ slice, expected }) => {
      expect(aggregateMetrics([]).aggregated[slice]).toMatchObject(expected);
    });

    it('returns an empty user-detail accumulator', () => {
      const { userDetailAccumulator } = aggregateMetrics([]);

      expect(userDetailAccumulator.users.size).toBe(0);
      expect(userDetailAccumulator.reportStartDay).toBe('');
      expect(userDetailAccumulator.reportEndDay).toBe('');
    });
  });

  it('takes report metadata from the first record for stats and user details', () => {
    const populated = aggregateMetrics([
      makeMetric({ report_start_day: '2024-02-01', report_end_day: '2024-02-29' }),
      makeMetric({ report_start_day: '2024-03-01', report_end_day: '2024-03-31' }),
    ]);

    expect(populated.aggregated.overview.stats.reportStartDay).toBe('2024-02-01');
    expect(populated.aggregated.overview.stats.reportEndDay).toBe('2024-02-29');
    expect(populated.userDetailAccumulator.reportStartDay).toBe('2024-02-01');
    expect(populated.userDetailAccumulator.reportEndDay).toBe('2024-02-29');
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
      vscodeAgentUsage: defaults.adoption.vscodeAgentUsage,
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
      copilotAppImpactData: [...defaults.impact.copilotAppImpactData],
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
      telemetryWarnings: defaults.clients.telemetryWarnings,
      ideStats: [...defaults.clients.ideStats],
      multiIDEUsersCount: 12,
      totalUniqueIDEUsers: 13,
      pluginVersionData: { ...defaults.clients.pluginVersionData },
      dailyIdeUsersData: [...defaults.clients.dailyIdeUsersData],
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
    const surfaceProductivityAggregation = {
      ...defaults.productivity,
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
      surfaceProductivityAggregation,
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
    expect(aggregated.impact.copilotAppImpactData).toBe(
      impactAggregation.copilotAppImpactData
    );
    expect(aggregated.impact.cliImpactData).toBe(
      impactAggregation.cliImpactData
    );
    expect(aggregated.impact.joinedImpactData).toBe(
      impactAggregation.joinedImpactData
    );
    expect(aggregated.productivity).toBe(surfaceProductivityAggregation);
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

  it('exposes exactly the grouped slice fields without mutating its input', () => {
    const metrics = [
      makeMetric({
        user_id: 1,
        used_agent: true,
        used_chat: true,
        used_copilot_cloud_agent: true,
        used_copilot_code_review_active: true,
        ai_credits_used: 2.5,
        totals_by_ide: [makeIdeTotal('vscode', 2)],
        totals_by_feature: [makeFeatureTotal('chat_panel_agent_mode', 3, { loc_added_sum: 5 })],
        totals_by_language_feature: [
          makeLanguageFeatureTotal('typescript', 'code_completion', { code_generation_activity_count: 4 }),
        ],
        totals_by_model_feature: [makeModelFeatureTotal('gpt-5', 'chat_panel_agent_mode', 3)],
        ai_adoption_phase: { phase_number: 2, phase: 'Accelerating', version: 'v2' },
      }),
      makeMetric({
        user_id: 2,
        used_cli: true,
        totals_by_cli: makeCliTotals({ session_count: 2, request_count: 3, prompt_count: 1 }),
      }),
    ];
    const original = structuredClone(metrics);

    const { aggregated } = aggregateMetrics(metrics);

    expect(Object.keys(aggregated)).toEqual(Object.keys(AGGREGATED_METRICS_SLICE_KEYS));
    for (const [slice, fields] of Object.entries(AGGREGATED_METRICS_SLICE_KEYS)) {
      expect(Object.keys(aggregated[slice as keyof AggregatedMetrics])).toEqual(fields);
    }
    expect(new Set(AGGREGATED_METRICS_FIELD_KEYS).size).toBe(AGGREGATED_METRICS_FIELD_KEYS.length);
    for (const key of AGGREGATED_METRICS_FIELD_KEYS) {
      expect(aggregated).not.toHaveProperty(key);
    }
    expect(aggregated).not.toHaveProperty('metrics');
    expect(metrics).toEqual(original);
  });

  it('produces consistent cross-family outputs for a representative upload', () => {
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
        totals_by_cli: makeCliTotals({ session_count: 2, request_count: 4, prompt_count: 3 }),
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

    const { aggregated } = aggregateMetrics(metrics);
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
      vscodeAgentUsers: 0,
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
