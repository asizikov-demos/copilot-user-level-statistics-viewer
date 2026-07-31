import { describe, it, expect } from 'vitest';
import { buildSortedCliAwareDates, getCliDayData } from '../cliDateHelpers';
import type { CliUsageForDownstreamCalculations } from '../cliUsageCalculator';

function makeCliAccumulator(
  dates: string[]
): CliUsageForDownstreamCalculations {
  const dailySessions = new Map(
    dates.map(date => [
      date,
      { sessionCount: 1, requestCount: 2, promptCount: 1, users: new Set([42]) },
    ])
  );
  return { dailySessions };
}

describe('buildSortedCliAwareDates', () => {
  it('returns sorted local dates when no CLI accumulator is provided', () => {
    const result = buildSortedCliAwareDates(['2024-01-17', '2024-01-15', '2024-01-16']);
    expect(result).toEqual(['2024-01-15', '2024-01-16', '2024-01-17']);
  });

  it('returns empty array when local dates and CLI accumulator are both empty', () => {
    const cli = makeCliAccumulator([]);
    expect(buildSortedCliAwareDates([], cli)).toEqual([]);
  });

  it('includes CLI-only dates that are absent from local dates', () => {
    const cli = makeCliAccumulator(['2024-01-18']);
    const result = buildSortedCliAwareDates(['2024-01-15', '2024-01-16'], cli);
    expect(result).toEqual(['2024-01-15', '2024-01-16', '2024-01-18']);
  });

  it('deduplicates dates that appear in both local and CLI sources', () => {
    const cli = makeCliAccumulator(['2024-01-15', '2024-01-17']);
    const result = buildSortedCliAwareDates(['2024-01-15', '2024-01-16'], cli);
    expect(result).toEqual(['2024-01-15', '2024-01-16', '2024-01-17']);
  });

  it('returns only CLI dates when local dates are empty', () => {
    const cli = makeCliAccumulator(['2024-01-20', '2024-01-18']);
    const result = buildSortedCliAwareDates([], cli);
    expect(result).toEqual(['2024-01-18', '2024-01-20']);
  });

  it('returns only local dates when CLI accumulator is undefined', () => {
    const result = buildSortedCliAwareDates(['2024-01-16', '2024-01-15']);
    expect(result).toEqual(['2024-01-15', '2024-01-16']);
  });
});

describe('getCliDayData', () => {
  it('returns undefined when no CLI accumulator is provided', () => {
    expect(getCliDayData('2024-01-15')).toBeUndefined();
  });

  it('returns undefined for a date not present in the CLI accumulator', () => {
    const cli = makeCliAccumulator(['2024-01-16']);
    expect(getCliDayData('2024-01-15', cli)).toBeUndefined();
  });

  it('returns the session data for a date present in the CLI accumulator', () => {
    const cli = makeCliAccumulator(['2024-01-15']);
    const result = getCliDayData('2024-01-15', cli);
    expect(result).toEqual({
      sessionCount: 1,
      requestCount: 2,
      promptCount: 1,
      users: new Set([42]),
    });
  });
});
