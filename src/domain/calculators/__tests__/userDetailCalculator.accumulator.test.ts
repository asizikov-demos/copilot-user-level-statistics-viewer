import { describe, it, expect } from 'vitest';
import {
  createUserDetailAccumulator,
  computeSingleUserDetailedMetrics,
} from '../userDetailCalculator';
import { accumulateUserDays, modelFeatureTotals, userDetails } from './helpers/userDetailFixtures';

describe('userDetailCalculator accumulator and totals', () => {
  it('starts with no users and an empty report range', () => {
    const acc = createUserDetailAccumulator();
    expect(acc.users.size).toBe(0);
    expect(acc.reportStartDay).toBe('');
    expect(acc.reportEndDay).toBe('');
  });

  it('returns null for a user that was never accumulated', () => {
    expect(computeSingleUserDetailedMetrics(createUserDetailAccumulator(), 999)).toBeNull();
  });

  it('includes the report range from the accumulator', () => {
    expect(userDetails([{}])).toMatchObject({ reportStartDay: '2024-01-01', reportEndDay: '2024-01-31' });
  });

  it.each([
    { model: 'gpt-4o', count: 20 },
    { model: 'unknown', count: 10 },
    { model: '', count: 5 },
    { model: 'Claude Opus 4.6 (fast mode)', count: 7 },
  ])('counts requests for model "$model" in the neutral total', ({ model, count }) => {
    const acc = accumulateUserDays([{
      totals_by_model_feature: [modelFeatureTotals(model, 'code_completion', { user_initiated_interaction_count: count })],
    }]);
    expect(acc.users.get(1)!.totalModelRequests).toBe(count);
  });

  it('exposes the neutral total model requests in the user detail payload', () => {
    const details = userDetails([{
      totals_by_model_feature: [
        modelFeatureTotals('gpt-4o', 'code_completion', { user_initiated_interaction_count: 20 }),
        modelFeatureTotals('unknown', 'code_completion', { user_initiated_interaction_count: 5 }),
      ],
    }]);
    expect(details.totalModelRequests).toBe(25);
  });

  it('exposes total and daily AI credits', () => {
    const details = userDetails([
      { day: '2024-01-15', ai_credits_used: 55.053015 },
      { day: '2024-01-16', ai_credits_used: 4.946985 },
    ]);
    expect(details.total_ai_credits_used).toBeCloseTo(60);
    expect(details.days.map(day => day.ai_credits_used)).toEqual([55.053015, 4.946985]);
  });
});
