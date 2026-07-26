import type { LanguagesMetricsSlice } from '../../types/aggregatedMetrics';
import type { CopilotMetrics } from '../../types/metrics';
import {
  accumulateLanguageFeatureImpact,
  accumulateDailyLanguage,
  computeDailyLanguageChartData,
  computeLanguageFeatureImpactData,
  createLanguageFeatureImpactAccumulator,
  type LanguageFeatureImpactAccumulator,
} from '../calculators/languageFeatureImpactCalculator';
import {
  accumulateLanguageStats,
  computeLanguageStats,
  createLanguageAccumulator,
  type LanguageAccumulator,
} from '../calculators/languageCalculator';
import {
  accumulateLanguageEngagement,
  type StatsAccumulator,
} from '../calculators/statsCalculator';

export interface LanguageAggregationAccumulator {
  language: LanguageAccumulator;
  featureImpact: LanguageFeatureImpactAccumulator;
}

export type LanguageAggregationResult = LanguagesMetricsSlice;

export function createLanguageAggregationAccumulator(): LanguageAggregationAccumulator {
  return {
    language: createLanguageAccumulator(),
    featureImpact: createLanguageFeatureImpactAccumulator(),
  };
}

export function accumulateLanguageAggregation(
  accumulator: LanguageAggregationAccumulator,
  statsAccumulator: StatsAccumulator,
  metric: CopilotMetrics
): void {
  for (const languageFeature of metric.totals_by_language_feature) {
    const engagements =
      languageFeature.code_generation_activity_count
      + languageFeature.code_acceptance_activity_count;
    accumulateLanguageEngagement(
      statsAccumulator,
      languageFeature.language,
      engagements
    );
    accumulateLanguageStats(
      accumulator.language,
      metric.user_id,
      languageFeature.language,
      languageFeature.code_generation_activity_count,
      languageFeature.code_acceptance_activity_count,
      languageFeature.loc_added_sum,
      languageFeature.loc_deleted_sum,
      languageFeature.loc_suggested_to_add_sum,
      languageFeature.loc_suggested_to_delete_sum
    );
    accumulateLanguageFeatureImpact(accumulator.featureImpact, languageFeature);
    accumulateDailyLanguage(
      accumulator.featureImpact,
      metric.day,
      languageFeature
    );
  }
}

export function finalizeLanguageAggregation(
  accumulator: LanguageAggregationAccumulator
): LanguageAggregationResult {
  return {
    languageStats: computeLanguageStats(accumulator.language),
    languageFeatureImpactData: computeLanguageFeatureImpactData(
      accumulator.featureImpact
    ),
    dailyLanguageGenerationsData: computeDailyLanguageChartData(
      accumulator.featureImpact,
      'generations'
    ),
    dailyLanguageLocData: computeDailyLanguageChartData(
      accumulator.featureImpact,
      'loc'
    ),
  };
}
