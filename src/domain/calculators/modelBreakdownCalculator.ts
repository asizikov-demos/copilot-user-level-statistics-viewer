import type { ModelBreakdownData, ModelDailyUsageEntry } from '../../types/metrics';
import { KNOWN_MODELS } from '../modelConfig';

interface ModelAccEntry {
  total: number;
  dailyData: Map<string, number>;
}

export interface ModelBreakdownAccumulator {
  modelClassification: Record<string, boolean>;
  premiumModels: Map<string, ModelAccEntry>;
  standardModels: Map<string, ModelAccEntry>;
  premiumTotal: number;
  standardTotal: number;
  unknownTotal: number;
  allDates: Set<string>;
}

export function createModelBreakdownAccumulator(): ModelBreakdownAccumulator {
  const modelClassification = KNOWN_MODELS.reduce<Record<string, boolean>>(
    (acc, model) => {
      acc[model.name.toLowerCase()] = model.isPremium;
      return acc;
    },
    {}
  );

  return {
    modelClassification,
    premiumModels: new Map(),
    standardModels: new Map(),
    premiumTotal: 0,
    standardTotal: 0,
    unknownTotal: 0,
    allDates: new Set(),
  };
}

export function accumulateModelBreakdown(
  accumulator: ModelBreakdownAccumulator,
  date: string,
  modelFeature: {
    model: string;
    user_initiated_interaction_count: number;
  }
): void {
  const count = modelFeature.user_initiated_interaction_count || 0;
  if (!count) return;

  accumulator.allDates.add(date);
  const normalizedModel = modelFeature.model.trim().toLowerCase();
  const classification = accumulator.modelClassification[normalizedModel];

  if (classification === true) {
    accumulator.premiumTotal += count;
    if (!accumulator.premiumModels.has(normalizedModel)) {
      accumulator.premiumModels.set(normalizedModel, { total: 0, dailyData: new Map() });
    }
    const entry = accumulator.premiumModels.get(normalizedModel)!;
    entry.total += count;
    entry.dailyData.set(date, (entry.dailyData.get(date) || 0) + count);
  } else if (classification === false) {
    accumulator.standardTotal += count;
    if (!accumulator.standardModels.has(normalizedModel)) {
      accumulator.standardModels.set(normalizedModel, { total: 0, dailyData: new Map() });
    }
    const entry = accumulator.standardModels.get(normalizedModel)!;
    entry.total += count;
    entry.dailyData.set(date, (entry.dailyData.get(date) || 0) + count);
  } else {
    accumulator.unknownTotal += count;
  }
}

function buildModelEntries(
  modelsMap: Map<string, ModelAccEntry>
): ModelDailyUsageEntry[] {
  return Array.from(modelsMap.entries())
    .map(([model, entry]) => {
      const dailyData: Record<string, number> = {};
      for (const [date, count] of entry.dailyData) {
        dailyData[date] = count;
      }
      return {
        model,
        total: entry.total,
        dailyData,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function computeModelBreakdownData(
  accumulator: ModelBreakdownAccumulator
): ModelBreakdownData {
  const dates = Array.from(accumulator.allDates).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return {
    premiumModels: buildModelEntries(accumulator.premiumModels),
    standardModels: buildModelEntries(accumulator.standardModels),
    dates,
    premiumTotal: accumulator.premiumTotal,
    standardTotal: accumulator.standardTotal,
    unknownTotal: accumulator.unknownTotal,
  };
}
