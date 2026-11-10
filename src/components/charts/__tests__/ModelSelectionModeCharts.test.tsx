import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChartData } from 'chart.js';
import { makeAggregatedMetrics } from '../../../__tests__/factories/aggregatedMetrics';
import ModelSelectionModeCharts from '../ModelSelectionModeCharts';

const { doughnut } = vi.hoisted(() => ({
  doughnut: vi.fn<(props: { data: ChartData<'doughnut'> }) => void>(),
}));
vi.mock('react-chartjs-2', () => ({
  Doughnut: (props: { data: ChartData<'doughnut'> }) => {
    doughnut(props);
    return <div />;
  },
}));

describe('ModelSelectionModeCharts', () => {
  beforeEach(() => doughnut.mockClear());

  it('renders three request breakdowns with category values, shares, and coverage', () => {
    const data = makeAggregatedMetrics().models.selectionModeRequests;
    data.recordCount = 10;
    data.reportedRecords = 8;
    data.excludedRequestCount = 7;
    data.modes.forEach(mode => {
      mode.categories[0].requestCount = 2;
      mode.categories[2].requestCount = 6;
    });

    const markup = renderToStaticMarkup(<ModelSelectionModeCharts data={data} />);

    expect(doughnut).toHaveBeenCalledTimes(3);
    expect(doughnut.mock.calls.map(([{ data }]) => ({
      labels: data.labels, values: data.datasets[0].data,
    }))).toEqual(Array.from({ length: 3 }, () => ({
      labels: ['Powerful', 'Lightweight'], values: [6, 2],
    })));
    for (const label of ['User selected model types', 'Auto model types', 'Product selected model types']) {
      expect(markup).toContain(`aria-label="${label}"`);
    }
    expect(markup).toContain('75.0%');
    expect(markup).toContain('25.0%');
    expect(markup).toContain('8 of 10 uploaded user-day records');
    expect(markup).toContain('7 requests with other, unknown, or unrecognized selection modes are excluded');
    expect(markup).toContain('requests');
  });

  it('distinguishes unavailable traffic from reported modes without requests', () => {
    const data = makeAggregatedMetrics().models.selectionModeRequests;
    const unavailable = renderToStaticMarkup(<ModelSelectionModeCharts data={data} />);
    expect(unavailable).toContain('Client model traffic not reported');

    data.reportedRecords = 1;
    data.recordCount = 1;
    const empty = renderToStaticMarkup(<ModelSelectionModeCharts data={data} />);
    expect(empty).toContain('No user selected model requests reported');
    expect(empty).toContain('No auto model requests reported');
    expect(empty).toContain('No product selected model requests reported');
    expect(empty).not.toContain('Client model traffic not reported');
    expect(doughnut).not.toHaveBeenCalled();
  });

  it('shows Code Review Model separately from remaining uncategorized requests', () => {
    const data = makeAggregatedMetrics().models.selectionModeRequests;
    data.recordCount = 1;
    data.reportedRecords = 1;
    const product = data.modes.find(entry => entry.mode === 'product_selected')!;
    product.categories = [
      { category: 'Code Review Model', requestCount: 10 },
      { category: 'Uncategorized', requestCount: 2 },
    ];

    const markup = renderToStaticMarkup(<ModelSelectionModeCharts data={data} />);

    expect(doughnut).toHaveBeenCalledTimes(1);
    expect(doughnut.mock.lastCall![0].data.labels).toEqual(['Code Review Model', 'Uncategorized']);
    expect(doughnut.mock.lastCall![0].data.datasets[0].data).toEqual([10, 2]);
    expect(markup).toContain('Code Review Model');
    expect(markup).toContain('Uncategorized');
  });

  it('renders image generation requests with a category color and their own share', () => {
    const data = makeAggregatedMetrics().models.selectionModeRequests;
    data.recordCount = 1;
    data.reportedRecords = 1;
    data.modes[0].categories = [
      { category: 'Image Generation', requestCount: 6 },
      { category: 'Powerful', requestCount: 2 },
    ];

    const markup = renderToStaticMarkup(<ModelSelectionModeCharts data={data} />);

    expect(doughnut).toHaveBeenCalledTimes(1);
    const chart = doughnut.mock.lastCall![0].data;
    expect(chart.labels).toEqual(['Image Generation', 'Powerful']);
    expect(chart.datasets[0].data).toEqual([6, 2]);
    expect(chart.datasets[0].backgroundColor).toEqual([expect.any(String), expect.any(String)]);
    expect(markup).toContain('75.0%');
  });
});
