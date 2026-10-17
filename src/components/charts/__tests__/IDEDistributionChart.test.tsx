import { renderToStaticMarkup } from 'react-dom/server';
import type { ChartData } from 'chart.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IDEStatsData } from '../../../types/metrics';
import IDEDistributionChart from '../IDEDistributionChart';
import { ideColors } from '../utils/chartColors';

const { doughnut } = vi.hoisted(() => ({ doughnut: vi.fn<(props: { data: ChartData<'doughnut'> }) => void>() }));
vi.mock('react-chartjs-2', () => ({
  Doughnut: (props: { data: ChartData<'doughnut'> }) => {
    doughnut(props);
    return <canvas />;
  },
}));

const clientStats = (ide: string, uniqueUsers: number): IDEStatsData => ({
  ide,
  uniqueUsers,
  cliOverlapUsers: 0,
  totalEngagements: 0,
  totalGenerations: 0,
  totalAcceptances: 0,
  locAdded: 0,
  locDeleted: 0,
  locSuggestedToAdd: 0,
  locSuggestedToDelete: 0,
});

describe('IDEDistributionChart', () => {
  beforeEach(() => doughnut.mockClear());

  it('draws a doughnut that ranks Copilot CLI with the IDE clients by unique users', () => {
    const markup = renderToStaticMarkup(
      <IDEDistributionChart ideStats={[clientStats('jetbrains', 3), clientStats('vscode', 10)]} cliUsers={7} />,
    );

    const { labels, datasets } = doughnut.mock.lastCall![0].data;
    expect(labels).toEqual(['VS Code', 'Copilot CLI', 'JetBrains']);
    expect(datasets[0].data).toEqual([10, 7, 3]);
    expect(datasets[0].backgroundColor).toEqual([ideColors.vscode, ideColors.copilot_cli, ideColors.jetbrains]);
    expect(markup).toContain('aria-label="Users by client"');
  });

  it('omits the center total because users of several clients count in each segment', () => {
    const markup = renderToStaticMarkup(
      <IDEDistributionChart ideStats={[clientStats('vscode', 10)]} cliUsers={7} />,
    );

    expect(markup).not.toContain('Total:');
  });

  it('shows the empty state without IDE or CLI users', () => {
    const markup = renderToStaticMarkup(<IDEDistributionChart ideStats={[clientStats('vscode', 0)]} cliUsers={0} />);

    expect(markup).toContain('No IDE or CLI usage data available');
    expect(doughnut).not.toHaveBeenCalled();
  });
});
