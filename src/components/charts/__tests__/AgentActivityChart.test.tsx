import { renderToStaticMarkup } from 'react-dom/server';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeAgentActivity } from '../../../domain/calculators/agentActivityCalculator';
import AgentActivityChart from '../AgentActivityChart';

interface BarProps {
  data: ChartData<'bar'>;
  options: ChartOptions<'bar'>;
}

const { bar } = vi.hoisted(() => ({ bar: vi.fn<(props: BarProps) => void>() }));
vi.mock('react-chartjs-2', () => ({
  Bar: (props: BarProps) => {
    bar(props);
    return <div>Agent activity bars</div>;
  },
}));

const totals = (sessions: number, prompts = 0, requests = 0) => ({
  session_count: sessions, prompt_count: prompts, request_count: requests,
  token_usage: { prompt_tokens_sum: 0, output_tokens_sum: 0, avg_tokens_per_request: 0 },
});
const range = { reportStartDay: '2024-01-15', reportEndDay: '2024-01-17' };

describe('AgentActivityChart', () => {
  beforeEach(() => bar.mockClear());

  it('defaults to grouped sessions for three surfaces with full-range gaps and explicit zeros', () => {
    const data = computeAgentActivity([
      { day: '2024-01-15', totals_by_cli: totals(3, 7, 13), totals_by_copilot_app: totals(2, 5, 40), totals_by_vscode_agent: { session_count: 1, total_user_messages: 4 } },
      { day: '2024-01-17', totals_by_cli: totals(0), totals_by_vscode_agent: { session_count: 0 } },
    ]);
    const markup = renderToStaticMarkup(<AgentActivityChart data={data} {...range} />);
    expect(bar).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        labels: expect.arrayContaining([expect.any(String)]),
        datasets: [
          expect.objectContaining({ label: 'Copilot CLI', data: [3, null, 0] }),
          expect.objectContaining({ label: 'Copilot App', data: [2, null, null] }),
          expect.objectContaining({ label: 'VS Code Agents', data: [1, null, 0] }),
        ],
      }),
      options: expect.objectContaining({
        scales: expect.objectContaining({
          x: expect.objectContaining({ stacked: false }),
          y: expect.objectContaining({ stacked: false }),
        }),
      }),
    }));
    expect(markup).toContain('Daily agent sessions');
    expect(markup).toContain('Missing values are not zero');
    expect(markup).not.toContain('Total Requests');
    expect(markup).not.toContain('Unique sessions');
  });

  it.each(['cli', 'app', 'vscodeAgents'] as const)('shows only the reported surface: %s', surface => {
    const data = computeAgentActivity([{
      day: '2024-01-15',
      ...(surface === 'cli' ? { totals_by_cli: totals(0) } : {}),
      ...(surface === 'app' ? { totals_by_copilot_app: totals(0) } : {}),
      ...(surface === 'vscodeAgents' ? { totals_by_vscode_agent: { session_count: 0 } } : {}),
    }]);
    renderToStaticMarkup(<AgentActivityChart data={data} {...range} />);
    expect(bar.mock.lastCall![0].data.datasets).toHaveLength(1);
    expect(bar.mock.lastCall![0].data.datasets[0].data).toEqual([0, null, null]);
  });

  it('hides wholly unreported activity', () => {
    const data = computeAgentActivity([{ day: '2024-01-15', totals_by_vscode_agent: null }]);
    expect(renderToStaticMarkup(<AgentActivityChart data={data} {...range} />)).toBe('');
    expect(bar).not.toHaveBeenCalled();
  });

  it('switches to prompts/messages without mixing requests or losing surface colors', async () => {
    const data = computeAgentActivity([{
      day: '2024-01-15', totals_by_cli: totals(3, 7, 100),
      totals_by_copilot_app: totals(2, 0, 500),
      totals_by_vscode_agent: { session_count: 1, total_user_messages: 4 },
    }]);
    let renderer: ReactTestRenderer | undefined;
    try {
      await act(async () => { renderer = create(<AgentActivityChart data={data} {...range} />); });
      const colors = bar.mock.lastCall![0].data.datasets.map(dataset => dataset.backgroundColor);
      await act(async () => { renderer!.root.findByType('select').props.onChange({ target: { value: 'userInputs' } }); });
      const datasets = bar.mock.lastCall![0].data.datasets;
      expect(datasets.map(dataset => dataset.label)).toEqual(['Copilot CLI prompts', 'Copilot App prompts', 'VS Code Agents user messages']);
      expect(datasets.map(dataset => dataset.data)).toEqual([[7, null, null], [0, null, null], [4, null, null]]);
      expect(datasets.map(dataset => dataset.backgroundColor)).toEqual(colors);
      expect(renderer!.root.findByType('h3').children.join('')).toBe('Daily agent prompts & messages');
      await act(async () => { renderer!.root.findByType('select').props.onChange({ target: { value: 'sessions' } }); });
      expect(bar.mock.lastCall![0].data.datasets.map(dataset => dataset.data[0])).toEqual([3, 2, 1]);
    } finally {
      await act(async () => { renderer?.unmount(); });
    }
  });

  it('keeps the selector usable for message-only data without inventing sessions', async () => {
    const data = computeAgentActivity([{ day: '2024-01-15', totals_by_vscode_agent: { total_user_messages: 0 } }]);
    let renderer: ReactTestRenderer | undefined;
    try {
      await act(async () => { renderer = create(<AgentActivityChart data={data} {...range} />); });
      expect(bar).not.toHaveBeenCalled();
      expect(JSON.stringify(renderer!.toJSON())).toContain('Session counts are not reported');
      await act(async () => { renderer!.root.findByType('select').props.onChange({ target: { value: 'userInputs' } }); });
      expect(bar.mock.lastCall![0].data.datasets[0].data).toEqual([0, null, null]);
    } finally {
      await act(async () => { renderer?.unmount(); });
    }
  });

  it('uses surface-specific tooltip labels and only includes requests for CLI/App', () => {
    const data = computeAgentActivity([{
      day: '2024-01-15', totals_by_cli: totals(3, 7, 13),
      totals_by_copilot_app: totals(2, 5, 40),
      totals_by_vscode_agent: { session_count: 1 },
    }]);
    renderToStaticMarkup(<AgentActivityChart data={data} {...range} />);
    const label = bar.mock.lastCall![0].options.plugins!.tooltip!.callbacks!.label!;
    const tooltip = {} as ThisParameterType<typeof label>;
    const item = (datasetIndex: number) => ({ datasetIndex, dataIndex: 0 }) as TooltipItem<'bar'>;
    expect(label.call(tooltip, item(0))).toEqual(['Copilot CLI', 'Sessions: 3', 'Prompts: 7', 'Requests: 13']);
    expect(label.call(tooltip, item(1))).toEqual(['Copilot App', 'Sessions: 2', 'Prompts: 5', 'Requests: 40']);
    expect(label.call(tooltip, item(2))).toEqual(['VS Code Agents', 'Sessions: 1', 'User messages: Not reported']);
  });
});
