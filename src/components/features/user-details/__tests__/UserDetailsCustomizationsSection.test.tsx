import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserDetailsViewModel } from '../../../../read-models/userDetails';
import type { CliCustomizationSummary } from '../../../../types/cliCustomizations';
import { NavigationProvider } from '../../../../state/NavigationContext';
import UserDetailsCustomizationsSection from '../sections/UserDetailsCustomizationsSection';
import UserDetailsView from '../UserDetailsView';
import {
  makeAgentActivity,
  makeCustomizationDaySummary,
  makeCustomizationItem,
  makeCustomizationSummary,
  makeUserDay,
  makeUserDetails,
  makeUserDetailsViewModel,
} from './helpers/userDetailsFixtures';

let renderer: ReactTestRenderer | undefined;

afterEach(async () => {
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

    it('renders one table row per category with a reported distinct count', () => {
      const markup = renderToStaticMarkup(renderPeriod([
        makeCustomizationSummary('skill', 7),
        makeCustomizationSummary('custom_agent', 7),
        makeCustomizationSummary('mcp', 14),
        makeCustomizationSummary('slash_cmd', 3),
      ]));

      expect(markup).toContain('>Customizations</h2>');
      expect(markup).toContain('Sum of reported daily distinct counts, not unique items across the period.');
      expect(markup.match(/<table/g)).toHaveLength(1);
      for (const label of ['Skills', 'Custom agents', 'MCP servers', 'Slash commands']) {
        expect(markup).toContain(label);
      }
      expect(markup.match(/>7<\/td>/g)).toHaveLength(2);
      expect(markup).toContain('>14</td>');
      expect(markup).toContain('>3</td>');
      expect(markup).not.toContain('<h3');
    });

    it('renders reported zero counts and omits categories with missing counts', () => {
      const markup = renderToStaticMarkup(renderPeriod([
        makeCustomizationSummary('skill', 0),
        makeCustomizationSummary('custom_agent', 0),
        makeCustomizationSummary('mcp', null),
        makeCustomizationSummary('slash_cmd', null),
      ]));

      expect(markup.match(/>0<\/td>/g)).toHaveLength(2);
      expect(markup).not.toContain('MCP servers');
      expect(markup).not.toContain('Slash commands');
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
      expect(root.findAllByType('td')[1].children.join('')).toBe('2');
      await act(async () => { root.findByType('button').props.onClick(); });
      const region = root.findByProps({ role: 'region' });
      expect(cellText(region.findByType('tbody').findByType('tr')).slice(1)).toEqual(['-', '-', '-']);
      expect(region.findByType('p').children.join('')).toContain('Missing interaction counts');
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
      expect(skills.props.id).toBe(buttons[0].props['aria-controls']);
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

    it('progressively discloses item rows and preserves reported zero values', async () => {
      const items = ['a', 'b', 'c', 'd', 'e'].map(name => makeCustomizationItem(name, 1));
      const root = (await mount(renderPeriod([
        makeCustomizationSummary('skill', 5, [...items, makeCustomizationItem('zero', 0)]),
      ]))).root;

      await act(async () => { root.findByType('button').props.onClick(); });
      const region = root.findByProps({ role: 'region' });
      const rows = () => region.findByType('tbody').findAllByType('tr');
      expect(rows()).toHaveLength(5);

      await act(async () => { region.findByType('button').props.onClick(); });
      expect(rows()).toHaveLength(6);
      expect(cellText(rows()[5]).slice(1)).toEqual(['0', '0', '-']);

      await act(async () => { region.findByType('button').props.onClick(); });
      expect(rows()).toHaveLength(5);
    });

    it('uses day-local copy in the daily view', async () => {
      const root = (await mount(
        <UserDetailsCustomizationsSection
          sectionId="daily-customizations"
          mode="day"
          summaries={[makeCustomizationDaySummary('custom_agent', 6, [makeCustomizationItem('a', 2)])]}
        />,
      )).root;

      expect(root.findAllByType('p')[0].children.join('')).toBe('Distinct items used on this day.');
      expect(root.findAllByType('td')[1].children.join('')).toBe('6');

      await act(async () => { root.findByType('button').props.onClick(); });
      expect(root.findByProps({ role: 'region' }).findByType('p').children.join(''))
        .toContain('Reported top items for this day.');
    });
  });

  describe('on the user profile', () => {
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
        const root = (await mount(profile(1))).root;
        expect(duplicateKeyErrors()).toEqual([]);
        const customizationsButton = () => root.findByType(UserDetailsCustomizationsSection).findByType('button');
        await act(async () => {
          customizationsButton().props.onClick();
          root.findByType('select').props.onChange({ target: { value: 'userInputs' } });
        });
        expect(customizationsButton().props['aria-expanded']).toBe(true);
        expect(root.findByType('select').props.value).toBe('userInputs');

        await act(async () => { renderer!.update(profile(2)); });
        expect(customizationsButton().props['aria-expanded']).toBe(false);
        expect(root.findByType('select').props.value).toBe('sessions');
        expect(duplicateKeyErrors()).toEqual([]);
      } finally {
        errors.mockRestore();
      }
    });

    it('renders customizations without unrelated activity sections', () => {
      const markup = renderToStaticMarkup(renderProfile(makeUserDetailsViewModel({
        userDetails: makeUserDetails({
          cliCustomizations: [makeCustomizationSummary('skill', 2, [makeCustomizationItem('other', 7)])],
        }),
      })));

      expect(markup).toContain('id="user-details-cli-customizations"');
      expect(markup).toContain('>2</td>');
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
      expect(markup).toContain('Prompts &amp; messages');
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
