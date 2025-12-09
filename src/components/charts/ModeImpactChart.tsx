'use client';

import { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createStackedBarChartOptions, yAxisFormatters } from './utils/chartOptions';
import { formatShortDate } from '../../utils/formatters';
import { calculateTotal, calculateAverage } from '../../domain/calculators/statsCalculators';
import type { ModeImpactData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface ModeImpactChartProps {
  data: ModeImpactData[];
  title: string;
  description: string;
  addedColor?: string;
  addedBorderColor?: string;
  deletedColor?: string;
  deletedBorderColor?: string;
  emptyStateMessage?: string;
}

const DEFAULT_DELETED_COLOR = 'rgba(248, 113, 113, 0.85)';
const DEFAULT_DELETED_BORDER_COLOR = 'rgb(239, 68, 68)';

export default function ModeImpactChart({
  data,
  title,
  description,
  addedColor = 'rgba(34, 197, 94, 0.85)',
  addedBorderColor = 'rgb(34, 197, 94)',
  deletedColor = DEFAULT_DELETED_COLOR,
  deletedBorderColor = DEFAULT_DELETED_BORDER_COLOR,
  emptyStateMessage = 'No impact data available for this mode',
}: ModeImpactChartProps) {
  const totalAdded = calculateTotal(data, d => d.locAdded);
  const totalDeleted = calculateTotal(data, d => d.locDeleted);
  const netChange = totalAdded - totalDeleted;
  const uniqueUsers = data[0]?.totalUniqueUsers ?? 0;
  const averageDailyUsers = Math.round(calculateAverage(data, d => d.userCount, 0));

  const chartData = {
    labels: data.map(entry => formatShortDate(entry.date)),
    datasets: [
      {
        label: 'Lines Deleted',
        data: data.map(entry => entry.locDeleted),
        backgroundColor: deletedColor,
        borderColor: deletedBorderColor,
        borderWidth: 1,
        stack: 'impact',
      },
      {
        label: 'Lines Added',
        data: data.map(entry => entry.locAdded),
        backgroundColor: addedColor,
        borderColor: addedBorderColor,
        borderWidth: 1,
        stack: 'impact',
      },
    ],
  };

  const options = createStackedBarChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Lines of Code',
    yTicksCallback: yAxisFormatters.localeNumber,
    tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
      const dataset = context.dataset.label;
      const value = context.parsed.y;

      if (value === null) return '';

      if (dataset === 'Lines Added') {
        return `Lines Added: +${value.toLocaleString()}`;
      }
      if (dataset === 'Lines Deleted') {
        return `Lines Deleted: -${value.toLocaleString()}`;
      }
      return '';
    },
    tooltipAfterBodyCallback: (tooltipItems: TooltipItem<'line' | 'bar'>[]) => {
      if (tooltipItems.length === 0) return [];
      const index = tooltipItems[0].dataIndex;
      const entry = data[index];
      const net = entry.netChange;
      const netPrefix = net >= 0 ? '+' : '';
      return [
        `Net Change: ${netPrefix}${net.toLocaleString()} lines`,
        `Active Users: ${entry.userCount}`,
      ];
    },
  });

  return (
    <ChartContainer
      title={`${title} (${uniqueUsers} Unique Users)`}
      description={description}
      isEmpty={data.length === 0}
      emptyState={emptyStateMessage}
      stats={[
        { label: '+ Total Added', value: totalAdded.toLocaleString(), color: 'text-green-600' },
        { label: '- Total Deleted', value: totalDeleted.toLocaleString(), color: 'text-red-600' },
        { label: 'Net Change', value: `${netChange >= 0 ? '+' : ''}${netChange.toLocaleString()}`, color: netChange >= 0 ? 'text-green-600' : 'text-red-600' },
      ]}
      footer={
        <div className="text-xs text-gray-500">
          Average daily users: {averageDailyUsers}
        </div>
      }
    >
      <Bar data={chartData} options={options} />
    </ChartContainer>
  );
}
