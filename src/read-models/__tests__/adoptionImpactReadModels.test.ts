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
    overview: {
      stats: {
        ...defaults.overview.stats,
        reportStartDay: '2026-01-15',
        reportEndDay: '2026-01-16',
      },
    },
    adoption: {
      featureAdoptionData: {
        ...defaults.adoption.featureAdoptionData,
        totalUsers: 4,
        agentModeUsers: 2,
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
    },
    impact: {
      agentImpactData: [{ ...IMPACT_POINT, locAdded: 13, netChange: 10 }],
      codeCompletionImpactData: [{ ...IMPACT_POINT, locAdded: 14, netChange: 11 }],
      editModeImpactData: [{ ...IMPACT_POINT, locAdded: 15, netChange: 12 }],
      inlineModeImpactData: [{ ...IMPACT_POINT, locAdded: 16, netChange: 13 }],
      askModeImpactData: [{ ...IMPACT_POINT, locAdded: 17, netChange: 14 }],
      cliImpactData: [{ ...IMPACT_POINT, locAdded: 18, netChange: 15 }],
      joinedImpactData: [{ ...IMPACT_POINT, locAdded: 19, netChange: 16 }],
    },
    ai: {
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
    },
  });
}

describe('adoption and impact read models', () => {
  it('selects the exact Copilot adoption shape and preserves every reference', () => {
    const metrics = makeFeatureMetrics();

    const model = selectCopilotAdoptionReadModel(metrics);

    expect(model).toEqual({
      featureAdoptionData: metrics.adoption.featureAdoptionData,
      stats: metrics.overview.stats,
      dailyAdoptionTrend: metrics.adoption.dailyAdoptionTrend,
      dailyCloudAgentAdoptionData: metrics.adoption.dailyCloudAgentAdoptionData,
      dailyCodeReviewAdoptionData: metrics.adoption.dailyCodeReviewAdoptionData,
    });
    expect(model.featureAdoptionData).toBe(metrics.adoption.featureAdoptionData);
    expect(model.stats).toBe(metrics.overview.stats);
    expect(model.dailyAdoptionTrend).toBe(metrics.adoption.dailyAdoptionTrend);
    expect(model.dailyCloudAgentAdoptionData).toBe(metrics.adoption.dailyCloudAgentAdoptionData);
    expect(model.dailyCodeReviewAdoptionData).toBe(metrics.adoption.dailyCodeReviewAdoptionData);
    expect(Object.keys(model)).toEqual([
      'featureAdoptionData',
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
      aiAdoptionPhaseData: metrics.ai.aiAdoptionPhaseData,
    });
    expect(model.aiAdoptionPhaseData).toBe(metrics.ai.aiAdoptionPhaseData);
    expect(Object.keys(model)).toEqual(['aiAdoptionPhaseData']);
    expect(model).not.toHaveProperty('featureAdoptionData');
  });

  it('selects the exact Copilot impact shape and preserves every series reference', () => {
    const metrics = makeFeatureMetrics();

    const model = selectCopilotImpactReadModel(metrics);

    expect(model).toEqual({
      agentImpactData: metrics.impact.agentImpactData,
      codeCompletionImpactData: metrics.impact.codeCompletionImpactData,
      editModeImpactData: metrics.impact.editModeImpactData,
      inlineModeImpactData: metrics.impact.inlineModeImpactData,
      askModeImpactData: metrics.impact.askModeImpactData,
      cliImpactData: metrics.impact.cliImpactData,
      joinedImpactData: metrics.impact.joinedImpactData,
    });
    expect(model.agentImpactData).toBe(metrics.impact.agentImpactData);
    expect(model.codeCompletionImpactData).toBe(metrics.impact.codeCompletionImpactData);
    expect(model.editModeImpactData).toBe(metrics.impact.editModeImpactData);
    expect(model.inlineModeImpactData).toBe(metrics.impact.inlineModeImpactData);
    expect(model.askModeImpactData).toBe(metrics.impact.askModeImpactData);
    expect(model.cliImpactData).toBe(metrics.impact.cliImpactData);
    expect(model.joinedImpactData).toBe(metrics.impact.joinedImpactData);
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

    expect(adoption.dailyAdoptionTrend).toBe(metrics.adoption.dailyAdoptionTrend);
    expect(adoption.dailyCloudAgentAdoptionData).toBe(metrics.adoption.dailyCloudAgentAdoptionData);
    expect(adoption.dailyCodeReviewAdoptionData).toBe(metrics.adoption.dailyCodeReviewAdoptionData);
    expect(phases.aiAdoptionPhaseData).toBe(metrics.ai.aiAdoptionPhaseData);
    expect(Object.values(impact)).toEqual([
      metrics.impact.agentImpactData,
      metrics.impact.codeCompletionImpactData,
      metrics.impact.editModeImpactData,
      metrics.impact.inlineModeImpactData,
      metrics.impact.askModeImpactData,
      metrics.impact.cliImpactData,
      metrics.impact.joinedImpactData,
    ]);
    expect([
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
