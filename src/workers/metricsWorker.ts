import { parseMultipleMetricsStreams } from '../infra/metricsFileParser';
import { aggregateMetrics } from '../domain/metricsAggregator';
import { computeSingleUserDetailedMetrics } from '../domain/calculators';
import type { UserDetailAccumulator } from '../domain/calculators';
import type { WorkerRequest, WorkerResponse } from './types';

interface WorkerContext {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: WorkerResponse): void;
}

const ctx = globalThis as unknown as WorkerContext;

let storedUserDetailAccumulator: UserDetailAccumulator | null = null;

function postResponse(response: WorkerResponse): void {
  ctx.postMessage(response);
}

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  switch (msg.type) {
    case 'parseFiles': {
      try {
        const result = await parseMultipleMetricsStreams(msg.files, (progress) => {
          postResponse({ type: 'parseProgress', id: msg.id, progress });
        });
        postResponse({ type: 'parseResult', id: msg.id, result });
      } catch (err) {
        postResponse({
          type: 'error',
          id: msg.id,
          error: err instanceof Error ? err.message : 'Parse failed',
        });
      }
      break;
    }
    case 'aggregate': {
      try {
        storedUserDetailAccumulator = null;
        const { aggregated, userDetailAccumulator } = aggregateMetrics(msg.metrics);
        storedUserDetailAccumulator = userDetailAccumulator;
        postResponse({ type: 'aggregateResult', id: msg.id, result: aggregated });
      } catch (err) {
        postResponse({
          type: 'error',
          id: msg.id,
          error: err instanceof Error ? err.message : 'Aggregation failed',
        });
      }
      break;
    }
    case 'parseAndAggregate': {
      try {
        storedUserDetailAccumulator = null;
        const parseResult = await parseMultipleMetricsStreams(msg.files, (progress) => {
          postResponse({ type: 'parseProgress', id: msg.id, progress });
        });
        if (parseResult.errors.length > 0 && parseResult.metrics.length === 0) {
          postResponse({
            type: 'error',
            id: msg.id,
            error: parseResult.errors.map(e => e.error).join('; '),
          });
          break;
        }
        const { aggregated, userDetailAccumulator } = aggregateMetrics(parseResult.metrics);
        storedUserDetailAccumulator = userDetailAccumulator;
        let enterpriseName: string | null = null;
        if (parseResult.metrics.length > 0) {
          const first = parseResult.metrics[0];
          const loginSuffix = first.user_login?.includes('_')
            ? first.user_login.split('_').pop()?.trim()
            : undefined;
          const enterpriseId = first.enterprise_id.trim();
          enterpriseName = loginSuffix && loginSuffix.length > 0
            ? loginSuffix
            : (enterpriseId.length > 0 ? enterpriseId : null);
        }
        postResponse({
          type: 'parseAndAggregateResult',
          id: msg.id,
          result: aggregated,
          enterpriseName,
          recordCount: parseResult.metrics.length,
          errors: parseResult.errors,
        });
      } catch (err) {
        postResponse({
          type: 'error',
          id: msg.id,
          error: err instanceof Error ? err.message : 'Parse and aggregate failed',
        });
      }
      break;
    }
    case 'computeUserDetails': {
      try {
        if (!storedUserDetailAccumulator) {
          postResponse({ type: 'error', id: msg.id, error: 'No aggregation data available. Aggregate metrics first.' });
          break;
        }
        const result = computeSingleUserDetailedMetrics(storedUserDetailAccumulator, msg.userId);
        postResponse({ type: 'userDetailsResult', id: msg.id, result });
      } catch (err) {
        postResponse({
          type: 'error',
          id: msg.id,
          error: err instanceof Error ? err.message : 'Failed to compute user details',
        });
      }
      break;
    }
    default: {
      const unknown = msg as unknown as { id?: string; type?: string };
      if (unknown.id) {
        postResponse({
          type: 'error',
          id: unknown.id,
          error: `Unknown request type '${unknown.type ?? 'unknown'}'`,
        });
      } else {
        console.warn(`[metricsWorker] Received message with no id and unrecognised type: '${unknown.type ?? 'unknown'}'`);
      }
      break;
    }
  }
};
