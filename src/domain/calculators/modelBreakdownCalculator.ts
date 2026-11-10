import type {
  AutoModeAdoptionTrendEntry,
  CustomModelProviderUsage,
  ModelBreakdownData,
  ModelCategoryUsageEntry,
  ModelDailyUsageEntry,
  ModelUsageCategory,
  ModelVendorUsageEntry,
} from '../../types/metrics';
import type { ModelVendorGroup } from '../modelConfig';
import { isCliFeature } from '../featureCategories';
import { isActiveAutoModeFeature } from '../autoMode';
import {
  classifyModelRequest,
  getModelCategory,
  getModelVendor,
  MODEL_VENDOR_ORDER,
} from '../modelConfig';
import { getCanonicalUserInitiatedInteractionCount } from '../assumedInteractions';
import { compareDatesAsc } from './statsCalculators';
import { computeAdoptionTrendFromUserSets } from './adoptionTrendHelpers';

interface ModelAccEntry {
  total: number;
  dailyData: Map<string, number>;
  userIds: Set<number>;
}

interface CustomModelAccEntry {
  interactions: number;
  userIds: Set<number>;
}

interface CustomProviderAccEntry extends CustomModelAccEntry {
  models: Map<string, CustomModelAccEntry>;
}

export interface ModelBreakdownAccumulator {
  allModels: Map<string, ModelAccEntry>;
  modelCategories: Map<ModelUsageCategory, ModelAccEntry>;
  modelVendors: Map<ModelVendorGroup, ModelAccEntry>;
  customModelProviders: Map<string, CustomProviderAccEntry>;
  autoModels: Map<string, ModelAccEntry>;
  cliModels: Map<string, ModelAccEntry>;
  appModels: Map<string, ModelAccEntry>;
  autoModeUsersByDate: Map<string, Set<number>>;
  modelTotal: number;
  cliTotal: number;
  appTotal: number;
  unknownTotal: number;
  allDates: Set<string>;
}

export function createModelBreakdownAccumulator(): ModelBreakdownAccumulator {
  return {
    allModels: new Map(),
    modelCategories: new Map(),
    modelVendors: new Map(),
    customModelProviders: new Map(),
    autoModels: new Map(),
    cliModels: new Map(),
    appModels: new Map(),
    autoModeUsersByDate: new Map(),
    modelTotal: 0,
    cliTotal: 0,
    appTotal: 0,
    unknownTotal: 0,
    allDates: new Set(),
  };
}

function accumulateCustomModelProvider(
  providers: Map<string, CustomProviderAccEntry>,
  rawModel: string,
  interactions: number,
  userId: number
): void {
  if (interactions <= 0) return;
  const name = rawModel.trim();
  const isUrl = /^https?:\/\//i.test(name);
  const separator = isUrl ? name.indexOf('/', name.indexOf('://') + 3) : name.indexOf('/');
  if (separator < 0) return;
  let provider = name.slice(0, separator).trim();
  if (isUrl) {
    try {
      provider = new URL(name).origin;
    } catch (error) {
      console.warn('Skipping custom model provider with an invalid URL:', error);
      return;
    }
  }
  const model = name.slice(separator + 1).trim();
  if (!provider || !model) return;

  let entry = providers.get(provider);
  if (!entry) {
    entry = { interactions: 0, userIds: new Set(), models: new Map() };
    providers.set(provider, entry);
  }
  entry.interactions += interactions;
  entry.userIds.add(userId);

  let modelEntry = entry.models.get(model);
  if (!modelEntry) {
    modelEntry = { interactions: 0, userIds: new Set() };
    entry.models.set(model, modelEntry);
  }
  modelEntry.interactions += interactions;
  modelEntry.userIds.add(userId);
}

function buildCustomModelProviders(
  providers: Map<string, CustomProviderAccEntry>
): CustomModelProviderUsage[] {
  return Array.from(providers, ([provider, entry]) => ({
    provider,
    interactions: entry.interactions,
    users: entry.userIds.size,
    models: Array.from(entry.models, ([model, modelEntry]) => ({
      model,
      interactions: modelEntry.interactions,
      users: modelEntry.userIds.size,
    })).sort((a, b) => b.interactions - a.interactions || a.model.localeCompare(b.model)),
  })).sort((a, b) => b.interactions - a.interactions || a.provider.localeCompare(b.provider));
}

function accumulateModelEntry(
  modelsMap: Map<string, ModelAccEntry>,
  model: string,
  date: string,
  count: number,
  userId?: number
): void {
  if (!modelsMap.has(model)) {
    modelsMap.set(model, { total: 0, dailyData: new Map(), userIds: new Set() });
  }
  const entry = modelsMap.get(model)!;
  entry.total += count;
  entry.dailyData.set(date, (entry.dailyData.get(date) || 0) + count);
  if (userId !== undefined) {
    entry.userIds.add(userId);
  }
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
  const interactionCount = getCanonicalUserInitiatedInteractionCount(modelFeature);
  const activityCount = (modelFeature.code_generation_activity_count || 0) + (modelFeature.code_acceptance_activity_count || 0);
  const { normalizedModel, isUnknown } = classifyModelRequest(modelFeature.model);

  if (isCliFeature(modelFeature.feature) && interactionCount > 0) {
    accumulator.allDates.add(date);
    accumulator.cliTotal += interactionCount;
    accumulateModelEntry(accumulator.cliModels, normalizedModel || 'unknown', date, interactionCount, userId);
  }

  if (modelFeature.feature === 'copilot_app' && interactionCount > 0) {
    accumulator.allDates.add(date);
    accumulator.appTotal += interactionCount;
    accumulateModelEntry(accumulator.appModels, normalizedModel || 'unknown', date, interactionCount, userId);
  }

  if (isActiveAutoModeFeature(modelFeature)) {
    accumulator.allDates.add(date);
    if (!accumulator.autoModeUsersByDate.has(date)) {
      accumulator.autoModeUsersByDate.set(date, new Set());
    }
    accumulator.autoModeUsersByDate.get(date)!.add(userId);

    const autoUsageCount = modelFeature.user_initiated_interaction_count > 0
      ? modelFeature.user_initiated_interaction_count
      : activityCount;
    accumulateModelEntry(accumulator.autoModels, normalizedModel, date, autoUsageCount, userId);
    return;
  }

  if (!interactionCount) {
    return;
  }

  accumulateCustomModelProvider(
    accumulator.customModelProviders,
    modelFeature.model,
    interactionCount,
    userId
  );

  accumulator.allDates.add(date);
  accumulator.modelTotal += interactionCount;
  accumulateModelEntry(accumulator.allModels, normalizedModel || 'unknown', date, interactionCount, userId);
  accumulateModelEntry(
    accumulator.modelCategories,
    getModelCategory(normalizedModel) ?? 'Uncategorized',
    date,
    interactionCount,
    userId
  );
  accumulateModelEntry(
    accumulator.modelVendors,
    getModelVendor(normalizedModel) ?? 'Unattributed',
    date,
    interactionCount,
    userId
  );

  if (isUnknown) {
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
        users: entry.userIds.size,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function buildModelCategoryEntries(
  categoriesMap: Map<ModelUsageCategory, ModelAccEntry>
): ModelCategoryUsageEntry[] {
  const categoryOrder: ModelUsageCategory[] = [
    'Lightweight',
    'Versatile',
    'Powerful',
    'Uncategorized',
  ];

  return categoryOrder.flatMap(category => {
    const entry = categoriesMap.get(category);
    if (!entry) return [];

    return [{
      category,
      total: entry.total,
      dailyData: Object.fromEntries(entry.dailyData),
      users: entry.userIds.size,
    }];
  });
}

function buildModelVendorEntries(
  vendorsMap: Map<ModelVendorGroup, ModelAccEntry>
): ModelVendorUsageEntry[] {
  return MODEL_VENDOR_ORDER.flatMap(vendor => {
    const entry = vendorsMap.get(vendor);
    if (!entry) return [];

    return [{
      vendor,
      total: entry.total,
      dailyData: Object.fromEntries(entry.dailyData),
      users: entry.userIds.size,
    }];
  });
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
    modelCategories: buildModelCategoryEntries(accumulator.modelCategories),
    modelVendors: buildModelVendorEntries(accumulator.modelVendors),
    customModelProviders: buildCustomModelProviders(accumulator.customModelProviders),
    autoModels: buildModelEntries(accumulator.autoModels),
    cliModels: buildModelEntries(accumulator.cliModels),
    appModels: buildModelEntries(accumulator.appModels),
    autoModeAdoptionTrend: computeAutoModeAdoptionTrend(dates, accumulator.autoModeUsersByDate),
    dates,
    modelTotal: accumulator.modelTotal,
    cliTotal: accumulator.cliTotal,
    appTotal: accumulator.appTotal,
    unknownTotal: accumulator.unknownTotal,
  };
}
