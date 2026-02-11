"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CopilotMetrics } from '../types/metrics';

interface RawMetricsState {
  rawMetrics: CopilotMetrics[];
  enterpriseName: string | null;
  isLoading: boolean;
  error: string | null;
}

interface RawMetricsActions {
  setRawMetrics: (metrics: CopilotMetrics[]) => void;
  setEnterpriseName: (name: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetRawMetrics: () => void;
}

interface RawMetricsContextValue extends RawMetricsState, RawMetricsActions {}

const RawMetricsContext = createContext<RawMetricsContextValue | undefined>(undefined);

const initialRawMetricsState: RawMetricsState = {
  rawMetrics: [],
  enterpriseName: null,
  isLoading: false,
  error: null,
};

export const RawMetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<RawMetricsState>(initialRawMetricsState);

  const setRawMetrics = useCallback((metrics: CopilotMetrics[]) => {
    setState((prev) => ({ ...prev, rawMetrics: metrics }));
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

  const resetRawMetrics = useCallback(() => {
    setState(initialRawMetricsState);
  }, []);

  const value = useMemo<RawMetricsContextValue>(
    () => ({
      ...state,
      setRawMetrics,
      setEnterpriseName,
      setIsLoading,
      setError,
      resetRawMetrics,
    }),
    [state, setRawMetrics, setEnterpriseName, setIsLoading, setError, resetRawMetrics]
  );

  return (
    <RawMetricsContext.Provider value={value}>
      {children}
    </RawMetricsContext.Provider>
  );
};

export const MetricsProvider = RawMetricsProvider;

export function useRawMetrics(): RawMetricsContextValue {
  const ctx = useContext(RawMetricsContext);
  if (!ctx) {
    throw new Error('useRawMetrics must be used within a RawMetricsProvider');
  }
  return ctx;
}
