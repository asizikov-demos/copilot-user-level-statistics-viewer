import { makeUserSummary } from '../../../../../__tests__/factories/aggregatedMetrics';
import type { UserDetailsViewModel } from '../../../../../read-models/userDetails';
import type {
  AgentActivity,
  AgentActivityBySurface,
  AgentActivityCounts,
} from '../../../../../types/agentActivity';
import type { UserDetailedMetrics } from '../../../../../types/aggregatedMetrics';
import type {
  CliCustomizationCategory,
  CliCustomizationDaySummary,
  CliCustomizationItemSummary,
  CliCustomizationSummary,
} from '../../../../../types/cliCustomizations';
import type { UserDayData } from '../../../../../types/metrics';

const REPORT_START_DAY = '2024-01-01';
const REPORT_END_DAY = '2024-01-31';

const EMPTY_COUNTS: AgentActivityCounts = { sessions: null, userInputs: null, requests: null };

export function makeAgentActivity(
  reported: Partial<AgentActivityBySurface> = {},
  date = '2024-01-15'
): AgentActivity {
  const summary: AgentActivityBySurface = {
    cli: { ...EMPTY_COUNTS, ...reported.cli },
    app: { ...EMPTY_COUNTS, ...reported.app },
    vscodeAgents: { ...EMPTY_COUNTS, ...reported.vscodeAgents },
  };
  const hasActivity = Object.values(reported).length > 0;
  return { summary, daily: hasActivity ? [{ date, ...summary }] : [] };
}

export function makeUserDay(overrides: Partial<UserDayData> = {}): UserDayData {
  return {
    day: '2024-01-15',
    user_initiated_interaction_count: 0,
    code_generation_activity_count: 0,
    code_acceptance_activity_count: 0,
    loc_added_sum: 0,
    loc_deleted_sum: 0,
    loc_suggested_to_add_sum: 0,
    loc_suggested_to_delete_sum: 0,
    ai_credits_used: 0,
    used_copilot_app: false,
    used_copilot_coding_agent: false,
    used_copilot_code_review_active: false,
    used_copilot_code_review_passive: false,
    totals_by_feature: [],
    totals_by_ide: [],
    totals_by_language_feature: [],
    totals_by_language_model: [],
    totals_by_model_feature: [],
    ...overrides,
  };
}

export function makeUserDetails(
  overrides: Partial<UserDetailedMetrics> = {}
): UserDetailedMetrics {
  return {
    telemetryWarnings: [],
    agentActivity: makeAgentActivity(),
    cliCustomizations: [],
    vscodeAgentUsage: {
      summary: {
        activeUsers: null,
        sessionCount: null,
        userMessages: null,
        recordCount: 0,
        usageReportedRecords: 0,
        sessionsReportedRecords: 0,
        messagesReportedRecords: 0,
      },
      daily: [],
    },
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
    dailyCopilotAppImpact: [],
    dailyCliImpact: [],
    days: [],
    reportStartDay: REPORT_START_DAY,
    reportEndDay: REPORT_END_DAY,
    ...overrides,
  };
}

export function makeUserDetailsViewModel(
  overrides: Partial<UserDetailsViewModel> = {}
): UserDetailsViewModel {
  const userId = overrides.userId ?? 42;
  const userLogin = overrides.userLogin ?? 'octocat';
  return {
    userDetails: makeUserDetails(),
    userSummary: makeUserSummary({ user_id: userId, user_login: userLogin }),
    interactionRank: { rank: 1, totalUsers: 1 },
    userLogin,
    userId,
    ...overrides,
  };
}

export function makeCustomizationItem(
  name: string,
  interactionCount: number,
  overrides: Partial<CliCustomizationItemSummary> = {}
): CliCustomizationItemSummary {
  return {
    name,
    interactionCount,
    daysInvoked: interactionCount > 0 ? 1 : 0,
    averagePerDay: interactionCount > 0 ? interactionCount : null,
    ...overrides,
  };
}

export function makeCustomizationSummary(
  category: CliCustomizationCategory,
  summedDailyDistinctItems: number | null,
  items: CliCustomizationItemSummary[] = []
): CliCustomizationSummary {
  return {
    category,
    observedInteractions: null,
    legacyEntryCount: 0,
    items,
    recordCount: 1,
    entriesReportedRecords: items.length > 0 ? 1 : 0,
    distinctReportedRecords: summedDailyDistinctItems === null ? 0 : 1,
    activeRecords: null,
    averageDistinctItems: summedDailyDistinctItems,
    summedDailyDistinctItems,
  };
}

export function makeCustomizationDaySummary(
  category: CliCustomizationCategory,
  distinctItems: number | null,
  items: CliCustomizationItemSummary[] = []
): CliCustomizationDaySummary {
  return {
    category,
    observedInteractions: null,
    legacyEntryCount: 0,
    items,
    distinctItems,
  };
}
