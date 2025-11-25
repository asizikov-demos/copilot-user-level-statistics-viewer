import { SERVICE_VALUE_RATE, getModelMultiplier, isPremiumModel } from '../modelConfig';
import { CopilotMetrics } from '../../types/metrics';

export interface DailyModelUsageData {
  date: string;
  pruModels: number;
  standardModels: number;
  unknownModels: number;
  totalPRUs: number;
  serviceValue: number;
}

export interface DailyPRUAnalysisData {
  date: string;
  pruRequests: number;
  standardRequests: number;
  pruPercentage: number;
  totalPRUs: number;
  serviceValue: number;
  topModel: string;
  topModelPRUs: number;
  topModelIsPremium: boolean;
  models: Array<{
    name: string;
    requests: number;
    prus: number;
    isPremium: boolean;
    multiplier: number;
  }>;
}

export interface AgentModeHeatmapData {
  date: string;
  agentModeRequests: number;
  uniqueUsers: number;
  intensity: number;
  serviceValue: number;
}

export interface ModelFeatureDistributionData {
  model: string;
  modelDisplayName: string;
  multiplier: number;
  features: {
    agentMode: number;
    askMode: number;
    editMode: number;
    inlineMode: number;
    codeCompletion: number;
    codeReview: number;
    other: number;
  };
  totalInteractions: number;
  totalPRUs: number;
  serviceValue: number;
}

export interface ModelUsageAccumulator {
  dailyModelUsage: Map<string, {
    pruModels: number;
    standardModels: number;
    unknownModels: number;
    totalPRUs: number;
  }>;
  dailyPRU: Map<string, {
    pruRequests: number;
    standardRequests: number;
    totalPRUs: number;
    modelStats: Map<string, { requests: number; prus: number; multiplier: number; isPremium: boolean }>;
  }>;
  dailyAgentHeatmap: Map<string, {
    requests: number;
    users: Set<number>;
    totalPRUs: number;
  }>;
  modelFeatureDist: Map<string, {
    features: Map<string, number>;
    totalInteractions: number;
  }>;
}

export function createModelUsageAccumulator(): ModelUsageAccumulator {
  return {
    dailyModelUsage: new Map(),
    dailyPRU: new Map(),
    dailyAgentHeatmap: new Map(),
    modelFeatureDist: new Map(),
  };
}

export function accumulateModelFeature(
  accumulator: ModelUsageAccumulator,
  date: string,
  userId: number,
  model: string,
  feature: string,
  interactions: number
): void {
  const modelLower = model.toLowerCase();
  const multiplier = getModelMultiplier(modelLower);
  const prus = interactions * multiplier;
  const isPremium = isPremiumModel(modelLower);

  // Daily Model Usage
  if (!accumulator.dailyModelUsage.has(date)) {
    accumulator.dailyModelUsage.set(date, {
      pruModels: 0,
      standardModels: 0,
      unknownModels: 0,
      totalPRUs: 0,
    });
  }
  const dmu = accumulator.dailyModelUsage.get(date)!;
  dmu.totalPRUs += prus;
  if (modelLower === 'unknown' || modelLower === '') {
    dmu.unknownModels += interactions;
  } else if (multiplier === 0) {
    dmu.standardModels += interactions;
  } else {
    dmu.pruModels += interactions;
  }

  // Daily PRU Analysis
  if (!accumulator.dailyPRU.has(date)) {
    accumulator.dailyPRU.set(date, {
      pruRequests: 0,
      standardRequests: 0,
      totalPRUs: 0,
      modelStats: new Map(),
    });
  }
  const dpru = accumulator.dailyPRU.get(date)!;
  dpru.totalPRUs += prus;
  if (multiplier === 0) {
    dpru.standardRequests += interactions;
  } else {
    dpru.pruRequests += interactions;
  }

  const existingModelStat = dpru.modelStats.get(modelLower);
  if (existingModelStat) {
    existingModelStat.requests += interactions;
    existingModelStat.prus += prus;
  } else {
    dpru.modelStats.set(modelLower, { requests: interactions, prus, multiplier, isPremium });
  }

  // Agent Mode Heatmap (PRUs part)
  if (feature === 'chat_panel_agent_mode') {
    if (!accumulator.dailyAgentHeatmap.has(date)) {
      accumulator.dailyAgentHeatmap.set(date, { requests: 0, users: new Set(), totalPRUs: 0 });
    }
    accumulator.dailyAgentHeatmap.get(date)!.totalPRUs += prus;
  }

  // Model Feature Distribution
  if (!accumulator.modelFeatureDist.has(modelLower)) {
    accumulator.modelFeatureDist.set(modelLower, { features: new Map(), totalInteractions: 0 });
  }
  const mfd = accumulator.modelFeatureDist.get(modelLower)!;
  mfd.totalInteractions += interactions;
  mfd.features.set(feature, (mfd.features.get(feature) || 0) + interactions);
}

export function accumulateAgentHeatmapFromFeature(
  accumulator: ModelUsageAccumulator,
  date: string,
  userId: number,
  feature: string,
  interactionCount: number
): void {
  if (feature === 'chat_panel_agent_mode' && interactionCount > 0) {
    if (!accumulator.dailyAgentHeatmap.has(date)) {
      accumulator.dailyAgentHeatmap.set(date, { requests: 0, users: new Set(), totalPRUs: 0 });
    }
    const dah = accumulator.dailyAgentHeatmap.get(date)!;
    dah.requests += interactionCount;
    dah.users.add(userId);
  }
}

export function computeDailyModelUsageData(
  accumulator: ModelUsageAccumulator
): DailyModelUsageData[] {
  return Array.from(accumulator.dailyModelUsage.entries())
    .map(([date, data]) => ({
      date,
      pruModels: data.pruModels,
      standardModels: data.standardModels,
      unknownModels: data.unknownModels,
      totalPRUs: Math.round(data.totalPRUs * 100) / 100,
      serviceValue: Math.round(data.totalPRUs * SERVICE_VALUE_RATE * 100) / 100,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function computePRUAnalysisData(
  accumulator: ModelUsageAccumulator
): DailyPRUAnalysisData[] {
  return Array.from(accumulator.dailyPRU.entries())
    .map(([date, data]) => {
      const total = data.pruRequests + data.standardRequests;
      const modelsArray = Array.from(data.modelStats.entries())
        .map(([name, stats]) => ({
          name,
          requests: stats.requests,
          prus: Math.round(stats.prus * 100) / 100,
          isPremium: stats.isPremium,
          multiplier: stats.multiplier,
        }))
        .sort((a, b) => (b.prus - a.prus) || (b.requests - a.requests));
      const topModelEntry = modelsArray[0];
      return {
        date,
        pruRequests: data.pruRequests,
        standardRequests: data.standardRequests,
        pruPercentage: total > 0 ? Math.round((data.pruRequests / total) * 100 * 100) / 100 : 0,
        totalPRUs: Math.round(data.totalPRUs * 100) / 100,
        serviceValue: Math.round(data.totalPRUs * SERVICE_VALUE_RATE * 100) / 100,
        topModel: topModelEntry ? topModelEntry.name : 'unknown',
        topModelPRUs: topModelEntry ? topModelEntry.prus : 0,
        topModelIsPremium: topModelEntry ? topModelEntry.isPremium : false,
        models: modelsArray,
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function computeAgentModeHeatmapData(
  accumulator: ModelUsageAccumulator
): AgentModeHeatmapData[] {
  const allRequests = Array.from(accumulator.dailyAgentHeatmap.values()).map(d => d.requests);
  const maxRequests = Math.max(...allRequests, 1);

  return Array.from(accumulator.dailyAgentHeatmap.entries())
    .map(([date, data]) => ({
      date,
      agentModeRequests: data.requests,
      uniqueUsers: data.users.size,
      intensity: Math.ceil((data.requests / maxRequests) * 5),
      serviceValue: Math.round(data.totalPRUs * SERVICE_VALUE_RATE * 100) / 100,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function computeModelFeatureDistributionData(
  accumulator: ModelUsageAccumulator
): ModelFeatureDistributionData[] {
  return Array.from(accumulator.modelFeatureDist.entries())
    .map(([model, data]) => {
      const multiplier = getModelMultiplier(model);
      const totalPRUs = data.totalInteractions * multiplier;
      const features = {
        agentMode: data.features.get('chat_panel_agent_mode') || 0,
        askMode: data.features.get('chat_panel_ask_mode') || 0,
        editMode: data.features.get('chat_panel_edit_mode') || 0,
        inlineMode: data.features.get('chat_inline') || 0,
        codeCompletion: data.features.get('code_completion') || 0,
        codeReview: data.features.get('code_review') || 0,
        other: 0,
      };
      const knownFeatureTotal = Object.values(features).reduce((sum, count) => sum + count, 0);
      features.other = Math.max(0, data.totalInteractions - knownFeatureTotal);
      const modelDisplayName = model === 'unknown'
        ? 'Unknown Model'
        : model.charAt(0).toUpperCase() + model.slice(1).replace(/-/g, ' ');
      return {
        model,
        modelDisplayName,
        multiplier,
        features,
        totalInteractions: data.totalInteractions,
        totalPRUs: Math.round(totalPRUs * 100) / 100,
        serviceValue: Math.round(totalPRUs * SERVICE_VALUE_RATE * 100) / 100,
      };
    })
    .filter(item => item.totalInteractions > 0)
    .sort((a, b) => b.totalPRUs - a.totalPRUs);
}

export function calculateDailyPRUAnalysisFromMetrics(
  metrics: CopilotMetrics[]
): DailyPRUAnalysisData[] {
  const accumulator = createModelUsageAccumulator();

  for (const metric of metrics) {
    const date = metric.day;
    const userId = metric.user_id;

    for (const modelFeature of metric.totals_by_model_feature) {
      accumulateModelFeature(
        accumulator,
        date,
        userId,
        modelFeature.model,
        modelFeature.feature,
        modelFeature.user_initiated_interaction_count
      );
    }
  }

  return computePRUAnalysisData(accumulator);
}

export function calculateDailyModelUsageFromMetrics(
  metrics: CopilotMetrics[]
): DailyModelUsageData[] {
  const accumulator = createModelUsageAccumulator();

  for (const metric of metrics) {
    const date = metric.day;
    const userId = metric.user_id;

    for (const modelFeature of metric.totals_by_model_feature) {
      accumulateModelFeature(
        accumulator,
        date,
        userId,
        modelFeature.model,
        modelFeature.feature,
        modelFeature.user_initiated_interaction_count
      );
    }
  }

  return computeDailyModelUsageData(accumulator);
}
