import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface ModelDetailsReadModel {
  allModels: AggregatedMetrics['modelBreakdownData']['allModels'];
  modelCategories: AggregatedMetrics['modelBreakdownData']['modelCategories'];
  autoModels: NonNullable<AggregatedMetrics['modelBreakdownData']['autoModels']>;
  autoModeAdoptionTrend: NonNullable<
    AggregatedMetrics['modelBreakdownData']['autoModeAdoptionTrend']
  >;
  dates: AggregatedMetrics['modelBreakdownData']['dates'];
  modelTotal: number;
  autoTotal: number;
}

export function selectModelDetailsReadModel(
  metrics: AggregatedMetrics
): ModelDetailsReadModel {
  const {
    allModels,
    modelCategories,
    autoModels = [],
    autoModeAdoptionTrend = [],
    dates,
    modelTotal,
  } = metrics.modelBreakdownData;

  return {
    allModels,
    modelCategories,
    autoModels,
    autoModeAdoptionTrend,
    dates,
    modelTotal,
    autoTotal: autoModels.reduce((sum, entry) => sum + entry.total, 0),
  };
}
