import type { AutoModeAdoptionTrendEntry, ModelBreakdownData, ModelDailyUsageEntry } from '../../types/metrics';
import { isCliFeature } from '../featureCategories';
import { isActiveAutoModeFeature } from '../autoMode';
import { classifyModelRequest } from '../modelConfig';
import { compareDatesAsc } from './statsCalculators';
import { computeAdoptionTrendFromUserSets } from './adoptionTrendHelpers';

interface ModelAccEntry {
  total: number;
  dailyData: Map<string, number>;
}

export interface ModelBreakdownAccumulator {
  allModels: Map<string, ModelAccEntry>;
  autoModels: Map<string, ModelAccEntry>;
  cliModels: Map<string, ModelAccEntry>;
  autoModeUsersByDate: Map<string, Set<number>>;
  modelTotal: number;
  cliTotal: number;
  unknownTotal: number;
  allDates: Set<string>;
}

export function createModelBreakdownAccumulator(): ModelBreakdownAccumulator {
  return {
    allModels: new Map(),
    autoModels: new Map(),
    cliModels: new Map(),
    autoModeUsersByDate: new Map(),
    modelTotal: 0,
    cliTotal: 0,
    unknownTotal: 0,
    allDates: new Set(),
  };
}

function accumulateModelEntry(
  modelsMap: Map<string, ModelAccEntry>,
  model: string,
  date: string,
  count: number
): void {
  if (!modelsMap.has(model)) {
    modelsMap.set(model, { total: 0, dailyData: new Map() });
  }
  const entry = modelsMap.get(model)!;
  entry.total += count;
  entry.dailyData.set(date, (entry.dailyData.get(date) || 0) + count);
}

export function accumulateModelBreakdown(
  accumulator: ModelBreakdownAccumulator,
  date: string,
  userId: number,
  modelFeature: {
    model: string;
    feature: string;
    user_initiated_interaction_count: number;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
  }
): void {
  const interactionCount = modelFeature.user_initiated_interaction_count || 0;
  const activityCount = (modelFeature.code_generation_activity_count || 0) + (modelFeature.code_acceptance_activity_count || 0);
  const { normalizedModel, bucket } = classifyModelRequest(modelFeature.model);

  if (isCliFeature(modelFeature.feature) && interactionCount > 0) {
    accumulator.allDates.add(date);
    accumulator.cliTotal += interactionCount;
    accumulateModelEntry(accumulator.cliModels, normalizedModel, date, interactionCount);
  }

  if (isActiveAutoModeFeature(modelFeature)) {
    accumulator.allDates.add(date);
    if (!accumulator.autoModeUsersByDate.has(date)) {
      accumulator.autoModeUsersByDate.set(date, new Set());
    }
    accumulator.autoModeUsersByDate.get(date)!.add(userId);

    const autoUsageCount = interactionCount > 0 ? interactionCount : activityCount;
    accumulateModelEntry(accumulator.autoModels, normalizedModel, date, autoUsageCount);
    return;
  }

  if (!interactionCount) {
    return;
  }

  accumulator.allDates.add(date);
  accumulator.modelTotal += interactionCount;
  accumulateModelEntry(accumulator.allModels, normalizedModel || 'unknown', date, interactionCount);

  if (bucket === 'unknown') {
    accumulator.unknownTotal += interactionCount;
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

function computeAutoModeAdoptionTrend(
  dates: string[],
  usersByDate: Map<string, Set<number>>
): AutoModeAdoptionTrendEntry[] {
  const dateUserSets = dates.map((date) => ({
    date,
    users: usersByDate.get(date) ?? new Set<number>(),
  }));
  return computeAdoptionTrendFromUserSets(dateUserSets);
}

export function computeModelBreakdownData(
  accumulator: ModelBreakdownAccumulator
): ModelBreakdownData {
  const dates = Array.from(accumulator.allDates).sort(
    compareDatesAsc
  );

  return {
    allModels: buildModelEntries(accumulator.allModels),
    autoModels: buildModelEntries(accumulator.autoModels),
    cliModels: buildModelEntries(accumulator.cliModels),
    autoModeAdoptionTrend: computeAutoModeAdoptionTrend(dates, accumulator.autoModeUsersByDate),
    dates,
    modelTotal: accumulator.modelTotal,
    cliTotal: accumulator.cliTotal,
    unknownTotal: accumulator.unknownTotal,
  };
}
