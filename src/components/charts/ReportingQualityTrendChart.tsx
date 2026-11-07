'use client';

import { Line } from 'react-chartjs-2';
import type { ReportingQualityMetrics } from '../../types/reportingQuality';
import ChartContainer from '../ui/ChartContainer';
import { registerChartJS } from './utils/chartSetup';
import { createBaseChartOptions, yAxisFormatters } from './utils/chartOptions';
import { createLineDataset } from './utils/chartStyles';
import { chartColors } from './utils/chartColors';
import { formatShortDate } from '../../utils/formatters';

registerChartJS();

export default function ReportingQualityTrendChart({ daily }: { daily: ReportingQualityMetrics['daily'] }) {
  const data = {
    labels: daily.map(day => formatShortDate(day.day)),
    datasets: [
      createLineDataset(chartColors.orange.solid, 'Missing telemetry', daily.map(day => day.missingTelemetryUsers), { spanGaps: false }),
      createLineDataset(chartColors.purple.solid, 'Below minimum', daily.map(day => day.belowMinimumUsers), { spanGaps: false, borderDash: [5, 3], pointStyle: 'rect' }),
    ],
  };
  const options = createBaseChartOptions<'line'>({
    xAxisLabel: 'Date',
    yAxisLabel: 'Distinct users',
    yStepSize: 1,
    yTicksCallback: yAxisFormatters.integer,
    tooltipAfterBodyCallback: items => {
      const day = daily[items[0]?.dataIndex];
      return day ? [
        day.day,
        `Telemetry coverage: ${day.telemetryReportedRecords}/${day.recordCount} records`,
        `Requirements coverage: ${day.requirementsReportedRecords}/${day.recordCount} records`,
      ] : [];
    },
  });
  return (
    <ChartContainer
      title="Daily reporting issues"
      description="Distinct users per day in the full uploaded period. Series overlap; gaps mean that signal was not reported, not zero issues."
      isEmpty={!daily.some(day => day.telemetryReportedRecords > 0 || day.requirementsReportedRecords > 0)}
      emptyState="Telemetry and requirements signals were not reported"
    >
      <Line
        data={data}
        options={options}
        role="img"
        aria-label="Daily distinct users missing telemetry or with below-minimum components"
      />
    </ChartContainer>
  );
}
