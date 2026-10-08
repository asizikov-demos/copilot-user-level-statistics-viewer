import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChunkedFile, createFailingFile } from '../../__tests__/factories/files';
import { makeMetric } from '../../__tests__/factories/metrics';
import type { WorkerRequest, WorkerResponse } from '../types';

type WorkerHost = typeof globalThis & {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void | Promise<void>) | null;
  postMessage?: (message: WorkerResponse) => void;
};

type ResponseOf<T extends WorkerResponse['type']> = Extract<WorkerResponse, { type: T }>;

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

  const find = <T extends WorkerResponse['type']>(type: T) =>
    responses.find((response): response is ResponseOf<T> => response.type === type);

  return { responses, send, find };
}

const metricFile = (name: string, ...records: Parameters<typeof makeMetric>[0][]) =>
  createChunkedFile(records.map(record => `${JSON.stringify(makeMetric(record))}\n`), name);

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
    vi.restoreAllMocks();
  });

  describe('parseAndAggregate', () => {
    it('posts progress then an aggregated result tagged with the request id', async () => {
      const { responses, send } = await loadWorker();

      await send({
        type: 'parseAndAggregate',
        id: 'parse-1',
        files: [
          metricFile('first.ndjson', { user_id: 1, user_login: 'octocat_acme' }),
          metricFile('second.ndjson', { user_id: 2, user_login: 'hubot_acme' }),
        ],
      });

      expect(responses.map(response => response.type)).toEqual([
        'parseProgress',
        'parseProgress',
        'parseAndAggregateResult',
      ]);
      expect(responses[0]).toEqual({
        type: 'parseProgress',
        id: 'parse-1',
        progress: { currentFile: 1, totalFiles: 2, fileName: 'first.ndjson', recordsProcessed: 1 },
      });
      const result = responses[2] as ResponseOf<'parseAndAggregateResult'>;
      expect(result).toMatchObject({ id: 'parse-1', recordCount: 2, enterpriseName: 'acme', errors: [] });
      expect(result.result.overview.stats.uniqueUsers).toBe(2);
      expect(result).not.toHaveProperty('metrics');
      expect(result.result).not.toHaveProperty('rawMetrics');
    });

    it('returns per-file errors alongside the result when some files fail', async () => {
      const { send, find } = await loadWorker();

      await send({
        type: 'parseAndAggregate',
        id: 'partial',
        files: [
          metricFile('good.ndjson', {}),
          createFailingFile('bad.ndjson', new Error('bad file stream')),
        ],
      });

      expect(find('parseAndAggregateResult')).toMatchObject({
        id: 'partial',
        recordCount: 1,
        errors: [{ fileIndex: 2, fileName: 'bad.ndjson', error: 'bad file stream' }],
      });
    });

    it('posts an error instead of a result when every file fails', async () => {
      const { responses, send, find } = await loadWorker();

      await send({
        type: 'parseAndAggregate',
        id: 'all-failed',
        files: [createFailingFile('bad.ndjson', new Error('bad file stream'))],
      });

      expect(find('parseAndAggregateResult')).toBeUndefined();
      expect(responses.at(-1)).toMatchObject({ type: 'error', id: 'all-failed' });
    });
  });

  describe('computeUserDetails', () => {
    it('rejects requests until parse-and-aggregate has retained an accumulator', async () => {
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

    it('serves details for the requested user from the retained accumulator', async () => {
      const { responses, send } = await loadWorker();
      await send({
        type: 'parseAndAggregate',
        id: 'parse',
        files: [metricFile('metrics.ndjson',
          { user_id: 42, user_initiated_interaction_count: 12, ai_credits_used: 3.5 },
          { user_id: 7, user_initiated_interaction_count: 1 },
        )],
      });
      responses.length = 0;

      await send({ type: 'computeUserDetails', id: 'details-1', userId: 42 });

      expect(responses).toHaveLength(1);
      expect(responses[0]).toMatchObject({ type: 'userDetailsResult', id: 'details-1' });
      const details = (responses[0] as ResponseOf<'userDetailsResult'>).result;
      expect(details?.total_ai_credits_used).toBe(3.5);
      expect(details?.days.map(day => day.user_initiated_interaction_count)).toEqual([12]);
    });
  });

  describe('unknown requests', () => {
    it('answers an unknown request type carrying an id with an error', async () => {
      const { responses, send } = await loadWorker();

      await send({ type: 'unexpected', id: 'unknown-1' } as unknown as WorkerRequest);

      expect(responses).toEqual([
        { type: 'error', id: 'unknown-1', error: "Unknown request type 'unexpected'" },
      ]);
    });
  });
});
