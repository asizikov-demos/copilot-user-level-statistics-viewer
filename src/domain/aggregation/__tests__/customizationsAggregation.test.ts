import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import {
  accumulateCustomizationsAggregation,
  createCustomizationsAggregationAccumulator,
  finalizeCustomizationsAggregation,
} from '../customizationsAggregation';

describe('customizationsAggregation', () => {
  it('aggregates items across users and days, flagging unnamed buckets', () => {
    const acc = createCustomizationsAggregationAccumulator();
    accumulateCustomizationsAggregation(acc, {
      ...makeMetric({ day: '2026-10-01', user_login: 'a', user_id: 1 }),
      totals_by_skill: [{ skill: 'review', interaction_count: 3 }, { skill: 'other', interaction_count: 7 }],
      totals_by_plugin: [{ plugin: 'p1', interaction_count: 2 }],
    });
    accumulateCustomizationsAggregation(acc, {
      ...makeMetric({ day: '2026-10-02', user_login: 'b', user_id: 2 }),
      totals_by_skill: [{ skill: 'review', interaction_count: 5 }],
    });

    const result = finalizeCustomizationsAggregation(acc);

    expect(result.dates).toEqual(['2026-10-01', '2026-10-02']);
    const skills = result.types.skill;
    expect(skills.totalEvents).toBe(15);
    expect(skills.unnamedEvents).toBe(7);
    expect(skills.users).toBe(2);
    expect(skills.items[0]).toMatchObject({
      name: 'review',
      unnamed: false,
      totalEvents: 8,
      users: 2,
      activeDays: 2,
      dailyEvents: [3, 5],
      topUsers: [{ login: 'b', events: 5 }, { login: 'a', events: 3 }],
    });
    expect(skills.items[1]).toMatchObject({ name: 'other', unnamed: true });
    expect(result.types.plugin.items).toHaveLength(1);
    expect(result.types.mcp.items).toEqual([]);
  });
});
