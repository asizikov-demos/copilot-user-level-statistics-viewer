'use client';

import { TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createBaseChartOptions, yAxisFormatters } from './utils/chartOptions';
import { createLineDataset } from './utils/chartStyles';
import { chartColors } from './utils/chartColors';
import { formatShortDate } from '../../utils/formatters';
import { calculateAverage, findMaxValue } from '../../domain/calculators/statsCalculators';
import { DailyChatUsersData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface ChatUsersChartProps {
  data: DailyChatUsersData[];
}

export default function ChatUsersChart({ data }: ChatUsersChartProps) {
  const avgAskMode = calculateAverage(data, d => d.askModeUsers);
  const avgAgentMode = calculateAverage(data, d => d.agentModeUsers);
  const avgEditMode = calculateAverage(data, d => d.editModeUsers);
  const avgInlineMode = calculateAverage(data, d => d.inlineModeUsers);
  const avgPlanMode = calculateAverage(data, d => d.planModeUsers);

  const maxAskMode = findMaxValue(data, d => d.askModeUsers);
  const maxAgentMode = findMaxValue(data, d => d.agentModeUsers);
  const maxEditMode = findMaxValue(data, d => d.editModeUsers);
  const maxInlineMode = findMaxValue(data, d => d.inlineModeUsers);
  const maxPlanMode = findMaxValue(data, d => d.planModeUsers);

  const chartData = {
    labels: data.map(d => formatShortDate(d.date)),
    datasets: [
      createLineDataset(chartColors.green.solid, 'Chat: Ask Mode', data.map(d => d.askModeUsers)),
      createLineDataset(chartColors.purple.solid, 'Chat: Agent Mode', data.map(d => d.agentModeUsers)),
      createLineDataset(chartColors.amber.solid, 'Chat: Edit Mode', data.map(d => d.editModeUsers)),
      createLineDataset(chartColors.red.solid, 'Chat: Inline Mode', data.map(d => d.inlineModeUsers)),
      createLineDataset(chartColors.indigo.solid, 'Chat: Plan Mode', data.map(d => d.planModeUsers)),
    ],
  };

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
        const totalChatUsers = Math.max(dayData.askModeUsers, dayData.agentModeUsers, dayData.editModeUsers, dayData.inlineModeUsers, dayData.planModeUsers);
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
      stats={[
        { label: 'Avg Ask', value: avgAskMode },
        { label: 'Avg Agent', value: avgAgentMode },
        { label: 'Avg Edit', value: avgEditMode },
        { label: 'Avg Inline', value: avgInlineMode },
        { label: 'Avg Plan', value: avgPlanMode },
      ]}
      isEmpty={data.length === 0}
      emptyState="No chat user data available"
      footer={
        <div className="grid grid-cols-5 gap-4 text-xs text-gray-500">
          <div>
            <span className="font-medium text-green-600">Ask Mode:</span> Max {maxAskMode} users
          </div>
          <div>
            <span className="font-medium text-purple-600">Agent Mode:</span> Max {maxAgentMode} users
          </div>
          <div>
            <span className="font-medium text-amber-600">Edit Mode:</span> Max {maxEditMode} users
          </div>
          <div>
            <span className="font-medium text-red-600">Inline Mode:</span> Max {maxInlineMode} users
          </div>
          <div>
            <span className="font-medium text-indigo-600">Plan Mode:</span> Max {maxPlanMode} users
          </div>
        </div>
      }
    >
      <Line data={chartData} options={options} />
    </ChartContainer>
  );
}
