import { useState, useEffect, useRef } from 'react';
import { CopilotMetrics } from '../types/metrics';
import { AggregatedMetrics } from '../domain/metricsAggregator';
import { aggregateMetricsInWorker } from '../workers/metricsWorkerClient';

export interface MetricsProcessingResult {
  aggregatedMetrics: AggregatedMetrics | null;
  isProcessing: boolean;
  processingError: string | null;
}

export function useMetricsProcessing(rawMetrics: CopilotMetrics[], hasData: boolean): MetricsProcessingResult {
  const [aggregatedMetrics, setAggregatedMetrics] = useState<AggregatedMetrics | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;

    if (!rawMetrics.length) {
      setIsProcessing(false);
      setProcessingError(null);
      if (!hasData) {
        setAggregatedMetrics(null);
      }
      return;
    }

    setIsProcessing(true);
    setProcessingError(null);

    aggregateMetricsInWorker(rawMetrics)
      .then((result) => {
        if (currentRequestId === requestIdRef.current) {
          setAggregatedMetrics(result);
          setIsProcessing(false);
        }
      })
      .catch((err) => {
        console.error('Aggregation failed:', err);
        if (currentRequestId === requestIdRef.current) {
          setAggregatedMetrics(null);
          setIsProcessing(false);
          setProcessingError(err instanceof Error ? err.message : 'Aggregation failed');
        }
      });
  }, [rawMetrics, hasData]);

  return { aggregatedMetrics, isProcessing, processingError };
}
