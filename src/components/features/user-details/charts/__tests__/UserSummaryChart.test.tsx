import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    expect(markup).toContain('Client Interactions');
    expect(markup).toContain('Models (Interactions)');
    expect(markup).toContain('Languages (Generations)');
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
    expect(markup).toContain('Client Interactions');
    expect(markup).toContain('Languages (Generations)');
    expect(markup).toContain('Models (Interactions)');
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
