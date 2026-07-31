import type { CliUsageForDownstreamCalculations } from './cliUsageCalculator';
import { compareDatesAsc } from './statsCalculators';

export type CliDaySession = {
  readonly sessionCount: number;
  readonly requestCount: number;
  readonly promptCount: number;
  readonly users: ReadonlySet<number>;
};

/**
 * Builds a sorted array of unique dates that is the union of the given local dates
 * and any dates present in the CLI accumulator's daily sessions.
 * This ensures CLI-only days still appear in downstream daily series.
 */
export function buildSortedCliAwareDates(
  localDates: Iterable<string>,
  cliAccumulator?: CliUsageForDownstreamCalculations
): string[] {
  const allDates = new Set<string>(localDates);
  if (cliAccumulator) {
    for (const date of cliAccumulator.dailySessions.keys()) {
      allDates.add(date);
    }
  }
  return Array.from(allDates).sort(compareDatesAsc);
}

/**
 * Returns the CLI per-day session data for a specific date, if available.
 */
export function getCliDayData(
  date: string,
  cliAccumulator?: CliUsageForDownstreamCalculations
): CliDaySession | undefined {
  return cliAccumulator?.dailySessions.get(date);
}
