import type { AutoModeAdoptionTrendEntry, ModelBreakdownData, ModelDailyUsageEntry } from '../../types/metrics';
import { isCliFeature } from '../featureCategories';
import { KNOWN_MODELS } from '../modelConfig';
import { compareDatesAsc } from './statsCalculators';

interface ModelAccEntry {
  total: number;
  dailyData: Map<string, number>;
}

export interface ModelBreakdownAccumulator {
  modelClassification: Record<string, boolean>;
  premiumModels: Map<string, ModelAccEntry>;
  standardModels: Map<string, ModelAccEntry>;
  autoModels: Map<string, ModelAccEntry>;
  cliModels: Map<string, ModelAccEntry>;
  autoModeUsersByDate: Map<string, Set<number>>;
  premiumTotal: number;
  standardTotal: number;
  cliTotal: number;
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
    autoModels: new Map(),
    cliModels: new Map(),
    autoModeUsersByDate: new Map(),
    premiumTotal: 0,
    standardTotal: 0,
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
  const normalizedModel = modelFeature.model.trim().toLowerCase();

  if (isCliFeature(modelFeature.feature) && interactionCount > 0) {
    accumulator.allDates.add(date);
    accumulator.cliTotal += interactionCount;
    accumulateModelEntry(accumulator.cliModels, normalizedModel, date, interactionCount);
  }

  if (normalizedModel === 'auto' && (interactionCount > 0 || activityCount > 0)) {
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
  const classification = accumulator.modelClassification[normalizedModel];

  if (classification === true) {
    accumulator.premiumTotal += interactionCount;
    accumulateModelEntry(accumulator.premiumModels, normalizedModel, date, interactionCount);
  } else if (classification === false) {
    accumulator.standardTotal += interactionCount;
    accumulateModelEntry(accumulator.standardModels, normalizedModel, date, interactionCount);
  } else {
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
  const seenBefore = new Set<number>();

  return dates.map((date) => {
    const users = usersByDate.get(date) ?? new Set<number>();
    let newUsers = 0;
    let returningUsers = 0;

    for (const userId of users) {
      if (seenBefore.has(userId)) {
        returningUsers++;
      } else {
        newUsers++;
        seenBefore.add(userId);
      }
    }

    return {
      date,
      newUsers,
      returningUsers,
      totalActiveUsers: newUsers + returningUsers,
      cumulativeUsers: seenBefore.size,
    };
  });
}

export function computeModelBreakdownData(
  accumulator: ModelBreakdownAccumulator
): ModelBreakdownData {
  const dates = Array.from(accumulator.allDates).sort(
    compareDatesAsc
  );

  return {
    premiumModels: buildModelEntries(accumulator.premiumModels),
    standardModels: buildModelEntries(accumulator.standardModels),
    autoModels: buildModelEntries(accumulator.autoModels),
    cliModels: buildModelEntries(accumulator.cliModels),
    autoModeAdoptionTrend: computeAutoModeAdoptionTrend(dates, accumulator.autoModeUsersByDate),
    dates,
    premiumTotal: accumulator.premiumTotal,
    standardTotal: accumulator.standardTotal,
    cliTotal: accumulator.cliTotal,
    unknownTotal: accumulator.unknownTotal,
  };
}
