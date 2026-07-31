import type { AggregatedMetrics, UserDetailedMetrics } from '../types/aggregatedMetrics';
import type { UserSummary } from '../types/metrics';
import type { SelectedUser } from '../types/navigation';
import type {
  DailyCliSessionData,
  DailyCliTokenData,
} from '../domain/calculators/metricCalculators';
import { mapReportRangeData } from '../utils/timeSeries';

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

export interface CopilotCliAndAppUsageReadModel {
  dailyCliTokenData: DailyCliTokenData[];
  dailyAppTokenData: DailyCliTokenData[];
  dailyCliSessionData: DailyCliSessionData[];
  dailyAppSessionData: DailyCliSessionData[];
  hasActivity: boolean;
}

function selectDailyClientUsage<T>(
  userDetails: UserDetailedMetrics,
  getTotals: (day: UserDetailedMetrics['days'][number]) =>
    | NonNullable<UserDetailedMetrics['days'][number]['totals_by_copilot_app']>
    | NonNullable<UserDetailedMetrics['days'][number]['totals_by_cli']>
    | undefined,
  mapTotals: (
    date: string,
    totals:
      | NonNullable<UserDetailedMetrics['days'][number]['totals_by_copilot_app']>
      | NonNullable<UserDetailedMetrics['days'][number]['totals_by_cli']>
      | undefined
  ) => T,
): T[] {
  return mapReportRangeData(
    userDetails.days,
    userDetails.reportStartDay,
    userDetails.reportEndDay,
    day => day.day,
    (date, day) => mapTotals(date, day ? getTotals(day) : undefined),
  );
}

export function selectCopilotCliAndAppUsageReadModel(
  userDetails: UserDetailedMetrics
): CopilotCliAndAppUsageReadModel {
  const toTokenData = (
    date: string,
    totals: NonNullable<UserDetailedMetrics['days'][number]['totals_by_copilot_app']>
      | NonNullable<UserDetailedMetrics['days'][number]['totals_by_cli']>
      | undefined
  ): DailyCliTokenData => ({
    date,
    outputTokens: totals?.token_usage.output_tokens_sum ?? 0,
    promptTokens: totals?.token_usage.prompt_tokens_sum ?? 0,
    requestCount: totals?.request_count ?? 0,
  });
  const toSessionData = (
    date: string,
    totals: NonNullable<UserDetailedMetrics['days'][number]['totals_by_copilot_app']>
      | NonNullable<UserDetailedMetrics['days'][number]['totals_by_cli']>
      | undefined
  ): DailyCliSessionData => ({
    date,
    sessionCount: totals?.session_count ?? 0,
    requestCount: totals?.request_count ?? 0,
    promptCount: totals?.prompt_count ?? 0,
    uniqueUsers: totals ? 1 : 0,
  });
  const getCliTotals = (day: UserDetailedMetrics['days'][number]) => day.totals_by_cli;
  const getAppTotals = (day: UserDetailedMetrics['days'][number]) => day.totals_by_copilot_app;
  const hasActivity = userDetails.days.some(
    day => getCliTotals(day) !== undefined || getAppTotals(day) !== undefined
  );
  if (!hasActivity) {
    return {
      dailyCliTokenData: [],
      dailyAppTokenData: [],
      dailyCliSessionData: [],
      dailyAppSessionData: [],
      hasActivity: false,
    };
  }

  const dailyCliTokenData = selectDailyClientUsage(userDetails, getCliTotals, toTokenData);
  const dailyAppTokenData = selectDailyClientUsage(userDetails, getAppTotals, toTokenData);

  return {
    dailyCliTokenData,
    dailyAppTokenData,
    dailyCliSessionData: selectDailyClientUsage(userDetails, getCliTotals, toSessionData),
    dailyAppSessionData: selectDailyClientUsage(userDetails, getAppTotals, toSessionData),
    hasActivity: true,
  };
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
