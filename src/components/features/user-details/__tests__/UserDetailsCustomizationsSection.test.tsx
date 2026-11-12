// @vitest-environment jsdom
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { chooseOption, expectSelected } from '../../../../__tests__/helpers/simpleSelect';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CompositionChartProps } from '../../../charts/CompositionChart';
import type { UserDetailsViewModel } from '../../../../read-models/userDetails';
import type { CliCustomizationSummary } from '../../../../types/cliCustomizations';
import { NavigationProvider } from '../../../../state/NavigationContext';
import TablePagination from '../../../ui/TablePagination';
import UserDetailsCustomizationsSection from '../sections/UserDetailsCustomizationsSection';
import UserDetailsView from '../UserDetailsView';
import ActivityCalendar from '../day-details/ActivityCalendar';
import DayDetailsModal from '../day-details/DayDetailsModal';
import {
  makeAgentActivity,
  makeCustomizationDaySummary,
  makeCustomizationItem,
  makeCustomizationSummary,
  makeUserDay,
  makeUserDetails,
  makeUserDetailsViewModel,
} from './helpers/userDetailsFixtures';

const { compositionChart } = vi.hoisted(() => ({
  compositionChart: vi.fn<(props: CompositionChartProps) => void>(),
}));

vi.mock('../../../charts/CompositionChart', () => ({
  default: (props: CompositionChartProps) => {
    compositionChart(props);
    return <div>{props.label}</div>;
  },
}));
vi.mock('../day-details/DayDetailsModal', () => ({ default: () => null }));
vi.mock('react-chartjs-2', () => {
  const Stub = () => null;
  return { Bar: Stub, Line: Stub, Radar: Stub, Chart: Stub, Doughnut: Stub, Pie: Stub };
});

let renderer: ReactTestRenderer | undefined;

afterEach(async () => {
  cleanup();
  await act(async () => { renderer?.unmount(); });
  renderer = undefined;
});

async function mount(element: ReactElement) {
  await act(async () => { renderer = create(element); });
  return renderer!;
}

function renderPeriod(summaries: CliCustomizationSummary[]) {
  return <UserDetailsCustomizationsSection sectionId="customizations" summaries={summaries} />;
}

function cellText(row: ReactTestInstance): string[] {
  return row.findAllByType('td').map(cell => cell.children.join(''));
}

function renderProfile(model: UserDetailsViewModel) {
  return (
    <NavigationProvider>
      <UserDetailsView model={model} />
    </NavigationProvider>
  );
}

describe('UserDetailsCustomizationsSection', () => {
  it('surfaces reported client sessions in the profile independently of legacy client activity', () => {
    const model = makeUserDetailsViewModel();
    model.userDetails.clientTraffic.summary = {
      recordCount: 2, reportedRecords: 1, activeUsers: 1,
      clients: [{
        client: 'opencode', reportedSessionCount: 0, requestCount: 20,
        activeUsers: 1, promptTokens: 20, outputTokens: 10, avgTokensPerRequest: 1.5, models: [],
      }],
    };
    const markup = renderToStaticMarkup(renderProfile(model));
    expect(markup).toContain('id="user-details-client-activity"');
    expect(markup).not.toContain('id="user-details-client-sessions"');
    expect(markup).toContain('aria-label="Client activity measure: Model requests"');
    expect(markup).toContain('OpenCode');
    expect(markup).not.toContain('data-testid="user-details-empty-state"');
    model.userDetails.clientTraffic.summary.reportedRecords = 0;
    expect(renderToStaticMarkup(renderProfile(model))).not.toContain('id="user-details-client-activity"');
  });

  describe('visibility', () => {
    it.each([
      { case: 'no summaries', summaries: [] },
      {
        case: 'only unreported distinct counts',
        summaries: [
          makeCustomizationSummary('skill', null, [makeCustomizationItem('other', 20)]),
          makeCustomizationSummary('mcp', null),
        ],
      },
    ])('hides the section with $case', ({ summaries }) => {
      expect(renderToStaticMarkup(renderPeriod(summaries))).toBe('');
    });

    it('renders collapsed category disclosures with labeled interaction counts', () => {
      const markup = renderToStaticMarkup(renderPeriod([
        { ...makeCustomizationSummary('skill', 7, [makeCustomizationItem('review', 1)]), observedInteractions: 11 },
        { ...makeCustomizationSummary('custom_agent', 7, [makeCustomizationItem('reviewer', 1)]), observedInteractions: 7 },
        { ...makeCustomizationSummary('mcp', 14, [makeCustomizationItem('server', 1)]), observedInteractions: 6 },
        { ...makeCustomizationSummary('slash_cmd', 3, [makeCustomizationItem('custom', 1)]), observedInteractions: 3 },
      ]));

      expect(markup).toContain('>Customizations</h2>');
      expect(markup).toContain('Reported invocations, agent starts, and MCP connection attempts by item.');
      expect(markup).toContain('>Reported items</h3>');
      expect(markup.match(/aria-expanded="false"/g) ?? []).toHaveLength(4);
      expect(markup).not.toContain('<table');
      expect(markup).not.toContain('>1 item</span>');
      for (const label of ['Skills', 'Custom agents', 'MCP servers', 'Slash commands']) {
        expect(markup).toContain(label);
      }
      expect(markup).toContain('>11 reported invocations</span>');
      expect(markup).toContain('>7 reported starts</span>');
      expect(markup).toContain('>6 reported connection attempts</span>');
      expect(markup).toContain('>3 reported invocations</span>');
      for (const icon of ['octicon-book', 'octicon-copilot', 'octicon-mcp', 'octicon-command-palette']) {
        expect(markup).toContain(icon);
      }
    });

    it('renders invocation doughnuts for all four customization categories', () => {
      const summaries = [
        ['skill', 4],
        ['custom_agent', 3],
        ['mcp', 2],
        ['slash_cmd', 1],
      ] as const;
      const data = summaries.map(([category, count]) => ({
        ...makeCustomizationSummary(category, 1, [makeCustomizationItem('reported-item', count)]),
        observedInteractions: count,
      }));
      compositionChart.mockClear();

      const markup = renderToStaticMarkup(renderPeriod(data));

      expect(compositionChart).toHaveBeenCalledTimes(4);
      for (const measure of ['Reported invocations', 'Reported starts', 'Connection attempts']) {
        expect(markup).toContain(measure);
      }
      expect(markup).not.toContain('Totals and shares cover reported per-record top-five items only, not all activity.');
      expect(compositionChart.mock.calls.map(([props]) => ({
        label: props.label,
        unit: props.unit,
        entries: props.entries.map(entry => ({ label: entry.label, value: entry.value })),
      }))).toEqual([
        { label: 'Invocations by skill', unit: 'invocations', entries: [{ label: 'reported-item', value: 4 }] },
        { label: 'Starts by custom agent', unit: 'starts', entries: [{ label: 'reported-item', value: 3 }] },
        { label: 'Connection attempts by MCP server', unit: 'connection attempts', entries: [{ label: 'reported-item', value: 2 }] },
        { label: 'Invocations by slash command', unit: 'invocations', entries: [{ label: 'reported-item', value: 1 }] },
      ]);
      for (const title of ['Skills', 'Custom agents', 'MCP servers', 'Slash commands']) {
        expect(markup).toContain(title);
      }
    });

    it('shows invocation charts when distinct-item counts are unavailable', () => {
      const summary = {
        ...makeCustomizationSummary('skill', null, [makeCustomizationItem('review', 5)]),
        observedInteractions: 5,
      };
      compositionChart.mockClear();

      const markup = renderToStaticMarkup(renderPeriod([summary]));

      expect(markup).toContain('id="customizations"');
      expect(markup).toContain('Reported invocations, agent starts, and MCP connection attempts by item.');
      expect(markup).not.toContain('<table');
      expect(markup).not.toContain('Totals and shares cover reported per-record top-five items only, not all activity.');
      expect(compositionChart).toHaveBeenCalledTimes(1);
      expect(compositionChart.mock.calls[0][0]).toMatchObject({
        label: 'Invocations by skill',
        unit: 'invocations',
        entries: [{ label: 'review', value: 5 }],
      });
    });

    it('distinguishes known-zero totals from unavailable interaction counts', () => {
      const knownZero = {
        ...makeCustomizationSummary('skill', 1, [makeCustomizationItem('unused', 0)]),
        observedInteractions: 0,
      };
      const unknown = makeCustomizationSummary('mcp', 1, [
        makeCustomizationItem('server', 4, { interactionCount: null }),
      ]);
      compositionChart.mockClear();

      const markup = renderToStaticMarkup(renderPeriod([knownZero, unknown]));

      expect(markup).toContain('No invocations reported');
      expect(markup).toContain('Reported counts unavailable');
      expect(compositionChart).not.toHaveBeenCalled();
    });

    it('renders reported zero counts and omits categories with missing counts', () => {
      const markup = renderToStaticMarkup(renderPeriod([
        { ...makeCustomizationSummary('skill', 0), observedInteractions: 0 },
        { ...makeCustomizationSummary('custom_agent', 0), observedInteractions: 0 },
        makeCustomizationSummary('mcp', null),
        makeCustomizationSummary('slash_cmd', null),
      ]));
      const reportedItemsMarkup = markup.slice(markup.indexOf('>Reported items</h3>'));

      expect(reportedItemsMarkup).toContain('>0 reported invocations</span>');
      expect(reportedItemsMarkup).toContain('>0 reported starts</span>');
      expect(reportedItemsMarkup).not.toContain('MCP servers');
      expect(reportedItemsMarkup).not.toContain('Slash commands');
      expect(markup).not.toContain('Not reported');
      expect(markup).not.toContain('aria-expanded');
    });
  });

  describe('expansion', () => {
    it.each(['period', 'day'] as const)('shows unavailable item values as dashes in %s mode', async mode => {
      const items = [makeCustomizationItem('other', 0, {
        interactionCount: null,
        daysInvoked: null,
        averagePerDay: null,
      })];
      const root = (await mount(mode === 'period'
        ? renderPeriod([makeCustomizationSummary('skill', 2, items)])
        : <UserDetailsCustomizationsSection sectionId="daily-customizations" mode="day"
            summaries={[makeCustomizationDaySummary('skill', 2, items)]} />,
      )).root;
      expect(root.findByType('button').findAllByType('span').some(span => span.children.join('') === 'Counts unavailable')).toBe(true);
      await act(async () => { root.findByType('button').props.onClick(); });
      const region = root.findByProps({ role: 'region' });
      expect(cellText(region.findByType('tbody').findByType('tr')).slice(1)).toEqual(['-', '-', '-']);
      expect(region.findAllByType(TablePagination)).toHaveLength(0);
      expect(region.findAllByType('p')).toHaveLength(0);
    });

    it('expands category rows independently and labels each item region', async () => {
      const root = (await mount(renderPeriod([
        makeCustomizationSummary('skill', 2, [
          makeCustomizationItem('other', 11, { daysInvoked: 2, averagePerDay: 5.5 }),
        ]),
        makeCustomizationSummary('custom_agent', 1, [makeCustomizationItem('reviewer', 2)]),
        makeCustomizationSummary('mcp', 1, [makeCustomizationItem('server', 4)]),
        makeCustomizationSummary('slash_cmd', 1, [makeCustomizationItem('custom', 1)]),
      ]))).root;
      const buttons = root.findAllByType('button');
      expect(buttons).toHaveLength(4);
      expect(buttons.every(button => button.props['aria-expanded'] === false)).toBe(true);

      await act(async () => { buttons[0].props.onClick(); });
      const skills = root.findByProps({ role: 'region' });
      expect(root.findByProps({ id: buttons[0].props['aria-controls'] }).findByProps({ role: 'region' })).toBe(skills);
      expect(skills.props['aria-label']).toBe('Skills reported items');
      expect(cellText(skills.findByType('tbody').findAllByType('tr')[0]).slice(1)).toEqual(['11', '2', '5.5']);
      expect(skills.findAllByType('td')[0].findByType('span').children.join('')).toBe(' (custom)');

      for (const button of buttons.slice(1)) {
        await act(async () => { button.props.onClick(); });
      }
      expect(root.findAllByProps({ role: 'region' })).toHaveLength(4);
      const mcp = root.findByProps({ 'aria-label': 'MCP servers reported items' });
      expect(mcp.findAllByType('th').map(cell => cell.children.join(''))).toEqual([
        'Name', 'Connection attempts', 'Days with attempts', 'Avg. / day',
      ]);

      await act(async () => { buttons[0].props.onClick(); });
      expect(root.findAllByProps({ role: 'region' })).toHaveLength(3);
      expect(buttons[0].props['aria-expanded']).toBe(false);
    });

    it('paginates nested item rows and preserves reported zero values and category disclosure', async () => {
      const items = ['a', 'b', 'c', 'd', 'e'].map(name => makeCustomizationItem(name, 1));
      const root = (await mount(renderPeriod([
        makeCustomizationSummary('skill', 5, [...items, makeCustomizationItem('zero', 0)]),
      ]))).root;

      await act(async () => { root.findByType('button').props.onClick(); });
      const region = root.findByProps({ role: 'region' });
      const rows = () => region.findByType('tbody').findAllByType('tr');
      expect(rows()).toHaveLength(5);

      await act(async () => { region.findByType(TablePagination).props.onPageChange(2); });
      expect(rows()).toHaveLength(1);
      expect(cellText(rows()[0]).slice(1)).toEqual(['0', '0', '-']);

      await act(async () => { region.findByType(TablePagination).props.onPageChange(1); });
      expect(rows()).toHaveLength(5);
      expect(region.findAllByType('button')).toHaveLength(0);
      await act(async () => { root.findByType('button').props.onClick(); });
      expect(root.findAllByProps({ role: 'region' })).toHaveLength(0);
    });

    it('uses day-local copy in the daily view', async () => {
      const root = (await mount(
        <UserDetailsCustomizationsSection
          sectionId="daily-customizations"
          mode="day"
          summaries={[{
            ...makeCustomizationDaySummary('custom_agent', 6, [makeCustomizationItem('a', 2)]),
            observedInteractions: 2,
          }]}
        />,
      )).root;

      expect(root.findAllByType('p')[0].children.join(''))
        .toBe('Reported invocations, agent starts, and MCP connection attempts by item.');
      expect(root.findByType('button').findAllByType('span').some(span => span.children.join('') === '2 reported starts')).toBe(true);

      await act(async () => { root.findByType('button').props.onClick(); });
      expect(root.findByProps({ role: 'region' }).findByType('table')).toBeDefined();
    });
  });

  describe('on the user profile', () => {
    it('projects day-local reporting on navigation and closes/reset calendar state when users change', async () => {
      const firstDay = makeUserDay({ client_telemetry_present: false, usage_metrics_requirements: { met: [], unmet: ['vscode'], unknown: [] } });
      const secondDay = makeUserDay({ day: '2024-01-16', client_telemetry_present: true, usage_metrics_requirements: { met: [], unmet: [], unknown: ['raw-component'] } });
      const profile = (userId: number) => renderProfile(makeUserDetailsViewModel({
        userId, userLogin: `user-${userId}`,
        userDetails: makeUserDetails({ days: userId === 1 ? [firstDay, secondDay] : [makeUserDay()] }),
      }));
      const root = (await mount(profile(1))).root;
      const modal = () => root.findByType(DayDetailsModal);
      await act(async () => { root.findByType(ActivityCalendar).props.onDayClick(firstDay.day, firstDay); });
      expect(modal().props.isOpen).toBe(true);
      expect(modal().props.reportingQuality).toMatchObject({ day: firstDay.day, telemetryStatus: 'missing', requirementCounts: { unmet: 1, unknown: 0 } });
      await act(async () => { modal().props.onNavigateDay(1); });
      expect(modal().props.dayMetrics).toBe(secondDay);
      expect(modal().props.reportingQuality).toMatchObject({ day: secondDay.day, telemetryStatus: 'received', requirementCounts: { unmet: 0, unknown: 1 } });
      await act(async () => { modal().props.onNavigateDay(1); });
      expect(modal().props.reportingQuality).toMatchObject({ telemetryStatus: 'unreported', requirements: null });
      await act(async () => { renderer!.update(profile(2)); });
      expect(modal().props.isOpen).toBe(false);
      expect(modal().props.dayMetrics).toBeUndefined();
      expect(root.findByType(ActivityCalendar).props.reportingQuality.serverOnlyDays).toBe(0);
    });

    it('keeps section keys unique and resets section state when switching users', async () => {
      const profile = (userId: number) => renderProfile(makeUserDetailsViewModel({
        userId,
        userLogin: `user-${userId}`,
        userDetails: makeUserDetails({
          cliCustomizations: [makeCustomizationSummary('skill', 1, [makeCustomizationItem('review', 2)])],
          agentActivity: makeAgentActivity({ vscodeAgents: { sessions: 1, userInputs: 2, requests: null } }),
        }),
      }));
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      const duplicateKeyErrors = () => errors.mock.calls.filter(args => args.join(' ').includes('same key'));
      try {
        const view = render(profile(1));
        const container = view.container;
        const customizationsButton = () => within(screen.getByRole('heading', { name: 'Customizations' }).closest('section')!)
          .getAllByRole('button')[0];
        const sections = () => ({
          agent: container.querySelector<HTMLElement>('#user-details-agent-activity')!,
          summary: container.querySelector<HTMLElement>('[aria-label="User usage summary"]')!,
        });
        expect(duplicateKeyErrors()).toEqual([]);
        fireEvent.click(customizationsButton());
        expect(customizationsButton().getAttribute('aria-expanded')).toBe('true');
        chooseOption('Agent activity measure', 'Prompts & messages', sections().agent);
        chooseOption('Client summary measure', 'Model requests', sections().summary);
        chooseOption('Model summary measure', 'Model requests', sections().summary);
        expectSelected('Agent activity measure', 'Prompts & messages', sections().agent);
        expectSelected('Client summary measure', 'Model requests', sections().summary);
        expectSelected('Model summary measure', 'Model requests', sections().summary);

        view.rerender(profile(2));
        expect(customizationsButton().getAttribute('aria-expanded')).toBe('false');
        expectSelected('Agent activity measure', 'Sessions', sections().agent);
        expectSelected('Client summary measure', 'Interactions', sections().summary);
        expectSelected('Model summary measure', 'Interactions', sections().summary);
        expect(duplicateKeyErrors()).toEqual([]);
      } finally {
        errors.mockRestore();
      }
    });

    it('renders customizations without unrelated activity sections', () => {
      const markup = renderToStaticMarkup(renderProfile(makeUserDetailsViewModel({
        userDetails: makeUserDetails({
          cliCustomizations: [{
            ...makeCustomizationSummary('skill', 2, [makeCustomizationItem('other', 7)]),
            observedInteractions: 7,
          }],
        }),
      })));

      expect(markup).toContain('id="user-details-cli-customizations"');
      expect(markup).toContain('>7 reported invocations</span>');
      for (const id of [
        'user-details-client-activity',
        'user-details-feature-activity',
        'user-details-language-activity',
        'user-details-model-activity',
        'user-details-vscode-agents',
        'user-details-agent-activity',
      ]) {
        expect(markup).not.toContain(`id="${id}"`);
      }
    });

    it.each([
      { case: 'VS Code Agents sessions and messages', vscodeAgents: { sessions: 2, userInputs: 7, requests: null } },
      { case: 'VS Code Agents reported-zero messages', vscodeAgents: { sessions: null, userInputs: 0, requests: null } },
    ])('shows agent activity for $case', ({ vscodeAgents }) => {
      const markup = renderToStaticMarkup(renderProfile(makeUserDetailsViewModel({
        userDetails: makeUserDetails({ agentActivity: makeAgentActivity({ vscodeAgents }) }),
      })));

      expect(markup).toContain('id="user-details-agent-activity"');
      expect(markup).toContain('Daily agent sessions');
      expect(markup).toContain('aria-label="Agent activity measure: Sessions"');
      expect(markup).not.toContain('id="user-details-vscode-agents"');
      expect(markup).not.toContain('Token Usage');
      expect(markup).not.toContain('Daily CLI Sessions');
    });

    it('keeps reported-zero CLI rows without missing-metric panels', () => {
      const markup = renderToStaticMarkup(renderProfile(makeUserDetailsViewModel({
        userDetails: makeUserDetails({
          agentActivity: makeAgentActivity({ cli: { sessions: 0, userInputs: 0, requests: 0 } }),
          days: [makeUserDay({
            totals_by_cli: {
              session_count: 0, request_count: 0, prompt_count: 0,
              token_usage: { prompt_tokens_sum: 0, output_tokens_sum: 0, avg_tokens_per_request: 0 },
            },
          })],
        }),
      })));

      expect(markup).toContain('id="user-details-client-activity"');
      expect(markup).toContain('id="user-details-agent-activity"');
      expect(markup).toContain('<span>Copilot CLI</span>');
      expect(markup).not.toMatch(/active users/i);
      expect(markup).not.toContain('Not reported');
      expect(markup).not.toContain('No client activity data available');
      expect(markup).not.toContain('Daily Client Interactions');
    });
  });
});
