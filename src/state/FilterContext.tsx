"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  DateRangeFilter,
  FilterState,
  FilterActions,
  DEFAULT_FILTER_STATE,
} from '../types/filters';

interface FilterContextValue extends FilterState, FilterActions {}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const setDateRange = useCallback((filter: DateRangeFilter) => {
    setState((prev) => ({
      ...prev,
      dateRange: filter,
    }));
  }, []);

  const setRemoveUnknownLanguages = useCallback((remove: boolean) => {
    setState((prev) => ({
      ...prev,
      removeUnknownLanguages: remove,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setState(DEFAULT_FILTER_STATE);
  }, []);

  const value = useMemo<FilterContextValue>(
    () => ({
      ...state,
      setDateRange,
      setRemoveUnknownLanguages,
      resetFilters,
    }),
    [state, setDateRange, setRemoveUnknownLanguages, resetFilters]
  );

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return ctx;
}
