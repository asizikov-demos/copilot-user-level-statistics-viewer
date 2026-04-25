import type { AutoModeAdoptionTrendEntry, ModelBreakdownData, ModelDailyUsageEntry } from '../../types/metrics';
import { KNOWN_MODELS } from '../modelConfig';

interface ModelAccEntry {
  total: number;
  dailyData: Map<string, number>;
}

export interface ModelBreakdownAccumulator {
  modelClassification: Record<string, boolean>;
  premiumModels: Map<string, ModelAccEntry>;
  standardModels: Map<string, ModelAccEntry>;
  autoModels: Map<string, ModelAccEntry>;
  autoModeUsersByDate: Map<string, Set<number>>;
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
    autoModels: new Map(),
    autoModeUsersByDate: new Map(),
    premiumTotal: 0,
    standardTotal: 0,
    unknownTotal: 0,
    allDates: new Set(),
  };
}

export function accumulateModelBreakdown(
  accumulator: ModelBreakdownAccumulator,
  date: string,
  userId: number,
  modelFeature: {
    model: string;
    user_initiated_interaction_count: number;
    code_generation_activity_count: number;
    code_acceptance_activity_count: number;
  }
): void {
  const interactionCount = modelFeature.user_initiated_interaction_count || 0;
  const activityCount = (modelFeature.code_generation_activity_count || 0) + (modelFeature.code_acceptance_activity_count || 0);
  const normalizedModel = modelFeature.model.trim().toLowerCase();

  if (normalizedModel === 'auto' && (interactionCount > 0 || activityCount > 0)) {
    accumulator.allDates.add(date);
    if (!accumulator.autoModeUsersByDate.has(date)) {
      accumulator.autoModeUsersByDate.set(date, new Set());
    }
    accumulator.autoModeUsersByDate.get(date)!.add(userId);

    if (!accumulator.autoModels.has(normalizedModel)) {
      accumulator.autoModels.set(normalizedModel, { total: 0, dailyData: new Map() });
    }
    const entry = accumulator.autoModels.get(normalizedModel)!;
    const autoUsageCount = interactionCount > 0 ? interactionCount : activityCount;
    entry.total += autoUsageCount;
    entry.dailyData.set(date, (entry.dailyData.get(date) || 0) + autoUsageCount);
    return;
  }

  if (!interactionCount) {
    return;
  }

  accumulator.allDates.add(date);
  const classification = accumulator.modelClassification[normalizedModel];

  if (classification === true) {
    accumulator.premiumTotal += interactionCount;
    if (!accumulator.premiumModels.has(normalizedModel)) {
      accumulator.premiumModels.set(normalizedModel, { total: 0, dailyData: new Map() });
    }
    const entry = accumulator.premiumModels.get(normalizedModel)!;
    entry.total += interactionCount;
    entry.dailyData.set(date, (entry.dailyData.get(date) || 0) + interactionCount);
  } else if (classification === false) {
    accumulator.standardTotal += interactionCount;
    if (!accumulator.standardModels.has(normalizedModel)) {
      accumulator.standardModels.set(normalizedModel, { total: 0, dailyData: new Map() });
    }
    const entry = accumulator.standardModels.get(normalizedModel)!;
    entry.total += interactionCount;
    entry.dailyData.set(date, (entry.dailyData.get(date) || 0) + interactionCount);
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
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return {
    premiumModels: buildModelEntries(accumulator.premiumModels),
    standardModels: buildModelEntries(accumulator.standardModels),
    autoModels: buildModelEntries(accumulator.autoModels),
    autoModeAdoptionTrend: computeAutoModeAdoptionTrend(dates, accumulator.autoModeUsersByDate),
    dates,
    premiumTotal: accumulator.premiumTotal,
    standardTotal: accumulator.standardTotal,
    unknownTotal: accumulator.unknownTotal,
  };
}
