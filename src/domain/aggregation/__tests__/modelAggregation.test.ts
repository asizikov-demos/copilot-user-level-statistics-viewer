import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { makeModelFeatureTotal } from '../../../__tests__/factories/metricTotals';
import type { CopilotMetrics } from '../../../types/metrics';
import {
  computeStats,
  createStatsAccumulator,
} from '../../calculators/statsCalculator';
import {
  accumulateModelAggregation,
  createModelAggregationAccumulator,
  finalizeModelAggregation,
} from '../modelAggregation';

function aggregateModels(metrics: Partial<CopilotMetrics>[]) {
  const statsAccumulator = createStatsAccumulator();
  const accumulator = createModelAggregationAccumulator();
  for (const metric of metrics) {
    accumulateModelAggregation(accumulator, statsAccumulator, makeMetric(metric));
  }
  return {
    result: finalizeModelAggregation(accumulator),
    stats: computeStats(statsAccumulator, metrics.length),
  };
}

describe('model aggregation', () => {
  it('coordinates canonical interactions, engagement stats, and model ordering', () => {
    const { result, stats } = aggregateModels([
      {
        user_id: 1,
        day: '2024-01-16',
        totals_by_model_feature: [
          makeModelFeatureTotal('gpt-4o', 'code_completion', 0, {
            code_generation_activity_count: 4,
            code_acceptance_activity_count: 1,
          }),
          makeModelFeatureTotal('unknown', 'chat_panel_ask_mode', 3),
        ],
      },
      {
        user_id: 2,
        day: '2024-01-15',
        totals_by_model_feature: [
          makeModelFeatureTotal('gpt-5', 'chat_panel_ask_mode', 6, {
            code_generation_activity_count: 1,
            code_acceptance_activity_count: 1,
          }),
        ],
      },
    ]);

    expect(stats.topModel).toEqual({ name: 'gpt-4o', engagements: 5 });
    expect(result.modelUsageData).toEqual([
      { date: '2024-01-15', modelInteractions: 6, unknownModels: 0 },
      { date: '2024-01-16', modelInteractions: 7, unknownModels: 3 },
    ]);
    expect(result.modelBreakdownData).toMatchObject({
      dates: ['2024-01-15', '2024-01-16'],
      modelTotal: 13,
      unknownTotal: 3,
      allModels: [
        { model: 'gpt-5', total: 6, dailyData: { '2024-01-15': 6 }, users: 1 },
        { model: 'gpt-4o', total: 4, dailyData: { '2024-01-16': 4 }, users: 1 },
        { model: 'unknown', total: 3, dailyData: { '2024-01-16': 3 }, users: 1 },
      ],
      modelVendors: [
        { vendor: 'OpenAI', total: 10, dailyData: { '2024-01-15': 6, '2024-01-16': 4 }, users: 2 },
        { vendor: 'Unattributed', total: 3, dailyData: { '2024-01-16': 3 }, users: 1 },
      ],
    });
  });

  it.each([
    { interactions: 0, generations: 44, expected: 44 },
    { interactions: 10, generations: 5, expected: 15 },
  ])(
    'counts code completion as $expected interactions from $interactions interactions and $generations generations',
    ({ interactions, generations, expected }) => {
      const { result } = aggregateModels([
        {
          totals_by_model_feature: [
            makeModelFeatureTotal('gpt-4o', 'code_completion', interactions, {
              code_generation_activity_count: generations,
            }),
          ],
        },
      ]);

      expect(result.modelUsageData).toEqual([
        { date: '2024-01-15', modelInteractions: expected, unknownModels: 0 },
      ]);
      expect(result.modelBreakdownData.modelTotal).toBe(expected);
    }
  );

  it('tracks Auto mode adoption separately from neutral model totals', () => {
    const autoFeature = makeModelFeatureTotal('auto', 'chat_panel', 5);
    const { result } = aggregateModels([
      { user_id: 1, day: '2024-01-15', totals_by_model_feature: [autoFeature] },
      { user_id: 2, day: '2024-01-15', totals_by_model_feature: [autoFeature] },
      { user_id: 1, day: '2024-01-16', totals_by_model_feature: [autoFeature] },
    ]);

    expect(result.modelBreakdownData.autoModeAdoptionTrend).toEqual([
      { date: '2024-01-15', newUsers: 2, returningUsers: 0, totalActiveUsers: 2, cumulativeUsers: 2 },
      { date: '2024-01-16', newUsers: 0, returningUsers: 1, totalActiveUsers: 1, cumulativeUsers: 2 },
    ]);
    expect(result.modelBreakdownData.allModels).toEqual([]);
    expect(result.modelBreakdownData.modelTotal).toBe(0);
  });

  it('counts Auto activity even when user-initiated interactions are zero', () => {
    const { result } = aggregateModels([
      {
        totals_by_model_feature: [
          makeModelFeatureTotal('auto', 'agent_edit', 0, { code_generation_activity_count: 1 }),
        ],
      },
    ]);

    expect(result.modelBreakdownData.autoModels).toEqual([
      { model: 'auto', total: 1, dailyData: { '2024-01-15': 1 }, users: 1 },
    ]);
    expect(result.modelBreakdownData.autoModeAdoptionTrend).toEqual([
      { date: '2024-01-15', newUsers: 1, returningUsers: 0, totalActiveUsers: 1, cumulativeUsers: 1 },
    ]);
  });

  it('aggregates daily CLI model usage apart from IDE models', () => {
    const { result } = aggregateModels([
      {
        user_id: 1,
        day: '2024-01-15',
        totals_by_model_feature: [
          makeModelFeatureTotal('gpt-5.4', 'copilot_cli', 15, { code_generation_activity_count: 8 }),
          makeModelFeatureTotal('claude-sonnet-4.6', 'copilot_cli', 5, { code_generation_activity_count: 9 }),
          makeModelFeatureTotal('gpt-5.4', 'chat_panel_ask_mode', 50),
        ],
      },
      {
        user_id: 2,
        day: '2024-01-16',
        totals_by_model_feature: [
          makeModelFeatureTotal('gpt-5.4', 'copilot_cli', 3, { code_generation_activity_count: 1 }),
          makeModelFeatureTotal('claude-opus-4.7', 'copilot_cli', 0, { code_generation_activity_count: 9 }),
        ],
      },
    ]);

    expect(result.modelBreakdownData.cliTotal).toBe(23);
    expect(result.modelBreakdownData.cliModels).toEqual([
      { model: 'gpt-5.4', total: 18, dailyData: { '2024-01-15': 15, '2024-01-16': 3 }, users: 2 },
      { model: 'claude-sonnet-4.6', total: 5, dailyData: { '2024-01-15': 5 }, users: 1 },
    ]);
  });
});
