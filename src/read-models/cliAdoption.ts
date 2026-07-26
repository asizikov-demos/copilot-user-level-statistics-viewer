import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface CliAdoptionReadModel {
  stats: AggregatedMetrics['overview']['stats'];
  dailyCliSessionData: AggregatedMetrics['cli']['dailyCliSessionData'];
  dailyCliTokenData: AggregatedMetrics['cli']['dailyCliTokenData'];
  dailyCliAdoptionTrend: AggregatedMetrics['cli']['dailyCliAdoptionTrend'];
  cliModelEntries: NonNullable<
    AggregatedMetrics['models']['modelBreakdownData']['cliModels']
  >;
  cliModelDates: string[];
  cliModelTotal: number;
  cliShare: number;
}

export function selectCliAdoptionReadModel(
  metrics: AggregatedMetrics
): CliAdoptionReadModel {
  const { stats } = metrics.overview;
  const { dailyCliSessionData, dailyCliTokenData, dailyCliAdoptionTrend } =
    metrics.cli;
  const { cliModels = [], dates, cliTotal = 0 } =
    metrics.models.modelBreakdownData;

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
