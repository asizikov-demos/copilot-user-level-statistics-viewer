import { describe, it, expect } from 'vitest';
import { buildLanguageBarChartData } from '../UserActivityByLanguageAndFeatureChart';
import { getLanguageColor } from '../../../../charts/utils/chartColors';
import { formatShortDate } from '../../../../../utils/formatters';
import type { UserDayData } from '../../../../../types/metrics';

function makeUserDayData(overrides: Partial<UserDayData> = {}): UserDayData {
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

function makeLanguageEntry(
  language: string,
  code_generation_activity_count: number,
): UserDayData['totals_by_language_feature'][number] {
  return {
    language,
    feature: 'code_completion',
    code_generation_activity_count,
    code_acceptance_activity_count: 0,
    loc_added_sum: 0,
    loc_deleted_sum: 0,
    loc_suggested_to_add_sum: 0,
    loc_suggested_to_delete_sum: 0,
  };
}

describe('UserActivityByLanguageAndFeatureChart data construction', () => {
  it('pads the full report range with zero-generation days for missing dates', () => {
    const days = [
      makeUserDayData({ day: '2024-01-01', totals_by_language_feature: [makeLanguageEntry('typescript', 5)] }),
      makeUserDayData({ day: '2024-01-03', totals_by_language_feature: [makeLanguageEntry('typescript', 3)] }),
    ];

    const result = buildLanguageBarChartData(days, '2024-01-01', '2024-01-03');

    expect(result.labels).toHaveLength(3);
    expect(result.labels[1]).toBe(formatShortDate('2024-01-02'));
    expect(result.datasets).toHaveLength(1);
    expect(result.datasets[0].label).toBe('typescript');
    expect(result.datasets[0].data).toEqual([5, 0, 3]);
  });

  it('excludes "unknown" and empty-string languages', () => {
    const days = [
      makeUserDayData({
        day: '2024-01-01',
        totals_by_language_feature: [
          makeLanguageEntry('typescript', 5),
          makeLanguageEntry('unknown', 10),
          makeLanguageEntry('', 2),
        ],
      }),
    ];

    const result = buildLanguageBarChartData(days, '2024-01-01', '2024-01-01');

    expect(result.datasets.map(d => d.label)).toEqual(['typescript']);
  });

  it('filters out datasets where every day has zero generations', () => {
    const days = [
      makeUserDayData({ day: '2024-01-01', totals_by_language_feature: [makeLanguageEntry('typescript', 5)] }),
    ];

    const result = buildLanguageBarChartData(days, '2024-01-01', '2024-01-02');

    expect(result.datasets).toHaveLength(1);
    expect(result.datasets[0].label).toBe('typescript');
  });

  it('uses shared language colors from chartColors', () => {
    const days = [
      makeUserDayData({
        day: '2024-01-01',
        totals_by_language_feature: [
          makeLanguageEntry('go', 1),
          makeLanguageEntry('rust', 2),
        ],
      }),
    ];

    const result = buildLanguageBarChartData(days, '2024-01-01', '2024-01-01');

    // Languages are sorted alphabetically: go (index 0), rust (index 1)
    expect(result.datasets[0].backgroundColor).toBe(getLanguageColor('go', 0));
    expect(result.datasets[1].backgroundColor).toBe(getLanguageColor('rust', 1));
  });

  it('keeps more than eight active language series distinguishable', () => {
    const languages = [
      'assembly',
      'bash',
      'c',
      'cpp',
      'csharp',
      'go',
      'java',
      'javascript',
      'python',
      'typescript',
    ];
    const days = [
      makeUserDayData({
        day: '2024-01-01',
        totals_by_language_feature: languages.map((language, index) =>
          makeLanguageEntry(language, index + 1)
        ),
      }),
    ];

    const result = buildLanguageBarChartData(days, '2024-01-01', '2024-01-01');
    const colors = result.datasets.map(dataset => dataset.backgroundColor);

    expect(result.datasets).toHaveLength(languages.length);
    expect(new Set(colors).size).toBe(languages.length);
  });

  it('covers the full report range with correct label count even when no days are provided', () => {
    const result = buildLanguageBarChartData([], '2024-01-01', '2024-01-03');

    expect(result.labels).toHaveLength(3);
    expect(result.datasets).toHaveLength(0);
  });
});
