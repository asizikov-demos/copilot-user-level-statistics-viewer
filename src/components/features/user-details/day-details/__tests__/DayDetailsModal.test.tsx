import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { UserDayData } from '../../../../../types/metrics';
import DayDetailsModal from '../DayDetailsModal';

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
