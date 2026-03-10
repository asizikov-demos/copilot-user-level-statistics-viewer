'use client';

import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { registerChartJS } from './utils/chartSetup';
import { createBaseChartOptions } from './utils/chartOptions';
import { createBarDataset } from './utils/chartStyles';
import { chartColors } from './utils/chartColors';
import { formatShortDate } from '../../utils/formatters';
import { calculateTotal } from '../../domain/calculators/statsCalculators';
import type { DailyCliSessionData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface CLISessionChartProps {
  data: DailyCliSessionData[];
}

export default function CLISessionChart({ data }: CLISessionChartProps) {
  const totalSessions = calculateTotal(data, d => d.sessionCount);
  const totalRequests = calculateTotal(data, d => d.requestCount);
  const totalPrompts = calculateTotal(data, d => d.promptCount);

  const chartData = {
    labels: data.map(d => formatShortDate(d.date)),
    datasets: [
      createBarDataset(chartColors.blue.solid, 'Sessions', data.map(d => d.sessionCount)),
      createBarDataset(chartColors.green.solid, 'Requests', data.map(d => d.requestCount)),
      createBarDataset(chartColors.purple.solid, 'Prompts', data.map(d => d.promptCount)),
    ],
  };

  const options = createBaseChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Count',
    xMaxRotation: 45,
    xAutoSkip: true,
  }) as ChartOptions<'bar'>;

  return (
    <ChartContainer
      title="Daily CLI Sessions"
      description="Daily breakdown of CLI sessions, requests, and prompts across all users."
      isEmpty={data.length === 0}
      emptyState="No CLI session data available"
      summaryStats={[
        { value: totalSessions.toLocaleString(), label: 'Total Sessions' },
        { value: totalRequests.toLocaleString(), label: 'Total Requests' },
        { value: totalPrompts.toLocaleString(), label: 'Total Prompts' },
      ]}
    >
      <div className="h-full">
        <Bar data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
}
