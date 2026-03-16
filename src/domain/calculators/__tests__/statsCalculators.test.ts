import { describe, it, expect } from 'vitest';
import { calculatePercentage } from '../statsCalculators';

describe('calculatePercentage', () => {
  it('should return correct percentage for typical values', () => {
    expect(calculatePercentage(50, 200)).toBe(25);
    expect(calculatePercentage(1, 3)).toBeCloseTo(33.33, 2);
  });

  it('should return 0 when denominator is 0', () => {
    expect(calculatePercentage(50, 0)).toBe(0);
    expect(calculatePercentage(0, 0)).toBe(0);
  });

  it('should return 100 when numerator equals denominator', () => {
    expect(calculatePercentage(100, 100)).toBe(100);
  });

  it('should respect custom decimal places', () => {
    expect(calculatePercentage(1, 3, 0)).toBe(33);
    expect(calculatePercentage(1, 3, 1)).toBeCloseTo(33.3, 1);
    expect(calculatePercentage(1, 3, 4)).toBeCloseTo(33.3333, 4);
  });

  it('should handle small numerators with large denominators', () => {
    expect(calculatePercentage(2, 681)).toBeCloseTo(0.29, 2);
  });
});
