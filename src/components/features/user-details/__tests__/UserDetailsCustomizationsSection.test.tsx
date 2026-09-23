import { renderToStaticMarkup } from 'react-dom/server';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import {
  accumulateCliCustomizations,
  computeCliCustomizations,
  computeDailyCliCustomizations,
  createCliCustomizationAccumulator,
} from '../../../../domain/calculators/cliCustomizationCalculator';
import type { CliCustomizationFields } from '../../../../types/cliCustomizations';
import UserDetailsCustomizationsSection from '../sections/UserDetailsCustomizationsSection';
import UserDetailsView from '../UserDetailsView';
import { NavigationProvider } from '../../../../state/NavigationContext';
import { makeMetric } from '../../../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../../../domain/metricsAggregator';
import { computeSingleUserDetailedMetrics } from '../../../../domain/calculators/userDetailCalculator';

function buildSection(...records: CliCustomizationFields[]) {
  const accumulator = createCliCustomizationAccumulator();
  records.forEach((record, index) => accumulateCliCustomizations(accumulator, {
    ...record,
    day: `2024-01-${String(index + 1).padStart(2, '0')}`,
  }));
  return <UserDetailsCustomizationsSection sectionId="customizations" summaries={computeCliCustomizations(accumulator)} />;
}

describe('user customizations', () => {
  it('keeps profile section keys unique and resets their state when switching users', async () => {
    const records = [1, 2].map(user_id => makeMetric({
      user_id,
      user_login: `user-${user_id}`,
      distinct_skill_use_count: 1,
      totals_by_skill: [{ skill: 'review', interaction_count: 2 }],
      totals_by_vscode_agent: { session_count: 1, total_user_messages: 2 },
    }));
    const { aggregated, userDetailAccumulator } = aggregateMetrics(records);
    const profile = (userId: number) => (
      <NavigationProvider>
        <UserDetailsView model={{
          userDetails: computeSingleUserDetailedMetrics(userDetailAccumulator, userId)!,
          userSummary: aggregated.users.userSummaries.find(user => user.user_id === userId)!,
          interactionRank: { rank: 1, totalUsers: 2 },
          userLogin: `user-${userId}`,
          userId,
        }} />
      </NavigationProvider>
    );
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    let renderer: ReactTestRenderer | undefined;
    try {
      await act(async () => { renderer = create(profile(1)); });
      expect(errors.mock.calls.filter(args => args.join(' ').includes('same key'))).toEqual([]);
      const customizations = renderer!.root.findByType(UserDetailsCustomizationsSection);
      await act(async () => {
        customizations.findByType('button').props.onClick();
        renderer!.root.findByType('select').props.onChange({ target: { value: 'userInputs' } });
      });
      expect(customizations.findByType('button').props['aria-expanded']).toBe(true);
      expect(renderer!.root.findByType('select').props.value).toBe('userInputs');

      await act(async () => { renderer!.update(profile(2)); });
      expect(renderer!.root.findByType(UserDetailsCustomizationsSection).findByType('button').props['aria-expanded']).toBe(false);
      expect(renderer!.root.findByType('select').props.value).toBe('sessions');
      expect(errors.mock.calls.filter(args => args.join(' ').includes('same key'))).toEqual([]);
    } finally {
      await act(async () => { renderer?.unmount(); });
      errors.mockRestore();
    }
  });

  it('hides the section when all customization data is missing', () => {
    expect(renderToStaticMarkup(buildSection({}))).toBe('');
    expect(renderToStaticMarkup(buildSection({ totals_by_skill: null, distinct_skill_use_count: null }))).toBe('');
    expect(renderToStaticMarkup(buildSection())).toBe('');
    expect(renderToStaticMarkup(buildSection({
      totals_by_skill: [{ skill: 'other', interaction_count: 20 }],
      totals_by_mcp: [],
    }))).toBe('');
  });

  it('replaces profile cards with a table of summed daily distinct counts', () => {
    const markup = renderToStaticMarkup(buildSection({
      totals_by_skill: [{ skill: 'other', user_initiated_interaction_count: 100 }],
      distinct_skill_use_count: 3,
      distinct_custom_agent_use_count: 2,
      distinct_mcp_use_count: 9,
      distinct_slash_cmd_use_count: 1,
    }, {
      distinct_skill_use_count: 4,
      distinct_custom_agent_use_count: 5,
      distinct_mcp_use_count: 5,
      distinct_slash_cmd_use_count: 2,
    }, {}));
    expect(markup).toContain('>Customizations</h2>');
    expect(markup).toContain('<table');
    for (const label of ['Skills', 'Custom agents', 'MCP servers', 'Slash commands']) {
      expect(markup).toContain(label);
    }
    expect(markup.match(/>7<\/td>/g)).toHaveLength(2);
    expect(markup).toContain('>14</td>');
    expect(markup).toContain('>3</td>');
    expect(markup).toContain('Sum of reported daily distinct counts, not unique items across the period.');
    expect(markup).not.toContain('CLI Customizations');
    expect(markup).not.toContain('<h3');
    expect(markup).not.toContain('>100<');
    expect(markup).not.toContain('other');
    expect(markup).not.toContain('Reported items');
    expect(markup).not.toContain('Partial coverage');
    expect(markup).not.toContain('user_initiated_interaction_count');
    expect(markup).not.toContain('Not reported');
  });

  it('renders reported zero independently from missing lists or distinct counts', () => {
    const markup = renderToStaticMarkup(buildSection({
      totals_by_skill: [],
      distinct_skill_use_count: 0,
      distinct_custom_agent_use_count: 0,
      totals_by_mcp: [],
    }));
    expect(markup.match(/>0<\/td>/g)).toHaveLength(2);
    expect(markup).not.toContain('Reported items');
    expect(markup).not.toContain('<ul');
    expect(markup).not.toContain('Not reported');
    expect(markup).not.toContain('MCP servers');
    expect(markup).not.toContain('Slash commands');
    expect(markup).not.toContain('aria-expanded');
  });

  it('uses the same expandable table with day-local counts in the daily view', async () => {
    let renderer: ReactTestRenderer | undefined;
    try {
      await act(async () => {
        renderer = create(
          <UserDetailsCustomizationsSection
            sectionId="daily-customizations"
            mode="day"
            summaries={computeDailyCliCustomizations({
              day: '2024-01-01',
              distinct_custom_agent_use_count: 6,
              totals_by_custom_agent: ['a', 'b', 'c', 'd', 'e', 'f'].map(custom_agent => ({ custom_agent, interaction_count: 2 })),
            })}
          />,
        );
      });

      expect(renderer!.root.findByType('h2').children.join('')).toBe('Customizations');
      expect(renderer!.root.findAllByType('h3')).toHaveLength(0);
      expect(renderer!.root.findAllByType('table')).toHaveLength(1);
      expect(renderer!.root.findAllByType('td')[1].children.join('')).toBe('6');
      const button = renderer!.root.findByType('button');
      expect(button.props['aria-expanded']).toBe(false);
      await act(async () => { button.props.onClick(); });
      const region = renderer!.root.findByProps({ role: 'region' });
      expect(button.props['aria-controls']).toBe(region.props.id);
      expect(button.props['aria-expanded']).toBe(true);
      expect(region.findByType('tbody').findAllByType('tr')).toHaveLength(5);
      expect(region.findByType('tbody').findAllByType('tr')[0].findAllByType('td').map(cell => cell.children.join(''))).toEqual(['a', '2', '1', '2']);
      expect(region.findByType('p').children.join('')).toContain('Reported top items for this day.');
      await act(async () => { region.findByType('button').props.onClick(); });
      expect(region.findByType('tbody').findAllByType('tr')).toHaveLength(6);
      await act(async () => { button.props.onClick(); });
      expect(renderer!.root.findAllByProps({ role: 'region' })).toHaveLength(0);
      expect(button.props['aria-expanded']).toBe(false);
    } finally {
      await act(async () => { renderer?.unmount(); });
    }
  });

  it('expands category rows independently with item counts, days and averages', async () => {
    let renderer: ReactTestRenderer | undefined;
    try {
      await act(async () => {
        renderer = create(buildSection({
          distinct_skill_use_count: 1,
          totals_by_skill: [{ skill: 'other', user_initiated_interaction_count: 3 }],
          distinct_custom_agent_use_count: 1,
          totals_by_custom_agent: [{ custom_agent: 'reviewer', interaction_count: 2 }],
          distinct_mcp_use_count: 1,
          totals_by_mcp: [{ mcp: 'server', interaction_count: 4 }],
          distinct_slash_cmd_use_count: 1,
          totals_by_slash_cmd: [{ slash_cmd: 'custom', interaction_count: 1 }],
        }, {
          distinct_skill_use_count: 1,
          totals_by_skill: [{ skill: 'other', interaction_count: 8 }],
        }, {
          totals_by_skill: [{ skill: 'other', interaction_count: 0 }],
        }, {}));
      });
      const buttons = renderer!.root.findAllByType('button');
      expect(buttons).toHaveLength(4);
      expect(renderer!.root.findAllByType('table')).toHaveLength(1);
      expect(buttons.every(button => button.props['aria-expanded'] === false)).toBe(true);
      await act(async () => { buttons[0].props.onClick(); });
      const region = renderer!.root.findByProps({ role: 'region' });
      expect(region.props.id).toBe(buttons[0].props['aria-controls']);
      expect(region.props['aria-label']).toBe('Skills reported items');
      expect(region.findAllByType('td').slice(1).map(cell => cell.children.join(''))).toEqual(['11', '2', '5.5']);
      expect(region.findAllByType('td')[0].findByType('span').children.join('')).toBe(' (custom)');
      for (const button of buttons.slice(1)) {
        await act(async () => { button.props.onClick(); });
      }
      expect(renderer!.root.findAllByProps({ role: 'region' })).toHaveLength(4);
      const mcp = renderer!.root.findByProps({ 'aria-label': 'MCP servers reported items' });
      expect(mcp.findAllByType('th').map(cell => cell.children.join(''))).toEqual([
        'Name', 'Connection attempts', 'Days with attempts', 'Avg. / day',
      ]);
      await act(async () => { buttons[0].props.onClick(); });
      expect(renderer!.root.findAllByProps({ role: 'region' })).toHaveLength(3);
      expect(buttons[0].props['aria-expanded']).toBe(false);
    } finally {
      await act(async () => { renderer?.unmount(); });
    }
  });

  it('progressively discloses item rows and preserves reported zero values', async () => {
    let renderer: ReactTestRenderer | undefined;
    try {
      await act(async () => {
        renderer = create(buildSection({
          distinct_skill_use_count: 5,
          totals_by_skill: ['a', 'b', 'c', 'd', 'e'].map(skill => ({ skill, interaction_count: 1 })),
        }, {
          distinct_skill_use_count: 0,
          totals_by_skill: [{ skill: 'zero', interaction_count: 0 }],
        }));
      });
      await act(async () => { renderer!.root.findByType('button').props.onClick(); });
      const region = renderer!.root.findByProps({ role: 'region' });
      expect(region.findByType('tbody').findAllByType('tr')).toHaveLength(5);
      await act(async () => { region.findByType('button').props.onClick(); });
      expect(region.findByType('tbody').findAllByType('tr')).toHaveLength(6);
      const lastRow = region.findByType('tbody').findAllByType('tr')[5];
      expect(lastRow.findAllByType('td').slice(1).map(cell => cell.children.join(''))).toEqual(['0', '0', '-']);
      await act(async () => { region.findByType('button').props.onClick(); });
      expect(region.findByType('tbody').findAllByType('tr')).toHaveLength(5);
    } finally {
      await act(async () => { renderer?.unmount(); });
    }
  });

  it('keeps reported-zero CLI rows and VS Code sessions without missing-metric panels', () => {
    const metric = makeMetric({
      totals_by_cli: {
        session_count: 0, request_count: 0, prompt_count: 0,
        token_usage: { prompt_tokens_sum: 0, output_tokens_sum: 0, avg_tokens_per_request: 0 },
      },
      totals_by_vscode_agent: { session_count: 0 },
      used_vscode_agent: true,
    });
    const { aggregated, userDetailAccumulator } = aggregateMetrics([metric]);
    const userDetails = computeSingleUserDetailedMetrics(userDetailAccumulator, metric.user_id)!;
    const markup = renderToStaticMarkup(
      <NavigationProvider>
        <UserDetailsView model={{
          userDetails,
          userSummary: aggregated.users.userSummaries[0],
          interactionRank: { rank: 1, totalUsers: 1 },
          userLogin: metric.user_login,
          userId: metric.user_id,
        }} />
      </NavigationProvider>,
    );
    expect(markup).toContain('id="user-details-client-activity"');
    expect(markup).toContain('id="user-details-agent-activity"');
    expect(markup).not.toContain('id="user-details-vscode-agents"');
    expect(markup).toContain('Daily agent sessions');
    expect(markup).not.toContain('Daily CLI Sessions');
    expect(markup).toContain('<span>Copilot CLI</span>');
    expect(markup).toContain('Sessions');
    expect(markup).not.toMatch(/active users/i);
    expect(markup).not.toContain('Not reported');
    expect(markup).not.toContain('No client activity data available');
    expect(markup).not.toContain('Daily Client Interactions');
  });

  it('renders the section on the actual profile without CLI session activity', () => {
    const metric = makeMetric({
      used_cli: false,
      totals_by_cli: undefined,
      totals_by_skill: [{ skill: 'other', interaction_count: 7 }],
      distinct_skill_use_count: 2,
      used_vscode_agent: true,
    });
    const { aggregated, userDetailAccumulator } = aggregateMetrics([metric]);
    const userDetails = computeSingleUserDetailedMetrics(userDetailAccumulator, metric.user_id)!;
    const markup = renderToStaticMarkup(
      <NavigationProvider>
        <UserDetailsView model={{
          userDetails,
          userSummary: aggregated.users.userSummaries[0],
          interactionRank: { rank: 1, totalUsers: 1 },
          userLogin: metric.user_login,
          userId: metric.user_id,
        }} />
      </NavigationProvider>,
    );
    expect(markup).toContain('id="user-details-cli-customizations"');
    expect(markup).toContain('>Customizations</h2>');
    expect(markup).toContain('>2</td>');
    expect(markup).not.toContain('CLI Customizations');
    for (const id of ['user-details-client-activity', 'user-details-feature-activity', 'user-details-language-activity', 'user-details-model-activity', 'user-details-vscode-agents', 'user-details-agent-activity']) {
      expect(markup).not.toContain(`id="${id}"`);
    }
  });

  it.each([
    { session_count: 2, total_user_messages: 7 },
    { total_user_messages: 0 },
  ])('shows agent activity for VS Code Agents-only profiles: %j', totals_by_vscode_agent => {
    const metric = makeMetric({ used_vscode_agent: true, totals_by_vscode_agent });
    const { aggregated, userDetailAccumulator } = aggregateMetrics([metric]);
    const markup = renderToStaticMarkup(
      <NavigationProvider>
        <UserDetailsView model={{
          userDetails: computeSingleUserDetailedMetrics(userDetailAccumulator, metric.user_id)!,
          userSummary: aggregated.users.userSummaries[0],
          interactionRank: { rank: 1, totalUsers: 1 },
          userLogin: metric.user_login,
          userId: metric.user_id,
        }} />
      </NavigationProvider>,
    );
    expect(markup).toContain('id="user-details-agent-activity"');
    expect(markup).toContain('Daily agent sessions');
    expect(markup).toContain('Prompts &amp; messages');
    expect(markup).not.toContain('id="user-details-vscode-agents"');
    expect(markup).not.toContain('Token Usage');
    expect(markup).not.toContain('Daily CLI Sessions');
  });
});
