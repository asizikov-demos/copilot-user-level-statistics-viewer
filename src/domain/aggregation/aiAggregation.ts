import type { AiMetricsSlice } from '../../types/aggregatedMetrics';
import type { CopilotMetrics, UserSummary } from '../../types/metrics';
import {
  accumulateAiAdoptionPhase,
  computeAiAdoptionPhaseData,
  createAiAdoptionPhaseAccumulator,
  type AiAdoptionPhaseAccumulator,
} from '../calculators/aiAdoptionPhaseCalculator';
import {
  accumulateAiCredits,
  computeAiCreditsSummary,
  computeDailyAiCreditsData,
  createAiCreditsAccumulator,
  type AiCreditsAccumulator,
} from '../calculators/aiCreditsCalculator';
import {
  computeUsageDistributionData,
} from '../calculators/usageDistributionCalculator';

export interface AiAggregationAccumulator {
  adoptionPhase: AiAdoptionPhaseAccumulator;
  credits: AiCreditsAccumulator;
}

export type AiAggregationResult = AiMetricsSlice;

export function createAiAggregationAccumulator(): AiAggregationAccumulator {
  return {
    adoptionPhase: createAiAdoptionPhaseAccumulator(),
    credits: createAiCreditsAccumulator(),
  };
}

export function accumulateAiAggregation(
  accumulator: AiAggregationAccumulator,
  metric: CopilotMetrics
): void {
  accumulateAiAdoptionPhase(accumulator.adoptionPhase, metric);
  accumulateAiCredits(accumulator.credits, metric);
}

export function finalizeAiAggregation(
  accumulator: AiAggregationAccumulator,
  userSummaries: UserSummary[],
): AiAggregationResult {
  const dailyAiCreditsData = computeDailyAiCreditsData(accumulator.credits);
  return {
    creditsSummary: computeAiCreditsSummary(userSummaries, dailyAiCreditsData),
    aiAdoptionPhaseData: computeAiAdoptionPhaseData(accumulator.adoptionPhase),
    usageDistributionData: computeUsageDistributionData(accumulator.adoptionPhase),
    dailyAiCreditsData,
  };
}
