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
  appData?: DailyCliSessionData[];
}

export default function CLISessionChart({ data, appData }: CLISessionChartProps) {
  const combinedData = [...data, ...(appData ?? [])];
  const totalSessions = calculateTotal(combinedData, d => d.sessionCount);
  const totalRequests = calculateTotal(combinedData, d => d.requestCount);
  const totalPrompts = calculateTotal(combinedData, d => d.promptCount);
  const showApp = appData !== undefined;
  const labels = (data.length > 0 ? data : appData ?? []).map(d => formatShortDate(d.date));

  const chartData = {
    labels,
    datasets: showApp
      ? [
          createBarDataset(chartColors.blue.solid, 'CLI Sessions', data.map(d => d.sessionCount)),
          createBarDataset(chartColors.green.solid, 'CLI Requests', data.map(d => d.requestCount)),
          createBarDataset(chartColors.purple.solid, 'CLI Prompts', data.map(d => d.promptCount)),
          createBarDataset(chartColors.black.solid, 'App Sessions', appData.map(d => d.sessionCount)),
          createBarDataset(chartColors.gray.solid, 'App Requests', appData.map(d => d.requestCount)),
          createBarDataset(chartColors.orange.solid, 'App Prompts', appData.map(d => d.promptCount)),
        ]
      : [
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
      title={showApp ? 'Daily CLI and App Sessions' : 'Daily CLI Sessions'}
      description={showApp
        ? 'Daily breakdown of Copilot CLI and App sessions, requests, and prompts.'
        : 'Daily breakdown of CLI sessions, requests, and prompts across all users.'}
      isEmpty={combinedData.length === 0}
      emptyState={showApp ? 'No CLI or App session data available' : 'No CLI session data available'}
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
