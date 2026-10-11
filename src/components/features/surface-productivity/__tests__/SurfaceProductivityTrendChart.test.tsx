import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { ChartData, ChartOptions } from 'chart.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SurfaceProductivityReadModel } from '../../../../read-models/surfaceProductivity';
import SurfaceProductivityTrendChart from '../SurfaceProductivityTrendChart';

interface LineProps {
  data: ChartData<'line'>;
  options: ChartOptions<'line'>;
}

const { line } = vi.hoisted(() => ({ line: vi.fn<(props: LineProps) => void>() }));
vi.mock('react-chartjs-2', () => ({
  Line: (props: LineProps) => {
    line(props);
    return <div>Surface productivity chart</div>;
  },
}));

const model: Pick<SurfaceProductivityReadModel, 'dailyProductivity' | 'reportStartDay' | 'reportEndDay'> = {
  reportStartDay: '2024-01-15',
  reportEndDay: '2024-01-17',
  dailyProductivity: [
    {
      date: '2024-01-15',
      surfaces: {
        ide: { activeUsers: 2, locAdded: 4, locDeleted: 1, netLocImpact: 3 },
        cli: { activeUsers: 1, locAdded: 8, locDeleted: 2, netLocImpact: 6 },
        copilotApp: { activeUsers: 0, locAdded: 0, locDeleted: 0, netLocImpact: 0 },
      },
    },
    {
      date: '2024-01-17',
      surfaces: {
        ide: { activeUsers: 1, locAdded: 3, locDeleted: 5, netLocImpact: -2 },
        cli: { activeUsers: 0, locAdded: 0, locDeleted: 0, netLocImpact: 0 },
        copilotApp: { activeUsers: 1, locAdded: 3, locDeleted: 1, netLocImpact: 2 },
      },
    },
  ],
};

describe('SurfaceProductivityTrendChart', () => {
  let renderer: ReactTestRenderer | undefined;

  afterEach(async () => {
    await act(async () => { renderer?.unmount(); });
    renderer = undefined;
    line.mockClear();
  });

  it('fills the report range and keeps metric selection local to the chart', async () => {
    await act(async () => { renderer = create(<SurfaceProductivityTrendChart model={model} />); });

    expect(line.mock.lastCall![0].data.labels).toEqual(['Jan 15', 'Jan 16', 'Jan 17']);
    expect(line.mock.lastCall![0].data.datasets.map(dataset => dataset.data)).toEqual([
      [2, 0, 1],
      [1, 0, 0],
      [0, 0, 1],
    ]);

    await act(async () => {
      renderer!.root.findAllByType('button').find(button => button.children.join('') === 'Daily net LOC')!.props.onClick();
    });

    expect(line.mock.lastCall![0].data.datasets.map(dataset => dataset.data)).toEqual([
      [3, 0, -2],
      [6, 0, 0],
      [0, 0, 2],
    ]);
    expect(line.mock.lastCall![0].options.scales?.y).toMatchObject({ beginAtZero: false });
  });
});
