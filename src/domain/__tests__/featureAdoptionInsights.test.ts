import { describe, it, expect } from 'vitest';
import {
  computeFeatureAdoptionInsights,
  PLANNING_MODE_DOCS_URL,
  CLI_DOCS_URL,
} from '../featureAdoptionInsights';
import type { FeatureAdoptionData } from '../calculators/featureAdoptionCalculator';

const baseFeatureAdoption: FeatureAdoptionData = {
  totalUsers: 100,
  completionUsers: 80,
  completionOnlyUsers: 20,
  chatUsers: 60,
  agentModeUsers: 0,
  askModeUsers: 0,
  editModeUsers: 0,
  inlineModeUsers: 0,
  planModeUsers: 0,
  cliUsers: 0,
  advancedUsers: 0,
};

function buildData(overrides: Partial<FeatureAdoptionData>): FeatureAdoptionData {
  return { ...baseFeatureAdoption, ...overrides };
}

describe('computeFeatureAdoptionInsights', () => {
  describe('Planning Mode Opportunity', () => {
    it('shows when agent usage is high but planning is low', () => {
      const insights = computeFeatureAdoptionInsights(
        buildData({ agentModeUsers: 30, planModeUsers: 2 })
      );

      const planningInsight = insights.find((i) => i.title === 'Promote Planning Mode');
      expect(planningInsight).toBeDefined();
      expect(planningInsight?.message).toContain('Agent Mode adoption is 30.0%');
      expect(planningInsight?.message).toContain('Planning Mode is only 2.0%');
      expect(planningInsight?.ctaHref).toBe(PLANNING_MODE_DOCS_URL);
    });

    it('does not show when agent usage is small or planning is comparable', () => {
      expect(
        computeFeatureAdoptionInsights(buildData({ totalUsers: 50, agentModeUsers: 2, planModeUsers: 0, cliUsers: 5 }))
      ).toEqual([]);

      const balancedInsights = computeFeatureAdoptionInsights(
        buildData({ agentModeUsers: 20, planModeUsers: 8, cliUsers: 6 })
      );
      expect(balancedInsights.find((i) => i.title === 'Promote Planning Mode')).toBeUndefined();
    });

    it('should not show when Planning Mode usage is proportional to Agent Mode', () => {
      // agentModeUsers: 200/1000 = 20%, planModeUsers: 80/1000 = 8% → 8/20 = 40% of agent > 30% threshold
      const insights = computeFeatureAdoptionInsights(
        buildData({ totalUsers: 1000, agentModeUsers: 200, planModeUsers: 80, cliUsers: 100 })
      );
      expect(insights.find((i) => i.title === 'Promote Planning Mode')).toBeUndefined();
    });

    it('should not show when Planning Mode is higher than threshold', () => {
      // agentModeUsers: 100/1000 = 10%, planModeUsers: 50/1000 = 5% → 50/100 = 50% of agent > 30%
      const insights = computeFeatureAdoptionInsights(
        buildData({ totalUsers: 1000, agentModeUsers: 100, planModeUsers: 50, cliUsers: 100 })
      );
      expect(insights.find((i) => i.title === 'Promote Planning Mode')).toBeUndefined();
    });

    it('boundary: agent mode exactly at 5% threshold with low planning', () => {
      // agentModeUsers: 50/1000 = 5%, planModeUsers: 5/1000 = 0.5% → 5/50 = 10% < 30% → should show
      const insights = computeFeatureAdoptionInsights(
        buildData({ totalUsers: 1000, agentModeUsers: 50, planModeUsers: 5, cliUsers: 100 })
      );
      expect(insights.find((i) => i.title === 'Promote Planning Mode')).toBeDefined();
    });

    it('should show when agent mode is exactly 5% and plan is 0', () => {
      // agentModeUsers: 50/1000 = 5%, planModeUsers: 0 → 0% < 30% → should show
      const insights = computeFeatureAdoptionInsights(
        buildData({ totalUsers: 1000, agentModeUsers: 50, planModeUsers: 0, cliUsers: 100 })
      );
      const planningInsight = insights.find((i) => i.title === 'Promote Planning Mode');
      expect(planningInsight).toBeDefined();
      expect(planningInsight?.message).toContain('Planning Mode is only 0.0%');
    });
  });

  describe('Low CLI Adoption', () => {
    it('shows below 5% threshold', () => {
      const insights = computeFeatureAdoptionInsights(buildData({ cliUsers: 2 }));

      const cliInsight = insights.find((i) => i.title === 'Low CLI Adoption');
      expect(cliInsight).toBeDefined();
      expect(cliInsight?.message).toContain('2.0%');
      expect(cliInsight?.ctaHref).toBe(CLI_DOCS_URL);
    });

    it('should show when CLI usage is exactly 0%', () => {
      const insights = computeFeatureAdoptionInsights(
        buildData({ totalUsers: 1000, cliUsers: 0 })
      );
      const cliInsight = insights.find((i) => i.title === 'Low CLI Adoption');
      expect(cliInsight).toBeDefined();
      expect(cliInsight?.message).toContain('0.0%');
    });

    it('should show when CLI is just below 5%', () => {
      // 49/1000 = 4.9%
      const insights = computeFeatureAdoptionInsights(
        buildData({ totalUsers: 1000, cliUsers: 49 })
      );
      expect(insights.find((i) => i.title === 'Low CLI Adoption')).toBeDefined();
    });

    it('should not show when CLI is exactly 5%', () => {
      // 50/1000 = 5.0%
      const insights = computeFeatureAdoptionInsights(
        buildData({ totalUsers: 1000, cliUsers: 50 })
      );
      expect(insights.find((i) => i.title === 'Low CLI Adoption')).toBeUndefined();
    });

    it('should not show when CLI is above 5%', () => {
      // 100/1000 = 10%
      const insights = computeFeatureAdoptionInsights(
        buildData({ totalUsers: 1000, cliUsers: 100 })
      );
      expect(insights.find((i) => i.title === 'Low CLI Adoption')).toBeUndefined();
    });
  });

  describe('Edge cases and multiple insights', () => {
    it('returns both insights when both conditions are met', () => {
      const insights = computeFeatureAdoptionInsights(
        buildData({ agentModeUsers: 25, planModeUsers: 1, cliUsers: 1 })
      );

      const titles = insights.map((i) => i.title);
      expect(titles).toContain('Promote Planning Mode');
      expect(titles).toContain('Low CLI Adoption');
    });

    it('returns no insights when there are no users', () => {
      const insights = computeFeatureAdoptionInsights(
        buildData({ totalUsers: 0, agentModeUsers: 0, planModeUsers: 0, cliUsers: 0 })
      );

      expect(insights).toEqual([]);
    });

    it('should handle small user bases correctly', () => {
      // totalUsers: 10, agentModeUsers: 2 = 20%, planModeUsers: 0, cliUsers: 0
      // Agent >= 5% and plan < agent*0.3 → planning insight shows
      // CLI 0% < 5% → CLI insight shows
      const insights = computeFeatureAdoptionInsights(
        buildData({ totalUsers: 10, agentModeUsers: 2, planModeUsers: 0, cliUsers: 0 })
      );

      const titles = insights.map((i) => i.title);
      expect(titles).toContain('Promote Planning Mode');
      expect(titles).toContain('Low CLI Adoption');
      expect(insights).toHaveLength(2);
    });
  });
});
