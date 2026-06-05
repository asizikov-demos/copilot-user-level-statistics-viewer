import { describe, it, expect } from 'vitest';
import {
  createModelBreakdownAccumulator,
  accumulateModelBreakdown,
  computeModelBreakdownData,
} from '../modelBreakdownCalculator';

const makeModelFeature = (
  model: string,
  feature = 'code_completion',
  user_initiated_interaction_count = 10,
  code_generation_activity_count = 0,
  code_acceptance_activity_count = 0
) => ({ model, feature, user_initiated_interaction_count, code_generation_activity_count, code_acceptance_activity_count });

describe('modelBreakdownCalculator', () => {
  describe('createModelBreakdownAccumulator', () => {
    it('should initialise all counters to zero and maps to empty', () => {
      const acc = createModelBreakdownAccumulator();
      expect(acc.premiumTotal).toBe(0);
      expect(acc.standardTotal).toBe(0);
      expect(acc.cliTotal).toBe(0);
      expect(acc.unknownTotal).toBe(0);
      expect(acc.premiumModels.size).toBe(0);
      expect(acc.standardModels.size).toBe(0);
    });
  });

  describe('premium / standard classification', () => {
    it('should classify a known premium model (gpt-5)', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('gpt-5'));
      expect(acc.premiumTotal).toBe(10);
      expect(acc.standardTotal).toBe(0);
    });

    it('should classify a known standard model (gpt-4o)', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('gpt-4o'));
      expect(acc.standardTotal).toBe(10);
      expect(acc.premiumTotal).toBe(0);
    });

    it('should classify a model name with spaces (e.g. "Claude Opus 4.7") as premium', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('Claude Opus 4.7'));
      expect(acc.premiumTotal).toBe(10);
      expect(acc.standardTotal).toBe(0);
      expect(Array.from(acc.premiumModels.keys())).toEqual(['claude-opus-4.7']);
    });

    it('should classify a model name with parentheses (e.g. "Claude Opus 4.6 (fast mode)") as premium', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('Claude Opus 4.6 (fast mode)'));
      expect(acc.premiumTotal).toBe(10);
      expect(acc.standardTotal).toBe(0);
      expect(Array.from(acc.premiumModels.keys())).toEqual(['claude-opus-4.6-fast-mode']);
    });

    it('should aggregate premium variants with the same canonical model key', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('Claude Opus 4.7'));
      accumulateModelBreakdown(acc, '2024-01-15', 2, makeModelFeature('claude-opus-4.7'));

      expect(acc.premiumTotal).toBe(20);
      expect(acc.premiumModels.size).toBe(1);
      expect(acc.premiumModels.get('claude-opus-4.7')?.total).toBe(20);
    });

    it('should classify the unknown sentinel to unknownTotal', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('unknown'));
      expect(acc.unknownTotal).toBe(10);
      expect(acc.premiumTotal).toBe(0);
      expect(acc.standardTotal).toBe(0);
    });

    it('should classify empty model names to unknownTotal', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature(''));
      expect(acc.unknownTotal).toBe(10);
      expect(acc.premiumTotal).toBe(0);
      expect(acc.standardTotal).toBe(0);
    });
  });

  describe('auto model handling', () => {
    it('should route auto model to autoModels and not increment premium/standard', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('auto'));
      expect(acc.premiumTotal).toBe(0);
      expect(acc.standardTotal).toBe(0);
      expect(acc.autoModels.size).toBe(1);
    });

    it('should track auto-mode users per date', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('auto'));
      accumulateModelBreakdown(acc, '2024-01-15', 2, makeModelFeature('auto'));
      accumulateModelBreakdown(acc, '2024-01-16', 1, makeModelFeature('auto'));
      expect(acc.autoModeUsersByDate.get('2024-01-15')?.size).toBe(2);
      expect(acc.autoModeUsersByDate.get('2024-01-16')?.size).toBe(1);
    });
  });

  describe('CLI model handling', () => {
    it('should route CLI features to cliModels and increment cliTotal', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('gpt-4o', 'copilot_cli'));
      expect(acc.cliTotal).toBe(10);
      expect(acc.cliModels.size).toBe(1);
    });
  });

  describe('computeModelBreakdownData', () => {
    it('should return sorted dates and totals', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-16', 1, makeModelFeature('gpt-5'));
      accumulateModelBreakdown(acc, '2024-01-15', 2, makeModelFeature('gpt-4o'));
      const data = computeModelBreakdownData(acc);
      expect(data.dates).toEqual(['2024-01-15', '2024-01-16']);
      expect(data.premiumTotal).toBe(10);
      expect(data.standardTotal).toBe(10);
    });
  });
});
