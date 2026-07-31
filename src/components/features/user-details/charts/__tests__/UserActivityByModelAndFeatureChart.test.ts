import { describe, it, expect } from 'vitest';
import { padDailyReportRangeData } from '../../../../charts/utils/dailyBarChart';
import { createBarDataset } from '../../../../charts/utils/chartStyles';
import { getSequentialColor } from '../../../../charts/utils/chartColors';
import { formatShortDate, formatModelDisplayName } from '../../../../../utils/formatters';
import { getTotalUserInitiatedInteractionCount } from '../../../../../domain/assumedInteractions';
import type { UserDayData } from '../../../../../types/metrics';

type PaddedModelDay = {
  day: string;
  totals_by_model_feature: UserDayData['totals_by_model_feature'];
};

function buildModelBarChartData(
  days: UserDayData[],
  reportStartDay: string,
  reportEndDay: string,
) {
  const allModels = Array.from(
    new Set(days.flatMap(day => day.totals_by_model_feature.map(item => item.model)))
  ).filter(model => model && model !== '' && model !== 'unknown').sort();

  const paddedDays = padDailyReportRangeData<PaddedModelDay>(
    days.map(d => ({ day: d.day, totals_by_model_feature: d.totals_by_model_feature })),
    reportStartDay,
    reportEndDay,
    d => d.day,
    date => ({ day: date, totals_by_model_feature: [] }),
  );

  const datasets = allModels.map((model, index) => {
    const data = paddedDays.map(dayData =>
      dayData.totals_by_model_feature
        .filter(item => item.model === model)
        .reduce((sum, item) => sum + getTotalUserInitiatedInteractionCount(item), 0)
    );
    return createBarDataset(getSequentialColor(index), formatModelDisplayName(model), data);
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

function makeModelEntry(
  model: string,
  user_initiated_interaction_count: number,
): UserDayData['totals_by_model_feature'][number] {
  return {
    model,
    feature: 'code_completion',
    user_initiated_interaction_count,
    code_generation_activity_count: 0,
    code_acceptance_activity_count: 0,
    loc_added_sum: 0,
    loc_deleted_sum: 0,
    loc_suggested_to_add_sum: 0,
    loc_suggested_to_delete_sum: 0,
  };
}

describe('UserActivityByModelAndFeatureChart data construction', () => {
  it('pads the full report range with zero-interaction days for missing dates', () => {
    const days = [
      makeUserDayData({ day: '2024-01-01', totals_by_model_feature: [makeModelEntry('gpt-4o', 7)] }),
      makeUserDayData({ day: '2024-01-03', totals_by_model_feature: [makeModelEntry('gpt-4o', 4)] }),
    ];

    const result = buildModelBarChartData(days, '2024-01-01', '2024-01-03');

    expect(result.labels).toHaveLength(3);
    expect(result.labels[1]).toBe(formatShortDate('2024-01-02'));
    expect(result.datasets).toHaveLength(1);
    expect(result.datasets[0].label).toBe(formatModelDisplayName('gpt-4o'));
    expect(result.datasets[0].data).toEqual([7, 0, 4]);
  });

  it('excludes "unknown" and empty-string model names', () => {
    const days = [
      makeUserDayData({
        day: '2024-01-01',
        totals_by_model_feature: [
          makeModelEntry('gpt-4o', 5),
          makeModelEntry('unknown', 3),
          makeModelEntry('', 1),
        ],
      }),
    ];

    const result = buildModelBarChartData(days, '2024-01-01', '2024-01-01');

    expect(result.datasets.map(d => d.label)).toEqual([formatModelDisplayName('gpt-4o')]);
  });

  it('filters out datasets where every day has zero interactions', () => {
    const days = [
      makeUserDayData({ day: '2024-01-01', totals_by_model_feature: [makeModelEntry('gpt-4o', 5)] }),
    ];

    const result = buildModelBarChartData(days, '2024-01-01', '2024-01-02');

    expect(result.datasets).toHaveLength(1);
    expect(result.datasets[0].label).toBe(formatModelDisplayName('gpt-4o'));
  });

  it('uses getTotalUserInitiatedInteractionCount for interaction totals', () => {
    const days = [
      makeUserDayData({
        day: '2024-01-01',
        totals_by_model_feature: [{
          model: 'gpt-4o',
          feature: 'code_completion',
          user_initiated_interaction_count: 3,
          assumed_user_initiated_interaction_count: 2,
          code_generation_activity_count: 5,
          code_acceptance_activity_count: 0,
          loc_added_sum: 0,
          loc_deleted_sum: 0,
          loc_suggested_to_add_sum: 0,
          loc_suggested_to_delete_sum: 0,
        }],
      }),
    ];

    const result = buildModelBarChartData(days, '2024-01-01', '2024-01-01');

    // getTotalUserInitiatedInteractionCount returns user_initiated + assumed for code_completion
    const expected = getTotalUserInitiatedInteractionCount(days[0].totals_by_model_feature[0]);
    expect(result.datasets[0].data[0]).toBe(expected);
  });

  it('uses shared sequential colors from chartColors', () => {
    const days = [
      makeUserDayData({
        day: '2024-01-01',
        totals_by_model_feature: [
          makeModelEntry('claude-3', 2),
          makeModelEntry('gpt-4o', 1),
        ],
      }),
    ];

    const result = buildModelBarChartData(days, '2024-01-01', '2024-01-01');

    // Models are sorted alphabetically: claude-3 (index 0), gpt-4o (index 1)
    expect(result.datasets[0].backgroundColor).toBe(getSequentialColor(0));
    expect(result.datasets[1].backgroundColor).toBe(getSequentialColor(1));
  });

  it('covers the full report range with correct label count even when no days are provided', () => {
    const result = buildModelBarChartData([], '2024-01-01', '2024-01-03');

    expect(result.labels).toHaveLength(3);
    expect(result.datasets).toHaveLength(0);
  });
});
