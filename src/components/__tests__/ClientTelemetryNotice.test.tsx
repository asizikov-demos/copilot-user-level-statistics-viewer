import { renderToStaticMarkup } from 'react-dom/server';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../domain/metricsAggregator';
import { computeSingleUserDetailedMetrics } from '../../domain/calculators/userDetailCalculator';
import { CLIENT_TELEMETRY_ANNOUNCEMENT_URL } from '../../domain/calculators/clientTelemetryCalculator';
import { selectClientsReadModel, selectClientVersionsReadModel } from '../../read-models/clients';
import { selectUserDetailsRouteReadModel, selectUserDetailsViewModel } from '../../read-models/userDetails';
import { NavigationProvider } from '../../state/NavigationContext';
import ClientTelemetryNotice from '../ClientTelemetryNotice';
import ClientsView from '../ClientsView';
import ClientVersionsView from '../features/client-versions/ClientVersionsView';
import UserDetailsView from '../features/user-details/UserDetailsView';
import { CLIENT_ANALYSIS_SECTIONS, CLIENT_VERSIONS_SECTIONS } from '../layout/contextSections';
import { USER_DETAILS_SECTIONS } from '../features/user-details/userDetailsSections';

function report(version = '1.138.0') {
  return aggregateMetrics([makeMetric({
    day: '2026-10-07',
    report_start_day: '2026-10-07',
    report_end_day: '2026-10-07',
    totals_by_ide: [{
      ide: 'vscode',
      user_initiated_interaction_count: 0,
      code_generation_activity_count: 0,
      code_acceptance_activity_count: 0,
      loc_added_sum: 0,
      loc_deleted_sum: 0,
      loc_suggested_to_add_sum: 0,
      loc_suggested_to_delete_sum: 0,
      last_known_ide_version: {
        ide_version: version,
        sampled_at: '2026-10-07T00:00:00Z',
      },
    }],
  })]);
}

function renderProfile(data: ReturnType<typeof report>) {
  const summary = data.aggregated.users.userSummaries[0];
  const route = selectUserDetailsRouteReadModel(data.aggregated, {
    id: summary.user_id,
    login: summary.user_login,
  });
  if (route.status !== 'resolved') throw new Error('Expected resolved profile');
  const details = computeSingleUserDetailedMetrics(data.userDetailAccumulator, summary.user_id)!;
  return renderToStaticMarkup(
    <NavigationProvider>
      <UserDetailsView model={selectUserDetailsViewModel(route, details)} />
    </NavigationProvider>,
  );
}

const noticeLabel = 'aria-label="Copilot client telemetry warning"';

describe('client telemetry notice', () => {
  it('shows observed versions, upgrade instructions, uncertainty, and the announcement', () => {
    const { aggregated } = report();
    const markup = renderToStaticMarkup(
      <ClientTelemetryNotice warnings={aggregated.clients.telemetryWarnings} />,
    );
    expect(markup).toContain(noticeLabel);
    expect(markup).toContain('VS Code ide 1.138.0');
    expect(markup).toContain('(1 user)');
    expect(markup).toContain('Update VS Code to 1.139.0 or later.');
    expect(markup).toContain('older versions are not');
    expect(markup).toContain('necessarily faulty');
    expect(markup).toContain('missing activity cannot be backfilled');
    expect(markup).toContain('Billing is');
    expect(markup).toContain('unaffected');
    expect(markup).toContain('Copilot CLI users do not need to upgrade');
    expect(markup).toContain(`href="${CLIENT_TELEMETRY_ANNOUNCEMENT_URL}"`);
    expect(markup).toContain('rel="noopener noreferrer"');
  });

  it('renders nothing when there are no detected risks', () => {
    expect(renderToStaticMarkup(<ClientTelemetryNotice warnings={[]} />)).toBe('');
  });

  it('places the notice above the Client Versions dashboard', () => {
    const { aggregated } = report();
    const markup = renderToStaticMarkup(
      <ClientVersionsView model={selectClientVersionsReadModel(aggregated)} />,
    );
    expect(markup).toContain(noticeLabel);
    expect(markup.indexOf(noticeLabel)).toBeLessThan(
      markup.indexOf(`id="${CLIENT_VERSIONS_SECTIONS[0].id}"`),
    );
  });

  it('places the notice below Daily IDE Users and before Insights', () => {
    const { aggregated } = report();
    const markup = renderToStaticMarkup(
      <ClientsView model={selectClientsReadModel(aggregated)} />,
    );
    expect(markup).toContain(noticeLabel);
    expect(markup.indexOf(noticeLabel)).toBeGreaterThan(markup.indexOf('Daily IDE Users'));
    expect(markup.indexOf(noticeLabel)).toBeLessThan(
      markup.indexOf(`id="${CLIENT_ANALYSIS_SECTIONS[2].id}"`),
    );
  });

  it('places a user-specific notice at the top of the profile without global user counts', () => {
    const markup = renderProfile(report());
    expect(markup).toContain(noticeLabel);
    expect(markup.indexOf(noticeLabel)).toBeLessThan(
      markup.indexOf(`id="${USER_DETAILS_SECTIONS[0].id}"`),
    );
    expect(markup.slice(markup.indexOf(noticeLabel), markup.indexOf('</aside>'))).not.toContain('(1 user)');
  });

  it('hides the notice on all three views for fixed clients', () => {
    const data = report('1.139.0');
    const versions = renderToStaticMarkup(
      <ClientVersionsView model={selectClientVersionsReadModel(data.aggregated)} />,
    );
    const clients = renderToStaticMarkup(
      <ClientsView model={selectClientsReadModel(data.aggregated)} />,
    );
    for (const markup of [versions, clients, renderProfile(data)]) {
      expect(markup).not.toContain(noticeLabel);
    }
  });

  it('discloses three observed versions initially and expands to show all', async () => {
    const base = report().aggregated.clients.telemetryWarnings[0];
    const warnings = ['1.135.0', '1.136.0', '1.137.0', '1.138.0'].map(version => ({ ...base, version }));
    let renderer: ReactTestRenderer | undefined;
    try {
      await act(async () => {
        renderer = create(<ClientTelemetryNotice warnings={warnings} />);
      });
      expect(renderer!.root.findAllByType('li')).toHaveLength(3);
      expect(renderer!.root.findByType('button').props['aria-expanded']).toBe(false);
      await act(async () => { renderer!.root.findByType('button').props.onClick(); });
      expect(renderer!.root.findAllByType('li')).toHaveLength(4);
      expect(renderer!.root.findByType('button').props['aria-expanded']).toBe(true);
      await act(async () => { renderer!.root.findByType('button').props.onClick(); });
      expect(renderer!.root.findAllByType('li')).toHaveLength(3);
    } finally {
      await act(async () => { renderer?.unmount(); });
    }
  });
});
