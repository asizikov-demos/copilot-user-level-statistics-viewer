import { aggregateMetrics } from '../../domain/metricsAggregator';
import type { AggregatedMetrics } from '../../types/aggregatedMetrics';
import type { UserSummary } from '../../types/metrics';

export function makeAggregatedMetrics(
  overrides: Partial<AggregatedMetrics> = {}
): AggregatedMetrics {
  return {
    ...aggregateMetrics([]).aggregated,
    ...overrides,
  };
}

export function makeUserSummary(overrides: Partial<UserSummary> = {}): UserSummary {
  return {
    user_login: 'octocat',
    user_id: 42,
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
    ...overrides,
  };
}
