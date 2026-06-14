import type { AggregatedMetrics } from '../domain/metricsAggregator';
import type { UserDetailedMetrics } from '../types/aggregatedMetrics';
import type { MultiFileProgress, MultiFileResult } from '../infra/metricsFileParser';

export type WorkerRequest =
  | { type: 'parseAndAggregate'; id: string; files: File[] }
  | { type: 'computeUserDetails'; id: string; userId: number };

export type WorkerParseAndAggregateResult = {
  enterpriseName: string | null;
  recordCount: number;
  errors: MultiFileResult['errors'];
};

export type WorkerResponse =
  | { type: 'parseProgress'; id: string; progress: MultiFileProgress }
  | ({ type: 'parseAndAggregateResult'; id: string; result: AggregatedMetrics } & WorkerParseAndAggregateResult)
  | { type: 'userDetailsResult'; id: string; result: UserDetailedMetrics | null }
  | { type: 'error'; id: string; error: string };
