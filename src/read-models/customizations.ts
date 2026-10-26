import type { AggregatedMetrics } from '../types/aggregatedMetrics';
import type { CustomizationsMetricsSlice } from '../types/customizationsOverview';

export interface CustomizationsReadModel {
  dates: CustomizationsMetricsSlice['dates'];
  types: CustomizationsMetricsSlice['types'];
  totalUsers: number;
  cliUsers: number;
}

export function selectCustomizationsReadModel(
  metrics: AggregatedMetrics
): CustomizationsReadModel {
  const { stats } = metrics.overview;
  const { dates, types } = metrics.customizations;
  return { dates, types, totalUsers: stats.uniqueUsers, cliUsers: stats.cliUsers };
}
