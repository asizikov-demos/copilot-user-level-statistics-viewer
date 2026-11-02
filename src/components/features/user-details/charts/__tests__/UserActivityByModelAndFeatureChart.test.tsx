// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import UserActivityByModelAndFeatureChart, { buildModelBarChartData } from '../UserActivityByModelAndFeatureChart';
import { getSequentialColor } from '../../../../charts/utils/chartColors';
import { formatShortDate } from '../../../../../utils/formatters';
import { getTotalUserInitiatedInteractionCount } from '../../../../../domain/assumedInteractions';
import type { UserDayData } from '../../../../../types/metrics';

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="model-bars" />,
}));

afterEach(cleanup);

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
    expect(result.datasets[0].label).toBe('GPT-4o');
    expect(result.datasets[0].data).toEqual([7, 0, 4]);
  });

  describe('UserActivityByModelAndFeatureChart detail table', () => {
    it.each([
      ['gpt-4o', 'GPT-4o'],
      ['claude-3.7-sonnet', 'Claude 3.7 Sonnet'],
      ['some-new-model', 'Some new model'],
      ['unknown', 'Unknown Model'],
      ['', 'Unknown Model'],
    ])('displays %j as %s without CSS capitalization', (model, displayName) => {
      const entry = makeModelEntry(model, 5);
      const days = [makeUserDayData({ totals_by_model_feature: [entry] })];
      render(
        <UserActivityByModelAndFeatureChart
          modelFeatureAggregates={[{ ...entry, assumed_user_initiated_interaction_count: 0 }]}
          days={days}
          reportStartDay="2024-01-15"
          reportEndDay="2024-01-15"
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Detailed Model and Feature Breakdown' }));

      const table = screen.getByRole('table');
      const label = within(table).getByText(displayName);
      expect(label.closest('td')?.classList.contains('capitalize')).toBe(false);
      expect(within(table).getByText('5 total interactions')).toBeTruthy();
      expect(within(table).getAllByRole('row')).toHaveLength(2);
      if (model && model !== 'unknown') {
        expect(buildModelBarChartData(days, '2024-01-15', '2024-01-15').datasets[0].label)
          .toBe(displayName);
        expect(within(table).queryByText(model, { exact: true })).toBeNull();
      }
    });
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

    expect(result.datasets.map(d => d.label)).toEqual(['GPT-4o']);
  });

  it('filters out datasets where every day has zero interactions', () => {
    const days = [
      makeUserDayData({ day: '2024-01-01', totals_by_model_feature: [makeModelEntry('gpt-4o', 5)] }),
    ];

    const result = buildModelBarChartData(days, '2024-01-01', '2024-01-02');

    expect(result.datasets).toHaveLength(1);
    expect(result.datasets[0].label).toBe('GPT-4o');
  });

  it('formats model labels for display', () => {
    const days = [
      makeUserDayData({
        day: '2024-01-01',
        totals_by_model_feature: [makeModelEntry('claude-3.7-sonnet', 5)],
      }),
    ];

    const result = buildModelBarChartData(days, '2024-01-01', '2024-01-01');

    expect(result.datasets[0].label).toBe('Claude 3.7 Sonnet');
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
