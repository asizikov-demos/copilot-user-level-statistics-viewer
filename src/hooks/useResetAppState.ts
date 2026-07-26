'use client';

import { useCallback } from 'react';
import { useMetrics } from '../components/MetricsContext';
import { useNavigation } from '../state/NavigationContext';
import { useMetricsWorker } from '../state/MetricsWorkerContext';

export function useResetAppState() {
  const { resetMetrics } = useMetrics();
  const { resetNavigation } = useNavigation();
  const metricsWorker = useMetricsWorker();

  return useCallback(() => {
    metricsWorker.reset();
    resetMetrics();
    resetNavigation();
  }, [metricsWorker, resetMetrics, resetNavigation]);
}
