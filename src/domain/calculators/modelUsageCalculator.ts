import { classifyModelBucket } from '../modelConfig';
import type { CopilotMetrics } from '../../types/metrics';
import { compareByDateAsc } from './statsCalculators';

export interface DailyModelUsageData {
  date: string;
  pruModels: number;
  standardModels: number;
  unknownModels: number;
}

export interface AgentModeHeatmapData {
  date: string;
  agentModeRequests: number;
  uniqueUsers: number;
  intensity: number;
}

export interface ModelUsageAccumulator {
  dailyModelUsage: Map<string, {
    pruModels: number;
    standardModels: number;
    unknownModels: number;
  }>;
  dailyAgentHeatmap: Map<string, {
    requests: number;
    users: Set<number>;
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
  model: string,
  interactions: number
): void {
  const modelLower = model.toLowerCase();

  if (!accumulator.dailyModelUsage.has(date)) {
    accumulator.dailyModelUsage.set(date, {
      pruModels: 0,
      standardModels: 0,
      unknownModels: 0,
    });
  }
  const dmu = accumulator.dailyModelUsage.get(date)!;
  const bucket = classifyModelBucket(modelLower);
  if (bucket === 'unknown') {
    dmu.unknownModels += interactions;
  } else if (bucket === 'standard') {
    dmu.standardModels += interactions;
  } else {
    dmu.pruModels += interactions;
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
      accumulator.dailyAgentHeatmap.set(date, { requests: 0, users: new Set() });
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
    }))
    .sort(compareByDateAsc);
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
    }))
    .sort(compareByDateAsc);
}

export function calculateDailyModelUsageFromMetrics(
  metrics: CopilotMetrics[]
): DailyModelUsageData[] {
  const accumulator = createModelUsageAccumulator();

  for (const metric of metrics) {
    const date = metric.day;

    for (const modelFeature of metric.totals_by_model_feature) {
      accumulateModelFeature(
        accumulator,
        date,
        modelFeature.model,
        modelFeature.user_initiated_interaction_count
      );
    }
  }

  return computeDailyModelUsageData(accumulator);
}
