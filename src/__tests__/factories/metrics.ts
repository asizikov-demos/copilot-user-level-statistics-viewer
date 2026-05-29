import type { CopilotMetrics } from '../../types/metrics';

/**
 * Creates a valid {@link CopilotMetrics} record with sensible zero/false defaults.
 * Pass overrides to customise only the fields relevant to your test.
 *
 * Defaults:
 * - All numeric counters: 0
 * - All LOC fields (new schema): 0
 * - All nested arrays: []
 * - All feature-flag booleans: false
 * - Day: '2024-01-15' within report range '2024-01-01'–'2024-01-31'
 */
export function makeMetric(overrides: Partial<CopilotMetrics> = {}): CopilotMetrics {
  return {
    report_start_day: '2024-01-01',
    report_end_day: '2024-01-31',
    day: '2024-01-15',
    enterprise_id: 'test-enterprise',
    user_id: 1,
    user_login: 'testuser',
    user_initiated_interaction_count: 0,
    code_generation_activity_count: 0,
    code_acceptance_activity_count: 0,
    loc_added_sum: 0,
    loc_deleted_sum: 0,
    loc_suggested_to_add_sum: 0,
    loc_suggested_to_delete_sum: 0,
    totals_by_ide: [],
    totals_by_feature: [],
    totals_by_language_feature: [],
    totals_by_language_model: [],
    totals_by_model_feature: [],
    used_agent: false,
    used_chat: false,
    used_cli: false,
    used_copilot_coding_agent: false,
    ...overrides,
  };
}
