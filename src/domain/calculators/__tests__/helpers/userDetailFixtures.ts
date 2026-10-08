import type { CopilotMetrics } from '../../../../types/metrics';
import { makeMetric } from '../../../../__tests__/factories/metrics';
import {
  accumulateUserDetail,
  computeSingleUserDetailedMetrics,
  createUserDetailAccumulator,
  type UserDetailAccumulator,
} from '../../userDetailCalculator';
import type { UserDetailedMetrics } from '../../../../types/aggregatedMetrics';

type FeatureTotals = CopilotMetrics['totals_by_feature'][number];
type IdeTotals = CopilotMetrics['totals_by_ide'][number];
type LanguageFeatureTotals = CopilotMetrics['totals_by_language_feature'][number];
type ModelFeatureTotals = CopilotMetrics['totals_by_model_feature'][number];
type CliTotals = NonNullable<CopilotMetrics['totals_by_cli']>;

const zeroActivity = {
  code_generation_activity_count: 0,
  code_acceptance_activity_count: 0,
  loc_added_sum: 0,
  loc_deleted_sum: 0,
  loc_suggested_to_add_sum: 0,
  loc_suggested_to_delete_sum: 0,
};

export function featureTotals(feature: string, overrides: Partial<FeatureTotals> = {}): FeatureTotals {
  return { feature, user_initiated_interaction_count: 0, ...zeroActivity, ...overrides };
}

export function ideTotals(ide: string, overrides: Partial<IdeTotals> = {}): IdeTotals {
  return { ide, user_initiated_interaction_count: 0, ...zeroActivity, ...overrides };
}

export function languageFeatureTotals(
  language: string,
  feature: string,
  overrides: Partial<LanguageFeatureTotals> = {},
): LanguageFeatureTotals {
  return { language, feature, ...zeroActivity, ...overrides };
}

export function modelFeatureTotals(
  model: string,
  feature: string,
  overrides: Partial<ModelFeatureTotals> = {},
): ModelFeatureTotals {
  return { model, feature, user_initiated_interaction_count: 0, ...zeroActivity, ...overrides };
}

export function cliTotals(overrides: Partial<CliTotals> = {}): CliTotals {
  return {
    session_count: 1,
    request_count: 1,
    prompt_count: 1,
    token_usage: { output_tokens_sum: 0, prompt_tokens_sum: 0, avg_tokens_per_request: 0 },
    ...overrides,
  };
}

export function cliVersion(cli_version: string, sampled_at: string): CliTotals['last_known_cli_version'] {
  return { cli_version, sampled_at };
}

export function accumulateUserDays(metrics: Array<Partial<CopilotMetrics>>): UserDetailAccumulator {
  const accumulator = createUserDetailAccumulator();
  accumulator.reportStartDay = '2024-01-01';
  accumulator.reportEndDay = '2024-01-31';
  metrics.forEach(overrides => accumulateUserDetail(accumulator, makeMetric(overrides)));
  return accumulator;
}

export function userDetails(metrics: Array<Partial<CopilotMetrics>>, userId = 1): UserDetailedMetrics {
  const details = computeSingleUserDetailedMetrics(accumulateUserDays(metrics), userId);
  if (!details) throw new Error(`Expected details for user ${userId}`);
  return details;
}
