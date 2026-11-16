"use client";

import React from 'react';
import { AppThemeProvider } from '../state/AppThemeProvider';
import { MetricsContextProvider } from '../components/MetricsContext';
import { NavigationProvider } from '../state/NavigationContext';
import { MetricsWorkerProvider } from '../state/MetricsWorkerContext';

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AppThemeProvider>
      <MetricsWorkerProvider>
        <NavigationProvider>
          <MetricsContextProvider>
            {children}
          </MetricsContextProvider>
        </NavigationProvider>
      </MetricsWorkerProvider>
    </AppThemeProvider>
  );
};

export default Providers;
