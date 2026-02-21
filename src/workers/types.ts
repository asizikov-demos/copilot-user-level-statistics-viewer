import type { CopilotMetrics } from '../types/metrics';
import type { AggregatedMetrics } from '../domain/metricsAggregator';
import type { UserDetailedMetrics } from '../types/aggregatedMetrics';
import type { MultiFileProgress, MultiFileResult } from '../infra/metricsFileParser';

export type WorkerRequest =
  | { type: 'parseFiles'; id: string; files: File[] }
  | { type: 'aggregate'; id: string; metrics: CopilotMetrics[] }
  | { type: 'parseAndAggregate'; id: string; files: File[] }
  | { type: 'computeUserDetails'; id: string; userId: number };

export type WorkerParseResult = {
  enterpriseName: string | null;
  recordCount: number;
  metrics: MultiFileResult['metrics'];
  errors: MultiFileResult['errors'];
};

export type WorkerResponse =
  | { type: 'parseProgress'; id: string; progress: MultiFileProgress }
  | { type: 'parseResult'; id: string; result: WorkerParseResult }
  | { type: 'aggregateResult'; id: string; result: AggregatedMetrics }
  | ({
      type: 'parseAndAggregateResult';
      id: string;
      result: AggregatedMetrics;
    } & WorkerParseResult)
  | { type: 'userDetailsResult'; id: string; result: UserDetailedMetrics | null }
  | { type: 'error'; id: string; error: string };
