import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
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

describe('core stats aggregation lifecycle', () => {
  it('finalizes empty report metadata and record counts', () => {
    const result = finalizeCoreStatsAggregation(
      createCoreStatsAggregationAccumulator()
    );

    expect(result.stats.reportStartDay).toBe('');
    expect(result.stats.reportEndDay).toBe('');
    expect(result.stats.totalRecords).toBe(0);
    expect(result.stats.uniqueUsers).toBe(0);
  });

  it('owns first-record metadata, usage signals, and shared dimension stats', () => {
    const accumulator = createCoreStatsAggregationAccumulator();
    const sharedStats = getStatsAccumulatorForDimensions(accumulator);
    const first = makeMetric({
      user_id: 1,
      report_start_day: '2024-02-01',
      report_end_day: '2024-02-29',
      used_chat: true,
    });
    const second = makeMetric({
      user_id: 2,
      report_start_day: '2024-03-01',
      report_end_day: '2024-03-31',
      used_copilot_coding_agent: false,
    });

    accumulateCoreStatsAggregation(accumulator, first, false);
    accumulateCoreStatsAggregation(accumulator, second, true);
    accumulateLanguageEngagement(sharedStats, 'typescript', 8);
    accumulateModelEngagement(sharedStats, 'gpt-4o', 5);
    accumulateIdeUser(sharedStats, 'vscode', 1);
    accumulateIdeUser(sharedStats, 'vscode', 2);

    const result = finalizeCoreStatsAggregation(accumulator);
    expect(result.stats).toMatchObject({
      reportStartDay: '2024-02-01',
      reportEndDay: '2024-02-29',
      totalRecords: 2,
      uniqueUsers: 2,
      chatUsers: 1,
      codingAgentUsers: 1,
      topLanguage: { name: 'typescript', engagements: 8 },
      topModel: { name: 'gpt-4o', engagements: 5 },
      topIde: { name: 'vscode', entries: 2 },
    });
  });
});
