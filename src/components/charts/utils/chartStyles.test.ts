import { describe, it, expect } from 'vitest';
import {
  computeRetentionRates,
  computeAverageRetention,
  createBarDataset,
  barDatasetDefaults,
  createRadarDataset,
  radarDatasetDefaults,
  createDoughnutDataset,
  doughnutDatasetDefaults,
} from './chartStyles';

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

describe('createBarDataset', () => {
  it('sets label, data, backgroundColor and borderColor from the color argument', () => {
    const result = createBarDataset('hsl(210, 70%, 55%)', 'My Label', [1, 2, 3]);
    expect(result.label).toBe('My Label');
    expect(result.data).toEqual([1, 2, 3]);
    expect(result.backgroundColor).toBe('hsl(210, 70%, 55%)');
    expect(result.borderColor).toBe('hsl(210, 70%, 55%)');
  });

  it('applies barDatasetDefaults (borderWidth: 1)', () => {
    const result = createBarDataset('rgb(0,0,0)', 'L', []);
    expect(result.borderWidth).toBe(barDatasetDefaults.borderWidth);
  });

  it('options override default properties', () => {
    const result = createBarDataset('rgb(0,0,0)', 'L', [5], { backgroundColor: 'rgba(0,0,0,0.5)', stack: 'my-stack' });
    expect(result.backgroundColor).toBe('rgba(0,0,0,0.5)');
    expect((result as Record<string, unknown>).stack).toBe('my-stack');
    expect(result.borderColor).toBe('rgb(0,0,0)');
  });

  it('passes through extra options', () => {
    const result = createBarDataset('red', 'R', [], { stack: 'languages', borderWidth: 2 });
    expect((result as Record<string, unknown>).stack).toBe('languages');
    expect(result.borderWidth).toBe(2);
  });
});

describe('createRadarDataset', () => {
  it('sets label, data, borderColor and pointBackgroundColor from the color argument', () => {
    const result = createRadarDataset('rgb(99, 102, 241)', 'Interactions', [1, 2, 3]);
    expect(result.label).toBe('Interactions');
    expect(result.data).toEqual([1, 2, 3]);
    expect(result.borderColor).toBe('rgb(99, 102, 241)');
    expect(result.pointBackgroundColor).toBe('rgb(99, 102, 241)');
  });

  it('derives backgroundColor by inserting alpha 0.2 from rgb color', () => {
    const result = createRadarDataset('rgb(99, 102, 241)', 'L', []);
    expect(result.backgroundColor).toBe('rgba(99, 102, 241, 0.2)');
  });

  it('applies radarDatasetDefaults (borderWidth, pointRadius, etc.)', () => {
    const result = createRadarDataset('rgb(0,0,0)', 'L', []);
    expect(result.borderWidth).toBe(radarDatasetDefaults.borderWidth);
    expect(result.pointBorderColor).toBe(radarDatasetDefaults.pointBorderColor);
    expect(result.pointRadius).toBe(radarDatasetDefaults.pointRadius);
  });

  it('options override default properties', () => {
    const result = createRadarDataset('rgb(0,0,0)', 'L', [], { backgroundColor: 'rgba(0,0,0,0.5)' });
    expect(result.backgroundColor).toBe('rgba(0,0,0,0.5)');
    expect(result.borderColor).toBe('rgb(0,0,0)');
  });
});

describe('createDoughnutDataset', () => {
  it('sets data and backgroundColor arrays', () => {
    const result = createDoughnutDataset([10, 20, 30], ['#f00', '#0f0', '#00f']);
    expect(result.data).toEqual([10, 20, 30]);
    expect(result.backgroundColor).toEqual(['#f00', '#0f0', '#00f']);
  });

  it('applies doughnutDatasetDefaults (borderWidth and borderColor)', () => {
    const result = createDoughnutDataset([], []);
    expect(result.borderWidth).toBe(doughnutDatasetDefaults.borderWidth);
    expect(result.borderColor).toBe(doughnutDatasetDefaults.borderColor);
  });

  it('options override default properties', () => {
    const result = createDoughnutDataset([1], ['#f00'], { borderColor: 'transparent' });
    expect(result.borderColor).toBe('transparent');
  });
});
