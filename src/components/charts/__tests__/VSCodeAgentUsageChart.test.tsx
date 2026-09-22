import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../../domain/metricsAggregator';
import VSCodeAgentUsageChart from '../VSCodeAgentUsageChart';

const { line, bar } = vi.hoisted(() => ({ line: vi.fn(), bar: vi.fn() }));
vi.mock('react-chartjs-2', () => ({
  Bar: (props: Record<string, unknown>) => {
    bar(props);
    return <div>Usage bar chart</div>;
  },
  Line: (props: Record<string, unknown>) => {
    line(props);
    return <div>Usage chart</div>;
  },
}));

describe('VSCodeAgentUsageChart', () => {
  it('omits unavailable measures in profiles while preserving zero sessions and missing-day gaps', () => {
    const data = aggregateMetrics([
      makeMetric({ totals_by_vscode_agent: { session_count: 0 } }),
      makeMetric({ day: '2024-01-17' }),
    ]).aggregated.adoption.vscodeAgentUsage;
    const markup = renderToStaticMarkup(
      <VSCodeAgentUsageChart data={data} reportStartDay="2024-01-15" reportEndDay="2024-01-17" scope="user" />,
    );
    expect(bar).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        datasets: [expect.objectContaining({ label: 'Sessions', data: [0, null, null] })],
      }),
    }));
    expect(markup).toContain('Sessions');
    expect(markup).toContain('>0<');
    expect(markup).not.toContain('Distinct active users');
    expect(markup).not.toContain('User messages');
    expect(markup).not.toContain('Not reported');
    expect(markup).not.toContain('<table');
  });

  it('shows grouped session and message bars without active-user counts anywhere in profiles', () => {
    const data = aggregateMetrics([
      makeMetric({ used_vscode_agent: true, totals_by_vscode_agent: { session_count: 2, total_user_messages: 7 } }),
      makeMetric({ day: '2024-01-17', used_vscode_agent: false, totals_by_vscode_agent: { session_count: 0, total_user_messages: 0 } }),
    ]).aggregated.adoption.vscodeAgentUsage;
    const markup = renderToStaticMarkup(
      <VSCodeAgentUsageChart data={data} reportStartDay="2024-01-15" reportEndDay="2024-01-17" scope="user" />,
    );
    expect(bar).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        datasets: [
          expect.objectContaining({ label: 'Sessions', data: [2, null, 0] }),
          expect.objectContaining({ label: 'User messages', data: [7, null, 0] }),
        ],
      }),
      options: expect.objectContaining({
        scales: expect.objectContaining({
          x: expect.objectContaining({ stacked: false }),
          y: expect.objectContaining({ stacked: false }),
        }),
      }),
      'aria-label': 'Daily VS Code Agents: sessions, user messages.',
    }));
    expect(markup).toContain('Usage bar chart');
    expect(markup).toContain('Sessions');
    expect(markup).toContain('User messages');
    expect(markup).not.toMatch(/active users/i);
    expect(markup).not.toContain('<table');
    expect(markup).not.toContain('Show all');
  });

  it.each([undefined, true, false])('hides profiles with only the usage flag reported (%s)', used_vscode_agent => {
    const data = aggregateMetrics([makeMetric({ used_vscode_agent })]).aggregated.adoption.vscodeAgentUsage;
    expect(renderToStaticMarkup(
      <VSCodeAgentUsageChart data={data} reportStartDay="2024-01-15" reportEndDay="2024-01-17" scope="user" />,
    )).toBe('');
  });

  it('renders unavailable metrics as an explicit empty state', () => {
    const data = aggregateMetrics([makeMetric()]).aggregated.adoption.vscodeAgentUsage;
    const markup = renderToStaticMarkup(
      <VSCodeAgentUsageChart data={data} reportStartDay="2024-01-15" reportEndDay="2024-01-17" />,
    );
    expect(markup).toContain('VS Code Agents metrics are not reported');
    expect(markup).not.toContain('Usage chart');
  });

  it('preserves full-range gaps and explicit zero without rendering metric coverage', () => {
    const data = aggregateMetrics([
      makeMetric({ used_vscode_agent: false, totals_by_vscode_agent: { session_count: 0, total_user_messages: 0 } }),
      makeMetric({ user_id: 2 }),
      makeMetric({ day: '2024-01-17', used_vscode_agent: true }),
    ]).aggregated.adoption.vscodeAgentUsage;
    const markup = renderToStaticMarkup(
      <VSCodeAgentUsageChart data={data} reportStartDay="2024-01-15" reportEndDay="2024-01-17" />,
    );
    expect(line).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        labels: expect.any(Array),
        datasets: [
          expect.objectContaining({ data: [0, null, 1], spanGaps: false }),
          expect.objectContaining({ data: [0, null, null], spanGaps: false }),
          expect.objectContaining({ data: [0, null, null], spanGaps: false }),
        ],
      }),
    }));
    expect(markup).not.toContain('2 of 3 records reporting');
    expect(markup).not.toContain('1 of 3 records reporting');
    expect(markup).toContain('Distinct active users');
    expect(markup).toContain('separate from editor Agent Mode');
    expect(markup).not.toContain('Gaps indicate missing data');
    expect(markup).not.toContain('<table');
  });

  it('does not render a table or progressive-disclosure control', () => {
    const data = aggregateMetrics(Array.from({ length: 9 }, (_, index) => makeMetric({
      day: `2024-01-${String(index + 10)}`,
      used_vscode_agent: true,
    }))).aggregated.adoption.vscodeAgentUsage;
    const markup = renderToStaticMarkup(
      <VSCodeAgentUsageChart data={data} reportStartDay="2024-01-10" reportEndDay="2024-01-18" />,
    );
    expect(markup).not.toContain('<table');
    expect(markup).not.toContain('Show all');
  });
});
