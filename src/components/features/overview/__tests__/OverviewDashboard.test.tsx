// @vitest-environment jsdom
import { BaseStyles, ThemeProvider } from '@primer/react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAggregatedMetrics } from '../../../../__tests__/factories/aggregatedMetrics';
import { makeMetric } from '../../../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../../../domain/metricsAggregator';
import { selectOverviewReadModel, type OverviewReadModel } from '../../../../read-models/overview';
import { VIEW_MODES } from '../../../../types/navigation';
import OverviewDashboard from '../OverviewDashboard';
import { makeFeatureTotal } from '../../../../__tests__/factories/metricTotals';

const { navigateTo } = vi.hoisted(() => ({ navigateTo: vi.fn() }));
vi.mock('../../../../state/NavigationContext', () => ({
  useNavigation: () => ({ navigateTo }),
}));

function renderOverview(model: OverviewReadModel) {
  return render(
    <ThemeProvider colorMode="day">
      <BaseStyles><OverviewDashboard model={model} enterpriseName="Octocat Engineering" /></BaseStyles>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  navigateTo.mockClear();
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Overview two lenses', () => {
  it('preserves billing, uses uploaded-user reach for both lenses, and navigates to detailed views', () => {
    const metrics = aggregateMetrics([
      makeMetric({ user_id: 1, day: '2026-11-01', report_start_day: '2026-11-01', report_end_day: '2026-11-02', ai_credits_used: 100 }),
      makeMetric({ user_id: 2, day: '2026-11-02' }),
      makeMetric({ user_id: 3, day: '2026-11-02' }),
    ]).aggregated;
    metrics.overview.clientReachData = [{ client: 'vscode', users: 2 }];
    metrics.adoption.featureAdoptionData = {
      ...metrics.adoption.featureAdoptionData, totalUsers: 1, completionUsers: 1, agentModeUsers: 1,
    };
    renderOverview(selectOverviewReadModel(metrics));

    expect(screen.getByRole('heading', { name: 'Octocat Engineering' })).toBeTruthy();
    expect(screen.getByText('Est. cost')).toBeTruthy();
    expect(screen.getByText('$1.00')).toBeTruthy();
    const clients = screen.getByRole('list', { name: 'Observed users by client' });
    expect(within(clients).getByText('VS Code')).toBeTruthy();
    expect(within(clients).getByText('66.7%')).toBeTruthy();
    const workflows = screen.getByRole('list', { name: 'Observed users by workflow' });
    expect(within(workflows).getAllByText('33.3%')).toHaveLength(2);
    expect(within(workflows).getAllByText('0.0%')).toHaveLength(4);
    expect(screen.queryByText('Daily Chat Users Trends')).toBeNull();
    expect(screen.queryByText('Daily Chat Requests')).toBeNull();
    expect(screen.queryByText('Daily User Engagement')).toBeNull();
    expect(screen.getByText(/not licensed seats/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Explore Clients' }));
    fireEvent.click(screen.getByRole('button', { name: 'Explore Adoption' }));
    expect(navigateTo.mock.calls).toEqual([[VIEW_MODES.CLIENT_ANALYSIS], [VIEW_MODES.COPILOT_ADOPTION]]);
  });

  it('bounds the client preview and distinguishes coverage from reach', () => {
    const metrics = makeAggregatedMetrics({
      overview: { clientReachData: Array.from({ length: 9 }, (_, index) => ({ client: `client_${index}`, users: 9 - index })) },
    });
    metrics.overview.stats.uniqueUsers = 10;
    metrics.clients.traffic.summary.reportedRecords = 2;
    metrics.clients.traffic.summary.recordCount = 5;
    renderOverview(selectOverviewReadModel(metrics));

    const clients = screen.getByRole('list', { name: 'Observed users by client' });
    expect(within(clients).getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getByText('Top 6 of 9 clients')).toBeTruthy();
    expect(screen.getByText(/Client traffic fields were reported in 2 of 5 uploaded records/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /show all/i })).toBeNull();
  });

  it('keeps drill-throughs available without observed client or workflow usage', () => {
    renderOverview(selectOverviewReadModel(makeAggregatedMetrics()));
    expect(screen.getByRole('heading', { name: 'No client usage observed' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'No usage observed for these workflows' })).toBeTruthy();
    expect(screen.getByText(/Client traffic fields were not reported/)).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'Observed users by client' })).toBeNull();
    expect(screen.queryByRole('list', { name: 'Observed users by workflow' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Explore Adoption' }));
    expect(navigateTo).toHaveBeenCalledWith(VIEW_MODES.COPILOT_ADOPTION);
  });

  it('places an overlapping reach profile before the lenses and explains breadth rather than maturity', () => {
    const metrics = aggregateMetrics([
      makeMetric({
        user_id: 1, used_agent: true, used_cli: true, used_copilot_cloud_agent: true,
        totals_by_feature: [makeFeatureTotal('code_completion', 0, { code_generation_activity_count: 1 })],
      }),
      makeMetric({
        user_id: 2, used_agent: true, used_copilot_code_review_active: true,
        totals_by_feature: [makeFeatureTotal('chat_panel_ask_mode', 1)],
      }),
      makeMetric({ user_id: 3 }),
    ]).aggregated;
    const { container } = renderOverview(selectOverviewReadModel(metrics));
    const section = screen.getByRole('region', { name: 'Copilot working patterns' });
    expect(within(section).getByText(/Groups overlap, so percentages do not add up/)).toBeTruthy();
    const rows = within(section).getByRole('list', { name: 'Observed working-pattern reach' });
    expect(within(rows).getAllByRole('listitem')).toHaveLength(3);
    expect(within(rows).getAllByText('66.7%')).toHaveLength(3);
    expect(within(section).queryByText(/used local agents/)).toBeNull();
    expect(within(section).getByText('Two or more local agent surfaces')).toBeTruthy();
    expect(within(section).getByText('Local + delegated workflows')).toBeTruthy();
    expect(Array.from(container.querySelectorAll('section[id]')).map(element => element.id)).toEqual([
      'overview-working-patterns', 'overview-client-reach', 'overview-workflow-reach',
    ]);
  });

  it('shows unavailable delegated reach without inventing zero', () => {
    const metrics = aggregateMetrics([
      makeMetric({ used_agent: true }),
    ]).aggregated;
    renderOverview(selectOverviewReadModel(metrics));
    const section = screen.getByRole('region', { name: 'Copilot working patterns' });
    expect(within(section).getByText(/Delegated workflow signals were not reported/)).toBeTruthy();
    const row = within(section).getByText('Delegated workflows').closest('li')!;
    expect(within(row).getByText('Not reported')).toBeTruthy();
    expect(within(row).queryByText('0 users')).toBeNull();
  });
});
