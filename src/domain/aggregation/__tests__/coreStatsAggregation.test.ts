import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import type { CopilotMetrics, MetricsStats } from '../../../types/metrics';
import {
  accumulateCoreStatsAggregation,
  createCoreStatsAggregationAccumulator,
  finalizeCoreStatsAggregation,
  getStatsAccumulatorForDimensions,
} from '../coreStatsAggregation';
import {
  accumulateIdeUser,
  accumulateLanguageEngagement,
  accumulateModelEngagement,
} from '../../calculators/statsCalculator';

function statsFor(
  records: Array<{ metric: Partial<CopilotMetrics>; usedCloudAgent?: boolean }>
): MetricsStats {
  const accumulator = createCoreStatsAggregationAccumulator();
  for (const { metric, usedCloudAgent = false } of records) {
    accumulateCoreStatsAggregation(accumulator, makeMetric(metric), usedCloudAgent);
  }
  return finalizeCoreStatsAggregation(accumulator).stats;
}

describe('core stats aggregation', () => {
  it('owns first-record metadata, enterprise id, and shared dimension stats', () => {
    const accumulator = createCoreStatsAggregationAccumulator();
    const sharedStats = getStatsAccumulatorForDimensions(accumulator);

    accumulateCoreStatsAggregation(accumulator, makeMetric({
      user_id: 1,
      enterprise_id: ' ',
      report_start_day: '2024-02-01',
      report_end_day: '2024-02-29',
    }), false);
    accumulateCoreStatsAggregation(accumulator, makeMetric({
      user_id: 2,
      enterprise_id: ' 48213 ',
      report_start_day: '2024-03-01',
      report_end_day: '2024-03-31',
    }), false);
    accumulateLanguageEngagement(sharedStats, 'typescript', 8);
    accumulateModelEngagement(sharedStats, 'gpt-4o', 5);
    accumulateIdeUser(sharedStats, 'vscode', 1);
    accumulateIdeUser(sharedStats, 'vscode', 2);

    expect(finalizeCoreStatsAggregation(accumulator).stats).toMatchObject({
      reportStartDay: '2024-02-01',
      reportEndDay: '2024-02-29',
      enterpriseId: '48213',
      topLanguage: { name: 'typescript', engagements: 8 },
      topModel: { name: 'gpt-4o', engagements: 5 },
      topIde: { name: 'vscode', entries: 2 },
    });
  });

  it('counts every record but deduplicates users across days', () => {
    const stats = statsFor([
      { metric: { user_id: 1, day: '2024-01-15' } },
      { metric: { user_id: 1, day: '2024-01-16' } },
      { metric: { user_id: 2, day: '2024-01-15' } },
    ]);

    expect(stats.totalRecords).toBe(3);
    expect(stats.uniqueUsers).toBe(2);
  });

  it.each<{ signal: string; metric: Partial<CopilotMetrics>; usedCloudAgent?: boolean; expected: Partial<MetricsStats> }>([
    { signal: 'chat', metric: { used_chat: true }, expected: { chatUsers: 1, completionOnlyUsers: 0 } },
    { signal: 'agent', metric: { used_agent: true }, expected: { agentUsers: 1, completionOnlyUsers: 0 } },
    { signal: 'CLI', metric: { used_cli: true }, expected: { cliUsers: 1, completionOnlyUsers: 0 } },
    { signal: 'Copilot App', metric: { used_copilot_app: true }, expected: { completionOnlyUsers: 0 } },
    { signal: 'cloud agent', metric: {}, usedCloudAgent: true, expected: { codingAgentUsers: 1, completionOnlyUsers: 0 } },
    {
      signal: 'none',
      metric: {},
      expected: { chatUsers: 0, agentUsers: 0, cliUsers: 0, codingAgentUsers: 0, completionOnlyUsers: 1 },
    },
  ])('classifies a user with the $signal signal', ({ metric, usedCloudAgent, expected }) => {
    expect(statsFor([{ metric, usedCloudAgent }])).toMatchObject({ uniqueUsers: 1, ...expected });
  });

  it('OR-merges usage signals across a user\'s days', () => {
    const stats = statsFor([
      { metric: { user_id: 1, day: '2024-01-15', used_chat: true } },
      { metric: { user_id: 1, day: '2024-01-16', used_agent: true }, usedCloudAgent: true },
    ]);

    expect(stats).toMatchObject({
      uniqueUsers: 1,
      chatUsers: 1,
      agentUsers: 1,
      codingAgentUsers: 1,
      completionOnlyUsers: 0,
    });
  });
});
