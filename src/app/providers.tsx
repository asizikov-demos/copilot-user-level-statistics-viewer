"use client";

import React from 'react';
import { MetricsProvider } from '../components/MetricsContext';

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MetricsProvider>
      {children}
    </MetricsProvider>
  );
};

export default Providers;
