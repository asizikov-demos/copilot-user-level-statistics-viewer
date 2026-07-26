import { describe, expect, it, vi } from 'vitest';
import { makeMetric } from '../../__tests__/factories/metrics';
import { aggregateMetrics } from '../../domain/metricsAggregator';
import type { WorkerRequest, WorkerResponse } from '../types';
import { MetricsWorkerClient } from '../metricsWorkerClient';

class MockWorker {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly messages: WorkerRequest[] = [];
  terminate = vi.fn();

  postMessage(message: WorkerRequest): void {
    this.messages.push(message);
  }

  respond(message: WorkerResponse): void {
    this.onmessage?.({ data: message } as MessageEvent<WorkerResponse>);
  }

  fail(message: string): void {
    this.onerror?.({ message } as ErrorEvent);
  }
}

function createHarness() {
  const workers: MockWorker[] = [];
  const createWorker = vi.fn(() => {
    const worker = new MockWorker();
    workers.push(worker);
    return worker;
  });
  const client = new MetricsWorkerClient(createWorker);

  return { client, createWorker, workers };
}

function parseResult(id: string): Extract<WorkerResponse, { type: 'parseAndAggregateResult' }> {
  return {
    type: 'parseAndAggregateResult',
    id,
    result: aggregateMetrics([makeMetric()]).aggregated,
    enterpriseName: 'acme',
    recordCount: 1,
    errors: [],
  };
}

describe('MetricsWorkerClient', () => {
  it('creates one worker lazily and reuses it across concurrent requests', async () => {
    const { client, createWorker, workers } = createHarness();

    expect(createWorker).not.toHaveBeenCalled();

    const parsePromise = client.parseAndAggregate([new File([''], 'metrics.ndjson')]);
    const detailsPromise = client.computeUserDetails(42);

    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(workers[0].messages).toEqual([
      {
        type: 'parseAndAggregate',
        id: 'req-1',
        files: [expect.objectContaining({ name: 'metrics.ndjson' })],
      },
      { type: 'computeUserDetails', id: 'req-2', userId: 42 },
    ]);

    workers[0].respond(parseResult('req-1'));
    workers[0].respond({ type: 'userDetailsResult', id: 'req-2', result: null });
    await Promise.all([parsePromise, detailsPromise]);
  });

  it('correlates concurrent requests and routes parse and user-detail results', async () => {
    const { client, workers } = createHarness();
    const parsePromise = client.parseAndAggregate([new File([''], 'metrics.ndjson')]);
    const detailsPromise = client.computeUserDetails(42);

    workers[0].respond({ type: 'userDetailsResult', id: 'req-2', result: null });
    workers[0].respond(parseResult('req-1'));

    await expect(detailsPromise).resolves.toBeNull();
    await expect(parsePromise).resolves.toEqual({
      result: expect.objectContaining({ overview: expect.any(Object) }),
      enterpriseName: 'acme',
      recordCount: 1,
      errors: [],
    });
  });

  it('routes parse progress without settling the request', async () => {
    const { client, workers } = createHarness();
    const onProgress = vi.fn();
    let settled = false;
    const request = client
      .parseAndAggregate([new File([''], 'metrics.ndjson')], onProgress)
      .finally(() => {
        settled = true;
      });
    const progress = {
      currentFile: 1,
      totalFiles: 1,
      fileName: 'metrics.ndjson',
      recordsProcessed: 12,
    };

    workers[0].respond({ type: 'parseProgress', id: 'req-1', progress });
    await Promise.resolve();

    expect(onProgress).toHaveBeenCalledWith(progress);
    expect(settled).toBe(false);

    workers[0].respond(parseResult('req-1'));
    await request;
  });

  it('rejects a request when the response kind does not match', async () => {
    const { client, workers } = createHarness();
    const request = client.computeUserDetails(42);

    workers[0].respond(parseResult('req-1'));

    await expect(request).rejects.toThrow(
      "Unexpected response type 'parseAndAggregateResult' for 'computeUserDetails' request"
    );
  });

  it('rejects every pending request and releases resources on worker error', async () => {
    const { client, workers } = createHarness();
    const parsePromise = client.parseAndAggregate([new File([''], 'metrics.ndjson')]);
    const detailsPromise = client.computeUserDetails(42);

    workers[0].fail('worker crashed');

    await expect(parsePromise).rejects.toThrow('Worker error: worker crashed');
    await expect(detailsPromise).rejects.toThrow('Worker error: worker crashed');
    expect(workers[0].terminate).toHaveBeenCalledTimes(1);
    expect(workers[0].onmessage).toBeNull();
    expect(workers[0].onerror).toBeNull();
  });

  it('rejects pending work exactly once on reset and recreates the worker', async () => {
    const { client, createWorker, workers } = createHarness();
    const onRejected = vi.fn();
    void client
      .parseAndAggregate([new File([''], 'metrics.ndjson')])
      .catch(onRejected);

    client.reset();
    client.reset();
    await Promise.resolve();

    expect(onRejected).toHaveBeenCalledTimes(1);
    expect(onRejected.mock.calls[0][0]).toEqual(new Error('Metrics worker reset'));
    expect(workers[0].terminate).toHaveBeenCalledTimes(1);

    const detailsPromise = client.computeUserDetails(42);
    expect(createWorker).toHaveBeenCalledTimes(2);
    expect(workers[1].messages[0]).toEqual({
      type: 'computeUserDetails',
      id: 'req-2',
      userId: 42,
    });

    workers[1].respond({ type: 'userDetailsResult', id: 'req-2', result: null });
    await detailsPromise;
  });

  it('permanently disposes the client and rejects pending work exactly once', async () => {
    const { client, createWorker } = createHarness();
    const onRejected = vi.fn();
    void client.computeUserDetails(42).catch(onRejected);

    client.dispose();
    client.dispose();
    await Promise.resolve();

    expect(onRejected).toHaveBeenCalledTimes(1);
    expect(onRejected.mock.calls[0][0]).toEqual(new Error('Metrics worker disposed'));
    await expect(client.computeUserDetails(7)).rejects.toThrow(
      'Metrics worker client has been disposed'
    );
    expect(createWorker).toHaveBeenCalledTimes(1);
  });

  it('ignores responses for stale or unknown request IDs', async () => {
    const { client, workers } = createHarness();
    let settled = false;
    const request = client.computeUserDetails(42).finally(() => {
      settled = true;
    });

    workers[0].respond({ type: 'userDetailsResult', id: 'unknown', result: null });
    await Promise.resolve();

    expect(settled).toBe(false);

    workers[0].respond({ type: 'userDetailsResult', id: 'req-1', result: null });
    await request;
  });
});
