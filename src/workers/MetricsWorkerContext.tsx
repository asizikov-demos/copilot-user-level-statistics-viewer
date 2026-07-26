'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { MultiFileProgress } from '../infra/metricsFileParser';
import type { UserDetailedMetrics } from '../types/aggregatedMetrics';
import {
  MetricsWorkerClient,
  type ParseAndAggregateResult,
} from './metricsWorkerClient';

interface MetricsWorkerOperations {
  parseAndAggregate: (
    files: File[],
    onProgress?: (progress: MultiFileProgress) => void
  ) => Promise<ParseAndAggregateResult>;
  computeUserDetails: (userId: number) => Promise<UserDetailedMetrics | null>;
  reset: () => void;
}

const MetricsWorkerContext = createContext<MetricsWorkerOperations | null>(null);

export function MetricsWorkerProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<MetricsWorkerClient | null>(null);
  const operationsRef = useRef<MetricsWorkerOperations | null>(null);
  const lifecycleVersionRef = useRef(0);

  if (clientRef.current === null) {
    clientRef.current = new MetricsWorkerClient();
  }

  if (operationsRef.current === null) {
    const getClient = () => {
      if (clientRef.current === null) {
        throw new Error('MetricsWorkerProvider has been disposed');
      }
      return clientRef.current;
    };

    operationsRef.current = {
      parseAndAggregate: (files, onProgress) =>
        getClient().parseAndAggregate(files, onProgress),
      computeUserDetails: (userId) => getClient().computeUserDetails(userId),
      reset: () => getClient().reset(),
    };
  }

  useEffect(() => {
    lifecycleVersionRef.current += 1;

    return () => {
      const cleanupVersion = ++lifecycleVersionRef.current;

      // Strict Mode replays setup before this microtask; a real unmount does not.
      queueMicrotask(() => {
        if (lifecycleVersionRef.current !== cleanupVersion) return;

        clientRef.current?.dispose();
        clientRef.current = null;
      });
    };
  }, []);

  return (
    <MetricsWorkerContext.Provider value={operationsRef.current}>
      {children}
    </MetricsWorkerContext.Provider>
  );
}

export function useMetricsWorker(): MetricsWorkerOperations {
  const context = useContext(MetricsWorkerContext);
  if (!context) {
    throw new Error('useMetricsWorker must be used within a MetricsWorkerProvider');
  }
  return context;
}
