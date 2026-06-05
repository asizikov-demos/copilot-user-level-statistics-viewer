import { describe, it, expect } from 'vitest';
import {
  createModelUsageAccumulator,
  accumulateModelFeature,
  computeDailyModelUsageData,
} from '../modelUsageCalculator';

describe('modelUsageCalculator', () => {
  describe('Model bucket accumulation', () => {
    it('should classify interactions into standard, premium, and unknown buckets', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 'gpt-4o', 100);
      accumulateModelFeature(accumulator, '2024-01-15', 'gpt-5', 50);
      accumulateModelFeature(accumulator, '2024-01-15', 'unknown', 10);

      const results = computeDailyModelUsageData(accumulator);

      expect(results).toHaveLength(1);
      expect(results[0].date).toBe('2024-01-15');
      expect(results[0].standardModels).toBe(100);
      expect(results[0].pruModels).toBe(50);
      expect(results[0].unknownModels).toBe(10);
    });

    it('should classify normalized aliases in the premium bucket', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 'Claude Opus 4.6 (fast mode)', 10);

      const results = computeDailyModelUsageData(accumulator);
      expect(results[0].pruModels).toBe(10);
      expect(results[0].standardModels).toBe(0);
      expect(results[0].unknownModels).toBe(0);
    });

    it('should accumulate interactions for the same model bucket', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 'gpt-5', 10);
      accumulateModelFeature(accumulator, '2024-01-15', 'claude-sonnet-4.5', 20);
      accumulateModelFeature(accumulator, '2024-01-15', 'o3-mini', 5);

      const results = computeDailyModelUsageData(accumulator);

      expect(results[0].pruModels).toBe(35);
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

      expect(day1?.pruModels).toBe(30);
      expect(day1?.standardModels).toBe(0);
      expect(day2?.pruModels).toBe(0);
      expect(day2?.standardModels).toBe(5);
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
        expect(result.pruModels).toBe(10);
      });
    });
  });

  describe('Unknown model handling', () => {
    it('should track unknown models separately', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 'unknown', 10);
      accumulateModelFeature(accumulator, '2024-01-15', '', 5);

      const results = computeDailyModelUsageData(accumulator);

      expect(results[0].unknownModels).toBe(15); // 10 + 5
    });

    it('should classify unrecognized model names as premium by default', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 'totally-unknown-xyz', 10);

      const results = computeDailyModelUsageData(accumulator);

      expect(results[0].pruModels).toBe(10);
    });
  });
});
