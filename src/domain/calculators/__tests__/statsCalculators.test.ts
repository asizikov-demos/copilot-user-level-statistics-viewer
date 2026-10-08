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

type Item = { value: number; id?: string };
const value = (item: Item) => item.value;
const mixed: Item[] = [{ value: 3 }, { value: 1 }, { value: 5 }];
const negatives: Item[] = [{ value: -8 }, { value: -2 }, { value: -5 }];
const ties: Item[] = [{ value: 5, id: 'first' }, { value: 5, id: 'second' }];

describe('value finders', () => {
  it.each([
    { name: 'findMaxValue', find: findMaxValue<Item>, data: mixed, expected: 5 },
    { name: 'findMinValue', find: findMinValue<Item>, data: mixed, expected: 1 },
    { name: 'findMinMaxValues', find: findMinMaxValues<Item>, data: mixed, expected: { min: 1, max: 5 } },
    { name: 'findMaxValue', find: findMaxValue<Item>, data: negatives, expected: -2 },
    { name: 'findMinValue', find: findMinValue<Item>, data: negatives, expected: -8 },
    { name: 'findMinMaxValues', find: findMinMaxValues<Item>, data: negatives, expected: { min: -8, max: -2 } },
    { name: 'findMaxValue', find: findMaxValue<Item>, data: [], expected: 0 },
    { name: 'findMinValue', find: findMinValue<Item>, data: [], expected: 0 },
    { name: 'findMinMaxValues', find: findMinMaxValues<Item>, data: [], expected: { min: 0, max: 0 } },
  ])('$name returns $expected for $data.length items', ({ find, data, expected }) => {
    expect(find(data, value)).toEqual(expected);
  });

  it.each([
    ['findMaxValue', findMaxValue<Item>],
    ['findMinValue', findMinValue<Item>],
    ['findMinMaxValues', findMinMaxValues<Item>],
  ])('%s calls the accessor once per item', (_name, find) => {
    const accessor = vi.fn(value);
    find(mixed, accessor);
    expect(accessor).toHaveBeenCalledTimes(mixed.length);
  });
});

describe('item finders', () => {
  it.each([
    { name: 'findMaxItem', find: findMaxItem<Item>, data: mixed, expected: mixed[2] },
    { name: 'findMinItem', find: findMinItem<Item>, data: mixed, expected: mixed[1] },
    { name: 'findMinMaxItems', find: findMinMaxItems<Item>, data: mixed, expected: { minItem: mixed[1], maxItem: mixed[2] } },
    { name: 'findMaxItem', find: findMaxItem<Item>, data: negatives, expected: negatives[1] },
    { name: 'findMinItem', find: findMinItem<Item>, data: negatives, expected: negatives[0] },
    { name: 'findMaxItem (tie keeps first)', find: findMaxItem<Item>, data: ties, expected: ties[0] },
    { name: 'findMinItem (tie keeps first)', find: findMinItem<Item>, data: ties, expected: ties[0] },
    { name: 'findMaxItem', find: findMaxItem<Item>, data: [], expected: undefined },
    { name: 'findMinItem', find: findMinItem<Item>, data: [], expected: undefined },
    { name: 'findMinMaxItems', find: findMinMaxItems<Item>, data: [], expected: undefined },
  ])('$name selects the expected item from $data.length items', ({ find, data, expected }) => {
    expect(find(data, value)).toEqual(expected);
  });

  it('returns the original item references rather than copies', () => {
    expect(findMaxItem(mixed, value)).toBe(mixed[2]);
    expect(findMinItem(mixed, value)).toBe(mixed[1]);
    expect(findMinMaxItems(mixed, value)?.minItem).toBe(mixed[1]);
    expect(findMinMaxItems(mixed, value)?.maxItem).toBe(mixed[2]);
  });

  it.each([
    ['findMaxItem', findMaxItem<Item>],
    ['findMinItem', findMinItem<Item>],
    ['findMinMaxItems', findMinMaxItems<Item>],
  ])('%s calls the accessor once per item', (_name, find) => {
    const accessor = vi.fn(value);
    find(mixed, accessor);
    expect(accessor).toHaveBeenCalledTimes(mixed.length);
  });
});
