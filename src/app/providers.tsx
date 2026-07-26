"use client";

import React from 'react';
import { MetricsProvider } from '../components/MetricsContext';
import { NavigationProvider } from '../state/NavigationContext';
import { MetricsWorkerProvider } from '../workers/MetricsWorkerContext';

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MetricsWorkerProvider>
      <NavigationProvider>
        <MetricsProvider>
          {children}
        </MetricsProvider>
      </NavigationProvider>
    </MetricsWorkerProvider>
  );
};

export default Providers;
