// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompositionChartProps } from '../../../../charts/CompositionChart';
import UserSummaryChart from '../UserSummaryChart';

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
        surface: 'muted',
      },
      {
        variant: 'doughnut',
        entries: modelDistribution,
        unit: 'interactions',
        label: 'Interactions by model',
        surface: 'muted',
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
    const clientSelect = screen.getByRole('combobox', { name: 'Client summary measure' });
    const modelSelect = screen.getByRole('combobox', { name: 'Model summary measure' });
    expect(clientSelect).toHaveProperty('value', 'interactions');
    expect(modelSelect).toHaveProperty('value', 'interactions');
    fireEvent.change(clientSelect, { target: { value: 'requests' } });
    expect(screen.getByText('Clients')).toBeTruthy();
    expect(modelSelect).toHaveProperty('value', 'interactions');
    expect(compositionChart.mock.lastCall?.[0]).toMatchObject({
      label: 'Requests by client', entries: requests, unit: 'requests',
    });
    fireEvent.change(modelSelect, { target: { value: 'requests' } });
    expect(screen.getByText('Models')).toBeTruthy();
    expect(compositionChart.mock.lastCall?.[0]).toMatchObject({
      label: 'Requests by model', entries: requests, unit: 'requests',
    });
    fireEvent.change(clientSelect, { target: { value: 'interactions' } });
    expect(screen.getByText('Clients')).toBeTruthy();
    expect(modelSelect).toHaveProperty('value', 'requests');
    expect(compositionChart.mock.lastCall?.[0]).toMatchObject({
      label: 'Interactions by client', entries: interactions, unit: 'interactions',
    });
  });

  it('defaults each tile independently and allows switching to an unavailable measure', () => {
    const entries = [{ label: 'Reported', value: 12, color: 'rgb(0, 0, 1)' }];
    render(
      <UserSummaryChart {...features} clientRequestDistribution={entries} modelDistribution={entries} />,
    );
    const clientSelect = screen.getByRole('combobox', { name: 'Client summary measure' });
    const modelSelect = screen.getByRole('combobox', { name: 'Model summary measure' });
    expect(clientSelect).toHaveProperty('value', 'requests');
    expect(modelSelect).toHaveProperty('value', 'interactions');
    fireEvent.change(clientSelect, { target: { value: 'interactions' } });
    fireEvent.change(modelSelect, { target: { value: 'requests' } });
    expect(screen.getAllByText('No data available')).toHaveLength(3);
    fireEvent.change(clientSelect, { target: { value: 'requests' } });
    fireEvent.change(modelSelect, { target: { value: 'interactions' } });
    expect(screen.getAllByText('No data available')).toHaveLength(1);
  });

  it('updates automatic defaults as data arrives but preserves manual choices', () => {
    const entries = [{ label: 'Reported', value: 12, color: 'rgb(0, 0, 1)' }];
    const { rerender } = render(<UserSummaryChart {...features} />);
    const clientSelect = screen.getByRole('combobox', { name: 'Client summary measure' });
    expect(clientSelect).toHaveProperty('value', 'interactions');
    rerender(<UserSummaryChart {...features} clientRequestDistribution={entries} />);
    expect(clientSelect).toHaveProperty('value', 'requests');
    rerender(<UserSummaryChart {...features} clientRequestDistribution={entries} ideDistribution={entries} />);
    expect(clientSelect).toHaveProperty('value', 'interactions');
    fireEvent.change(clientSelect, { target: { value: 'requests' } });
    rerender(<UserSummaryChart {...features} ideDistribution={entries} />);
    expect(clientSelect).toHaveProperty('value', 'requests');
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

    expect(markup).toContain('Features Used');
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
});
