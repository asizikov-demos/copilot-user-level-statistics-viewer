import { describe, expect, it } from 'vitest';
import {
  FEATURE_ADOPTION_CHART_METADATA,
  FEATURE_TRANSLATIONS,
  getFeatureTaxonomy,
  getChatModeBucket,
  isAgentFeature,
  isChatFeature,
  isCliFeature,
  isJoinedImpactFeature,
} from '../featureCategories';

describe('featureCategories taxonomy', () => {
  it('keeps feature labels in sync with taxonomy entries', () => {
    const taxonomy = getFeatureTaxonomy();
    expect(Object.keys(FEATURE_TRANSLATIONS)).toHaveLength(taxonomy.length);

    for (const entry of taxonomy) {
      expect(FEATURE_TRANSLATIONS[entry.feature]).toBe(entry.label);
    }
  });

  it('classifies known feature membership consistently', () => {
    expect(isCliFeature('copilot_cli')).toBe(true);
    expect(isCliFeature('cli_agent')).toBe(true);
    expect(isCliFeature('chat_panel_ask_mode')).toBe(false);

    expect(isChatFeature('chat_panel_unknown_mode')).toBe(true);
    expect(isChatFeature('chat_panel_custom_mode')).toBe(false);

    expect(isAgentFeature('chat_panel_agent_mode')).toBe(true);
    expect(isAgentFeature('agent_edit')).toBe(true);
    expect(isAgentFeature('chat_panel_edit_mode')).toBe(false);

    expect(isJoinedImpactFeature('code_completion')).toBe(true);
    expect(isJoinedImpactFeature('copilot_cli')).toBe(true);
    expect(isJoinedImpactFeature('chat_panel_plan_mode')).toBe(false);

    expect(getChatModeBucket('chat_panel_ask_mode')).toBe('ask');
    expect(getChatModeBucket('chat_panel_edit_mode')).toBe('edit');
    expect(getChatModeBucket('chat_inline')).toBe('inline');
    expect(getChatModeBucket('chat_panel_custom_mode')).toBeUndefined();
  });

  it('defines a stable feature adoption chart order', () => {
    expect(FEATURE_ADOPTION_CHART_METADATA.map((item) => item.key)).toEqual([
      'totalUsers',
      'completionUsers',
      'chatUsers',
      'askModeUsers',
      'editModeUsers',
      'agentModeUsers',
      'planModeUsers',
      'cliUsers',
      'inlineModeUsers',
      'codingAgentUsers',
    ]);
  });
});
