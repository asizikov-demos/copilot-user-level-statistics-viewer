import type { ClientsMetricsSlice } from '../../types/aggregatedMetrics';
import type { CopilotMetrics } from '../../types/metrics';
import {
  accumulateReportingQuality,
  computeReportingQuality,
  createReportingQualityAccumulator,
  type ReportingQualityAccumulator,
} from '../calculators/reportingQualityCalculator';
import {
  accumulateClientTraffic,
  computeClientTraffic,
  createClientTrafficAccumulator,
  type ClientTrafficAccumulator,
} from '../calculators/clientTrafficCalculator';
import {
  accumulateClientTelemetry,
  computeClientTelemetryWarnings,
  createClientTelemetryAccumulator,
  type ClientTelemetryAccumulator,
} from '../calculators/clientTelemetryCalculator';
import {
  accumulateIDEStats,
  computeIDEStatsData,
  createIDEStatsAccumulator,
  markCliUser,
  type IDEStatsAccumulator,
} from '../calculators/ideStatsCalculator';
import {
  accumulateDailyIdeUsers,
  computeDailyIdeUsersData,
  createDailyIdeUsersAccumulator,
  type DailyIdeUsersAccumulator,
} from '../calculators/dailyIdeUsersCalculator';
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
  reportingQuality: ReportingQualityAccumulator;
  traffic: ClientTrafficAccumulator;
  telemetry: ClientTelemetryAccumulator;
  ideStats: IDEStatsAccumulator;
  pluginVersions: PluginVersionAccumulator;
  dailyIdeUsers: DailyIdeUsersAccumulator;
}

export type ClientAggregationResult = ClientsMetricsSlice;

export function createClientAggregationAccumulator(): ClientAggregationAccumulator {
  return {
    reportingQuality: createReportingQualityAccumulator(),
    traffic: createClientTrafficAccumulator(),
    telemetry: createClientTelemetryAccumulator(),
    ideStats: createIDEStatsAccumulator(),
    pluginVersions: createPluginVersionAccumulator(),
    dailyIdeUsers: createDailyIdeUsersAccumulator(),
  };
}

export function accumulateClientAggregation(
  accumulator: ClientAggregationAccumulator,
  statsAccumulator: StatsAccumulator,
  metric: CopilotMetrics
): void {
  accumulateReportingQuality(accumulator.reportingQuality, metric);
  accumulateClientTraffic(accumulator.traffic, metric);
  for (const ideTotal of metric.totals_by_ide) {
    accumulateClientTelemetry(accumulator.telemetry, metric.user_id, ideTotal);
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

  accumulateDailyIdeUsers(accumulator.dailyIdeUsers, metric);
}

export function finalizeClientAggregation(
  accumulator: ClientAggregationAccumulator
): ClientAggregationResult {
  return {
    reportingQuality: computeReportingQuality(accumulator.reportingQuality),
    traffic: computeClientTraffic(accumulator.traffic),
    telemetryWarnings: computeClientTelemetryWarnings(accumulator.telemetry),
    ...computeIDEStatsData(accumulator.ideStats),
    pluginVersionData: computePluginVersionData(accumulator.pluginVersions),
    dailyIdeUsersData: computeDailyIdeUsersData(accumulator.dailyIdeUsers),
  };
}
