"use client";

import React from 'react';
import PRUModelUsageChart from './PRUModelUsageChart';
import PRUCostAnalysisChart from './PRUCostAnalysisChart';
import ModelFeatureDistributionChart from './ModelFeatureDistributionChart';

interface PRUUsageAnalysisViewProps {
  modelUsageData: any[]; // existing loose typing consistent with other charts
  pruAnalysisData: any[];
  modelFeatureDistributionData: any[];
  onBack: () => void;
}

export default function PRUUsageAnalysisView({
  modelUsageData,
  pruAnalysisData,
  modelFeatureDistributionData,
  onBack
}: PRUUsageAnalysisViewProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">PRU Usage Analysis</h2>
          <p className="text-gray-600 text-sm mt-1 max-w-2xl">
            Understand premium model utilization, service value consumption, and feature distribution across PRU-consuming activities.
          </p>
        </div>
        <button
          onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md transition-colors"
        >
          ← Back to Overview
        </button>
      </div>

      <div className="mb-10">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Daily PRU vs Standard Model Usage</h3>
        <PRUModelUsageChart data={modelUsageData || []} />
      </div>

      <div className="mb-10">
        <h3 className="text-lg font-medium text-gray-900 mb-4">PRU Service Value Analysis</h3>
        <PRUCostAnalysisChart data={pruAnalysisData || []} />
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Model Feature Distribution</h3>
        <ModelFeatureDistributionChart data={modelFeatureDistributionData || []} />
      </div>
    </div>
  );
}
