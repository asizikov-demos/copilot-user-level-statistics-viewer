import type { CopilotMetrics } from '../types/metrics';
import type { AggregatedMetrics } from '../domain/metricsAggregator';
import type { MultiFileProgress, MultiFileResult } from '../infra/metricsFileParser';

export type WorkerRequest =
  | { type: 'parseFiles'; id: string; files: File[] }
  | { type: 'aggregate'; id: string; metrics: CopilotMetrics[] };

export type WorkerResponse =
  | { type: 'parseProgress'; id: string; progress: MultiFileProgress }
  | { type: 'parseResult'; id: string; result: MultiFileResult }
  | { type: 'aggregateResult'; id: string; result: AggregatedMetrics }
  | { type: 'error'; id: string; error: string };
