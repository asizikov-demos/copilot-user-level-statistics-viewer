import { describe, it, expect } from 'vitest';
import { computeRetentionRates, computeAverageRetention } from './chartStyles';

describe('computeRetentionRates', () => {
  it('returns the percentage of returning users out of total active', () => {
    const result = computeRetentionRates([{ returningUsers: 3, totalActiveUsers: 10 }]);
    expect(result).toEqual([30]);
  });

  it('returns null when totalActiveUsers is zero', () => {
    const result = computeRetentionRates([{ returningUsers: 0, totalActiveUsers: 0 }]);
    expect(result).toEqual([null]);
  });

  it('handles returningUsers equal to totalActiveUsers (100%)', () => {
    const result = computeRetentionRates([{ returningUsers: 5, totalActiveUsers: 5 }]);
    expect(result).toEqual([100]);
  });

  it('rounds to one decimal place', () => {
    // 2/3 = 66.666... → 66.7
    const result = computeRetentionRates([{ returningUsers: 2, totalActiveUsers: 3 }]);
    expect(result).toEqual([66.7]);
  });

  it('returns null for inactive days and non-null for active days', () => {
    const result = computeRetentionRates([
      { returningUsers: 0, totalActiveUsers: 0 },
      { returningUsers: 1, totalActiveUsers: 4 },
    ]);
    expect(result).toEqual([null, 25]);
  });

  it('returns empty array for empty input', () => {
    expect(computeRetentionRates([])).toEqual([]);
  });
});

describe('computeAverageRetention', () => {
  it('computes weighted period-level retention (total returning / total active)', () => {
    // 3 returning out of 10 active = 30%
    const data = [
      { returningUsers: 1, totalActiveUsers: 5 },
      { returningUsers: 2, totalActiveUsers: 5 },
    ];
    expect(computeAverageRetention(data)).toBe(30);
  });

  it('returns 0 when total active is zero', () => {
    const data = [
      { returningUsers: 0, totalActiveUsers: 0 },
    ];
    expect(computeAverageRetention(data)).toBe(0);
  });

  it('returns 0 for empty input', () => {
    expect(computeAverageRetention([])).toBe(0);
  });

  it('weights heavy-traffic days more than light-traffic days', () => {
    // Day1: 90% retention, 100 active. Day2: 0% retention, 10 active.
    // Weighted: 90/110 ≈ 81.8% (not the unweighted avg 45%)
    const data = [
      { returningUsers: 90, totalActiveUsers: 100 },
      { returningUsers: 0, totalActiveUsers: 10 },
    ];
    const result = computeAverageRetention(data);
    expect(result).toBeCloseTo(81.8, 0);
  });

  it('rounds to one decimal place', () => {
    // 2/3 = 66.666... → 66.7
    const data = [{ returningUsers: 2, totalActiveUsers: 3 }];
    expect(computeAverageRetention(data)).toBe(66.7);
  });
});
