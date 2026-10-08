import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import {
  makeCliTotals,
  makeFeatureTotal,
} from '../../../__tests__/factories/metricTotals';
import type { CopilotMetrics } from '../../../types/metrics';
import type { FeatureAdoptionData } from '../../calculators/featureAdoptionCalculator';
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

type EngagementRecord = { metric: Partial<CopilotMetrics>; usedCloudAgent?: boolean };

function aggregateEngagement(records: EngagementRecord[]) {
  const accumulator = createEngagementAdoptionAggregationAccumulator();
  const cliAccumulator = createCliAggregationAccumulator();
  for (const { metric, usedCloudAgent = false } of records) {
    const record = makeMetric(metric);
    accumulateCliAggregation(cliAccumulator, record);
    accumulateEngagementAdoptionAggregation(accumulator, record, usedCloudAgent);
  }
  return finalizeEngagementAdoptionAggregation(
    accumulator,
    getCliUsageForDownstreamCalculations(cliAccumulator)
  );
}

const completionOnlyFeatures = [
  makeFeatureTotal('code_completion', 0, { code_generation_activity_count: 5 }),
];

describe('engagement and adoption aggregation', () => {
  it('coordinates feature signals and consumes CLI daily sessions without accumulating CLI twice', () => {
    const result = aggregateEngagement([
      {
        metric: {
          day: '2024-01-16',
          user_id: 1,
          used_cli: true,
          used_vscode_agent: true,
          used_copilot_code_review_active: true,
          used_copilot_code_review_passive: true,
          totals_by_cli: makeCliTotals({ session_count: 2, request_count: 4, prompt_count: 3 }),
          totals_by_feature: [makeFeatureTotal('chat_panel_agent_mode', 5)],
        },
        usedCloudAgent: true,
      },
      {
        metric: {
          day: '2024-01-15',
          user_id: 2,
          totals_by_feature: [makeFeatureTotal('code_completion', 0, { code_generation_activity_count: 1 })],
        },
      },
    ]);

    expect(result.engagementData.map(day => day.date)).toEqual(['2024-01-15', '2024-01-16']);
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
      vscodeAgentUsers: 1,
      advancedUsers: 1,
    });
  });

  it('counts unique active users per day', () => {
    const result = aggregateEngagement([
      { metric: { user_id: 1, day: '2024-01-15' } },
      { metric: { user_id: 2, day: '2024-01-15' } },
      { metric: { user_id: 1, day: '2024-01-15' } },
      { metric: { user_id: 1, day: '2024-01-16' } },
    ]);

    expect(result.engagementData.map(({ date, activeUsers }) => ({ date, activeUsers }))).toEqual([
      { date: '2024-01-15', activeUsers: 2 },
      { date: '2024-01-16', activeUsers: 1 },
    ]);
  });

  it.each<{ name: string; record: EngagementRecord; expected: Partial<FeatureAdoptionData> }>([
    {
      name: 'used_cli without feature rows',
      record: { metric: { used_cli: true } },
      expected: { totalUsers: 1, cliUsers: 1, advancedUsers: 1 },
    },
    {
      name: 'the cloud-agent signal alone',
      record: { metric: {}, usedCloudAgent: true },
      expected: { totalUsers: 1, codingAgentUsers: 1, advancedUsers: 1 },
    },
    {
      name: 'active code review',
      record: { metric: { used_copilot_code_review_active: true } },
      expected: { totalUsers: 1, codeReviewUsers: 1 },
    },
    {
      name: 'passive code review',
      record: { metric: { used_copilot_code_review_passive: true } },
      expected: { totalUsers: 1, codeReviewUsers: 1 },
    },
    {
      name: 'completion plus used_cli',
      record: { metric: { used_cli: true, totals_by_feature: completionOnlyFeatures } },
      expected: { cliUsers: 1, completionOnlyUsers: 0 },
    },
    {
      name: 'completion plus the cloud-agent signal',
      record: { metric: { totals_by_feature: completionOnlyFeatures }, usedCloudAgent: true },
      expected: { codingAgentUsers: 1, completionOnlyUsers: 0 },
    },
  ])('adopts a user from $name', ({ record, expected }) => {
    expect(aggregateEngagement([record]).featureAdoptionData).toMatchObject(expected);
  });

  it('deduplicates daily cloud-agent and code-review adopters', () => {
    const result = aggregateEngagement([
      {
        metric: { user_id: 1, day: '2024-01-15', used_copilot_code_review_active: true },
        usedCloudAgent: true,
      },
      {
        metric: { user_id: 2, day: '2024-01-15', used_copilot_code_review_passive: true },
        usedCloudAgent: true,
      },
      {
        metric: { user_id: 1, day: '2024-01-15', used_copilot_code_review_active: true },
        usedCloudAgent: true,
      },
      {
        metric: {
          user_id: 3,
          day: '2024-01-16',
          used_copilot_code_review_active: true,
          used_copilot_code_review_passive: true,
        },
      },
    ]);

    expect(result.dailyCloudAgentAdoptionData).toEqual([
      { date: '2024-01-15', uniqueUsers: 2 },
    ]);
    expect(result.dailyCodeReviewAdoptionData).toEqual([
      { date: '2024-01-15', activeUsers: 1, passiveUsers: 1, totalUsers: 2 },
      { date: '2024-01-16', activeUsers: 1, passiveUsers: 1, totalUsers: 1 },
    ]);
  });

  it('computes the daily adoption trend with new and returning users across surfaces', () => {
    const result = aggregateEngagement([
      { metric: { user_id: 1, day: '2024-01-15' } },
      { metric: { user_id: 2, day: '2024-01-15' } },
      { metric: { user_id: 1, day: '2024-01-16' } },
      {
        metric: {
          user_id: 3,
          day: '2024-01-16',
          used_cli: true,
          totals_by_cli: makeCliTotals({ session_count: 1, request_count: 2, prompt_count: 1 }),
        },
      },
    ]);

    expect(result.dailyAdoptionTrend).toEqual([
      { date: '2024-01-15', newUsers: 2, returningUsers: 0, totalActiveUsers: 2, cumulativeUsers: 2 },
      { date: '2024-01-16', newUsers: 1, returningUsers: 1, totalActiveUsers: 2, cumulativeUsers: 3 },
    ]);
  });
});
