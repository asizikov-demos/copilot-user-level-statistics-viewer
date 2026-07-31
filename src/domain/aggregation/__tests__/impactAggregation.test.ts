import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import {
  accumulateImpactAggregation,
  createImpactAggregationAccumulator,
  finalizeImpactAggregation,
} from '../impactAggregation';

const impactFeature = (
  feature: string,
  locAdded: number,
  locDeleted: number
) => ({
  feature,
  user_initiated_interaction_count: 1,
  code_generation_activity_count: 0,
  code_acceptance_activity_count: 0,
  loc_added_sum: locAdded,
  loc_deleted_sum: locDeleted,
  loc_suggested_to_add_sum: 0,
  loc_suggested_to_delete_sum: 0,
});

describe('impact aggregation orchestration', () => {
  it('preserves empty impact defaults', () => {
    expect(finalizeImpactAggregation(createImpactAggregationAccumulator())).toEqual({
      agentImpactData: [],
      codeCompletionImpactData: [],
      editModeImpactData: [],
      inlineModeImpactData: [],
      askModeImpactData: [],
      copilotAppImpactData: [],
      cliImpactData: [],
      joinedImpactData: [],
    });
  });

  it('owns date ensuring, feature input collection, every impact output, and ordering', () => {
    const accumulator = createImpactAggregationAccumulator();
    accumulateImpactAggregation(accumulator, makeMetric({
      day: '2024-01-16',
      user_id: 1,
      totals_by_feature: [
        impactFeature('code_completion', 10, 2),
        impactFeature('chat_panel_agent_mode', 8, 1),
        impactFeature('chat_panel_edit_mode', 7, 3),
        impactFeature('chat_inline', 6, 2),
        impactFeature('chat_panel_ask_mode', 5, 1),
        impactFeature('copilot_app', 3, 1),
        impactFeature('copilot_cli', 4, 1),
      ],
    }));
    accumulateImpactAggregation(accumulator, makeMetric({
      day: '2024-01-15',
      user_id: 2,
    }));

    const result = finalizeImpactAggregation(accumulator);
    const expectedDates = ['2024-01-15', '2024-01-16'];

    expect(result.agentImpactData.map(day => day.date)).toEqual(expectedDates);
    expect(result.codeCompletionImpactData.map(day => day.date)).toEqual(expectedDates);
    expect(result.editModeImpactData.map(day => day.date)).toEqual(expectedDates);
    expect(result.inlineModeImpactData.map(day => day.date)).toEqual(expectedDates);
    expect(result.askModeImpactData.map(day => day.date)).toEqual(expectedDates);
    expect(result.copilotAppImpactData.map(day => day.date)).toEqual(expectedDates);
    expect(result.cliImpactData.map(day => day.date)).toEqual(expectedDates);
    expect(result.joinedImpactData.map(day => day.date)).toEqual(expectedDates);

    expect(result.agentImpactData[1]).toMatchObject({
      locAdded: 8,
      locDeleted: 1,
      netChange: 7,
      userCount: 1,
      totalUniqueUsers: 2,
    });
    expect(result.codeCompletionImpactData[1].netChange).toBe(8);
    expect(result.editModeImpactData[1].netChange).toBe(4);
    expect(result.inlineModeImpactData[1].netChange).toBe(4);
    expect(result.askModeImpactData[1].netChange).toBe(4);
    expect(result.copilotAppImpactData[1].netChange).toBe(2);
    expect(result.cliImpactData[1].netChange).toBe(3);
    expect(result.joinedImpactData[1]).toMatchObject({
      locAdded: 43,
      locDeleted: 11,
      netChange: 32,
      userCount: 1,
      totalUniqueUsers: 2,
    });
    expect(result.joinedImpactData[0]).toMatchObject({
      locAdded: 0,
      locDeleted: 0,
      netChange: 0,
      userCount: 0,
      totalUniqueUsers: 2,
    });
  });
});
