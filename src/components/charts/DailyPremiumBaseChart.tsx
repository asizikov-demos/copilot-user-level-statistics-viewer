'use client';

import { useMemo } from 'react';
import { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createBaseChartOptions } from './utils/chartOptions';
import { createBarDataset } from './utils/chartStyles';
import { chartColors } from './utils/chartColors';
import { formatShortDate, generateDateRange } from '../../utils/formatters';
import { padSeriesWithDefaults } from '../../utils/timeSeries';
import type { DailyModelUsageData } from '../../domain/calculators/metricCalculators';
import type { ModelBreakdownData } from '../../types/metrics';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface ModelBreakdownChartProps {
  modelBreakdownData: ModelBreakdownData;
  dailyModelUsageData?: never;
  reportStartDay?: never;
  reportEndDay?: never;
  hideInsights?: boolean;
}

interface DailyModelUsageChartProps {
  modelBreakdownData?: never;
  dailyModelUsageData: DailyModelUsageData[];
  reportStartDay: string;
  reportEndDay: string;
  hideInsights?: boolean;
}

type DailyPremiumBaseChartProps = ModelBreakdownChartProps | DailyModelUsageChartProps;

export default function DailyPremiumBaseChart({
  modelBreakdownData,
  dailyModelUsageData,
  reportStartDay,
  reportEndDay,
}: DailyPremiumBaseChartProps) {
  const { labels, datasets, dailyInteractions, isEmpty } = useMemo(() => {
    const dates = modelBreakdownData
      ? modelBreakdownData.dates
      : generateDateRange(reportStartDay, reportEndDay);

    let dailyInteractions: number[];

    if (modelBreakdownData) {
      dailyInteractions = dates.map(d =>
        modelBreakdownData.premiumModels.reduce((sum, entry) => sum + (entry.dailyData[d] || 0), 0) +
        modelBreakdownData.standardModels.reduce((sum, entry) => sum + (entry.dailyData[d] || 0), 0)
      );
    } else {
      const dailyUsageByDate = new Map((dailyModelUsageData ?? []).map(d => [d.date, d]));
      const paddedUsage = padSeriesWithDefaults(dates, dailyUsageByDate, date => ({
        date,
        modelInteractions: 0,
        pruModels: 0,
        standardModels: 0,
        unknownModels: 0,
      }));

      dailyInteractions = paddedUsage.map(d => d.pruModels + d.standardModels + d.unknownModels);
    }

    const datasets = [
      createBarDataset(chartColors.blue.solid, 'Model interactions', dailyInteractions),
    ];

    return {
      labels: dates.map(d => formatShortDate(d)),
      datasets,
      dailyInteractions,
      isEmpty: dates.length === 0,
    };
  }, [dailyModelUsageData, modelBreakdownData, reportEndDay, reportStartDay]);

  const options = createBaseChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Interactions',
    showLegend: false,
    tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
      const value = context.parsed.y || 0;
      return `${context.dataset.label}: ${value.toLocaleString()}`;
    },
  });

  const totalInteractions = dailyInteractions.reduce((sum, value) => sum + value, 0);

  return (
    <ChartContainer
      title="Daily Model Interactions"
      description="Daily model interactions across all model buckets."
      isEmpty={isEmpty}
      emptyState="No model usage data available"
      summaryStats={[
        { value: totalInteractions.toLocaleString(), label: 'Model interactions', colorClass: 'text-blue-600' },
      ]}
    >
      <Bar data={{ labels, datasets }} options={options} />
    </ChartContainer>
  );
}
