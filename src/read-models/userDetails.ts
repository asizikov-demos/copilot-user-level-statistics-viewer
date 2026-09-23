import type { AggregatedMetrics, UserDetailedMetrics } from '../types/aggregatedMetrics';
import type { UserSummary } from '../types/metrics';
import type { SelectedUser } from '../types/navigation';
import type { DailyCliTokenData } from '../domain/calculators/metricCalculators';
import { mapReportRangeData } from '../utils/timeSeries';
import { generateDateRange } from '../utils/formatters';

export interface UserInteractionRank {
  rank: number;
  totalUsers: number;
}

export type UserDetailsRouteReadModel =
  | { status: 'missing-selection' }
  | { status: 'pending'; selectedUser: SelectedUser }
  | { status: 'missing-summary'; selectedUser: SelectedUser }
  | {
      status: 'resolved';
      selectedUser: SelectedUser;
      userSummary: UserSummary;
      interactionRank: UserInteractionRank;
      datasetKey: object;
    };

export type ResolvedUserDetailsReadModel = Extract<
  UserDetailsRouteReadModel,
  { status: 'resolved' }
>;

export interface UserDetailsViewModel {
  userDetails: UserDetailedMetrics;
  userSummary: UserSummary;
  interactionRank: UserInteractionRank;
  userLogin: string;
  userId: number;
}

export interface UserDetailsHeaderReadModel {
  daysActive: number;
  reportDays: number;
  activeDaysPercent: number;
  interactions: number;
  interactionRank: UserInteractionRank;
  topPercent: number;
  locAdded: number;
  locDeleted: number;
  netLoc: number;
  aiCreditsUsed: number;
  primaryClient: string | null;
  surfacesUsed: number;
  daysSinceLastActive: number | null;
}

export interface CopilotCliAndAppUsageReadModel {
  dailyCliTokenData: DailyCliTokenData[];
  dailyAppTokenData: DailyCliTokenData[];
  hasActivity: boolean;
  hasAppActivity: boolean;
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
  const getCliTotals = (day: UserDetailedMetrics['days'][number]) => day.totals_by_cli;
  const getAppTotals = (day: UserDetailedMetrics['days'][number]) => day.totals_by_copilot_app;
  const hasActivity = userDetails.days.some(
    day => getCliTotals(day) !== undefined || getAppTotals(day) !== undefined
  );
  if (!hasActivity) {
    return {
      dailyCliTokenData: [],
      dailyAppTokenData: [],
      hasActivity: false,
      hasAppActivity: false,
    };
  }

  const dailyCliTokenData = selectDailyClientUsage(userDetails, getCliTotals, toTokenData);
  const dailyAppTokenData = selectDailyClientUsage(userDetails, getAppTotals, toTokenData);

  return {
    dailyCliTokenData,
    dailyAppTokenData,
    hasActivity: true,
    hasAppActivity: userDetails.days.some(day => getAppTotals(day) != null),
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

  const interactions = userSummary.total_user_initiated_interactions;
  const interactionRank: UserInteractionRank = {
    rank: 1 + metrics.users.userSummaries.filter(
      (summary) => summary.total_user_initiated_interactions > interactions
    ).length,
    totalUsers: metrics.users.userSummaries.length,
  };

  return {
    status: 'resolved',
    selectedUser,
    userSummary,
    interactionRank,
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
    interactionRank: routeModel.interactionRank,
    userLogin: routeModel.selectedUser.login,
    userId: routeModel.selectedUser.id,
  };
}

const DAY_MS = 86_400_000;

export function selectUserDetailsHeaderReadModel(
  model: UserDetailsViewModel
): UserDetailsHeaderReadModel {
  const { userDetails, userSummary, interactionRank } = model;
  const reportDays = generateDateRange(userDetails.reportStartDay, userDetails.reportEndDay).length;
  const lastActiveDay = userDetails.days.reduce<string | null>(
    (latest, day) => (latest === null || day.day > latest ? day.day : latest),
    null
  );
  const daysSinceLastActive = lastActiveDay === null
    ? null
    : Math.max(0, Math.round(
      (Date.parse(`${userDetails.reportEndDay}T00:00:00Z`) - Date.parse(`${lastActiveDay}T00:00:00Z`)) / DAY_MS
    ));
  const surfacesUsed = userSummary.clients_used.length
    + (userSummary.cloud_agent_days > 0 ? 1 : 0)
    + (userSummary.code_review_days > 0 ? 1 : 0);

  return {
    daysActive: userSummary.days_active,
    reportDays,
    activeDaysPercent: reportDays > 0 ? Math.round((userSummary.days_active / reportDays) * 100) : 0,
    interactions: userSummary.total_user_initiated_interactions,
    interactionRank,
    topPercent: interactionRank.totalUsers > 0
      ? Math.max(1, Math.ceil((interactionRank.rank / interactionRank.totalUsers) * 100))
      : 0,
    locAdded: userSummary.total_loc_added,
    locDeleted: userSummary.total_loc_deleted,
    netLoc: userSummary.total_loc_added - userSummary.total_loc_deleted,
    aiCreditsUsed: userDetails.total_ai_credits_used,
    primaryClient: userSummary.top_client,
    surfacesUsed,
    daysSinceLastActive,
  };
}
