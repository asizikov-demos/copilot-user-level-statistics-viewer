import type { CopilotMetrics } from '../../types/metrics';
import {
  accumulateUserDetail,
  createUserDetailAccumulator,
  type UserDetailAccumulator,
} from '../calculators/userDetailCalculator';

export type { UserDetailAccumulator } from '../calculators/userDetailCalculator';

export interface UserDetailAggregationAccumulator {
  detail: UserDetailAccumulator;
  hasRecords: boolean;
}

export function createUserDetailAggregationAccumulator(
): UserDetailAggregationAccumulator {
  return {
    detail: createUserDetailAccumulator(),
    hasRecords: false,
  };
}

export function accumulateUserDetailAggregation(
  accumulator: UserDetailAggregationAccumulator,
  metric: CopilotMetrics,
  usedCopilotCloudAgent: boolean
): void {
  if (!accumulator.hasRecords) {
    accumulator.detail.reportStartDay = metric.report_start_day;
    accumulator.detail.reportEndDay = metric.report_end_day;
    accumulator.hasRecords = true;
  }

  accumulateUserDetail(
    accumulator.detail,
    metric,
    usedCopilotCloudAgent
  );
}

export function finalizeUserDetailAggregation(
  accumulator: UserDetailAggregationAccumulator
): UserDetailAccumulator {
  return accumulator.detail;
}
