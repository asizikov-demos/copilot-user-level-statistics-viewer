'use client';

import type { ChartOptions } from 'chart.js';
import { formatShortDate } from '../../../utils/formatters';
import { mapReportRangeData } from '../../../utils/timeSeries';
import { createBaseChartOptions } from './chartOptions';
import type { BaseChartConfig } from './chartOptions';
import { createBarDataset } from './chartStyles';

export interface DailyBarSeriesConfig<T> {
  color: string;
  label: string;
  getValue: (entry: T) => number;
  datasetOptions?: Record<string, unknown>;
}

export function padDailyReportRangeData<T>(
  data: T[],
  reportStartDay: string,
  reportEndDay: string,
  getDate: (entry: T) => string,
  getDefault: (date: string) => T,
  postProcess?: (entry: T) => T,
): T[] {
  return mapReportRangeData(
    data,
    reportStartDay,
    reportEndDay,
    getDate,
    (date, entry) => {
      const paddedEntry = entry ?? getDefault(date);
      return postProcess ? postProcess(paddedEntry) : paddedEntry;
    },
  );
}

interface DailyBarChartConfig<T> {
  data: T[];
  getDate: (entry: T) => string;
  series: DailyBarSeriesConfig<T>[];
  options: BaseChartConfig;
}

export function createDailyBarChartConfig<T>({
  data,
  getDate,
  series,
  options,
}: DailyBarChartConfig<T>) {
  return {
    chartData: {
      labels: data.map(entry => formatShortDate(getDate(entry))),
      datasets: series.map(dataset =>
        createBarDataset(
          dataset.color,
          dataset.label,
          data.map(entry => dataset.getValue(entry)),
          dataset.datasetOptions,
        )
      ),
    },
    options: createBaseChartOptions(options) as ChartOptions<'bar'>,
  };
}
