import { describe, it, expect } from 'vitest';
import {
  createCliUsageAccumulator,
  accumulateCliUsage,
  computeCliAdoptionTrend,
} from '../cliUsageCalculator';
import { makeMetric } from '../../../__tests__/factories/metrics';

function makeCliMetric(userId: number, day: string) {
  return makeMetric({
    user_id: userId,
    day,
    used_cli: true,
    totals_by_cli: {
      session_count: 1,
      request_count: 2,
      prompt_count: 1,
      token_usage: {
        output_tokens_sum: 100,
        prompt_tokens_sum: 50,
        avg_tokens_per_request: 75,
      },
    },
  });
}

describe('computeCliAdoptionTrend', () => {
  it('returns an empty trend when no CLI activity was accumulated', () => {
    expect(computeCliAdoptionTrend(createCliUsageAccumulator())).toEqual([]);
  });

  it('converts accumulated CLI sessions into a date-sorted adoption trend, omitting inactive dates', () => {
    const acc = createCliUsageAccumulator();
    accumulateCliUsage(acc, '2024-01-17', 1, makeCliMetric(1, '2024-01-17'));
    accumulateCliUsage(acc, '2024-01-17', 2, makeCliMetric(2, '2024-01-17'));
    accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric(1, '2024-01-15'));
    accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric(1, '2024-01-15'));

    expect(computeCliAdoptionTrend(acc)).toEqual([
      { date: '2024-01-15', newUsers: 1, returningUsers: 0, totalActiveUsers: 1, cumulativeUsers: 1 },
      { date: '2024-01-17', newUsers: 1, returningUsers: 1, totalActiveUsers: 2, cumulativeUsers: 2 },
    ]);
  });
});
