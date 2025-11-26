'use client';

import { ChartData, ChartOptions } from 'chart.js';
import { CopilotMetrics } from '../../types/metrics';
import ActivityBreakdownChart from './ActivityBreakdownChart';

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
  unknownLabel: 'Unknown Language',
  totalLabel: 'total generations',
  groupKey: 'language' as const,
  countAccessor: (item: LanguageFeatureAggregate) => item.code_generation_activity_count,
  columns: [
    { header: 'Generation', accessor: (item: LanguageFeatureAggregate) => item.code_generation_activity_count },
    { header: 'Acceptance', accessor: (item: LanguageFeatureAggregate) => item.code_acceptance_activity_count },
    { header: 'LOC Added', accessor: (item: LanguageFeatureAggregate) => item.loc_added_sum },
    { header: 'LOC Deleted', accessor: (item: LanguageFeatureAggregate) => item.loc_deleted_sum },
    { header: 'Suggested Add', accessor: (item: LanguageFeatureAggregate) => item.loc_suggested_to_add_sum },
    { header: 'Suggested Delete', accessor: (item: LanguageFeatureAggregate) => item.loc_suggested_to_delete_sum },
  ],
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
