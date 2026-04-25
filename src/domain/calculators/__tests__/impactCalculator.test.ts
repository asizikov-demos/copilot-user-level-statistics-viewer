import { describe, it, expect } from 'vitest';
import {
  createImpactAccumulator,
  accumulateFeatureImpacts,
  ensureImpactDates,
  computeAgentImpactData,
  computeCodeCompletionImpactData,
  computeEditModeImpactData,
  computeCliImpactData,
  computeJoinedImpactData,
  type FeatureImpactInput,
} from '../impactCalculator';

describe('impactCalculator', () => {
  describe('Feature categorization', () => {
    it('should route agent features to agent impact', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');

      const agentFeatures: FeatureImpactInput[] = [
        { feature: 'agent_edit', locAdded: 100, locDeleted: 20 },
        { feature: 'chat_panel_agent_mode', locAdded: 50, locDeleted: 10 },
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, agentFeatures);

      const results = computeAgentImpactData(accumulator);

      expect(results).toHaveLength(1);
      expect(results[0].date).toBe('2024-01-15');
      expect(results[0].locAdded).toBe(150); // 100 + 50
      expect(results[0].locDeleted).toBe(30); // 20 + 10
      expect(results[0].userCount).toBe(1);
    });

    it('should route code_completion to completion impact', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');

      const features: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 200, locDeleted: 50 },
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, features);

      const results = computeCodeCompletionImpactData(accumulator);

      expect(results).toHaveLength(1);
      expect(results[0].locAdded).toBe(200);
      expect(results[0].locDeleted).toBe(50);
    });

    it('should route chat_panel_edit_mode to edit mode impact', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');

      const features: FeatureImpactInput[] = [
        { feature: 'chat_panel_edit_mode', locAdded: 80, locDeleted: 15 },
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, features);

      const results = computeEditModeImpactData(accumulator);

      expect(results).toHaveLength(1);
      expect(results[0].locAdded).toBe(80);
      expect(results[0].locDeleted).toBe(15);
    });

    it('should route copilot_cli to CLI impact', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');

      const features: FeatureImpactInput[] = [
        { feature: 'copilot_cli', locAdded: 100, locDeleted: 20 },
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, features);

      const results = computeCliImpactData(accumulator);

      expect(results).toHaveLength(1);
      expect(results[0].locAdded).toBe(100);
      expect(results[0].locDeleted).toBe(20);
      expect(results[0].userCount).toBe(1);
    });

    it('should continue routing legacy cli_agent to CLI impact', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');

      const features: FeatureImpactInput[] = [
        { feature: 'cli_agent', locAdded: 50, locDeleted: 10 },
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, features);

      const results = computeCliImpactData(accumulator);

      expect(results[0].locAdded).toBe(50);
      expect(results[0].locDeleted).toBe(10);
    });

    it('should handle multiple feature categories in single accumulation', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');

      const features: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 100, locDeleted: 20 },
        { feature: 'chat_panel_edit_mode', locAdded: 50, locDeleted: 10 },
        { feature: 'agent_edit', locAdded: 30, locDeleted: 5 },
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, features);

      const completionResults = computeCodeCompletionImpactData(accumulator);
      const editResults = computeEditModeImpactData(accumulator);
      const agentResults = computeAgentImpactData(accumulator);

      expect(completionResults[0].locAdded).toBe(100);
      expect(editResults[0].locAdded).toBe(50);
      expect(agentResults[0].locAdded).toBe(30);
    });
  });

  describe('Joined features aggregation', () => {
    it('should aggregate all productive features into joined impact', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');

      const features: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 100, locDeleted: 20 },
        { feature: 'chat_panel_ask_mode', locAdded: 50, locDeleted: 10 },
        { feature: 'chat_panel_edit_mode', locAdded: 30, locDeleted: 5 },
        { feature: 'chat_inline', locAdded: 20, locDeleted: 3 },
        { feature: 'chat_panel_agent_mode', locAdded: 40, locDeleted: 8 },
        { feature: 'copilot_cli', locAdded: 10, locDeleted: 2 },
        { feature: 'chat_panel_plan_mode', locAdded: 15, locDeleted: 3 },
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, features);

      const results = computeJoinedImpactData(accumulator);

      expect(results).toHaveLength(1);
      expect(results[0].locAdded).toBe(265); // Sum of all
      expect(results[0].locDeleted).toBe(51); // Sum of all
    });

    it('should exclude non-joined features from joined impact', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');

      const features: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 100, locDeleted: 20 },
        { feature: 'code_review', locAdded: 50, locDeleted: 10 }, // Not in JOINED_FEATURES
        { feature: 'some_other_feature', locAdded: 30, locDeleted: 5 }, // Not in JOINED_FEATURES
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, features);

      const results = computeJoinedImpactData(accumulator);

      // Should only include code_completion
      expect(results[0].locAdded).toBe(100);
      expect(results[0].locDeleted).toBe(20);
    });
  });

  describe('Zero LOC filtering', () => {
    it('should ignore features with zero LOC added and deleted', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');

      const features: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 0, locDeleted: 0 }, // Should be ignored
        { feature: 'chat_panel_edit_mode', locAdded: 50, locDeleted: 10 }, // Should be counted
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, features);

      const completionResults = computeCodeCompletionImpactData(accumulator);
      const editResults = computeEditModeImpactData(accumulator);

      // Completion should have no data (zero LOC filtered out)
      expect(completionResults[0].locAdded).toBe(0);
      expect(completionResults[0].locDeleted).toBe(0);
      expect(completionResults[0].userCount).toBe(0);

      // Edit should have data
      expect(editResults[0].locAdded).toBe(50);
      expect(editResults[0].locDeleted).toBe(10);
      expect(editResults[0].userCount).toBe(1);
    });

    it('should count feature if only locAdded is non-zero', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');

      const features: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 100, locDeleted: 0 },
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, features);

      const results = computeCodeCompletionImpactData(accumulator);

      expect(results[0].locAdded).toBe(100);
      expect(results[0].userCount).toBe(1);
    });

    it('should count feature if only locDeleted is non-zero', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');

      const features: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 0, locDeleted: 50 },
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, features);

      const results = computeCodeCompletionImpactData(accumulator);

      expect(results[0].locDeleted).toBe(50);
      expect(results[0].userCount).toBe(1);
    });
  });

  describe('User deduplication per date', () => {
    it('should count each user only once per date per feature', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');

      // Same user, multiple code_completion activities on same day
      const features1: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 50, locDeleted: 10 },
      ];

      const features2: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 30, locDeleted: 5 },
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, features1);
      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, features2);

      const results = computeCodeCompletionImpactData(accumulator);

      expect(results[0].locAdded).toBe(80); // 50 + 30
      expect(results[0].userCount).toBe(1); // Still only 1 unique user
    });

    it('should count different users separately', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');

      const user1Features: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 50, locDeleted: 10 },
      ];

      const user2Features: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 30, locDeleted: 5 },
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, user1Features);
      accumulateFeatureImpacts(accumulator, '2024-01-15', 2, user2Features);

      const results = computeCodeCompletionImpactData(accumulator);

      expect(results[0].userCount).toBe(2);
      expect(results[0].locAdded).toBe(80);
    });

    it('should track same user across different dates', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');
      ensureImpactDates(accumulator, '2024-01-16');

      const features: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 50, locDeleted: 10 },
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, features);
      accumulateFeatureImpacts(accumulator, '2024-01-16', 1, features);

      const results = computeCodeCompletionImpactData(accumulator);

      expect(results).toHaveLength(2);
      expect(results[0].userCount).toBe(1);
      expect(results[1].userCount).toBe(1);
    });
  });

  describe('Net change calculation', () => {
    it('should calculate net change as locAdded minus locDeleted', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');

      const features: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 100, locDeleted: 30 },
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, features);

      const results = computeCodeCompletionImpactData(accumulator);

      expect(results[0].netChange).toBe(70); // 100 - 30
    });

    it('should handle negative net change when more deleted than added', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');

      const features: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 30, locDeleted: 100 },
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, features);

      const results = computeCodeCompletionImpactData(accumulator);

      expect(results[0].netChange).toBe(-70); // 30 - 100
    });
  });

  describe('Total unique users tracking', () => {
    it('should track total unique users across all features and dates', () => {
      const accumulator = createImpactAccumulator();
      ensureImpactDates(accumulator, '2024-01-15');
      ensureImpactDates(accumulator, '2024-01-16');

      const user1Day1: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 50, locDeleted: 10 },
      ];

      const user2Day1: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 30, locDeleted: 5 },
      ];

      const user1Day2: FeatureImpactInput[] = [
        { feature: 'code_completion', locAdded: 40, locDeleted: 8 },
      ];

      accumulateFeatureImpacts(accumulator, '2024-01-15', 1, user1Day1);
      accumulateFeatureImpacts(accumulator, '2024-01-15', 2, user2Day1);
      accumulateFeatureImpacts(accumulator, '2024-01-16', 1, user1Day2);

      const results = computeCodeCompletionImpactData(accumulator);

      // Both days should report total unique users = 2
      expect(results[0].totalUniqueUsers).toBe(2);
      expect(results[1].totalUniqueUsers).toBe(2);

      // But per-day user counts differ
      expect(results[0].userCount).toBe(2); // Day 1: user1 and user2
      expect(results[1].userCount).toBe(1); // Day 2: only user1
    });
  });
});
