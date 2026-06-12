import { describe, it, expect } from 'vitest';
import {
  createModelUsageAccumulator,
  accumulateModelFeature,
  accumulateAgentHeatmapFromFeature,
  computeDailyModelUsageData,
  computeAgentModeHeatmapData,
} from '../modelUsageCalculator';

describe('modelUsageCalculator', () => {
  describe('Model interaction accumulation', () => {
    it('should aggregate interactions and track explicit unknown models', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 'gpt-4o', 100);
      accumulateModelFeature(accumulator, '2024-01-15', 'gpt-5', 50);
      accumulateModelFeature(accumulator, '2024-01-15', 'unknown', 10);

      const results = computeDailyModelUsageData(accumulator);

      expect(results).toHaveLength(1);
      expect(results[0].date).toBe('2024-01-15');
      expect(results[0].unknownModels).toBe(10);
      expect(results[0].modelInteractions).toBe(160);
    });

    it('should include normalized aliases in model interactions', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 'Claude Opus 4.6 (fast mode)', 10);

      const results = computeDailyModelUsageData(accumulator);
      expect(results[0].modelInteractions).toBe(10);
      expect(results[0].unknownModels).toBe(0);
    });
  });

  describe('Daily model usage accumulation', () => {
    it('should aggregate model usage across models per day', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 'gpt-5', 10);
      accumulateModelFeature(accumulator, '2024-01-15', 'claude-3.5-sonnet', 20);
      accumulateModelFeature(accumulator, '2024-01-16', 'gpt-4o', 5);

      const results = computeDailyModelUsageData(accumulator);

      expect(results).toHaveLength(2);

      const day1 = results.find(r => r.date === '2024-01-15');
      const day2 = results.find(r => r.date === '2024-01-16');

      expect(day1?.modelInteractions).toBe(30);
      expect(day1?.unknownModels).toBe(0);
      expect(day2?.modelInteractions).toBe(5);
      expect(day2?.unknownModels).toBe(0);
    });

    it('should maintain separate accumulation per date', () => {
      const accumulator = createModelUsageAccumulator();

      const dates = ['2024-01-15', '2024-01-16', '2024-01-17'];
      dates.forEach((date) => {
        accumulateModelFeature(accumulator, date, 'gpt-5', 10);
      });

      const results = computeDailyModelUsageData(accumulator);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.modelInteractions).toBe(10);
      });
    });
  });

  describe('Unknown model handling', () => {
    it('should track unknown models separately', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 'unknown', 10);
      accumulateModelFeature(accumulator, '2024-01-15', '', 5);

      const results = computeDailyModelUsageData(accumulator);

      expect(results[0].unknownModels).toBe(15);
      expect(results[0].modelInteractions).toBe(15);
    });

    it('should not count unrecognized model names as explicit unknown models', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 'totally-unknown-xyz', 10);

      const results = computeDailyModelUsageData(accumulator);

      expect(results[0].modelInteractions).toBe(10);
      expect(results[0].unknownModels).toBe(0);
    });
  });

  describe('Agent mode heatmap accumulation', () => {
    it('routes chat_panel_agent_mode via taxonomy to agent heatmap', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateAgentHeatmapFromFeature(accumulator, '2024-01-15', 1, 'chat_panel_agent_mode', 5);
      accumulateAgentHeatmapFromFeature(accumulator, '2024-01-15', 2, 'chat_panel_agent_mode', 3);

      const results = computeAgentModeHeatmapData(accumulator);

      expect(results).toHaveLength(1);
      expect(results[0].date).toBe('2024-01-15');
      expect(results[0].agentModeRequests).toBe(8);
      expect(results[0].uniqueUsers).toBe(2);
    });

    it('does not route non-agent-mode features to agent heatmap', () => {
      const accumulator = createModelUsageAccumulator();

      // ask mode: not an agent mode feature
      accumulateAgentHeatmapFromFeature(accumulator, '2024-01-15', 1, 'chat_panel_ask_mode', 5);
      // code completion: not a chat mode feature at all
      accumulateAgentHeatmapFromFeature(accumulator, '2024-01-15', 2, 'code_completion', 10);
      // agent_edit is an agent feature but has no chatModeBucket in the taxonomy,
      // so getChatModeBucket returns undefined and it is excluded from the heatmap
      accumulateAgentHeatmapFromFeature(accumulator, '2024-01-15', 3, 'agent_edit', 3);

      const results = computeAgentModeHeatmapData(accumulator);

      expect(results).toHaveLength(0);
    });

    it('ignores agent mode entries with zero interaction count', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateAgentHeatmapFromFeature(accumulator, '2024-01-15', 1, 'chat_panel_agent_mode', 0);

      const results = computeAgentModeHeatmapData(accumulator);

      expect(results).toHaveLength(0);
    });
  });
});
