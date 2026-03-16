import { describe, it, expect } from 'vitest';
import {
  computePruAdoptionInsight,
  computeBillingCycleInsight,
  findFirstOfMonthsInRange,
  getLastWeekOfPreviousMonth,
  MODEL_COMPARISON_URL,
  ENABLE_PREMIUM_URL,
  PREMIUM_REQUESTS_URL,
} from '../pruAdoptionInsights';

describe('computePruAdoptionInsight', () => {
  describe('power user (≥90% PRU)', () => {
    it('returns green variant at exactly 90%', () => {
      const result = computePruAdoptionInsight(90, 10, 0);
      expect(result.variant).toBe('green');
      expect(result.message).toContain('Power user');
      expect(result.ctaHref).toBeUndefined();
    });

    it('returns green variant at 100%', () => {
      const result = computePruAdoptionInsight(100, 0, 0);
      expect(result.variant).toBe('green');
    });

    it('returns green variant at 95% with unknown requests', () => {
      const result = computePruAdoptionInsight(95, 2, 3);
      expect(result.variant).toBe('green');
    });
  });

  describe('well-optimized (≥70% and <90% PRU)', () => {
    it('returns blue variant at exactly 70%', () => {
      const result = computePruAdoptionInsight(70, 30, 0);
      expect(result.variant).toBe('blue');
      expect(result.message).toContain('Well-optimized');
      expect(result.ctaHref).toBeUndefined();
    });

    it('returns blue variant at 89%', () => {
      const result = computePruAdoptionInsight(89, 11, 0);
      expect(result.variant).toBe('blue');
    });

    it('returns blue variant at 80% with unknown requests', () => {
      const result = computePruAdoptionInsight(80, 10, 10);
      expect(result.variant).toBe('blue');
    });
  });

  describe('underutilized (<70% PRU, >0%)', () => {
    it('returns orange variant at 69%', () => {
      const result = computePruAdoptionInsight(69, 31, 0);
      expect(result.variant).toBe('orange');
      expect(result.message).toContain('underutilized');
      expect(result.message).toContain('69%');
      expect(result.ctaLabel).toContain('Compare');
      expect(result.ctaHref).toBe(MODEL_COMPARISON_URL);
    });

    it('returns orange variant at 1%', () => {
      const result = computePruAdoptionInsight(1, 99, 0);
      expect(result.variant).toBe('orange');
      expect(result.message).toContain('1%');
      expect(result.ctaHref).toBe(MODEL_COMPARISON_URL);
    });

    it('returns orange variant at 50% with unknown requests', () => {
      const result = computePruAdoptionInsight(50, 30, 20);
      expect(result.variant).toBe('orange');
      expect(result.message).toContain('50%');
    });
  });

  describe('no premium usage (0% PRU)', () => {
    it('returns orange variant with enable link when all standard', () => {
      const result = computePruAdoptionInsight(0, 100, 0);
      expect(result.variant).toBe('orange');
      expect(result.message).toContain('No premium model usage');
      expect(result.ctaLabel).toContain('enabling premium models');
      expect(result.ctaHref).toBe(ENABLE_PREMIUM_URL);
    });

    it('returns orange variant with enable link when all unknown', () => {
      const result = computePruAdoptionInsight(0, 0, 50);
      expect(result.variant).toBe('orange');
      expect(result.message).toContain('No premium model usage');
      expect(result.ctaHref).toBe(ENABLE_PREMIUM_URL);
    });
  });

  describe('edge cases', () => {
    it('handles zero total requests', () => {
      const result = computePruAdoptionInsight(0, 0, 0);
      expect(result.variant).toBe('orange');
      expect(result.message).toContain('No premium model usage');
    });

    it('always returns title "Premium Model Adoption"', () => {
      expect(computePruAdoptionInsight(100, 0, 0).title).toBe('Premium Model Adoption');
      expect(computePruAdoptionInsight(0, 100, 0).title).toBe('Premium Model Adoption');
      expect(computePruAdoptionInsight(50, 50, 0).title).toBe('Premium Model Adoption');
    });

    it('rounds percentage in underutilized message', () => {
      const result = computePruAdoptionInsight(33, 67, 0);
      expect(result.message).toContain('33%');
      expect(result.message).not.toContain('33.');
    });
  });
});

describe('findFirstOfMonthsInRange', () => {
  it('finds first-of-month dates within range', () => {
    expect(findFirstOfMonthsInRange('2026-02-18', '2026-03-18')).toEqual(['2026-03-01']);
  });

  it('returns multiple months for wide ranges', () => {
    expect(findFirstOfMonthsInRange('2026-01-15', '2026-04-10')).toEqual([
      '2026-02-01', '2026-03-01', '2026-04-01',
    ]);
  });

  it('returns empty when no first-of-month in range', () => {
    expect(findFirstOfMonthsInRange('2026-03-02', '2026-03-28')).toEqual([]);
  });

  it('includes start date if it is the 1st', () => {
    expect(findFirstOfMonthsInRange('2026-03-01', '2026-03-15')).toEqual(['2026-03-01']);
  });

  it('includes end date if it is the 1st', () => {
    expect(findFirstOfMonthsInRange('2026-02-15', '2026-03-01')).toEqual(['2026-03-01']);
  });

  it('handles year boundary', () => {
    expect(findFirstOfMonthsInRange('2025-12-20', '2026-01-10')).toEqual(['2026-01-01']);
  });
});

describe('getLastWeekOfPreviousMonth', () => {
  it('returns last 7 days of February for March 1st', () => {
    const result = getLastWeekOfPreviousMonth('2026-03-01');
    expect(result).toEqual({ start: '2026-02-22', end: '2026-02-28' });
  });

  it('returns last 7 days of January for February 1st', () => {
    const result = getLastWeekOfPreviousMonth('2026-02-01');
    expect(result).toEqual({ start: '2026-01-25', end: '2026-01-31' });
  });

  it('handles leap year (March 1st of leap year)', () => {
    const result = getLastWeekOfPreviousMonth('2024-03-01');
    expect(result).toEqual({ start: '2024-02-23', end: '2024-02-29' });
  });

  it('handles year boundary (January 1st)', () => {
    const result = getLastWeekOfPreviousMonth('2026-01-01');
    expect(result).toEqual({ start: '2025-12-25', end: '2025-12-31' });
  });
});

function makeEntry(date: string, pruModels: number, standardModels: number, unknownModels = 0) {
  return { date, pruModels, standardModels, unknownModels };
}

describe('computeBillingCycleInsight', () => {
  it('returns null for empty data', () => {
    expect(computeBillingCycleInsight([])).toBeNull();
  });

  it('returns null when range does not cross a month boundary', () => {
    const data = [
      makeEntry('2026-03-05', 10, 2),
      makeEntry('2026-03-06', 10, 2),
      makeEntry('2026-03-10', 10, 2),
    ];
    expect(computeBillingCycleInsight(data)).toBeNull();
  });

  it('returns null when standard models do not dominate in last week', () => {
    const data = [
      // last week of Feb: PRU-heavy
      makeEntry('2026-02-22', 80, 10),
      makeEntry('2026-02-23', 80, 10),
      makeEntry('2026-02-24', 80, 10),
      makeEntry('2026-02-25', 80, 10),
      makeEntry('2026-02-26', 80, 10),
      makeEntry('2026-02-27', 80, 10),
      makeEntry('2026-02-28', 80, 10),
      // some March data
      makeEntry('2026-03-01', 10, 5),
      makeEntry('2026-03-05', 10, 5),
    ];
    expect(computeBillingCycleInsight(data)).toBeNull();
  });

  it('returns insight when standard models dominate (≥50%) in last week', () => {
    const data = [
      // early Feb: PRU-heavy
      makeEntry('2026-02-18', 80, 10),
      makeEntry('2026-02-19', 80, 10),
      // last week of Feb: standard-heavy
      makeEntry('2026-02-22', 5, 50),
      makeEntry('2026-02-23', 5, 50),
      makeEntry('2026-02-24', 5, 50),
      makeEntry('2026-02-25', 5, 50),
      makeEntry('2026-02-26', 5, 50),
      makeEntry('2026-02-27', 5, 50),
      makeEntry('2026-02-28', 5, 50),
      // March data
      makeEntry('2026-03-01', 50, 10),
      makeEntry('2026-03-10', 50, 10),
    ];
    const result = computeBillingCycleInsight(data);
    expect(result).not.toBeNull();
    expect(result!.title).toBe('End-of-Month Premium Quota');
    expect(result!.variant).toBe('orange');
    expect(result!.message).toContain('Standard models dominated');
    expect(result!.message).toContain('exhausting');
    expect(result!.ctaLabel).toContain('premium request billing');
    expect(result!.ctaHref).toBe(PREMIUM_REQUESTS_URL);
  });

  it('returns insight at exactly 50% standard usage', () => {
    const data = [
      makeEntry('2026-02-25', 50, 50),
      makeEntry('2026-02-26', 50, 50),
      makeEntry('2026-02-27', 50, 50),
      makeEntry('2026-02-28', 50, 50),
      makeEntry('2026-03-01', 10, 1),
    ];
    const result = computeBillingCycleInsight(data);
    expect(result).not.toBeNull();
    expect(result!.message).toContain('50%');
  });

  it('returns null when last week has no data points', () => {
    const data = [
      makeEntry('2026-02-18', 5, 50),
      makeEntry('2026-02-19', 5, 50),
      // gap: no data 22-28
      makeEntry('2026-03-02', 50, 10),
    ];
    expect(computeBillingCycleInsight(data)).toBeNull();
  });

  it('returns null when last week data sums to zero', () => {
    const data = [
      makeEntry('2026-02-25', 0, 0, 0),
      makeEntry('2026-02-26', 0, 0, 0),
      makeEntry('2026-03-01', 10, 5),
    ];
    expect(computeBillingCycleInsight(data)).toBeNull();
  });

  it('uses the latest month boundary when multiple exist', () => {
    const data = [
      // last week of Jan: standard-heavy
      makeEntry('2026-01-26', 5, 50),
      makeEntry('2026-01-27', 5, 50),
      makeEntry('2026-01-28', 5, 50),
      makeEntry('2026-01-29', 5, 50),
      makeEntry('2026-01-30', 5, 50),
      makeEntry('2026-01-31', 5, 50),
      // Feb: PRU-heavy everywhere
      makeEntry('2026-02-01', 80, 10),
      makeEntry('2026-02-15', 80, 10),
      makeEntry('2026-02-22', 80, 10),
      makeEntry('2026-02-23', 80, 10),
      makeEntry('2026-02-24', 80, 10),
      makeEntry('2026-02-25', 80, 10),
      makeEntry('2026-02-26', 80, 10),
      makeEntry('2026-02-27', 80, 10),
      makeEntry('2026-02-28', 80, 10),
      makeEntry('2026-03-01', 80, 10),
    ];
    // Latest boundary is March 1, last week of Feb is PRU-heavy → null
    expect(computeBillingCycleInsight(data)).toBeNull();
  });

  it('includes unknown models in total when computing percentage', () => {
    const data = [
      // 5 PRU + 30 standard + 65 unknown = 100 total, standard = 30% → no trigger
      makeEntry('2026-02-25', 5, 30, 65),
      makeEntry('2026-03-01', 10, 5),
    ];
    expect(computeBillingCycleInsight(data)).toBeNull();
  });

  it('handles partial last-week coverage', () => {
    const data = [
      // only 2 days in the last week, both standard-heavy
      makeEntry('2026-02-27', 2, 80),
      makeEntry('2026-02-28', 2, 80),
      makeEntry('2026-03-01', 50, 10),
    ];
    const result = computeBillingCycleInsight(data);
    expect(result).not.toBeNull();
    expect(result!.variant).toBe('orange');
  });

  it('handles year boundary (Dec→Jan)', () => {
    const data = [
      makeEntry('2025-12-25', 5, 50),
      makeEntry('2025-12-26', 5, 50),
      makeEntry('2025-12-27', 5, 50),
      makeEntry('2025-12-28', 5, 50),
      makeEntry('2025-12-29', 5, 50),
      makeEntry('2025-12-30', 5, 50),
      makeEntry('2025-12-31', 5, 50),
      makeEntry('2026-01-05', 50, 10),
    ];
    const result = computeBillingCycleInsight(data);
    expect(result).not.toBeNull();
    expect(result!.message).toContain('Standard models dominated');
  });
});
