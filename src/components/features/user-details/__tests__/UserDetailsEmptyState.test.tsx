// @vitest-environment jsdom
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

  describe('user profile client distribution', () => {
    function clientTraffic(requestCount = 176): UserDetailedMetrics['clientTraffic'] {
      return {
        summary: {
          recordCount: 2, reportedRecords: 2, activeUsers: 1,
          clients: [
            { client: 'copilot_cli', requestCount: 0 },
            { client: 'opencode', requestCount },
            { client: 'vscode', requestCount: requestCount > 0 ? 24 : 0 },
          ].map(client => ({
            ...client, promptTokens: 20, outputTokens: 10,
            avgTokensPerRequest: null, activeUsers: 1, reportedSessionCount: 0, models: [],
          })),
        },
        daily: [],
      };
    }

    it.each([false, true])('uses client requests when interactions are missing or zero-only: %s', (hasZeroRows) => {
      const markup = render({
        clientTraffic: clientTraffic(),
        ideAggregates: hasZeroRows ? [{ ide: 'copilot_cli', ...metrics, user_initiated_interaction_count: 0 }] : [],
      });
      expect(markup).toContain('Clients');
      expect(markup).toContain('aria-label="Requests by client"');
      expect(markup).toContain('176<span class="sr-only"> requests</span>');
      expect(markup).toContain('24<span class="sr-only"> requests</span>');
      expect(markup).toContain('88.0%');
      expect(markup).not.toContain('aria-label="Interactions by client"');
      const legend = new DOMParser().parseFromString(markup, 'text/html').querySelector('[aria-label="Requests by client"]');
      const rows = [...legend!.querySelectorAll('li')].map(row => row.textContent);
      expect(rows).toEqual(['OpenCode176 requests88.0%', 'VS Code24 requests12.0%']);
    });

    it.each(['legacy', 'assumed', 'cli'])('prefers positive %s interactions and never adds requests', source => {
      const markup = render({
        clientTraffic: clientTraffic(),
        ideAggregates: source === 'cli' ? [] : [{
          ide: 'vscode', ...metrics,
          user_initiated_interaction_count: source === 'legacy' ? 7 : 0,
          assumed_user_initiated_interaction_count: source === 'assumed' ? 7 : 0,
        }],
        days: source === 'cli' ? [makeUserDay({
          totals_by_cli: {
            prompt_count: 7, session_count: 0, request_count: 10,
            token_usage: { prompt_tokens_sum: 20, output_tokens_sum: 10, avg_tokens_per_request: 3 },
          },
        })] : [],
      });
      expect(markup).toContain('Clients');
      expect(markup).toContain('aria-label="Interactions by client"');
      expect(markup).toContain('7<span class="sr-only"> interactions</span>');
      expect(markup).not.toContain('aria-label="Requests by client"');
      const legend = new DOMParser().parseFromString(markup, 'text/html').querySelector('[aria-label="Interactions by client"]');
      expect(legend?.textContent).not.toContain('OpenCode');
    });

    it('keeps the existing empty state when neither source has positive values', () => {
      const markup = render({ clientTraffic: clientTraffic(0) });
      expect(markup).toContain('Clients');
      expect(markup).not.toContain('aria-label="Requests by client"');
      expect(markup.match(/No data available/g)).toHaveLength(3);
    });
  });

  describe('user profile model distribution', () => {
    function modelTraffic(requestCount = 10): UserDetailedMetrics['clientTraffic'] {
      const counts = { requestCount, promptTokens: 20, outputTokens: 10, avgTokensPerRequest: 3, activeUsers: 1 };
      return {
        summary: {
          recordCount: 2, reportedRecords: 2, activeUsers: 1,
          clients: ['opencode', 'copilot_cli'].map(client => ({
            ...counts, client, reportedSessionCount: 0,
            models: [
              { ...counts, model: 'gpt-4o', modelSelectionMode: 'user_selected' },
              { ...counts, model: 'gpt-4o', modelSelectionMode: 'auto' },
              { ...counts, requestCount: 0, model: 'claude-3.7-sonnet', modelSelectionMode: 'user_selected' },
              { ...counts, requestCount: requestCount > 0 ? 2 : 0, model: 'unknown', modelSelectionMode: 'user_selected' },
            ],
          })),
        },
        daily: [],
      };
    }

    it.each([false, true])('falls back to requests across clients and selection modes with zero interaction rows: %s', (hasZeroRows) => {
      const markup = render({
        clientTraffic: modelTraffic(),
        modelFeatureAggregates: hasZeroRows
          ? [{ model: 'claude-3.7-sonnet', feature: 'chat_panel_agent_mode', ...metrics, user_initiated_interaction_count: 0 }]
          : [],
      });
      expect(markup).toContain('Models');
      expect(markup).toContain('aria-label="Requests by model"');
      expect(markup).toContain('40<span class="sr-only"> requests</span>');
      expect(markup).toContain('4<span class="sr-only"> requests</span>');
      expect(markup).toContain('<span class="wrap-break-word">GPT-4o</span>');
      expect(markup).toContain('<span class="wrap-break-word">Unknown Model</span>');
      expect(markup).not.toContain('<span class="wrap-break-word">Claude 3.7 Sonnet</span>');
      expect(markup.indexOf('<span class="wrap-break-word">GPT-4o</span>'))
        .toBeLessThan(markup.indexOf('<span class="wrap-break-word">Unknown Model</span>'));
    });

    it.each([false, true])('prefers positive model interactions over requests with assumed interactions: %s', (assumed) => {
      const markup = render({
        clientTraffic: modelTraffic(),
        modelFeatureAggregates: [{
          model: 'claude-3.7-sonnet', feature: 'chat_panel_agent_mode', ...metrics,
          user_initiated_interaction_count: assumed ? 0 : 7,
          assumed_user_initiated_interaction_count: assumed ? 7 : 0,
        }],
      });
      expect(markup).toContain('Models');
      expect(markup).toContain('aria-label="Interactions by model"');
      expect(markup).toContain('7<span class="sr-only"> interactions</span>');
      expect(markup).not.toContain('aria-label="Requests by model"');
      expect(markup).not.toContain('<span class="wrap-break-word">GPT-4o</span>');
    });

    it.each(['constructor', '__proto__', 'toString'])('preserves requests for model identifier %s', model => {
      const traffic = modelTraffic();
      for (const client of traffic.summary.clients) {
        client.models = client.models.slice(0, 2).map(row => ({ ...row, model }));
      }

      const markup = render({ clientTraffic: traffic });

      expect(markup).toContain('aria-label="Requests by model"');
      expect(markup).toContain('40<span class="sr-only"> requests</span>');
      expect(markup).toContain('<span class="text-right tabular-nums text-muted">100.0%</span>');
    });

    it('keeps the existing model empty state when neither source has positive values', () => {
      const markup = render({ clientTraffic: modelTraffic(0) });
      expect(markup).toContain('Models');
      expect(markup).not.toContain('aria-label="Requests by model"');
      expect(markup.match(/No data available/g)).toHaveLength(3);
    });

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
