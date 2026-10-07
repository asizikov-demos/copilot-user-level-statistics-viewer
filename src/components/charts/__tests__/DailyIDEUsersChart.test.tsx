import {
  act,
  create,
  type ReactTestRenderer,
} from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DailyIDEUsersChart from '../DailyIDEUsersChart';
import type { DailyIdeUsersData } from '../../../domain/calculators/dailyIdeUsersCalculator';
import type { ClientTelemetryWarning } from '../../../domain/calculators/clientTelemetryCalculator';
import ClientTelemetryNotice from '../../ClientTelemetryNotice';

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

  async function renderChart(
    chartData: DailyIdeUsersData = data,
    telemetryWarnings: ClientTelemetryWarning[] = [],
  ) {
    await act(async () => {
      renderer = create(
        <DailyIDEUsersChart
          data={chartData}
          reportStartDay="2024-01-15"
          reportEndDay="2024-01-17"
          telemetryWarnings={telemetryWarnings}
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
      role: 'img',
      'aria-label': 'Daily IDE Users for VS Code: Jan 15, 2 users; Jan 16, 0 users; Jan 17, 3 users.',
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
      role: 'img',
      'aria-label': 'Daily IDE Users for Copilot CLI: Jan 15, 0 users; Jan 16, 2 users; Jan 17, 0 users.',
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

  it('filters telemetry warnings to the active client and hides them for unaffected clients', async () => {
    const warnings: ClientTelemetryWarning[] = [
      {
        ide: 'vscode',
        version: '1.138.0',
        versionKind: 'ide',
        userCount: 3,
        action: 'upgrade',
        recommendation: 'Update VS Code to 1.139.0 or later.',
      },
      {
        ide: 'visualstudio',
        version: '18.11.0',
        versionKind: 'ide',
        userCount: 1,
        action: 'upgrade',
        recommendation: 'Update Visual Studio to 18.12 or later when available.',
      },
      {
        ide: 'jetbrains',
        version: '1.5.0',
        versionKind: 'plugin',
        userCount: 1,
        action: 'verify',
        recommendation: 'Check for the fixed JetBrains Copilot plugin release.',
      },
    ];
    const chartData = [
      ...data,
      { ...data[0], ide: 'visual_studio' },
      { ...data[0], ide: 'intellij' },
    ];
    await renderChart(chartData, warnings);

    const notice = () => renderer!.root.findByType(ClientTelemetryNotice);
    expect(notice().props.warnings).toEqual([warnings[0]]);
    expect(renderer!.root.findAllByType('li')).toHaveLength(1);
    await act(async () => {
      renderer!.root.findByType('select').props.onChange({ target: { value: 'visual_studio' } });
    });
    expect(notice().props.warnings).toEqual([warnings[1]]);
    await act(async () => {
      renderer!.root.findByType('select').props.onChange({ target: { value: 'intellij' } });
    });
    expect(notice().props.warnings).toEqual([warnings[2]]);
    await act(async () => {
      renderer!.root.findByType('select').props.onChange({ target: { value: 'copilot_cli' } });
    });
    expect(notice().props.warnings).toEqual([]);
    expect(renderer!.root.findAllByType('aside')).toHaveLength(0);

    await act(async () => {
      renderer!.root.findByType('select').props.onChange({ target: { value: 'vscode' } });
    });
    expect(notice().props.warnings).toEqual([warnings[0]]);

    await act(async () => {
      renderer!.update(
        <DailyIDEUsersChart
          data={[chartData[2]]}
          reportStartDay="2024-01-15"
          reportEndDay="2024-01-17"
          telemetryWarnings={warnings}
        />,
      );
    });
    expect(renderer!.root.findByType('select').props.value).toBe('visual_studio');
    expect(notice().props.warnings).toEqual([warnings[1]]);
  });

  it('omits telemetry warnings when no client is selected in an empty chart', async () => {
    await renderChart([], [{
      ide: 'vscode',
      version: '1.138.0',
      versionKind: 'ide',
      userCount: 1,
      action: 'upgrade',
      recommendation: 'Update VS Code.',
    }]);
    expect(renderer!.root.findAllByType('aside')).toHaveLength(0);
  });
});
