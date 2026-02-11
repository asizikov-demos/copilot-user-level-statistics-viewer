import type { CopilotMetrics } from '../types/metrics';
import type { AggregatedMetrics } from '../domain/metricsAggregator';
import type { MultiFileProgress, MultiFileResult } from '../infra/metricsFileParser';
import type { WorkerResponse } from './types';
import { getBasePath } from '../utils/basePath';

interface PendingParseRequest {
  resolve: (value: MultiFileResult) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: MultiFileProgress) => void;
}

interface PendingAggregateRequest {
  resolve: (value: AggregatedMetrics) => void;
  reject: (error: Error) => void;
}

type PendingRequest =
  | ({ kind: 'parse' } & PendingParseRequest)
  | ({ kind: 'aggregate' } & PendingAggregateRequest);

let worker: Worker | null = null;
const pendingRequests = new Map<string, PendingRequest>();
let requestCounter = 0;

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(`${getBasePath()}/workers/metricsWorker.js`);

  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const msg = event.data;
    const pending = pendingRequests.get(msg.id);
    if (!pending) return;

    switch (msg.type) {
      case 'parseProgress':
        if (pending.kind === 'parse') {
          pending.onProgress?.(msg.progress);
        }
        break;
      case 'parseResult':
        pendingRequests.delete(msg.id);
        if (pending.kind === 'parse') {
          pending.resolve(msg.result);
        }
        break;
      case 'aggregateResult':
        pendingRequests.delete(msg.id);
        if (pending.kind === 'aggregate') {
          pending.resolve(msg.result);
        }
        break;
      case 'error':
        pendingRequests.delete(msg.id);
        pending.reject(new Error(msg.error));
        break;
    }
  };

  worker.onerror = (err) => {
    const failedWorker = worker;
    worker = null;
    for (const [id, pending] of pendingRequests) {
      pending.reject(new Error(`Worker error: ${err.message}`));
      pendingRequests.delete(id);
    }
    failedWorker?.terminate();
  };

  return worker;
}

function nextId(): string {
  return `req-${++requestCounter}`;
}

export function parseFilesInWorker(
  files: File[],
  onProgress?: (progress: MultiFileProgress) => void
): Promise<MultiFileResult> {
  const id = nextId();
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { kind: 'parse', resolve, reject, onProgress });
    try {
      getWorker().postMessage({ type: 'parseFiles', id, files });
    } catch (err) {
      pendingRequests.delete(id);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export function aggregateMetricsInWorker(
  metrics: CopilotMetrics[]
): Promise<AggregatedMetrics> {
  const id = nextId();
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { kind: 'aggregate', resolve, reject });
    try {
      getWorker().postMessage({ type: 'aggregate', id, metrics });
    } catch (err) {
      pendingRequests.delete(id);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    for (const [id, pending] of pendingRequests) {
      pending.reject(new Error('Worker terminated'));
      pendingRequests.delete(id);
    }
  }
}
