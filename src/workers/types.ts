import type { CopilotMetrics } from '../types/metrics';
import type { AggregatedMetrics } from '../domain/metricsAggregator';
import type { MultiFileProgress, MultiFileResult } from '../infra/metricsFileParser';

export type WorkerRequest =
  | { type: 'parseFiles'; id: string; files: File[] }
  | { type: 'aggregate'; id: string; metrics: CopilotMetrics[] }
  | { type: 'parseAndAggregate'; id: string; files: File[] };

export type WorkerResponse =
  | { type: 'parseProgress'; id: string; progress: MultiFileProgress }
  | { type: 'parseResult'; id: string; result: MultiFileResult }
  | { type: 'aggregateResult'; id: string; result: AggregatedMetrics }
  | { type: 'parseAndAggregateResult'; id: string; result: AggregatedMetrics; enterpriseName: string | null; recordCount: number }
  | { type: 'error'; id: string; error: string };
