import type {
  AdoptionMetricsSlice,
  ModelsMetricsSlice,
} from '../../types/aggregatedMetrics';
import type { CopilotMetrics } from '../../types/metrics';
import { getCanonicalUserInitiatedInteractionCount } from '../assumedInteractions';
import {
  accumulateModelBreakdown,
  computeModelBreakdownData,
  createModelBreakdownAccumulator,
  type ModelBreakdownAccumulator,
} from '../calculators/modelBreakdownCalculator';
import {
  accumulateAgentHeatmapFromFeature,
  accumulateModelFeature,
  computeAgentModeHeatmapData,
  computeDailyModelUsageData,
  createModelUsageAccumulator,
  type ModelUsageAccumulator,
} from '../calculators/modelUsageCalculator';
import {
  accumulateModelEngagement,
  type StatsAccumulator,
} from '../calculators/statsCalculator';

export interface ModelAggregationAccumulator {
  usage: ModelUsageAccumulator;
  breakdown: ModelBreakdownAccumulator;
}

export type ModelAggregationResult = Pick<
  AdoptionMetricsSlice,
  'agentModeHeatmapData'
> & ModelsMetricsSlice;

export function createModelAggregationAccumulator(): ModelAggregationAccumulator {
  return {
    usage: createModelUsageAccumulator(),
    breakdown: createModelBreakdownAccumulator(),
  };
}

export function accumulateModelAggregation(
  accumulator: ModelAggregationAccumulator,
  statsAccumulator: StatsAccumulator,
  metric: CopilotMetrics
): void {
  for (const modelFeature of metric.totals_by_model_feature) {
    const engagements =
      modelFeature.code_generation_activity_count
      + modelFeature.code_acceptance_activity_count;
    accumulateModelEngagement(
      statsAccumulator,
      modelFeature.model,
      engagements
    );
    accumulateModelFeature(
      accumulator.usage,
      metric.day,
      modelFeature.model,
      getCanonicalUserInitiatedInteractionCount(modelFeature)
    );
    accumulateModelBreakdown(
      accumulator.breakdown,
      metric.day,
      metric.user_id,
      modelFeature
    );
  }
}

export function accumulateModelFeatureSignals(
  accumulator: ModelAggregationAccumulator,
  metric: CopilotMetrics
): void {
  for (const feature of metric.totals_by_feature) {
    accumulateAgentHeatmapFromFeature(
      accumulator.usage,
      metric.day,
      metric.user_id,
      feature.feature,
      feature.user_initiated_interaction_count
    );
  }
}

export function finalizeModelAggregation(
  accumulator: ModelAggregationAccumulator
): ModelAggregationResult {
  return {
    modelUsageData: computeDailyModelUsageData(accumulator.usage),
    agentModeHeatmapData: computeAgentModeHeatmapData(accumulator.usage),
    modelBreakdownData: computeModelBreakdownData(accumulator.breakdown),
  };
}
