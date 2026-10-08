import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { UserDayData } from '../../../../../types/metrics';
import DayDetailsModal from '../DayDetailsModal';
import {
  makeCustomizationDaySummary,
  makeCustomizationItem,
  makeUserDay,
} from '../../__tests__/helpers/userDetailsFixtures';

vi.mock('../DayImpactCard', () => ({
  default: () => <div>Impact card</div>,
}));

vi.mock('../DayFeatureBreakdown', () => ({
  default: () => <div>Feature breakdown</div>,
}));

vi.mock('../../charts/DayClientDistributionChart', () => ({
  default: () => <div>Client distribution</div>,
}));

type IdeTotal = UserDayData['totals_by_ide'][number];

const ZERO_TOTALS = {
  code_generation_activity_count: 0,
  code_acceptance_activity_count: 0,
  loc_added_sum: 0,
  loc_deleted_sum: 0,
  loc_suggested_to_add_sum: 0,
  loc_suggested_to_delete_sum: 0,
};

function makeIdeTotal(ide: string, overrides: Partial<IdeTotal> = {}): IdeTotal {
  return { ...ZERO_TOTALS, ide, user_initiated_interaction_count: 0, ...overrides };
}

function renderDay(dayMetrics?: UserDayData, extraProps: { userLogin?: string } = {}) {
  return renderToStaticMarkup(
    <DayDetailsModal
      isOpen
      onClose={vi.fn()}
      date={dayMetrics?.day ?? '2024-01-15'}
      dayMetrics={dayMetrics}
      onNavigateDay={vi.fn()}
      canNavigateNextDay
      canNavigatePrevDay
      {...extraProps}
    />,
  );
}

describe('DayDetailsModal', () => {
  describe('selected day', () => {
    it('renders the given day with navigation controls', () => {
      const markup = renderDay(makeUserDay({
        day: '2024-01-16',
        cliCustomizations: [makeCustomizationDaySummary('skill', 2)],
      }));

      expect(markup).toContain('>2</td>');
      expect(markup).toContain('Previous day');
      expect(markup).toContain('Next day');
    });

    it('shows the no-record state when the day has no metrics', () => {
      const markup = renderDay();

      expect(markup).toContain('No activity recorded');
      expect(markup).not.toContain('id="day-details-cli-customizations"');
    });

    it('omits optional sections for payloads without newer fields', () => {
      const markup = renderDay(makeUserDay());

      expect(markup).toContain('Impact card');
      for (const absent of [
        'id="day-details-cli-customizations"',
        'VS Code Agents',
        'Activity by Feature',
        'Activity by Client',
        'Activity by Language',
        'Client distribution',
      ]) {
        expect(markup).not.toContain(absent);
      }
    });
  });

  describe('customizations', () => {
    it('shows collapsed day-local distinct counts per category', () => {
      const markup = renderDay(makeUserDay({
        cliCustomizations: [
          makeCustomizationDaySummary('skill', 65, [makeCustomizationItem('other', 19)]),
          makeCustomizationDaySummary('custom_agent', 1, [makeCustomizationItem('daily-reviewer', 7)]),
          makeCustomizationDaySummary('mcp', 1, [makeCustomizationItem('daily-server', 12)]),
          makeCustomizationDaySummary('slash_cmd', 2, [makeCustomizationItem('custom', 3)]),
        ],
      }));

      expect(markup).toContain('id="day-details-cli-customizations"');
      expect(markup).toContain('Distinct items used on this day.');
      for (const title of ['Skills', 'Custom agents', 'MCP servers', 'Slash commands']) {
        expect(markup).toContain(title);
      }
      for (const count of [65, 1, 2]) {
        expect(markup).toContain(`>${count}</td>`);
      }
      expect(markup.match(/aria-expanded="false"/g)).toHaveLength(4);
      expect(markup).not.toContain('daily-reviewer');
      expect(markup).not.toContain('CLI Customizations');
      expect(markup).not.toContain('Average distinct items');
    });

    it('renders reported zero counts and omits missing categories', () => {
      const markup = renderDay(makeUserDay({
        cliCustomizations: [
          makeCustomizationDaySummary('custom_agent', 0),
          makeCustomizationDaySummary('skill', 2),
          makeCustomizationDaySummary('mcp', null),
          makeCustomizationDaySummary('slash_cmd', null),
        ],
      }));

      expect(markup).toContain('>0</td>');
      expect(markup).toContain('>2</td>');
      expect(markup).not.toContain('MCP servers');
      expect(markup).not.toContain('Slash commands');
      expect(markup).not.toContain('Not reported');
      expect(markup).not.toContain('aria-expanded');
    });
  });

  describe('VS Code Agents', () => {
    it.each([
      { used_vscode_agent: true, totals_by_vscode_agent: { session_count: 2, total_user_messages: 7 }, expected: ['Yes', '>2<', '>7<'] },
      { used_vscode_agent: false, totals_by_vscode_agent: { session_count: 0, total_user_messages: 0 }, expected: ['No', '>0<'] },
    ])('shows reported day metrics: %j', ({ expected, ...fields }) => {
      const markup = renderDay(makeUserDay(fields));

      expect(markup).toContain('Dedicated Agents-window activity');
      expect(markup).toContain('Used VS Code Agents');
      for (const value of expected) expect(markup).toContain(value);
      expect(markup).not.toContain('IDE Agent');
    });

    it('omits missing fields but preserves reported zeros', () => {
      const markup = renderDay(makeUserDay({
        totals_by_vscode_agent: { session_count: 0, total_user_messages: null },
      }));

      expect(markup).toContain('VS Code Agents');
      expect(markup).toContain('Sessions');
      expect(markup).toContain('>0<');
      expect(markup).not.toContain('Used VS Code Agents');
      expect(markup).not.toContain('User messages');
      expect(markup).not.toContain('Not reported');
    });
  });

  describe('activity tables', () => {
    it('keeps feature, language and client tables when rows report zero values', () => {
      const markup = renderDay(makeUserDay({
        totals_by_feature: [{ ...ZERO_TOTALS, feature: 'code_completion', user_initiated_interaction_count: 0 }],
        totals_by_language_model: [{ ...ZERO_TOTALS, language: 'typescript', model: 'test-model' }],
        totals_by_ide: [makeIdeTotal('vscode')],
      }));

      expect(markup).toContain('Activity by Feature');
      expect(markup).toContain('Activity by Language &amp; Model');
      expect(markup).toContain('typescript');
      expect(markup).toContain('Activity by Client');
      expect(markup).not.toContain('Client distribution');
    });
  });

  describe('client-specific activity', () => {
    it('keeps reported-zero CLI rows without an empty client chart or usage pill', () => {
      const markup = renderDay(makeUserDay({
        totals_by_cli: {
          session_count: 0, request_count: 0, prompt_count: 0,
          token_usage: { prompt_tokens_sum: 0, output_tokens_sum: 0, avg_tokens_per_request: 0 },
        },
      }));

      expect(markup).toContain('Activity by Client');
      expect(markup).toContain('<span>Copilot CLI</span>');
      expect(markup).not.toContain('Client distribution');
      expect(markup).not.toContain('Features used:');
    });

    const copilotAppDay = makeUserDay({
      used_copilot_app: true,
      totals_by_copilot_app: {
        session_count: 1,
        request_count: 90,
        prompt_count: 7,
        token_usage: {
          avg_tokens_per_request: 138654.93,
          output_tokens_sum: 49838,
          prompt_tokens_sum: 12429106,
        },
      },
      totals_by_ide: [
        makeIdeTotal('copilot_app', { user_initiated_interaction_count: 90 }),
        makeIdeTotal('vscode', {
          user_initiated_interaction_count: 3,
          last_known_plugin_version: {
            sampled_at: '2024-01-15T00:00:00Z',
            plugin: 'vscode-copilot',
            plugin_version: '1.2.3',
          },
        }),
      ],
    });

    it.each([
      ['Sessions', '1'],
      ['Requests', '90'],
      ['Prompts', '7'],
      ['Prompt tokens', '12,429,106'],
      ['Output tokens', '49,838'],
      ['Avg tokens / request', '138,654.9'],
    ])('shows Copilot App usage %s', (label, value) => {
      const markup = renderDay(copilotAppDay, { userLogin: 'octocat' });

      expect(markup).toContain('Copilot App Usage');
      expect(markup).toContain(label);
      expect(markup).toContain(`>${value}<`);
    });

    it('lists Copilot App separately from IDE clients', () => {
      const markup = renderDay(copilotAppDay, { userLogin: 'octocat' });

      expect(markup).toContain('Session and token totals reported by totals_by_copilot_app for this day.');
      expect(markup).toContain('vscode-copilot v1.2.3');
      expect(markup).not.toContain('<span>Copilot App</span>');
    });
  });
});
