import { describe, expect, it } from 'vitest';
import type { CopilotMetrics } from '../../../types/metrics';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { parseMetricsLine } from '../../metricsParser';
import {
  accumulateVSCodeAgentUsage,
  computeVSCodeAgentUsage,
  createVSCodeAgentUsageAccumulator,
} from '../vscodeAgentUsageCalculator';

function usage(...records: Array<Partial<CopilotMetrics>>) {
  const accumulator = createVSCodeAgentUsageAccumulator();
  records.forEach(record => accumulateVSCodeAgentUsage(accumulator, makeMetric(record)));
  return computeVSCodeAgentUsage(accumulator);
}

describe('VS Code Agents usage', () => {
  it.each([
    {},
    { used_vscode_agent: null, totals_by_vscode_agent: null },
    { used_vscode_agent: false, totals_by_vscode_agent: { session_count: 0, total_user_messages: 0 } },
    { used_vscode_agent: true, totals_by_vscode_agent: { session_count: 3, total_user_messages: 12 } },
  ])('preserves optional source fields through parsing: %j', fields => {
    const parsed = parseMetricsLine(JSON.stringify(makeMetric(fields)));
    expect(parsed).not.toBeNull();
    expect(parsed?.used_vscode_agent).toBe(fields.used_vscode_agent);
    expect(parsed?.totals_by_vscode_agent).toEqual(fields.totals_by_vscode_agent);
    expect(parsed?.totals_by_feature).toEqual([]);
    expect(parsed?.totals_by_ide).toEqual([]);
    expect(parsed?.user_initiated_interaction_count).toBe(0);
  });

  it('returns no daily data for an empty accumulator', () => {
    expect(computeVSCodeAgentUsage(createVSCodeAgentUsageAccumulator())).toEqual({
      summary: {
        activeUsers: null, sessionCount: null, userMessages: null,
        recordCount: 0, usageReportedRecords: 0, sessionsReportedRecords: 0, messagesReportedRecords: 0,
      },
      daily: [],
    });
  });

  it('keeps legacy and explicit null data unavailable rather than zero', () => {
    const result = usage({}, { user_id: 2, used_vscode_agent: null, totals_by_vscode_agent: null });
    expect(result.summary).toEqual({
      activeUsers: null, sessionCount: null, userMessages: null,
      recordCount: 2, usageReportedRecords: 0, sessionsReportedRecords: 0, messagesReportedRecords: 0,
    });
    expect(result.daily[0].activeUsers).toBeNull();
  });

  it('deduplicates active users across days and logins, sums counts, and tracks partial coverage independently', () => {
    const result = usage(
      { day: '2024-01-16', used_vscode_agent: true, totals_by_vscode_agent: { session_count: 2, total_user_messages: 8 } },
      { day: '2024-01-15', user_login: 'renamed', used_vscode_agent: true, totals_by_vscode_agent: { session_count: 3 } },
      { day: '2024-01-15', user_id: 2, used_vscode_agent: false, totals_by_vscode_agent: { session_count: 0, total_user_messages: 0 } },
      { day: '2024-01-15', user_id: 3 },
      { day: '2024-01-17', user_id: 2, used_vscode_agent: true, totals_by_vscode_agent: null },
    );
    expect(result.summary).toEqual({
      activeUsers: 2, sessionCount: 5, userMessages: 8,
      recordCount: 5, usageReportedRecords: 4, sessionsReportedRecords: 3, messagesReportedRecords: 2,
    });
    expect(result.daily.map(day => day.date)).toEqual(['2024-01-15', '2024-01-16', '2024-01-17']);
    expect(result.daily[0]).toMatchObject({
      activeUsers: 1, sessionCount: 3, userMessages: 0,
      recordCount: 3, usageReportedRecords: 2, sessionsReportedRecords: 2, messagesReportedRecords: 1,
    });
  });

  it('keeps explicit false and zero distinct from flag-only and totals-only reporting, without inferring the flag from totals', () => {
    const result = usage(
      { day: '2024-01-15', used_vscode_agent: false, totals_by_vscode_agent: { session_count: 0, total_user_messages: 0 } },
      { day: '2024-01-16', used_vscode_agent: true },
      { day: '2024-01-17', totals_by_vscode_agent: { session_count: 4, total_user_messages: 6 } },
      { day: '2024-01-18', totals_by_vscode_agent: { session_count: null, total_user_messages: 6 } },
    );
    expect(result.daily).toMatchObject([
      { activeUsers: 0, sessionCount: 0, userMessages: 0 },
      { activeUsers: 1, sessionCount: null, userMessages: null },
      { activeUsers: null, sessionCount: 4, userMessages: 6, usageReportedRecords: 0 },
      { activeUsers: null, sessionCount: null, userMessages: 6 },
    ]);
  });
});
