import { describe, it, expect } from 'vitest';
import {
  mapReportRangeData,
  padSeriesWithDefaults,
  padSeriesWithCarryForward,
  padReportRangeWithDefaults,
  padReportRangeWithCarryForward,
} from './timeSeries';

const DAY_1 = '2024-01-01';
const DAY_2 = '2024-01-02';
const DAY_3 = '2024-01-03';
const DAY_4 = '2024-01-04';

interface Point {
  date: string;
  value: number;
}

interface CumulativePoint extends Point {
  cumulative: number;
}

const point = (date: string, value: number): Point => ({ date, value });
const cumulativePoint = (date: string, value: number, cumulative: number): CumulativePoint => ({
  date, value, cumulative,
});
const toMap = <T extends { date: string }>(entries: T[]) => new Map(entries.map(entry => [entry.date, entry]));

describe('padSeriesWithDefaults', () => {
  it.each([
    { name: 'an empty date list', dates: [], present: [], expected: [] },
    {
      name: 'every date present',
      dates: [DAY_1, DAY_2, DAY_3],
      present: [point(DAY_1, 10), point(DAY_2, 20), point(DAY_3, 30)],
      expected: [point(DAY_1, 10), point(DAY_2, 20), point(DAY_3, 30)],
    },
    {
      name: 'a gap in the middle',
      dates: [DAY_1, DAY_2, DAY_3],
      present: [point(DAY_1, 5), point(DAY_3, 15)],
      expected: [point(DAY_1, 5), point(DAY_2, 0), point(DAY_3, 15)],
    },
    {
      name: 'no data',
      dates: [DAY_1, DAY_2],
      present: [],
      expected: [point(DAY_1, 0), point(DAY_2, 0)],
    },
  ])('fills missing dates from the default factory for $name', ({ dates, present, expected }) => {
    expect(padSeriesWithDefaults(dates, toMap(present), date => point(date, 0))).toEqual(expected);
  });

  it('preserves explicitly stored nullish values', () => {
    const dataMap = new Map<string, string | null | undefined>([[DAY_1, null], [DAY_2, undefined]]);

    expect(padSeriesWithDefaults([DAY_1, DAY_2, DAY_3], dataMap, date => `default-${date}`))
      .toEqual([null, undefined, `default-${DAY_3}`]);
  });
});

describe('padSeriesWithCarryForward', () => {
  it.each([
    { name: 'an empty date list', dates: [], present: [], initial: 0, expected: [] },
    {
      name: 'every date present',
      dates: [DAY_1, DAY_2],
      present: [cumulativePoint(DAY_1, 5, 5), cumulativePoint(DAY_2, 3, 8)],
      initial: 0,
      expected: [cumulativePoint(DAY_1, 5, 5), cumulativePoint(DAY_2, 3, 8)],
    },
    {
      name: 'a single missing day',
      dates: [DAY_1, DAY_2, DAY_3],
      present: [cumulativePoint(DAY_1, 5, 5), cumulativePoint(DAY_3, 2, 7)],
      initial: 0,
      expected: [cumulativePoint(DAY_1, 5, 5), cumulativePoint(DAY_2, 0, 5), cumulativePoint(DAY_3, 2, 7)],
    },
    {
      name: 'consecutive missing days',
      dates: [DAY_1, DAY_2, DAY_3, DAY_4],
      present: [cumulativePoint(DAY_1, 10, 10), cumulativePoint(DAY_4, 4, 14)],
      initial: 0,
      expected: [
        cumulativePoint(DAY_1, 10, 10),
        cumulativePoint(DAY_2, 0, 10),
        cumulativePoint(DAY_3, 0, 10),
        cumulativePoint(DAY_4, 4, 14),
      ],
    },
    {
      name: 'no data, using the initial value',
      dates: [DAY_1, DAY_2],
      present: [],
      initial: 42,
      expected: [cumulativePoint(DAY_1, 0, 42), cumulativePoint(DAY_2, 0, 42)],
    },
  ])('carries the last cumulative value across $name', ({ dates, present, initial, expected }) => {
    expect(padSeriesWithCarryForward<CumulativePoint, number>(
      dates,
      toMap(present),
      initial,
      entry => entry.cumulative,
      (date, cumulative) => cumulativePoint(date, 0, cumulative),
    )).toEqual(expected);
  });

  it('treats explicitly stored undefined as present when carrying forward', () => {
    const result = padSeriesWithCarryForward<string | undefined, number>(
      [DAY_1, DAY_2],
      new Map([[DAY_1, undefined]]),
      0,
      (entry, previous) => entry === undefined ? previous + 1 : previous,
      (_date, carried) => `default-${carried}`,
    );

    expect(result).toEqual([undefined, 'default-1']);
  });
});

describe('report range helpers', () => {
  const sparse = [point(DAY_1, 5), point(DAY_3, 10)];

  it('padReportRangeWithDefaults pads every report day using the date selector', () => {
    expect(padReportRangeWithDefaults(sparse, DAY_1, DAY_3, entry => entry.date, date => point(date, 0)))
      .toEqual([point(DAY_1, 5), point(DAY_2, 0), point(DAY_3, 10)]);
  });

  it.each([
    { name: 'sparse data', data: sparse, end: DAY_3, expected: [`${DAY_1}:5`, `${DAY_2}:missing`, `${DAY_3}:10`] },
    { name: 'empty data', data: [], end: DAY_2, expected: [`${DAY_1}:missing`, `${DAY_2}:missing`] },
  ])('mapReportRangeData maps every report day and passes undefined for missing days ($name)', ({ data, end, expected }) => {
    expect(mapReportRangeData<Point, string>(
      data,
      DAY_1,
      end,
      entry => entry.date,
      (date, entry) => `${date}:${entry?.value ?? 'missing'}`,
    )).toEqual(expected);
  });

  it('padReportRangeWithCarryForward pads every report day and carries cumulative values', () => {
    expect(padReportRangeWithCarryForward(
      [cumulativePoint(DAY_1, 2, 2), cumulativePoint(DAY_3, 1, 3)],
      DAY_1,
      DAY_3,
      entry => entry.date,
      0,
      entry => entry.cumulative,
      (date, cumulative) => cumulativePoint(date, 0, cumulative),
    )).toEqual([cumulativePoint(DAY_1, 2, 2), cumulativePoint(DAY_2, 0, 2), cumulativePoint(DAY_3, 1, 3)]);
  });
});
