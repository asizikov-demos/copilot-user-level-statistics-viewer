'use client';

import { Bar, Line } from 'react-chartjs-2';
import type { ChartDataset, TooltipItem } from 'chart.js';
import type { DailyVSCodeAgentUsage, VSCodeAgentUsage } from '../../types/vscodeAgent';
import ChartContainer from '../ui/ChartContainer';
import { chartColors } from './utils/chartColors';
import type { BaseChartConfig } from './utils/chartOptions';
import { yAxisFormatters } from './utils/chartOptions';
import { createBarDataset, createLineDataset } from './utils/chartStyles';
import { registerChartJS } from './utils/chartSetup';
import { createDailyReportRangeChartConfig } from './utils/dailyBarChart';

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

  const ariaLabel = `Daily VS Code Agents: ${visibleMeasures.map(measure => measure.label.toLowerCase()).join(', ')}.`;
  const chartInput = {
    data: data.daily,
    reportStartDay,
    reportEndDay,
  };
  const chartSeries: Array<{
    color: string;
    label: string;
    getValue: (entry: DailyVSCodeAgentUsage | undefined) => number | null;
  }> = visibleMeasures.map(measure => ({
    color: measure.color,
    label: measure.label,
    getValue: (entry: DailyVSCodeAgentUsage | undefined) => entry?.[measure.key] ?? null,
  }));
  const getOptions = <TType extends 'bar' | 'line',>(
    displayData: Array<{ date: string; entry: DailyVSCodeAgentUsage | undefined }>,
  ): BaseChartConfig<TType> => ({
    xAxisLabel: 'Date',
    yAxisLabel: 'Reported count',
    yTicksCallback: yAxisFormatters.integer,
    xAutoSkip: true,
    tooltipLabelCallback: (context: TooltipItem<TType>) => {
      const measure = visibleMeasures[context.datasetIndex];
      const day = displayData[context.dataIndex].entry;
      return day
        ? `${measure.label}: ${formatCount(day[measure.key])} (${coverage(day[measure.coverageKey], day.recordCount)})`
        : 'Not reported';
    },
  });
  const createChartConfig = <TType extends 'bar' | 'line',>(
    type: TType,
    createDataset: (
      series: (typeof chartSeries)[number],
      values: (number | null)[],
    ) => ChartDataset<TType, (number | null)[]>,
  ) => createDailyReportRangeChartConfig<DailyVSCodeAgentUsage, TType>({
    ...chartInput,
    type,
    series: chartSeries,
    createDataset,
    options: displayData => getOptions<TType>(displayData),
  });

  const renderChart = () => {
    if (isUser) {
      const { chartData, options } = createChartConfig(
        'bar',
        (series, values) => createBarDataset(series.color, series.label, values),
      );
      return <Bar data={chartData} options={options} role="img" aria-label={ariaLabel} />;
    }
    const { chartData, options } = createChartConfig(
      'line',
      (series, values) =>
        createLineDataset(series.color, series.label, values, { spanGaps: false }),
    );
    return <Line data={chartData} options={options} role="img" aria-label={ariaLabel} />;
  };

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
      {renderChart()}
    </ChartContainer>
  );
}
