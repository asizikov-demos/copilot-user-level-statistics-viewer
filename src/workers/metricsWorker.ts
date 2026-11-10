import { consumeMultipleMetricsStreams } from '../infra/metricsFileParser';
import {
  accumulateMetrics,
  createMetricsAggregationAccumulator,
  finalizeMetricsAggregation,
} from '../domain/metricsAggregator';
import { computeSingleUserDetailedMetrics } from '../domain/calculators';
import type { UserDetailedMetrics } from '../types/aggregatedMetrics';
import type { UserDetailAccumulator } from '../domain/calculators';
import type { WorkerRequest, WorkerResponse } from './types';

interface WorkerContext {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: WorkerResponse): void;
}

const ctx = globalThis as unknown as WorkerContext;

let storedUserDetailAccumulator: UserDetailAccumulator | null = null;
let lastUserDetails: { userId: number; result: UserDetailedMetrics | null } | null = null;

function postResponse(response: WorkerResponse): void {
  ctx.postMessage(response);
}

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  switch (msg.type) {
    case 'parseAndAggregate': {
      try {
        storedUserDetailAccumulator = null;
        lastUserDetails = null;
        const accumulator = createMetricsAggregationAccumulator();
        const parseResult = await consumeMultipleMetricsStreams(msg.files, metric => {
          accumulateMetrics(accumulator, metric);
        }, (progress) => {
          postResponse({ type: 'parseProgress', id: msg.id, progress });
        });
        if (parseResult.errors.length > 0 && parseResult.recordCount === 0) {
          postResponse({
            type: 'error',
            id: msg.id,
            error: parseResult.errors.map(e => e.error).join('; '),
          });
          break;
        }
        const { aggregated, userDetailAccumulator, enterpriseName, recordCount } =
          finalizeMetricsAggregation(accumulator);
        storedUserDetailAccumulator = userDetailAccumulator;
        postResponse({
          type: 'parseAndAggregateResult',
          id: msg.id,
          result: aggregated,
          enterpriseName,
          recordCount,
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
        if (lastUserDetails?.userId !== msg.userId) {
          lastUserDetails = {
            userId: msg.userId,
            result: computeSingleUserDetailedMetrics(storedUserDetailAccumulator, msg.userId),
          };
        }
        const result = lastUserDetails.result;
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
