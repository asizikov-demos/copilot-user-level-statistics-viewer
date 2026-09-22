'use client';

import { Bar, Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import type { VSCodeAgentUsage } from '../../types/vscodeAgent';
import { formatShortDate } from '../../utils/formatters';
import { mapReportRangeData } from '../../utils/timeSeries';
import ChartContainer from '../ui/ChartContainer';
import { chartColors } from './utils/chartColors';
import { createBaseChartOptions, yAxisFormatters } from './utils/chartOptions';
import { createBarDataset, createLineDataset } from './utils/chartStyles';
import { registerChartJS } from './utils/chartSetup';

registerChartJS();

interface VSCodeAgentUsageChartProps {
  data: VSCodeAgentUsage;
  reportStartDay: string;
  reportEndDay: string;
  scope?: 'aggregate' | 'user';
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

export default function VSCodeAgentUsageChart({
  data,
  reportStartDay,
  reportEndDay,
  scope = 'aggregate',
}: VSCodeAgentUsageChartProps) {
  const { summary } = data;
  const isUser = scope === 'user';
  const visibleMeasures = isUser
    ? measures.filter(measure => measure.key !== 'activeUsers' && summary[measure.key] !== null)
    : measures;
  if (visibleMeasures.length === 0) return null;

  const displayData = mapReportRangeData(
    data.daily, reportStartDay, reportEndDay, day => day.date,
    (date, day) => ({ date, day }),
  );
  const labels = displayData.map(entry => formatShortDate(entry.date));
  const series = visibleMeasures.map(measure => ({
    ...measure,
    values: displayData.map(entry => entry.day?.[measure.key] ?? null),
  }));
  const ariaLabel = `Daily VS Code Agents: ${visibleMeasures.map(measure => measure.label.toLowerCase()).join(', ')}.`;
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
  });

  return (
    <ChartContainer
      title="VS Code Agents"
      description="Dedicated Agents-window activity, separate from editor Agent Mode."
      isEmpty={visibleMeasures.every(measure => summary[measure.key] === null)}
      emptyState="VS Code Agents metrics are not reported in this data. Missing values do not mean zero usage."
      summaryStats={visibleMeasures.map(measure => ({
        label: measure.key === 'activeUsers' ? 'Distinct active users' : measure.label,
        value: formatCount(summary[measure.key]),
      }))}
    >
      {isUser ? (
        <Bar
          data={{
            labels,
            datasets: series.map(measure => createBarDataset(measure.color, measure.label, measure.values)),
          }}
          options={options as ChartOptions<'bar'>}
          role="img"
          aria-label={ariaLabel}
        />
      ) : (
        <Line
          data={{
            labels,
            datasets: series.map(measure => createLineDataset(measure.color, measure.label, measure.values, { spanGaps: false })),
          }}
          options={options as ChartOptions<'line'>}
          role="img"
          aria-label={ariaLabel}
        />
      )}
    </ChartContainer>
  );
}
