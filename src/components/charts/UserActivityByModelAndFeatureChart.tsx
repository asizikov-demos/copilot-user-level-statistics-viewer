'use client';

import { ChartData, ChartOptions } from 'chart.js';
import type { UserDetailedMetrics } from '../../types/aggregatedMetrics';
import ActivityBreakdownChart from './ActivityBreakdownChart';
import { getTotalUserInitiatedInteractionCount } from '../../domain/assumedInteractions';

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
  unknownLabel: 'Unknown Model',
  totalLabel: 'total interactions',
  groupKey: 'model' as const,
  countAccessor: getTotalUserInitiatedInteractionCount,
  columns: [
    { header: 'Interactions', accessor: getTotalUserInitiatedInteractionCount },
    { header: 'Generation', accessor: (item: ModelFeatureAggregate) => item.code_generation_activity_count },
    { header: 'Acceptance', accessor: (item: ModelFeatureAggregate) => item.code_acceptance_activity_count },
    { header: 'LOC Added', accessor: (item: ModelFeatureAggregate) => item.loc_added_sum },
    { header: 'LOC Deleted', accessor: (item: ModelFeatureAggregate) => item.loc_deleted_sum },
    { header: 'Suggested Add', accessor: (item: ModelFeatureAggregate) => item.loc_suggested_to_add_sum },
    { header: 'Suggested Delete', accessor: (item: ModelFeatureAggregate) => item.loc_suggested_to_delete_sum },
  ],
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
