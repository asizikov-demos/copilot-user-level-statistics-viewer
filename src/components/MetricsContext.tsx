"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  DailyEngagementData,
  DailyChatUsersData,
  DailyChatRequestsData,
  LanguageStats,
  DailyModelUsageData,
  FeatureAdoptionData,
  DailyPRUAnalysisData,
  AgentModeHeatmapData,
  ModelFeatureDistributionData,
  AgentImpactData,
  CodeCompletionImpactData,
  ModeImpactData
} from '../domain/calculators/metricCalculators';
import { CopilotMetrics, MetricsStats, UserSummary } from '../types/metrics';

export interface FilteredMetricsData {
  stats: MetricsStats | null;
  userSummaries: UserSummary[];
  engagementData: DailyEngagementData[];
  chatUsersData: DailyChatUsersData[];
  chatRequestsData: DailyChatRequestsData[];
  languageStats: LanguageStats[];
  modelUsageData: DailyModelUsageData[];
  featureAdoptionData: FeatureAdoptionData | null;
  pruAnalysisData: DailyPRUAnalysisData[];
  agentModeHeatmapData: AgentModeHeatmapData[];
  modelFeatureDistributionData: ModelFeatureDistributionData[];
  agentImpactData: AgentImpactData[];
  codeCompletionImpactData: CodeCompletionImpactData[];
  editModeImpactData: ModeImpactData[];
  inlineModeImpactData: ModeImpactData[];
  askModeImpactData: ModeImpactData[];
  cliImpactData: ModeImpactData[];
  joinedImpactData: ModeImpactData[];
}

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

interface FilteredMetricsContextValue {
  filteredData: FilteredMetricsData | null;
  setFilteredData: (data: FilteredMetricsData | null) => void;
}

interface RawMetricsContextValue extends RawMetricsState, RawMetricsActions {}

const FilteredMetricsContext = createContext<FilteredMetricsContextValue | undefined>(undefined);
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

export const FilteredMetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filteredData, setFilteredData] = useState<FilteredMetricsData | null>(null);

  const value = useMemo<FilteredMetricsContextValue>(
    () => ({ filteredData, setFilteredData }),
    [filteredData]
  );

  return (
    <FilteredMetricsContext.Provider value={value}>
      {children}
    </FilteredMetricsContext.Provider>
  );
};

export const MetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RawMetricsProvider>
      <FilteredMetricsProvider>
        {children}
      </FilteredMetricsProvider>
    </RawMetricsProvider>
  );
};

export function useMetricsData(): FilteredMetricsContextValue {
  const ctx = useContext(FilteredMetricsContext);
  if (!ctx) {
    throw new Error('useMetricsData must be used within a FilteredMetricsProvider');
  }
  return ctx;
}

export function useRawMetrics(): RawMetricsContextValue {
  const ctx = useContext(RawMetricsContext);
  if (!ctx) {
    throw new Error('useRawMetrics must be used within a RawMetricsProvider');
  }
  return ctx;
}
