import { describe, it, expect } from 'vitest';
import { padDailyReportRangeData } from '../../../../charts/utils/dailyBarChart';
import { createBarDataset } from '../../../../charts/utils/chartStyles';
import { getSequentialColor } from '../../../../charts/utils/chartColors';
import { formatShortDate } from '../../../../../utils/formatters';
import type { UserDayData } from '../../../../../types/metrics';

type PaddedLanguageDay = {
  day: string;
  totals_by_language_feature: UserDayData['totals_by_language_feature'];
};

function buildLanguageBarChartData(
  days: UserDayData[],
  reportStartDay: string,
  reportEndDay: string,
) {
  const allLanguages = Array.from(
    new Set(days.flatMap(day => day.totals_by_language_feature.map(item => item.language)))
  ).filter(lang => lang && lang !== '' && lang !== 'unknown').sort();

  const paddedDays = padDailyReportRangeData<PaddedLanguageDay>(
    days.map(d => ({ day: d.day, totals_by_language_feature: d.totals_by_language_feature })),
    reportStartDay,
    reportEndDay,
    d => d.day,
    date => ({ day: date, totals_by_language_feature: [] }),
  );

  const datasets = allLanguages.map((language, index) => {
    const data = paddedDays.map(dayData =>
      dayData.totals_by_language_feature
        .filter(item => item.language === language)
        .reduce((sum, item) => sum + item.code_generation_activity_count, 0)
    );
    return createBarDataset(getSequentialColor(index), language, data);
  }).filter(dataset => dataset.data.some(value => value > 0));

  return {
    labels: paddedDays.map(d => formatShortDate(d.day)),
    datasets,
  };
}

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

  it('uses shared sequential colors from chartColors', () => {
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
    expect(result.datasets[0].backgroundColor).toBe(getSequentialColor(0));
    expect(result.datasets[1].backgroundColor).toBe(getSequentialColor(1));
  });

  it('covers the full report range with correct label count even when no days are provided', () => {
    const result = buildLanguageBarChartData([], '2024-01-01', '2024-01-03');

    expect(result.labels).toHaveLength(3);
    expect(result.datasets).toHaveLength(0);
  });
});
