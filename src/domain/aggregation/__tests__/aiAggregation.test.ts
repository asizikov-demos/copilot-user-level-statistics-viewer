import { describe, expect, it } from 'vitest';
import { makeMetric } from '../../../__tests__/factories/metrics';
import {
  makeCliTotals,
  makeIdeTotal,
  makeLanguageFeatureTotal,
  makeModelFeatureTotal,
} from '../../../__tests__/factories/metricTotals';
import type { CopilotMetrics } from '../../../types/metrics';
import {
  accumulateAiAggregation,
  createAiAggregationAccumulator,
  finalizeAiAggregation,
} from '../aiAggregation';

function finalizeAi(metrics: Partial<CopilotMetrics>[]) {
  const accumulator = createAiAggregationAccumulator();
  for (const metric of metrics) {
    accumulateAiAggregation(accumulator, makeMetric(metric));
  }
  return finalizeAiAggregation(accumulator);
}

const phase1 = { phase_number: 1, phase: 'Phase 1', version: 'v1' };
const phase2 = { phase_number: 2, phase: 'Phase 2', version: 'v1' };
const askMode = (model: string, interactions: number) =>
  makeModelFeatureTotal(model, 'chat_panel_ask_mode', interactions);
const completion = (language: string, generations: number, acceptances: number) =>
  makeLanguageFeatureTotal(language, 'code_completion', {
    code_generation_activity_count: generations,
    code_acceptance_activity_count: acceptances,
  });

describe('AI aggregation', () => {
  it('preserves latest-day phases, usage-distribution order, and daily credit totals', () => {
    const accumulator = createAiAggregationAccumulator();
    accumulateAiAggregation(accumulator, makeMetric({
      day: '2024-01-16',
      user_id: 1,
      ai_credits_used: 7,
      ai_adoption_phase: {
        phase_number: 2,
        phase: 'Accelerating',
        version: 'v2',
      },
    }));
    accumulateAiAggregation(accumulator, makeMetric({
      day: '2024-01-15',
      user_id: 1,
      ai_credits_used: 5,
      ai_adoption_phase: {
        phase_number: 1,
        phase: 'Exploring',
        version: 'v1',
      },
    }));
    accumulateAiAggregation(accumulator, makeMetric({
      day: '2024-01-15',
      user_id: 2,
      ai_credits_used: 2,
    }));

    const result = finalizeAiAggregation(accumulator);

    expect(result.aiAdoptionPhaseData.map(data => ({
      phase: data.phase.phase_number,
      users: data.userCount,
      credits: data.avgAiCreditsUsed,
    }))).toEqual([
      { phase: 2, users: 1, credits: 12 },
      { phase: -1, users: 1, credits: 2 },
    ]);
    expect(result.usageDistributionData.map(bucket => bucket.id)).toEqual([
      'power',
      'heavy',
      'typical',
      'light',
    ]);
    expect(result.usageDistributionData.map(bucket => bucket.userCount)).toEqual([
      0,
      0,
      2,
      0,
    ]);
    expect(result.dailyAiCreditsData).toEqual([
      { date: '2024-01-15', aiCreditsUsed: 7, users: 2 },
      { date: '2024-01-16', aiCreditsUsed: 7, users: 1 },
    ]);
  });

  it('sums daily AI credits across users without float drift', () => {
    const result = finalizeAi([
      { user_id: 1, day: '2024-01-15', ai_credits_used: 55.053015 },
      { user_id: 2, day: '2024-01-15', ai_credits_used: 4.946985 },
    ]);

    expect(result.dailyAiCreditsData[0].aiCreditsUsed).toBeCloseTo(60);
    expect(result.dailyAiCreditsData[0].users).toBe(2);
  });

  it('aggregates per-phase metrics and top dimensions per user phase', () => {
    const result = finalizeAi([
      {
        user_id: 1,
        day: '2024-01-15',
        user_initiated_interaction_count: 10,
        loc_added_sum: 100,
        loc_deleted_sum: 10,
        ai_credits_used: 10,
        ai_adoption_phase: phase1,
        totals_by_ide: [makeIdeTotal('vscode', 10)],
        totals_by_model_feature: [askMode('gpt-4o', 8)],
        totals_by_language_feature: [completion('typescript', 5, 1)],
      },
      {
        user_id: 1,
        day: '2024-01-16',
        user_initiated_interaction_count: 20,
        loc_added_sum: 50,
        loc_deleted_sum: 5,
        ai_credits_used: 20,
        ai_adoption_phase: phase1,
        totals_by_ide: [makeIdeTotal('vscode', 4)],
        totals_by_model_feature: [askMode('claude-sonnet-4.6', 15)],
        totals_by_language_feature: [completion('python', 7, 3)],
      },
      {
        user_id: 2,
        day: '2024-01-15',
        user_initiated_interaction_count: 10,
        loc_added_sum: 50,
        loc_deleted_sum: 5,
        ai_credits_used: 50,
        ai_adoption_phase: phase1,
        totals_by_ide: [makeIdeTotal('vscode', 3)],
        totals_by_model_feature: [askMode('gpt-4o', 20)],
        totals_by_language_feature: [completion('typescript', 10, 2)],
      },
      {
        user_id: 3,
        day: '2024-01-15',
        user_initiated_interaction_count: 5,
        ai_credits_used: 5,
        ai_adoption_phase: phase2,
        totals_by_ide: [makeIdeTotal('intellij', 7)],
      },
    ]);

    expect(result.aiAdoptionPhaseData).toHaveLength(2);
    expect(result.aiAdoptionPhaseData.find(data => data.phase.phase_number === 1)).toMatchObject({
      userCount: 2,
      avgUserInitiatedInteractions: 20,
      totalLocAdded: 200,
      totalLocDeleted: 20,
      avgLocAdded: 100,
      avgLocDeleted: 10,
      avgAiCreditsUsed: 40,
      avgDaysActive: 1.5,
      topModels: [
        { name: 'gpt-4o', total: 28, uniqueUsers: 2 },
        { name: 'claude-sonnet-4.6', total: 15, uniqueUsers: 1 },
      ],
      topClients: [{ name: 'vscode', total: 17, uniqueUsers: 2 }],
      topLanguages: [
        { name: 'typescript', total: 18, uniqueUsers: 2 },
        { name: 'python', total: 10, uniqueUsers: 1 },
      ],
    });
    expect(result.aiAdoptionPhaseData.find(data => data.phase.phase_number === 2)).toMatchObject({
      userCount: 1,
      avgUserInitiatedInteractions: 5,
      avgAiCreditsUsed: 5,
      topClients: [{ name: 'intellij', total: 7, uniqueUsers: 1 }],
    });
  });

  it('does not fall back to CLI request counts when the prompt count is zero', () => {
    const result = finalizeAi([
      {
        ai_adoption_phase: phase1,
        totals_by_cli: makeCliTotals({ session_count: 2, request_count: 4, prompt_count: 0 }),
      },
    ]);

    expect(result.aiAdoptionPhaseData[0].topClients).toEqual([]);
  });
});
