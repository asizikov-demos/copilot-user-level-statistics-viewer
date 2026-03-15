'use client';

import { TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createBaseChartOptions, yAxisFormatters } from './utils/chartOptions';
import { createLineDataset } from './utils/chartStyles';
import { chatModeColors } from './utils/chartColors';
import { formatShortDate } from '../../utils/formatters';
import { calculateAverage, calculateTotal, findMaxValue } from '../../domain/calculators/statsCalculators';
import { DailyChatRequestsData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface ChatRequestsChartProps {
  data: DailyChatRequestsData[];
}

export default function ChatRequestsChart({ data }: ChatRequestsChartProps) {
  const totalAskRequests = calculateTotal(data, d => d.askModeRequests);
  const totalAgentRequests = calculateTotal(data, d => d.agentModeRequests);
  const totalEditRequests = calculateTotal(data, d => d.editModeRequests);
  const totalInlineRequests = calculateTotal(data, d => d.inlineModeRequests);
  const totalPlanRequests = calculateTotal(data, d => d.planModeRequests);
  const totalCliSessions = calculateTotal(data, d => d.cliSessions);
  const grandTotal = totalAskRequests + totalAgentRequests + totalEditRequests + totalInlineRequests + totalPlanRequests + totalCliSessions;

  const avgAskRequests = calculateAverage(data, d => d.askModeRequests);
  const avgAgentRequests = calculateAverage(data, d => d.agentModeRequests);
  const avgEditRequests = calculateAverage(data, d => d.editModeRequests);
  const avgInlineRequests = calculateAverage(data, d => d.inlineModeRequests);
  const avgPlanRequests = calculateAverage(data, d => d.planModeRequests);
  const avgCliSessions = calculateAverage(data, d => d.cliSessions);

  const maxAskRequests = findMaxValue(data, d => d.askModeRequests);
  const maxAgentRequests = findMaxValue(data, d => d.agentModeRequests);
  const maxEditRequests = findMaxValue(data, d => d.editModeRequests);
  const maxInlineRequests = findMaxValue(data, d => d.inlineModeRequests);
  const maxPlanRequests = findMaxValue(data, d => d.planModeRequests);
  const maxCliSessions = findMaxValue(data, d => d.cliSessions);

  const chartData = {
    labels: data.map(d => formatShortDate(d.date)),
    datasets: [
      createLineDataset(chatModeColors.ask.solid, 'Ask Mode Requests', data.map(d => d.askModeRequests)),
      createLineDataset(chatModeColors.agent.solid, 'Agent Mode Requests', data.map(d => d.agentModeRequests)),
      createLineDataset(chatModeColors.edit.solid, 'Edit Mode Requests', data.map(d => d.editModeRequests)),
      createLineDataset(chatModeColors.inline.solid, 'Inline Mode Requests', data.map(d => d.inlineModeRequests)),
      createLineDataset(chatModeColors.plan.solid, 'Plan Mode Requests', data.map(d => d.planModeRequests)),
      createLineDataset(chatModeColors.cli.solid, 'CLI Sessions', data.map(d => d.cliSessions)),
    ],
  };

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
        const totalRequests = dayData.askModeRequests + dayData.agentModeRequests + dayData.editModeRequests + dayData.inlineModeRequests + dayData.planModeRequests + dayData.cliSessions;
        return [
          '',
          `Date: ${dayData.date}`,
          `Total requests: ${totalRequests}`
        ];
      }
      return [];
    },
  });

  return (
    <ChartContainer
      title="Daily Chat Requests"
      description="Number of user-initiated chat interactions per mode each day"
      stats={[
        { label: 'Avg Ask', value: avgAskRequests },
        { label: 'Avg Agent', value: avgAgentRequests },
        { label: 'Avg Edit', value: avgEditRequests },
        { label: 'Avg Inline', value: avgInlineRequests },
        { label: 'Avg Plan', value: avgPlanRequests },
        { label: 'Avg CLI', value: avgCliSessions },
      ]}
      isEmpty={data.length === 0}
      emptyState="No chat request data available"
      footer={
        <div className="grid grid-cols-7 gap-4 text-xs text-gray-500">
          <div>
            <span className="font-medium text-green-600">Ask Mode:</span> {totalAskRequests} total (max {maxAskRequests}/day)
          </div>
          <div>
            <span className="font-medium text-blue-600">Agent Mode:</span> {totalAgentRequests} total (max {maxAgentRequests}/day)
          </div>
          <div>
            <span className="font-medium text-gray-900">Edit Mode:</span> {totalEditRequests} total (max {maxEditRequests}/day)
          </div>
          <div>
            <span className="font-medium text-amber-600">Inline Mode:</span> {totalInlineRequests} total (max {maxInlineRequests}/day)
          </div>
          <div>
            <span className="font-medium text-purple-600">Plan Mode:</span> {totalPlanRequests} total (max {maxPlanRequests}/day)
          </div>
          <div>
            <span className="font-medium text-rose-600">CLI:</span> {totalCliSessions} total (max {maxCliSessions}/day)
          </div>
          <div>
            <span className="font-medium text-gray-600">All Modes:</span> {grandTotal} total requests
          </div>
        </div>
      }
    >
      <Line data={chartData} options={options} />
    </ChartContainer>
  );
}
