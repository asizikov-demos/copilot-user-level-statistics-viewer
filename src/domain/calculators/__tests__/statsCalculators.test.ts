import { describe, it, expect, vi } from 'vitest';
import {
  calculatePercentage,
  compareDatesAsc,
  compareByDateAsc,
  findMaxItem,
  findMaxValue,
  findMinItem,
  findMinMaxItems,
  findMinMaxValues,
  findMinValue,
} from '../statsCalculators';

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

describe('findMaxValue', () => {
  it('should find the maximum value without calling the accessor more than once per item', () => {
    const data = [{ value: 1 }, { value: 5 }, { value: 3 }];
    const accessor = vi.fn((item: { value: number }) => item.value);

    expect(findMaxValue(data, accessor)).toBe(5);
    expect(accessor).toHaveBeenCalledTimes(data.length);
  });

  it('should return 0 for empty data', () => {
    expect(findMaxValue([], (value: number) => value)).toBe(0);
  });
});

describe('findMinValue', () => {
  it('should find the minimum value without calling the accessor more than once per item', () => {
    const data = [{ value: 3 }, { value: 1 }, { value: 5 }];
    const accessor = vi.fn((item: { value: number }) => item.value);

    expect(findMinValue(data, accessor)).toBe(1);
    expect(accessor).toHaveBeenCalledTimes(data.length);
  });

  it('should return 0 for empty data', () => {
    expect(findMinValue([], (value: number) => value)).toBe(0);
  });
});

describe('findMinMaxValues', () => {
  it('should find minimum and maximum values in one pass', () => {
    const data = [{ value: 3 }, { value: 1 }, { value: 5 }];
    const accessor = vi.fn((item: { value: number }) => item.value);

    expect(findMinMaxValues(data, accessor)).toEqual({ min: 1, max: 5 });
    expect(accessor).toHaveBeenCalledTimes(data.length);
  });

  it('should return 0 for both values for empty data', () => {
    expect(findMinMaxValues([], (value: number) => value)).toEqual({ min: 0, max: 0 });
  });
});

describe('findMaxItem', () => {
  it('should find the item with the maximum value without calling the accessor more than once per item', () => {
    const data = [{ value: 1 }, { value: 5 }, { value: 3 }];
    const accessor = vi.fn((item: { value: number }) => item.value);

    expect(findMaxItem(data, accessor)).toBe(data[1]);
    expect(accessor).toHaveBeenCalledTimes(data.length);
  });

  it('should return undefined for empty data', () => {
    expect(findMaxItem([], (value: number) => value)).toBeUndefined();
  });
});

describe('findMinItem', () => {
  it('should find the item with the minimum value without calling the accessor more than once per item', () => {
    const data = [{ value: 3 }, { value: 1 }, { value: 5 }];
    const accessor = vi.fn((item: { value: number }) => item.value);

    expect(findMinItem(data, accessor)).toBe(data[1]);
    expect(accessor).toHaveBeenCalledTimes(data.length);
  });

  it('should return undefined for empty data', () => {
    expect(findMinItem([], (value: number) => value)).toBeUndefined();
  });
});

describe('findMinMaxItems', () => {
  it('should find minimum and maximum items in one pass', () => {
    const data = [{ value: 3 }, { value: 1 }, { value: 5 }];
    const accessor = vi.fn((item: { value: number }) => item.value);

    expect(findMinMaxItems(data, accessor)).toEqual({
      minItem: data[1],
      maxItem: data[2],
    });
    expect(accessor).toHaveBeenCalledTimes(data.length);
  });

  it('should return undefined for empty data', () => {
    expect(findMinMaxItems([], (value: number) => value)).toBeUndefined();
  });
});
