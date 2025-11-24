"use client";

import React from 'react';
import { MetricsProvider } from '../components/MetricsContext';
import { NavigationProvider } from '../state/NavigationContext';
import { FilterProvider } from '../state/FilterContext';

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <NavigationProvider>
      <FilterProvider>
        <MetricsProvider>
          {children}
        </MetricsProvider>
      </FilterProvider>
    </NavigationProvider>
  );
};

export default Providers;
