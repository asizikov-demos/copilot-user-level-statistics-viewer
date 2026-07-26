"use client";

import React from 'react';
import { MetricsContextProvider } from '../components/MetricsContext';
import { NavigationProvider } from '../state/NavigationContext';
import { MetricsWorkerProvider } from '../state/MetricsWorkerContext';

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MetricsWorkerProvider>
      <NavigationProvider>
        <MetricsContextProvider>
          {children}
        </MetricsContextProvider>
      </NavigationProvider>
    </MetricsWorkerProvider>
  );
};

export default Providers;
