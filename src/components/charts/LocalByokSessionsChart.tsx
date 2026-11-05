'use client';

import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import { registerChartJS } from './utils/chartSetup';
import { createStackedBarChartOptions, yAxisFormatters } from './utils/chartOptions';
import { createBarDataset } from './utils/chartStyles';
import { getIdeColor } from './utils/chartColors';
import { formatShortDate } from '../../utils/formatters';
import { formatIDEName } from '../../utils/ideNames';
import { mapReportRangeData } from '../../utils/timeSeries';
import type { LocalByokUsageData } from '../../types/metrics';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface LocalByokSessionsChartProps {
  data: LocalByokUsageData;
  reportStartDay: string;
  reportEndDay: string;
}

export default function LocalByokSessionsChart({
  data,
  reportStartDay,
  reportEndDay,
}: LocalByokSessionsChartProps) {
  const { surfaces, daily, totalSessions, totalRequests, totalUsers } = data;

  const chartData = useMemo(() => {
    const series = reportStartDay && reportEndDay
      ? mapReportRangeData(daily, reportStartDay, reportEndDay, d => d.date, (date, entry) => ({
          date,
          sessionsBySurface: entry?.sessionsBySurface ?? {},
        }))
      : daily;

    return {
      labels: series.map(d => formatShortDate(d.date)),
      datasets: surfaces.map(surface =>
        createBarDataset(
          getIdeColor(surface),
          formatIDEName(surface),
          series.map(d => d.sessionsBySurface[surface] ?? 0)
        )
      ),
    };
  }, [daily, surfaces, reportStartDay, reportEndDay]);

  const options = createStackedBarChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Sessions',
    xMaxRotation: 45,
    xAutoSkip: true,
    yTicksCallback: yAxisFormatters.integer,
    tooltipFooterCallback: (items: TooltipItem<'bar'>[]) => {
      const total = items.reduce((sum, item) => sum + (Number(item.raw) || 0), 0);
      return `Total: ${total.toLocaleString()} sessions`;
    },
  });

  return (
    <ChartContainer
      title="Local Bring Your Own Key Sessions"
      description="Daily sessions using a locally configured Bring Your Own Key model, stacked by editor."
      isEmpty={totalSessions === 0}
      emptyState="No local BYOK usage in this report"
      summaryStats={[
        { value: totalSessions.toLocaleString(), label: 'Total Sessions' },
        { value: totalRequests.toLocaleString(), label: 'Total Requests' },
        { value: totalUsers.toLocaleString(), label: 'BYOK Users' },
      ]}
    >
      <div className="h-full">
        <Bar data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
}
