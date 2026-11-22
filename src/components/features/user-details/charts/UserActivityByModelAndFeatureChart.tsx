'use client';

import { useTheme } from '@primer/react';
import { useMemo, useState } from 'react';
import type { TooltipItem } from 'chart.js';
import type { UserDetailedMetrics } from '../../../../types/aggregatedMetrics';
import type { UserDayData } from '../../../../types/metrics';
import ActivityBreakdownChart from '../../../charts/ActivityBreakdownChart';
import { getTotalUserInitiatedInteractionCount } from '../../../../domain/assumedInteractions';
import { getModelIcon } from '../../../icons/ModelIcons';
import { padDailyReportRangeData } from '../../../charts/utils/dailyBarChart';
import { createBarDataset } from '../../../charts/utils/chartStyles';
import { getSequentialColor } from '../../../charts/utils/chartColors';
import { createStackedBarChartOptions, hasNonZeroBarValue } from '../../../charts/utils/chartOptions';
import { formatShortDate, formatModelDisplayName } from '../../../../utils/formatters';
import type { UserModelActivitySummary } from '../../../../domain/calculators/userPresentationCalculator';
import SimpleSelect from '../../../ui/SimpleSelect';
import MetricsTable, { type TableColumn } from '../../../ui/MetricsTable';
import DisclosureSection from '../../../ui/DisclosureSection';
import EmptyState from '../../../ui/EmptyState';
import { GraphIcon } from '@primer/octicons-react';
import { formatIDEName, getIDEIcon } from '../../../icons/IDEIcons';
import type { ComponentType } from 'react';

export type ModelFeatureAggregate = UserDetailedMetrics['modelFeatureAggregates'][number];

interface UserActivityByModelAndFeatureChartProps {
  modelFeatureAggregates: ModelFeatureAggregate[];
  days: UserDayData[];
  reportStartDay: string;
  reportEndDay: string;
  modelActivity?: UserModelActivitySummary;
}

type ModelRequestRow = UserModelActivitySummary['rows'][number];
function NameWithIcon({ icon: Icon, name }: { icon: ComponentType; name: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-shrink-0" aria-hidden="true"><Icon /></span>
      <span>{name}</span>
    </div>
  );
}

const numericColumn = (id: 'requestCount' | 'promptTokens' | 'outputTokens', header: string): TableColumn<ModelRequestRow> => ({
  id, header,
  headerClassName: 'px-6 py-3 text-right',
  className: 'px-6 py-4 whitespace-nowrap text-right tabular-nums',
  renderCell: row => row[id].toLocaleString(),
});
const requestColumns: TableColumn<ModelRequestRow>[] = [
  { id: 'model', header: 'Model', renderCell: row => <NameWithIcon icon={getModelIcon(row.model)} name={formatModelDisplayName(row.model)} /> },
  { id: 'client', header: 'Client', renderCell: row => <NameWithIcon icon={getIDEIcon(row.client)} name={formatIDEName(row.client)} /> },
  { id: 'mode', header: 'Selection mode', renderCell: row => row.modelSelectionMode },
  numericColumn('requestCount', 'Model requests'),
  numericColumn('promptTokens', 'Prompt tokens'),
  numericColumn('outputTokens', 'Output tokens'),
];
type PaddedDay = {
  day: string;
  totals_by_model_feature: UserDayData['totals_by_model_feature'];
};

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
  formatGroupName: formatModelDisplayName,
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

export function buildModelBarChartData(
  days: UserDayData[],
  reportStartDay: string,
  reportEndDay: string,
) {
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
    return createBarDataset(getSequentialColor(index), formatModelDisplayName(model), data);
  }).filter(dataset => dataset.data.some(value => value > 0));

  return {
    labels: paddedDays.map(d => formatShortDate(d.day)),
    datasets,
  };
}

export default function UserActivityByModelAndFeatureChart({
  modelFeatureAggregates,
  days,
  reportStartDay,
  reportEndDay,
  modelActivity,
}: UserActivityByModelAndFeatureChartProps) {
  const { colorScheme } = useTheme();
  const [selectedSource, setSelectedSource] = useState<'interactions' | 'requests' | null>(null);
  const barChartData = useMemo(
    () => buildModelBarChartData(days, reportStartDay, reportEndDay),
    [days, reportStartDay, reportEndDay, colorScheme],
  );
  const hasClientInteractions = modelFeatureAggregates.some(item => getTotalUserInitiatedInteractionCount(item) > 0)
    || days.some(day => day.totals_by_model_feature.some(item => getTotalUserInitiatedInteractionCount(item) > 0));
  const source = selectedSource ?? (hasClientInteractions ? 'interactions'
    : modelActivity?.rows.some(row => row.requestCount > 0) ? 'requests' : 'interactions');
  const isRequests = source === 'requests';
  const unit = isRequests ? 'requests' : 'interactions';
  const modelBarChartOptions = createStackedBarChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: isRequests ? 'Model requests' : 'Interactions',
    tooltipFilter: hasNonZeroBarValue,
    tooltipLabelCallback: (context: TooltipItem<'bar'>) => {
      const label = context.dataset.label ?? '';
      const value = context.parsed.y ?? 0;
      return `${label}: ${value.toLocaleString()} ${unit}`;
    },
  });
  const requestChartData = useMemo(
    () => ({
      labels: modelActivity?.dates.map(formatShortDate) ?? [],
      datasets: modelActivity?.requests.map(({ model, values }, index) =>
        createBarDataset(getSequentialColor(index), formatModelDisplayName(model), values)) ?? [],
    }),
    [modelActivity, colorScheme],
  );
  const requestFooter = (
    <DisclosureSection label="Detailed Model Request Breakdown">
      <MetricsTable
        data={modelActivity?.rows ?? []}
        columns={requestColumns}
        tableContainerClassName="overflow-x-auto"
        getRowKey={row => JSON.stringify([row.client, row.model, row.modelSelectionMode])}
        pageSize={10}
        itemLabel="model rows"
        emptyState={<p className="text-muted">No model request breakdown reported.</p>}
      />
      <p className="mt-4 text-xs text-muted">
        Missing server-side records are gaps, not zero usage.
      </p>
    </DisclosureSection>
  );

  return (
    <ActivityBreakdownChart
      aggregates={modelFeatureAggregates}
      barChartData={isRequests ? requestChartData : barChartData}
      barChartOptions={modelBarChartOptions}
      config={isRequests ? { ...modelChartConfig, chartSubtitle: 'Daily Model Requests' } : modelChartConfig}
      headerActions={(
        <SimpleSelect
          label="Model activity data source"
          value={source}
          onChange={setSelectedSource}
          options={[
            { value: 'interactions', label: 'Client-side telemetry' },
            { value: 'requests', label: 'Server-side model requests' },
          ]}
        />
      )}
      footerOverride={isRequests ? requestFooter : undefined}
      emptyState={(
        <EmptyState
          icon={GraphIcon}
          heading={isRequests ? 'No model requests available' : 'No client-side model chart data available'}
        />
      )}
    />
  );
}
