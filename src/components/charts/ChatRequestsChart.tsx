'use client';

import { TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createBaseChartOptions, yAxisFormatters } from './utils/chartOptions';
import { DailyChatRequestsData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';
import {
  ChatModeFooterEntry,
  createChatModeFooterEntries,
  createChatModeLineChartData,
  createChatModeMetricSummaries,
  createChatModeStats,
  renderChatModeFooter,
  sumChatModeDayValues,
} from './utils/chatModeChart';

registerChartJS();

interface ChatRequestsChartProps {
  data: DailyChatRequestsData[];
}

export default function ChatRequestsChart({ data }: ChatRequestsChartProps) {
  const modeSummaries = createChatModeMetricSummaries(data, (day, mode) => mode.getRequestsValue(day));
  const grandTotal = modeSummaries.reduce((sum, summary) => sum + summary.total, 0);

  const chartData = createChatModeLineChartData(
    data,
    (day, mode) => mode.getRequestsValue(day),
    mode => mode.requestDatasetLabel
  );

  const options = createBaseChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Number of Requests',
    yStepSize: 1,
    yTicksCallback: yAxisFormatters.integer,
    tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
      const value = context.parsed.y;
      const datasetLabel = context.dataset.label;
      const unit = datasetLabel === 'CLI Sessions' ? 'sessions' : 'requests';
      return `${datasetLabel}: ${value} ${unit}`;
    },
    tooltipAfterBodyCallback: (tooltipItems: TooltipItem<'line' | 'bar'>[]) => {
      if (tooltipItems.length > 0) {
        const dataIndex = tooltipItems[0].dataIndex;
        const dayData = data[dataIndex];
        const totalRequests = sumChatModeDayValues(dayData, (day, mode) => mode.getRequestsValue(day));
        return [
          '',
          `Date: ${dayData.date}`,
          `Total requests: ${totalRequests}`
        ];
      }
      return [];
    },
  });

  const allModesEntry: ChatModeFooterEntry = {
    key: 'all-modes',
    label: 'All Modes',
    colorClass: 'text-gray-600',
    content: `${grandTotal} total requests`,
  };

  return (
    <ChartContainer
      title="Daily Chat Requests"
      description="Number of user-initiated chat interactions per mode each day"
      stats={createChatModeStats(modeSummaries)}
      isEmpty={data.length === 0}
      emptyState="No chat request data available"
      footer={renderChatModeFooter(
        createChatModeFooterEntries(modeSummaries, summary => `${summary.total} total (max ${summary.max}/day)`),
        [allModesEntry]
      )}
    >
      <Line data={chartData} options={options} />
    </ChartContainer>
  );
}
