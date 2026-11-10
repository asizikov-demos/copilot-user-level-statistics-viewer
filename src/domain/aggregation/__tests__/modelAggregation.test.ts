import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { makeModelFeatureTotal } from '../../../__tests__/factories/metricTotals';
import type { ClientUsageTotals, CopilotMetrics } from '../../../types/metrics';
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
  it('sums category requests across clients and days separately for each selection mode', () => {
    const client = (name: string, rows: Array<[string, string, number]>): ClientUsageTotals => ({
      client: name,
      request_count: 999,
      session_count: 0,
      token_usage: { prompt_tokens_sum: 0, output_tokens_sum: 0, avg_tokens_per_request: 0 },
      totals_by_model: rows.map(([model, model_selection_mode, request_count]) => ({
        model, model_selection_mode, request_count,
        token_usage: { prompt_tokens_sum: 0, output_tokens_sum: 0, avg_tokens_per_request: 0 },
      })),
    });
    const { result } = aggregateModels([
      { totals_by_client: [
        client('vscode', [
          ['gpt-5', 'user_selected', 10],
          ['gpt-4o-mini', 'user_selected', 2],
          ['GPT Image 2.5 Flare', 'user_selected', 7],
          ['gpt-5', 'auto', 3],
          ['unknown', 'product_selected', 4],
          ['gpt-5', 'other', 5],
          ['gpt-5', 'unknown', 6],
          ['gpt-5', 'future_mode', 7],
        ]),
        client('opencode', [['gpt-5', 'user_selected', 8], ['new-model', 'auto', 9], ['gpt-image-2.5-flare', 'auto', 5]]),
      ] },
      { day: '2024-01-16', totals_by_client: [
        client('vscode', [
          ['gpt-5', 'user_selected', 1],
          ['gpt-4o', 'product_selected', 2],
          ['gpt-image-2.5-flare', 'user_selected', 4],
          ['gpt-image-2.5-flare', 'product_selected', 6],
        ]),
      ] },
    ]);

    expect(result.selectionModeRequests).toEqual({
      recordCount: 2,
      reportedRecords: 2,
      excludedRequestCount: 18,
      modes: [
        { mode: 'user_selected', categories: [
          { category: 'Lightweight', requestCount: 2 },
          { category: 'Versatile', requestCount: 0 },
          { category: 'Powerful', requestCount: 19 },
          { category: 'Image Generation', requestCount: 11 },
          { category: 'Uncategorized', requestCount: 0 },
          { category: 'Code Review Model', requestCount: 0 },
        ] },
        { mode: 'auto', categories: [
          { category: 'Lightweight', requestCount: 0 },
          { category: 'Versatile', requestCount: 0 },
          { category: 'Powerful', requestCount: 3 },
          { category: 'Image Generation', requestCount: 5 },
          { category: 'Uncategorized', requestCount: 9 },
          { category: 'Code Review Model', requestCount: 0 },
        ] },
        { mode: 'product_selected', categories: [
          { category: 'Lightweight', requestCount: 0 },
          { category: 'Versatile', requestCount: 2 },
          { category: 'Powerful', requestCount: 0 },
          { category: 'Image Generation', requestCount: 6 },
          { category: 'Uncategorized', requestCount: 4 },
          { category: 'Code Review Model', requestCount: 0 },
        ] },
      ],
    });
    expect(result.modelBreakdownData.modelTotal).toBe(0);
    expect(result.modelUsageData).toEqual([]);
  });

  it('labels unknown code review models without reclassifying other clients or known models', () => {
    const token_usage = { prompt_tokens_sum: 0, output_tokens_sum: 0, avg_tokens_per_request: 0 };
    const client = (name: string, rows: Array<[string, number]>): ClientUsageTotals => ({
      client: name, request_count: 100, session_count: 0, token_usage,
      totals_by_model: rows.map(([model, request_count]) => ({
        model, request_count, model_selection_mode: 'product_selected', token_usage,
      })),
    });
    const { result } = aggregateModels([{
      totals_by_client: [
        client('code_review', [['unknown', 10], [' UNKNOWN ', 2], ['', 1], ['gpt-5', 3], ['future-model', 4]]),
        client('cloud_agent', [['unknown', 5]]),
        client('vscode', [['unknown', 6]]),
      ],
    }]);

    expect(result.selectionModeRequests.modes.find(entry => entry.mode === 'product_selected')?.categories)
      .toEqual([
        { category: 'Lightweight', requestCount: 0 },
        { category: 'Versatile', requestCount: 0 },
        { category: 'Powerful', requestCount: 3 },
        { category: 'Image Generation', requestCount: 0 },
        { category: 'Uncategorized', requestCount: 15 },
        { category: 'Code Review Model', requestCount: 13 },
      ]);
    expect(result.selectionModeRequests.excludedRequestCount).toBe(0);
  });

  it('distinguishes missing and null traffic from reported empty traffic without inferring requests', () => {
    const { result } = aggregateModels([
      {},
      { totals_by_client: null },
      { totals_by_client: [] },
      { totals_by_model_feature: [makeModelFeatureTotal('auto', 'chat_panel', 5)] },
    ]);
    expect(result.selectionModeRequests).toMatchObject({
      recordCount: 4, reportedRecords: 1, excludedRequestCount: 0,
    });
    expect(result.selectionModeRequests.modes.every(mode =>
      mode.categories.every(entry => entry.requestCount === 0),
    )).toBe(true);
  });

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

  it('aggregates daily local BYOK sessions by surface', () => {
    const byok = (surface: string, session_count: number, request_count: number, byok_kind = 'local_user') => ({
      byok_kind,
      surface,
      session_count,
      request_count,
      prompt_count: 1,
      token_usage: { output_tokens_sum: 0, prompt_tokens_sum: 0, avg_tokens_per_request: 0 },
    });
    const { result } = aggregateModels([
      {
        user_id: 1,
        day: '2026-10-16',
        totals_by_local_byok: [byok('copilot_cli', 25, 137), byok('copilot_cli', 1, 4, 'remote_user')],
      },
      { user_id: 2, day: '2026-10-15', totals_by_local_byok: [byok('copilot_app', 2, 27)] },
      { user_id: 3, day: '2026-10-15', totals_by_local_byok: [byok('copilot_cli', 0, 0)] },
      { user_id: 4, day: '2026-10-15', totals_by_local_byok: null },
    ]);

    expect(result.localByokUsage).toEqual({
      surfaces: ['copilot_cli', 'copilot_app'],
      daily: [
        { date: '2026-10-15', sessionsBySurface: { copilot_app: 2 } },
        { date: '2026-10-16', sessionsBySurface: { copilot_cli: 26 } },
      ],
      totalSessions: 28,
      totalRequests: 168,
      totalUsers: 2,
    });
  });
});
