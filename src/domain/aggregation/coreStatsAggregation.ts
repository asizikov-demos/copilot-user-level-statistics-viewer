import type { OverviewMetricsSlice } from '../../types/aggregatedMetrics';
import type { CopilotMetrics } from '../../types/metrics';
import {
  accumulateUserUsage,
  computeStats,
  createStatsAccumulator,
  type StatsAccumulator,
} from '../calculators/statsCalculator';

export interface CoreStatsAggregationAccumulator {
  stats: StatsAccumulator;
  filteredMetricsCount: number;
}

export type CoreStatsAggregationResult = Pick<OverviewMetricsSlice, 'stats'>;

export function createCoreStatsAggregationAccumulator(
): CoreStatsAggregationAccumulator {
  return {
    stats: createStatsAccumulator(),
    filteredMetricsCount: 0,
  };
}

export function getStatsAccumulatorForDimensions(
  accumulator: CoreStatsAggregationAccumulator
): StatsAccumulator {
  return accumulator.stats;
}

export function accumulateCoreStatsAggregation(
  accumulator: CoreStatsAggregationAccumulator,
  metric: CopilotMetrics,
  usedCopilotCloudAgent: boolean
): void {
  if (accumulator.filteredMetricsCount === 0) {
    accumulator.stats.reportStartDay = metric.report_start_day;
    accumulator.stats.reportEndDay = metric.report_end_day;
  }

  accumulator.filteredMetricsCount++;
  accumulateUserUsage(
    accumulator.stats,
    metric.user_id,
    metric.used_chat,
    metric.used_agent,
    metric.used_cli,
    metric.used_copilot_app ?? false,
    usedCopilotCloudAgent
  );
}

export function finalizeCoreStatsAggregation(
  accumulator: CoreStatsAggregationAccumulator
): CoreStatsAggregationResult {
  return {
    stats: computeStats(
      accumulator.stats,
      accumulator.filteredMetricsCount
    ),
  };
}
