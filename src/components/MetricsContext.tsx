"use client";

import React, { createContext, useContext, useState } from 'react';

// Shape of the filtered metrics data we care about across pages.
// This intentionally mirrors the object returned in page.tsx useMemo.
export interface FilteredMetricsData {
  metrics: any[]; // Raw filtered metrics entries
  stats: any | null; // MetricsStats like object
  userSummaries: any[];
  engagementData: any[];
  chatUsersData: any[];
  chatRequestsData: any[];
  languageStats: any[];
  modelUsageData: any[];
  featureAdoptionData: any | null;
  pruAnalysisData: any[];
  agentModeHeatmapData: any[];
  modelFeatureDistributionData: any[];
  agentImpactData: any[];
  codeCompletionImpactData: any[];
}

interface MetricsContextValue {
  filteredData: FilteredMetricsData | null;
  setFilteredData: (data: FilteredMetricsData | null) => void;
}

const MetricsContext = createContext<MetricsContextValue | undefined>(undefined);

export const MetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filteredData, setFilteredData] = useState<FilteredMetricsData | null>(null);

  return (
    <MetricsContext.Provider value={{ filteredData, setFilteredData }}>
      {children}
    </MetricsContext.Provider>
  );
};

export function useMetricsData(): MetricsContextValue {
  const ctx = useContext(MetricsContext);
  if (!ctx) {
    throw new Error('useMetricsData must be used within a MetricsProvider');
  }
  return ctx;
}
