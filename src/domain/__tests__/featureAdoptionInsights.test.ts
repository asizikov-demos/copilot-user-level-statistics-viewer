import { describe, it, expect } from 'vitest';
import {
  computeFeatureAdoptionInsights,
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
  inlineModeUsers: 0,
  planModeUsers: 0,
  cliUsers: 0,
  appUsers: 0,
  vscodeAgentUsers: 0,
  codingAgentUsers: 0,
  codeReviewUsers: 0,
  advancedUsers: 0,
};

function buildData(overrides: Partial<FeatureAdoptionData>): FeatureAdoptionData {
  return { ...baseFeatureAdoption, ...overrides };
}

describe('computeFeatureAdoptionInsights', () => {
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

  describe('Edge cases', () => {
    it('returns only the CLI insight when planning usage is low', () => {
      const insights = computeFeatureAdoptionInsights(
        buildData({ agentModeUsers: 25, planModeUsers: 1, cliUsers: 1 })
      );

      const titles = insights.map((i) => i.title);
      expect(titles).toContain('Low CLI Adoption');
      expect(insights).toHaveLength(1);
    });

    it('returns no insights when there are no users', () => {
      const insights = computeFeatureAdoptionInsights(
        buildData({ totalUsers: 0, agentModeUsers: 0, planModeUsers: 0, cliUsers: 0 })
      );

      expect(insights).toEqual([]);
    });

    it('should handle small user bases correctly', () => {
      const insights = computeFeatureAdoptionInsights(
        buildData({ totalUsers: 10, agentModeUsers: 2, planModeUsers: 0, cliUsers: 0 })
      );

      const titles = insights.map((i) => i.title);
      expect(titles).toContain('Low CLI Adoption');
      expect(insights).toHaveLength(1);
    });
  });
});
