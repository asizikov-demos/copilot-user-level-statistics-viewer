import { describe, it, expect } from 'vitest';
import { generateDateRange } from './formatters';

describe('generateDateRange', () => {
  it('returns a single date when start equals end', () => {
    expect(generateDateRange('2024-01-15', '2024-01-15')).toEqual(['2024-01-15']);
  });

  it('returns all dates inclusive for a multi-day range', () => {
    expect(generateDateRange('2024-01-13', '2024-01-15')).toEqual([
      '2024-01-13',
      '2024-01-14',
      '2024-01-15',
    ]);
  });

  it('returns an empty array when start is after end', () => {
    expect(generateDateRange('2024-01-15', '2024-01-13')).toEqual([]);
  });

  it('correctly crosses a month boundary', () => {
    const result = generateDateRange('2024-01-30', '2024-02-02');
    expect(result).toEqual(['2024-01-30', '2024-01-31', '2024-02-01', '2024-02-02']);
  });

  it('correctly crosses a year boundary', () => {
    const result = generateDateRange('2024-12-30', '2025-01-02');
    expect(result).toEqual(['2024-12-30', '2024-12-31', '2025-01-01', '2025-01-02']);
  });
});
