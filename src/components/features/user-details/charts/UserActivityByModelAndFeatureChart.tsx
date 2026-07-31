'use client';

import { useMemo } from 'react';
import type { TooltipItem } from 'chart.js';
import type { UserDetailedMetrics } from '../../../../types/aggregatedMetrics';
import type { UserDayData } from '../../../../types/metrics';
import ActivityBreakdownChart from '../../../charts/ActivityBreakdownChart';
import { getTotalUserInitiatedInteractionCount } from '../../../../domain/assumedInteractions';
import { getModelIcon } from '../../../icons/ModelIcons';
import { padDailyReportRangeData } from '../../../charts/utils/dailyBarChart';
import { createBarDataset } from '../../../charts/utils/chartStyles';
import { getSequentialColor } from '../../../charts/utils/chartColors';
import { createStackedBarChartOptions } from '../../../charts/utils/chartOptions';
import { formatShortDate } from '../../../../utils/formatters';

export type ModelFeatureAggregate = UserDetailedMetrics['modelFeatureAggregates'][number];

interface UserActivityByModelAndFeatureChartProps {
  modelFeatureAggregates: ModelFeatureAggregate[];
  days: UserDayData[];
  reportStartDay: string;
  reportEndDay: string;
}

type PaddedDay = {
  day: string;
  totals_by_model_feature: UserDayData['totals_by_model_feature'];
};

const modelBarChartOptions = createStackedBarChartOptions({
  xAxisLabel: 'Date',
  yAxisLabel: 'Interactions',
  tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
    const label = context.dataset.label ?? '';
    const value = context.parsed.y ?? 0;
    return `${label}: ${value.toLocaleString()} interactions`;
  },
});

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
  days,
  reportStartDay,
  reportEndDay,
}: UserActivityByModelAndFeatureChartProps) {
  const { barChartData } = useMemo(() => {
    const allModels = Array.from(
      new Set(days.flatMap(day => day.totals_by_model_feature.map(item => item.model)))
    ).filter(model => model && model !== '' && model !== 'unknown').sort();

    const paddedDays = padDailyReportRangeData<PaddedDay>(
      days.map(d => ({ day: d.day, totals_by_model_feature: d.totals_by_model_feature })),
      reportStartDay,
      reportEndDay,
      d => d.day,
      date => ({ day: date, totals_by_model_feature: [] }),
    );

    const datasets = allModels.map((model, index) => {
      const data = paddedDays.map(dayData =>
        dayData.totals_by_model_feature
          .filter(item => item.model === model)
          .reduce((sum, item) => sum + getTotalUserInitiatedInteractionCount(item), 0)
      );
      return createBarDataset(getSequentialColor(index), model.charAt(0).toUpperCase() + model.slice(1), data);
    }).filter(dataset => dataset.data.some(value => value > 0));

    return {
      barChartData: {
        labels: paddedDays.map(d => formatShortDate(d.day)),
        datasets,
      },
    };
  }, [days, reportStartDay, reportEndDay]);

  return (
    <ActivityBreakdownChart
      aggregates={modelFeatureAggregates}
      barChartData={barChartData}
      barChartOptions={modelBarChartOptions}
      config={modelChartConfig}
    />
  );
}
