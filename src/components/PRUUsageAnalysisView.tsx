"use client";

import React from 'react';
import PRUModelUsageChart from './charts/PRUModelUsageChart';
import PRUCostAnalysisChart from './charts/PRUCostAnalysisChart';
import ModelFeatureDistributionChart from './charts/ModelFeatureDistributionChart';
import type {
  DailyModelUsageData,
  DailyPRUAnalysisData,
  ModelFeatureDistributionData
} from '../domain/calculators/metricCalculators';
import type { VoidCallback } from '../types/events';
import { ViewPanel } from './ui';

interface PRUUsageAnalysisViewProps {
  modelUsageData: DailyModelUsageData[];
  pruAnalysisData: DailyPRUAnalysisData[];
  modelFeatureDistributionData: ModelFeatureDistributionData[];
  onBack: VoidCallback;
}

export default function PRUUsageAnalysisView({
  modelUsageData,
  pruAnalysisData,
  modelFeatureDistributionData,
  onBack
}: PRUUsageAnalysisViewProps) {
  return (
    <ViewPanel
      headerProps={{
        title: 'PRU Usage Analysis',
        description: 'Understand premium model utilization, service value consumption, and feature distribution across PRU-consuming activities.',
        onBack,
      }}
      contentClassName="space-y-12"
    >
      <div>
        <PRUModelUsageChart data={modelUsageData || []} />
      </div>

      <div className="pt-4">
        <PRUCostAnalysisChart data={pruAnalysisData || []} />
      </div>

      <div className="pt-4">
        <ModelFeatureDistributionChart data={modelFeatureDistributionData || []} />
      </div>
    </ViewPanel>
  );
}
