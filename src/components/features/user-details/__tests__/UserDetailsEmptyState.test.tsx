import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { NavigationProvider } from '../../../../state/NavigationContext';
import { makeUserSummary } from '../../../../__tests__/factories/aggregatedMetrics';
import type { UserDetailedMetrics } from '../../../../types/aggregatedMetrics';
import type { UserSummary } from '../../../../types/metrics';
import UserDetailsView from '../UserDetailsView';
import { makeUserDay, makeUserDetails, makeUserDetailsViewModel } from './helpers/userDetailsFixtures';

vi.mock('react-chartjs-2', () => ({
  Chart: () => null,
  Bar: () => null,
  Line: () => null,
  Pie: () => null,
  Doughnut: () => null,
  Radar: () => null,
}));

const EMPTY_STATE_TEST_ID = 'user-details-empty-state';

const metrics = {
  user_initiated_interaction_count: 1,
  assumed_user_initiated_interaction_count: 0,
  code_generation_activity_count: 1,
  code_acceptance_activity_count: 1,
  loc_added_sum: 1,
  loc_deleted_sum: 0,
  loc_suggested_to_add_sum: 1,
  loc_suggested_to_delete_sum: 0,
};

function render(details: Partial<UserDetailedMetrics> = {}, summary: Partial<UserSummary> = {}) {
  const model = makeUserDetailsViewModel({
    userDetails: makeUserDetails(details),
    userSummary: makeUserSummary(summary),
  });
  return renderToStaticMarkup(
    <NavigationProvider><UserDetailsView model={model} /></NavigationProvider>,
  );
}

describe('user profile empty state', () => {
  it('shows when all detail aggregates are empty', () => {
    expect(render()).toContain(EMPTY_STATE_TEST_ID);
  });

  describe('user profile model distribution', () => {
    it.each([
      ['gpt-4o', 'GPT-4o'],
      ['claude-3.7-sonnet', 'Claude 3.7 Sonnet'],
      ['some-new-model', 'Some new model'],
      ['unknown', 'Unknown Model'],
    ])('uses %s as %s in the summary donut legend', (model, displayName) => {
      const markup = render({
        modelFeatureAggregates: [{ model, feature: 'chat_panel_agent_mode', ...metrics }],
      });

      expect(markup).toContain('aria-label="Interactions by model"');
      expect(markup).toContain(`<span class="wrap-break-word">${displayName}</span>`);
      expect(markup).not.toContain(`<span class="wrap-break-word">${model}</span>`);
      expect(markup).toContain('<span class="text-right tabular-nums text-muted">100.0%</span>');
    });
  });

  it.each([
    ['ide', { ideAggregates: [{ ide: 'vscode', ...metrics }] }],
    ['feature', { featureAggregates: [{ feature: 'chat_panel_agent_mode', ...metrics }] }],
    ['language', { languageFeatureAggregates: [{ language: 'typescript', feature: 'code_completion', ...metrics }] }],
    ['model', { modelFeatureAggregates: [{ model: 'gpt-5', feature: 'chat_panel_agent_mode', ...metrics }] }],
  ] as Array<[string, Partial<UserDetailedMetrics>]>)('hides when only %s aggregates are populated', (_name, details) => {
    expect(render(details)).not.toContain(EMPTY_STATE_TEST_ID);
  });

  it('hides for CLI-only data, including reported-zero totals', () => {
    const cliDay = makeUserDay({
      totals_by_cli: {
        session_count: 0,
        request_count: 0,
        prompt_count: 0,
        token_usage: { output_tokens_sum: 0, prompt_tokens_sum: 0, avg_tokens_per_request: 0 },
      },
    });
    expect(render({ days: [cliDay] })).not.toContain(EMPTY_STATE_TEST_ID);
    expect(render({ featureAggregates: [{ feature: 'copilot_cli', ...metrics }] })).not.toContain(EMPTY_STATE_TEST_ID);
  });

  it('still shows when only Cloud Agents usage is present', () => {
    expect(render({}, { used_copilot_coding_agent: true })).toContain(EMPTY_STATE_TEST_ID);
  });
});
