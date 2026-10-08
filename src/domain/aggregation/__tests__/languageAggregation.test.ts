import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { makeLanguageFeatureTotal } from '../../../__tests__/factories/metricTotals';
import {
  computeStats,
  createStatsAccumulator,
} from '../../calculators/statsCalculator';
import {
  accumulateLanguageAggregation,
  createLanguageAggregationAccumulator,
  finalizeLanguageAggregation,
} from '../languageAggregation';

describe('language aggregation', () => {
  it('coordinates stats, language totals, impact filtering, ordering, and daily padding', () => {
    const statsAccumulator = createStatsAccumulator();
    const accumulator = createLanguageAggregationAccumulator();
    const laterMetric = makeMetric({
      user_id: 1,
      day: '2024-01-16',
      totals_by_language_feature: [
        makeLanguageFeatureTotal('typescript', 'code_completion', {
          code_generation_activity_count: 2,
          code_acceptance_activity_count: 1,
          loc_added_sum: 10,
          loc_deleted_sum: 2,
          loc_suggested_to_add_sum: 20,
          loc_suggested_to_delete_sum: 4,
        }),
        makeLanguageFeatureTotal('unknown', 'chat_panel_ask_mode', {
          code_generation_activity_count: 9,
          loc_added_sum: 100,
          loc_deleted_sum: 25,
        }),
      ],
    });
    const earlierMetric = makeMetric({
      user_id: 2,
      day: '2024-01-15',
      totals_by_language_feature: [
        makeLanguageFeatureTotal('python', 'chat_panel_ask_mode', {
          code_generation_activity_count: 5,
          code_acceptance_activity_count: 2,
          loc_added_sum: 8,
          loc_deleted_sum: 3,
        }),
        makeLanguageFeatureTotal('typescript', 'chat_panel_ask_mode', {
          code_generation_activity_count: 1,
          code_acceptance_activity_count: 4,
          loc_added_sum: 1,
          loc_deleted_sum: 1,
          loc_suggested_to_add_sum: 2,
          loc_suggested_to_delete_sum: 1,
        }),
      ],
    });

    accumulateLanguageAggregation(accumulator, statsAccumulator, laterMetric);
    accumulateLanguageAggregation(accumulator, statsAccumulator, earlierMetric);

    const result = finalizeLanguageAggregation(accumulator);
    expect(computeStats(statsAccumulator, 2).topLanguage).toEqual({
      name: 'unknown',
      engagements: 9,
    });
    expect(result.languageStats.map(language => language.language)).toEqual([
      'unknown',
      'typescript',
      'python',
    ]);
    expect(result.languageStats.find(language => language.language === 'typescript')).toEqual({
      language: 'typescript',
      totalGenerations: 3,
      totalAcceptances: 5,
      totalEngagements: 8,
      uniqueUsers: 2,
      generationsPerUser: 1.5,
      generationShare: 3 / 17,
      locAdded: 11,
      locDeleted: 3,
      locSuggestedToAdd: 22,
      locSuggestedToDelete: 5,
    });
    expect(result.languageFeatureImpactData).toEqual({
      rows: [
        {
          language: 'typescript',
          total: 14,
          features: {
            chat_panel_ask_mode: 2,
            code_completion: 12,
          },
        },
        {
          language: 'python',
          total: 11,
          features: {
            chat_panel_ask_mode: 11,
            code_completion: 0,
          },
        },
      ],
      features: ['chat_panel_ask_mode', 'code_completion'],
    });
    expect(result.dailyLanguageGenerationsData).toEqual({
      dates: ['2024-01-15', '2024-01-16'],
      languages: ['unknown', 'python', 'typescript'],
      data: {
        '2024-01-15': { unknown: 0, python: 5, typescript: 1 },
        '2024-01-16': { unknown: 9, python: 0, typescript: 2 },
      },
      totals: { unknown: 9, python: 5, typescript: 3 },
    });
  });
});
