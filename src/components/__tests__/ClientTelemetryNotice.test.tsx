import { renderToStaticMarkup } from 'react-dom/server';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { makeAggregatedMetrics } from '../../__tests__/factories/aggregatedMetrics';
import {
  CLIENT_TELEMETRY_ANNOUNCEMENT_URL,
  type ClientTelemetryWarning,
} from '../../domain/calculators/clientTelemetryCalculator';
import { selectClientVersionsReadModel } from '../../read-models/clients';
import ClientTelemetryNotice from '../ClientTelemetryNotice';
import ClientVersionsView from '../features/client-versions/ClientVersionsView';
import { CLIENT_VERSIONS_SECTIONS } from '../layout/contextSections';

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
    expect(markup).toContain('<p class="font-semibold">Copilot agent telemetry: client upgrades may be needed</p>');
    expect(markup).not.toMatch(/<h[1-6]/);
    expect(markup).toContain('(1 user)');
    expect(markup).toContain('Update VS Code to 1.139.0 or later.');
    expect(markup).toContain('missing activity cannot be backfilled');
    expect(markup).toContain('Copilot CLI users do not need to upgrade');
    expect(markup).toContain(`href="${CLIENT_TELEMETRY_ANNOUNCEMENT_URL}"`);
    expect(markup).toContain('rel="noopener noreferrer"');
  });

  it('omits user counts when requested', () => {
    const markup = renderToStaticMarkup(
      <ClientTelemetryNotice warnings={[makeWarning({ userCount: 3 })]} showUserCounts={false} />,
    );

    expect(markup).toContain('VS Code IDE 1.138.0');
    expect(markup).not.toContain('users)');
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

  it('is placed above the Client Versions dashboard', () => {
    const metrics = makeAggregatedMetrics({ clients: { telemetryWarnings: [makeWarning()] } });
    const markup = renderToStaticMarkup(
      <ClientVersionsView model={selectClientVersionsReadModel(metrics)} />,
    );

    expect(markup.indexOf(noticeLabel)).toBeGreaterThanOrEqual(0);
    expect(markup.indexOf(noticeLabel)).toBeLessThan(
      markup.indexOf(`id="${CLIENT_VERSIONS_SECTIONS[0].id}"`),
    );
  });
});
