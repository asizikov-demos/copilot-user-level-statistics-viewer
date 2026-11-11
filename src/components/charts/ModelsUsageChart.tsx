'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { ActionList, ActionMenu, FormControl } from '@primer/react';
import {
  getModelVendor,
  getModelDisplayName,
  MODEL_VENDOR_ORDER,
  CUSTOM_PROVIDER,
  isCustomProviderModel,
  type ModelVendorGroup,
} from '../../domain/modelConfig';
import { registerChartJS } from './utils/chartSetup';
import { createStackedBarChartOptions } from './utils/chartOptions';
import { createBarDataset } from './utils/chartStyles';
import { chartColors, getSequentialColor } from './utils/chartColors';
import { createRankedStackedTooltip } from './utils/rankedStackedTooltip';
import { formatShortDate } from '../../utils/formatters';
import { sortBySelector } from '../../utils/sorting';
import type { ModelDailyUsageEntry } from '../../types/metrics';
import ChartContainer from '../ui/ChartContainer';
import { getVendorIcon } from '../icons/ModelIcons';

registerChartJS();

type VendorFilter = ModelVendorGroup | typeof CUSTOM_PROVIDER;

const AllVendorsIcon = getVendorIcon('Unattributed');

const getVendorFilter = (model: string): VendorFilter => {
  const vendor = getModelVendor(model);
  if (vendor) return vendor;
  return isCustomProviderModel(model) ? CUSTOM_PROVIDER : 'Unattributed';
};

const getFilterIcon = (filter: VendorFilter) =>
  filter === CUSTOM_PROVIDER ? AllVendorsIcon : getVendorIcon(filter);

interface ModelsUsageChartProps {
  modelEntries: ModelDailyUsageEntry[];
  dates: string[];
  totalInteractions: number;
  variant: 'auto' | 'cli' | 'app' | 'all';
}

export default function ModelsUsageChart({ modelEntries, dates, totalInteractions, variant }: ModelsUsageChartProps) {
  const isAuto = variant === 'auto';
  const isCli = variant === 'cli';
  const isApp = variant === 'app';
  const client = isApp ? 'Copilot App' : 'CLI';
  const isClient = isCli || isApp;
  const [selectedVendor, setSelectedVendor] = useState<VendorFilter | ''>('');

  const vendorOptions = useMemo(() => {
    const vendors = new Set<VendorFilter>(modelEntries.map(entry => getVendorFilter(entry.model)));
    return [...MODEL_VENDOR_ORDER, CUSTOM_PROVIDER].filter(vendor => vendors.has(vendor));
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
      ? modelEntries.filter(entry => getVendorFilter(entry.model) === activeVendor)
      : modelEntries,
    [activeVendor, modelEntries]
  );

  const { labels, datasets } = useMemo(() => {
    const sortedModels = sortBySelector(filteredEntries, e => e.total, 'desc');
    const modelOrder = sortedModels.map(e => e.model);

    const modelsWithoutUnknown = modelOrder.filter(m => m !== 'unknown');
    const modelIndexMap = new Map(modelsWithoutUnknown.map((m, i) => [m, i]));

    const getModelColor = (model: string): string => {
      if (isAuto || model === 'auto') {
        return chartColors.violet.solid;
      }
      if (model === 'unknown') {
        return chartColors.gray.solid;
      }
      if (isClient) {
        const adjustedIndex = modelIndexMap.get(model) ?? 0;
        return getSequentialColor(adjustedIndex + 7);
      }
      return getSequentialColor(modelIndexMap.get(model) ?? 0);
    };

    const datasets = sortedModels.map((entry) => {
      const color = getModelColor(entry.model);
      return createBarDataset(color, getModelDisplayName(entry.model) ?? entry.model, dates.map(d => entry.dailyData[d] || 0), {
        stack: isAuto ? 'auto-models' : isClient ? `${variant}-models` : 'models'
      });
    });

    return {
      labels: dates.map(d => formatShortDate(d)),
      datasets
    };
  }, [filteredEntries, dates, isAuto, isClient, variant]);

  const displayedTotalInteractions = activeVendor
    ? filteredEntries.reduce((sum, entry) => sum + entry.total, 0)
    : totalInteractions;

  const chartTitle = isClient
    ? `${client} Models Daily Usage`
    : isAuto
      ? 'Auto Model Daily Usage'
      : 'Models Daily Usage';
  const chartDescription = isClient
    ? `Daily ${isCli ? 'Copilot CLI' : client} user-initiated interactions grouped by model.`
    : isAuto
      ? 'Daily interactions routed through Copilot Auto mode.'
      : 'Daily user-initiated interactions grouped by model.';
  const variantLabel = isClient ? client : isAuto ? 'Auto' : 'Tracked';
  const summaryColorClass = isClient ? 'text-sponsors' : 'text-done';
  const emptyState = isClient
    ? `No ${client} model usage data available`
    : isAuto
      ? 'No auto model usage data available'
      : 'No model usage data available';
  const footerDescription = isClient
    ? `Counts aggregate user-initiated interactions for the ${isCli ? 'Copilot CLI' : client} feature per model per day.`
    : isAuto
      ? 'Counts aggregate user-initiated interactions routed through Copilot Auto mode per model per day.'
      : 'Counts aggregate user-initiated interactions across all tracked models per day.';

  const chartData = { labels, datasets };

  const baseOptions = createStackedBarChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Interactions',
  });
  const options = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      tooltip: createRankedStackedTooltip({ itemNoun: 'models' }),
    },
  };

  return (
    <ChartContainer
      title={chartTitle}
      description={chartDescription}
      isEmpty={dates.length === 0 || datasets.length === 0}
      emptyState={emptyState}
      headerActions={!isAuto && !isClient ? (
        <FormControl id="models-usage-vendor-filter" className="min-w-44">
          <FormControl.Label>Model vendor</FormControl.Label>
          <ActionMenu>
            <ActionMenu.Button
              id="models-usage-vendor-filter"
              block
              aria-labelledby={undefined}
              aria-label={`Model vendor: ${activeVendor || 'All Vendors'}`}
              leadingVisual={activeVendor ? getFilterIcon(activeVendor) : AllVendorsIcon}
            >
              {activeVendor || 'All Vendors'}
            </ActionMenu.Button>
            <ActionMenu.Overlay align="end">
              <ActionList selectionVariant="single">
                <ActionList.Item selected={!activeVendor} onSelect={() => setSelectedVendor('')}>
                  <ActionList.LeadingVisual>
                    <AllVendorsIcon />
                  </ActionList.LeadingVisual>
                  All Vendors
                </ActionList.Item>
                {vendorOptions.map(vendor => {
                  const Icon = getFilterIcon(vendor);
                  return (
                    <ActionList.Item
                      key={vendor}
                      selected={activeVendor === vendor}
                      onSelect={() => setSelectedVendor(vendor)}
                    >
                      <ActionList.LeadingVisual><Icon /></ActionList.LeadingVisual>
                      {vendor}
                    </ActionList.Item>
                  );
                })}
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
        </FormControl>
      ) : undefined}
      summaryStats={[
        { value: datasets.length, label: isAuto ? 'Auto Models' : `${variantLabel} Models`, colorClass: summaryColorClass },
        { value: displayedTotalInteractions, label: 'Total Interactions', colorClass: summaryColorClass },
      ]}
      chartHeight="h-96"
      footer={
        <>
          <p className="text-xs text-muted mb-4">
            {footerDescription}
          </p>
        </>
      }
    >
      <Bar data={chartData} options={options} />
    </ChartContainer>
  );
}
