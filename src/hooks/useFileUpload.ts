'use client';

import { useCallback } from 'react';
import { CopilotMetrics } from '../types/metrics';
import { parseMetricsStream } from '../utils/metricsParser';
import { calculateStats } from '../utils/metricCalculators';
import { useRawMetrics } from '../components/MetricsContext';

interface UseFileUploadReturn {
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
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
    } catch (err) {
      setError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [deriveEnterpriseName, setRawMetrics, setOriginalStats, setEnterpriseName, setIsLoading, setError]);

  return {
    handleFileUpload,
    isLoading,
    error,
  };
}
