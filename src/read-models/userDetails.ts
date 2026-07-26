import type { AggregatedMetrics, UserDetailedMetrics } from '../types/aggregatedMetrics';
import type { UserSummary } from '../types/metrics';
import type { SelectedUser } from '../types/navigation';

export type UserDetailsRouteReadModel =
  | { status: 'missing-selection' }
  | { status: 'pending'; selectedUser: SelectedUser }
  | { status: 'missing-summary'; selectedUser: SelectedUser }
  | {
      status: 'resolved';
      selectedUser: SelectedUser;
      userSummary: UserSummary;
      datasetKey: object;
    };

export type ResolvedUserDetailsReadModel = Extract<
  UserDetailsRouteReadModel,
  { status: 'resolved' }
>;

export interface UserDetailsViewModel {
  userDetails: UserDetailedMetrics;
  userSummary: UserSummary;
  userLogin: string;
  userId: number;
}

export function selectUserDetailsRouteReadModel(
  metrics: AggregatedMetrics | null,
  selectedUser: SelectedUser | null
): UserDetailsRouteReadModel {
  if (!selectedUser) {
    return { status: 'missing-selection' };
  }
  if (!metrics) {
    return { status: 'pending', selectedUser };
  }

  const userSummary = metrics.users.userSummaries.find(
    (summary) => summary.user_id === selectedUser.id
  );
  if (!userSummary) {
    return { status: 'missing-summary', selectedUser };
  }

  return {
    status: 'resolved',
    selectedUser,
    userSummary,
    datasetKey: metrics,
  };
}

export function selectUserDetailsViewModel(
  routeModel: ResolvedUserDetailsReadModel,
  userDetails: UserDetailedMetrics
): UserDetailsViewModel {
  return {
    userDetails,
    userSummary: routeModel.userSummary,
    userLogin: routeModel.selectedUser.login,
    userId: routeModel.selectedUser.id,
  };
}
