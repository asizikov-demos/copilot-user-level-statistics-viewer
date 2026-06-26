import { generateDateRange } from './formatters';

/**
 * Shared time-series utilities for report-range generation and keyed series padding.
 *
 * These helpers centralise the "iterate every day in the report window and fill
 * missing days with a default value" pattern used by several chart and view
 * components. Using them keeps zero-fill behaviour consistent when report-range
 * rules change, and keeps display padding separate from aggregate maths.
 */

/**
 * Pads a keyed data series across the supplied date list, filling any missing
 * date with the value returned by `getDefault`.
 *
 * The input `dates` list is typically produced by `generateDateRange` from
 * `utils/formatters`.
 *
 * @param dates - Ordered list of YYYY-MM-DD strings for the full report window.
 * @param dataMap - Map from YYYY-MM-DD to the existing data entry for that date.
 * @param getDefault - Factory called for every date not present in `dataMap`;
 *   receives the missing date string and must return a suitable zero-fill entry.
 * @returns Array with one entry per date in `dates`, gaps filled via `getDefault`.
 */
export function padSeriesWithDefaults<T>(
  dates: string[],
  dataMap: Map<string, T>,
  getDefault: (date: string) => T,
): T[] {
  return dates.map(date => {
    const existing = dataMap.get(date);
    if (existing !== undefined || dataMap.has(date)) {
      return existing as T;
    }
    return getDefault(date);
  });
}

export function padReportRangeWithDefaults<T>(
  data: T[],
  reportStartDay: string,
  reportEndDay: string,
  getDate: (entry: T) => string,
  getDefault: (date: string) => T,
): T[] {
  const reportDays = generateDateRange(reportStartDay, reportEndDay);
  const dataMap = new Map(data.map(entry => [getDate(entry), entry]));
  return padSeriesWithDefaults(reportDays, dataMap, getDefault);
}

/**
 * Pads a keyed data series across the supplied date list, carrying forward a
 * piece of state across missing days.
 *
 * Useful when a field on missing entries should inherit the last known value
 * (e.g. a running cumulative total) rather than resetting to zero.
 *
 * @param dates - Ordered list of YYYY-MM-DD strings for the full report window.
 * @param dataMap - Map from YYYY-MM-DD to the existing data entry for that date.
 * @param initialCarried - Starting value for the carried state before any entry
 *   has been seen.
 * @param updateCarried - Called when a real entry exists; extracts the new
 *   carry-forward state from the entry and previous state.
 * @param getDefault - Called for every date not present in `dataMap`; receives
 *   the missing date and the most-recently carried state.
 * @returns Array with one entry per date in `dates`, gaps filled via `getDefault`.
 */
export function padSeriesWithCarryForward<T, C>(
  dates: string[],
  dataMap: Map<string, T>,
  initialCarried: C,
  updateCarried: (entry: T, prev: C) => C,
  getDefault: (date: string, carried: C) => T,
): T[] {
  let carried = initialCarried;
  return dates.map(date => {
    const existing = dataMap.get(date);
    if (existing !== undefined || dataMap.has(date)) {
      const entry = existing as T;
      carried = updateCarried(entry, carried);
      return entry;
    }
    return getDefault(date, carried);
  });
}

export function padReportRangeWithCarryForward<T, C>(
  data: T[],
  reportStartDay: string,
  reportEndDay: string,
  getDate: (entry: T) => string,
  initialCarried: C,
  updateCarried: (entry: T, prev: C) => C,
  getDefault: (date: string, carried: C) => T,
): T[] {
  const reportDays = generateDateRange(reportStartDay, reportEndDay);
  const dataMap = new Map(data.map(entry => [getDate(entry), entry]));
  return padSeriesWithCarryForward(
    reportDays,
    dataMap,
    initialCarried,
    updateCarried,
    getDefault,
  );
}
