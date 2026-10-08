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
      copilotAppImpactData: [{ ...IMPACT_POINT, locAdded: 18, netChange: 15 }],
      cliImpactData: [{ ...IMPACT_POINT, locAdded: 19, netChange: 16 }],
      joinedImpactData: [{ ...IMPACT_POINT, locAdded: 20, netChange: 17 }],
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

describe('selectCopilotAdoptionReadModel', () => {
  it('selects adoption series with report stats only', () => {
    const metrics = makeFeatureMetrics();

    expect(selectCopilotAdoptionReadModel(metrics)).toEqual({
      vscodeAgentUsage: metrics.adoption.vscodeAgentUsage,
      featureAdoptionData: metrics.adoption.featureAdoptionData,
      stats: metrics.overview.stats,
      dailyAdoptionTrend: metrics.adoption.dailyAdoptionTrend,
      dailyCloudAgentAdoptionData: metrics.adoption.dailyCloudAgentAdoptionData,
      dailyCodeReviewAdoptionData: metrics.adoption.dailyCodeReviewAdoptionData,
    });
  });

  it.each([
    { reported: 3, activeUsers: 7, expected: 3 },
    { reported: undefined, activeUsers: 7, expected: 7 },
    { reported: undefined, activeUsers: null, expected: 0 },
  ])(
    'uses feature adoption VS Code Agents users ($reported) or falls back to the usage summary ($activeUsers)',
    ({ reported, activeUsers, expected }) => {
      const metrics = makeFeatureMetrics();
      metrics.adoption.vscodeAgentUsage.summary.activeUsers = activeUsers;
      if (reported === undefined) {
        Reflect.deleteProperty(metrics.adoption.featureAdoptionData, 'vscodeAgentUsers');
      } else {
        metrics.adoption.featureAdoptionData.vscodeAgentUsers = reported;
      }

      expect(selectCopilotAdoptionReadModel(metrics).featureAdoptionData.vscodeAgentUsers).toBe(expected);
    },
  );

  it('does not mutate the aggregate input when applying the fallback', () => {
    const metrics = makeFeatureMetrics();
    Reflect.deleteProperty(metrics.adoption.featureAdoptionData, 'vscodeAgentUsers');
    const before = structuredClone(metrics);

    selectCopilotAdoptionReadModel(metrics);

    expect(metrics).toEqual(before);
  });
});

describe('selectAiAdoptionPhaseReadModel', () => {
  it('selects only AI adoption phases', () => {
    const metrics = makeFeatureMetrics();

    expect(selectAiAdoptionPhaseReadModel(metrics)).toEqual({ aiAdoptionPhaseData: metrics.ai.aiAdoptionPhaseData });
  });
});

describe('selectCopilotImpactReadModel', () => {
  it('selects every impact series without report stats', () => {
    const metrics = makeFeatureMetrics();

    expect(selectCopilotImpactReadModel(metrics)).toEqual(metrics.impact);
  });
});
