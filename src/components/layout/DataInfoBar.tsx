'use client';

import React from 'react';
import { useMetrics } from '../MetricsContext';

const DataInfoBar: React.FC = () => {
  const { aggregatedMetrics, filename, recordCount } = useMetrics();

  if (!aggregatedMetrics) return null;

  const { reportStartDay, reportEndDay } = aggregatedMetrics.stats;

  return (
    <div className="fixed top-16 left-0 right-0 z-30 hidden h-9 items-center border-b border-[#d1d9e0] bg-[#f6f8fa] print:hidden lg:flex">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#636c76]">
          <span>
            File: <span className="font-semibold text-[#1f2328]">{filename ?? 'unknown'}</span>
          </span>
          <span className="hidden sm:inline text-[#d1d9e0]">|</span>
          <span>
            Report window:{' '}
            <span className="font-semibold text-[#1f2328]">
              {reportStartDay} to {reportEndDay}
            </span>
          </span>
          <span className="hidden sm:inline text-[#d1d9e0]">|</span>
          <span>
            Total rows:{' '}
            <span className="font-semibold text-[#1f2328]">
              {recordCount?.toLocaleString() ?? '—'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default DataInfoBar;
