import { renderToStaticMarkup } from 'react-dom/server';
import type { ChartProps } from 'react-chartjs-2';
import type { TooltipItem, TooltipModel } from 'chart.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeUserSummary } from '../../../../__tests__/factories/aggregatedMetrics';
import { NavigationProvider } from '../../../../state/NavigationContext';
import UserDetailsView from '../UserDetailsView';
import { makeUserDetails, makeUserDetailsViewModel } from './helpers/userDetailsFixtures';

const radar = vi.hoisted(() => vi.fn<(props: ChartProps<'radar'>) => null>(() => null));

vi.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Line: () => null,
  Pie: () => null,
  Doughnut: () => null,
  Radar: radar,
}));

afterEach(() => radar.mockClear());

describe('user details features used', () => {
  it('replaces Ask and Edit radar values with Cloud Agent days and Copilot App interactions', () => {
    const details = makeUserDetails();
    const model = makeUserDetailsViewModel({
      userSummary: makeUserSummary({ cloud_agent_days: 3 }),
      userDetails: makeUserDetails({
        presentationSummary: {
          ...details.presentationSummary,
          totalCliPrompts: 1057,
          featureInteractions: {
            chat_panel_agent_mode: 11,
            chat_panel_plan_mode: 12,
            chat_panel_ask_mode: 90,
            chat_panel_edit_mode: 80,
            copilot_app: 25,
            code_completion: 14,
          },
        },
      }),
    });
    const markup = renderToStaticMarkup(
      <NavigationProvider><UserDetailsView model={model} /></NavigationProvider>,
    );
    const props = radar.mock.lastCall?.[0];
    expect(props?.data.labels).toEqual([
      'Agent Mode', 'Plan Mode', 'CLI', 'Cloud Agent', 'Copilot App', 'Completions',
    ]);
    expect(props?.data.datasets[0].data).toEqual([11, 12, 1057, 3, 25, 14]);
    expect(markup).toContain('Cloud Agent (days): <strong>3</strong>');
    expect(markup).toContain('Copilot App: <strong>25</strong>');
    expect(markup).not.toContain('Ask: <strong>');
    expect(markup).not.toContain('Edit: <strong>');
    const tooltip = props?.options?.plugins?.tooltip?.callbacks?.label;
    const context = { label: 'Cloud Agent', dataIndex: 3, parsed: { r: 3 } } as TooltipItem<'radar'>;
    expect(tooltip?.call({} as TooltipModel<'radar'>, context)).toBe('Cloud Agent: 3 active days');
    expect(tooltip?.call({} as TooltipModel<'radar'>, {
      ...context, label: 'Copilot App', dataIndex: 4, parsed: { r: 25 },
    })).toBe('Copilot App: 25 interactions');
  });

  it.each([
    { cloudAgentDays: 2, appInteractions: 0, visible: true },
    { cloudAgentDays: 0, appInteractions: 7, visible: true },
    { cloudAgentDays: 0, appInteractions: 0, visible: false },
  ])('keeps the radar visible for either replacement feature: %j', ({ cloudAgentDays, appInteractions, visible }) => {
    const details = makeUserDetails();
    const model = makeUserDetailsViewModel({
      userSummary: makeUserSummary({ cloud_agent_days: cloudAgentDays }),
      userDetails: makeUserDetails({
        presentationSummary: {
          ...details.presentationSummary,
          featureInteractions: {
            chat_panel_ask_mode: 90,
            chat_panel_edit_mode: 80,
            copilot_app: appInteractions,
          },
        },
      }),
    });
    renderToStaticMarkup(
      <NavigationProvider><UserDetailsView model={model} /></NavigationProvider>,
    );
    expect(radar.mock.calls.length > 0).toBe(visible);
  });

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

  it('shows a Custom Model Provider pill before Local BYOK', () => {
    const model = makeUserDetailsViewModel({
      userSummary: makeUserSummary({ used_custom_model_provider: true, used_local_byok: true }),
    });
    const markup = renderToStaticMarkup(
      <NavigationProvider><UserDetailsView model={model} /></NavigationProvider>,
    );
    expect(markup.indexOf('>Custom Model Provider</span>')).toBeGreaterThan(-1);
    expect(markup.indexOf('>Custom Model Provider</span>')).toBeLessThan(markup.indexOf('>Local BYOK</span>'));
  });
});
