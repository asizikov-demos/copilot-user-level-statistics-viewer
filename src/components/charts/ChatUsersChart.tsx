'use client';

import { TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createBaseChartOptions, yAxisFormatters } from './utils/chartOptions';
import { DailyChatUsersData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';
import {
  chatModeChartModes,
  createChatModeLineChartData,
  createChatModeMetricSummaries,
  createChatModeStats,
} from './utils/chatModeChart';

registerChartJS();

interface ChatUsersChartProps {
  data: DailyChatUsersData[];
}

export default function ChatUsersChart({ data }: ChatUsersChartProps) {
  const modeSummaries = createChatModeMetricSummaries(data, (day, mode) => mode.getUsersValue(day));

  const chartData = createChatModeLineChartData(
    data,
    (day, mode) => mode.getUsersValue(day),
    mode => mode.userDatasetLabel
  );

  const options = createBaseChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Number of Users',
    yStepSize: 1,
    yTicksCallback: yAxisFormatters.integer,
    tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
      const value = context.parsed.y;
      const datasetLabel = context.dataset.label;
      return `${datasetLabel}: ${value} users`;
    },
    tooltipAfterBodyCallback: (tooltipItems: TooltipItem<'line' | 'bar'>[]) => {
      if (tooltipItems.length > 0) {
        const dataIndex = tooltipItems[0].dataIndex;
        const dayData = data[dataIndex];
        const totalChatUsers = Math.max(
          ...chatModeChartModes
            .filter(mode => mode.key !== 'cli')
            .map(mode => mode.getUsersValue(dayData))
        );
        return [
          '',
          `Date: ${dayData.date}`,
          `Peak chat users: ${totalChatUsers}`
        ];
      }
      return [];
    },
  });

  return (
    <ChartContainer
      title="Daily Chat Users Trends"
      description="Number of unique users using different chat modes each day"
      stats={createChatModeStats(modeSummaries)}
      isEmpty={data.length === 0}
      emptyState="No chat user data available"
      footer={
        <div className="grid grid-cols-6 gap-4 text-xs text-gray-500">
          {modeSummaries.map(({ mode, max }) => (
            <div key={mode.key}>
              <span className={`font-medium ${mode.colorClass}`}>{mode.footerLabel}:</span> Max {max} users
            </div>
          ))}
        </div>
      }
    >
      <Line data={chartData} options={options} />
    </ChartContainer>
  );
}
