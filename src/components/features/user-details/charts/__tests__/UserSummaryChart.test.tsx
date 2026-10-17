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
};

describe('UserSummaryChart', () => {
  beforeEach(() => compositionChart.mockClear());

  it('draws a pie for each distribution with positive values', () => {
    const ideDistribution = [{ label: 'VS Code', value: 12, color: 'rgb(0, 0, 1)' }];
    const modelDistribution = [{ label: 'gpt-5', value: 7, color: 'rgb(0, 0, 2)' }];

    const markup = renderToStaticMarkup(
      <UserSummaryChart
        {...features}
        ideDistribution={ideDistribution}
        languageDistribution={[{ label: 'typescript', value: 0, color: 'rgb(0, 0, 3)' }]}
        modelDistribution={modelDistribution}
      />,
    );

    expect(markup).toContain('Chat');
    expect(markup).toContain('Client Interactions');
    expect(markup).toContain('Models (Interactions)');
    expect(markup).not.toContain('Languages (Generations)');
    expect(compositionChart.mock.calls.map(([props]) => props)).toEqual([
      {
        variant: 'pie',
        entries: ideDistribution,
        unit: 'interactions',
        label: 'Interactions by client',
        surface: 'muted',
      },
      {
        variant: 'pie',
        entries: modelDistribution,
        unit: 'interactions',
        label: 'Interactions by model',
        surface: 'muted',
      },
    ]);
  });

  it('omits every pie without distributions', () => {
    const markup = renderToStaticMarkup(<UserSummaryChart {...features} />);

    expect(markup).toContain('Features Used');
    expect(compositionChart).not.toHaveBeenCalled();
  });
});
