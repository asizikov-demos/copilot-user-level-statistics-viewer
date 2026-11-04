import type { CopilotAppMetricsSlice } from '../../types/aggregatedMetrics';
import type { CopilotMetrics } from '../../types/metrics';
import {
  accumulateClientUsage,
  computeCliAdoptionTrend,
  computeDailyCliSessionData,
  computeDailyCliTokenData,
  createCliUsageAccumulator,
  ensureCliDates,
  type CliUsageAccumulator,
} from '../calculators/cliUsageCalculator';

export function createCopilotAppAggregationAccumulator(): CliUsageAccumulator {
  return createCliUsageAccumulator();
}

export function accumulateCopilotAppAggregation(
  accumulator: CliUsageAccumulator,
  metric: CopilotMetrics
): void {
  ensureCliDates(accumulator, metric.day);
  accumulateClientUsage(accumulator, metric.day, metric.user_id, metric.totals_by_copilot_app);
  if (metric.used_copilot_app || metric.totals_by_feature.some(entry => entry.feature === 'copilot_app')) {
    accumulator.dailySessions.get(metric.day)!.users.add(metric.user_id);
  }
}

export function finalizeCopilotAppAggregation(
  accumulator: CliUsageAccumulator
): CopilotAppMetricsSlice {
  return {
    dailyAppSessionData: computeDailyCliSessionData(accumulator),
    dailyAppTokenData: computeDailyCliTokenData(accumulator),
    dailyAppAdoptionTrend: computeCliAdoptionTrend(accumulator),
  };
}
