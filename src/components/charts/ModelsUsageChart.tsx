'use client';

import { useEffect, useMemo, useState } from 'react';
import { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  getModelVendor,
  MODEL_VENDOR_ORDER,
  type ModelVendorGroup,
} from '../../domain/modelConfig';
import { registerChartJS } from './utils/chartSetup';
import { createStackedBarChartOptions } from './utils/chartOptions';
import { createBarDataset } from './utils/chartStyles';
import { chartColors, getSequentialColor } from './utils/chartColors';
import { createStackedTotalFooter } from './utils/tooltipFooters';
import { formatShortDate } from '../../utils/formatters';
import { sortBySelector } from '../../utils/sorting';
import type { ModelDailyUsageEntry } from '../../types/metrics';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface ModelsUsageChartProps {
  modelEntries: ModelDailyUsageEntry[];
  dates: string[];
  totalInteractions: number;
  variant: 'auto' | 'cli' | 'all';
}

export default function ModelsUsageChart({ modelEntries, dates, totalInteractions, variant }: ModelsUsageChartProps) {
  const isAuto = variant === 'auto';
  const isCli = variant === 'cli';
  const [selectedVendor, setSelectedVendor] = useState<ModelVendorGroup | ''>('');

  const vendorOptions = useMemo(() => {
    const vendors = new Set<ModelVendorGroup>(
      modelEntries.map(entry => getModelVendor(entry.model) ?? 'Unattributed')
    );
    return MODEL_VENDOR_ORDER.filter(vendor => vendors.has(vendor));
  }, [modelEntries]);

  useEffect(() => {
    if (selectedVendor && !vendorOptions.includes(selectedVendor)) {
      setSelectedVendor('');
    }
  }, [selectedVendor, vendorOptions]);

  const activeVendor = selectedVendor && vendorOptions.includes(selectedVendor)
    ? selectedVendor
    : '';
  const filteredEntries = useMemo(
    () => activeVendor
      ? modelEntries.filter(entry => (getModelVendor(entry.model) ?? 'Unattributed') === activeVendor)
      : modelEntries,
    [activeVendor, modelEntries]
  );

  const { labels, datasets } = useMemo(() => {
    const sortedModels = sortBySelector(filteredEntries, e => e.total, 'desc');
    const modelOrder = sortedModels.map(e => e.model);

    const UNKNOWN_COLOR = 'hsl(0, 70%, 50%)';
    const modelsWithoutUnknown = modelOrder.filter(m => m !== 'unknown');
    const modelIndexMap = new Map(modelsWithoutUnknown.map((m, i) => [m, i]));

    const getModelColor = (model: string): string => {
      if (isAuto || model === 'auto') {
        return chartColors.violet.solid;
      }
      if (isCli) {
        const adjustedIndex = modelIndexMap.get(model) ?? 0;
        return getSequentialColor(adjustedIndex + 7);
      }
      if (model === 'unknown') {
        return UNKNOWN_COLOR;
      }
      const adjustedIndex = modelIndexMap.get(model) ?? 0;
      const startHue = 30;
      const hueStep = 55;
      const hue = (startHue + adjustedIndex * hueStep) % 360;
      if (hue >= 350 || hue <= 10) {
        return `hsl(${(hue + 50) % 360}, 70%, 55%)`;
      }
      return `hsl(${hue}, 70%, 55%)`;
    };

    const datasets = sortedModels.map((entry) => {
      const color = getModelColor(entry.model);
      return createBarDataset(color, entry.model, dates.map(d => entry.dailyData[d] || 0), {
        stack: isAuto ? 'auto-models' : isCli ? 'cli-models' : 'models'
      });
    });

    return {
      labels: dates.map(d => formatShortDate(d)),
      datasets
    };
  }, [filteredEntries, dates, isAuto, isCli]);

  const displayedTotalInteractions = activeVendor
    ? filteredEntries.reduce((sum, entry) => sum + entry.total, 0)
    : totalInteractions;

  const chartTitle = isCli
    ? 'CLI Models Daily Usage'
    : isAuto
      ? 'Auto Model Daily Usage'
      : 'Models Daily Usage';
  const chartDescription = isCli
    ? 'Daily Copilot CLI user-initiated interactions grouped by model.'
    : isAuto
      ? 'Daily interactions routed through Copilot Auto mode.'
      : 'Daily user-initiated interactions grouped by model.';
  const variantLabel = isCli ? 'CLI' : isAuto ? 'Auto' : 'Tracked';
  const primaryColorClass = isCli ? 'text-pink-600' : isAuto ? 'text-violet-600' : 'text-indigo-600';
  const totalColorClass = isCli ? 'text-pink-600' : isAuto ? 'text-purple-600' : 'text-indigo-600';
  const emptyState = isCli
    ? 'No CLI model usage data available'
    : isAuto
      ? 'No auto model usage data available'
      : 'No model usage data available';
  const footerDescription = isCli
    ? 'Counts aggregate user-initiated interactions for the Copilot CLI feature per model per day.'
    : isAuto
      ? 'Counts aggregate user-initiated interactions routed through Copilot Auto mode per model per day.'
      : 'Counts aggregate user-initiated interactions across all tracked models per day.';

  const chartData = { labels, datasets };

  const options = createStackedBarChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Interactions',
    tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
      const value = context.parsed.y || 0;
      return `${context.dataset.label}: ${value} interactions`;
    },
    tooltipFooterCallback: createStackedTotalFooter({ useLocaleFormatting: false }),
  });

  return (
    <ChartContainer
      title={chartTitle}
      description={chartDescription}
      isEmpty={dates.length === 0 || datasets.length === 0}
      emptyState={emptyState}
      headerActions={!isAuto && !isCli ? (
        <div className="min-w-44">
          <label htmlFor="models-usage-vendor-filter" className="block text-xs font-medium text-gray-700 mb-1">
            Model vendor
          </label>
          <select
            id="models-usage-vendor-filter"
            value={activeVendor}
            onChange={event => setSelectedVendor(event.target.value as ModelVendorGroup | '')}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Vendors</option>
            {vendorOptions.map(vendor => (
              <option key={vendor} value={vendor}>{vendor}</option>
            ))}
          </select>
        </div>
      ) : undefined}
      summaryStats={[
        { value: datasets.length, label: isAuto ? 'Auto Models' : `${variantLabel} Models`, colorClass: primaryColorClass },
        { value: displayedTotalInteractions, label: 'Total Interactions', colorClass: totalColorClass },
      ]}
      chartHeight="h-96"
      footer={
        <>
          <p className="text-xs text-gray-600 mb-4">
            {footerDescription}
          </p>
        </>
      }
    >
      <Bar data={chartData} options={options} />
    </ChartContainer>
  );
}
