"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { AggregatedMetrics } from '../domain/metricsAggregator';

interface MetricsState {
  hasData: boolean;
  aggregatedMetrics: AggregatedMetrics | null;
  enterpriseName: string | null;
  isLoading: boolean;
  error: string | null;
  warning: string | null;
}

interface MetricsActions {
  setAggregatedMetrics: (metrics: AggregatedMetrics) => void;
  setHasData: (hasData: boolean) => void;
  setEnterpriseName: (name: string | null) => void;
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
      setIsLoading,
      setError,
      setWarning,
      resetMetrics,
    }),
    [state, setAggregatedMetrics, setHasData, setEnterpriseName, setIsLoading, setError, setWarning, resetMetrics]
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
