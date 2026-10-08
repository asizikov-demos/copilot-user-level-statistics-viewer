import { renderToStaticMarkup } from 'react-dom/server';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentActivity } from '../../../types/agentActivity';
import AgentActivityChart from '../AgentActivityChart';
import { agentCounts, makeAgentActivity } from './helpers/chartFixtures';

interface BarProps {
  data: ChartData<'bar'>;
  options: ChartOptions<'bar'>;
  'aria-label': string;
}

const { bar } = vi.hoisted(() => ({ bar: vi.fn<(props: BarProps) => void>() }));
vi.mock('react-chartjs-2', () => ({
  Bar: (props: BarProps) => {
    bar(props);
    return <div>Agent activity bars</div>;
  },
}));

const range = { reportStartDay: '2024-01-15', reportEndDay: '2024-01-17' };
const allSurfaces = makeAgentActivity([
  { date: '2024-01-15', cli: agentCounts(3, 7, 13), app: agentCounts(2, 5, 40), vscodeAgents: agentCounts(1, 4) },
  { date: '2024-01-17', cli: agentCounts(0), vscodeAgents: agentCounts(0) },
]);
const lastBar = () => bar.mock.lastCall![0];

describe('AgentActivityChart', () => {
  let renderer: ReactTestRenderer | undefined;

  afterEach(async () => {
    await act(async () => { renderer?.unmount(); });
    renderer = undefined;
    bar.mockClear();
  });

  async function renderChart(data: AgentActivity) {
    await act(async () => { renderer = create(<AgentActivityChart data={data} {...range} />); });
  }

  async function selectMeasure(value: 'sessions' | 'userInputs') {
    await act(async () => { renderer!.root.findByType('select').props.onChange({ target: { value } }); });
  }

  const heading = () => renderer!.root.findByType('h3').children.join('');

  it('defaults to the sessions view with every reported surface and a missing-data note', () => {
    const markup = renderToStaticMarkup(<AgentActivityChart data={allSurfaces} {...range} />);

    expect(markup).toContain('Daily agent sessions');
    expect(markup).toContain('Missing values are not zero');
    expect(markup).not.toContain('Total Requests');
    expect(lastBar()['aria-label']).toBe('Daily agent sessions: Copilot CLI, Copilot App, VS Code Agents.');
  });

  it('renders missing report days as gaps and reported zeros as zero', () => {
    renderToStaticMarkup(<AgentActivityChart data={allSurfaces} {...range} />);

    expect(lastBar().data.datasets.map(dataset => dataset.data)).toEqual([
      [3, null, 0],
      [2, null, null],
      [1, null, 0],
    ]);
  });

  it.each([
    ['cli', 'Copilot CLI'],
    ['app', 'Copilot App'],
    ['vscodeAgents', 'VS Code Agents'],
  ] as const)('shows only the reported surface: %s', (surface, label) => {
    renderToStaticMarkup(
      <AgentActivityChart data={makeAgentActivity([{ date: '2024-01-15', [surface]: agentCounts(0) }])} {...range} />,
    );

    expect(lastBar()['aria-label']).toBe(`Daily agent sessions: ${label}.`);
  });

  it('hides wholly unreported activity', () => {
    expect(renderToStaticMarkup(
      <AgentActivityChart data={makeAgentActivity([{ date: '2024-01-15' }])} {...range} />,
    )).toBe('');
    expect(bar).not.toHaveBeenCalled();
  });

  it('switches to prompts and messages with matching heading and series labels', async () => {
    await renderChart(allSurfaces);
    await selectMeasure('userInputs');

    expect(renderer!.root.findByType('select').props.value).toBe('userInputs');
    expect(heading()).toBe('Daily agent prompts & messages');
    expect(lastBar().data.datasets.map(dataset => dataset.label)).toEqual([
      'Copilot CLI prompts',
      'Copilot App prompts',
      'VS Code Agents user messages',
    ]);
  });

  it('restores the sessions view when switching back', async () => {
    await renderChart(allSurfaces);
    await selectMeasure('userInputs');
    await selectMeasure('sessions');

    expect(heading()).toBe('Daily agent sessions');
    expect(lastBar().data.datasets.map(dataset => dataset.label)).toEqual(['Copilot CLI', 'Copilot App', 'VS Code Agents']);
  });

  it('keeps the selector usable for message-only data without inventing sessions', async () => {
    await renderChart(makeAgentActivity([{ date: '2024-01-15', vscodeAgents: agentCounts(null, 0) }]));

    expect(bar).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer!.toJSON())).toContain('Session counts are not reported');

    await selectMeasure('userInputs');

    expect(lastBar()['aria-label']).toBe('Daily agent prompts & messages: VS Code Agents.');
  });

  it('uses surface-specific tooltip lines and only includes requests for CLI and App', () => {
    renderToStaticMarkup(<AgentActivityChart data={allSurfaces} {...range} />);
    const label = lastBar().options.plugins!.tooltip!.callbacks!.label!;
    const tooltip = {} as ThisParameterType<typeof label>;
    const item = (datasetIndex: number) => ({ datasetIndex, dataIndex: 0 }) as TooltipItem<'bar'>;

    expect([0, 1, 2].map(index => label.call(tooltip, item(index)))).toEqual([
      ['Copilot CLI', 'Sessions: 3', 'Prompts: 7', 'Requests: 13'],
      ['Copilot App', 'Sessions: 2', 'Prompts: 5', 'Requests: 40'],
      ['VS Code Agents', 'Sessions: 1', 'User messages: 4'],
    ]);
  });
});
