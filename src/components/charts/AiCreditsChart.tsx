'use client';

import { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { DailyAiCreditsData } from '../../domain/calculators/metricCalculators';
import { calculateStats } from '../../domain/calculators/statsCalculators';
import { formatAiCreditCost, formatNumber, formatShortDate } from '../../utils/formatters';
import { padReportRangeWithDefaults } from '../../utils/timeSeries';
import ChartContainer from '../ui/ChartContainer';
import { chartColors } from './utils/chartColors';
import { createBaseChartOptions, yAxisFormatters } from './utils/chartOptions';
import { registerChartJS } from './utils/chartSetup';
import { createBarDataset } from './utils/chartStyles';

registerChartJS();

interface AiCreditsChartProps {
  data: DailyAiCreditsData[];
  reportStartDay: string;
  reportEndDay: string;
  title?: string;
  description?: string;
  showUsers?: boolean;
  usageCountLabel?: string;
}

function createDisplayData(
  data: DailyAiCreditsData[],
  reportStartDay: string,
  reportEndDay: string
): DailyAiCreditsData[] {
  return padReportRangeWithDefaults(
    data,
    reportStartDay,
    reportEndDay,
    entry => entry.date,
    date => ({ date, aiCreditsUsed: 0, users: 0 }),
  );
}

export default function AiCreditsChart({
  data,
  reportStartDay,
  reportEndDay,
  title = 'Daily AI Credits Consumption',
  description = 'Total AI credits consumed by users each day during the reporting period',
  showUsers = true,
  usageCountLabel = 'User-days',
}: AiCreditsChartProps) {
  const displayData = createDisplayData(data, reportStartDay, reportEndDay);
  const activeData = data.filter(entry => entry.aiCreditsUsed > 0);
  const stats = calculateStats(activeData, entry => entry.aiCreditsUsed);
  if (stats.total === 0) {
    return null;
  }

  const creditUserDays = data.reduce((total, entry) => total + entry.users, 0);
  const footerGridClassName = showUsers
    ? 'grid grid-cols-1 gap-4 text-xs text-gray-500 sm:grid-cols-3'
    : 'grid grid-cols-1 gap-4 text-xs text-gray-500 sm:grid-cols-2';
  const peakEntry = activeData.reduce<DailyAiCreditsData | undefined>(
    (peak, entry) => !peak || entry.aiCreditsUsed > peak.aiCreditsUsed ? entry : peak,
    undefined
  );

  const chartData = {
    labels: displayData.map(entry => formatShortDate(entry.date)),
    datasets: [
      createBarDataset(
        chartColors.violet.alpha60,
        'AI Credits Used',
        displayData.map(entry => entry.aiCreditsUsed),
        {
          borderColor: chartColors.violet.solid,
        }
      ),
    ],
  };

  const options = createBaseChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'AI Credits Used',
    showLegend: false,
    yTicksCallback: yAxisFormatters.localeNumber,
    tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
      const dayData = displayData[context.dataIndex];
      const labels = [
        `AI credits: ${formatNumber(dayData.aiCreditsUsed, 2)}`,
        `Estimated cost: ${formatAiCreditCost(dayData.aiCreditsUsed)}`,
      ];
      if (showUsers) {
        labels.push(`Users with credits: ${dayData.users}`);
      }
      return labels;
    },
  });

  return (
    <ChartContainer
      title={title}
      description={description}
      stats={[
        { label: 'Total', value: formatNumber(stats.total, 2) },
        { label: 'Avg active day', value: formatNumber(stats.average, 2) },
        { label: 'Cost', value: formatAiCreditCost(stats.total) },
      ]}
      footer={
        <div className={footerGridClassName}>
          <div>
            <span className="font-medium text-violet-600">Active days:</span> {activeData.length}
          </div>
          <div>
            <span className="font-medium text-violet-600">Peak day:</span>{' '}
            {peakEntry ? `${peakEntry.date} (${formatNumber(peakEntry.aiCreditsUsed, 2)} credits)` : 'N/A'}
          </div>
          {showUsers && (
            <div>
              <span className="font-medium text-violet-600">{usageCountLabel}:</span> {creditUserDays}
            </div>
          )}
        </div>
      }
    >
      <Bar data={chartData} options={options} />
    </ChartContainer>
  );
}
