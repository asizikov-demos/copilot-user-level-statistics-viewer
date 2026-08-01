import type { AggregatedMetrics } from '../types/aggregatedMetrics';
import type {
  ModelCategoryDetailRow,
  ModelCategoryUsageEntry,
  ModelDailyUsageEntry,
  ModelUsageCategory,
} from '../types/metrics';
import { getModelCategory, MODEL_CATEGORY_ORDER } from '../domain/modelConfig';
import { formatModelDisplayName } from '../utils/formatters';

export interface ModelCategoryTable {
  category: ModelUsageCategory;
  users: number;
  interactions: number;
  sharePercentage: number;
  rows: ModelCategoryDetailRow[];
}

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
  categoryTables: ModelCategoryTable[];
}

function buildCategoryTables(
  allModels: ModelDailyUsageEntry[],
  modelCategories: ModelCategoryUsageEntry[],
  modelTotal: number
): ModelCategoryTable[] {
  const modelsByCategory = new Map<ModelUsageCategory, ModelDailyUsageEntry[]>();
  for (const entry of allModels) {
    const category = getModelCategory(entry.model) ?? 'Uncategorized';
    const list = modelsByCategory.get(category) ?? [];
    list.push(entry);
    modelsByCategory.set(category, list);
  }

  const categoryEntries = new Map(modelCategories.map(entry => [entry.category, entry]));

  return MODEL_CATEGORY_ORDER.flatMap(category => {
    const models = modelsByCategory.get(category);
    if (!models || models.length === 0) return [];

    const categoryEntry = categoryEntries.get(category);
    const interactions = categoryEntry?.total ?? models.reduce((sum, entry) => sum + entry.total, 0);

    const rows: ModelCategoryDetailRow[] = models.map(entry => ({
      model: entry.model,
      displayName: formatModelDisplayName(entry.model),
      interactions: entry.total,
      sharePercentage: modelTotal > 0 ? (entry.total / modelTotal) * 100 : 0,
      users: entry.users,
    }));

    return [{
      category,
      users: categoryEntry?.users ?? 0,
      interactions,
      sharePercentage: modelTotal > 0 ? (interactions / modelTotal) * 100 : 0,
      rows,
    }];
  });
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
    categoryTables: buildCategoryTables(allModels, modelCategories, modelTotal),
  };
}
