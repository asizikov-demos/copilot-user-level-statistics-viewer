'use client';

import { useMemo } from 'react';
import type { TooltipItem } from 'chart.js';
import type { CopilotMetrics, UserDayData } from '../../../../types/metrics';
import ActivityBreakdownChart from '../../../charts/ActivityBreakdownChart';
import { padDailyReportRangeData } from '../../../charts/utils/dailyBarChart';
import { createBarDataset } from '../../../charts/utils/chartStyles';
import { getSequentialColor } from '../../../charts/utils/chartColors';
import { createStackedBarChartOptions } from '../../../charts/utils/chartOptions';
import { formatShortDate } from '../../../../utils/formatters';

export type LanguageFeatureAggregate = CopilotMetrics['totals_by_language_feature'][number];

interface UserActivityByLanguageAndFeatureChartProps {
  languageFeatureAggregates: LanguageFeatureAggregate[];
  days: UserDayData[];
  reportStartDay: string;
  reportEndDay: string;
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
  columns: [
    { header: 'Generation', accessor: (item: LanguageFeatureAggregate) => item.code_generation_activity_count },
    { header: 'Acceptance', accessor: (item: LanguageFeatureAggregate) => item.code_acceptance_activity_count },
    { header: 'LOC Added', accessor: (item: LanguageFeatureAggregate) => item.loc_added_sum },
    { header: 'LOC Deleted', accessor: (item: LanguageFeatureAggregate) => item.loc_deleted_sum },
    { header: 'Suggested Add', accessor: (item: LanguageFeatureAggregate) => item.loc_suggested_to_add_sum },
    { header: 'Suggested Delete', accessor: (item: LanguageFeatureAggregate) => item.loc_suggested_to_delete_sum },
  ],
};

type PaddedDay = {
  day: string;
  totals_by_language_feature: UserDayData['totals_by_language_feature'];
};

const languageBarChartOptions = createStackedBarChartOptions({
  xAxisLabel: 'Date',
  yAxisLabel: 'Generations',
  tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
    const label = context.dataset.label ?? '';
    const value = context.parsed.y ?? 0;
    return `${label}: ${value.toLocaleString()} generations`;
  },
});

export default function UserActivityByLanguageAndFeatureChart({
  languageFeatureAggregates,
  days,
  reportStartDay,
  reportEndDay,
}: UserActivityByLanguageAndFeatureChartProps) {
  const { barChartData } = useMemo(() => {
    const allLanguages = Array.from(
      new Set(days.flatMap(day => day.totals_by_language_feature.map(item => item.language)))
    ).filter(lang => lang && lang !== '' && lang !== 'unknown').sort();

    const paddedDays = padDailyReportRangeData<PaddedDay>(
      days.map(d => ({ day: d.day, totals_by_language_feature: d.totals_by_language_feature })),
      reportStartDay,
      reportEndDay,
      d => d.day,
      date => ({ day: date, totals_by_language_feature: [] }),
    );

    const datasets = allLanguages.map((language, index) => {
      const data = paddedDays.map(dayData =>
        dayData.totals_by_language_feature
          .filter(item => item.language === language)
          .reduce((sum, item) => sum + item.code_generation_activity_count, 0)
      );
      return createBarDataset(getSequentialColor(index), language.charAt(0).toUpperCase() + language.slice(1), data);
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
      aggregates={languageFeatureAggregates}
      barChartData={barChartData}
      barChartOptions={languageBarChartOptions}
      config={languageChartConfig}
    />
  );
}
