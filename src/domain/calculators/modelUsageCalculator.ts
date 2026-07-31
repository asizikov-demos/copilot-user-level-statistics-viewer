import { classifyModelRequest } from '../modelConfig';
import type { CopilotMetrics } from '../../types/metrics';
import { compareByDateAsc } from './statsCalculators';
import { getCanonicalUserInitiatedInteractionCount } from '../assumedInteractions';

export interface DailyModelUsageData {
  date: string;
  modelInteractions: number;
  unknownModels: number;
}

export interface ModelUsageAccumulator {
  dailyModelUsage: Map<string, {
    modelInteractions: number;
    unknownModels: number;
  }>;
}

export function createModelUsageAccumulator(): ModelUsageAccumulator {
  return {
    dailyModelUsage: new Map(),
  };
}

export function accumulateModelFeature(
  accumulator: ModelUsageAccumulator,
  date: string,
  model: string,
  interactions: number
): void {
  if (!accumulator.dailyModelUsage.has(date)) {
    accumulator.dailyModelUsage.set(date, {
      modelInteractions: 0,
      unknownModels: 0,
    });
  }
  const dmu = accumulator.dailyModelUsage.get(date)!;
  const { isUnknown } = classifyModelRequest(model);
  dmu.modelInteractions += interactions;
  if (isUnknown) {
    dmu.unknownModels += interactions;
  }
}

export function computeDailyModelUsageData(
  accumulator: ModelUsageAccumulator
): DailyModelUsageData[] {
  return Array.from(accumulator.dailyModelUsage.entries())
    .map(([date, data]) => ({
      date,
      modelInteractions: data.modelInteractions,
      unknownModels: data.unknownModels,
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
        getCanonicalUserInitiatedInteractionCount(modelFeature)
      );
    }
  }

  return computeDailyModelUsageData(accumulator);
}
