import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface CliAdoptionReadModel {
  stats: AggregatedMetrics['stats'];
  dailyCliSessionData: AggregatedMetrics['dailyCliSessionData'];
  dailyCliTokenData: AggregatedMetrics['dailyCliTokenData'];
  dailyCliAdoptionTrend: AggregatedMetrics['dailyCliAdoptionTrend'];
  cliModelEntries: NonNullable<
    AggregatedMetrics['modelBreakdownData']['cliModels']
  >;
  cliModelDates: string[];
  cliModelTotal: number;
  cliShare: number;
}

export function selectCliAdoptionReadModel(
  metrics: AggregatedMetrics
): CliAdoptionReadModel {
  const { stats, dailyCliSessionData, dailyCliTokenData, dailyCliAdoptionTrend } =
    metrics;
  const { cliModels = [], dates, cliTotal = 0 } = metrics.modelBreakdownData;

  return {
    stats,
    dailyCliSessionData,
    dailyCliTokenData,
    dailyCliAdoptionTrend,
    cliModelEntries: cliModels,
    cliModelDates:
      dailyCliSessionData.length > 0
        ? dailyCliSessionData.map((entry) => entry.date)
        : dates,
    cliModelTotal: cliTotal,
    cliShare:
      stats.uniqueUsers > 0
        ? Math.round((stats.cliUsers / stats.uniqueUsers) * 1000) / 10
        : 0,
  };
}
