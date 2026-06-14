import { describe, expect, it } from 'vitest';
import {
  accumulateCliAdoption,
  accumulateCodingAgentAdoption,
  accumulateFeatureAdoption,
  computeFeatureAdoptionData,
  createFeatureAdoptionAccumulator,
} from '../featureAdoptionCalculator';

describe('featureAdoptionCalculator', () => {
  it('uses shared category membership for chat/agent and advanced users', () => {
    const accumulator = createFeatureAdoptionAccumulator();

    accumulateFeatureAdoption(accumulator, 1, 'code_completion', 2, 0);
    accumulateFeatureAdoption(accumulator, 1, 'chat_panel_unknown_mode', 1, 0);

    accumulateFeatureAdoption(accumulator, 2, 'agent_edit', 1, 0);
    accumulateCliAdoption(accumulator, 2, true);

    accumulateFeatureAdoption(accumulator, 3, 'chat_panel_custom_mode', 1, 0);
    accumulateCodingAgentAdoption(accumulator, 3, true);

    const result = computeFeatureAdoptionData(accumulator);

    expect(result.totalUsers).toBe(3);
    expect(result.completionUsers).toBe(1);
    expect(result.chatUsers).toBe(1);
    expect(result.agentModeUsers).toBe(1);
    expect(result.cliUsers).toBe(1);
    expect(result.codingAgentUsers).toBe(1);
    expect(result.advancedUsers).toBe(2);
    expect(result.completionOnlyUsers).toBe(0);
  });

  it('derives chat mode bucket users from taxonomy instead of hard-coded feature names', () => {
    const accumulator = createFeatureAdoptionAccumulator();

    accumulateFeatureAdoption(accumulator, 1, 'chat_panel_ask_mode', 3, 0);
    accumulateFeatureAdoption(accumulator, 2, 'chat_panel_edit_mode', 2, 0);
    accumulateFeatureAdoption(accumulator, 3, 'chat_inline', 1, 0);
    accumulateFeatureAdoption(accumulator, 4, 'chat_panel_plan_mode', 1, 0);
    accumulateFeatureAdoption(accumulator, 5, 'chat_panel_agent_mode', 1, 0);

    const result = computeFeatureAdoptionData(accumulator);

    expect(result.askModeUsers).toBe(1);
    expect(result.editModeUsers).toBe(1);
    expect(result.inlineModeUsers).toBe(1);
    expect(result.planModeUsers).toBe(1);
    expect(result.agentModeUsers).toBe(1);
  });
});
