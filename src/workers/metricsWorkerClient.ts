import type { AggregatedMetrics, UserDetailedMetrics } from '../types/aggregatedMetrics';
import type { MultiFileProgress, MultiFileResult } from '../infra/metricsFileParser';
import type { WorkerRequest, WorkerResponse } from './types';
import { getBasePath } from '../utils/basePath';

export interface ParseAndAggregateResult {
  result: AggregatedMetrics;
  enterpriseName: string | null;
  recordCount: number;
  errors: MultiFileResult['errors'];
}

interface PendingParseAndAggregateRequest {
  resolve: (value: ParseAndAggregateResult) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: MultiFileProgress) => void;
}

interface PendingUserDetailsRequest {
  resolve: (value: UserDetailedMetrics | null) => void;
  reject: (error: Error) => void;
}

type PendingRequest =
  | ({ kind: 'parseAndAggregate' } & PendingParseAndAggregateRequest)
  | ({ kind: 'computeUserDetails' } & PendingUserDetailsRequest);

interface MetricsWorkerPort {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: WorkerRequest): void;
  terminate(): void;
}

type MetricsWorkerFactory = () => MetricsWorkerPort;

function createBrowserWorker(): MetricsWorkerPort {
  if (typeof Worker === 'undefined') {
    throw new Error('Metrics worker is only available in the browser');
  }

  return new Worker(`${getBasePath()}/workers/metricsWorker.js`);
}

export class MetricsWorkerClient {
  private worker: MetricsWorkerPort | null = null;
  private readonly pendingRequests = new Map<string, PendingRequest>();
  private requestCounter = 0;
  private disposed = false;

  constructor(private readonly createWorker: MetricsWorkerFactory = createBrowserWorker) {}

  parseAndAggregate(
    files: File[],
    onProgress?: (progress: MultiFileProgress) => void
  ): Promise<ParseAndAggregateResult> {
    const id = this.nextId();
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { kind: 'parseAndAggregate', resolve, reject, onProgress });
      this.postRequest({ type: 'parseAndAggregate', id, files });
    });
  }

  computeUserDetails(userId: number): Promise<UserDetailedMetrics | null> {
    const id = this.nextId();
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { kind: 'computeUserDetails', resolve, reject });
      this.postRequest({ type: 'computeUserDetails', id, userId });
    });
  }

  reset(): void {
    this.releaseWorker(new Error('Metrics worker reset'));
  }

  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;
    this.releaseWorker(new Error('Metrics worker disposed'));
  }

  private nextId(): string {
    return `req-${++this.requestCounter}`;
  }

  private postRequest(request: WorkerRequest): void {
    try {
      this.getWorker().postMessage(request);
    } catch (error) {
      const pending = this.pendingRequests.get(request.id);
      this.pendingRequests.delete(request.id);
      pending?.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private getWorker(): MetricsWorkerPort {
    if (this.disposed) {
      throw new Error('Metrics worker client has been disposed');
    }
    if (this.worker) return this.worker;

    const worker = this.createWorker();
    worker.onmessage = (event) => {
      this.handleMessage(event.data);
    };
    worker.onerror = (event) => {
      this.handleWorkerError(worker, event.message);
    };
    this.worker = worker;
    return worker;
  }

  private handleMessage(message: WorkerResponse): void {
    const pending = this.pendingRequests.get(message.id);
    if (!pending) return;

    switch (message.type) {
      case 'parseProgress':
        if (pending.kind === 'parseAndAggregate') {
          pending.onProgress?.(message.progress);
        } else {
          this.rejectUnexpectedResponse(message.id, message.type, pending);
        }
        break;
      case 'parseAndAggregateResult':
        this.pendingRequests.delete(message.id);
        if (pending.kind === 'parseAndAggregate') {
          pending.resolve({
            result: message.result,
            enterpriseName: message.enterpriseName,
            recordCount: message.recordCount,
            errors: message.errors,
          });
        } else {
          pending.reject(this.unexpectedResponseError(message.type, pending.kind));
        }
        break;
      case 'userDetailsResult':
        this.pendingRequests.delete(message.id);
        if (pending.kind === 'computeUserDetails') {
          pending.resolve(message.result);
        } else {
          pending.reject(this.unexpectedResponseError(message.type, pending.kind));
        }
        break;
      case 'error':
        this.pendingRequests.delete(message.id);
        pending.reject(new Error(message.error));
        break;
      default: {
        const unexpected = message as { id: string; type: string };
        this.pendingRequests.delete(unexpected.id);
        pending.reject(new Error(
          `Unknown response type '${unexpected.type}' for '${pending.kind}' request`
        ));
        break;
      }
    }
  }

  private rejectUnexpectedResponse(
    id: string,
    responseType: WorkerResponse['type'],
    pending: PendingRequest
  ): void {
    this.pendingRequests.delete(id);
    pending.reject(this.unexpectedResponseError(responseType, pending.kind));
  }

  private unexpectedResponseError(responseType: WorkerResponse['type'], requestKind: PendingRequest['kind']): Error {
    return new Error(`Unexpected response type '${responseType}' for '${requestKind}' request`);
  }

  private handleWorkerError(failedWorker: MetricsWorkerPort, message: string): void {
    if (this.worker !== failedWorker) return;

    this.releaseWorker(new Error(`Worker error: ${message}`));
  }

  private releaseWorker(error: Error): void {
    const worker = this.worker;
    this.worker = null;

    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    }

    const pending = Array.from(this.pendingRequests.values());
    this.pendingRequests.clear();
    for (const request of pending) {
      request.reject(error);
    }
  }
}
