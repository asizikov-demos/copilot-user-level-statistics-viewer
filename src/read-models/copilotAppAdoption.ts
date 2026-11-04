import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export function selectCopilotAppAdoptionReadModel(metrics: AggregatedMetrics) {
  const { stats } = metrics.overview;
  const {
    dailyAppSessionData: dailySessionData,
    dailyAppTokenData: dailyTokenData,
    dailyAppAdoptionTrend: dailyAdoptionTrend,
  } = metrics.copilotApp;
  const { appModels = [], appTotal = 0, dates } = metrics.models.modelBreakdownData;
  const appUsers = dailyAdoptionTrend.at(-1)?.cumulativeUsers ?? 0;

  return {
    stats,
    appUsers,
    dailySessionData,
    dailyTokenData,
    dailyAdoptionTrend,
    modelEntries: appModels,
    modelDates: dailySessionData.length > 0 ? dailySessionData.map(entry => entry.date) : dates,
    modelTotal: appTotal,
    appShare: stats.uniqueUsers > 0 ? Math.round((appUsers / stats.uniqueUsers) * 1000) / 10 : 0,
  };
}

export type CopilotAppAdoptionReadModel = ReturnType<typeof selectCopilotAppAdoptionReadModel>;
