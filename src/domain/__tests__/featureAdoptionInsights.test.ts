import { describe, it, expect } from 'vitest';
import { computeFeatureAdoptionInsights } from '../../components/CopilotAdoptionInsights';
import type { MetricsStats } from '../../types/metrics';
import type { FeatureAdoptionData } from '../../domain/calculators/metricCalculators';

function makeStats(overrides: Partial<MetricsStats> = {}): MetricsStats {
  return {
    uniqueUsers: 100,
    cliUsers: 0,
    chatUsers: 50,
    agentUsers: 30,
    completionOnlyUsers: 20,
    reportStartDay: '2024-01-01',
    reportEndDay: '2024-01-15',
    totalRecords: 150,
    topLanguage: { name: 'TypeScript', engagements: 80 },
    topIde: { name: 'VSCode', entries: 60 },
    topModel: { name: 'gpt-4.1', engagements: 90 },
    ...overrides,
  };
}

function makeFeatureAdoptionData(overrides: Partial<FeatureAdoptionData> = {}): FeatureAdoptionData {
  return {
    totalUsers: 100,
    completionUsers: 80,
    completionOnlyUsers: 20,
    chatUsers: 60,
    agentModeUsers: 40,
    askModeUsers: 30,
    editModeUsers: 20,
    inlineModeUsers: 15,
    planModeUsers: 25,
    cliUsers: 10,
    advancedUsers: 45,
    ...overrides,
  };
}

describe('computeFeatureAdoptionInsights', () => {
  it('should return empty array when featureAdoptionData is null', () => {
    const insights = computeFeatureAdoptionInsights(null, makeStats());
    expect(insights).toHaveLength(0);
  });

  it('should return empty array when no thresholds are breached', () => {
    const data = makeFeatureAdoptionData({
      agentModeUsers: 40,
      planModeUsers: 30,
    });
    const stats = makeStats({ cliUsers: 20, uniqueUsers: 100 });
    const insights = computeFeatureAdoptionInsights(data, stats);
    expect(insights).toHaveLength(0);
  });

  describe('Planning Mode gap insight', () => {
    it('should flag planning mode underutilization when plan mode users < 50% of agent mode users', () => {
      const data = makeFeatureAdoptionData({
        agentModeUsers: 40,
        planModeUsers: 10,
      });
      const stats = makeStats({ cliUsers: 20, uniqueUsers: 100 });
      const insights = computeFeatureAdoptionInsights(data, stats);
      const planningInsight = insights.find(i => i.title === 'Planning Mode Underutilized');
      expect(planningInsight).toBeDefined();
      expect(planningInsight!.variant).toBe('orange');
    });

    it('should not flag planning mode when plan mode users >= 50% of agent mode users', () => {
      const data = makeFeatureAdoptionData({
        agentModeUsers: 40,
        planModeUsers: 20,
      });
      const stats = makeStats({ cliUsers: 20, uniqueUsers: 100 });
      const insights = computeFeatureAdoptionInsights(data, stats);
      const planningInsight = insights.find(i => i.title === 'Planning Mode Underutilized');
      expect(planningInsight).toBeUndefined();
    });

    it('should not flag planning mode when there are no agent mode users', () => {
      const data = makeFeatureAdoptionData({
        agentModeUsers: 0,
        planModeUsers: 0,
      });
      const stats = makeStats({ cliUsers: 20, uniqueUsers: 100 });
      const insights = computeFeatureAdoptionInsights(data, stats);
      const planningInsight = insights.find(i => i.title === 'Planning Mode Underutilized');
      expect(planningInsight).toBeUndefined();
    });

    it('should flag planning mode when no users have tried it but agent mode is used', () => {
      const data = makeFeatureAdoptionData({
        agentModeUsers: 20,
        planModeUsers: 0,
      });
      const stats = makeStats({ cliUsers: 20, uniqueUsers: 100 });
      const insights = computeFeatureAdoptionInsights(data, stats);
      const planningInsight = insights.find(i => i.title === 'Planning Mode Underutilized');
      expect(planningInsight).toBeDefined();
    });
  });

  describe('Low CLI Adoption insight', () => {
    it('should flag low CLI adoption when cli usage is below 5%', () => {
      const data = makeFeatureAdoptionData({ cliUsers: 3 });
      const stats = makeStats({ cliUsers: 3, uniqueUsers: 100 });
      const insights = computeFeatureAdoptionInsights(data, stats);
      const cliInsight = insights.find(i => i.title === 'Low CLI Adoption');
      expect(cliInsight).toBeDefined();
      expect(cliInsight!.variant).toBe('orange');
    });

    it('should not flag low CLI adoption when cli usage is exactly 5%', () => {
      const data = makeFeatureAdoptionData({ cliUsers: 5 });
      const stats = makeStats({ cliUsers: 5, uniqueUsers: 100 });
      const insights = computeFeatureAdoptionInsights(data, stats);
      const cliInsight = insights.find(i => i.title === 'Low CLI Adoption');
      expect(cliInsight).toBeUndefined();
    });

    it('should not flag low CLI adoption when cli usage is above 5%', () => {
      const data = makeFeatureAdoptionData({ cliUsers: 10 });
      const stats = makeStats({ cliUsers: 10, uniqueUsers: 100 });
      const insights = computeFeatureAdoptionInsights(data, stats);
      const cliInsight = insights.find(i => i.title === 'Low CLI Adoption');
      expect(cliInsight).toBeUndefined();
    });

    it('should not flag low CLI adoption when there are no CLI users', () => {
      const data = makeFeatureAdoptionData({ cliUsers: 0 });
      const stats = makeStats({ cliUsers: 0, uniqueUsers: 100 });
      const insights = computeFeatureAdoptionInsights(data, stats);
      const cliInsight = insights.find(i => i.title === 'Low CLI Adoption');
      expect(cliInsight).toBeUndefined();
    });

    it('should not flag low CLI adoption when there are no unique users', () => {
      const data = makeFeatureAdoptionData({ cliUsers: 0 });
      const stats = makeStats({ cliUsers: 0, uniqueUsers: 0 });
      const insights = computeFeatureAdoptionInsights(data, stats);
      const cliInsight = insights.find(i => i.title === 'Low CLI Adoption');
      expect(cliInsight).toBeUndefined();
    });
  });

  it('should return multiple insights when multiple thresholds are breached', () => {
    const data = makeFeatureAdoptionData({
      agentModeUsers: 40,
      planModeUsers: 5,
      cliUsers: 2,
    });
    const stats = makeStats({ cliUsers: 2, uniqueUsers: 100 });
    const insights = computeFeatureAdoptionInsights(data, stats);
    expect(insights).toHaveLength(2);
    expect(insights.find(i => i.title === 'Planning Mode Underutilized')).toBeDefined();
    expect(insights.find(i => i.title === 'Low CLI Adoption')).toBeDefined();
  });
});
