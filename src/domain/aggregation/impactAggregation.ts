import type { AggregatedMetrics } from '../../types/aggregatedMetrics';
import type { CopilotMetrics } from '../../types/metrics';
import {
  accumulateFeatureImpactRecord,
  computeAgentImpactData,
  computeAskModeImpactData,
  computeCliImpactData,
  computeCodeCompletionImpactData,
  computeEditModeImpactData,
  computeInlineModeImpactData,
  computeJoinedImpactData,
  createImpactAccumulator,
  ensureImpactDates,
  type ImpactAccumulator,
} from '../calculators/impactCalculator';

export interface ImpactAggregationAccumulator {
  impact: ImpactAccumulator;
}

export type ImpactAggregationResult = Pick<
  AggregatedMetrics,
  | 'agentImpactData'
  | 'codeCompletionImpactData'
  | 'editModeImpactData'
  | 'inlineModeImpactData'
  | 'askModeImpactData'
  | 'cliImpactData'
  | 'joinedImpactData'
>;

export function createImpactAggregationAccumulator(
): ImpactAggregationAccumulator {
  return {
    impact: createImpactAccumulator(),
  };
}

export function accumulateImpactAggregation(
  accumulator: ImpactAggregationAccumulator,
  metric: CopilotMetrics
): void {
  ensureImpactDates(accumulator.impact, metric.day);
  accumulateFeatureImpactRecord(
    accumulator.impact,
    metric.day,
    metric.user_id,
    metric
  );
}

export function finalizeImpactAggregation(
  accumulator: ImpactAggregationAccumulator
): ImpactAggregationResult {
  return {
    agentImpactData: computeAgentImpactData(accumulator.impact),
    codeCompletionImpactData: computeCodeCompletionImpactData(
      accumulator.impact
    ),
    editModeImpactData: computeEditModeImpactData(accumulator.impact),
    inlineModeImpactData: computeInlineModeImpactData(accumulator.impact),
    askModeImpactData: computeAskModeImpactData(accumulator.impact),
    cliImpactData: computeCliImpactData(accumulator.impact),
    joinedImpactData: computeJoinedImpactData(accumulator.impact),
  };
}
