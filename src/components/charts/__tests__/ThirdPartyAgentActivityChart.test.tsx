import { renderToStaticMarkup } from 'react-dom/server';
import type { ChartData, ChartOptions } from 'chart.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ThirdPartyAgentActivityChart from '../ThirdPartyAgentActivityChart';

interface BarProps {
  data: ChartData<'bar'>;
  options: ChartOptions<'bar'>;
  'aria-label': string;
}

const { bar } = vi.hoisted(() => ({ bar: vi.fn<(props: BarProps) => void>() }));
vi.mock('react-chartjs-2', () => ({
  Bar: (props: BarProps) => {
    bar(props);
    return <div>Third-party activity bars</div>;
  },
}));

const range = { reportStartDay: '2024-01-15', reportEndDay: '2024-01-17' };

describe('ThirdPartyAgentActivityChart', () => {
  beforeEach(() => bar.mockClear());

  it('hides absent and empty activity', () => {
    expect(renderToStaticMarkup(<ThirdPartyAgentActivityChart {...range} />)).toBe('');
    expect(renderToStaticMarkup(
      <ThirdPartyAgentActivityChart {...range} data={{ agents: [], daily: [] }} />,
    )).toBe('');
    expect(bar).not.toHaveBeenCalled();
  });

  it('shows one series per agent across the full range with zero-filled inactive days', () => {
    const markup = renderToStaticMarkup(<ThirdPartyAgentActivityChart {...range} data={{
      agents: [
        { id: '1', name: 'Claude', interactions: 3 },
        { id: '2', name: 'Codex', interactions: 1 },
      ],
      daily: [
        { date: '2024-01-15', interactions: { '1': 3 } },
        { date: '2024-01-17', interactions: { '2': 1 } },
      ],
    }} />);
    expect(markup).toContain('Daily third-party agent activity');
    const props = bar.mock.lastCall![0];
    expect(props.data.labels).toHaveLength(3);
    expect(props.data.datasets.map(dataset => [dataset.label, dataset.data])).toEqual([
      ['Claude', [3, 0, 0]],
      ['Codex', [0, 0, 1]],
    ]);
    expect(props['aria-label']).toBe('Daily third-party agent activity: Claude, Codex.');
  });

  it('disambiguates duplicate names consistently without changing unique names', () => {
    const markup = renderToStaticMarkup(<ThirdPartyAgentActivityChart {...range} data={{
      agents: [
        { id: '1', name: 'Agent', interactions: 3 },
        { id: '2', name: 'Agent', interactions: 1 },
        { id: '3', name: 'Codex', interactions: 1 },
      ],
      daily: [{ date: '2024-01-15', interactions: { '1': 3, '2': 1, '3': 1 } }],
    }} />);
    const props = bar.mock.lastCall![0];
    expect(props.data.datasets.map(dataset => dataset.label))
      .toEqual(['Agent (1)', 'Agent (2)', 'Codex']);
    expect(props['aria-label']).toBe('Daily third-party agent activity: Agent (1), Agent (2), Codex.');
    expect(markup).toContain('Agent (1)');
    expect(markup).toContain('Agent (2)');
  });

  it('zero-fills prototype-named IDs while preserving their own reported counts', () => {
    renderToStaticMarkup(<ThirdPartyAgentActivityChart {...range} data={{
      agents: [
        { id: 'constructor', name: 'Agent A', interactions: 3 },
        { id: 'toString', name: 'Agent B', interactions: 1 },
      ],
      daily: [
        { date: '2024-01-15', interactions: Object.fromEntries([['constructor', 3]]) },
        { date: '2024-01-17', interactions: Object.fromEntries([['toString', 1]]) },
      ],
    }} />);
    expect(bar.mock.lastCall![0].data.datasets.map(dataset => dataset.data))
      .toEqual([[3, 0, 0], [0, 0, 1]]);
  });
});
