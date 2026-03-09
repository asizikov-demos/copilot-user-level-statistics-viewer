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
  it('highlights planning mode opportunity when agent usage is high but planning is low', () => {
    const insights = computeFeatureAdoptionInsights(
      buildData({ agentModeUsers: 30, planModeUsers: 2 })
    );

    const planningInsight = insights.find((i) => i.title === 'Promote Planning Mode');
    expect(planningInsight).toBeDefined();
    expect(planningInsight?.message).toContain('Agent Mode adoption is 30.0%');
    expect(planningInsight?.message).toContain('Planning Mode is only 2.0%');
    expect(planningInsight?.ctaHref).toBe(PLANNING_MODE_DOCS_URL);
  });

  it('does not show planning insight when agent usage is small or planning is comparable', () => {
    expect(
      computeFeatureAdoptionInsights(buildData({ totalUsers: 50, agentModeUsers: 2, planModeUsers: 0, cliUsers: 5 }))
    ).toEqual([]);

    const balancedInsights = computeFeatureAdoptionInsights(
      buildData({ agentModeUsers: 20, planModeUsers: 8, cliUsers: 6 })
    );
    expect(balancedInsights.find((i) => i.title === 'Promote Planning Mode')).toBeUndefined();
  });

  it('surfaces low CLI adoption insight below five percent threshold', () => {
    const insights = computeFeatureAdoptionInsights(buildData({ cliUsers: 2 }));

    const cliInsight = insights.find((i) => i.title === 'Low CLI Adoption');
    expect(cliInsight).toBeDefined();
    expect(cliInsight?.message).toContain('2.0%');
    expect(cliInsight?.ctaHref).toBe(CLI_DOCS_URL);
  });

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
});
