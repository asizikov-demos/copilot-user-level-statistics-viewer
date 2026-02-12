'use client';

import React from 'react';
import { useRawMetrics } from '../MetricsContext';

const AppHeader: React.FC = () => {
  const { hasData } = useRawMetrics();

  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        GitHub Copilot Usage Metrics
      </h1>
      {!hasData && (
        <p className="text-gray-600">
          Upload your GitHub Copilot User Level metrics JSON / NDJSON file (.json or .ndjson) to view usage statistics
        </p>
      )}
    </div>
  );
};

export default AppHeader;
