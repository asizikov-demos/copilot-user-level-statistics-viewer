'use client';

import React from 'react';
import SectionHeader from './ui/SectionHeader';
import { useMetricsData } from './MetricsContext';
import ModelsUsageChart from './charts/ModelsUsageChart';

interface ModelDetailsViewProps {
  onBack: () => void;
}

export default function ModelDetailsView({ onBack }: ModelDetailsViewProps) {
  const { filteredData } = useMetricsData();
  const metrics = filteredData?.metrics || [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <SectionHeader
        title={`Model Usage`}
        description="Detailed model insights along with model usage trends."
        onBack={onBack}
        className="mb-6"
      />
      <div className="space-y-6">
        <div className="text-sm text-gray-500">
        </div>
        <ModelsUsageChart metrics={metrics} variant="standard" />
        <ModelsUsageChart metrics={metrics} variant="premium" />
      </div>
    </div>
  );
}
