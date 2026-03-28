"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { AggregatedMetrics } from '../domain/metricsAggregator';

interface MetricsState {
  hasData: boolean;
  aggregatedMetrics: AggregatedMetrics | null;
  enterpriseName: string | null;
  filename: string | null;
  recordCount: number | null;
  isLoading: boolean;
  error: string | null;
  warning: string | null;
}

interface MetricsActions {
  setAggregatedMetrics: (metrics: AggregatedMetrics) => void;
  setHasData: (hasData: boolean) => void;
  setEnterpriseName: (name: string | null) => void;
  setFilename: (filename: string | null) => void;
  setRecordCount: (count: number | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setWarning: (warning: string | null) => void;
  resetMetrics: () => void;
}

interface MetricsContextValue extends MetricsState, MetricsActions {}

const MetricsContext = createContext<MetricsContextValue | undefined>(undefined);

const initialMetricsState: MetricsState = {
  hasData: false,
  aggregatedMetrics: null,
  enterpriseName: null,
  filename: null,
  recordCount: null,
  isLoading: false,
  error: null,
  warning: null,
};

export const MetricsContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<MetricsState>(initialMetricsState);

  const setAggregatedMetrics = useCallback((metrics: AggregatedMetrics) => {
    setState((prev) => ({ ...prev, aggregatedMetrics: metrics, hasData: true }));
  }, []);

  const setHasData = useCallback((hasData: boolean) => {
    setState((prev) => ({ ...prev, hasData }));
  }, []);

  const setEnterpriseName = useCallback((name: string | null) => {
    setState((prev) => ({ ...prev, enterpriseName: name }));
  }, []);

  const setFilename = useCallback((filename: string | null) => {
    setState((prev) => ({ ...prev, filename }));
  }, []);

  const setRecordCount = useCallback((count: number | null) => {
    setState((prev) => ({ ...prev, recordCount: count }));
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error: error }));
  }, []);

  const setWarning = useCallback((warning: string | null) => {
    setState((prev) => ({ ...prev, warning }));
  }, []);

  const resetMetrics = useCallback(() => {
    setState(initialMetricsState);
  }, []);

  const value = useMemo<MetricsContextValue>(
    () => ({
      ...state,
      setAggregatedMetrics,
      setHasData,
      setEnterpriseName,
      setFilename,
      setRecordCount,
      setIsLoading,
      setError,
      setWarning,
      resetMetrics,
    }),
    [state, setAggregatedMetrics, setHasData, setEnterpriseName, setFilename, setRecordCount, setIsLoading, setError, setWarning, resetMetrics]
  );

  return (
    <MetricsContext.Provider value={value}>
      {children}
    </MetricsContext.Provider>
  );
};

export const MetricsProvider = MetricsContextProvider;

export function useMetrics(): MetricsContextValue {
  const ctx = useContext(MetricsContext);
  if (!ctx) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return ctx;
}

export function useRawMetrics(): MetricsContextValue {
  return useMetrics();
}
