'use client';

import { ChartData, ChartOptions } from 'chart.js';
import { CopilotMetrics } from '../../../../types/metrics';
import ActivityBreakdownChart from '../../../charts/ActivityBreakdownChart';
import { standardActivityColumns } from '../../../charts/utils/activityMetricColumns';

export type LanguageFeatureAggregate = CopilotMetrics['totals_by_language_feature'][number];

interface UserActivityByLanguageAndFeatureChartProps {
  languageFeatureAggregates: LanguageFeatureAggregate[];
  languageBarChartData: ChartData<'bar'>;
  languageBarChartOptions: ChartOptions<'bar'>;
}

const languageChartConfig = {
  title: 'Activity by Language and Feature',
  chartSubtitle: 'Daily Language Generations',
  detailsLabel: 'Detailed Language and Feature Breakdown',
  groupHeader: 'Language',
  unknownLabel: 'Unknown Language',
  totalLabel: 'total generations',
  groupKey: 'language' as const,
  countAccessor: (item: LanguageFeatureAggregate) => item.code_generation_activity_count,
  columns: standardActivityColumns<LanguageFeatureAggregate>(),
};

export default function UserActivityByLanguageAndFeatureChart({
  languageFeatureAggregates,
  languageBarChartData,
  languageBarChartOptions
}: UserActivityByLanguageAndFeatureChartProps) {
  return (
    <ActivityBreakdownChart
      aggregates={languageFeatureAggregates}
      barChartData={languageBarChartData}
      barChartOptions={languageBarChartOptions}
      config={languageChartConfig}
    />
  );
}
