'use client';

import React from 'react';
import { useMetrics } from '../MetricsContext';

const AppHeader: React.FC = () => {
  const { hasData, warning, setWarning } = useMetrics();

  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        GitHub Copilot Usage Metrics
      </h1>

      {warning && (
        <div className="mt-4 mx-auto max-w-3xl p-4 bg-amber-50 border border-amber-200 rounded-md text-left">
          <div className="flex items-start justify-between gap-3">
            <p className="text-amber-900 text-sm">{warning}</p>
            <button
              onClick={() => setWarning(null)}
              className="text-sm font-medium text-amber-800 hover:text-amber-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {!hasData && (
        <p className="text-gray-600">
          Upload your GitHub Copilot User Level metrics NDJSON file (.ndjson) to view usage statistics
        </p>
      )}
    </div>
  );
};

export default AppHeader;
