'use client';

import { Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import type { DailyVSCodeAgentUsage, VSCodeAgentUsage } from '../../types/vscodeAgent';
import { formatShortDate } from '../../utils/formatters';
import { mapReportRangeData } from '../../utils/timeSeries';
import ChartContainer from '../ui/ChartContainer';
import MetricsTable, { type TableColumn } from '../ui/MetricsTable';
import { chartColors } from './utils/chartColors';
import { createBaseChartOptions, yAxisFormatters } from './utils/chartOptions';
import { createLineDataset } from './utils/chartStyles';
import { registerChartJS } from './utils/chartSetup';

registerChartJS();

interface VSCodeAgentUsageChartProps {
  data: VSCodeAgentUsage;
  reportStartDay: string;
  reportEndDay: string;
  hideUnreportedMeasures?: boolean;
}

function formatCount(value: number | null): string {
  return value === null ? 'Not reported' : value.toLocaleString();
}

function coverage(reported: number, total: number): string {
  return `${reported.toLocaleString()} of ${total.toLocaleString()} records reporting`;
}

const measures = [
  { key: 'activeUsers', label: 'Active users', coverageKey: 'usageReportedRecords', color: chartColors.blue.solid },
  { key: 'sessionCount', label: 'Sessions', coverageKey: 'sessionsReportedRecords', color: chartColors.green.solid },
  { key: 'userMessages', label: 'User messages', coverageKey: 'messagesReportedRecords', color: chartColors.purple.solid },
] as const;

const columns: TableColumn<DailyVSCodeAgentUsage>[] = [
  { id: 'date', header: 'Date', accessor: 'date' },
  ...measures.map(measure => ({
    id: measure.key,
    header: measure.label,
    renderCell: (day: DailyVSCodeAgentUsage) => (
      <span title={coverage(day[measure.coverageKey], day.recordCount)}>
        {formatCount(day[measure.key])}
        {day[measure.key] !== null && day[measure.coverageKey] < day.recordCount && ' (partial)'}
      </span>
    ),
  })),
];

export default function VSCodeAgentUsageChart({
  data,
  reportStartDay,
  reportEndDay,
  hideUnreportedMeasures = false,
}: VSCodeAgentUsageChartProps) {
  const { summary } = data;
  const visibleMeasures = hideUnreportedMeasures
    ? measures.filter(measure => summary[measure.key] !== null)
    : measures;
  if (visibleMeasures.length === 0) return null;

  const visibleColumns = columns.filter(column =>
    column.id === 'date' || visibleMeasures.some(measure => measure.key === column.id)
  );
  const reportedDays = hideUnreportedMeasures
    ? data.daily.filter(day => visibleMeasures.some(measure => day[measure.key] !== null))
    : data.daily;
  const displayData = mapReportRangeData(
    data.daily, reportStartDay, reportEndDay, day => day.date,
    (date, day) => ({ date, day }),
  );
  const chartData = {
    labels: displayData.map(entry => formatShortDate(entry.date)),
    datasets: visibleMeasures.map(measure => createLineDataset(
      measure.color,
      measure.label,
      displayData.map(entry => entry.day?.[measure.key] ?? null),
      { spanGaps: false },
    )),
  };
  const options = createBaseChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Reported count',
    yTicksCallback: yAxisFormatters.integer,
    xAutoSkip: true,
    tooltipLabelCallback: context => {
      const measure = visibleMeasures[context.datasetIndex];
      const day = displayData[context.dataIndex].day;
      return day
        ? `${measure.label}: ${formatCount(day[measure.key])} (${coverage(day[measure.coverageKey], day.recordCount)})`
        : 'Not reported';
    },
  }) as ChartOptions<'line'>;

  return (
    <ChartContainer
      title="VS Code Agents"
      description="Dedicated Agents-window activity, separate from editor Agent Mode."
      isEmpty={visibleMeasures.every(measure => summary[measure.key] === null)}
      emptyState="VS Code Agents metrics are not reported in this data. Missing values do not mean zero usage."
      summaryStats={visibleMeasures.map(measure => ({
        label: measure.key === 'activeUsers' ? 'Distinct active users' : measure.label,
        value: formatCount(summary[measure.key]),
        sublabel: coverage(summary[measure.coverageKey], summary.recordCount),
      }))}
      footer={(
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Reported values only. Gaps indicate missing data; zero means no recorded usage.
          </p>
          <MetricsTable
            data={reportedDays}
            columns={visibleColumns}
            getRowKey={day => day.date}
            initialCount={7}
            tableContainerClassName="overflow-x-auto"
            buttonCollapsedLabel={total => `Show all ${total} days`}
            buttonExpandedLabel="Show fewer days"
          />
        </div>
      )}
    >
      <Line
        data={chartData}
        options={options}
        role="img"
        aria-label={`Daily VS Code Agents: ${visibleMeasures.map(measure => measure.label.toLowerCase()).join(', ')}. Exact reported values are in the table below.`}
      />
    </ChartContainer>
  );
}
