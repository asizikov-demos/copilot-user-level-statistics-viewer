import { describe, expect, it } from 'vitest';
import { aggregateMetrics } from '../../domain/metricsAggregator';
import { makeMetric } from '../../__tests__/factories/metrics';
import { makeCliTotals, makeFeatureTotal, makeModelFeatureTotal } from '../../__tests__/factories/metricTotals';
import { selectCopilotAppAdoptionReadModel } from '../copilotAppAdoption';

describe('Copilot App adoption worker aggregates and read model', () => {
  it('keeps App counts, users and models separate from CLI and deduplicates users across records', () => {
    const app = makeCliTotals({
      session_count: 2, request_count: 4, prompt_count: 3,
      token_usage: { prompt_tokens_sum: 100, output_tokens_sum: 200 },
    });
    const metrics = aggregateMetrics([
      makeMetric({
        day: '2026-01-16', user_id: 1, totals_by_copilot_app: app,
        totals_by_cli: makeCliTotals({ session_count: 99 }),
        totals_by_model_feature: [
          makeModelFeatureTotal('GPT-4.1', 'copilot_app', 5),
          makeModelFeatureTotal('gpt-5', 'copilot_cli', 90),
          makeModelFeatureTotal('gpt-5', 'chat_panel_agent_mode', 80),
        ],
      }),
      makeMetric({ day: '2026-01-15', user_id: 1, used_copilot_app: true }),
      makeMetric({ day: '2026-01-16', user_id: 1, totals_by_copilot_app: app }),
      makeMetric({
        day: '2026-01-16', user_id: 2,
        totals_by_feature: [makeFeatureTotal('copilot_app', 2)],
      }),
      makeMetric({ day: '2026-01-17', user_id: 3 }),
    ]).aggregated;
    const before = structuredClone(metrics);
    const model = selectCopilotAppAdoptionReadModel(metrics);

    expect(model.appUsers).toBe(2);
    expect(model.appShare).toBe(66.7);
    expect(model.dailySessionData).toBe(metrics.copilotApp.dailyAppSessionData);
    expect(model.dailyTokenData).toBe(metrics.copilotApp.dailyAppTokenData);
    expect(model.dailyAdoptionTrend).toBe(metrics.copilotApp.dailyAppAdoptionTrend);
    expect(model.modelEntries).toBe(metrics.models.modelBreakdownData.appModels);
    expect(model.modelDates).toEqual(['2026-01-15', '2026-01-16', '2026-01-17']);
    expect(model.dailySessionData).toEqual([
      { date: '2026-01-15', sessionCount: 0, requestCount: 0, promptCount: 0, uniqueUsers: 1 },
      { date: '2026-01-16', sessionCount: 4, requestCount: 8, promptCount: 6, uniqueUsers: 2 },
      { date: '2026-01-17', sessionCount: 0, requestCount: 0, promptCount: 0, uniqueUsers: 0 },
    ]);
    expect(model.dailyTokenData[1]).toEqual({
      date: '2026-01-16', promptTokens: 200, outputTokens: 400, requestCount: 8,
    });
    expect(model.dailyAdoptionTrend).toEqual([
      { date: '2026-01-15', newUsers: 1, returningUsers: 0, totalActiveUsers: 1, cumulativeUsers: 1 },
      { date: '2026-01-16', newUsers: 1, returningUsers: 1, totalActiveUsers: 2, cumulativeUsers: 2 },
      { date: '2026-01-17', newUsers: 0, returningUsers: 0, totalActiveUsers: 0, cumulativeUsers: 2 },
    ]);
    expect(model.modelTotal).toBe(5);
    expect(model.modelEntries).toEqual([
      { model: 'gpt-4.1', total: 5, dailyData: { '2026-01-16': 5 }, users: 1 },
    ]);
    expect(metrics.cli.dailyCliSessionData[1].sessionCount).toBe(99);
    expect(metrics).toEqual(before);
  });

  it('returns an empty report without borrowing CLI data or dividing by zero', () => {
    const model = selectCopilotAppAdoptionReadModel(aggregateMetrics([]).aggregated);
    expect(model).toMatchObject({
      appUsers: 0, appShare: 0, dailySessionData: [], dailyTokenData: [],
      dailyAdoptionTrend: [], modelEntries: [], modelDates: [], modelTotal: 0,
    });
  });

  it('does not treat CLI-only users as App users', () => {
    const model = selectCopilotAppAdoptionReadModel(aggregateMetrics([
      makeMetric({ used_cli: true, totals_by_cli: makeCliTotals({ prompt_count: 10 }) }),
    ]).aggregated);
    expect(model.appUsers).toBe(0);
    expect(model.appShare).toBe(0);
    expect(model.modelEntries).toEqual([]);
    expect(model.dailySessionData[0].uniqueUsers).toBe(0);
  });
});
