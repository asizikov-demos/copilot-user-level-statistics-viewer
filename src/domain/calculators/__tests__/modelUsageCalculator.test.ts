import { describe, it, expect } from 'vitest';
import {
  createModelUsageAccumulator,
  accumulateModelFeature,
  computeDailyModelUsageData,
} from '../modelUsageCalculator';
import { SERVICE_VALUE_RATE } from '../../modelConfig';

describe('modelUsageCalculator', () => {
  describe('PRU calculation (interactions × multiplier)', () => {
    it('should calculate PRUs correctly for various models', () => {
      const accumulator = createModelUsageAccumulator();

      // gpt-4o: multiplier 0, 100 interactions = 0 PRUs
      accumulateModelFeature(accumulator, '2024-01-15', 1, 'gpt-4o', 'code_completion', 100);

      // gpt-5: multiplier 1, 50 interactions = 50 PRUs
      accumulateModelFeature(accumulator, '2024-01-15', 2, 'gpt-5', 'code_completion', 50);

      // claude-opus-4.6-fast-mode: multiplier 30, 10 interactions = 300 PRUs
      accumulateModelFeature(accumulator, '2024-01-15', 3, 'claude-opus-4.6-fast-mode', 'chat_panel_agent_mode', 10);

      const results = computeDailyModelUsageData(accumulator);

      expect(results).toHaveLength(1);
      expect(results[0].date).toBe('2024-01-15');
      expect(results[0].totalPRUs).toBe(350); // 0 + 50 + 300
      expect(results[0].standardModels).toBe(100); // gpt-4o has 0 multiplier
      expect(results[0].pruModels).toBe(60); // gpt-5 (50) + claude-opus (10)
    });

    it('should accumulate PRUs for multiple interactions', () => {
      const accumulator = createModelUsageAccumulator();

      // Same model, same day, multiple calls
      accumulateModelFeature(accumulator, '2024-01-15', 1, 'gpt-5', 'code_completion', 10);
      accumulateModelFeature(accumulator, '2024-01-15', 2, 'gpt-5', 'chat_panel_ask_mode', 20);
      accumulateModelFeature(accumulator, '2024-01-15', 3, 'gpt-5', 'code_completion', 5);

      const results = computeDailyModelUsageData(accumulator);

      expect(results[0].totalPRUs).toBe(35); // (10 + 20 + 5) × 1
    });
  });

  describe('Daily PRU accumulation', () => {
    it('should aggregate PRUs across users and models per day', () => {
      const accumulator = createModelUsageAccumulator();

      // Day 1: multiple users, multiple models
      accumulateModelFeature(accumulator, '2024-01-15', 1, 'gpt-5', 'code_completion', 10);
      accumulateModelFeature(accumulator, '2024-01-15', 2, 'claude-3.5-sonnet', 'code_completion', 20);

      // Day 2: different activity
      accumulateModelFeature(accumulator, '2024-01-16', 1, 'gpt-5', 'code_completion', 5);

      const results = computeDailyModelUsageData(accumulator);

      expect(results).toHaveLength(2);

      const day1 = results.find(r => r.date === '2024-01-15');
      const day2 = results.find(r => r.date === '2024-01-16');

      expect(day1?.totalPRUs).toBe(30); // (10 × 1) + (20 × 1)
      expect(day2?.totalPRUs).toBe(5); // (5 × 1)
    });

    it('should maintain separate accumulation per date', () => {
      const accumulator = createModelUsageAccumulator();

      const dates = ['2024-01-15', '2024-01-16', '2024-01-17'];
      dates.forEach((date) => {
        accumulateModelFeature(accumulator, date, 1, 'gpt-5', 'code_completion', 10);
      });

      const results = computeDailyModelUsageData(accumulator);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.totalPRUs).toBe(10);
      });
    });
  });

  describe('Unknown model handling', () => {
    it('should track unknown models separately', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 1, 'unknown', 'code_completion', 10);
      accumulateModelFeature(accumulator, '2024-01-15', 2, '', 'code_completion', 5);

      const results = computeDailyModelUsageData(accumulator);

      expect(results[0].unknownModels).toBe(15); // 10 + 5
    });

    it('should apply unknown multiplier to unknown models', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 1, 'totally-unknown-xyz', 'code_completion', 10);

      const results = computeDailyModelUsageData(accumulator);

      // Unknown models get multiplier 1 by default
      expect(results[0].totalPRUs).toBe(10);
    });
  });

  describe('Service value calculation (PRU × rate)', () => {
    it('should calculate service value correctly', () => {
      const accumulator = createModelUsageAccumulator();

      // 100 PRUs × $0.04 = $4.00
      accumulateModelFeature(accumulator, '2024-01-15', 1, 'gpt-5', 'code_completion', 100);

      const results = computeDailyModelUsageData(accumulator);

      expect(results[0].totalPRUs).toBe(100);
      expect(results[0].serviceValue).toBe(100 * SERVICE_VALUE_RATE);
      expect(results[0].serviceValue).toBe(4.0);
    });

    it('should round service value to 2 decimal places', () => {
      const accumulator = createModelUsageAccumulator();

      // 33 interactions × 0.33 multiplier = 10.89 PRUs × $0.04 = $0.4356
      accumulateModelFeature(accumulator, '2024-01-15', 1, 'o3-mini', 'code_completion', 33);

      const results = computeDailyModelUsageData(accumulator);

      expect(results[0].serviceValue).toBe(0.44); // Should be rounded
    });
  });

});
