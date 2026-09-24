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
  selectUserDetailsHeaderReadModel,
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
      header: expect.any(Object),
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
      'header',
    ]);
  });

  it('selects only executive-summary fields and preserves aggregate references', () => {
    const metrics = makeAggregatedMetrics();
    const model = selectExecutiveSummaryReadModel(metrics);

    expect(model).toEqual({
      enterpriseId: metrics.overview.stats.enterpriseId,
      summary: metrics.overview.executiveSummary,
      featureAdoptionData: metrics.adoption.featureAdoptionData,
    });
    expect(model.summary).toBe(metrics.overview.executiveSummary);
    expect(model.featureAdoptionData).toBe(metrics.adoption.featureAdoptionData);
    expect(Object.keys(model)).toEqual([
      'enterpriseId',
      'summary',
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
      interactionRank: { rank: 1, totalUsers: 1 },
      datasetKey: metrics,
    });
    if (model.status === 'resolved') {
      expect(model.userSummary).toBe(userSummary);
      expect(model.datasetKey).toBe(metrics);
      expect(Object.keys(model)).toEqual([
        'status',
        'selectedUser',
        'userSummary',
        'interactionRank',
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

  it('ranks the selected user by interactions, sharing rank on ties', () => {
    const summaries = [
      makeUserSummary({ user_id: 1, user_login: 'a', total_user_initiated_interactions: 50 }),
      makeUserSummary({ user_id: 2, user_login: 'b', total_user_initiated_interactions: 20 }),
      makeUserSummary({ user_id: 3, user_login: 'c', total_user_initiated_interactions: 20 }),
      makeUserSummary({ user_id: 4, user_login: 'd', total_user_initiated_interactions: 5 }),
    ];
    const metrics = makeAggregatedMetrics({ users: { userSummaries: summaries } });

    const tied = selectUserDetailsRouteReadModel(metrics, { id: 3, login: 'c' });
    const last = selectUserDetailsRouteReadModel(metrics, { id: 4, login: 'd' });

    expect(tied).toMatchObject({ interactionRank: { rank: 2, totalUsers: 4 } });
    expect(last).toMatchObject({ interactionRank: { rank: 4, totalUsers: 4 } });
  });

  it('derives header KPIs from the user summary and detail days', () => {
    const accumulator = createUserDetailAccumulator();
    accumulator.reportStartDay = '2024-01-01';
    accumulator.reportEndDay = '2024-01-10';
    accumulateUserDetail(accumulator, makeMetric({ day: '2024-01-02' }));
    accumulateUserDetail(accumulator, makeMetric({ day: '2024-01-07' }));
    const userDetails = computeSingleUserDetailedMetrics(accumulator, makeMetric().user_id)!;
    const userSummary = makeUserSummary({
      days_active: 2,
      total_user_initiated_interactions: 120,
      total_loc_added: 300,
      total_loc_deleted: 450,
      top_client: 'vscode',
      clients_used: ['copilot_cli', 'vscode'],
      cloud_agent_days: 1,
      code_review_days: 0,
    });

    const header = selectUserDetailsHeaderReadModel({
      userDetails,
      userSummary,
      interactionRank: { rank: 34, totalUsers: 797 },
      userLogin: userSummary.user_login,
      userId: userSummary.user_id,
    });

    expect(header).toMatchObject({
      daysActive: 2,
      reportDays: 10,
      activeDaysPercent: 20,
      interactions: 120,
      topPercent: 5,
      locAdded: 300,
      locDeleted: 450,
      netLoc: -150,
      primaryClient: 'vscode',
      surfacesUsed: 3,
      daysSinceLastActive: 3,
    });
  });

  it('reports no last activity when the user has no detail days', () => {
    const accumulator = createUserDetailAccumulator();
    accumulator.reportStartDay = '2024-01-01';
    accumulator.reportEndDay = '2024-01-10';
    accumulateUserDetail(accumulator, makeMetric({ day: '2024-01-02' }));
    const userDetails = {
      ...computeSingleUserDetailedMetrics(accumulator, makeMetric().user_id)!,
      days: [],
    };

    const header = selectUserDetailsHeaderReadModel({
      userDetails,
      userSummary: makeUserSummary(),
      interactionRank: { rank: 1, totalUsers: 1 },
      userLogin: 'octocat',
      userId: 42,
    });

    expect(header.daysSinceLastActive).toBeNull();
    expect(header.topPercent).toBe(100);
  });

  it('projects aligned CLI and App token series across the report range', () => {
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
    expect(usage.hasAppActivity).toBe(true);
    expect(usage.dailyCliTokenData).toEqual([
      { date: '2024-01-01', outputTokens: 20, promptTokens: 30, requestCount: 4 },
      { date: '2024-01-02', outputTokens: 0, promptTokens: 0, requestCount: 0 },
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
