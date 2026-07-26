import { describe, expect, it } from 'vitest';
import {
  makeAggregatedMetrics,
  makeUserSummary,
} from '../../__tests__/factories/aggregatedMetrics';
import {
  selectExecutiveSummaryReadModel,
  selectOverviewReadModel,
} from '../overview';
import { selectUserDetailsRouteReadModel } from '../userDetails';
import { selectUsersReadModel } from '../users';

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
