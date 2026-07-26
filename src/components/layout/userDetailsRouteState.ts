import type { UserDetailedMetrics } from '../../types/aggregatedMetrics';
import {
  selectUserDetailsViewModel,
  type UserDetailsRouteReadModel,
  type UserDetailsViewModel,
} from '../../read-models/userDetails';
import type { UserSummary } from '../../types/metrics';
import type { SelectedUser, ViewMode } from '../../types/navigation';
import { VIEW_MODES } from '../../types/navigation';

export type UserDetailsLoadState =
  | { status: 'idle' }
  | { status: 'loading'; dataset: object; userId: number }
  | { status: 'error'; dataset: object; userId: number; message: string }
  | { status: 'ready'; dataset: object; userId: number; details: UserDetailedMetrics };

export type UserDetailsRouteState =
  | { status: 'inactive' }
  | { status: 'redirect'; reason: 'missing-selection' | 'missing-summary' }
  | { status: 'loading'; selectedUser: SelectedUser; userSummary: UserSummary | null }
  | { status: 'error'; selectedUser: SelectedUser; userSummary: UserSummary; message: string }
  | { status: 'ready'; model: UserDetailsViewModel };

interface ResolveUserDetailsRouteStateOptions {
  currentView: ViewMode;
  routeModel: UserDetailsRouteReadModel;
  loadState: UserDetailsLoadState;
}

export function resolveUserDetailsRouteState({
  currentView,
  routeModel,
  loadState,
}: ResolveUserDetailsRouteStateOptions): UserDetailsRouteState {
  if (currentView !== VIEW_MODES.USER_DETAILS) {
    return { status: 'inactive' };
  }

  if (routeModel.status === 'missing-selection') {
    return { status: 'redirect', reason: 'missing-selection' };
  }

  if (routeModel.status === 'pending') {
    return { status: 'loading', selectedUser: routeModel.selectedUser, userSummary: null };
  }

  if (routeModel.status === 'missing-summary') {
    return { status: 'redirect', reason: 'missing-summary' };
  }

  if (
    loadState.status === 'idle'
    || loadState.dataset !== routeModel.datasetKey
    || loadState.userId !== routeModel.selectedUser.id
  ) {
    return {
      status: 'loading',
      selectedUser: routeModel.selectedUser,
      userSummary: routeModel.userSummary,
    };
  }

  if (loadState.status === 'error') {
    return {
      status: 'error',
      selectedUser: routeModel.selectedUser,
      userSummary: routeModel.userSummary,
      message: loadState.message,
    };
  }

  if (loadState.status === 'ready') {
    return {
      status: 'ready',
      model: selectUserDetailsViewModel(routeModel, loadState.details),
    };
  }

  return {
    status: 'loading',
    selectedUser: routeModel.selectedUser,
    userSummary: routeModel.userSummary,
  };
}
