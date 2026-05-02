'use client';

import { TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createBaseChartOptions, yAxisFormatters } from './utils/chartOptions';
import { createFilledLineDataset } from './utils/chartStyles';
import { chartColors } from './utils/chartColors';
import { formatShortDate } from '../../utils/formatters';
import { calculateAverage, findMinMaxValues } from '../../domain/calculators/statsCalculators';
import { DailyEngagementData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface EngagementChartProps {
  data: DailyEngagementData[];
}

export default function EngagementChart({ data }: EngagementChartProps) {
  const avgEngagement = calculateAverage(data, d => d.engagementPercentage);
  const { min: minEngagement, max: maxEngagement } = findMinMaxValues(data, d => d.engagementPercentage);

  const chartData = {
    labels: data.map(d => formatShortDate(d.date)),
    datasets: [
      createFilledLineDataset(chartColors.blue.solid, 'User Engagement %', data.map(d => d.engagementPercentage)),
    ],
  };

  const options = createBaseChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Engagement Percentage (%)',
    yMax: 100,
    yTicksCallback: yAxisFormatters.percentage,
    tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
      const dataIndex = context.dataIndex;
      const dayData = data[dataIndex];
      return [
        `Engagement: ${dayData.engagementPercentage}%`,
        `Active Users: ${dayData.activeUsers}`,
        `Total Users: ${dayData.totalUsers}`,
      ];
    },
  });

  return (
    <ChartContainer
      title="Daily User Engagement"
      description="Percentage of total users active each day during the reporting period"
      stats={[
        { label: 'Avg', value: `${avgEngagement}%` },
        { label: 'Max', value: `${maxEngagement}%` },
        { label: 'Min', value: `${minEngagement}%` },
      ]}
      isEmpty={data.length === 0}
      emptyState="No engagement data available"
      footer={
        <div className="text-xs text-gray-500">
          Total unique users in reporting period: {data[0]?.totalUsers || 0}
        </div>
      }
    >
      <Line data={chartData} options={options} />
    </ChartContainer>
  );
}
