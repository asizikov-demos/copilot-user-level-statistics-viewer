import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../../domain/metricsAggregator';
import VSCodeAgentUsageChart from '../VSCodeAgentUsageChart';

const { line } = vi.hoisted(() => ({ line: vi.fn() }));
vi.mock('react-chartjs-2', () => ({
  Line: (props: Record<string, unknown>) => {
    line(props);
    return <div>Usage chart</div>;
  },
}));

describe('VSCodeAgentUsageChart', () => {
  it('renders unavailable metrics as an explicit empty state', () => {
    const data = aggregateMetrics([makeMetric()]).aggregated.adoption.vscodeAgentUsage;
    const markup = renderToStaticMarkup(
      <VSCodeAgentUsageChart data={data} reportStartDay="2024-01-15" reportEndDay="2024-01-17" />,
    );
    expect(markup).toContain('VS Code Agents metrics are not reported');
    expect(markup).not.toContain('Usage chart');
  });

  it('preserves full-range gaps and explicit zero, exposes coverage, and labels partial daily values', () => {
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
    expect(markup).toContain('2 of 3 records reporting');
    expect(markup).toContain('1 of 3 records reporting');
    expect(markup).toContain('0 (partial)');
    expect(markup).toContain('Not reported');
    expect(markup).toContain('Distinct active users');
    expect(markup).toContain('separate from editor Agent Mode');
  });

  it('shows only seven days initially and provides progressive disclosure', () => {
    const data = aggregateMetrics(Array.from({ length: 9 }, (_, index) => makeMetric({
      day: `2024-01-${String(index + 10)}`,
      used_vscode_agent: true,
    }))).aggregated.adoption.vscodeAgentUsage;
    const markup = renderToStaticMarkup(
      <VSCodeAgentUsageChart data={data} reportStartDay="2024-01-10" reportEndDay="2024-01-18" />,
    );
    expect(markup).toContain('Show all 9 days');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('2024-01-16');
    expect(markup).not.toContain('2024-01-17');
  });
});
