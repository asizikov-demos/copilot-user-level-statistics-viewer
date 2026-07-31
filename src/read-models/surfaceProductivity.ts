import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface SurfaceProductivityReadModel {
  reportStartDay: AggregatedMetrics['overview']['stats']['reportStartDay'];
  reportEndDay: AggregatedMetrics['overview']['stats']['reportEndDay'];
  totalActiveUsers: AggregatedMetrics['productivity']['totalActiveUsers'];
  surfaceSummaries: AggregatedMetrics['productivity']['surfaceSummaries'];
  dailyProductivity: AggregatedMetrics['productivity']['dailyProductivity'];
  cohortSummaries: AggregatedMetrics['productivity']['cohortSummaries'];
}

export function selectSurfaceProductivityReadModel(
  metrics: AggregatedMetrics
): SurfaceProductivityReadModel {
  return {
    reportStartDay: metrics.overview.stats.reportStartDay,
    reportEndDay: metrics.overview.stats.reportEndDay,
    totalActiveUsers: metrics.productivity.totalActiveUsers,
    surfaceSummaries: metrics.productivity.surfaceSummaries,
    dailyProductivity: metrics.productivity.dailyProductivity,
    cohortSummaries: metrics.productivity.cohortSummaries,
  };
}
