import { describe, expect, it } from 'vitest';
import { VIEW_MODES } from '../../../../types/navigation';
import { makeUserSummary } from '../../../../__tests__/factories/aggregatedMetrics';
import {
  resolveUserDetailsRouteState,
  type UserDetailsLoadState,
} from '../userDetailsRouteState';
import { makeUserDetails } from './helpers/userDetailsFixtures';

const dataset = {};
const selectedUser = { id: 42, login: 'octocat' };
const userSummary = makeUserSummary({
  user_id: selectedUser.id,
  user_login: selectedUser.login,
});
const details = makeUserDetails();

function resolve(loadState: UserDetailsLoadState) {
  return resolveUserDetailsRouteState({
    currentView: VIEW_MODES.USER_DETAILS,
    routeModel: {
      status: 'resolved',
      selectedUser,
      userSummary,
      interactionRank: { rank: 1, totalUsers: 1 },
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
        interactionRank: { rank: 1, totalUsers: 1 },
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

  it.each([
    { obsolete: 'dataset', loadDataset: {}, userId: selectedUser.id },
    { obsolete: 'user', loadDataset: dataset, userId: 7 },
  ])('treats results from an obsolete $obsolete as loading', ({ loadDataset, userId }) => {
    expect(resolve({
      status: 'ready',
      dataset: loadDataset,
      userId,
      details,
    })).toMatchObject({ status: 'loading', userSummary });
  });
});
