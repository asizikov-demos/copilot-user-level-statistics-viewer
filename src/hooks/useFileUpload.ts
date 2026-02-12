'use client';

import { useCallback, useRef, useState } from 'react';
import { MultiFileProgress } from '../infra/metricsFileParser';
import { parseAndAggregateInWorker } from '../workers/metricsWorkerClient';
import { useMetrics } from '../components/MetricsContext';
import { getBasePath } from '../utils/basePath';

interface UseFileUploadReturn {
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSampleLoad: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  uploadProgress: MultiFileProgress | null;
}

export function useFileUpload(): UseFileUploadReturn {
  const [uploadProgress, setUploadProgress] = useState<MultiFileProgress | null>(null);
  const requestIdRef = useRef(0);
  const {
    isLoading,
    error,
    setAggregatedMetrics,
    setEnterpriseName,
    setIsLoading,
    setError,
  } = useMetrics();

  const processFiles = useCallback(async (files: File[], requestId: number) => {
    const { result, enterpriseName, recordCount } = await parseAndAggregateInWorker(files, (progress) => {
      if (requestIdRef.current === requestId) {
        setUploadProgress(progress);
      }
    });
    if (requestIdRef.current !== requestId) return;
    if (recordCount === 0) {
      throw new Error('No metrics found in the uploaded files');
    }
    setError(null);
    setEnterpriseName(enterpriseName);
    setAggregatedMetrics(result);
  }, [setAggregatedMetrics, setEnterpriseName, setUploadProgress, setError]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    
    for (const file of files) {
      const lowerName = file.name.toLowerCase();
      if (!lowerName.endsWith('.json') && !lowerName.endsWith('.ndjson')) {
        setError(`Unsupported file type: ${file.name}. Please upload .json or .ndjson files.`);
        return;
      }
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    setUploadProgress(null);

    try {
      await processFiles(files, requestId);
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(`Failed to parse files: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
        setUploadProgress(null);
      }
    }
  }, [processFiles, setIsLoading, setError, setUploadProgress]);

  const handleSampleLoad = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    setUploadProgress(null);

    try {
      const response = await fetch(`${getBasePath()}/data/sample-report.ndjson`);
      if (!response.ok) {
        throw new Error('Failed to load sample report');
      }
      
      const blob = await response.blob();
      if (requestIdRef.current !== requestId) return;

      const file = new File([blob], 'sample-report.ndjson', { type: 'application/x-ndjson' });
      
      await processFiles([file], requestId);
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(`Failed to load sample report: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
        setUploadProgress(null);
      }
    }
  }, [processFiles, setIsLoading, setError, setUploadProgress]);

  return {
    handleFileUpload,
    handleSampleLoad,
    isLoading,
    error,
    uploadProgress,
  };
}
