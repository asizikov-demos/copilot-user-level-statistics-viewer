'use client';

import { useMemo } from 'react';
import type { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { ModelVendorUsageEntry } from '../../types/metrics';
import { formatShortDate } from '../../utils/formatters';
import ChartContainer from '../ui/ChartContainer';
import { createStackedBarChartOptions } from './utils/chartOptions';
import { modelVendorColors } from './utils/chartColors';
import { registerChartJS } from './utils/chartSetup';
import { createBarDataset } from './utils/chartStyles';
import { createStackedTotalFooter } from './utils/tooltipFooters';

registerChartJS();

interface ModelVendorDistributionChartProps {
  entries: ModelVendorUsageEntry[];
  dates: string[];
  totalInteractions: number;
}

export default function ModelVendorDistributionChart({
  entries,
  dates,
  totalInteractions,
}: ModelVendorDistributionChartProps) {
  const { labels, datasets } = useMemo(() => ({
    labels: dates.map(formatShortDate),
    datasets: entries.map(entry => createBarDataset(
      modelVendorColors[entry.vendor].solid,
      entry.vendor,
      dates.map(date => entry.dailyData[date] ?? 0),
      { stack: 'model-vendors' }
    )),
  }), [dates, entries]);

  const attributedInteractions = entries
    .filter(entry => entry.vendor !== 'Unattributed')
    .reduce((sum, entry) => sum + entry.total, 0);
  const attributedPercentage = totalInteractions > 0
    ? Math.round((attributedInteractions / totalInteractions) * 100)
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
      title="Model Vendor Distribution"
      description="Daily user-initiated interactions grouped by model vendor."
      isEmpty={dates.length === 0 || datasets.length === 0}
      emptyState="No model vendor usage data available"
      summaryStats={[
        {
          value: entries.filter(entry => entry.vendor !== 'Unattributed').length,
          label: 'Vendors Used',
          colorClass: 'text-indigo-600',
        },
        {
          value: `${attributedPercentage}%`,
          label: 'Usage Attributed',
          colorClass: 'text-purple-600',
        },
      ]}
      chartHeight="h-96"
      footer={
        <p className="text-xs text-gray-600">
          Vendor attribution follows the configured Copilot model catalog. Models without a known
          vendor appear as Unattributed.
        </p>
      }
    >
      <Bar data={{ labels, datasets }} options={options} />
    </ChartContainer>
  );
}
