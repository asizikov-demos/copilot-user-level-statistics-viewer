import { SERVICE_VALUE_RATE, getModelMultiplier, classifyModelBucket } from '../modelConfig';
import { CopilotMetrics } from '../../types/metrics';

export interface DailyModelUsageData {
  date: string;
  pruModels: number;
  standardModels: number;
  unknownModels: number;
  totalPRUs: number;
  serviceValue: number;
}

export interface AgentModeHeatmapData {
  date: string;
  agentModeRequests: number;
  uniqueUsers: number;
  intensity: number;
  serviceValue: number;
}

export interface ModelUsageAccumulator {
  dailyModelUsage: Map<string, {
    pruModels: number;
    standardModels: number;
    unknownModels: number;
    totalPRUs: number;
  }>;
  dailyAgentHeatmap: Map<string, {
    requests: number;
    users: Set<number>;
    totalPRUs: number;
  }>;
}

export function createModelUsageAccumulator(): ModelUsageAccumulator {
  return {
    dailyModelUsage: new Map(),
    dailyAgentHeatmap: new Map(),
  };
}

export function accumulateModelFeature(
  accumulator: ModelUsageAccumulator,
  date: string,
  _userId: number,
  model: string,
  feature: string,
  interactions: number
): void {
  const modelLower = model.toLowerCase();
  const multiplier = getModelMultiplier(modelLower);
  const prus = interactions * multiplier;

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
  const bucket = classifyModelBucket(modelLower);
  if (bucket === 'unknown') {
    dmu.unknownModels += interactions;
  } else if (bucket === 'standard') {
    dmu.standardModels += interactions;
  } else {
    dmu.pruModels += interactions;
  }

  if (feature === 'chat_panel_agent_mode') {
    if (!accumulator.dailyAgentHeatmap.has(date)) {
      accumulator.dailyAgentHeatmap.set(date, { requests: 0, users: new Set(), totalPRUs: 0 });
    }
    accumulator.dailyAgentHeatmap.get(date)!.totalPRUs += prus;
  }
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
