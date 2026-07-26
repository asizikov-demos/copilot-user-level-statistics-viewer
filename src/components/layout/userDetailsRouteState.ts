import type { UserDetailedMetrics } from '../../types/aggregatedMetrics';
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
  | {
      status: 'ready';
      selectedUser: SelectedUser;
      userSummary: UserSummary;
      details: UserDetailedMetrics;
    };

interface ResolveUserDetailsRouteStateOptions {
  currentView: ViewMode;
  selectedUser: SelectedUser | null;
  userSummaries: UserSummary[] | null;
  dataset: object | null;
  loadState: UserDetailsLoadState;
}

export function resolveUserDetailsRouteState({
  currentView,
  selectedUser,
  userSummaries,
  dataset,
  loadState,
}: ResolveUserDetailsRouteStateOptions): UserDetailsRouteState {
  if (currentView !== VIEW_MODES.USER_DETAILS) {
    return { status: 'inactive' };
  }

  if (!selectedUser) {
    return { status: 'redirect', reason: 'missing-selection' };
  }

  if (!userSummaries || !dataset) {
    return { status: 'loading', selectedUser, userSummary: null };
  }

  const userSummary = userSummaries.find((summary) => summary.user_id === selectedUser.id);
  if (!userSummary) {
    return { status: 'redirect', reason: 'missing-summary' };
  }

  if (
    loadState.status === 'idle'
    || loadState.dataset !== dataset
    || loadState.userId !== selectedUser.id
  ) {
    return { status: 'loading', selectedUser, userSummary };
  }

  if (loadState.status === 'error') {
    return {
      status: 'error',
      selectedUser,
      userSummary,
      message: loadState.message,
    };
  }

  if (loadState.status === 'ready') {
    return {
      status: 'ready',
      selectedUser,
      userSummary,
      details: loadState.details,
    };
  }

  return { status: 'loading', selectedUser, userSummary };
}
