import { describe, expect, it } from 'vitest';
import type { UserDetailedMetrics } from '../../../types/aggregatedMetrics';
import type { UserSummary } from '../../../types/metrics';
import { VIEW_MODES } from '../../../types/navigation';
import {
  resolveUserDetailsRouteState,
  type UserDetailsLoadState,
} from '../userDetailsRouteState';

const dataset = {};
const selectedUser = { id: 42, login: 'octocat' };
const userSummary: UserSummary = {
  user_id: selectedUser.id,
  user_login: selectedUser.login,
  total_user_initiated_interactions: 0,
  total_code_generation_activities: 0,
  total_code_acceptance_activities: 0,
  total_loc_added: 0,
  total_loc_deleted: 0,
  total_loc_suggested_to_add: 0,
  total_loc_suggested_to_delete: 0,
  total_ai_credits_used: 0,
  net_loc_contribution: 0,
  days_active: 0,
  cloud_agent_days: 0,
  code_review_days: 0,
  top_client: null,
  used_agent: false,
  used_chat: false,
  used_cli: false,
  used_copilot_coding_agent: false,
  used_copilot_code_review_active: false,
  used_copilot_code_review_passive: false,
};
const details: UserDetailedMetrics = {
  totalModelRequests: 0,
  total_ai_credits_used: 0,
  featureAggregates: [],
  ideAggregates: [],
  languageFeatureAggregates: [],
  modelFeatureAggregates: [],
  pluginVersions: [],
  cliVersions: [],
  dailyCombinedImpact: [],
  dailyModelUsage: [],
  dailyAgentImpact: [],
  dailyAskModeImpact: [],
  dailyCompletionImpact: [],
  dailyCliImpact: [],
  days: [],
  reportStartDay: '2024-01-01',
  reportEndDay: '2024-01-31',
};

function resolve(loadState: UserDetailsLoadState) {
  return resolveUserDetailsRouteState({
    currentView: VIEW_MODES.USER_DETAILS,
    routeModel: {
      status: 'resolved',
      selectedUser,
      userSummary,
      datasetKey: dataset,
    },
    loadState,
  });
}

describe('resolveUserDetailsRouteState', () => {
  it('returns inactive outside the user-details view', () => {
    const state = resolveUserDetailsRouteState({
      currentView: VIEW_MODES.USERS,
      routeModel: {
        status: 'resolved',
        selectedUser,
        userSummary,
        datasetKey: dataset,
      },
      loadState: { status: 'idle' },
    });

    expect(state).toEqual({ status: 'inactive' });
  });

  it('redirects when no user is selected', () => {
    const state = resolveUserDetailsRouteState({
      currentView: VIEW_MODES.USER_DETAILS,
      routeModel: { status: 'missing-selection' },
      loadState: { status: 'idle' },
    });

    expect(state).toEqual({ status: 'redirect', reason: 'missing-selection' });
  });

  it('redirects when the selected user has no aggregate summary', () => {
    const state = resolveUserDetailsRouteState({
      currentView: VIEW_MODES.USER_DETAILS,
      routeModel: { status: 'missing-summary', selectedUser },
      loadState: { status: 'idle' },
    });

    expect(state).toEqual({ status: 'redirect', reason: 'missing-summary' });
  });

  it('returns loading while the matching request is pending', () => {
    expect(resolve({
      status: 'loading',
      dataset,
      userId: selectedUser.id,
    })).toMatchObject({ status: 'loading', userSummary });
  });

  it('returns the matching request error', () => {
    expect(resolve({
      status: 'error',
      dataset,
      userId: selectedUser.id,
      message: 'Worker unavailable',
    })).toMatchObject({ status: 'error', message: 'Worker unavailable', userSummary });
  });

  it('returns ready with matching user details', () => {
    expect(resolve({
      status: 'ready',
      dataset,
      userId: selectedUser.id,
      details,
    })).toMatchObject({
      status: 'ready',
      model: {
        userDetails: details,
        userSummary,
        userLogin: selectedUser.login,
        userId: selectedUser.id,
      },
    });
  });

  it('treats results from an obsolete dataset as loading', () => {
    expect(resolve({
      status: 'ready',
      dataset: {},
      userId: selectedUser.id,
      details,
    })).toMatchObject({ status: 'loading', userSummary });
  });
});
