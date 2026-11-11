// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompositionChartProps } from '../../../../charts/CompositionChart';
import UserSummaryChart from '../UserSummaryChart';
import { chooseOption, expectSelected } from '../../../../../__tests__/helpers/simpleSelect';

const CLIENT = 'Client summary measure';
const MODEL = 'Model summary measure';
const measureLabels = { interactions: 'Interactions', requests: 'Model requests' } as const;
const pick = (name: string, measure: keyof typeof measureLabels) => chooseOption(name, measureLabels[measure]);
const expectMeasure = (name: string, measure: keyof typeof measureLabels) => expectSelected(name, measureLabels[measure]);

const { compositionChart } = vi.hoisted(() => ({ compositionChart: vi.fn<(props: CompositionChartProps) => void>() }));
vi.mock('../../../../charts/CompositionChart', () => ({
  default: (props: CompositionChartProps) => {
    compositionChart(props);
    return <div>{props.label}</div>;
  },
}));

const features = {
  usedChat: true,
  usedAgent: false,
  usedCli: false,
  usedCopilotApp: false,
  usedCodingAgent: false,
  usedCodeReview: false,
  usedAutoMode: false,
  usedLocalByok: false,
};

describe('UserSummaryChart', () => {
  beforeEach(() => compositionChart.mockClear());
  afterEach(cleanup);

  it.each([
    ['missing', undefined],
    ['zero-only', [{ label: 'typescript', value: 0, color: 'rgb(0, 0, 3)' }]],
  ])('keeps populated doughnuts alongside a %s language distribution', (_name, languageDistribution) => {
    const ideDistribution = [{ label: 'VS Code', value: 12, color: 'rgb(0, 0, 1)' }];
    const modelDistribution = [{ label: 'gpt-5', value: 7, color: 'rgb(0, 0, 2)' }];

    const markup = renderToStaticMarkup(
      <UserSummaryChart
        {...features}
        ideDistribution={ideDistribution}
        languageDistribution={languageDistribution}
        modelDistribution={modelDistribution}
      />,
    );

    expect(markup).toContain('Chat');
    expect(markup).toContain('Clients');
    expect(markup).toContain('Models');
    expect(markup).toContain('Languages');
    expect(markup.match(/No data available/g)).toHaveLength(1);
    expect(compositionChart.mock.calls.map(([props]) => props)).toEqual([
      {
        variant: 'doughnut',
        entries: ideDistribution,
        unit: 'interactions',
        label: 'Interactions by client',
        surface: 'default',
      },
      {
        variant: 'doughnut',
        entries: modelDistribution,
        unit: 'interactions',
        label: 'Interactions by model',
        surface: 'default',
      },
    ]);
  });

  it('draws all three doughnuts without empty states when distributions have data', () => {
    const entries = [{ label: 'Reported', value: 1, color: 'rgb(0, 0, 1)' }];
    const markup = renderToStaticMarkup(
      <UserSummaryChart
        {...features}
        ideDistribution={entries}
        languageDistribution={entries}
        modelDistribution={entries}
      />,
    );

    expect(compositionChart).toHaveBeenCalledTimes(3);
    expect(markup).not.toContain('No data available');
  });

  it('keeps the summary unboxed and gives each doughnut its own white card', () => {
    const entries = [{ label: 'Reported', value: 1, color: 'rgb(0, 0, 1)' }];
    const { container } = render(
      <UserSummaryChart
        {...features}
        ideDistribution={entries}
        languageDistribution={entries}
        modelDistribution={entries}
      />,
    );
    const summary = container.querySelector('[aria-label="User usage summary"]');

    expect(summary).toBeTruthy();
    expect(summary?.className).not.toContain('bg-default');
    expect(summary?.querySelectorAll('[data-component="ChartContainer"]')).toHaveLength(3);
    expect(screen.queryByRole('heading', { name: 'Summary' })).toBeNull();
  });

  it('labels the fallback model composition as requests', () => {
    const entries = [{ label: 'GPT-4o', value: 176, color: 'rgb(0, 0, 1)' }];
    const markup = renderToStaticMarkup(
      <UserSummaryChart {...features} modelRequestDistribution={entries} />,
    );
    expect(markup).toContain('Models');
    expect(markup).toContain('Requests by model');
    expect(compositionChart.mock.lastCall?.[0]).toMatchObject({
      entries, unit: 'requests', label: 'Requests by model',
    });

  });

  it('labels the fallback client composition as requests without changing the model measure', () => {
    const entries = [{ label: 'OpenCode', value: 176, color: 'rgb(0, 0, 1)' }];
    const markup = renderToStaticMarkup(
      <UserSummaryChart {...features} clientRequestDistribution={entries} />,
    );
    expect(markup).toContain('Clients');
    expect(markup).toContain('Requests by client');
    expect(markup).toContain('Models');
    expect(compositionChart.mock.lastCall?.[0]).toMatchObject({
      entries, unit: 'requests', label: 'Requests by client',
    });
  });

  it('switches client and model measures independently without mixing their entries', () => {
    const interactions = [{ label: 'Legacy', value: 7, color: 'rgb(0, 0, 1)' }];
    const requests = [{ label: 'Traffic', value: 176, color: 'rgb(0, 0, 2)' }];
    render(
      <UserSummaryChart {...features}
        ideDistribution={interactions} modelDistribution={interactions}
        clientRequestDistribution={requests} modelRequestDistribution={requests}
      />,
    );
    expectMeasure(CLIENT, 'interactions');
    expectMeasure(MODEL, 'interactions');
    pick(CLIENT, 'requests');
    expect(screen.getByText('Clients')).toBeTruthy();
    expectMeasure(MODEL, 'interactions');
    expect(compositionChart.mock.lastCall?.[0]).toMatchObject({
      label: 'Requests by client', entries: requests, unit: 'requests',
    });
    pick(MODEL, 'requests');
    expect(screen.getByText('Models')).toBeTruthy();
    expect(compositionChart.mock.lastCall?.[0]).toMatchObject({
      label: 'Requests by model', entries: requests, unit: 'requests',
    });
    pick(CLIENT, 'interactions');
    expect(screen.getByText('Clients')).toBeTruthy();
    expectMeasure(MODEL, 'requests');
    expect(compositionChart.mock.lastCall?.[0]).toMatchObject({
      label: 'Interactions by client', entries: interactions, unit: 'interactions',
    });
  });

  it('defaults each tile independently and allows switching to an unavailable measure', () => {
    const entries = [{ label: 'Reported', value: 12, color: 'rgb(0, 0, 1)' }];
    render(
      <UserSummaryChart {...features} clientRequestDistribution={entries} modelDistribution={entries} />,
    );
    expectMeasure(CLIENT, 'requests');
    expectMeasure(MODEL, 'interactions');
    pick(CLIENT, 'interactions');
    pick(MODEL, 'requests');
    expect(screen.getAllByText('No data available')).toHaveLength(3);
    pick(CLIENT, 'requests');
    pick(MODEL, 'interactions');
    expect(screen.getAllByText('No data available')).toHaveLength(1);
  });

  it('updates automatic defaults as data arrives but preserves manual choices', () => {
    const entries = [{ label: 'Reported', value: 12, color: 'rgb(0, 0, 1)' }];
    const { rerender } = render(<UserSummaryChart {...features} />);
    expectMeasure(CLIENT, 'interactions');
    rerender(<UserSummaryChart {...features} clientRequestDistribution={entries} />);
    expectMeasure(CLIENT, 'requests');
    rerender(<UserSummaryChart {...features} clientRequestDistribution={entries} ideDistribution={entries} />);
    expectMeasure(CLIENT, 'interactions');
    pick(CLIENT, 'requests');
    rerender(<UserSummaryChart {...features} ideDistribution={entries} />);
    expectMeasure(CLIENT, 'requests');
    expect(screen.getAllByText('No data available')).toHaveLength(3);
  });

  it.each([
    ['missing', undefined],
    ['empty', []],
    ['zero-only', [{ label: 'Unknown', value: 0, color: 'rgb(0, 0, 1)' }]],
    ['negative-only', [{ label: 'Unknown', value: -1, color: 'rgb(0, 0, 1)' }]],
    ['non-finite', [
      { label: 'Unknown', value: NaN, color: 'rgb(0, 0, 1)' },
      { label: 'Other', value: Infinity, color: 'rgb(0, 0, 2)' },
    ]],
  ])('shows all tile titles and empty states for %s distributions', (_name, entries) => {
    const markup = renderToStaticMarkup(
      <UserSummaryChart
        {...features}
        ideDistribution={entries}
        languageDistribution={entries}
        modelDistribution={entries}
      />,
    );

    expect(markup).toContain('Features used:');
    expect(markup).toContain('Clients');
    expect(markup).toContain('Languages');
    expect(markup).toContain('Models');
    expect(markup.match(/No data available/g)).toHaveLength(3);
    expect(compositionChart).not.toHaveBeenCalled();
  });

  it('shows Local BYOK without mislabeling the user as completion-only', () => {
    const markup = renderToStaticMarkup(
      <UserSummaryChart {...features} usedLocalByok />
    );

    expect(markup).toContain('Local BYOK');
    expect(markup).not.toContain('Completion Only');
  });

  it('uses the modal feature row while preserving summary labels and the completion-only fallback', () => {
    const { rerender } = render(
      <UserSummaryChart
        usedChat usedAgent usedCli usedCopilotApp usedCodingAgent usedCodeReview usedAutoMode usedLocalByok
      />,
    );
    const featureRow = screen.getByText('Features used:').parentElement!;
    expect(Array.from(featureRow.children).slice(1).map(label => label.textContent)).toEqual([
      'Chat', 'IDE Agent Mode', 'CLI', 'Copilot App', 'Cloud Agent', 'Code Review', 'Auto Mode', 'Local BYOK',
    ]);
    expect(screen.queryByRole('heading', { name: /features used/i })).toBeNull();
    expect(screen.queryByText('Completion Only')).toBeNull();

    rerender(<UserSummaryChart {...features} usedChat={false} />);
    expect(screen.getByText('Completion Only').parentElement).toBe(featureRow);
    expect(screen.queryByText('Chat')).toBeNull();
  });
});
