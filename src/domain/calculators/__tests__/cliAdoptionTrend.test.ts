import { describe, it, expect } from 'vitest';
import {
  createCliUsageAccumulator,
  accumulateCliUsage,
  computeCliAdoptionTrend,
} from '../cliUsageCalculator';
import type { CopilotMetrics } from '../../../types/metrics';

function makeMetric(overrides: Partial<CopilotMetrics> = {}): CopilotMetrics {
  return {
    report_start_day: '2024-01-01',
    report_end_day: '2024-01-15',
    day: '2024-01-15',
    enterprise_id: 'test-enterprise',
    user_id: 1,
    user_login: 'testuser',
    user_initiated_interaction_count: 0,
    code_generation_activity_count: 0,
    code_acceptance_activity_count: 0,
    loc_added_sum: 0,
    loc_deleted_sum: 0,
    loc_suggested_to_add_sum: 0,
    loc_suggested_to_delete_sum: 0,
    totals_by_ide: [],
    totals_by_feature: [],
    totals_by_language_feature: [],
    totals_by_language_model: [],
    totals_by_model_feature: [],
    used_agent: false,
    used_chat: false,
    used_cli: false,
    ...overrides,
  };
}

function makeCliMetric(userId: number, day: string): CopilotMetrics {
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
  it('should return empty array for empty accumulator', () => {
    const acc = createCliUsageAccumulator();
    expect(computeCliAdoptionTrend(acc)).toEqual([]);
  });

  it('should classify all users as new on the first day', () => {
    const acc = createCliUsageAccumulator();
    accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric(1, '2024-01-15'));
    accumulateCliUsage(acc, '2024-01-15', 2, makeCliMetric(2, '2024-01-15'));

    const result = computeCliAdoptionTrend(acc);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: '2024-01-15',
      newUsers: 2,
      returningUsers: 0,
      totalActiveUsers: 2,
      cumulativeUsers: 2,
    });
  });

  it('should classify returning users on subsequent days', () => {
    const acc = createCliUsageAccumulator();
    accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric(1, '2024-01-15'));
    accumulateCliUsage(acc, '2024-01-16', 1, makeCliMetric(1, '2024-01-16'));
    accumulateCliUsage(acc, '2024-01-16', 2, makeCliMetric(2, '2024-01-16'));

    const result = computeCliAdoptionTrend(acc);
    expect(result).toHaveLength(2);

    expect(result[0]).toEqual({
      date: '2024-01-15',
      newUsers: 1,
      returningUsers: 0,
      totalActiveUsers: 1,
      cumulativeUsers: 1,
    });

    expect(result[1]).toEqual({
      date: '2024-01-16',
      newUsers: 1,
      returningUsers: 1,
      totalActiveUsers: 2,
      cumulativeUsers: 2,
    });
  });

  it('should track cumulative growth correctly over multiple days', () => {
    const acc = createCliUsageAccumulator();
    accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric(1, '2024-01-15'));
    accumulateCliUsage(acc, '2024-01-16', 2, makeCliMetric(2, '2024-01-16'));
    accumulateCliUsage(acc, '2024-01-17', 3, makeCliMetric(3, '2024-01-17'));

    const result = computeCliAdoptionTrend(acc);
    expect(result.map(d => d.cumulativeUsers)).toEqual([1, 2, 3]);
    expect(result.map(d => d.newUsers)).toEqual([1, 1, 1]);
    expect(result.map(d => d.returningUsers)).toEqual([0, 0, 0]);
  });

  it('should not double-count cumulative users when they return', () => {
    const acc = createCliUsageAccumulator();
    accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric(1, '2024-01-15'));
    accumulateCliUsage(acc, '2024-01-16', 1, makeCliMetric(1, '2024-01-16'));
    accumulateCliUsage(acc, '2024-01-17', 1, makeCliMetric(1, '2024-01-17'));

    const result = computeCliAdoptionTrend(acc);
    expect(result.map(d => d.cumulativeUsers)).toEqual([1, 1, 1]);
    expect(result.map(d => d.newUsers)).toEqual([1, 0, 0]);
    expect(result.map(d => d.returningUsers)).toEqual([0, 1, 1]);
  });

  it('should sort results by date', () => {
    const acc = createCliUsageAccumulator();
    accumulateCliUsage(acc, '2024-01-17', 3, makeCliMetric(3, '2024-01-17'));
    accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric(1, '2024-01-15'));
    accumulateCliUsage(acc, '2024-01-16', 2, makeCliMetric(2, '2024-01-16'));

    const result = computeCliAdoptionTrend(acc);
    expect(result.map(d => d.date)).toEqual(['2024-01-15', '2024-01-16', '2024-01-17']);
  });

  it('should handle mixed new and returning users correctly', () => {
    const acc = createCliUsageAccumulator();
    accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric(1, '2024-01-15'));
    accumulateCliUsage(acc, '2024-01-15', 2, makeCliMetric(2, '2024-01-15'));

    accumulateCliUsage(acc, '2024-01-16', 1, makeCliMetric(1, '2024-01-16'));
    accumulateCliUsage(acc, '2024-01-16', 3, makeCliMetric(3, '2024-01-16'));

    accumulateCliUsage(acc, '2024-01-17', 2, makeCliMetric(2, '2024-01-17'));
    accumulateCliUsage(acc, '2024-01-17', 3, makeCliMetric(3, '2024-01-17'));
    accumulateCliUsage(acc, '2024-01-17', 4, makeCliMetric(4, '2024-01-17'));

    const result = computeCliAdoptionTrend(acc);

    expect(result[0]).toMatchObject({ newUsers: 2, returningUsers: 0, cumulativeUsers: 2 });
    expect(result[1]).toMatchObject({ newUsers: 1, returningUsers: 1, cumulativeUsers: 3 });
    expect(result[2]).toMatchObject({ newUsers: 1, returningUsers: 2, cumulativeUsers: 4 });
  });

  it('should handle a day with no users (gap day via ensureCliDates)', () => {
    const acc = createCliUsageAccumulator();
    accumulateCliUsage(acc, '2024-01-15', 1, makeCliMetric(1, '2024-01-15'));
    // day 16 has no CLI users (no entries in dailySessions)
    accumulateCliUsage(acc, '2024-01-17', 1, makeCliMetric(1, '2024-01-17'));

    const result = computeCliAdoptionTrend(acc);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ date: '2024-01-15', newUsers: 1, cumulativeUsers: 1 });
    expect(result[1]).toMatchObject({ date: '2024-01-17', returningUsers: 1, cumulativeUsers: 1 });
  });
});
