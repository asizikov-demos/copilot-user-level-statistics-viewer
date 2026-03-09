'use client';

import type { TooltipItem } from 'chart.js';

/**
 * Configuration for creating base chart options
 */
export interface BaseChartConfig {
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  showGridX?: boolean;
  showGridY?: boolean;
  beginAtZero?: boolean;
  yMax?: number;
  yTicksCallback?: (value: unknown) => string | number;
  tooltipLabelCallback?: (context: TooltipItem<'line' | 'bar'>) => string | string[];
  tooltipAfterBodyCallback?: (tooltipItems: TooltipItem<'line' | 'bar'>[]) => string[];
  tooltipTitleCallback?: (context: TooltipItem<'line' | 'bar'>[]) => string;
  tooltipFooterCallback?: (items: TooltipItem<'line' | 'bar'>[]) => string;
  stacked?: boolean;
  indexAxis?: 'x' | 'y';
  yStepSize?: number;
}

/**
 * Configuration for dual-axis charts
 */
export interface DualAxisChartConfig extends BaseChartConfig {
  y1AxisLabel?: string;
  y1Max?: number;
  y1BeginAtZero?: boolean;
}

/**
 * Default grid color used across charts
 */
const DEFAULT_GRID_COLOR = 'rgba(0, 0, 0, 0.1)';

/**
 * Creates base chart options with common configuration.
 * Reduces duplication across chart components.
 */
export function createBaseChartOptions(config: BaseChartConfig = {}) {
  const {
    xAxisLabel,
    yAxisLabel,
    showLegend = true,
    legendPosition = 'top',
    showGridX = false,
    showGridY = true,
    beginAtZero = true,
    yMax,
    yTicksCallback,
    tooltipLabelCallback,
    tooltipAfterBodyCallback,
    tooltipTitleCallback,
    tooltipFooterCallback,
    stacked = false,
    indexAxis = 'x',
    yStepSize,
  } = config;

  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis,
    layout: {
      padding: {
        bottom: 10,
      },
    },
    plugins: {
      legend: {
        display: showLegend,
        position: legendPosition,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          ...(tooltipTitleCallback && { title: tooltipTitleCallback }),
          ...(tooltipLabelCallback && { label: tooltipLabelCallback }),
          ...(tooltipAfterBodyCallback && { afterBody: tooltipAfterBodyCallback }),
          ...(tooltipFooterCallback && { footer: tooltipFooterCallback }),
        },
      },
    },
    scales: {
      x: {
        stacked,
        title: {
          display: !!xAxisLabel,
          text: xAxisLabel || '',
        },
        grid: {
          display: showGridX,
        },
        ticks: {
          maxRotation: 45,
          autoSkip: true,
        },
      },
      y: {
        stacked,
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel || '',
        },
        beginAtZero,
        ...(yMax !== undefined && { max: yMax }),
        grid: {
          display: showGridY,
          color: DEFAULT_GRID_COLOR,
        },
        ticks: {
          ...(yStepSize !== undefined && { stepSize: yStepSize }),
          ...(yTicksCallback && { callback: yTicksCallback }),
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };
}

/**
 * Creates chart options for dual-axis charts (e.g., bar + line combo)
 */
export function createDualAxisChartOptions(config: DualAxisChartConfig = {}) {
  const {
    xAxisLabel,
    yAxisLabel,
    y1AxisLabel,
    showLegend = true,
    legendPosition = 'top',
    beginAtZero = true,
    y1BeginAtZero = true,
    y1Max,
    tooltipLabelCallback,
    tooltipAfterBodyCallback,
  } = config;

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: showLegend,
        position: legendPosition,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          ...(tooltipLabelCallback && { label: tooltipLabelCallback }),
          ...(tooltipAfterBodyCallback && { afterBody: tooltipAfterBodyCallback }),
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: !!xAxisLabel,
          text: xAxisLabel || '',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel || '',
        },
        beginAtZero,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: !!y1AxisLabel,
          text: y1AxisLabel || '',
        },
        beginAtZero: y1BeginAtZero,
        ...(y1Max !== undefined && { max: y1Max }),
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };
}

/**
 * Creates chart options for stacked bar charts
 */
export function createStackedBarChartOptions(
  config: Omit<BaseChartConfig, 'stacked'> = {}
) {
  return createBaseChartOptions({
    ...config,
    stacked: true,
  });
}

/**
 * Creates chart options for horizontal bar charts
 */
export function createHorizontalBarChartOptions(
  config: Omit<BaseChartConfig, 'indexAxis'> = {}
) {
  return createBaseChartOptions({
    ...config,
    indexAxis: 'y',
  });
}

/**
 * Common y-axis tick formatters
 */
export const yAxisFormatters = {
  /** Format as percentage (e.g., "50%") */
  percentage: (value: unknown): string => `${value}%`,
  
  /** Format as integer */
  integer: (value: unknown): number => Number(value),
  
  /** Format with locale string (e.g., "1,234") */
  localeNumber: (value: unknown): string => {
    const numeric = typeof value === 'number' ? value : 0;
    return numeric.toLocaleString();
  },
};


