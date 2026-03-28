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
import { ViewPanel } from './ui';

interface PRUUsageAnalysisViewProps {
  modelUsageData: DailyModelUsageData[];
  pruAnalysisData: DailyPRUAnalysisData[];
  modelFeatureDistributionData: ModelFeatureDistributionData[];
}

export default function PRUUsageAnalysisView({
  modelUsageData,
  pruAnalysisData,
  modelFeatureDistributionData,
}: PRUUsageAnalysisViewProps) {
  return (
    <ViewPanel
      headerProps={{
        title: 'PRU Usage Analysis',
        description: 'Understand premium model utilization, service value consumption, and feature distribution across PRU-consuming activities.',
      }}
      contentClassName="space-y-12"
    >
      <PRUModelUsageChart data={modelUsageData || []} />

      <PRUCostAnalysisChart data={pruAnalysisData || []} />

      <ModelFeatureDistributionChart data={modelFeatureDistributionData || []} />
    </ViewPanel>
  );
}
