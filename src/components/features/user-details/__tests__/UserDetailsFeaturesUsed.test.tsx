import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { makeUserSummary } from '../../../../__tests__/factories/aggregatedMetrics';
import { NavigationProvider } from '../../../../state/NavigationContext';
import UserDetailsView from '../UserDetailsView';
import { makeUserDetailsViewModel } from './helpers/userDetailsFixtures';

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Line: () => null,
  Pie: () => null,
  Doughnut: () => null,
  Radar: () => null,
}));

describe('user details features used', () => {
  it.each([
    { usedCli: true, usedCopilotApp: true, expected: ['CLI', 'Copilot App'] },
    { usedCli: false, usedCopilotApp: true, expected: ['Copilot App'] },
    { usedCli: true, usedCopilotApp: false, expected: ['CLI'] },
  ])('reflects aggregated CLI and Copilot App usage: %j', ({ usedCli, usedCopilotApp, expected }) => {
    const model = makeUserDetailsViewModel({
      userSummary: makeUserSummary({
        used_cli: usedCli,
        used_copilot_app: usedCopilotApp,
        used_chat: false,
        used_agent: false,
        used_copilot_coding_agent: false,
        used_copilot_code_review_active: false,
        used_copilot_code_review_passive: false,
        used_auto_mode: false,
        used_local_byok: false,
      }),
    });
    const markup = renderToStaticMarkup(
      <NavigationProvider><UserDetailsView model={model} /></NavigationProvider>,
    );
    const summary = markup.slice(
      markup.indexOf('<section aria-label="User usage summary"'),
      markup.indexOf('</section>', markup.indexOf('<section aria-label="User usage summary"')),
    );
    expect(summary).toContain('Features used:');
    for (const label of expected) expect(summary).toContain(`>${label}</span>`);
    if (!usedCopilotApp) expect(summary).not.toContain('>Copilot App</span>');
    if (!usedCli) expect(summary).not.toContain('>CLI</span>');
    expect(summary).not.toContain('Completion Only');
  });
});
