'use client';

import { useCallback } from 'react';
import { useMetrics } from '../components/MetricsContext';
import { useNavigation } from '../state/NavigationContext';
import { terminateWorker } from '../workers/metricsWorkerClient';

export function useResetAppState() {
  const { resetMetrics } = useMetrics();
  const { resetNavigation } = useNavigation();

  return useCallback(() => {
    terminateWorker();
    resetMetrics();
    resetNavigation();
  }, [resetMetrics, resetNavigation]);
}