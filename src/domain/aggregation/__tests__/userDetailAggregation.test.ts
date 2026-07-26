import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { computeSingleUserDetailedMetrics } from '../../calculators/userDetailCalculator';
import {
  accumulateUserDetailAggregation,
  createUserDetailAggregationAccumulator,
  finalizeUserDetailAggregation,
} from '../userDetailAggregation';

describe('user detail aggregation lifecycle', () => {
  it('returns the original empty calculator accumulator', () => {
    const lifecycle = createUserDetailAggregationAccumulator();
    const result = finalizeUserDetailAggregation(lifecycle);

    expect(result).toBe(lifecycle.detail);
    expect(result.users.size).toBe(0);
    expect(result.reportStartDay).toBe('');
    expect(result.reportEndDay).toBe('');
  });

  it('owns first-record metadata and passes the resolved cloud-agent signal', () => {
    const lifecycle = createUserDetailAggregationAccumulator();
    accumulateUserDetailAggregation(
      lifecycle,
      makeMetric({
        user_id: 7,
        day: '2024-02-10',
        report_start_day: '2024-02-01',
        report_end_day: '2024-02-29',
        used_copilot_coding_agent: false,
      }),
      true
    );
    accumulateUserDetailAggregation(
      lifecycle,
      makeMetric({
        user_id: 7,
        day: '2024-03-10',
        report_start_day: '2024-03-01',
        report_end_day: '2024-03-31',
      }),
      false
    );

    const result = finalizeUserDetailAggregation(lifecycle);
    const details = computeSingleUserDetailedMetrics(result, 7);

    expect(result).toBe(lifecycle.detail);
    expect(details?.reportStartDay).toBe('2024-02-01');
    expect(details?.reportEndDay).toBe('2024-02-29');
    expect(details?.days.map(day => day.used_copilot_coding_agent)).toEqual([
      true,
      false,
    ]);
  });
});
