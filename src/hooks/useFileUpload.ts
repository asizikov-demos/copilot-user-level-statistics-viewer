'use client';

import { useCallback } from 'react';
import { CopilotMetrics } from '../types/metrics';
import { parseMetricsStream } from '../domain/metricsParser';
import { calculateStats } from '../domain/calculators/metricCalculators';
import { useRawMetrics } from '../components/MetricsContext';

interface UseFileUploadReturn {
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSampleLoad: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useFileUpload(): UseFileUploadReturn {
  const {
    isLoading,
    error,
    setRawMetrics,
    setOriginalStats,
    setEnterpriseName,
    setIsLoading,
    setError,
  } = useRawMetrics();

  const deriveEnterpriseName = useCallback((firstMetric: CopilotMetrics): string | null => {
    const loginSuffix = firstMetric.user_login?.includes('_')
      ? firstMetric.user_login.split('_').pop()?.trim()
      : undefined;
    const enterpriseId = firstMetric.enterprise_id.trim();
    const derivedEnterpriseName = loginSuffix && loginSuffix.length > 0 
      ? loginSuffix 
      : (enterpriseId.length > 0 ? enterpriseId : null);
    return derivedEnterpriseName;
  }, []);

  const processMetricsFile = useCallback(async (file: File) => {
    const parsedMetrics = await parseMetricsStream(file);
    const calculatedStats = calculateStats(parsedMetrics);

    const firstMetric = parsedMetrics[0];
    if (firstMetric) {
      setEnterpriseName(deriveEnterpriseName(firstMetric));
    } else {
      setEnterpriseName(null);
    }
    
    setRawMetrics(parsedMetrics);
    setOriginalStats(calculatedStats);
  }, [deriveEnterpriseName, setRawMetrics, setOriginalStats, setEnterpriseName]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.json') && !lowerName.endsWith('.ndjson')) {
      setError('Unsupported file type. Please upload a .json or .ndjson file.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await processMetricsFile(file);
    } catch (err) {
      setError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [processMetricsFile, setIsLoading, setError]);

  const handleSampleLoad = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/data/sample-report.ndjson');
      if (!response.ok) {
        throw new Error('Failed to load sample report');
      }
      
      const blob = await response.blob();
      const file = new File([blob], 'sample-report.ndjson', { type: 'application/x-ndjson' });
      
      await processMetricsFile(file);
    } catch (err) {
      setError(`Failed to load sample report: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [processMetricsFile, setIsLoading, setError]);

  return {
    handleFileUpload,
    handleSampleLoad,
    isLoading,
    error,
  };
}
