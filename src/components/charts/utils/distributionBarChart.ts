'use client';

import type { TooltipItem } from 'chart.js';
import { createHorizontalBarChartOptions } from './chartOptions';
import { barDatasetDefaults } from './chartStyles';

export interface DistributionBarEntry {
  label: string;
  value: number;
  color: string;
  /** Overrides the chart-level unit in the tooltip */
  unit?: string;
}

interface DistributionBarChartConfig {
  entries: DistributionBarEntry[];
  datasetLabel: string;
  unit: string;
  /** Adds each bar's share of the summed values to the tooltip (default: true) */
  showShare?: boolean;
}

/**
 * Builds a horizontal bar chart for part-to-whole distributions, following Primer's
 * data-visualization guidance of bars instead of pie, doughnut or radar charts.
 */
export function createDistributionBarChartConfig({
  entries,
  datasetLabel,
  unit,
  showShare = true,
}: DistributionBarChartConfig) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  const colors = entries.map(entry => entry.color);

  const formatTooltipLabel = (context: TooltipItem<'bar'>): string => {
    const entry = entries[context.dataIndex];
    const value = entry?.value ?? 0;
    const valueLabel = `${value.toLocaleString()} ${entry?.unit ?? unit}`;
    if (!showShare) return valueLabel;
    const share = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
    return `${valueLabel} (${share}%)`;
  };

  return {
    chartData: {
      labels: entries.map(entry => entry.label),
      datasets: [
        {
          ...barDatasetDefaults,
          label: datasetLabel,
          data: entries.map(entry => entry.value),
          backgroundColor: colors,
          borderColor: colors,
        },
      ],
    },
    options: createHorizontalBarChartOptions({
      showLegend: false,
      showGridX: true,
      showGridY: false,
      tooltipLabelCallback: formatTooltipLabel,
    }),
  };
}
