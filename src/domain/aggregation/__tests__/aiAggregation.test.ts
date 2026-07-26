import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import {
  accumulateAiAggregation,
  createAiAggregationAccumulator,
  finalizeAiAggregation,
} from '../aiAggregation';

describe('AI aggregation orchestration', () => {
  it('preserves empty AI phase, distribution, and credit defaults', () => {
    const result = finalizeAiAggregation(createAiAggregationAccumulator());

    expect(result.aiAdoptionPhaseData).toEqual([]);
    expect(result.dailyAiCreditsData).toEqual([]);
    expect(result.usageDistributionData.map(bucket => ({
      id: bucket.id,
      userCount: bucket.userCount,
      avgAiCreditsUsed: bucket.avgAiCreditsUsed,
    }))).toEqual([
      { id: 'power', userCount: 0, avgAiCreditsUsed: 0 },
      { id: 'heavy', userCount: 0, avgAiCreditsUsed: 0 },
      { id: 'typical', userCount: 0, avgAiCreditsUsed: 0 },
      { id: 'light', userCount: 0, avgAiCreditsUsed: 0 },
    ]);
  });

  it('preserves latest-day phases, usage-distribution order, and daily credit totals', () => {
    const accumulator = createAiAggregationAccumulator();
    accumulateAiAggregation(accumulator, makeMetric({
      day: '2024-01-16',
      user_id: 1,
      ai_credits_used: 7,
      ai_adoption_phase: {
        phase_number: 2,
        phase: 'Accelerating',
        version: 'v2',
      },
    }));
    accumulateAiAggregation(accumulator, makeMetric({
      day: '2024-01-15',
      user_id: 1,
      ai_credits_used: 5,
      ai_adoption_phase: {
        phase_number: 1,
        phase: 'Exploring',
        version: 'v1',
      },
    }));
    accumulateAiAggregation(accumulator, makeMetric({
      day: '2024-01-15',
      user_id: 2,
      ai_credits_used: 2,
    }));

    const result = finalizeAiAggregation(accumulator);

    expect(result.aiAdoptionPhaseData.map(data => ({
      phase: data.phase.phase_number,
      users: data.userCount,
      credits: data.avgAiCreditsUsed,
    }))).toEqual([
      { phase: 2, users: 1, credits: 12 },
      { phase: -1, users: 1, credits: 2 },
    ]);
    expect(result.usageDistributionData.map(bucket => bucket.id)).toEqual([
      'power',
      'heavy',
      'typical',
      'light',
    ]);
    expect(result.usageDistributionData.map(bucket => bucket.userCount)).toEqual([
      0,
      0,
      2,
      0,
    ]);
    expect(result.dailyAiCreditsData).toEqual([
      { date: '2024-01-15', aiCreditsUsed: 7, users: 2 },
      { date: '2024-01-16', aiCreditsUsed: 7, users: 1 },
    ]);
  });
});
