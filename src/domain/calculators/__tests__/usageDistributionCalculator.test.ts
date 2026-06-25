import { describe, it, expect } from 'vitest';
import {
  createAiAdoptionPhaseAccumulator,
  accumulateAiAdoptionPhase,
} from '../aiAdoptionPhaseCalculator';
import { computeUsageDistributionData } from '../usageDistributionCalculator';
import { makeMetric } from '../../../__tests__/factories/metrics';

function buildAccumulator(metrics: Parameters<typeof accumulateAiAdoptionPhase>[1][]) {
  const accumulator = createAiAdoptionPhaseAccumulator();
  for (const metric of metrics) {
    accumulateAiAdoptionPhase(accumulator, metric);
  }
  return accumulator;
}

describe('usageDistributionCalculator', () => {
  it('always returns the four ordered buckets', () => {
    const buckets = computeUsageDistributionData(createAiAdoptionPhaseAccumulator());
    expect(buckets.map((bucket) => bucket.id)).toEqual(['power', 'heavy', 'typical', 'light']);
    expect(buckets.every((bucket) => bucket.userCount === 0)).toBe(true);
  });

  it('partitions 20 users into 5% / 15% / 55% / 25% segments by consumption', () => {
    const metrics = Array.from({ length: 20 }, (_, index) =>
      makeMetric({ user_id: index + 1, ai_credits_used: (20 - index) * 10 })
    );

    const buckets = computeUsageDistributionData(buildAccumulator(metrics));
    const counts = buckets.map((bucket) => bucket.userCount);

    expect(counts).toEqual([1, 3, 11, 5]);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(20);

    // Power users are the highest consumers.
    expect(buckets[0].avgAiCreditsUsed).toBe(200);
    expect(buckets[0].totalAiCreditsUsed).toBe(200);
    // Light users are the lowest consumers (last 5 of the ranked list: credits 50..10).
    expect(buckets[3].avgAiCreditsUsed).toBe(30);
    expect(buckets[3].totalAiCreditsUsed).toBe(150);
  });

  it('aggregates per-user averages, totals, and top dimensions within a segment', () => {
    const metrics = [
      makeMetric({
        user_id: 1,
        day: '2024-01-15',
        ai_credits_used: 100,
        loc_added_sum: 50,
        loc_deleted_sum: 10,
        totals_by_model_feature: [
          { model: 'gpt-4o', feature: 'chat', user_initiated_interaction_count: 8, code_generation_activity_count: 0, code_acceptance_activity_count: 0, loc_added_sum: 0, loc_deleted_sum: 0, loc_suggested_to_add_sum: 0, loc_suggested_to_delete_sum: 0 },
        ],
        totals_by_ide: [
          { ide: 'vscode', user_initiated_interaction_count: 5, code_generation_activity_count: 0, code_acceptance_activity_count: 0, loc_added_sum: 0, loc_deleted_sum: 0, loc_suggested_to_add_sum: 0, loc_suggested_to_delete_sum: 0 },
        ],
      }),
      makeMetric({
        user_id: 1,
        day: '2024-01-16',
        ai_credits_used: 100,
        loc_added_sum: 50,
        loc_deleted_sum: 10,
      }),
    ];

    const buckets = computeUsageDistributionData(buildAccumulator(metrics));
    // With a single user, the typical bucket (round(1 * 0.75) = 1) holds them.
    const populated = buckets.find((bucket) => bucket.userCount > 0)!;

    expect(populated.userCount).toBe(1);
    expect(populated.totalAiCreditsUsed).toBe(200);
    expect(populated.avgAiCreditsUsed).toBe(200);
    expect(populated.avgDaysActive).toBe(2);
    expect(populated.totalLocAdded).toBe(100);
    expect(populated.totalLocDeleted).toBe(20);
    expect(populated.topModels[0]).toMatchObject({ total: 8, uniqueUsers: 1 });
    expect(populated.topClients[0]).toMatchObject({ name: 'vscode', total: 5, uniqueUsers: 1 });
  });
});
