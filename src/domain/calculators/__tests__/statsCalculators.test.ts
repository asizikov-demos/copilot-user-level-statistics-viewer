import { describe, it, expect } from 'vitest';
import { calculatePercentage, compareDatesAsc, compareByDateAsc } from '../statsCalculators';

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

describe('compareDatesAsc', () => {
  it('should return negative when a is before b', () => {
    expect(compareDatesAsc('2024-01-01', '2024-01-02')).toBeLessThan(0);
  });

  it('should return positive when a is after b', () => {
    expect(compareDatesAsc('2024-01-02', '2024-01-01')).toBeGreaterThan(0);
  });

  it('should return 0 for equal dates', () => {
    expect(compareDatesAsc('2024-01-15', '2024-01-15')).toBe(0);
  });

  it('should sort an array of date strings in ascending order', () => {
    const dates = ['2024-01-17', '2024-01-15', '2024-01-16'];
    expect([...dates].sort(compareDatesAsc)).toEqual(['2024-01-15', '2024-01-16', '2024-01-17']);
  });
});

describe('compareByDateAsc', () => {
  it('should sort objects by date field in ascending order', () => {
    const items = [
      { date: '2024-01-17', value: 3 },
      { date: '2024-01-15', value: 1 },
      { date: '2024-01-16', value: 2 },
    ];
    const sorted = [...items].sort(compareByDateAsc);
    expect(sorted.map(i => i.date)).toEqual(['2024-01-15', '2024-01-16', '2024-01-17']);
  });

  it('should return 0 for objects with equal dates', () => {
    expect(compareByDateAsc({ date: '2024-01-01' }, { date: '2024-01-01' })).toBe(0);
  });
});
