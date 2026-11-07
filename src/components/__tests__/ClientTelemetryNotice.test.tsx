import { renderToStaticMarkup } from 'react-dom/server';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { makeAggregatedMetrics } from '../../__tests__/factories/aggregatedMetrics';
import {
  CLIENT_TELEMETRY_ANNOUNCEMENT_URL,
  type ClientTelemetryWarning,
} from '../../domain/calculators/clientTelemetryCalculator';
import { selectClientVersionsReadModel } from '../../read-models/clients';
import ClientTelemetryNotice from '../ClientTelemetryNotice';
import FleetHealthView from '../features/client-versions/FleetHealthView';

function makeWarning(overrides: Partial<ClientTelemetryWarning> = {}): ClientTelemetryWarning {
  return {
    ide: 'vscode',
    version: '1.138.0',
    versionKind: 'ide',
    userCount: 1,
    action: 'upgrade',
    recommendation: 'Update VS Code to 1.139.0 or later.',
    ...overrides,
  };
}

const noticeLabel = 'aria-label="Copilot client telemetry warning"';

describe('client telemetry notice', () => {
  it('shows observed versions, upgrade instructions, uncertainty, and the announcement', () => {
    const markup = renderToStaticMarkup(<ClientTelemetryNotice warnings={[makeWarning()]} />);

    expect(markup).toContain(noticeLabel);
    expect(markup).toContain('VS Code IDE 1.138.0');
    expect(markup).toMatch(/<p [^>]*>Copilot agent telemetry: client upgrades may be needed<\/p>/);
    expect(markup).not.toMatch(/<h[1-6]/);
    expect(markup).toContain('(1 user)');
    expect(markup).toContain('Update VS Code to 1.139.0 or later.');
    expect(markup).toContain('missing activity cannot be backfilled');
    expect(markup).toContain('Copilot CLI users do not need to upgrade');
    expect(markup).toContain(`href="${CLIENT_TELEMETRY_ANNOUNCEMENT_URL}"`);
    expect(markup).toContain('rel="noopener noreferrer"');
  });

  it('renders nothing when there are no detected risks', () => {
    expect(renderToStaticMarkup(<ClientTelemetryNotice warnings={[]} />)).toBe('');
  });

  it('discloses three observed versions initially and expands to show all', async () => {
    const warnings = ['1.135.0', '1.136.0', '1.137.0', '1.138.0'].map(version => makeWarning({ version }));
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

  it('keeps October inference separate as disclosed historical guidance for older exports', () => {
    const metrics = makeAggregatedMetrics({ clients: { telemetryWarnings: [makeWarning()] } });
    const markup = renderToStaticMarkup(
      <FleetHealthView model={selectClientVersionsReadModel(metrics)} onUserClick={vi.fn()} />,
    );

    expect(markup).not.toContain(noticeLabel);
    expect(markup).not.toContain('client upgrades may be needed');
    expect(markup).toContain('Historical October guidance for older exports');
    expect(markup).toContain('October version inference, not API-confirmed reporting issues');
    expect(markup.indexOf('aria-label="Historical client version guidance"')).toBeGreaterThan(markup.indexOf('id="client-version-health"'));
  });

  it('does not show October upgrade inference when API signals are reported', () => {
    const defaults = makeAggregatedMetrics();
    const metrics = makeAggregatedMetrics({
      clients: {
        telemetryWarnings: [makeWarning()],
        reportingQuality: {
          ...defaults.clients.reportingQuality,
          summary: {
            recordCount: 1, telemetryReportedRecords: 1, requirementsReportedRecords: 0,
            missingTelemetryUsers: 1, belowMinimumUsers: null,
          },
        },
      },
    });
    const markup = renderToStaticMarkup(
      <FleetHealthView model={selectClientVersionsReadModel(metrics)} onUserClick={vi.fn()} />,
    );
    expect(markup).toContain('Users missing client telemetry');
    expect(markup).not.toContain('Historical October guidance');
    expect(markup).not.toContain('Update VS Code to');
    expect(markup).not.toContain(noticeLabel);
    expect(markup).toContain('An outdated version is not proof');
  });
});
