import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface UsersReadModel {
  users: AggregatedMetrics['userSummaries'];
}

export function selectUsersReadModel(metrics: AggregatedMetrics): UsersReadModel {
  return {
    users: metrics.userSummaries,
  };
}
