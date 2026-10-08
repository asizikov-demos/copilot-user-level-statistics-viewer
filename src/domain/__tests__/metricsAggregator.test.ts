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
