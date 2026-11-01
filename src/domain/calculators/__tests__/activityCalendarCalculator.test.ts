import { describe, expect, it } from 'vitest';
import { computeActivityCalendar } from '../activityCalendarCalculator';
import { makeUserDay } from '../../../components/features/user-details/__tests__/helpers/userDetailsFixtures';
import { aggregateMetrics } from '../../metricsAggregator';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { computeSingleUserDetailedMetrics } from '../userDetailCalculator';

const client = (name: string, requests = 0, sessions = 0, prompt = 0, output = 0) => ({
  client: name, request_count: requests, session_count: sessions,
  token_usage: { prompt_tokens_sum: prompt, output_tokens_sum: output, avg_tokens_per_request: 0 },
  totals_by_model: [],
});

describe('activity calendar calculation', () => {
  it('preserves legacy intensity without letting overlapping traffic inflate the scale', () => {
    const days = [
      makeUserDay({ day: '2024-01-01', user_initiated_interaction_count: 1 }),
      makeUserDay({ day: '2024-01-02', code_generation_activity_count: 500, code_acceptance_activity_count: 500 }),
    ];
    const legacy = computeActivityCalendar(days);
    days[0].totals_by_client = [client('vscode', 100000)];
    expect(computeActivityCalendar(days)).toEqual(legacy);
    expect(legacy).toEqual({ activeDays: 2, daily: [
      { day: '2024-01-01', level: 1 }, { day: '2024-01-02', level: 4 },
    ] });
  });

  it('recognizes any active client and counts distinct dates, ignoring missing and zero traffic', () => {
    const days = [
      makeUserDay({ day: '2024-01-01', totals_by_client: [client('claude_code', 3)] }),
      makeUserDay({ day: '2024-01-01', totals_by_client: [client('opencode', 5)] }),
      makeUserDay({ day: '2024-01-02', totals_by_client: [client('future-client', 0, 2)] }),
      makeUserDay({ day: '2024-01-03', totals_by_client: [client('codex', 0, 0, 1)] }),
      makeUserDay({ day: '2024-01-04', totals_by_client: [client('slack', 0, 0, 0, 1)] }),
      makeUserDay({ day: '2024-01-05', totals_by_client: [client('idle')] }),
      makeUserDay({ day: '2024-01-06', totals_by_client: null }),
      makeUserDay({ day: '2024-01-07', totals_by_client: [] }),
      makeUserDay({ day: '2024-01-08' }),
    ];
    const result = computeActivityCalendar(days);
    expect(result.activeDays).toBe(4);
    expect(result.daily.map(day => day.level)).toEqual([1, 1, 1, 1, 0, 0, 0, 0]);
    expect(computeActivityCalendar([])).toEqual({ daily: [], activeDays: 0 });
  });

  it('exposes calendar activity through on-demand worker details without changing legacy totals', () => {
    const { aggregated, userDetailAccumulator } = aggregateMetrics([makeMetric({
      totals_by_client: [client('claude_code', 20)],
    })]);
    expect(computeSingleUserDetailedMetrics(userDetailAccumulator, 1)?.activityCalendar)
      .toEqual({ activeDays: 1, daily: [{ day: '2024-01-15', level: 1 }] });
    expect(aggregated.users.userSummaries[0].total_user_initiated_interactions).toBe(0);
  });
});
