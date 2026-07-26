import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface ClientsReadModel {
  ideStats: AggregatedMetrics['ideStats'];
  multiIDEUsersCount: number;
  totalUniqueIDEUsers: number;
  cliUsers: number;
  cliSessions: number;
  cliLocAdded: number;
  cliLocDeleted: number;
}

export interface ClientVersionsReadModel {
  pluginVersionData: AggregatedMetrics['pluginVersionData'];
  reportStartDay: string;
}

export function selectClientsReadModel(
  metrics: AggregatedMetrics
): ClientsReadModel {
  return {
    ideStats: metrics.ideStats,
    multiIDEUsersCount: metrics.multiIDEUsersCount,
    totalUniqueIDEUsers: metrics.totalUniqueIDEUsers,
    cliUsers: metrics.stats.cliUsers,
    cliSessions: metrics.dailyCliSessionData.reduce(
      (sum, day) => sum + day.sessionCount,
      0
    ),
    cliLocAdded: metrics.cliImpactData.reduce(
      (sum, day) => sum + day.locAdded,
      0
    ),
    cliLocDeleted: metrics.cliImpactData.reduce(
      (sum, day) => sum + day.locDeleted,
      0
    ),
  };
}

export function selectClientVersionsReadModel(
  metrics: AggregatedMetrics
): ClientVersionsReadModel {
  return {
    pluginVersionData: metrics.pluginVersionData,
    reportStartDay: metrics.stats.reportStartDay,
  };
}
