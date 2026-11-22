// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import UserActivityByModelAndFeatureChart, { buildModelBarChartData } from '../UserActivityByModelAndFeatureChart';
import { getSequentialColor } from '../../../../charts/utils/chartColors';
import { formatShortDate } from '../../../../../utils/formatters';
import { getTotalUserInitiatedInteractionCount } from '../../../../../domain/assumedInteractions';
import type { UserDayData } from '../../../../../types/metrics';
import type { ClientTrafficMetrics } from '../../../../../types/clientTraffic';
import { computeUserModelActivity } from '../../../../../domain/calculators/userPresentationCalculator';
import { chooseOption, expectSelected } from '../../../../../__tests__/helpers/simpleSelect';

const captureOptions = vi.hoisted(() => vi.fn());
const captureData = vi.hoisted(() => vi.fn());
vi.mock('react-chartjs-2', () => ({
  Bar: ({ options, data }: { options: ChartOptions<'bar'>; data: ChartData<'bar'> }) => {
    captureOptions(options);
    captureData(data);
    return <div data-testid="model-bars" />;
  },
}));

afterEach(() => { cleanup(); captureOptions.mockClear(); captureData.mockClear(); });

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

function makeTraffic(): ClientTrafficMetrics {
  const counts = { requestCount: 3, promptTokens: 100, outputTokens: 20, avgTokensPerRequest: 40, activeUsers: 1 };
  const clients = ['vscode', 'copilot_cli'].map(client => ({
    ...counts, client, reportedSessionCount: 2,
    models: [
      { ...counts, model: 'gpt-4o', modelSelectionMode: 'user_selected' },
      { ...counts, model: 'gpt-4o', modelSelectionMode: 'auto' },
      { ...counts, model: 'unknown', modelSelectionMode: 'product_selected' },
    ],
  }));
  return {
    summary: { recordCount: 2, reportedRecords: 2, activeUsers: 1, clients },
    daily: [
      { day: '2024-01-15', recordCount: 1, reportedRecords: 1, activeUsers: 1, clients },
      { day: '2024-01-17', recordCount: 1, reportedRecords: 1, activeUsers: 0, clients: [] },
    ],
  };
}

describe('model activity sources', () => {
  const label = 'Model activity data source';
  function preparedChart(interactions = 0, traffic = makeTraffic(), userId = 1, hasTelemetry = true) {
    const entry = makeModelEntry('gpt-4o', interactions);
    return (
      <UserActivityByModelAndFeatureChart
        key={userId}
        modelFeatureAggregates={hasTelemetry ? [{ ...entry, assumed_user_initiated_interaction_count: 0 }] : []}
        days={hasTelemetry ? [makeUserDayData({ totals_by_model_feature: [entry] })] : []}
        modelActivity={computeUserModelActivity({
          clientTraffic: traffic, reportStartDay: '2024-01-15', reportEndDay: '2024-01-17',
        })}
        reportStartDay="2024-01-15" reportEndDay="2024-01-17"
      />
    );
  }

  it('sums requests across clients and modes, retains unknown models, and distinguishes gaps from reported zeros', () => {
    const activity = computeUserModelActivity({
      clientTraffic: makeTraffic(), reportStartDay: '2024-01-14', reportEndDay: '2024-01-18',
    });
    expect(activity.dates).toHaveLength(5);
    expect(activity.requests).toEqual([
      { model: 'gpt-4o', values: [null, 12, null, 0, null] },
      { model: 'unknown', values: [null, 6, null, 0, null] },
    ]);
    expect(activity.rows).toHaveLength(6);
    expect(activity.rows.every(row => row.promptTokens === 100 && row.outputTokens === 20)).toBe(true);
  });

  it.each([false, true])('defaults to requests with absent or zero-only telemetry: %s', zeroOnly => {
    render(preparedChart(0, makeTraffic(), 1, zeroOnly));
    expectSelected(label, 'Server-side model requests');
    expect(screen.getByText('Daily Model Requests')).toBeTruthy();
    expect(captureData.mock.lastCall![0].datasets.map((dataset: { data: unknown }) => dataset.data))
      .toEqual([[12, null, 0], [6, null, 0]]);
    expect(captureOptions.mock.lastCall![0].scales.y.title.text).toBe('Model requests');
  });

  it('prefers telemetry, switches units and breakdown, and preserves manual choices until changing users', async () => {
    const view = render(preparedChart(5));
    expectSelected(label, 'Client-side telemetry');
    expect(screen.getByText('Daily Model Interactions')).toBeTruthy();
    await chooseOption(label, 'Server-side model requests');
    fireEvent.click(screen.getByRole('button', { name: 'Detailed Model Request Breakdown' }));
    const tables = screen.getAllByRole('table');
    expect(within(tables[0]).getAllByRole('row')).toHaveLength(7);
    expect(within(tables[0]).getByRole('columnheader', { name: 'Prompt tokens' })).toBeTruthy();
    expect(within(tables[0]).queryByRole('columnheader', { name: 'Reported sessions' })).toBeNull();
    expect(tables).toHaveLength(1);
    expect(within(tables[0]).getByRole('columnheader', { name: 'Model' })).toBeTruthy();
    expect(within(tables[0]).getByRole('columnheader', { name: 'Client' })).toBeTruthy();
    expect(tables[0].querySelectorAll('tbody svg')).toHaveLength(12);
    expect(tables[0].parentElement?.classList.contains('overflow-x-auto')).toBe(true);
    view.rerender(preparedChart(6));
    expectSelected(label, 'Server-side model requests');
    await chooseOption(label, 'Client-side telemetry');
    expect(screen.getByRole('button', { name: 'Detailed Model and Feature Breakdown' })).toBeTruthy();
    await chooseOption(label, 'Server-side model requests');
    view.rerender(preparedChart(6, makeTraffic(), 2));
    expectSelected(label, 'Client-side telemetry');
  });

  it.each(['unknown', ''])('prefers positive client telemetry even when model %j is not charted', model => {
    const entry = makeModelEntry(model, 5);
    const chart = preparedChart();
    render(
      <UserActivityByModelAndFeatureChart
        {...chart.props}
        modelFeatureAggregates={[{ ...entry, assumed_user_initiated_interaction_count: 0 }]}
        days={[makeUserDayData({ totals_by_model_feature: [entry] })]}
      />,
    );
    expectSelected(label, 'Client-side telemetry');
    fireEvent.click(screen.getByRole('button', { name: 'Detailed Model and Feature Breakdown' }));
    expect(screen.getByText('5 total interactions')).toBeTruthy();
  });

  it('keeps the selector and shows an empty state for an explicitly selected empty source', async () => {
    render(preparedChart());
    await chooseOption(label, 'Client-side telemetry');
    expect(screen.getByText('No client-side model chart data available')).toBeTruthy();
    expectSelected(label, 'Client-side telemetry');
  });
});

describe('UserActivityByModelAndFeatureChart data construction', () => {
  it('excludes zero values from the tooltip while retaining nonzero values', () => {
    const entry = makeModelEntry('gpt-4o', 5);
    render(
      <UserActivityByModelAndFeatureChart
        modelFeatureAggregates={[]}
        days={[makeUserDayData({ totals_by_model_feature: [entry] })]}
        reportStartDay="2024-01-15"
        reportEndDay="2024-01-15"
      />,
    );

    const options: ChartOptions<'bar'> = captureOptions.mock.lastCall![0];
    const filter = options.plugins?.tooltip?.filter;
    expect(filter).toBeDefined();
    const item = (value: number) => ({ parsed: { x: 0, y: value } }) as TooltipItem<'bar'>;
    const data = { labels: [], datasets: [] };
    expect(filter!(item(0), 0, [], data)).toBe(false);
    expect(filter!(item(5), 0, [], data)).toBe(true);
    expect(filter!(item(-1), 0, [], data)).toBe(true);
  });

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
