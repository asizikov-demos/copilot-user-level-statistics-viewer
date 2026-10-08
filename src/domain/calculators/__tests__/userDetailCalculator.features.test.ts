import { describe, it, expect } from 'vitest';
import {
  featureTotals,
  languageFeatureTotals,
  modelFeatureTotals,
  userDetails,
} from './helpers/userDetailFixtures';

describe('userDetailCalculator feature aggregates', () => {
  it('exposes code completion generations as assumed user interactions', () => {
    const details = userDetails([{
      totals_by_feature: [
        featureTotals('code_completion', { code_generation_activity_count: 44 }),
        featureTotals('chat_panel_agent_mode', { user_initiated_interaction_count: 3, code_generation_activity_count: 11 }),
      ],
    }]);
    const aggregate = (feature: string) => details.featureAggregates.find(f => f.feature === feature)!;

    expect(aggregate('code_completion')).toMatchObject({
      user_initiated_interaction_count: 0,
      assumed_user_initiated_interaction_count: 44,
    });
    expect(aggregate('chat_panel_agent_mode').assumed_user_initiated_interaction_count).toBe(0);
    expect(details.days[0].totals_by_feature.find(f => f.feature === 'code_completion')!.assumed_user_initiated_interaction_count).toBe(44);
  });

  it('sums every metric field for the same feature across days', () => {
    const details = userDetails([
      {
        day: '2024-01-10',
        totals_by_feature: [featureTotals('code_completion', {
          user_initiated_interaction_count: 10, code_generation_activity_count: 8, code_acceptance_activity_count: 6,
          loc_added_sum: 100, loc_deleted_sum: 20, loc_suggested_to_add_sum: 120, loc_suggested_to_delete_sum: 25,
        })],
      },
      {
        day: '2024-01-20',
        totals_by_feature: [featureTotals('code_completion', {
          user_initiated_interaction_count: 5, code_generation_activity_count: 4, code_acceptance_activity_count: 3,
          loc_added_sum: 50, loc_deleted_sum: 10, loc_suggested_to_add_sum: 60, loc_suggested_to_delete_sum: 15,
        })],
      },
    ]);
    expect(details.featureAggregates).toEqual([expect.objectContaining({
      feature: 'code_completion',
      user_initiated_interaction_count: 15, code_generation_activity_count: 12, code_acceptance_activity_count: 9,
      loc_added_sum: 150, loc_deleted_sum: 30, loc_suggested_to_add_sum: 180, loc_suggested_to_delete_sum: 40,
    })]);
  });

  it('keeps separate entries for different features', () => {
    const details = userDetails([{
      totals_by_feature: [
        featureTotals('code_completion', { user_initiated_interaction_count: 10 }),
        featureTotals('copilot_chat', { user_initiated_interaction_count: 5 }),
      ],
    }]);
    expect(details.featureAggregates.map(f => [f.feature, f.user_initiated_interaction_count])).toEqual([
      ['code_completion', 10],
      ['copilot_chat', 5],
    ]);
  });
});

describe('userDetailCalculator language-feature aggregates', () => {
  it('sums every metric field for the same language-feature key across days', () => {
    const details = userDetails([
      {
        day: '2024-01-10',
        totals_by_language_feature: [languageFeatureTotals('typescript', 'code_completion', {
          code_generation_activity_count: 20, code_acceptance_activity_count: 15,
          loc_added_sum: 200, loc_deleted_sum: 40, loc_suggested_to_add_sum: 250, loc_suggested_to_delete_sum: 50,
        })],
      },
      {
        day: '2024-01-20',
        totals_by_language_feature: [languageFeatureTotals('typescript', 'code_completion', {
          code_generation_activity_count: 10, code_acceptance_activity_count: 8,
          loc_added_sum: 100, loc_deleted_sum: 20, loc_suggested_to_add_sum: 120, loc_suggested_to_delete_sum: 25,
        })],
      },
    ]);
    expect(details.languageFeatureAggregates).toEqual([expect.objectContaining({
      language: 'typescript', feature: 'code_completion',
      code_generation_activity_count: 30, code_acceptance_activity_count: 23,
      loc_added_sum: 300, loc_deleted_sum: 60, loc_suggested_to_add_sum: 370, loc_suggested_to_delete_sum: 75,
    })]);
  });

  it('keeps separate entries for different language-feature combinations', () => {
    const details = userDetails([{
      totals_by_language_feature: [
        languageFeatureTotals('typescript', 'code_completion', { code_generation_activity_count: 10 }),
        languageFeatureTotals('python', 'code_completion', { code_generation_activity_count: 5 }),
      ],
    }]);
    expect(details.languageFeatureAggregates.map(lf => [lf.language, lf.code_generation_activity_count])).toEqual([
      ['typescript', 10],
      ['python', 5],
    ]);
  });
});

describe('userDetailCalculator model-feature aggregates', () => {
  it('includes assumed code completion interactions in model request totals and daily model usage', () => {
    const details = userDetails([{
      totals_by_model_feature: [modelFeatureTotals('gpt-4o', 'code_completion', { code_generation_activity_count: 44 })],
    }]);
    expect(details.totalModelRequests).toBe(44);
    expect(details.modelFeatureAggregates[0].assumed_user_initiated_interaction_count).toBe(44);
    expect(details.dailyModelUsage[0].modelInteractions).toBe(44);
  });

  it('sums every metric field for the same model-feature key across days', () => {
    const details = userDetails([
      {
        day: '2024-01-10',
        totals_by_model_feature: [modelFeatureTotals('gpt-4o', 'code_completion', {
          user_initiated_interaction_count: 12, code_generation_activity_count: 10, code_acceptance_activity_count: 8,
          loc_added_sum: 150, loc_deleted_sum: 30, loc_suggested_to_add_sum: 180, loc_suggested_to_delete_sum: 35,
        })],
      },
      {
        day: '2024-01-20',
        totals_by_model_feature: [modelFeatureTotals('gpt-4o', 'code_completion', {
          user_initiated_interaction_count: 8, code_generation_activity_count: 6, code_acceptance_activity_count: 5,
          loc_added_sum: 80, loc_deleted_sum: 15, loc_suggested_to_add_sum: 90, loc_suggested_to_delete_sum: 18,
        })],
      },
    ]);
    expect(details.modelFeatureAggregates).toEqual([expect.objectContaining({
      model: 'gpt-4o', feature: 'code_completion',
      user_initiated_interaction_count: 20, code_generation_activity_count: 16, code_acceptance_activity_count: 13,
      loc_added_sum: 230, loc_deleted_sum: 45, loc_suggested_to_add_sum: 270, loc_suggested_to_delete_sum: 53,
    })]);
  });

  it('keeps separate entries for different model-feature combinations', () => {
    const details = userDetails([{
      totals_by_model_feature: [
        modelFeatureTotals('gpt-4o', 'code_completion', { user_initiated_interaction_count: 10 }),
        modelFeatureTotals('gpt-4o', 'copilot_chat', { user_initiated_interaction_count: 5 }),
      ],
    }]);
    expect(details.modelFeatureAggregates.map(mf => [mf.feature, mf.user_initiated_interaction_count])).toEqual([
      ['code_completion', 10],
      ['copilot_chat', 5],
    ]);
  });
});
