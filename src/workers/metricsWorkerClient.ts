import type { CopilotMetrics } from '../types/metrics';
import type { AggregatedMetrics } from '../domain/metricsAggregator';
import type { UserDetailedMetrics } from '../types/aggregatedMetrics';
import type { MultiFileProgress, MultiFileResult } from '../infra/metricsFileParser';
import type { WorkerResponse, WorkerParseResult } from './types';
import { getBasePath } from '../utils/basePath';

interface PendingParseRequest {
  resolve: (value: WorkerParseResult) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: MultiFileProgress) => void;
}

interface PendingAggregateRequest {
  resolve: (value: AggregatedMetrics) => void;
  reject: (error: Error) => void;
}

interface PendingParseAndAggregateRequest {
  resolve: (value: { result: AggregatedMetrics; enterpriseName: string | null; recordCount: number; errors: MultiFileResult['errors'] }) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: MultiFileProgress) => void;
}

interface PendingUserDetailsRequest {
  resolve: (value: UserDetailedMetrics | null) => void;
  reject: (error: Error) => void;
}

type PendingRequest =
  | ({ kind: 'parse' } & PendingParseRequest)
  | ({ kind: 'aggregate' } & PendingAggregateRequest)
  | ({ kind: 'parseAndAggregate' } & PendingParseAndAggregateRequest)
  | ({ kind: 'computeUserDetails' } & PendingUserDetailsRequest);

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
        if (pending.kind === 'parse' || pending.kind === 'parseAndAggregate') {
          pending.onProgress?.(msg.progress);
        }
        break;
      case 'parseResult':
        pendingRequests.delete(msg.id);
        if (pending.kind === 'parse') {
          pending.resolve(msg.result);
        } else {
          pending.reject(new Error(`Unexpected response type '${msg.type}' for '${pending.kind}' request`));
        }
        break;
      case 'aggregateResult':
        pendingRequests.delete(msg.id);
        if (pending.kind === 'aggregate') {
          pending.resolve(msg.result);
        } else {
          pending.reject(new Error(`Unexpected response type '${msg.type}' for '${pending.kind}' request`));
        }
        break;
      case 'parseAndAggregateResult':
        pendingRequests.delete(msg.id);
        if (pending.kind === 'parseAndAggregate') {
          pending.resolve({
            result: msg.result,
            enterpriseName: msg.enterpriseName,
            recordCount: msg.recordCount,
            errors: msg.errors,
          });
        } else {
          pending.reject(new Error(`Unexpected response type '${msg.type}' for '${pending.kind}' request`));
        }
        break;
      case 'userDetailsResult':
        pendingRequests.delete(msg.id);
        if (pending.kind === 'computeUserDetails') {
          pending.resolve(msg.result);
        } else {
          pending.reject(new Error(`Unexpected response type '${msg.type}' for '${pending.kind}' request`));
        }
        break;
      case 'error':
        pendingRequests.delete(msg.id);
        pending.reject(new Error(msg.error));
        break;
      default: {
        const unexpectedMsg = msg as { id: string; type: string };
        pendingRequests.delete(unexpectedMsg.id);
        pending.reject(new Error(`Unknown response type '${unexpectedMsg.type}' for '${pending.kind}' request`));
        break;
      }
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
): Promise<WorkerParseResult> {
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

export function parseAndAggregateInWorker(
  files: File[],
  onProgress?: (progress: MultiFileProgress) => void
): Promise<{ result: AggregatedMetrics; enterpriseName: string | null; recordCount: number; errors: MultiFileResult['errors'] }> {
  const id = nextId();
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { kind: 'parseAndAggregate', resolve, reject, onProgress });
    try {
      getWorker().postMessage({ type: 'parseAndAggregate', id, files });
    } catch (err) {
      pendingRequests.delete(id);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export function terminateWorker(): void {
  if (worker) {
    worker.onmessage = null;
    worker.onerror = null;
    worker.terminate();
    worker = null;
    for (const [id, pending] of pendingRequests) {
      pending.reject(new Error('Worker terminated'));
      pendingRequests.delete(id);
    }
  }
}

export function computeUserDetailsInWorker(
  userId: number
): Promise<UserDetailedMetrics | null> {
  const id = nextId();
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { kind: 'computeUserDetails', resolve, reject });
    try {
      getWorker().postMessage({ type: 'computeUserDetails', id, userId });
    } catch (err) {
      pendingRequests.delete(id);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
