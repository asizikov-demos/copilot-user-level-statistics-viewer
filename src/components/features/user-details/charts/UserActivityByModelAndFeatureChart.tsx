'use client';

import { ChartData, ChartOptions } from 'chart.js';
import type { UserDetailedMetrics } from '../../../../types/aggregatedMetrics';
import ActivityBreakdownChart from '../../../charts/ActivityBreakdownChart';
import { getTotalUserInitiatedInteractionCount } from '../../../../domain/assumedInteractions';
import { getModelIcon } from '../../../icons/ModelIcons';
import { withInteractionsColumns } from '../../../charts/utils/activityMetricColumns';

export type ModelFeatureAggregate = UserDetailedMetrics['modelFeatureAggregates'][number];

interface UserActivityByModelAndFeatureChartProps {
  modelFeatureAggregates: ModelFeatureAggregate[];
  modelBarChartData: ChartData<'bar'>;
  modelBarChartOptions: ChartOptions<'bar'>;
}

const modelChartConfig = {
  title: 'Activity by Model and Feature',
  chartSubtitle: 'Daily Model Interactions',
  detailsLabel: 'Detailed Model and Feature Breakdown',
  groupHeader: 'Model Name',
  unknownLabel: 'Unknown Model',
  totalLabel: 'total interactions',
  groupKey: 'model' as const,
  countAccessor: getTotalUserInitiatedInteractionCount,
  groupIcon: getModelIcon,
  columns: withInteractionsColumns<ModelFeatureAggregate>(),
};

export default function UserActivityByModelAndFeatureChart({
  modelFeatureAggregates,
  modelBarChartData,
  modelBarChartOptions
}: UserActivityByModelAndFeatureChartProps) {
  return (
    <ActivityBreakdownChart
      aggregates={modelFeatureAggregates}
      barChartData={modelBarChartData}
      barChartOptions={modelBarChartOptions}
      config={modelChartConfig}
    />
  );
}
