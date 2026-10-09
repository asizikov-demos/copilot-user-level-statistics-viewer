'use client';

import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import type { SurfaceProductivityReadModel } from '../../../read-models/surfaceProductivity';
import { registerChartJS } from '../../charts/utils/chartSetup';
import { yAxisFormatters } from '../../charts/utils/chartOptions';
import { createLineDataset } from '../../charts/utils/chartStyles';
import { createDailyReportRangeChartConfig } from '../../charts/utils/dailyBarChart';
import ChartContainer from '../../ui/ChartContainer';
import ChartToggleButtons from '../../ui/ChartToggleButtons';
import {
  SURFACE_METADATA,
  SURFACE_ORDER,
} from './surfaceMetadata';

registerChartJS();

type TrendMetric = 'activeUsers' | 'netLocImpact';

interface SurfaceProductivityTrendChartProps {
  model: Pick<
    SurfaceProductivityReadModel,
    'dailyProductivity' | 'reportStartDay' | 'reportEndDay'
  >;
}

const TOGGLE_OPTIONS = [
  { value: 'activeUsers', label: 'Daily active users' },
  { value: 'netLocImpact', label: 'Daily net LOC' },
] satisfies Array<{ value: TrendMetric; label: string }>;

export default function SurfaceProductivityTrendChart({
  model,
}: SurfaceProductivityTrendChartProps) {
  const [metric, setMetric] = useState<TrendMetric>('activeUsers');
  const isActiveUsers = metric === 'activeUsers';
  const { chartData, options } = useMemo(
    () => createDailyReportRangeChartConfig<
      SurfaceProductivityReadModel['dailyProductivity'][number],
      'line'
    >({
      data: model.dailyProductivity,
      reportStartDay: model.reportStartDay,
      reportEndDay: model.reportEndDay,
      type: 'line',
      series: SURFACE_ORDER.map(surface => ({
        color: SURFACE_METADATA[surface].color,
        label: SURFACE_METADATA[surface].label,
        getValue: entry => entry?.surfaces[surface][metric] ?? 0,
      })),
      createDataset: (series, values) => createLineDataset(series.color, series.label, values),
      options: {
        xAxisLabel: 'Date',
        yAxisLabel: isActiveUsers ? 'Active users' : 'Net lines changed',
        beginAtZero: isActiveUsers,
        yTicksCallback: yAxisFormatters.localeNumber,
        tooltipLabelCallback: context => {
          const value = context.parsed.y ?? 0;
          if (isActiveUsers) {
            return `${context.dataset.label}: ${value.toLocaleString()} active users`;
          }
          return `${context.dataset.label}: ${value >= 0 ? '+' : ''}${value.toLocaleString()} net LOC`;
        },
      },
    }),
    [isActiveUsers, metric, model.dailyProductivity, model.reportEndDay, model.reportStartDay]
  );
  const hasActivity = model.dailyProductivity.some(entry =>
    SURFACE_ORDER.some(surface =>
      entry.surfaces[surface].activeUsers > 0
      || entry.surfaces[surface].netLocImpact !== 0
    )
  );

  return (
    <ChartContainer
      title="How surface activity changes over time"
      description={
        isActiveUsers
          ? 'Daily users are counted once per surface. A person active in more than one surface appears in each relevant series.'
          : 'Net LOC is lines added minus lines deleted, attributed to the surface that reported the activity.'
      }
      headerActions={
        <ChartToggleButtons
          options={TOGGLE_OPTIONS}
          value={metric}
          onChange={setMetric}
        />
      }
      isEmpty={!hasActivity}
      emptyState="No IDE, CLI, or Copilot App activity was detected in this report."
    >
      <Line data={chartData} options={options} />
    </ChartContainer>
  );
}
