import { describe, expect, it } from 'vitest';
import { computeAgentActivity } from '../agentActivityCalculator';

const clientTotals = (sessions: number, prompts: number, requests: number) => ({
  session_count: sessions,
  prompt_count: prompts,
  request_count: requests,
  token_usage: { prompt_tokens_sum: 0, output_tokens_sum: 0, avg_tokens_per_request: 0 },
});

describe('computeAgentActivity', () => {
  it('sums each surface independently into the summary', () => {
    const result = computeAgentActivity([
      { day: '2024-01-15', totals_by_cli: clientTotals(3, 7, 13), totals_by_vscode_agent: { session_count: 1, total_user_messages: 1 } },
      { day: '2024-01-16', totals_by_cli: clientTotals(2, 3, 12), totals_by_copilot_app: clientTotals(4, 2, 50) },
    ]);
    expect(result.summary).toEqual({
      cli: { sessions: 5, userInputs: 10, requests: 25 },
      app: { sessions: 4, userInputs: 2, requests: 50 },
      vscodeAgents: { sessions: 1, userInputs: 1, requests: null },
    });
  });

  it('sorts daily entries by date', () => {
    const result = computeAgentActivity([
      { day: '2024-01-17', totals_by_cli: clientTotals(1, 1, 1) },
      { day: '2024-01-15', totals_by_cli: clientTotals(1, 1, 1) },
      { day: '2024-01-16', totals_by_cli: clientTotals(1, 1, 1) },
    ]);
    expect(result.daily.map(day => day.date)).toEqual(['2024-01-15', '2024-01-16', '2024-01-17']);
  });

  it('merges entries that share a date', () => {
    const result = computeAgentActivity([
      { day: '2024-01-15', totals_by_vscode_agent: { session_count: 1, total_user_messages: 1 } },
      { day: '2024-01-15', totals_by_copilot_app: clientTotals(4, 2, 50), totals_by_vscode_agent: { session_count: 2, total_user_messages: 5 } },
    ]);
    expect(result.daily).toEqual([
      {
        date: '2024-01-15',
        cli: { sessions: null, userInputs: null, requests: null },
        app: { sessions: 4, userInputs: 2, requests: 50 },
        vscodeAgents: { sessions: 3, userInputs: 6, requests: null },
      },
    ]);
  });

  it('does not mutate its input', () => {
    const days = [
      { day: '2024-01-16', totals_by_cli: clientTotals(2, 3, 12) },
      { day: '2024-01-15', totals_by_cli: clientTotals(3, 7, 13) },
    ];
    const before = structuredClone(days);
    computeAgentActivity(days);
    expect(days).toEqual(before);
  });

  it('keeps unavailable measures null, including for empty input, and reports explicit zero counts', () => {
    const empty = computeAgentActivity([]);
    expect(empty.daily).toEqual([]);
    expect(empty.summary.cli).toEqual({ sessions: null, userInputs: null, requests: null });

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
});
