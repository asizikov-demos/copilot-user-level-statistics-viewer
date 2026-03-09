import { describe, it, expect } from 'vitest';
import { computeFeatureAdoptionInsights } from '../../components/FeatureAdoptionInsights';
import type { FeatureAdoptionData } from '../calculators/metricCalculators';

describe('computeFeatureAdoptionInsights', () => {
  const createTestData = (overrides?: Partial<FeatureAdoptionData>): FeatureAdoptionData => ({
    totalUsers: 1000,
    completionUsers: 800,
    completionOnlyUsers: 200,
    chatUsers: 600,
    agentModeUsers: 300,
    askModeUsers: 400,
    editModeUsers: 200,
    inlineModeUsers: 150,
    planModeUsers: 50,
    cliUsers: 100,
    advancedUsers: 350,
    ...overrides,
  });

  describe('Planning Mode Opportunity insight', () => {
    it('should show Planning Mode insight when Agent Mode usage is high and Planning Mode usage is low', () => {
      const data = createTestData({
        totalUsers: 1000,
        agentModeUsers: 200, // 20%
        planModeUsers: 40,   // 4% (less than 30% of agent mode)
      });

      const insights = computeFeatureAdoptionInsights(data);

      const planningInsight = insights.find(i => i.title === 'Planning Mode Opportunity');
      expect(planningInsight).toBeDefined();
      expect(planningInsight?.variant).toBe('purple');
    });

    it('should show Planning Mode insight when there is a large gap', () => {
      const data = createTestData({
        totalUsers: 1000,
        agentModeUsers: 100, // 10%
        planModeUsers: 10,   // 1% (10% of agent mode - below 30% threshold)
      });

      const insights = computeFeatureAdoptionInsights(data);

      const planningInsight = insights.find(i => i.title === 'Planning Mode Opportunity');
      expect(planningInsight).toBeDefined();
    });

    it('should not show Planning Mode insight when Agent Mode usage is too low', () => {
      const data = createTestData({
        totalUsers: 1000,
        agentModeUsers: 30,  // 3% (below 5% threshold)
        planModeUsers: 5,    // 0.5%
      });

      const insights = computeFeatureAdoptionInsights(data);

      const planningInsight = insights.find(i => i.title === 'Planning Mode Opportunity');
      expect(planningInsight).toBeUndefined();
    });

    it('should not show Planning Mode insight when Planning Mode usage is proportional', () => {
      const data = createTestData({
        totalUsers: 1000,
        agentModeUsers: 200, // 20%
        planModeUsers: 80,   // 8% (40% of agent mode - above 30% threshold)
      });

      const insights = computeFeatureAdoptionInsights(data);

      const planningInsight = insights.find(i => i.title === 'Planning Mode Opportunity');
      expect(planningInsight).toBeUndefined();
    });

    it('should not show Planning Mode insight when Planning Mode is higher than threshold', () => {
      const data = createTestData({
        totalUsers: 1000,
        agentModeUsers: 100, // 10%
        planModeUsers: 50,   // 5% (50% of agent mode)
      });

      const insights = computeFeatureAdoptionInsights(data);

      const planningInsight = insights.find(i => i.title === 'Planning Mode Opportunity');
      expect(planningInsight).toBeUndefined();
    });
  });

  describe('Low CLI Adoption insight', () => {
    it('should show Low CLI Adoption insight when CLI usage is below 5%', () => {
      const data = createTestData({
        totalUsers: 1000,
        cliUsers: 30, // 3%
      });

      const insights = computeFeatureAdoptionInsights(data);

      const cliInsight = insights.find(i => i.title === 'Low CLI Adoption');
      expect(cliInsight).toBeDefined();
      expect(cliInsight?.variant).toBe('orange');
    });

    it('should show Low CLI Adoption insight when CLI usage is exactly 0%', () => {
      const data = createTestData({
        totalUsers: 1000,
        cliUsers: 0,
      });

      const insights = computeFeatureAdoptionInsights(data);

      const cliInsight = insights.find(i => i.title === 'Low CLI Adoption');
      expect(cliInsight).toBeDefined();
    });

    it('should show Low CLI Adoption insight when CLI usage is just below 5%', () => {
      const data = createTestData({
        totalUsers: 1000,
        cliUsers: 49, // 4.9%
      });

      const insights = computeFeatureAdoptionInsights(data);

      const cliInsight = insights.find(i => i.title === 'Low CLI Adoption');
      expect(cliInsight).toBeDefined();
    });

    it('should not show Low CLI Adoption insight when CLI usage is 5% or higher', () => {
      const data = createTestData({
        totalUsers: 1000,
        cliUsers: 50, // 5%
      });

      const insights = computeFeatureAdoptionInsights(data);

      const cliInsight = insights.find(i => i.title === 'Low CLI Adoption');
      expect(cliInsight).toBeUndefined();
    });

    it('should not show Low CLI Adoption insight when CLI usage is above 5%', () => {
      const data = createTestData({
        totalUsers: 1000,
        cliUsers: 100, // 10%
      });

      const insights = computeFeatureAdoptionInsights(data);

      const cliInsight = insights.find(i => i.title === 'Low CLI Adoption');
      expect(cliInsight).toBeUndefined();
    });
  });

  describe('Multiple insights', () => {
    it('should show both insights when both conditions are met', () => {
      const data = createTestData({
        totalUsers: 1000,
        agentModeUsers: 200, // 20%
        planModeUsers: 40,   // 4%
        cliUsers: 30,        // 3%
      });

      const insights = computeFeatureAdoptionInsights(data);

      expect(insights).toHaveLength(2);
      expect(insights.find(i => i.title === 'Planning Mode Opportunity')).toBeDefined();
      expect(insights.find(i => i.title === 'Low CLI Adoption')).toBeDefined();
    });

    it('should show no insights when conditions are not met', () => {
      const data = createTestData({
        totalUsers: 1000,
        agentModeUsers: 200, // 20%
        planModeUsers: 80,   // 8%
        cliUsers: 100,       // 10%
      });

      const insights = computeFeatureAdoptionInsights(data);

      expect(insights).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should return empty array when totalUsers is 0', () => {
      const data = createTestData({
        totalUsers: 0,
        agentModeUsers: 0,
        planModeUsers: 0,
        cliUsers: 0,
      });

      const insights = computeFeatureAdoptionInsights(data);

      expect(insights).toHaveLength(0);
    });

    it('should handle small user bases correctly', () => {
      const data = createTestData({
        totalUsers: 10,
        agentModeUsers: 2, // 20%
        planModeUsers: 0,  // 0%
        cliUsers: 0,       // 0%
      });

      const insights = computeFeatureAdoptionInsights(data);

      expect(insights).toHaveLength(2); // Both insights should appear
    });
  });
});
