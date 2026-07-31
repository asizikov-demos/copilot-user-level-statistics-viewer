'use client';

import { useMemo, useState } from 'react';
import type { TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { SurfaceProductivityReadModel } from '../../../read-models/surfaceProductivity';
import type {
  CopilotSurface,
  DailySurfaceProductivity,
} from '../../../types/surfaceProductivity';
import { formatShortDate } from '../../../utils/formatters';
import { mapReportRangeData } from '../../../utils/timeSeries';
import { registerChartJS } from '../../charts/utils/chartSetup';
import { createBaseChartOptions, yAxisFormatters } from '../../charts/utils/chartOptions';
import { createLineDataset } from '../../charts/utils/chartStyles';
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

const EMPTY_SURFACE_DAY: DailySurfaceProductivity['surfaces'][CopilotSurface] = {
  activeUsers: 0,
  locAdded: 0,
  locDeleted: 0,
  netLocImpact: 0,
};

const TOGGLE_OPTIONS = [
  { value: 'activeUsers', label: 'Daily active users' },
  { value: 'netLocImpact', label: 'Daily net LOC' },
] satisfies Array<{ value: TrendMetric; label: string }>;

export default function SurfaceProductivityTrendChart({
  model,
}: SurfaceProductivityTrendChartProps) {
  const [metric, setMetric] = useState<TrendMetric>('activeUsers');
  const data = useMemo(
    () =>
      mapReportRangeData(
        model.dailyProductivity,
        model.reportStartDay,
        model.reportEndDay,
        entry => entry.date,
        (date, entry) => ({
          date,
          surfaces: entry?.surfaces ?? {
            ide: EMPTY_SURFACE_DAY,
            cli: EMPTY_SURFACE_DAY,
            copilotApp: EMPTY_SURFACE_DAY,
          },
        })
      ),
    [model.dailyProductivity, model.reportEndDay, model.reportStartDay]
  );

  const chartData = {
    labels: data.map(entry => formatShortDate(entry.date)),
    datasets: SURFACE_ORDER.map(surface =>
      createLineDataset(
        SURFACE_METADATA[surface].color,
        SURFACE_METADATA[surface].label,
        data.map(entry => entry.surfaces[surface][metric])
      )
    ),
  };
  const isActiveUsers = metric === 'activeUsers';
  const options = createBaseChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: isActiveUsers ? 'Active users' : 'Net lines changed',
    beginAtZero: isActiveUsers,
    yTicksCallback: yAxisFormatters.localeNumber,
    tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
      const value = context.parsed.y ?? 0;
      if (isActiveUsers) {
        return `${context.dataset.label}: ${value.toLocaleString()} active users`;
      }
      return `${context.dataset.label}: ${value >= 0 ? '+' : ''}${value.toLocaleString()} net LOC`;
    },
  });
  const hasActivity = data.some(entry =>
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
