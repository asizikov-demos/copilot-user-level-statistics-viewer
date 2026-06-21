import { describe, it, expect } from 'vitest';
import {
  accumulateCloudAgentAdoption,
  accumulateCodeReviewAdoptionSignal,
  computeDailyCloudAgentAdoptionData,
  computeDailyCodeReviewAdoptionData,
  createAdvancedAdoptionAccumulator,
} from '../advancedAdoptionCalculator';

describe('advancedAdoptionCalculator', () => {
  it('counts daily unique Cloud Agent users', () => {
    const accumulator = createAdvancedAdoptionAccumulator();

    accumulateCloudAgentAdoption(accumulator, '2024-01-16', 1, true);
    accumulateCloudAgentAdoption(accumulator, '2024-01-16', 1, true);
    accumulateCloudAgentAdoption(accumulator, '2024-01-16', 2, true);
    accumulateCloudAgentAdoption(accumulator, '2024-01-15', 3, true);
    accumulateCloudAgentAdoption(accumulator, '2024-01-17', 4, false);

    expect(computeDailyCloudAgentAdoptionData(accumulator)).toEqual([
      { date: '2024-01-15', uniqueUsers: 1 },
      { date: '2024-01-16', uniqueUsers: 2 },
    ]);
  });

  it('counts daily unique active and passive Code Review users independently', () => {
    const accumulator = createAdvancedAdoptionAccumulator();

    accumulateCodeReviewAdoptionSignal(accumulator, '2024-01-16', 1, true, false);
    accumulateCodeReviewAdoptionSignal(accumulator, '2024-01-16', 1, true, false);
    accumulateCodeReviewAdoptionSignal(accumulator, '2024-01-16', 2, false, true);
    accumulateCodeReviewAdoptionSignal(accumulator, '2024-01-16', 3, true, true);
    accumulateCodeReviewAdoptionSignal(accumulator, '2024-01-15', 4, false, true);
    accumulateCodeReviewAdoptionSignal(accumulator, '2024-01-17', 5, false, false);

    expect(computeDailyCodeReviewAdoptionData(accumulator)).toEqual([
      { date: '2024-01-15', activeUsers: 0, passiveUsers: 1 },
      { date: '2024-01-16', activeUsers: 2, passiveUsers: 2 },
    ]);
  });
});
