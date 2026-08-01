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
      expect(acc.cliTotal).toBe(0);
      expect(acc.unknownTotal).toBe(0);
      expect(acc.modelTotal).toBe(0);
      expect(acc.modelCategories.size).toBe(0);
      expect(acc.allModels.size).toBe(0);
    });
  });

  describe('model normalization and unknown handling', () => {
    it('should aggregate known model interactions into neutral totals and entries', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('gpt-5'));
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('gpt-4o'));
      expect(acc.modelTotal).toBe(20);
      expect(acc.unknownTotal).toBe(0);
      expect(acc.allModels.get('gpt-5')?.total).toBe(10);
      expect(acc.allModels.get('gpt-4o')?.total).toBe(10);
    });

    it('should normalize a model name with spaces into allModels', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('Claude Opus 4.7'));
      expect(acc.modelTotal).toBe(10);
      expect(Array.from(acc.allModels.keys())).toEqual(['claude-opus-4.7']);
    });

    it('should normalize a model name with parentheses into allModels', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('Claude Opus 4.6 (fast mode)'));
      expect(acc.modelTotal).toBe(10);
      expect(Array.from(acc.allModels.keys())).toEqual(['claude-opus-4.6-fast-mode']);
    });

    it('should aggregate variants with the same canonical model key', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('Claude Opus 4.7'));
      accumulateModelBreakdown(acc, '2024-01-15', 2, makeModelFeature('claude-opus-4.7'));

      expect(acc.modelTotal).toBe(20);
      expect(acc.allModels.size).toBe(1);
      expect(acc.allModels.get('claude-opus-4.7')?.total).toBe(20);
    });

    it('should classify the unknown sentinel to unknownTotal', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('unknown'));
      expect(acc.unknownTotal).toBe(10);
      expect(acc.modelTotal).toBe(10);
      expect(acc.allModels.get('unknown')?.total).toBe(10);
    });

    it('should classify empty model names to unknownTotal', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature(''));
      expect(acc.unknownTotal).toBe(10);
      expect(acc.modelTotal).toBe(10);
      expect(acc.allModels.get('unknown')?.total).toBe(10);
    });

    it('should include assumed code completion interactions in neutral model totals', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('gpt-4o', 'code_completion', 0, 44, 2));

      expect(acc.modelTotal).toBe(44);
      expect(acc.unknownTotal).toBe(0);
      expect(acc.allModels.get('gpt-4o')?.total).toBe(44);
    });
  });

  describe('auto model handling', () => {
    it('should route auto model to autoModels and not increment neutral model total', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('auto'));
      expect(acc.modelTotal).toBe(0);
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

    it('should treat auto model as active when only interactions are non-zero', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('auto', 'chat_panel', 5, 0, 0));
      expect(acc.autoModels.size).toBe(1);
      expect(acc.autoModeUsersByDate.get('2024-01-15')?.has(1)).toBe(true);
    });

    it('should treat auto model as active when only generation activity is non-zero', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('auto', 'agent_edit', 0, 3, 0));
      expect(acc.autoModels.size).toBe(1);
      expect(acc.autoModeUsersByDate.get('2024-01-15')?.has(1)).toBe(true);
    });

    it('should treat auto model as active when only acceptance activity is non-zero', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('auto', 'code_completion', 0, 0, 2));
      expect(acc.autoModels.size).toBe(1);
      expect(acc.autoModeUsersByDate.get('2024-01-15')?.has(1)).toBe(true);
    });

    it('should preserve generation and acceptance activity for auto code completion', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('auto', 'code_completion', 0, 5, 3));

      expect(acc.autoModels.get('auto')?.total).toBe(8);
    });

    it('should not record auto model when all activity counts are zero', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('auto', 'chat_panel', 0, 0, 0));
      expect(acc.autoModels.size).toBe(0);
      expect(acc.autoModeUsersByDate.size).toBe(0);
    });

    it('should normalize "  Auto  " (with spaces) to auto bucket', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('  Auto  ', 'chat_panel', 5));
      expect(acc.autoModels.size).toBe(1);
      expect(acc.modelTotal).toBe(0);
    });
  });

  describe('CLI model handling', () => {
    it('should route CLI features to cliModels and increment cliTotal', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('gpt-4o', 'copilot_cli'));
      expect(acc.cliTotal).toBe(10);
      expect(acc.cliModels.size).toBe(1);
    });

    it('should coerce empty CLI model names to unknown', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('', 'copilot_cli'));
      expect(Array.from(acc.cliModels.keys())).toEqual(['unknown']);
    });
  });

  describe('computeModelBreakdownData', () => {
    it('should return sorted dates and totals', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-16', 1, makeModelFeature('gpt-5'));
      accumulateModelBreakdown(acc, '2024-01-15', 2, makeModelFeature('gpt-4o'));
      const data = computeModelBreakdownData(acc);
      expect(data.dates).toEqual(['2024-01-15', '2024-01-16']);
      expect(data.modelTotal).toBe(20);
      expect(data.unknownTotal).toBe(0);
      expect(data.allModels.map(entry => entry.model)).toEqual(['gpt-5', 'gpt-4o']);
    });

    it('should include unknown models in neutral model totals and entries', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('gpt-5', 'code_completion', 10));
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('gpt-4o', 'code_completion', 20));
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('unknown', 'code_completion', 5));
      const data = computeModelBreakdownData(acc);

      expect(data.modelTotal).toBe(35);
      expect(data.unknownTotal).toBe(5);
      expect(data.allModels).toEqual([
        { model: 'gpt-4o', total: 20, dailyData: { '2024-01-15': 20 }, users: 1 },
        { model: 'gpt-5', total: 10, dailyData: { '2024-01-15': 10 }, users: 1 },
        { model: 'unknown', total: 5, dailyData: { '2024-01-15': 5 }, users: 1 },
      ]);
      expect(data.modelCategories).toEqual([
        { category: 'Versatile', total: 20, dailyData: { '2024-01-15': 20 }, users: 1 },
        { category: 'Powerful', total: 10, dailyData: { '2024-01-15': 10 }, users: 1 },
        { category: 'Uncategorized', total: 5, dailyData: { '2024-01-15': 5 }, users: 1 },
      ]);
    });

    it('should count distinct users per model and category', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('gpt-5', 'code_completion', 10));
      accumulateModelBreakdown(acc, '2024-01-15', 2, makeModelFeature('gpt-5', 'code_completion', 20));
      accumulateModelBreakdown(acc, '2024-01-16', 3, makeModelFeature('gpt-4o', 'code_completion', 15));
      const data = computeModelBreakdownData(acc);

      expect(data.allModels.find(entry => entry.model === 'gpt-5')?.users).toBe(2);
      expect(data.allModels.find(entry => entry.model === 'gpt-4o')?.users).toBe(1);
      expect(data.modelCategories.find(entry => entry.category === 'Powerful')?.users).toBe(2);
      expect(data.modelCategories.find(entry => entry.category === 'Versatile')?.users).toBe(1);
    });

    it('should aggregate daily interactions by published model category', () => {
      const acc = createModelBreakdownAccumulator();
      accumulateModelBreakdown(acc, '2024-01-15', 1, makeModelFeature('gpt-5-mini', 'chat_panel', 8));
      accumulateModelBreakdown(acc, '2024-01-15', 2, makeModelFeature('claude-sonnet-4.6', 'chat_panel', 12));
      accumulateModelBreakdown(acc, '2024-01-16', 1, makeModelFeature('claude-opus-4.8', 'chat_panel', 5));

      expect(computeModelBreakdownData(acc).modelCategories).toEqual([
        { category: 'Lightweight', total: 8, dailyData: { '2024-01-15': 8 }, users: 1 },
        { category: 'Versatile', total: 12, dailyData: { '2024-01-15': 12 }, users: 1 },
        { category: 'Powerful', total: 5, dailyData: { '2024-01-16': 5 }, users: 1 },
      ]);
    });
  });
});
