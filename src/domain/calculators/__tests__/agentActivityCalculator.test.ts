import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../metricsAggregator';
import { computeSingleUserDetailedMetrics } from '../userDetailCalculator';
import { computeAgentActivity } from '../agentActivityCalculator';

const clientTotals = (sessions: number, prompts: number, requests: number) => ({
  session_count: sessions,
  prompt_count: prompts,
  request_count: requests,
  token_usage: { prompt_tokens_sum: 0, output_tokens_sum: 0, avg_tokens_per_request: 0 },
});

describe('computeAgentActivity', () => {
  it('sums each surface independently, sorts dates and merges duplicate dates without mutating input', () => {
    const days = [
      { day: '2024-01-17', totals_by_cli: clientTotals(2, 3, 12) },
      { day: '2024-01-15', totals_by_cli: clientTotals(3, 7, 13), totals_by_vscode_agent: { session_count: 1, total_user_messages: 1 } },
      { day: '2024-01-15', totals_by_copilot_app: clientTotals(4, 2, 50), totals_by_vscode_agent: { session_count: 2, total_user_messages: 5 } },
    ];
    const before = structuredClone(days);
    const result = computeAgentActivity(days);
    expect(days).toEqual(before);
    expect(result.daily.map(day => day.date)).toEqual(['2024-01-15', '2024-01-17']);
    expect(result.daily[0].vscodeAgents).toEqual({ sessions: 3, userInputs: 6, requests: null });
    expect(result.daily[1].app).toEqual({ sessions: null, userInputs: null, requests: null });
    expect(result.summary).toEqual({
      cli: { sessions: 5, userInputs: 10, requests: 25 },
      app: { sessions: 4, userInputs: 2, requests: 50 },
      vscodeAgents: { sessions: 3, userInputs: 6, requests: null },
    });
  });

  it('keeps unavailable measures null and explicit zero counts reported', () => {
    const result = computeAgentActivity([
      { day: '2024-01-15' },
      { day: '2024-01-16', totals_by_vscode_agent: null },
      { day: '2024-01-17', totals_by_vscode_agent: { session_count: null, total_user_messages: 0 } },
      { day: '2024-01-18', totals_by_cli: clientTotals(0, 0, 0) },
    ]);
    expect(result.summary).toEqual({
      cli: { sessions: 0, userInputs: 0, requests: 0 },
      app: { sessions: null, userInputs: null, requests: null },
      vscodeAgents: { sessions: null, userInputs: 0, requests: null },
    });
    expect(result.daily[0].cli.sessions).toBeNull();
    expect(result.daily[1].vscodeAgents.userInputs).toBeNull();
    expect(result.daily[2].vscodeAgents.userInputs).toBe(0);
  });

  it('returns no daily data or invented totals for empty input', () => {
    const result = computeAgentActivity([]);
    expect(result.daily).toEqual([]);
    expect(Object.values(result.summary).every(counts => Object.values(counts).every(value => value === null))).toBe(true);
  });

  it('computes selected-user totals in the worker flow without using flags or feature counts', () => {
    const feature = {
      feature: 'vscode_agent',
      user_initiated_interaction_count: 500,
      code_generation_activity_count: 0,
      code_acceptance_activity_count: 0,
      loc_added_sum: 0,
      loc_deleted_sum: 0,
      loc_suggested_to_add_sum: 0,
      loc_suggested_to_delete_sum: 0,
    };
    const { userDetailAccumulator } = aggregateMetrics([
      makeMetric({ day: '2024-01-15', totals_by_cli: clientTotals(76, 76, 134) }),
      makeMetric({
        day: '2024-01-16',
        totals_by_cli: clientTotals(3, 7, 13),
        totals_by_vscode_agent: { session_count: 1, total_user_messages: 1 },
        totals_by_feature: [feature],
      }),
      makeMetric({ day: '2024-01-17', totals_by_cli: clientTotals(2, 3, 12), used_copilot_app: true, used_agent: true }),
      makeMetric({ user_id: 2, totals_by_copilot_app: clientTotals(100, 200, 300) }),
    ]);
    const details = computeSingleUserDetailedMetrics(userDetailAccumulator, 1)!;
    expect(details.agentActivity.summary).toEqual({
      cli: { sessions: 81, userInputs: 86, requests: 159 },
      app: { sessions: null, userInputs: null, requests: null },
      vscodeAgents: { sessions: 1, userInputs: 1, requests: null },
    });
    expect(computeSingleUserDetailedMetrics(userDetailAccumulator, 2)!.agentActivity.summary.app.sessions).toBe(100);
  });
});
