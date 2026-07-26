import type { AggregatedMetrics } from '../types/aggregatedMetrics';

export interface ModelDetailsReadModel {
  allModels: AggregatedMetrics['models']['modelBreakdownData']['allModels'];
  modelCategories: AggregatedMetrics['models']['modelBreakdownData']['modelCategories'];
  autoModels: NonNullable<AggregatedMetrics['models']['modelBreakdownData']['autoModels']>;
  autoModeAdoptionTrend: NonNullable<
    AggregatedMetrics['models']['modelBreakdownData']['autoModeAdoptionTrend']
  >;
  dates: AggregatedMetrics['models']['modelBreakdownData']['dates'];
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
  } = metrics.models.modelBreakdownData;

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
