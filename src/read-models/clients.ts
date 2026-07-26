import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface ClientsReadModel {
  ideStats: AggregatedMetrics['clients']['ideStats'];
  multiIDEUsersCount: number;
  totalUniqueIDEUsers: number;
  cliUsers: number;
  cliSessions: number;
  cliLocAdded: number;
  cliLocDeleted: number;
}

export interface ClientVersionsReadModel {
  pluginVersionData: AggregatedMetrics['clients']['pluginVersionData'];
  reportStartDay: string;
}

export function selectClientsReadModel(
  metrics: AggregatedMetrics
): ClientsReadModel {
  return {
    ideStats: metrics.clients.ideStats,
    multiIDEUsersCount: metrics.clients.multiIDEUsersCount,
    totalUniqueIDEUsers: metrics.clients.totalUniqueIDEUsers,
    cliUsers: metrics.overview.stats.cliUsers,
    cliSessions: metrics.cli.dailyCliSessionData.reduce(
      (sum, day) => sum + day.sessionCount,
      0
    ),
    cliLocAdded: metrics.impact.cliImpactData.reduce(
      (sum, day) => sum + day.locAdded,
      0
    ),
    cliLocDeleted: metrics.impact.cliImpactData.reduce(
      (sum, day) => sum + day.locDeleted,
      0
    ),
  };
}

export function selectClientVersionsReadModel(
  metrics: AggregatedMetrics
): ClientVersionsReadModel {
  return {
    pluginVersionData: metrics.clients.pluginVersionData,
    reportStartDay: metrics.overview.stats.reportStartDay,
  };
}
