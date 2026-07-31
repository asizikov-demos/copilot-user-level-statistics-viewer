import { aggregateMetrics } from '../../domain/metricsAggregator';
import type { AggregatedMetrics } from '../../types/aggregatedMetrics';
import type { UserSummary } from '../../types/metrics';

type AggregatedMetricsOverrides = {
  [Slice in keyof AggregatedMetrics]?: Partial<AggregatedMetrics[Slice]>;
};

export const AGGREGATED_METRICS_SLICE_KEYS = {
  overview: ['stats', 'engagementData', 'chatUsersData', 'chatRequestsData'],
  users: ['userSummaries'],
  adoption: [
    'featureAdoptionData',
    'dailyAdoptionTrend',
    'dailyCloudAgentAdoptionData',
    'dailyCodeReviewAdoptionData',
  ],
  impact: [
    'agentImpactData',
    'codeCompletionImpactData',
    'editModeImpactData',
    'inlineModeImpactData',
    'askModeImpactData',
    'cliImpactData',
    'joinedImpactData',
  ],
  languages: [
    'languageStats',
    'languageFeatureImpactData',
    'dailyLanguageGenerationsData',
    'dailyLanguageLocData',
  ],
  clients: [
    'ideStats',
    'multiIDEUsersCount',
    'totalUniqueIDEUsers',
    'pluginVersionData',
  ],
  models: ['modelUsageData', 'modelBreakdownData'],
  cli: ['dailyCliSessionData', 'dailyCliTokenData', 'dailyCliAdoptionTrend'],
  ai: ['aiAdoptionPhaseData', 'usageDistributionData', 'dailyAiCreditsData'],
} as const satisfies {
  [Slice in keyof AggregatedMetrics]: readonly (keyof AggregatedMetrics[Slice])[];
};

export const AGGREGATED_METRICS_FIELD_KEYS = Object.values(
  AGGREGATED_METRICS_SLICE_KEYS
).flat();

export function makeAggregatedMetrics(
  overrides: AggregatedMetricsOverrides = {}
): AggregatedMetrics {
  const defaults = aggregateMetrics([]).aggregated;

  return {
    overview: { ...defaults.overview, ...overrides.overview },
    users: { ...defaults.users, ...overrides.users },
    adoption: { ...defaults.adoption, ...overrides.adoption },
    impact: { ...defaults.impact, ...overrides.impact },
    languages: { ...defaults.languages, ...overrides.languages },
    clients: { ...defaults.clients, ...overrides.clients },
    models: { ...defaults.models, ...overrides.models },
    cli: { ...defaults.cli, ...overrides.cli },
    ai: { ...defaults.ai, ...overrides.ai },
  };
}

export function makeUserSummary(overrides: Partial<UserSummary> = {}): UserSummary {
  return {
    user_login: 'octocat',
    user_id: 42,
    total_user_initiated_interactions: 0,
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
    clients_used: [],
    used_code_completion: false,
    used_agent: false,
    used_chat: false,
    used_cli: false,
    used_copilot_coding_agent: false,
    used_copilot_code_review_active: false,
    used_copilot_code_review_passive: false,
    ...overrides,
  };
}
