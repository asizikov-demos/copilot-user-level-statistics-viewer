"use client";

import React from 'react';
import { BaseStyles, ThemeProvider } from '@primer/react';
import { MetricsContextProvider } from '../components/MetricsContext';
import { NavigationProvider } from '../state/NavigationContext';
import { MetricsWorkerProvider } from '../state/MetricsWorkerContext';

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    // colorMode is pinned to day so the statically exported HTML is deterministic.
    <ThemeProvider colorMode="day">
      <BaseStyles className="app-base-styles">
        <MetricsWorkerProvider>
          <NavigationProvider>
            <MetricsContextProvider>
              {children}
            </MetricsContextProvider>
          </NavigationProvider>
        </MetricsWorkerProvider>
      </BaseStyles>
    </ThemeProvider>
  );
};

export default Providers;
