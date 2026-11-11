// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DailyIDEUsersChart from '../DailyIDEUsersChart';
import type { DailyIdeUsersData } from '../../../domain/calculators/dailyIdeUsersCalculator';
import type { ClientTelemetryWarning } from '../../../domain/calculators/clientTelemetryCalculator';
import { chooseOption, expectSelected, listOptions, querySelect } from '../../../__tests__/helpers/simpleSelect';

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
  const chartProps = {
    reportStartDay: '2024-01-15',
    reportEndDay: '2024-01-17',
  };
  let view: ReturnType<typeof render> | undefined;

  afterEach(() => {
    cleanup();
    view = undefined;
    bar.mockClear();
  });

  function renderChart(
    chartData: DailyIdeUsersData = data,
    telemetryWarnings: ClientTelemetryWarning[] = [],
  ) {
    view = render(<DailyIDEUsersChart data={chartData} {...chartProps} telemetryWarnings={telemetryWarnings} />);
  }

  it('lists clients from most to least popular and selects the most popular by default', () => {
    renderChart();

    expect(listOptions('Client')).toEqual(['VS Code', 'Copilot CLI']);
    expectSelected('Client', 'VS Code');
    expect(bar).toHaveBeenLastCalledWith(expect.objectContaining({
      role: 'img',
      'aria-label': 'Daily IDE Users for VS Code: Jan 15, 2 users; Jan 16, 0 users; Jan 17, 3 users.',
    }));
  });

  it('updates the chart and the legend when another client is selected', () => {
    renderChart();

    chooseOption('Client', 'Copilot CLI');

    expectSelected('Client', 'Copilot CLI');
    expect(bar).toHaveBeenLastCalledWith(expect.objectContaining({
      role: 'img',
      'aria-label': 'Daily IDE Users for Copilot CLI: Jan 15, 0 users; Jan 16, 2 users; Jan 17, 0 users.',
    }));
    expect(screen.getAllByText('Copilot CLI').filter(node => node.tagName === 'SPAN' && node.className.includes('font-medium')))
      .toHaveLength(1);
  });

  it('falls back to the most popular client when the selection disappears', () => {
    renderChart();

    chooseOption('Client', 'Copilot CLI');
    view!.rerender(<DailyIDEUsersChart data={[data[0]]} {...chartProps} />);

    expectSelected('Client', 'VS Code');
  });

  it('renders the empty state without any client data', () => {
    renderChart([]);

    expect(querySelect('Client')).toBeNull();
    expect(screen.getAllByText('No client usage data available')).toHaveLength(1);
  });

  it('filters telemetry warnings to the active client and hides them for unaffected clients', () => {
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
    renderChart(chartData, warnings);

    const shown = () => screen.queryAllByRole('listitem').map(item => item.textContent ?? '');
    const expectOnly = (warning: ClientTelemetryWarning) => {
      expect(shown()).toHaveLength(1);
      expect(shown()[0]).toContain(warning.recommendation);
    };
    expectOnly(warnings[0]);
    chooseOption('Client', 'Visual Studio');
    expectOnly(warnings[1]);
    chooseOption('Client', 'JetBrains');
    expectOnly(warnings[2]);
    chooseOption('Client', 'Copilot CLI');
    expect(shown()).toEqual([]);
    expect(screen.queryByLabelText('Copilot client telemetry warning')).toBeNull();

    chooseOption('Client', 'VS Code');
    expectOnly(warnings[0]);

    view!.rerender(
      <DailyIDEUsersChart data={[chartData[2]]} {...chartProps} telemetryWarnings={warnings} />,
    );
    expectSelected('Client', 'Visual Studio');
    expectOnly(warnings[1]);
  });

  it('omits telemetry warnings when no client is selected in an empty chart', () => {
    renderChart([], [{
      ide: 'vscode',
      version: '1.138.0',
      versionKind: 'ide',
      userCount: 1,
      action: 'upgrade',
      recommendation: 'Update VS Code.',
    }]);
    expect(screen.queryByLabelText('Copilot client telemetry warning')).toBeNull();
  });
});
