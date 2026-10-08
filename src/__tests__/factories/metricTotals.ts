import type { CopilotMetrics } from '../../types/metrics';

export type IdeTotal = CopilotMetrics['totals_by_ide'][number];
export type FeatureTotal = CopilotMetrics['totals_by_feature'][number];
export type LanguageFeatureTotal = CopilotMetrics['totals_by_language_feature'][number];
export type LanguageModelTotal = CopilotMetrics['totals_by_language_model'][number];
export type ModelFeatureTotal = CopilotMetrics['totals_by_model_feature'][number];
export type CliTotals = NonNullable<CopilotMetrics['totals_by_cli']>;

const zeroActivity = {
  code_generation_activity_count: 0,
  code_acceptance_activity_count: 0,
  loc_added_sum: 0,
  loc_deleted_sum: 0,
  loc_suggested_to_add_sum: 0,
  loc_suggested_to_delete_sum: 0,
};

/** IDE row with zeroed counters; `interactions` sets user_initiated_interaction_count. */
export function makeIdeTotal(
  ide: string,
  interactions = 0,
  overrides: Partial<IdeTotal> = {}
): IdeTotal {
  return {
    ide,
    user_initiated_interaction_count: interactions,
    ...zeroActivity,
    ...overrides,
  };
}

/** Feature row with zeroed counters; `interactions` sets user_initiated_interaction_count. */
export function makeFeatureTotal(
  feature: string,
  interactions = 0,
  overrides: Partial<FeatureTotal> = {}
): FeatureTotal {
  return {
    feature,
    user_initiated_interaction_count: interactions,
    ...zeroActivity,
    ...overrides,
  };
}

export function makeLanguageFeatureTotal(
  language: string,
  feature: string,
  overrides: Partial<LanguageFeatureTotal> = {}
): LanguageFeatureTotal {
  return { language, feature, ...zeroActivity, ...overrides };
}

export function makeLanguageModelTotal(
  language: string,
  model: string,
  overrides: Partial<LanguageModelTotal> = {}
): LanguageModelTotal {
  return { language, model, ...zeroActivity, ...overrides };
}

/** Model/feature row with zeroed counters; `interactions` sets user_initiated_interaction_count. */
export function makeModelFeatureTotal(
  model: string,
  feature: string,
  interactions = 0,
  overrides: Partial<ModelFeatureTotal> = {}
): ModelFeatureTotal {
  return {
    model,
    feature,
    user_initiated_interaction_count: interactions,
    ...zeroActivity,
    ...overrides,
  };
}

export function makeCliTotals(
  overrides: Partial<Omit<CliTotals, 'token_usage'>> & {
    token_usage?: Partial<CliTotals['token_usage']>;
  } = {}
): CliTotals {
  const { token_usage: tokenUsage, ...rest } = overrides;
  return {
    session_count: 0,
    request_count: 0,
    prompt_count: 0,
    ...rest,
    token_usage: {
      output_tokens_sum: 0,
      prompt_tokens_sum: 0,
      avg_tokens_per_request: 0,
      ...tokenUsage,
    },
  };
}
