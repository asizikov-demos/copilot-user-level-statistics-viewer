import { parseMultipleMetricsStreams } from '../infra/metricsFileParser';
import { aggregateMetrics } from '../domain/metricsAggregator';
import type { WorkerRequest, WorkerResponse } from './types';

interface WorkerContext {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: WorkerResponse): void;
}

const ctx = globalThis as unknown as WorkerContext;

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
        const result = aggregateMetrics(msg.metrics);
        postResponse({ type: 'aggregateResult', id: msg.id, result });
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
        const aggregated = aggregateMetrics(parseResult.metrics);
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
  }
};
