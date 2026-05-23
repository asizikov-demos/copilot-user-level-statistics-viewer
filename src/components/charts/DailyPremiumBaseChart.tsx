'use client';

import { useMemo } from 'react';
import { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createStackedBarChartOptions } from './utils/chartOptions';
import { chartColors } from './utils/chartColors';
import { formatShortDate, generateDateRange } from '../../utils/formatters';
import { padSeriesWithDefaults } from '../../utils/timeSeries';
import type { DailyModelUsageData } from '../../domain/calculators/metricCalculators';
import type { ModelBreakdownData } from '../../types/metrics';
import ChartContainer from '../ui/ChartContainer';
import InsightsCard from '../ui/InsightsCard';

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

type DailyPremiumDataset = {
  label: string;
  data: number[];
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  stack: string;
};

export default function DailyPremiumBaseChart({
  modelBreakdownData,
  dailyModelUsageData,
  reportStartDay,
  reportEndDay,
  hideInsights = false,
}: DailyPremiumBaseChartProps) {
  const { labels, datasets, dailyPremium, dailyStandard, dailyUnknown, isEmpty } = useMemo(() => {
    const dates = modelBreakdownData
      ? modelBreakdownData.dates
      : generateDateRange(reportStartDay, reportEndDay);

    const dailyUsageByDate = new Map((dailyModelUsageData ?? []).map(d => [d.date, d]));
    const paddedUsage = modelBreakdownData
      ? null
      : padSeriesWithDefaults(dates, dailyUsageByDate, date => ({
          date,
          pruModels: 0,
          standardModels: 0,
          unknownModels: 0,
          totalPRUs: 0,
          serviceValue: 0,
        }));

    const dailyPremium = modelBreakdownData
      ? dates.map(d =>
          modelBreakdownData.premiumModels.reduce((sum, entry) => sum + (entry.dailyData[d] || 0), 0)
        )
      : paddedUsage!.map(d => d.pruModels);

    const dailyStandard = modelBreakdownData
      ? dates.map(d =>
          modelBreakdownData.standardModels.reduce((sum, entry) => sum + (entry.dailyData[d] || 0), 0)
        )
      : paddedUsage!.map(d => d.standardModels);

    const dailyUnknown = modelBreakdownData
      ? dates.map(() => 0)
      : paddedUsage!.map(d => d.unknownModels);

    const datasets: DailyPremiumDataset[] = [
      {
        label: 'Standard',
        data: dailyStandard,
        backgroundColor: chartColors.blue.solid,
        borderColor: chartColors.blue.solid,
        borderWidth: 1,
        stack: 'premium-base',
      },
      {
        label: 'Premium',
        data: dailyPremium,
        backgroundColor: chartColors.purple.solid,
        borderColor: chartColors.purple.solid,
        borderWidth: 1,
        stack: 'premium-base',
      },
    ];

    if (dailyUnknown.some(value => value > 0)) {
      datasets.push({
        label: 'Unknown',
        data: dailyUnknown,
        backgroundColor: chartColors.gray.solid,
        borderColor: chartColors.gray.solid,
        borderWidth: 1,
        stack: 'premium-base',
      });
    }

    return {
      labels: dates.map(d => formatShortDate(d)),
      datasets,
      dailyPremium,
      dailyStandard,
      dailyUnknown,
      isEmpty: dates.length === 0,
    };
  }, [dailyModelUsageData, modelBreakdownData, reportEndDay, reportStartDay]);

  const options = createStackedBarChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Interactions',
    tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
      const value = context.parsed.y || 0;
      return `${context.dataset.label}: ${value.toLocaleString()}`;
    },
    tooltipFooterCallback: (items: TooltipItem<'line' | 'bar'>[]) => {
      if (!items.length) return '';
      const dayTotal = items.reduce((sum, it) => sum + (it.parsed.y || 0), 0);
      const premiumVal = items.find(it => it.dataset.label === 'Premium')?.parsed.y || 0;
      const share = dayTotal > 0 ? ((premiumVal / dayTotal) * 100).toFixed(1) : '0.0';
      return `Total: ${dayTotal.toLocaleString()} · Premium share: ${share}%`;
    },
  });

  const totalPremium = dailyPremium.reduce((s, v) => s + v, 0);
  const totalStandard = dailyStandard.reduce((s, v) => s + v, 0);
  const totalUnknown = dailyUnknown.reduce((s, v) => s + v, 0);
  const totalAll = totalPremium + totalStandard + totalUnknown;
  const premiumShare = totalAll > 0 ? ((totalPremium / totalAll) * 100).toFixed(1) : '0.0';

  const premiumShareNum = totalAll > 0 ? (totalPremium / totalAll) * 100 : 0;

  return (
    <ChartContainer
      title="Daily Premium vs Standard Model Usage"
      description="Stacked daily breakdown highlighting the premium-to-standard ratio over time."
      isEmpty={isEmpty}
      emptyState="No model usage data available"
      summaryStats={[
        { value: totalPremium.toLocaleString(), label: 'Premium', colorClass: 'text-purple-600' },
        { value: totalStandard.toLocaleString(), label: 'Standard', colorClass: 'text-blue-600' },
        ...(totalUnknown > 0
          ? [{ value: totalUnknown.toLocaleString(), label: 'Unknown', colorClass: 'text-gray-600' }]
          : []),
        { value: `${premiumShare}%`, label: 'Premium Share', colorClass: 'text-gray-700' },
      ]}
      footer={!hideInsights && totalAll > 0 ? (
        premiumShareNum < 50 ? (
          <InsightsCard title="Premium Adoption Opportunity" variant="orange">
            <p>
              Premium models account for only {premiumShare}% of total interactions. These models are more up-to-date and more capable, offering better results for complex tasks.
            </p>
            <p className="mt-2">
              Consider promoting premium model usage across teams to take full advantage of the included Premium Request Units before they expire each month.
            </p>
          </InsightsCard>
        ) : (
          <InsightsCard title="Healthy Premium Adoption" variant="green">
            <p>
              Premium models drive {premiumShare}% of total interactions, indicating teams are actively leveraging the most capable and up-to-date models available.
            </p>
          </InsightsCard>
        )
      ) : undefined}
    >
      <Bar data={{ labels, datasets }} options={options} />
    </ChartContainer>
  );
}
