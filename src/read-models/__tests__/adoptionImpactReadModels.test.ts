import { describe, expect, it } from 'vitest';
import { makeAggregatedMetrics } from '../../__tests__/factories/aggregatedMetrics';
import type { AggregatedMetrics } from '../../types/aggregatedMetrics';
import {
  selectCopilotAdoptionReadModel,
} from '../adoption';
import {
  selectAiAdoptionPhaseReadModel,
} from '../aiAdoptionPhases';
import { selectCopilotImpactReadModel } from '../impact';

const IMPACT_POINT = {
  date: '2026-01-15',
  locAdded: 12,
  locDeleted: 3,
  netChange: 9,
  userCount: 2,
  totalUniqueUsers: 4,
};

function makeFeatureMetrics(): AggregatedMetrics {
  const defaults = makeAggregatedMetrics();

  return makeAggregatedMetrics({
    featureAdoptionData: {
      ...defaults.featureAdoptionData,
      totalUsers: 4,
      agentModeUsers: 2,
    },
    agentModeHeatmapData: [{
      date: '2026-01-15',
      agentModeRequests: 8,
      uniqueUsers: 2,
      intensity: 4,
    }],
    stats: {
      ...defaults.stats,
      reportStartDay: '2026-01-15',
      reportEndDay: '2026-01-16',
    },
    dailyAdoptionTrend: [{
      date: '2026-01-15',
      newUsers: 2,
      returningUsers: 1,
      totalActiveUsers: 3,
      cumulativeUsers: 4,
    }],
    dailyCloudAgentAdoptionData: [{
      date: '2026-01-15',
      uniqueUsers: 1,
    }],
    dailyCodeReviewAdoptionData: [{
      date: '2026-01-15',
      activeUsers: 1,
      passiveUsers: 1,
      totalUsers: 2,
    }],
    aiAdoptionPhaseData: [{
      phase: {
        phase_number: 2,
        phase: 'Phase 2',
        version: 'v1',
      },
      userCount: 2,
      avgUserInitiatedInteractions: 5,
      totalLocAdded: 20,
      totalLocDeleted: 4,
      avgLocAdded: 10,
      avgLocDeleted: 2,
      avgAiCreditsUsed: 1.5,
      avgDaysActive: 3,
      topModels: [{ name: 'gpt-4.1', total: 8, uniqueUsers: 2 }],
      topClients: [{ name: 'vscode', total: 7, uniqueUsers: 2 }],
      topLanguages: [{ name: 'typescript', total: 6, uniqueUsers: 2 }],
    }],
    agentImpactData: [{ ...IMPACT_POINT, locAdded: 13, netChange: 10 }],
    codeCompletionImpactData: [{ ...IMPACT_POINT, locAdded: 14, netChange: 11 }],
    editModeImpactData: [{ ...IMPACT_POINT, locAdded: 15, netChange: 12 }],
    inlineModeImpactData: [{ ...IMPACT_POINT, locAdded: 16, netChange: 13 }],
    askModeImpactData: [{ ...IMPACT_POINT, locAdded: 17, netChange: 14 }],
    cliImpactData: [{ ...IMPACT_POINT, locAdded: 18, netChange: 15 }],
    joinedImpactData: [{ ...IMPACT_POINT, locAdded: 19, netChange: 16 }],
  });
}

describe('adoption and impact read models', () => {
  it('selects the exact Copilot adoption shape and preserves every reference', () => {
    const metrics = makeFeatureMetrics();

    const model = selectCopilotAdoptionReadModel(metrics);

    expect(model).toEqual({
      featureAdoptionData: metrics.featureAdoptionData,
      agentModeHeatmapData: metrics.agentModeHeatmapData,
      stats: metrics.stats,
      dailyAdoptionTrend: metrics.dailyAdoptionTrend,
      dailyCloudAgentAdoptionData: metrics.dailyCloudAgentAdoptionData,
      dailyCodeReviewAdoptionData: metrics.dailyCodeReviewAdoptionData,
    });
    expect(model.featureAdoptionData).toBe(metrics.featureAdoptionData);
    expect(model.agentModeHeatmapData).toBe(metrics.agentModeHeatmapData);
    expect(model.stats).toBe(metrics.stats);
    expect(model.dailyAdoptionTrend).toBe(metrics.dailyAdoptionTrend);
    expect(model.dailyCloudAgentAdoptionData).toBe(metrics.dailyCloudAgentAdoptionData);
    expect(model.dailyCodeReviewAdoptionData).toBe(metrics.dailyCodeReviewAdoptionData);
    expect(Object.keys(model)).toEqual([
      'featureAdoptionData',
      'agentModeHeatmapData',
      'stats',
      'dailyAdoptionTrend',
      'dailyCloudAgentAdoptionData',
      'dailyCodeReviewAdoptionData',
    ]);
    expect(model).not.toHaveProperty('userSummaries');
  });

  it('selects the exact AI adoption phase shape without copying it', () => {
    const metrics = makeFeatureMetrics();

    const model = selectAiAdoptionPhaseReadModel(metrics);

    expect(model).toEqual({
      aiAdoptionPhaseData: metrics.aiAdoptionPhaseData,
    });
    expect(model.aiAdoptionPhaseData).toBe(metrics.aiAdoptionPhaseData);
    expect(Object.keys(model)).toEqual(['aiAdoptionPhaseData']);
    expect(model).not.toHaveProperty('featureAdoptionData');
  });

  it('selects the exact Copilot impact shape and preserves every series reference', () => {
    const metrics = makeFeatureMetrics();

    const model = selectCopilotImpactReadModel(metrics);

    expect(model).toEqual({
      agentImpactData: metrics.agentImpactData,
      codeCompletionImpactData: metrics.codeCompletionImpactData,
      editModeImpactData: metrics.editModeImpactData,
      inlineModeImpactData: metrics.inlineModeImpactData,
      askModeImpactData: metrics.askModeImpactData,
      cliImpactData: metrics.cliImpactData,
      joinedImpactData: metrics.joinedImpactData,
    });
    expect(model.agentImpactData).toBe(metrics.agentImpactData);
    expect(model.codeCompletionImpactData).toBe(metrics.codeCompletionImpactData);
    expect(model.editModeImpactData).toBe(metrics.editModeImpactData);
    expect(model.inlineModeImpactData).toBe(metrics.inlineModeImpactData);
    expect(model.askModeImpactData).toBe(metrics.askModeImpactData);
    expect(model.cliImpactData).toBe(metrics.cliImpactData);
    expect(model.joinedImpactData).toBe(metrics.joinedImpactData);
    expect(Object.keys(model)).toEqual([
      'agentImpactData',
      'codeCompletionImpactData',
      'editModeImpactData',
      'inlineModeImpactData',
      'askModeImpactData',
      'cliImpactData',
      'joinedImpactData',
    ]);
    expect(model).not.toHaveProperty('stats');
  });

  it('preserves canonical empty arrays', () => {
    const metrics = makeAggregatedMetrics();

    const adoption = selectCopilotAdoptionReadModel(metrics);
    const phases = selectAiAdoptionPhaseReadModel(metrics);
    const impact = selectCopilotImpactReadModel(metrics);

    expect(adoption.agentModeHeatmapData).toBe(metrics.agentModeHeatmapData);
    expect(adoption.dailyAdoptionTrend).toBe(metrics.dailyAdoptionTrend);
    expect(adoption.dailyCloudAgentAdoptionData).toBe(metrics.dailyCloudAgentAdoptionData);
    expect(adoption.dailyCodeReviewAdoptionData).toBe(metrics.dailyCodeReviewAdoptionData);
    expect(phases.aiAdoptionPhaseData).toBe(metrics.aiAdoptionPhaseData);
    expect(Object.values(impact)).toEqual([
      metrics.agentImpactData,
      metrics.codeCompletionImpactData,
      metrics.editModeImpactData,
      metrics.inlineModeImpactData,
      metrics.askModeImpactData,
      metrics.cliImpactData,
      metrics.joinedImpactData,
    ]);
    expect([
      adoption.agentModeHeatmapData,
      adoption.dailyAdoptionTrend,
      adoption.dailyCloudAgentAdoptionData,
      adoption.dailyCodeReviewAdoptionData,
      phases.aiAdoptionPhaseData,
      ...Object.values(impact),
    ].every((series) => series.length === 0)).toBe(true);
  });

  it('does not mutate the aggregate input', () => {
    const metrics = makeFeatureMetrics();
    const before = structuredClone(metrics);

    selectCopilotAdoptionReadModel(metrics);
    selectAiAdoptionPhaseReadModel(metrics);
    selectCopilotImpactReadModel(metrics);

    expect(metrics).toEqual(before);
  });
});
