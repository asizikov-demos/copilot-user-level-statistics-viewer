import { describe, expect, it } from 'vitest';
import { translateFeature } from '../featureTranslations';
import {
  FEATURE_ADOPTION_CHART_METADATA,
  getChatModeBucket,
  isAgentFeature,
  isChatFeature,
  isCliFeature,
  isJoinedImpactFeature,
} from '../featureCategories';

describe('featureCategories taxonomy', () => {
  it('labels VS Code Agents without folding it into editor Agent Mode or other rollups', () => {
    expect(translateFeature('vscode_agent')).toBe('VS Code Agents');
    expect(isAgentFeature('vscode_agent')).toBe(false);
    expect(isChatFeature('vscode_agent')).toBe(false);
    expect(isCliFeature('vscode_agent')).toBe(false);
    expect(isJoinedImpactFeature('vscode_agent')).toBe(false);
    expect(getChatModeBucket('vscode_agent')).toBeUndefined();
  });

  it('classifies known feature membership consistently', () => {
    expect(isCliFeature('copilot_cli')).toBe(true);
    expect(isCliFeature('copilot_app')).toBe(false);
    expect(isCliFeature('chat_panel_ask_mode')).toBe(false);

    expect(isChatFeature('chat_panel_unknown_mode')).toBe(true);
    expect(isChatFeature('chat_panel_custom_mode')).toBe(false);

    expect(isAgentFeature('chat_panel_agent_mode')).toBe(true);
    expect(isAgentFeature('agent_edit')).toBe(true);
    expect(isAgentFeature('chat_panel_edit_mode')).toBe(false);

    expect(isJoinedImpactFeature('code_completion')).toBe(true);
    expect(isJoinedImpactFeature('copilot_cli')).toBe(true);
    expect(isJoinedImpactFeature('copilot_app')).toBe(true);
    expect(isJoinedImpactFeature('chat_panel_plan_mode')).toBe(false);

    expect(getChatModeBucket('chat_panel_ask_mode')).toBe('ask');
    expect(getChatModeBucket('chat_panel_edit_mode')).toBe('edit');
    expect(getChatModeBucket('chat_inline')).toBe('inline');
    expect(getChatModeBucket('chat_panel_custom_mode')).toBeUndefined();
  });

  it('orders feature adoption chart rows from overall usage to advanced surfaces', () => {
    expect(FEATURE_ADOPTION_CHART_METADATA.map((item) => item.key)).toEqual([
      'totalUsers', 'completionUsers', 'chatUsers', 'askModeUsers', 'agentModeUsers', 'planModeUsers',
      'cliUsers', 'vscodeAgentUsers', 'appUsers', 'inlineModeUsers', 'codingAgentUsers', 'codeReviewUsers',
    ]);
  });

  it.each([
    ['chat_panel_agent_mode', 'agent', true, true],
    ['chat_panel_edit_mode', 'edit', false, true],
    ['chat_panel_ask_mode', 'ask', false, true],
    ['chat_inline', 'inline', false, true],
    ['chat_panel_plan_mode', 'plan', false, false],
  ])('maps %s to the %s chat bucket consistently across taxonomy helpers', (feature, bucket, agent, joinedImpact) => {
    expect(getChatModeBucket(feature)).toBe(bucket);
    expect(isAgentFeature(feature)).toBe(agent);
    expect(isChatFeature(feature)).toBe(true);
    expect(isJoinedImpactFeature(feature)).toBe(joinedImpact);
  });
});
