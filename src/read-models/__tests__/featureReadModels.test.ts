import { describe, expect, it } from 'vitest';
import {
  makeAggregatedMetrics,
  makeUserSummary,
} from '../../__tests__/factories/aggregatedMetrics';
import {
  selectExecutiveSummaryReadModel,
  selectOverviewReadModel,
} from '../overview';
import {
  selectCopilotCliAndAppUsageReadModel,
  selectUserDetailsRouteReadModel,
} from '../userDetails';
import { selectUsersReadModel } from '../users';
import {
  accumulateUserDetail,
  computeSingleUserDetailedMetrics,
  createUserDetailAccumulator,
} from '../../domain/calculators/userDetailCalculator';
import { makeMetric } from '../../__tests__/factories/metrics';

describe('feature read models', () => {
  it('selects only overview fields and preserves series references', () => {
    const metrics = makeAggregatedMetrics();
    const model = selectOverviewReadModel(metrics);

    expect(model).toEqual({
      reportStartDay: metrics.overview.stats.reportStartDay,
      reportEndDay: metrics.overview.stats.reportEndDay,
      engagementData: metrics.overview.engagementData,
      chatUsersData: metrics.overview.chatUsersData,
      chatRequestsData: metrics.overview.chatRequestsData,
    });
    expect(model.engagementData).toBe(metrics.overview.engagementData);
    expect(model.chatUsersData).toBe(metrics.overview.chatUsersData);
    expect(model.chatRequestsData).toBe(metrics.overview.chatRequestsData);
    expect(Object.keys(model)).toEqual([
      'reportStartDay',
      'reportEndDay',
      'engagementData',
      'chatUsersData',
      'chatRequestsData',
    ]);
  });

  it('selects only executive-summary fields and preserves aggregate references', () => {
    const metrics = makeAggregatedMetrics();
    const model = selectExecutiveSummaryReadModel(metrics);

    expect(model).toEqual({
      reportStartDay: metrics.overview.stats.reportStartDay,
      reportEndDay: metrics.overview.stats.reportEndDay,
      joinedImpactData: metrics.impact.joinedImpactData,
      agentImpactData: metrics.impact.agentImpactData,
      codeCompletionImpactData: metrics.impact.codeCompletionImpactData,
      featureAdoptionData: metrics.adoption.featureAdoptionData,
    });
    expect(model.joinedImpactData).toBe(metrics.impact.joinedImpactData);
    expect(model.agentImpactData).toBe(metrics.impact.agentImpactData);
    expect(model.codeCompletionImpactData).toBe(metrics.impact.codeCompletionImpactData);
    expect(model.featureAdoptionData).toBe(metrics.adoption.featureAdoptionData);
    expect(Object.keys(model)).toEqual([
      'reportStartDay',
      'reportEndDay',
      'joinedImpactData',
      'agentImpactData',
      'codeCompletionImpactData',
      'featureAdoptionData',
    ]);
  });

  it('projects the users list without copying it', () => {
    const users = [makeUserSummary()];
    const metrics = makeAggregatedMetrics({ users: { userSummaries: users } });
    const model = selectUsersReadModel(metrics);

    expect(model).toEqual({ users });
    expect(model.users).toBe(users);
    expect(Object.keys(model)).toEqual(['users']);
  });

  it('resolves a selected user while preserving summary and dataset identity', () => {
    const userSummary = makeUserSummary();
    const metrics = makeAggregatedMetrics({
      users: { userSummaries: [userSummary] },
    });
    const selectedUser = { id: userSummary.user_id, login: userSummary.user_login };

    const model = selectUserDetailsRouteReadModel(metrics, selectedUser);

    expect(model).toEqual({
      status: 'resolved',
      selectedUser,
      userSummary,
      datasetKey: metrics,
    });
    if (model.status === 'resolved') {
      expect(model.userSummary).toBe(userSummary);
      expect(model.datasetKey).toBe(metrics);
      expect(Object.keys(model)).toEqual([
        'status',
        'selectedUser',
        'userSummary',
        'datasetKey',
      ]);
    }
  });

  it('distinguishes missing selection, pending data, and a missing summary', () => {
    const selectedUser = { id: 404, login: 'missing' };

    expect(selectUserDetailsRouteReadModel(null, null)).toEqual({
      status: 'missing-selection',
    });

    expect(selectUserDetailsRouteReadModel(null, selectedUser)).toEqual({
      status: 'pending',
      selectedUser,
    });
    expect(
      selectUserDetailsRouteReadModel(makeAggregatedMetrics(), selectedUser)
    ).toEqual({
      status: 'missing-summary',
      selectedUser,
    });
  });

  it('projects aligned CLI and App usage series across the report range', () => {
    const accumulator = createUserDetailAccumulator();
    accumulator.reportStartDay = '2024-01-01';
    accumulator.reportEndDay = '2024-01-02';
    accumulateUserDetail(accumulator, makeMetric({
      day: '2024-01-01',
      totals_by_cli: {
        session_count: 2,
        request_count: 4,
        prompt_count: 3,
        token_usage: {
          output_tokens_sum: 20,
          prompt_tokens_sum: 30,
          avg_tokens_per_request: 12.5,
        },
      },
      totals_by_copilot_app: {
        session_count: 1,
        request_count: 5,
        prompt_count: 2,
        token_usage: {
          output_tokens_sum: 40,
          prompt_tokens_sum: 50,
          avg_tokens_per_request: 18,
        },
      },
    }));
    const details = computeSingleUserDetailedMetrics(accumulator, 1);

    expect(details).not.toBeNull();
    const usage = selectCopilotCliAndAppUsageReadModel(details!);

    expect(usage.hasActivity).toBe(true);
    expect(usage.dailyCliSessionData).toEqual([
      { date: '2024-01-01', sessionCount: 2, requestCount: 4, promptCount: 3, uniqueUsers: 1 },
      { date: '2024-01-02', sessionCount: 0, requestCount: 0, promptCount: 0, uniqueUsers: 0 },
    ]);
    expect(usage.dailyAppSessionData).toEqual([
      { date: '2024-01-01', sessionCount: 1, requestCount: 5, promptCount: 2, uniqueUsers: 1 },
      { date: '2024-01-02', sessionCount: 0, requestCount: 0, promptCount: 0, uniqueUsers: 0 },
    ]);
    expect(usage.dailyAppTokenData[0]).toEqual({
      date: '2024-01-01',
      outputTokens: 40,
      promptTokens: 50,
      requestCount: 5,
    });
  });

  it('does not mutate the aggregate input', () => {
    const metrics = makeAggregatedMetrics({
      users: { userSummaries: [makeUserSummary()] },
    });
    const before = structuredClone(metrics);

    selectOverviewReadModel(metrics);
    selectExecutiveSummaryReadModel(metrics);
    selectUsersReadModel(metrics);
    selectUserDetailsRouteReadModel(metrics, { id: 42, login: 'octocat' });

    expect(metrics).toEqual(before);
  });
});
