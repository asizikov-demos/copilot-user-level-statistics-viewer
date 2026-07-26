import type { AggregatedMetrics } from '../../types/aggregatedMetrics';
import type { CopilotMetrics } from '../../types/metrics';
import {
  accumulateIDEStats,
  computeIDEStatsData,
  createIDEStatsAccumulator,
  markCliUser,
  type IDEStatsAccumulator,
} from '../calculators/ideStatsCalculator';
import {
  accumulatePluginVersion,
  computePluginVersionData,
  createPluginVersionAccumulator,
  type PluginVersionAccumulator,
} from '../calculators/pluginVersionCalculator';
import {
  accumulateIdeUser,
  type StatsAccumulator,
} from '../calculators/statsCalculator';

export interface ClientAggregationAccumulator {
  ideStats: IDEStatsAccumulator;
  pluginVersions: PluginVersionAccumulator;
}

export type ClientAggregationResult = Pick<
  AggregatedMetrics,
  | 'ideStats'
  | 'multiIDEUsersCount'
  | 'totalUniqueIDEUsers'
  | 'pluginVersionData'
>;

export function createClientAggregationAccumulator(): ClientAggregationAccumulator {
  return {
    ideStats: createIDEStatsAccumulator(),
    pluginVersions: createPluginVersionAccumulator(),
  };
}

export function accumulateClientAggregation(
  accumulator: ClientAggregationAccumulator,
  statsAccumulator: StatsAccumulator,
  metric: CopilotMetrics
): void {
  for (const ideTotal of metric.totals_by_ide) {
    accumulateIdeUser(statsAccumulator, ideTotal.ide, metric.user_id);
    accumulateIDEStats(accumulator.ideStats, metric.user_id, ideTotal);
    accumulatePluginVersion(
      accumulator.pluginVersions,
      metric.user_login,
      ideTotal
    );
  }

  if (metric.used_cli) {
    markCliUser(accumulator.ideStats, metric.user_id);
  }
}

export function finalizeClientAggregation(
  accumulator: ClientAggregationAccumulator
): ClientAggregationResult {
  return {
    ...computeIDEStatsData(accumulator.ideStats),
    pluginVersionData: computePluginVersionData(accumulator.pluginVersions),
  };
}
