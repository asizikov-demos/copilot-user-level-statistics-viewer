import { describe, it, expect } from 'vitest';
import { padSeriesWithDefaults, padSeriesWithCarryForward } from './timeSeries';

// ── padSeriesWithDefaults ─────────────────────────────────────────────────────

describe('padSeriesWithDefaults', () => {
  it('returns an empty array for an empty date list', () => {
    const result = padSeriesWithDefaults<number>([], new Map(), () => 0);
    expect(result).toEqual([]);
  });

  it('returns existing entries when every date is present', () => {
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03'];
    const dataMap = new Map([
      ['2024-01-01', { date: '2024-01-01', value: 10 }],
      ['2024-01-02', { date: '2024-01-02', value: 20 }],
      ['2024-01-03', { date: '2024-01-03', value: 30 }],
    ]);
    const result = padSeriesWithDefaults(dates, dataMap, date => ({ date, value: 0 }));
    expect(result).toEqual([
      { date: '2024-01-01', value: 10 },
      { date: '2024-01-02', value: 20 },
      { date: '2024-01-03', value: 30 },
    ]);
  });

  it('fills a gap in the middle with the default factory', () => {
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03'];
    const dataMap = new Map([
      ['2024-01-01', { date: '2024-01-01', value: 5 }],
      ['2024-01-03', { date: '2024-01-03', value: 15 }],
    ]);
    const result = padSeriesWithDefaults(dates, dataMap, date => ({ date, value: 0 }));
    expect(result).toEqual([
      { date: '2024-01-01', value: 5 },
      { date: '2024-01-02', value: 0 },
      { date: '2024-01-03', value: 15 },
    ]);
  });

  it('fills all dates when the data map is empty', () => {
    const dates = ['2024-01-01', '2024-01-02'];
    const result = padSeriesWithDefaults<{ date: string; count: number }>(
      dates,
      new Map(),
      date => ({ date, count: 0 }),
    );
    expect(result).toEqual([
      { date: '2024-01-01', count: 0 },
      { date: '2024-01-02', count: 0 },
    ]);
  });

  it('passes the correct date string to the default factory', () => {
    const dates = ['2024-03-01', '2024-03-02'];
    const seen: string[] = [];
    padSeriesWithDefaults<string>(dates, new Map(), date => {
      seen.push(date);
      return date;
    });
    expect(seen).toEqual(['2024-03-01', '2024-03-02']);
  });

  it('preserves explicitly stored nullish values', () => {
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03'];
    const dataMap = new Map<string, string | null | undefined>([
      ['2024-01-01', null],
      ['2024-01-02', undefined],
    ]);

    const result = padSeriesWithDefaults(dates, dataMap, date => `default-${date}`);

    expect(result).toEqual([null, undefined, 'default-2024-01-03']);
  });
});

// ── padSeriesWithCarryForward ─────────────────────────────────────────────────

describe('padSeriesWithCarryForward', () => {
  type Entry = { date: string; value: number; cumulative: number };

  const makeEntry = (date: string, value: number, cumulative: number): Entry => ({
    date, value, cumulative,
  });

  it('returns an empty array for an empty date list', () => {
    const result = padSeriesWithCarryForward<Entry, number>(
      [],
      new Map(),
      0,
      (entry) => entry.cumulative,
      (date, cum) => makeEntry(date, 0, cum),
    );
    expect(result).toEqual([]);
  });

  it('returns existing entries when every date is present', () => {
    const dates = ['2024-01-01', '2024-01-02'];
    const dataMap = new Map([
      ['2024-01-01', makeEntry('2024-01-01', 5, 5)],
      ['2024-01-02', makeEntry('2024-01-02', 3, 8)],
    ]);
    const result = padSeriesWithCarryForward(
      dates,
      dataMap,
      0,
      (e) => e.cumulative,
      (date, cum) => makeEntry(date, 0, cum),
    );
    expect(result).toEqual([
      makeEntry('2024-01-01', 5, 5),
      makeEntry('2024-01-02', 3, 8),
    ]);
  });

  it('carries forward cumulative value across a gap in the middle', () => {
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03'];
    const dataMap = new Map([
      ['2024-01-01', makeEntry('2024-01-01', 5, 5)],
      ['2024-01-03', makeEntry('2024-01-03', 2, 7)],
    ]);
    const result = padSeriesWithCarryForward(
      dates,
      dataMap,
      0,
      (e) => e.cumulative,
      (date, cum) => makeEntry(date, 0, cum),
    );
    expect(result).toEqual([
      makeEntry('2024-01-01', 5, 5),
      makeEntry('2024-01-02', 0, 5), // carried from 2024-01-01
      makeEntry('2024-01-03', 2, 7),
    ]);
  });

  it('carries forward the initial value when data is empty', () => {
    const dates = ['2024-01-01', '2024-01-02'];
    const result = padSeriesWithCarryForward<Entry, number>(
      dates,
      new Map(),
      42,
      (e) => e.cumulative,
      (date, cum) => makeEntry(date, 0, cum),
    );
    expect(result).toEqual([
      makeEntry('2024-01-01', 0, 42),
      makeEntry('2024-01-02', 0, 42),
    ]);
  });

  it('carries forward across multiple consecutive missing days', () => {
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04'];
    const dataMap = new Map([
      ['2024-01-01', makeEntry('2024-01-01', 10, 10)],
      ['2024-01-04', makeEntry('2024-01-04', 4, 14)],
    ]);
    const result = padSeriesWithCarryForward(
      dates,
      dataMap,
      0,
      (e) => e.cumulative,
      (date, cum) => makeEntry(date, 0, cum),
    );
    expect(result[1].cumulative).toBe(10); // carried from day 1
    expect(result[2].cumulative).toBe(10); // still carried
    expect(result[3].cumulative).toBe(14); // real value
  });

  it('treats explicitly stored undefined as present when carrying forward', () => {
    const dates = ['2024-01-01', '2024-01-02'];
    const dataMap = new Map<string, string | undefined>([
      ['2024-01-01', undefined],
    ]);

    const result = padSeriesWithCarryForward<string | undefined, number>(
      dates,
      dataMap,
      0,
      (entry, previous) => entry === undefined ? previous + 1 : previous,
      (_date, carried) => `default-${carried}`,
    );

    expect(result).toEqual([undefined, 'default-1']);
  });
});
