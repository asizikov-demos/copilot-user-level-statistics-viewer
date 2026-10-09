'use client';

import { formatShortDate } from '../../../utils/formatters';
import { mapReportRangeData, padReportRangeWithDefaults } from '../../../utils/timeSeries';
import type { ChartDataset } from 'chart.js';
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
  const padded = padReportRangeWithDefaults(
    data,
    reportStartDay,
    reportEndDay,
    getDate,
    getDefault,
  );

  return postProcess ? padded.map(postProcess) : padded;
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
    options: createBaseChartOptions(options),
  };
}

interface DailyReportRangeEntry<T> {
  date: string;
  entry: T | undefined;
}

interface DailyReportRangeSeriesConfig<T> {
  color: string;
  label: string;
  getValue: (entry: T | undefined) => number | null;
}

interface DailyReportRangeChartConfig<T extends { date: string }, TType extends 'bar' | 'line'> {
  data: T[];
  reportStartDay: string;
  reportEndDay: string;
  type: TType;
  series: DailyReportRangeSeriesConfig<T>[];
  createDataset: (
    series: DailyReportRangeSeriesConfig<T>,
    values: (number | null)[],
  ) => ChartDataset<TType, (number | null)[]>;
  options:
    | BaseChartConfig<TType>
    | ((data: DailyReportRangeEntry<T>[]) => BaseChartConfig<TType>);
}

export function createDailyReportRangeChartConfig<
  T extends { date: string },
  TType extends 'bar' | 'line',
>(
  config: DailyReportRangeChartConfig<T, TType>,
) {
  const { data, reportStartDay, reportEndDay, series, createDataset, options } = config;
  const displayData = mapReportRangeData(
    data,
    reportStartDay,
    reportEndDay,
    entry => entry.date,
    (date, entry) => ({ date, entry }),
  );
  const chartOptions = typeof options === 'function' ? options(displayData) : options;
  return {
    type: config.type,
    displayData,
    chartData: {
      labels: displayData.map(entry => formatShortDate(entry.date)),
      datasets: series.map(dataset =>
        createDataset(dataset, displayData.map(day => dataset.getValue(day.entry)))
      ),
    },
    options: createBaseChartOptions<TType>(chartOptions),
  };
}
