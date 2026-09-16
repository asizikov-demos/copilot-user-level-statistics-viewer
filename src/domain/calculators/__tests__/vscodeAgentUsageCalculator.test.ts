import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../metricsAggregator';
import { parseMetricsLine } from '../../metricsParser';
import { computeSingleUserDetailedMetrics } from '../userDetailCalculator';

describe('VS Code Agents metrics', () => {
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

  it('keeps legacy and explicit null data unavailable rather than zero', () => {
    const { aggregated, userDetailAccumulator } = aggregateMetrics([
      makeMetric(),
      makeMetric({ user_id: 2, used_vscode_agent: null, totals_by_vscode_agent: null }),
    ]);
    expect(aggregated.adoption.vscodeAgentUsage.summary).toEqual({
      activeUsers: null, sessionCount: null, userMessages: null,
      recordCount: 2, usageReportedRecords: 0, sessionsReportedRecords: 0, messagesReportedRecords: 0,
    });
    expect(aggregated.adoption.vscodeAgentUsage.daily[0].activeUsers).toBeNull();
    expect(computeSingleUserDetailedMetrics(userDetailAccumulator, 1)?.days[0].used_vscode_agent).toBeUndefined();
    expect(computeSingleUserDetailedMetrics(userDetailAccumulator, 2)?.days[0].totals_by_vscode_agent).toBeNull();
  });

  it('deduplicates active users across days and logins, sums counts, and tracks partial coverage independently', () => {
    const { aggregated, userDetailAccumulator } = aggregateMetrics([
      makeMetric({ day: '2024-01-16', used_vscode_agent: true, totals_by_vscode_agent: { session_count: 2, total_user_messages: 8 } }),
      makeMetric({ day: '2024-01-15', user_login: 'renamed', used_vscode_agent: true, totals_by_vscode_agent: { session_count: 3 } }),
      makeMetric({ day: '2024-01-15', user_id: 2, used_vscode_agent: false, totals_by_vscode_agent: { session_count: 0, total_user_messages: 0 } }),
      makeMetric({ day: '2024-01-15', user_id: 3 }),
      makeMetric({ day: '2024-01-17', user_id: 2, used_vscode_agent: true, totals_by_vscode_agent: null }),
    ]);
    const usage = aggregated.adoption.vscodeAgentUsage;
    expect(usage.summary).toEqual({
      activeUsers: 2, sessionCount: 5, userMessages: 8,
      recordCount: 5, usageReportedRecords: 4, sessionsReportedRecords: 3, messagesReportedRecords: 2,
    });
    expect(usage.daily.map(day => day.date)).toEqual(['2024-01-15', '2024-01-16', '2024-01-17']);
    expect(usage.daily[0]).toMatchObject({
      activeUsers: 1, sessionCount: 3, userMessages: 0,
      recordCount: 3, usageReportedRecords: 2, sessionsReportedRecords: 2, messagesReportedRecords: 1,
    });
    const user = computeSingleUserDetailedMetrics(userDetailAccumulator, 1);
    expect(user?.vscodeAgentUsage.summary).toMatchObject({
      activeUsers: 1, sessionCount: 5, userMessages: 8, recordCount: 2,
    });
    expect(user?.vscodeAgentUsage.daily).toHaveLength(2);
    expect(aggregated.users.userSummaries.find(user => user.user_id === 2)?.used_vscode_agent).toBe(true);
  });

  it('does not infer flags or mix Agents-window totals into generic, editor, client, or LOC rollups', () => {
    const metric = makeMetric({
      totals_by_vscode_agent: { session_count: 4, total_user_messages: 20 },
    });
    const { aggregated, userDetailAccumulator } = aggregateMetrics([metric]);
    expect(aggregated.adoption.vscodeAgentUsage.summary).toMatchObject({
      activeUsers: null, sessionCount: 4, userMessages: 20, usageReportedRecords: 0,
    });
    expect(aggregated.overview.stats.agentUsers).toBe(0);
    expect(aggregated.adoption.featureAdoptionData.agentModeUsers).toBe(0);
    expect(aggregated.clients.ideStats).toEqual([]);
    expect(aggregated.users.userSummaries[0]).toMatchObject({
      total_user_initiated_interactions: 0, total_loc_added: 0, used_agent: false,
    });
    const details = computeSingleUserDetailedMetrics(userDetailAccumulator, 1);
    expect(details?.featureAggregates).toEqual([]);
    expect(details?.ideAggregates).toEqual([]);
    expect(details?.days[0].totals_by_vscode_agent).toEqual(metric.totals_by_vscode_agent);
    expect(details?.days[0].totals_by_vscode_agent).not.toBe(metric.totals_by_vscode_agent);
  });

  it('keeps explicit false and zero distinct from flag-only and totals-only reporting', () => {
    const { aggregated } = aggregateMetrics([
      makeMetric({ day: '2024-01-15', used_vscode_agent: false, totals_by_vscode_agent: { session_count: 0, total_user_messages: 0 } }),
      makeMetric({ day: '2024-01-16', used_vscode_agent: true }),
      makeMetric({ day: '2024-01-17', totals_by_vscode_agent: { session_count: null, total_user_messages: 6 } }),
    ]);
    expect(aggregated.adoption.vscodeAgentUsage.daily).toMatchObject([
      { activeUsers: 0, sessionCount: 0, userMessages: 0 },
      { activeUsers: 1, sessionCount: null, userMessages: null },
      { activeUsers: null, sessionCount: null, userMessages: 6 },
    ]);
  });
});
