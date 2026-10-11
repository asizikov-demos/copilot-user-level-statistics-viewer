import { renderToStaticMarkup } from 'react-dom/server';
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VSCodeAgentUsage } from '../../../types/vscodeAgent';
import VSCodeAgentUsageChart from '../VSCodeAgentUsageChart';
import { makeVSCodeAgentUsage } from './helpers/chartFixtures';

interface ChartProps<TType extends 'bar' | 'line'> {
  data: ChartData<TType>;
  options: ChartOptions<TType>;
  'aria-label': string;
}

const { line, bar } = vi.hoisted(() => ({
  line: vi.fn<(props: ChartProps<'line'>) => void>(),
  bar: vi.fn<(props: ChartProps<'bar'>) => void>(),
}));
vi.mock('react-chartjs-2', () => ({
  Bar: (props: ChartProps<'bar'>) => {
    bar(props);
    return <div>Usage bar chart</div>;
  },
  Line: (props: ChartProps<'line'>) => {
    line(props);
    return <div>Usage chart</div>;
  },
}));

const range = { reportStartDay: '2024-01-15', reportEndDay: '2024-01-17' };
const renderChart = (data: VSCodeAgentUsage, scope?: 'user') =>
  renderToStaticMarkup(<VSCodeAgentUsageChart data={data} {...range} scope={scope} />);

describe('VSCodeAgentUsageChart', () => {
  beforeEach(() => {
    bar.mockClear();
    line.mockClear();
  });

  describe('user scope', () => {
    it('omits unavailable measures and keeps a reported zero session count', () => {
      const markup = renderChart(makeVSCodeAgentUsage(
        { sessionCount: 0, sessionsReportedRecords: 1 },
        [{ date: '2024-01-15', sessionCount: 0, sessionsReportedRecords: 1 }],
      ), 'user');

      expect(bar.mock.lastCall![0]['aria-label']).toBe('Daily VS Code Agents: sessions.');
      expect(markup).toContain('>0<');
      expect(markup).not.toContain('Distinct active users');
      expect(markup).not.toContain('User messages');
      expect(markup).not.toContain('Not reported');
    });

    it('shows sessions and messages as bars without active-user counts', () => {
      const markup = renderChart(makeVSCodeAgentUsage(
        { activeUsers: 1, sessionCount: 2, userMessages: 7 },
        [{ date: '2024-01-15', activeUsers: 1, sessionCount: 2, userMessages: 7 }],
      ), 'user');

      expect(bar.mock.lastCall![0]['aria-label']).toBe('Daily VS Code Agents: sessions, user messages.');
      expect(line).not.toHaveBeenCalled();
      expect(markup).toContain('Usage bar chart');
      expect(markup).toContain('User messages');
      expect(markup).not.toMatch(/active users/i);
    });

    it.each([null, 0, 1])('hides profiles with only the usage flag reported (active users: %s)', activeUsers => {
      expect(renderChart(makeVSCodeAgentUsage({ activeUsers }), 'user')).toBe('');
    });
  });

  describe('aggregate scope', () => {
    it('renders unavailable metrics as an explicit empty state', () => {
      const markup = renderChart(makeVSCodeAgentUsage({}));

      expect(markup).toContain('VS Code Agents metrics are not reported');
      expect(markup).not.toContain('Usage chart');
    });

    it('renders missing report days as unspanned gaps and reported zeros as zero', () => {
      const markup = renderChart(makeVSCodeAgentUsage(
        { activeUsers: 1, sessionCount: 0, userMessages: 0, recordCount: 3 },
        [
          { date: '2024-01-15', activeUsers: 0, sessionCount: 0, userMessages: 0, recordCount: 2 },
          { date: '2024-01-17', activeUsers: 1 },
        ],
      ));

      expect(line.mock.lastCall![0].data.datasets).toEqual([
        expect.objectContaining({ data: [0, null, 1], spanGaps: false }),
        expect.objectContaining({ data: [0, null, null], spanGaps: false }),
        expect.objectContaining({ data: [0, null, null], spanGaps: false }),
      ]);
      expect(markup).toContain('Distinct active users');
      expect(markup).toContain('separate from editor Agent Mode');
      expect(markup).not.toContain('records reporting');
    });

    it('uses padded daily entries for coverage tooltip text', () => {
      renderChart(makeVSCodeAgentUsage(
        { activeUsers: 0, usageReportedRecords: 1, recordCount: 2 },
        [{ date: '2024-01-15', activeUsers: 0, usageReportedRecords: 1, recordCount: 2 }],
      ));

      const label = line.mock.lastCall![0].options.plugins?.tooltip?.callbacks?.label;
      if (!label) throw new Error('Tooltip callback is required');
      const tooltip = {} as ThisParameterType<typeof label>;

      expect(label.call(tooltip, { datasetIndex: 0, dataIndex: 0 } as TooltipItem<'line'>))
        .toBe('Active users: 0 (1 of 2 records reporting)');
      expect(label.call(tooltip, { datasetIndex: 0, dataIndex: 1 } as TooltipItem<'line'>))
        .toBe('Not reported');
    });

    it('does not render a table or progressive-disclosure control for long ranges', () => {
      const daily = Array.from({ length: 9 }, (_, index) => ({ date: `2024-01-${index + 10}`, activeUsers: 1 }));
      const markup = renderToStaticMarkup(
        <VSCodeAgentUsageChart data={makeVSCodeAgentUsage({ activeUsers: 1 }, daily)} reportStartDay="2024-01-10" reportEndDay="2024-01-18" />,
      );

      expect(markup).not.toContain('<table');
      expect(markup).not.toContain('Show all');
    });
  });
});
