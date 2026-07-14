'use client';

import { useMemo } from 'react';
import type { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { ModelCategoryUsageEntry } from '../../types/metrics';
import { formatShortDate } from '../../utils/formatters';
import ChartContainer from '../ui/ChartContainer';
import { createStackedBarChartOptions } from './utils/chartOptions';
import { modelCategoryColors } from './utils/chartColors';
import { registerChartJS } from './utils/chartSetup';
import { createBarDataset } from './utils/chartStyles';
import { createStackedTotalFooter } from './utils/tooltipFooters';

registerChartJS();

interface ModelCategoryDistributionChartProps {
  entries: ModelCategoryUsageEntry[];
  dates: string[];
  totalInteractions: number;
}

export default function ModelCategoryDistributionChart({
  entries,
  dates,
  totalInteractions,
}: ModelCategoryDistributionChartProps) {
  const { labels, datasets } = useMemo(() => ({
    labels: dates.map(formatShortDate),
    datasets: entries.map(entry => createBarDataset(
      modelCategoryColors[entry.category].solid,
      entry.category,
      dates.map(date => entry.dailyData[date] ?? 0),
      { stack: 'model-categories' }
    )),
  }), [dates, entries]);

  const categorizedInteractions = entries
    .filter(entry => entry.category !== 'Uncategorized')
    .reduce((sum, entry) => sum + entry.total, 0);
  const categorizedPercentage = totalInteractions > 0
    ? Math.round((categorizedInteractions / totalInteractions) * 100)
    : 0;

  const options = createStackedBarChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Interactions',
    tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) =>
      `${context.dataset.label}: ${(context.parsed.y ?? 0).toLocaleString()} interactions`,
    tooltipFooterCallback: createStackedTotalFooter(),
  });

  return (
    <ChartContainer
      title="Model Type Distribution"
      description="Daily user-initiated interactions grouped by GitHub Copilot model category."
      isEmpty={dates.length === 0 || datasets.length === 0}
      emptyState="No categorized model usage data available"
      summaryStats={[
        {
          value: entries.filter(entry => entry.category !== 'Uncategorized').length,
          label: 'Categories Used',
          colorClass: 'text-indigo-600',
        },
        {
          value: `${categorizedPercentage}%`,
          label: 'Usage Categorized',
          colorClass: 'text-purple-600',
        },
      ]}
      chartHeight="h-96"
      footer={
        <p className="text-xs text-gray-600 mb-4">
          Categories follow GitHub&apos;s published Copilot model pricing catalog. Legacy and
          unmapped models appear as Uncategorized.
        </p>
      }
    >
      <Bar data={{ labels, datasets }} options={options} />
    </ChartContainer>
  );
}
