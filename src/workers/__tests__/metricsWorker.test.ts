import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AGGREGATED_METRICS_SLICE_KEYS,
  FORMER_FLAT_AGGREGATE_KEYS,
} from '../../__tests__/factories/aggregatedMetrics';
import { makeMetric } from '../../__tests__/factories/metrics';
import type { WorkerRequest, WorkerResponse } from '../types';

const encoder = new TextEncoder();

type WorkerHost = typeof globalThis & {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void | Promise<void>) | null;
  postMessage?: (message: WorkerResponse) => void;
};

function createChunkedFile(chunks: string[], name: string): File {
  const file = new File([''], name, { type: 'application/x-ndjson' });
  const encodedChunks = chunks.map(chunk => encoder.encode(chunk));

  Object.defineProperty(file, 'stream', {
    value: () =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of encodedChunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      }),
  });

  return file;
}

function createFailingFile(name: string, error: Error): File {
  const file = new File([''], name, { type: 'application/x-ndjson' });

  Object.defineProperty(file, 'stream', {
    value: () =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.error(error);
        },
      }),
  });

  return file;
}

async function loadWorker() {
  vi.resetModules();

  const host = globalThis as WorkerHost;
  const responses: WorkerResponse[] = [];
  host.postMessage = (message: WorkerResponse) => {
    responses.push(message);
  };

  await import('../metricsWorker');

  const send = async (message: WorkerRequest) => {
    expect(host.onmessage).toBeTypeOf('function');
    await host.onmessage!({ data: message } as MessageEvent<WorkerRequest>);
  };

  return { responses, send };
}

describe('metricsWorker protocol', () => {
  let originalPostMessage: WorkerHost['postMessage'];
  let originalOnMessage: WorkerHost['onmessage'];

  beforeEach(() => {
    const host = globalThis as WorkerHost;
    originalPostMessage = host.postMessage;
    originalOnMessage = host.onmessage;
  });

  afterEach(() => {
    const host = globalThis as WorkerHost;
    host.postMessage = originalPostMessage;
    host.onmessage = originalOnMessage;
  });

  it('rejects user-detail requests until parse-and-aggregate has retained an accumulator', async () => {
    const { responses, send } = await loadWorker();

    await send({ type: 'computeUserDetails', id: 'details-before-aggregation', userId: 1 });

    expect(responses).toEqual([
      {
        type: 'error',
        id: 'details-before-aggregation',
        error: 'No aggregation data available. Aggregate metrics first.',
      },
    ]);
  });

  it('streams progress, returns partial file errors, and serves user details from the retained accumulator', async () => {
    const metric = makeMetric({
      enterprise_id: 'enterprise-from-id',
      user_id: 42,
      user_login: 'octocat_acme',
      user_initiated_interaction_count: 12,
      ai_credits_used: 3.5,
      totals_by_model_feature: [
        {
          model: 'gpt-4o',
          feature: 'chat_panel_ask_mode',
          user_initiated_interaction_count: 9,
          code_generation_activity_count: 0,
          code_acceptance_activity_count: 0,
          loc_added_sum: 0,
          loc_deleted_sum: 0,
          loc_suggested_to_add_sum: 0,
          loc_suggested_to_delete_sum: 0,
        },
      ],
    });
    const successfulFile = createChunkedFile([`${JSON.stringify(metric)}\n`], 'good.ndjson');
    const failedFile = createFailingFile('bad.ndjson', new Error('bad file stream'));
    const { responses, send } = await loadWorker();

    await send({ type: 'parseAndAggregate', id: 'parse-1', files: [successfulFile, failedFile] });

    const parseResult = responses.find(
      (response): response is Extract<WorkerResponse, { type: 'parseAndAggregateResult' }> =>
        response.type === 'parseAndAggregateResult'
    );
    expect(responses[0]).toEqual({
      type: 'parseProgress',
      id: 'parse-1',
      progress: {
        currentFile: 1,
        totalFiles: 2,
        fileName: 'good.ndjson',
        recordsProcessed: 1,
      },
    });
    expect(parseResult).toBeDefined();
    expect(parseResult!.id).toBe('parse-1');
    expect('metrics' in parseResult!).toBe(false);
    expect(parseResult!.enterpriseName).toBe('acme');
    expect(parseResult!.recordCount).toBe(1);
    expect(parseResult!.errors).toEqual([
      { fileIndex: 2, fileName: 'bad.ndjson', error: 'bad file stream' },
    ]);
    expect(Object.keys(parseResult!.result)).toEqual(
      Object.keys(AGGREGATED_METRICS_SLICE_KEYS)
    );
    for (const key of FORMER_FLAT_AGGREGATE_KEYS) {
      expect(parseResult!.result).not.toHaveProperty(key);
    }
    expect(parseResult!.result).not.toHaveProperty('metrics');
    expect(parseResult!.result.overview.stats.totalRecords).toBe(1);

    responses.length = 0;

    await send({ type: 'computeUserDetails', id: 'details-1', userId: 42 });

    expect(responses).toHaveLength(1);
    expect(responses[0].type).toBe('userDetailsResult');
    const detailResult = responses[0] as Extract<WorkerResponse, { type: 'userDetailsResult' }>;
    expect(detailResult.id).toBe('details-1');
    expect(detailResult.result?.totalModelRequests).toBe(9);
    expect(detailResult.result?.total_ai_credits_used).toBe(3.5);
    expect(detailResult.result?.days.map(day => day.user_initiated_interaction_count)).toEqual([12]);
  });
});
