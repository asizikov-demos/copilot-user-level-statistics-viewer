import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import {
  computeStats,
  createStatsAccumulator,
} from '../../calculators/statsCalculator';
import {
  accumulateModelAggregation,
  createModelAggregationAccumulator,
  finalizeModelAggregation,
} from '../modelAggregation';

describe('model aggregation orchestration', () => {
  it('preserves empty family defaults without replacing the shared stats accumulator', () => {
    const statsAccumulator = createStatsAccumulator();
    const accumulator = createModelAggregationAccumulator();

    expect(finalizeModelAggregation(accumulator)).toEqual({
      modelUsageData: [],
      agentModeHeatmapData: [],
      modelBreakdownData: {
        allModels: [],
        modelCategories: [],
        autoModels: [],
        cliModels: [],
        autoModeAdoptionTrend: [],
        dates: [],
        modelTotal: 0,
        cliTotal: 0,
        unknownTotal: 0,
      },
    });
    expect(computeStats(statsAccumulator, 0).topModel).toEqual({
      name: 'N/A',
      engagements: 0,
    });
  });

  it('coordinates canonical interactions, engagement stats, model ordering, and heatmap dates', () => {
    const statsAccumulator = createStatsAccumulator();
    const accumulator = createModelAggregationAccumulator();
    const laterMetric = makeMetric({
      user_id: 1,
      day: '2024-01-16',
      totals_by_model_feature: [
        {
          model: 'gpt-4o',
          feature: 'code_completion',
          user_initiated_interaction_count: 0,
          code_generation_activity_count: 4,
          code_acceptance_activity_count: 1,
          loc_added_sum: 0,
          loc_deleted_sum: 0,
          loc_suggested_to_add_sum: 0,
          loc_suggested_to_delete_sum: 0,
        },
        {
          model: 'unknown',
          feature: 'chat_panel_ask_mode',
          user_initiated_interaction_count: 3,
          code_generation_activity_count: 0,
          code_acceptance_activity_count: 0,
          loc_added_sum: 0,
          loc_deleted_sum: 0,
          loc_suggested_to_add_sum: 0,
          loc_suggested_to_delete_sum: 0,
        },
      ],
      totals_by_feature: [
        {
          feature: 'chat_panel_agent_mode',
          user_initiated_interaction_count: 4,
          code_generation_activity_count: 0,
          code_acceptance_activity_count: 0,
          loc_added_sum: 0,
          loc_deleted_sum: 0,
          loc_suggested_to_add_sum: 0,
          loc_suggested_to_delete_sum: 0,
        },
      ],
    });
    const earlierMetric = makeMetric({
      user_id: 2,
      day: '2024-01-15',
      totals_by_model_feature: [
        {
          model: 'gpt-5',
          feature: 'chat_panel_ask_mode',
          user_initiated_interaction_count: 6,
          code_generation_activity_count: 1,
          code_acceptance_activity_count: 1,
          loc_added_sum: 0,
          loc_deleted_sum: 0,
          loc_suggested_to_add_sum: 0,
          loc_suggested_to_delete_sum: 0,
        },
      ],
      totals_by_feature: [
        {
          feature: 'chat_panel_agent_mode',
          user_initiated_interaction_count: 2,
          code_generation_activity_count: 0,
          code_acceptance_activity_count: 0,
          loc_added_sum: 0,
          loc_deleted_sum: 0,
          loc_suggested_to_add_sum: 0,
          loc_suggested_to_delete_sum: 0,
        },
      ],
    });

    accumulateModelAggregation(accumulator, statsAccumulator, laterMetric);
    accumulateModelAggregation(accumulator, statsAccumulator, earlierMetric);

    const result = finalizeModelAggregation(accumulator);
    expect(computeStats(statsAccumulator, 2).topModel).toEqual({
      name: 'gpt-4o',
      engagements: 5,
    });
    expect(result.modelUsageData).toEqual([
      {
        date: '2024-01-15',
        modelInteractions: 6,
        unknownModels: 0,
      },
      {
        date: '2024-01-16',
        modelInteractions: 7,
        unknownModels: 3,
      },
    ]);
    expect(result.agentModeHeatmapData).toEqual([
      {
        date: '2024-01-15',
        agentModeRequests: 2,
        uniqueUsers: 1,
        intensity: 3,
      },
      {
        date: '2024-01-16',
        agentModeRequests: 4,
        uniqueUsers: 1,
        intensity: 5,
      },
    ]);
    expect(result.modelBreakdownData.dates).toEqual([
      '2024-01-15',
      '2024-01-16',
    ]);
    expect(result.modelBreakdownData.allModels).toEqual([
      {
        model: 'gpt-5',
        total: 6,
        dailyData: { '2024-01-15': 6 },
      },
      {
        model: 'gpt-4o',
        total: 4,
        dailyData: { '2024-01-16': 4 },
      },
      {
        model: 'unknown',
        total: 3,
        dailyData: { '2024-01-16': 3 },
      },
    ]);
  });
});
