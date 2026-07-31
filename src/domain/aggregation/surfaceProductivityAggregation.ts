import type { CopilotMetrics } from '../../types/metrics';
import type { SurfaceProductivityMetrics } from '../../types/surfaceProductivity';
import {
  accumulateSurfaceProductivity,
  createSurfaceProductivityAccumulator,
  finalizeSurfaceProductivity,
  type SurfaceProductivityAccumulator,
} from '../calculators/surfaceProductivityCalculator';

export interface SurfaceProductivityAggregationAccumulator {
  productivity: SurfaceProductivityAccumulator;
}

export type SurfaceProductivityAggregationResult = SurfaceProductivityMetrics;

export function createSurfaceProductivityAggregationAccumulator(
): SurfaceProductivityAggregationAccumulator {
  return {
    productivity: createSurfaceProductivityAccumulator(),
  };
}

export function accumulateSurfaceProductivityAggregation(
  accumulator: SurfaceProductivityAggregationAccumulator,
  metric: CopilotMetrics
): void {
  accumulateSurfaceProductivity(accumulator.productivity, metric);
}

export function finalizeSurfaceProductivityAggregation(
  accumulator: SurfaceProductivityAggregationAccumulator
): SurfaceProductivityAggregationResult {
  return finalizeSurfaceProductivity(accumulator.productivity);
}
