import {
  act,
  create,
  type ReactTestRenderer,
} from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DailyIDEUsersChart from '../DailyIDEUsersChart';
import type { DailyIdeUsersData } from '../../../domain/calculators/dailyIdeUsersCalculator';

const { bar } = vi.hoisted(() => ({ bar: vi.fn() }));
vi.mock('react-chartjs-2', () => ({
  Bar: (props: Record<string, unknown>) => {
    bar(props);
    return <div>Daily IDE users chart</div>;
  },
}));

const data: DailyIdeUsersData = [
  {
    ide: 'vscode',
    totalUniqueUsers: 3,
    daily: [
      { date: '2024-01-15', uniqueUsers: 2 },
      { date: '2024-01-17', uniqueUsers: 3 },
    ],
  },
  {
    ide: 'copilot_cli',
    totalUniqueUsers: 2,
    daily: [{ date: '2024-01-16', uniqueUsers: 2 }],
  },
];

describe('DailyIDEUsersChart', () => {
  let renderer: ReactTestRenderer | undefined;

  afterEach(async () => {
    await act(async () => { renderer?.unmount(); });
    renderer = undefined;
    bar.mockClear();
  });

  async function renderChart(chartData: DailyIdeUsersData = data) {
    await act(async () => {
      renderer = create(
        <DailyIDEUsersChart
          data={chartData}
          reportStartDay="2024-01-15"
          reportEndDay="2024-01-17"
        />
      );
    });
  }

  it('lists clients from most to least popular and selects the most popular by default', async () => {
    await renderChart();

    const select = renderer!.root.findByType('select');
    expect(select.findAllByType('option').map(option => option.children.join(''))).toEqual([
      'VS Code',
      'Copilot CLI',
    ]);
    expect(select.props.value).toBe('vscode');
    expect(bar).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        datasets: [expect.objectContaining({ label: 'VS Code Users', data: [2, 0, 3] })],
      }),
    }));
  });

  it('updates the chart and the legend when another client is selected', async () => {
    await renderChart();

    await act(async () => {
      renderer!.root.findByType('select').props.onChange({ target: { value: 'copilot_cli' } });
    });

    expect(renderer!.root.findByType('select').props.value).toBe('copilot_cli');
    expect(bar).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        datasets: [expect.objectContaining({ label: 'Copilot CLI Users', data: [0, 2, 0] })],
      }),
    }));
    expect(
      renderer!.root.findAll(node => node.type === 'span' && node.children[0] === 'Copilot CLI')
    ).toHaveLength(1);
  });

  it('falls back to the most popular client when the selection disappears', async () => {
    await renderChart();

    await act(async () => {
      renderer!.root.findByType('select').props.onChange({ target: { value: 'copilot_cli' } });
    });
    await act(async () => {
      renderer!.update(
        <DailyIDEUsersChart
          data={[data[0]]}
          reportStartDay="2024-01-15"
          reportEndDay="2024-01-17"
        />
      );
    });

    expect(renderer!.root.findByType('select').props.value).toBe('vscode');
  });

  it('renders the empty state without any client data', async () => {
    await renderChart([]);

    expect(renderer!.root.findAllByType('select')).toHaveLength(0);
    expect(
      renderer!.root.findAll(
        node => node.type === 'div' && node.children[0] === 'No client usage data available'
      )
    ).toHaveLength(1);
  });
});
