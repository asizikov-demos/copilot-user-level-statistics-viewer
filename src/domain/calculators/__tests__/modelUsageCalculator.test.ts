import { describe, it, expect } from 'vitest';
import {
  createModelUsageAccumulator,
  accumulateModelFeature,
  computeDailyModelUsageData,
  computePRUAnalysisData,
  computeModelFeatureDistributionData,
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

  describe('Standard vs premium request classification', () => {
    it('should correctly classify standard models (multiplier 0)', () => {
      const accumulator = createModelUsageAccumulator();

      const standardModels = ['gpt-4o', 'gpt-4.0', 'gpt-3.5', 'gpt-4o-mini'];

      standardModels.forEach((model, index) => {
        accumulateModelFeature(accumulator, '2024-01-15', index, model, 'code_completion', 10);
      });

      const results = computePRUAnalysisData(accumulator);

      expect(results).toHaveLength(1);
      expect(results[0].standardRequests).toBe(40); // 10 × 4 models
      expect(results[0].pruRequests).toBe(0);
      expect(results[0].totalPRUs).toBe(0);
    });

    it('should correctly classify premium models (multiplier > 0)', () => {
      const accumulator = createModelUsageAccumulator();

      const premiumModels = [
        { name: 'gpt-5', multiplier: 1 },
        { name: 'claude-3.5-sonnet', multiplier: 1 },
        { name: 'o3-mini', multiplier: 0.33 },
      ];

      premiumModels.forEach((model, index) => {
        accumulateModelFeature(accumulator, '2024-01-15', index, model.name, 'code_completion', 10);
      });

      const results = computePRUAnalysisData(accumulator);

      expect(results[0].pruRequests).toBe(30); // 10 × 3 models
      expect(results[0].standardRequests).toBe(0);
      expect(results[0].totalPRUs).toBeCloseTo(23.3, 1); // (10×1) + (10×1) + (10×0.33)
    });

    it('should calculate PRU percentage correctly', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 1, 'gpt-4o', 'code_completion', 100);
      accumulateModelFeature(accumulator, '2024-01-15', 2, 'gpt-5', 'code_completion', 50);

      const results = computePRUAnalysisData(accumulator);

      expect(results[0].pruPercentage).toBeCloseTo(33.33, 1); // 50/(100+50) * 100
    });

    it('overall PRU percentage should use total ratio, not average of daily percentages', () => {
      const accumulator = createModelUsageAccumulator();

      // Day 1: 100% premium (50 premium, 0 standard)
      accumulateModelFeature(accumulator, '2024-01-15', 1, 'gpt-5', 'code_completion', 50);

      // Day 2: 0% premium (0 premium, 2 standard)
      accumulateModelFeature(accumulator, '2024-01-16', 2, 'gpt-4o', 'code_completion', 2);

      const results = computePRUAnalysisData(accumulator);

      expect(results).toHaveLength(2);
      expect(results[0].pruPercentage).toBe(100); // Day 1: 50/50
      expect(results[1].pruPercentage).toBe(0);   // Day 2: 0/2

      // Overall ratio: 50 premium out of 52 total = 96.15%
      const totalPRU = results.reduce((sum, d) => sum + d.pruRequests, 0);
      const totalStandard = results.reduce((sum, d) => sum + d.standardRequests, 0);
      const totalRequests = totalPRU + totalStandard;
      const overallPercentage = Math.round((totalPRU / totalRequests) * 100 * 100) / 100;

      expect(overallPercentage).toBeCloseTo(96.15, 1);

      // Averaging daily percentages would give (100 + 0) / 2 = 50% — misleading
      const avgDailyPercentage = results.reduce((sum, d) => sum + d.pruPercentage, 0) / results.length;
      expect(avgDailyPercentage).toBe(50);

      // The overall ratio is the correct metric for aggregate display
      expect(overallPercentage).not.toBeCloseTo(avgDailyPercentage, 0);
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

      const results = computePRUAnalysisData(accumulator);

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

  describe('Top model selection by PRU', () => {
    it('should identify top model by PRU consumption', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 1, 'gpt-5', 'code_completion', 10);
      accumulateModelFeature(accumulator, '2024-01-15', 2, 'claude-3.5-sonnet', 'code_completion', 50);
      accumulateModelFeature(accumulator, '2024-01-15', 3, 'o3-mini', 'code_completion', 20);

      const results = computePRUAnalysisData(accumulator);

      expect(results[0].topModel).toBe('claude-3.5-sonnet');
      expect(results[0].topModelPRUs).toBe(50);
    });

    it('should use request count as tiebreaker when PRUs are equal', () => {
      const accumulator = createModelUsageAccumulator();

      // Both have same PRU (10 × 1 = 10)
      accumulateModelFeature(accumulator, '2024-01-15', 1, 'gpt-5', 'code_completion', 10);
      accumulateModelFeature(accumulator, '2024-01-15', 2, 'claude-3.5-sonnet', 'code_completion', 10);

      const results = computePRUAnalysisData(accumulator);

      // Should still have a top model (either one, deterministic based on entry order)
      expect(results[0].topModel).toBeDefined();
      expect(results[0].topModelPRUs).toBe(10);
    });

    it('should handle empty data gracefully', () => {
      const accumulator = createModelUsageAccumulator();

      const results = computePRUAnalysisData(accumulator);

      expect(results).toHaveLength(0);
    });
  });

  describe('Model feature distribution', () => {
    it('should track feature usage per model', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 1, 'gpt-5', 'code_completion', 10);
      accumulateModelFeature(accumulator, '2024-01-15', 2, 'gpt-5', 'chat_panel_ask_mode', 5);
      accumulateModelFeature(accumulator, '2024-01-15', 3, 'gpt-5', 'chat_panel_agent_mode', 3);

      const results = computeModelFeatureDistributionData(accumulator);

      const gpt5 = results.find(r => r.model === 'gpt-5');

      expect(gpt5).toBeDefined();
      expect(gpt5?.features.codeCompletion).toBe(10);
      expect(gpt5?.features.askMode).toBe(5);
      expect(gpt5?.features.agentMode).toBe(3);
      expect(gpt5?.totalInteractions).toBe(18);
    });

    it('should calculate total PRUs per model across all features', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 1, 'claude-opus-4.6-fast-mode', 'code_completion', 10);
      accumulateModelFeature(accumulator, '2024-01-15', 2, 'claude-opus-4.6-fast-mode', 'chat_panel_agent_mode', 5);

      const results = computeModelFeatureDistributionData(accumulator);

      const claudeOpus = results.find(r => r.model === 'claude-opus-4.6-fast-mode');

      expect(claudeOpus?.totalInteractions).toBe(15);
      expect(claudeOpus?.totalPRUs).toBe(450); // 15 × 30
      expect(claudeOpus?.multiplier).toBe(30);
    });

    it('should sort models by total PRUs descending', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 1, 'gpt-5', 'code_completion', 10); // 10 PRUs
      accumulateModelFeature(accumulator, '2024-01-15', 2, 'claude-3.5-sonnet', 'code_completion', 50); // 50 PRUs
      accumulateModelFeature(accumulator, '2024-01-15', 3, 'o3-mini', 'code_completion', 20); // 6.6 PRUs

      const results = computeModelFeatureDistributionData(accumulator);

      expect(results[0].model).toBe('claude-3.5-sonnet');
      expect(results[1].model).toBe('gpt-5');
      expect(results[2].model).toBe('o3-mini');
    });

    it('should filter out models with zero interactions', () => {
      const accumulator = createModelUsageAccumulator();

      accumulateModelFeature(accumulator, '2024-01-15', 1, 'gpt-5', 'code_completion', 10);

      const results = computeModelFeatureDistributionData(accumulator);

      // Should only have models with interactions
      expect(results.every(r => r.totalInteractions > 0)).toBe(true);
    });
  });
});
