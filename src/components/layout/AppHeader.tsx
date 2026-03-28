'use client';

import React from 'react';
import { useMetrics } from '../MetricsContext';

const AppHeader: React.FC = () => {
  const { warning, setWarning } = useMetrics();

  if (!warning) return null;

  return (
    <div className="mb-4">
      <div className="mx-auto max-w-3xl p-4 bg-amber-50 border border-amber-200 rounded-md text-left">
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
    </div>
  );
};

export default AppHeader;
