import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { UserDayData } from '../../../../../types/metrics';
import DayDetailsModal from '../DayDetailsModal';
import { computeDailyCliCustomizations } from '../../../../../domain/calculators/cliCustomizationCalculator';

vi.mock('../DayImpactCard', () => ({
  default: () => <div>Impact card</div>,
}));

vi.mock('../DayFeatureBreakdown', () => ({
  default: () => <div>Feature breakdown</div>,
}));

vi.mock('../../charts/DayClientDistributionChart', () => ({
  default: () => <div>Client distribution</div>,
}));

function makeDayMetrics(overrides: Partial<UserDayData> = {}): UserDayData {
  return {
    day: '2024-01-15',
    user_initiated_interaction_count: 0,
    code_generation_activity_count: 0,
    code_acceptance_activity_count: 0,
    loc_added_sum: 0,
    loc_deleted_sum: 0,
    loc_suggested_to_add_sum: 0,
    loc_suggested_to_delete_sum: 0,
    ai_credits_used: 0,
    used_copilot_app: false,
    used_copilot_coding_agent: false,
    used_copilot_code_review_active: false,
    used_copilot_code_review_passive: false,
    totals_by_feature: [],
    totals_by_ide: [],
    totals_by_language_feature: [],
    totals_by_language_model: [],
    totals_by_model_feature: [],
    ...overrides,
  };
}

describe('DayDetailsModal', () => {
  it('shows daily skill, agent, MCP and command totals without CLI session data', () => {
    const cliCustomizations = computeDailyCliCustomizations({
      day: '2024-01-15',
      totals_by_skill: [{ skill: 'other', user_initiated_interaction_count: 19 }],
      distinct_skill_use_count: 65,
      totals_by_custom_agent: [{ custom_agent: 'daily-reviewer', interaction_count: 7 }],
      distinct_custom_agent_use_count: 1,
      totals_by_mcp: [{ mcp: 'daily-server', interaction_count: 12 }],
      distinct_mcp_use_count: 1,
      totals_by_slash_cmd: [{ slash_cmd: 'custom', interaction_count: 3 }],
      distinct_slash_cmd_use_count: 2,
    });
    const markup = renderToStaticMarkup(
      <DayDetailsModal isOpen onClose={vi.fn()} date="2024-01-15" dayMetrics={makeDayMetrics({ cliCustomizations })} />,
    );
    expect(markup).toContain('id="day-details-cli-customizations"');
    expect(markup).toContain('>Customizations</h2>');
    expect(markup).toContain('<table');
    for (const title of ['Skills', 'Custom agents', 'MCP servers', 'Slash commands']) {
      expect(markup).toContain(title);
    }
    for (const count of [65, 1, 2]) {
      expect(markup).toContain(`>${count}</td>`);
    }
    expect(markup.match(/aria-expanded="false"/g)).toHaveLength(4);
    expect(markup).not.toContain('daily-reviewer');
    expect(markup).not.toContain('daily-server');
    expect(markup).not.toContain('CLI Customizations');
    expect(markup).toContain('Distinct items used on this day.');
    expect(markup).not.toContain('user_initiated_interaction_count');
    expect(markup).not.toContain('Average distinct items');
    expect(markup).not.toContain('Activity lists reported:');
    expect(markup).not.toContain('Partial coverage');
  });

  it('shows only the selected day, preserving zero versus missing data', () => {
    const firstDay = makeDayMetrics({
      cliCustomizations: computeDailyCliCustomizations({
        day: '2024-01-15',
        totals_by_custom_agent: [{ custom_agent: 'first-day-agent', interaction_count: 9 }],
        distinct_custom_agent_use_count: 1,
      }),
    });
    const secondDay = makeDayMetrics({
      day: '2024-01-16',
      cliCustomizations: computeDailyCliCustomizations({
        day: '2024-01-16',
        totals_by_custom_agent: [],
        distinct_custom_agent_use_count: 0,
        distinct_skill_use_count: 2,
        totals_by_mcp: [],
      }),
    });
    const renderDay = (dayMetrics: UserDayData) => renderToStaticMarkup(
      <DayDetailsModal
        isOpen onClose={vi.fn()} date={dayMetrics.day} dayMetrics={dayMetrics}
        onNavigateDay={vi.fn()} canNavigateNextDay canNavigatePrevDay
      />,
    );
    expect(renderDay(firstDay)).toContain('Custom agents');
    expect(renderDay(firstDay)).toContain('>1</td>');
    const markup = renderDay(secondDay);
    expect(markup).not.toContain('first-day-agent');
    expect(markup).toContain('>0</td>');
    expect(markup).toContain('>2</td>');
    expect(markup).not.toContain('Not reported');
    expect(markup).not.toContain('Reported items');
    expect(markup).not.toContain('Slash commands');
    expect(markup).not.toContain('MCP servers');
    expect(markup).not.toContain('aria-expanded');
    expect(markup).toContain('Previous day');
    expect(markup).toContain('Next day');
  });

  it('keeps the no-record state and handles older day-detail payloads', () => {
    const noRecord = renderToStaticMarkup(
      <DayDetailsModal isOpen onClose={vi.fn()} date="2024-01-15" />,
    );
    expect(noRecord).toContain('No activity recorded');
    expect(noRecord).not.toContain('id="day-details-cli-customizations"');
    const oldPayload = renderToStaticMarkup(
      <DayDetailsModal isOpen onClose={vi.fn()} date="2024-01-15" dayMetrics={makeDayMetrics()} />,
    );
    expect(oldPayload).not.toContain('id="day-details-cli-customizations"');
    expect(oldPayload).not.toContain('VS Code Agents');
    expect(oldPayload).not.toContain('Activity by Feature');
    expect(oldPayload).not.toContain('Activity by Client');
    expect(oldPayload).not.toContain('Activity by Language');
    expect(oldPayload).not.toContain('Client distribution');
    expect(oldPayload).toContain('Impact card');
  });

  it.each([
    { used_vscode_agent: true, totals_by_vscode_agent: { session_count: 2, total_user_messages: 7 }, expected: ['Yes', '>2<', '>7<'] },
    { used_vscode_agent: false, totals_by_vscode_agent: { session_count: 0, total_user_messages: 0 }, expected: ['No', '>0<'] },
  ])('shows separate VS Code Agents day metrics: %j', ({ expected, ...fields }) => {
    const markup = renderToStaticMarkup(
      <DayDetailsModal isOpen onClose={vi.fn()} date="2024-01-15" dayMetrics={makeDayMetrics(fields)} />,
    );
    expect(markup).toContain('Dedicated Agents-window activity');
    expect(markup).toContain('Used VS Code Agents');
    for (const value of expected) expect(markup).toContain(value);
    expect(markup).not.toContain('IDE Agent');
  });

  it('omits missing VS Code Agents fields but preserves reported zeros', () => {
    const markup = renderToStaticMarkup(
      <DayDetailsModal isOpen onClose={vi.fn()} date="2024-01-15" dayMetrics={makeDayMetrics({
        totals_by_vscode_agent: { session_count: 0, total_user_messages: null },
      })} />,
    );
    expect(markup).toContain('VS Code Agents');
    expect(markup).toContain('Sessions');
    expect(markup).toContain('>0<');
    expect(markup).not.toContain('Used VS Code Agents');
    expect(markup).not.toContain('User messages');
    expect(markup).not.toContain('Not reported');
  });

  it('keeps feature and language tables when rows report zero values', () => {
    const totals = {
      code_generation_activity_count: 0, code_acceptance_activity_count: 0,
      loc_added_sum: 0, loc_deleted_sum: 0, loc_suggested_to_add_sum: 0, loc_suggested_to_delete_sum: 0,
    };
    const markup = renderToStaticMarkup(
      <DayDetailsModal isOpen onClose={vi.fn()} date="2024-01-15" dayMetrics={makeDayMetrics({
        totals_by_feature: [{ ...totals, feature: 'code_completion', user_initiated_interaction_count: 0 }],
        totals_by_language_model: [{ ...totals, language: 'typescript', model: 'test-model' }],
        totals_by_ide: [{ ...totals, ide: 'vscode', user_initiated_interaction_count: 0 }],
      })} />,
    );
    expect(markup).toContain('Activity by Feature');
    expect(markup).toContain('Activity by Language &amp; Model');
    expect(markup).toContain('Activity by Client');
    expect(markup).toContain('typescript');
    expect(markup).not.toContain('Client distribution');
  });

  it('keeps reported-zero CLI rows without an empty client chart or usage pill', () => {
    const markup = renderToStaticMarkup(
      <DayDetailsModal isOpen onClose={vi.fn()} date="2024-01-15" dayMetrics={makeDayMetrics({
        totals_by_cli: {
          session_count: 0, request_count: 0, prompt_count: 0,
          token_usage: { prompt_tokens_sum: 0, output_tokens_sum: 0, avg_tokens_per_request: 0 },
        },
      })} />,
    );
    expect(markup).toContain('Activity by Client');
    expect(markup).toContain('<span>Copilot CLI</span>');
    expect(markup).not.toContain('Client distribution');
    expect(markup).not.toContain('Features used:');
  });

  it('identifies Copilot App activity and renders app session and token totals separately from IDE clients', () => {
    const markup = renderToStaticMarkup(
      <DayDetailsModal
        isOpen
        onClose={vi.fn()}
        date="2024-01-15"
        userLogin="octocat"
        dayMetrics={makeDayMetrics({
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
            {
              ide: 'copilot_app',
              user_initiated_interaction_count: 90,
              code_generation_activity_count: 0,
              code_acceptance_activity_count: 0,
              loc_added_sum: 0,
              loc_deleted_sum: 0,
              loc_suggested_to_add_sum: 0,
              loc_suggested_to_delete_sum: 0,
            },
            {
              ide: 'vscode',
              user_initiated_interaction_count: 3,
              code_generation_activity_count: 2,
              code_acceptance_activity_count: 1,
              loc_added_sum: 5,
              loc_deleted_sum: 1,
              loc_suggested_to_add_sum: 8,
              loc_suggested_to_delete_sum: 2,
              last_known_plugin_version: {
                sampled_at: '2024-01-15T00:00:00Z',
                plugin: 'vscode-copilot',
                plugin_version: '1.2.3',
              },
            },
          ],
        })}
      />
    );

    expect(markup).toContain('Copilot App');
    expect(markup).toContain('Copilot App Usage');
    expect(markup).toContain('Session and token totals reported by totals_by_copilot_app for this day.');
    expect(markup).toContain('Sessions');
    expect(markup).toContain('>1<');
    expect(markup).toContain('Requests');
    expect(markup).toContain('>90<');
    expect(markup).toContain('Prompts');
    expect(markup).toContain('>7<');
    expect(markup).toContain('Prompt tokens');
    expect(markup).toContain('>12,429,106<');
    expect(markup).toContain('Output tokens');
    expect(markup).toContain('>49,838<');
    expect(markup).toContain('Avg tokens / request');
    expect(markup).toContain('>138,654.9<');
    expect(markup).toContain('VS Code');
    expect(markup).toContain('vscode-copilot v1.2.3');
    expect(markup).not.toContain('<span>Copilot App</span>');
  });
});
