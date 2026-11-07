import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../__tests__/factories/metrics';
import {
  makeFeatureTotal,
  makeIdeTotal,
  makeModelFeatureTotal,
} from '../../__tests__/factories/metricTotals';
import { splitNdjsonLines } from '../../utils/ndjsonParser';
import { computeSingleUserDetailedMetrics } from '../calculators/userDetailCalculator';
import { aggregateMetrics } from '../metricsAggregator';
import { parseMetricsLines } from '../metricsParser';

const vscodeAt = (version: string) => makeIdeTotal('vscode', 0, {
  last_known_ide_version: { ide_version: version, sampled_at: '2026-10-07T00:00:00Z' },
});

describe('metricsAggregator cross-family consistency', () => {
  it('deduplicates reporting issues within each period, day, component and affected-user measure', () => {
    const row = (userId: number, day: string, overrides = {}) => makeMetric({
      user_id: userId,
      user_login: `user-${userId}`,
      report_start_day: '2026-11-01',
      report_end_day: '2026-11-04',
      day,
      ...overrides,
    });
    const issue = {
      client_telemetry_present: false,
      usage_metrics_requirements: {
        met: ['vscode'],
        unmet: ['vscode/copilot-chat', 'vscode/copilot-chat', '1.138.0:'],
        unknown: ['goland/copilot-intellij'],
      },
    };
    const records = [
      row(1, '2026-11-02', issue),
      row(1, '2026-11-02', issue),
      row(1, '2026-11-03', {
        client_telemetry_present: true,
        usage_metrics_requirements: { met: [], unmet: [], unknown: ['vscode/copilot-chat'] },
      }),
      row(2, '2026-11-02', { client_telemetry_present: false }),
      row(2, '2026-11-03', {
        client_telemetry_present: null,
        usage_metrics_requirements: { met: [], unmet: ['vscode/copilot-chat'], unknown: [] },
      }),
      row(1, '2026-11-04', { client_telemetry_present: false, usage_metrics_requirements: null }),
    ];
    const original = structuredClone(records);
    const quality = aggregateMetrics(records).aggregated.clients.reportingQuality;

    expect(quality.summary).toEqual({
      recordCount: 6, telemetryReportedRecords: 5, requirementsReportedRecords: 4,
      missingTelemetryUsers: 2, belowMinimumUsers: 2,
    });
    expect(quality.daily.map(day => [day.day, day.missingTelemetryUsers, day.belowMinimumUsers])).toEqual([
      ['2026-11-01', null, null],
      ['2026-11-02', 2, 1],
      ['2026-11-03', 0, 1],
      ['2026-11-04', 1, null],
    ]);
    expect(quality.components).toEqual([
      { component: 'vscode/copilot-chat', unmetUsers: 2, unknownUsers: 1 },
      { component: '1.138.0:', unmetUsers: 1, unknownUsers: 0 },
      { component: 'goland/copilot-intellij', unmetUsers: 0, unknownUsers: 1 },
      { component: 'vscode', unmetUsers: 0, unknownUsers: 0 },
    ]);
    expect(quality.affectedUsers).toEqual([
      {
        userId: 1, userLogin: 'user-1', missingTelemetryDays: 2, belowMinimumDays: 1,
        affectedComponents: ['1.138.0:', 'vscode/copilot-chat'],
        lastMissingTelemetryDay: '2026-11-04', lastBelowMinimumDay: '2026-11-02', lastIssueDay: '2026-11-04',
      },
      {
        userId: 2, userLogin: 'user-2', missingTelemetryDays: 1, belowMinimumDays: 1,
        affectedComponents: ['vscode/copilot-chat'],
        lastMissingTelemetryDay: '2026-11-02', lastBelowMinimumDay: '2026-11-03', lastIssueDay: '2026-11-03',
      },
    ]);
    expect(records).toEqual(original);
  });

  it('keeps unavailable signals separate from reported zero issues and unverifiable components', () => {
    const quality = aggregateMetrics([
      makeMetric({
        day: '2026-11-02', report_start_day: '2026-11-01', report_end_day: '2026-11-03',
        client_telemetry_present: true,
        usage_metrics_requirements: { met: [], unmet: [], unknown: [' Future/Component: '] },
      }),
      makeMetric({
        day: '2026-11-02', report_start_day: '2026-11-01', report_end_day: '2026-11-03',
        client_telemetry_present: null, usage_metrics_requirements: null,
      }),
    ]).aggregated.clients.reportingQuality;
    expect(quality.summary).toEqual({
      recordCount: 2, telemetryReportedRecords: 1, requirementsReportedRecords: 1,
      missingTelemetryUsers: 0, belowMinimumUsers: 0,
    });
    expect(quality.components).toEqual([{ component: ' Future/Component: ', unmetUsers: 0, unknownUsers: 1 }]);
    expect(quality.affectedUsers).toEqual([]);
    expect(quality.daily[0]).toMatchObject({ recordCount: 0, missingTelemetryUsers: null, belowMinimumUsers: null });
  });

  it('supports legacy exports without treating October version inference as a reported issue', () => {
    const quality = aggregateMetrics([makeMetric({
      totals_by_ide: [vscodeAt('1.138.0')],
    })]).aggregated.clients.reportingQuality;
    expect(quality.summary).toMatchObject({
      telemetryReportedRecords: 0, requirementsReportedRecords: 0,
      missingTelemetryUsers: null, belowMinimumUsers: null,
    });
    expect(quality.components).toEqual([]);
    expect(quality.affectedUsers).toEqual([]);
  });

  it('spans all uploaded report windows and observed dates, independently of first-file metadata', () => {
    const quality = aggregateMetrics([
      makeMetric({
        day: '2026-11-04', report_start_day: '2026-11-03', report_end_day: '2026-11-05',
        client_telemetry_present: false,
      }),
      makeMetric({
        day: '2026-11-02', report_start_day: '2026-11-01', report_end_day: '2026-11-02',
        usage_metrics_requirements: { met: [], unmet: [], unknown: [] },
      }),
    ]).aggregated.clients.reportingQuality;
    expect(quality.reportStartDay).toBe('2026-11-01');
    expect(quality.reportEndDay).toBe('2026-11-05');
    expect(quality.daily.map(day => day.day)).toEqual([
      '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05',
    ]);
    expect(quality.daily[1]).toMatchObject({ missingTelemetryUsers: null, belowMinimumUsers: 0 });
    expect(quality.daily[3]).toMatchObject({ missingTelemetryUsers: 1, belowMinimumUsers: null });
  });

  it('unions TablePro aliases across users and days without changing uploaded records', () => {
    const metrics = [
      makeMetric({
        user_id: 1,
        day: '2024-01-15',
        used_cli: true,
        totals_by_ide: [
          makeIdeTotal('tablepro:tablepro-copilot', 3),
          makeIdeTotal('tablepro', 2),
        ],
      }),
      makeMetric({
        user_id: 1,
        day: '2024-01-16',
        totals_by_ide: [makeIdeTotal(' TABLEPRO:TABLEPRO-COPILOT ', 4)],
      }),
      makeMetric({
        user_id: 2,
        day: '2024-01-15',
        totals_by_ide: [makeIdeTotal('tablepro', 5)],
      }),
    ];
    const originalMetrics = structuredClone(metrics);
    const { aggregated, userDetailAccumulator } = aggregateMetrics(metrics);

    expect(aggregated.clients.ideStats).toEqual([
      expect.objectContaining({
        ide: 'tablepro',
        uniqueUsers: 2,
        cliOverlapUsers: 1,
        totalEngagements: 14,
      }),
    ]);
    expect(aggregated.clients.multiIDEUsersCount).toBe(0);
    expect(aggregated.clients.totalUniqueIDEUsers).toBe(2);
    expect(aggregated.clients.dailyIdeUsersData.find(entry => entry.ide === 'tablepro')).toEqual({
      ide: 'tablepro',
      totalUniqueUsers: 2,
      daily: [
        { date: '2024-01-15', uniqueUsers: 2 },
        { date: '2024-01-16', uniqueUsers: 1 },
      ],
    });
    expect(aggregated.clients.dailyIdeUsersData.map(entry => entry.ide).sort()).toEqual([
      'copilot_cli', 'tablepro',
    ]);
    expect(aggregated.overview.stats.topIde).toEqual({ name: 'tablepro', entries: 2 });
    expect(aggregated.users.userSummaries.find(user => user.user_id === 2)).toMatchObject({
      top_client: 'tablepro',
      clients_used: ['tablepro'],
    });
    const details = computeSingleUserDetailedMetrics(userDetailAccumulator, 1);
    expect(details?.ideAggregates).toEqual([
      expect.objectContaining({ ide: 'tablepro', user_initiated_interaction_count: 9 }),
    ]);
    expect(details?.days.flatMap(day => day.totals_by_ide.map(total => total.ide)))
      .toEqual(['tablepro', 'tablepro']);
    expect(details?.days[0].totals_by_ide).toEqual([
      expect.objectContaining({ ide: 'tablepro', user_initiated_interaction_count: 5 }),
    ]);
    expect(metrics).toEqual(originalMetrics);
  });

  it('coalesces daily TablePro activity and keeps latest versions', () => {
    const older = '2024-01-15T09:00:00Z';
    const newer = '2024-01-15T10:00:00Z';
    const plugin = { plugin: 'tablepro-copilot', plugin_version: '2.0', sampled_at: newer };
    const ideVersion = { ide_version: '1.0', sampled_at: newer };
    const metrics = [makeMetric({
      totals_by_feature: [makeFeatureTotal('code_completion', 0, { code_generation_activity_count: 9 })],
      totals_by_ide: [
        makeIdeTotal('tablepro:tablepro-copilot', 3, {
          code_generation_activity_count: 3,
          code_acceptance_activity_count: 2,
          loc_added_sum: 10,
          loc_deleted_sum: -2,
          loc_suggested_to_add_sum: 20,
          loc_suggested_to_delete_sum: 4,
          last_known_plugin_version: { ...plugin, plugin_version: '1.0', sampled_at: older },
          last_known_ide_version: ideVersion,
        }),
        makeIdeTotal('tablepro', 2, {
          code_generation_activity_count: 6,
          code_acceptance_activity_count: 4,
          loc_added_sum: 15,
          loc_deleted_sum: 3,
          loc_suggested_to_add_sum: 30,
          loc_suggested_to_delete_sum: 6,
          last_known_plugin_version: plugin,
          last_known_ide_version: { ...ideVersion, ide_version: '0.9', sampled_at: older },
        }),
      ],
    })];
    const original = structuredClone(metrics);
    const { userDetailAccumulator } = aggregateMetrics(metrics);
    const details = computeSingleUserDetailedMetrics(userDetailAccumulator, metrics[0].user_id);
    expect(details?.days[0].totals_by_ide).toEqual([{
      ide: 'tablepro',
      user_initiated_interaction_count: 5,
      assumed_user_initiated_interaction_count: 9,
      code_generation_activity_count: 9,
      code_acceptance_activity_count: 6,
      loc_added_sum: 25,
      loc_deleted_sum: 1,
      loc_suggested_to_add_sum: 50,
      loc_suggested_to_delete_sum: 10,
      last_known_plugin_version: plugin,
      last_known_ide_version: ideVersion,
    }]);
    expect(details?.pluginVersions).toHaveLength(2);
    expect(details?.pluginVersions).toEqual(expect.arrayContaining([
      { ...plugin, plugin_version: '1.0', sampled_at: older },
      plugin,
    ]));
    expect(metrics).toEqual(original);
  });

  it('allocates assumed interactions identically for split and combined TablePro generation weights', () => {
    const split = [
      makeIdeTotal('tablepro:tablepro-copilot', 0, { code_generation_activity_count: 2 }),
      makeIdeTotal('tablepro', 0, { code_generation_activity_count: 2 }),
      makeIdeTotal('vscode', 0, { code_generation_activity_count: 3 }),
    ];
    const combined = [
      makeIdeTotal('tablepro', 0, { code_generation_activity_count: 4 }),
      split[2],
    ];
    const results = [split, combined].map(totals_by_ide => {
      const metric = makeMetric({
        totals_by_ide,
        totals_by_feature: [
          makeFeatureTotal('code_completion', 0, { code_generation_activity_count: 1 }),
        ],
      });
      const { userDetailAccumulator } = aggregateMetrics([metric]);
      return computeSingleUserDetailedMetrics(userDetailAccumulator, metric.user_id)!;
    });
    for (const details of results) {
      expect(details.ideAggregates.map(row => [row.ide, row.assumed_user_initiated_interaction_count]))
        .toEqual([['tablepro', 1], ['vscode', 0]]);
      expect(details.days[0].totals_by_ide.map(row => [row.ide, row.assumed_user_initiated_interaction_count]))
        .toEqual([['tablepro', 1], ['vscode', 0]]);
    }
  });

  describe('cloud-agent signal', () => {
    it('reflects used_copilot_cloud_agent across stats, user summaries, details, and adoption', () => {
      const metrics = [
        makeMetric({ user_id: 7, day: '2024-01-16', used_copilot_cloud_agent: true }),
        makeMetric({ user_id: 7, day: '2024-01-17', used_copilot_cloud_agent: true }),
        makeMetric({ user_id: 7, day: '2024-01-18', used_copilot_cloud_agent: false }),
        makeMetric({ user_id: 8, day: '2024-01-16' }),
      ];

      const { aggregated, userDetailAccumulator } = aggregateMetrics(metrics);
      const summary = aggregated.users.userSummaries.find(user => user.user_id === 7);
      const details = computeSingleUserDetailedMetrics(userDetailAccumulator, 7);

      expect(aggregated.overview.stats.codingAgentUsers).toBe(1);
      expect(summary?.used_copilot_coding_agent).toBe(true);
      expect(summary?.cloud_agent_days).toBe(2);
      expect(details?.days.map(day => day.used_copilot_coding_agent)).toEqual([true, true, false]);
      expect(aggregated.adoption.featureAdoptionData).toMatchObject({
        codingAgentUsers: 1,
        advancedUsers: 1,
      });
      expect(aggregated.adoption.dailyCloudAgentAdoptionData).toEqual([
        { date: '2024-01-16', uniqueUsers: 1 },
        { date: '2024-01-17', uniqueUsers: 1 },
      ]);
    });

    it('excludes cloud-agent users from completion-only counts in both stats and adoption', () => {
      const { aggregated } = aggregateMetrics([
        makeMetric({
          used_copilot_cloud_agent: true,
          totals_by_feature: [
            makeFeatureTotal('code_completion', 0, { code_generation_activity_count: 5 }),
          ],
        }),
      ]);

      expect(aggregated.overview.stats.completionOnlyUsers).toBe(0);
      expect(aggregated.adoption.featureAdoptionData.completionOnlyUsers).toBe(0);
    });
  });

  describe('user summaries and user details', () => {
    it('returns a user-detail accumulator aligned with aggregate user summaries', () => {
      const { aggregated, userDetailAccumulator } = aggregateMetrics([
        makeMetric({
          user_id: 123,
          user_login: 'user-one',
          day: '2024-01-15',
          user_initiated_interaction_count: 10,
          ai_credits_used: 1.25,
          totals_by_model_feature: [makeModelFeatureTotal('gpt-4o', 'chat_panel_ask_mode', 7)],
        }),
        makeMetric({
          user_id: 456,
          user_login: 'user-two',
          user_initiated_interaction_count: 100,
          ai_credits_used: 9,
        }),
        makeMetric({
          user_id: 123,
          user_login: 'user-one',
          day: '2024-01-16',
          user_initiated_interaction_count: 5,
          ai_credits_used: 2.75,
          totals_by_model_feature: [makeModelFeatureTotal('claude-sonnet-4.6', 'agent_edit', 3)],
        }),
      ]);
      const summary = aggregated.users.userSummaries.find(user => user.user_id === 123);
      const details = computeSingleUserDetailedMetrics(userDetailAccumulator, 123);

      expect(summary?.total_user_initiated_interactions).toBe(15);
      expect(summary?.days_active).toBe(2);
      expect(details?.total_ai_credits_used).toBe(summary?.total_ai_credits_used);
      expect(details?.days.map(day => day.day)).toEqual(['2024-01-15', '2024-01-16']);
      expect(details?.totalModelRequests).toBe(10);
      expect(details?.reportStartDay).toBe(aggregated.overview.stats.reportStartDay);
      expect(details?.reportEndDay).toBe(aggregated.overview.stats.reportEndDay);
      expect(computeSingleUserDetailedMetrics(userDetailAccumulator, 999)).toBeNull();
    });
  });

  describe('model usage', () => {
    it('counts assumed code-completion interactions identically in aggregate and user-detail model usage', () => {
      const metric = makeMetric({
        totals_by_model_feature: [
          makeModelFeatureTotal('gpt-4o', 'code_completion', 0, {
            code_generation_activity_count: 44,
            code_acceptance_activity_count: 2,
          }),
        ],
      });

      const { aggregated, userDetailAccumulator } = aggregateMetrics([metric]);
      const details = computeSingleUserDetailedMetrics(userDetailAccumulator, metric.user_id);

      expect(aggregated.models.modelUsageData).toEqual([
        { date: '2024-01-15', modelInteractions: 44, unknownModels: 0 },
      ]);
      expect(details?.dailyModelUsage).toEqual(aggregated.models.modelUsageData);
      expect(details?.totalModelRequests).toBe(44);
    });
  });

  describe('Auto mode', () => {
    it('flags Auto users in summaries consistently with Auto model adoption', () => {
      const { aggregated } = aggregateMetrics([
        makeMetric({
          totals_by_model_feature: [
            makeModelFeatureTotal('auto', 'agent_edit', 0, { code_generation_activity_count: 1 }),
          ],
        }),
      ]);

      expect(aggregated.users.userSummaries[0].used_auto_mode).toBe(true);
      expect(aggregated.models.modelBreakdownData.autoModeAdoptionTrend).toHaveLength(1);
    });
  });

  describe('VS Code Agents', () => {
    it('keeps Agents-window totals out of global agent, client, and LOC rollups', () => {
      const metric = makeMetric({
        totals_by_vscode_agent: { session_count: 4, total_user_messages: 20 },
      });

      const { aggregated, userDetailAccumulator } = aggregateMetrics([metric]);
      const details = computeSingleUserDetailedMetrics(userDetailAccumulator, metric.user_id);

      expect(aggregated.adoption.vscodeAgentUsage.summary).toMatchObject({
        activeUsers: null,
        sessionCount: 4,
        userMessages: 20,
        usageReportedRecords: 0,
      });
      expect(aggregated.overview.stats.agentUsers).toBe(0);
      expect(aggregated.adoption.featureAdoptionData.agentModeUsers).toBe(0);
      expect(aggregated.clients.ideStats).toEqual([]);
      expect(aggregated.users.userSummaries[0]).toMatchObject({
        total_user_initiated_interactions: 0,
        total_loc_added: 0,
        used_agent: false,
      });
      expect(aggregated.users.userSummaries[0].used_vscode_agent).toBeUndefined();
      expect(details?.featureAggregates).toEqual([]);
      expect(details?.ideAggregates).toEqual([]);
    });
  });

  describe('client telemetry', () => {
    it('reports at-risk IDE versions from parsed NDJSON, counting each affected user once', () => {
      const ndjson = [
        makeMetric({ user_id: 1, totals_by_ide: [vscodeAt('1.138.0')] }),
        makeMetric({ user_id: 1, day: '2024-01-16', totals_by_ide: [vscodeAt('1.138.0')] }),
        makeMetric({ user_id: 1, day: '2024-01-17', totals_by_ide: [vscodeAt('1.139.0')] }),
        makeMetric({ user_id: 2, totals_by_ide: [vscodeAt('1.138.0')] }),
        makeMetric({ user_id: 3, totals_by_ide: [vscodeAt('1.139.0')] }),
      ].map(record => JSON.stringify(record)).join('\n');

      const { aggregated } = aggregateMetrics(parseMetricsLines(splitNdjsonLines(ndjson)));

      expect(aggregated.clients.telemetryWarnings).toEqual([
        expect.objectContaining({ ide: 'vscode', version: '1.138.0', userCount: 2 }),
      ]);
    });
  });
});
