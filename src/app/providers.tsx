"use client";

import React from 'react';
import { MetricsProvider } from '../components/MetricsContext';
import { NavigationProvider } from '../state/NavigationContext';

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <NavigationProvider>
      <MetricsProvider>
        {children}
      </MetricsProvider>
    </NavigationProvider>
  );
};

export default Providers;
