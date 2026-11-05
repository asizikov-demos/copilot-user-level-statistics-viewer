import type { ModelsMetricsSlice } from '../../types/aggregatedMetrics';
import type { CopilotMetrics, ModelSelectionRequests } from '../../types/metrics';
import { getModelCategory, isUnknownModelName, MODEL_CATEGORY_ORDER } from '../modelConfig';
import { getCanonicalUserInitiatedInteractionCount } from '../assumedInteractions';
import {
  accumulateModelBreakdown,
  computeModelBreakdownData,
  createModelBreakdownAccumulator,
  type ModelBreakdownAccumulator,
} from '../calculators/modelBreakdownCalculator';
import {
  accumulateLocalByok,
  computeLocalByokUsageData,
  createLocalByokAccumulator,
  type LocalByokAccumulator,
} from '../calculators/localByokCalculator';
import {
  accumulateModelFeature,
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
  localByok: LocalByokAccumulator;
  selectionModeRequests: ModelSelectionRequests;
}

export type ModelAggregationResult = ModelsMetricsSlice;

export function createModelAggregationAccumulator(): ModelAggregationAccumulator {
  return {
    usage: createModelUsageAccumulator(),
    breakdown: createModelBreakdownAccumulator(),
    localByok: createLocalByokAccumulator(),
    selectionModeRequests: {
      recordCount: 0,
      reportedRecords: 0,
      excludedRequestCount: 0,
      modes: (['user_selected', 'auto', 'product_selected'] as const).map(mode => ({
        mode,
        categories: [...MODEL_CATEGORY_ORDER, 'Code Review Model' as const]
          .map(category => ({ category, requestCount: 0 })),
      })),
    },
  };
}

export function accumulateModelAggregation(
  accumulator: ModelAggregationAccumulator,
  statsAccumulator: StatsAccumulator,
  metric: CopilotMetrics
): void {
  accumulateLocalByok(accumulator.localByok, metric);
  const selectionRequests = accumulator.selectionModeRequests;
  selectionRequests.recordCount++;
  if (metric.totals_by_client != null) {
    selectionRequests.reportedRecords++;
    for (const client of metric.totals_by_client) {
      for (const row of client.totals_by_model) {
        const mode = selectionRequests.modes.find(entry => entry.mode === row.model_selection_mode);
        if (!mode) {
          selectionRequests.excludedRequestCount += row.request_count;
          continue;
        }
        const category = client.client === 'code_review' && isUnknownModelName(row.model)
          ? 'Code Review Model'
          : getModelCategory(row.model) ?? 'Uncategorized';
        for (const entry of mode.categories) {
          if (entry.category === category) entry.requestCount += row.request_count;
        }
      }
    }
  }
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

export function finalizeModelAggregation(
  accumulator: ModelAggregationAccumulator
): ModelAggregationResult {
  return {
    modelUsageData: computeDailyModelUsageData(accumulator.usage),
    modelBreakdownData: computeModelBreakdownData(accumulator.breakdown),
    localByokUsage: computeLocalByokUsageData(accumulator.localByok),
    selectionModeRequests: accumulator.selectionModeRequests,
  };
}
