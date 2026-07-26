import type { CliMetricsSlice } from '../../types/aggregatedMetrics';
import type { CopilotMetrics } from '../../types/metrics';
import {
  accumulateCliUsage,
  computeCliAdoptionTrend,
  computeDailyCliSessionData,
  computeDailyCliTokenData,
  createCliUsageAccumulator,
  ensureCliDates,
  type CliUsageAccumulator,
  type CliUsageForDownstreamCalculations,
} from '../calculators/cliUsageCalculator';

export interface CliAggregationAccumulator {
  usage: CliUsageAccumulator;
}

export type CliAggregationResult = CliMetricsSlice;

export function createCliAggregationAccumulator(): CliAggregationAccumulator {
  return {
    usage: createCliUsageAccumulator(),
  };
}

export function accumulateCliAggregation(
  accumulator: CliAggregationAccumulator,
  metric: CopilotMetrics
): void {
  ensureCliDates(accumulator.usage, metric.day);
  accumulateCliUsage(accumulator.usage, metric.day, metric.user_id, metric);
}

export function getCliUsageForDownstreamCalculations(
  accumulator: CliAggregationAccumulator
): CliUsageForDownstreamCalculations {
  return accumulator.usage;
}

export function finalizeCliAggregation(
  accumulator: CliAggregationAccumulator
): CliAggregationResult {
  return {
    dailyCliSessionData: computeDailyCliSessionData(accumulator.usage),
    dailyCliTokenData: computeDailyCliTokenData(accumulator.usage),
    dailyCliAdoptionTrend: computeCliAdoptionTrend(accumulator.usage),
  };
}
