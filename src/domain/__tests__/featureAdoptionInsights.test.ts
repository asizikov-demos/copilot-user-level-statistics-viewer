import { describe, it, expect } from 'vitest';
import { computeFeatureAdoptionInsights } from '../featureAdoptionInsights';
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
    it('reports the CLI share and links to the CLI administration docs', () => {
      const insights = computeFeatureAdoptionInsights(buildData({ cliUsers: 2 }));

      const cliInsight = insights.find((i) => i.title === 'Low CLI Adoption');
      expect(cliInsight?.message).toContain('2.0%');
      expect(cliInsight?.ctaHref).toBe(
        'https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/copilot-cli/administer-copilot-cli-for-your-enterprise'
      );
    });

    it.each([
      { cliUsers: 0, shown: true },
      { cliUsers: 49, shown: true },
      { cliUsers: 50, shown: false },
      { cliUsers: 100, shown: false },
    ])('shown=$shown when $cliUsers of 1000 users use the CLI (threshold 5%)', ({ cliUsers, shown }) => {
      const insights = computeFeatureAdoptionInsights(buildData({ totalUsers: 1000, cliUsers }));
      expect(insights.some((i) => i.title === 'Low CLI Adoption')).toBe(shown);
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
