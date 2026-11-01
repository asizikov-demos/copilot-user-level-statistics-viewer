'use client';

import { Bar } from 'react-chartjs-2';
import type { ThirdPartyAgentActivity } from '../../types/agentActivity';
import ChartContainer from '../ui/ChartContainer';
import { registerChartJS } from './utils/chartSetup';
import { getSequentialColor } from './utils/chartColors';
import { createBarDataset } from './utils/chartStyles';
import { yAxisFormatters } from './utils/chartOptions';
import { createDailyReportRangeChartConfig } from './utils/dailyBarChart';

registerChartJS();

interface ThirdPartyAgentActivityChartProps {
  data?: ThirdPartyAgentActivity;
  reportStartDay: string;
  reportEndDay: string;
}

export default function ThirdPartyAgentActivityChart({
  data,
  reportStartDay,
  reportEndDay,
}: ThirdPartyAgentActivityChartProps) {
  if (!data?.agents.length) return null;

  const { chartData, options } = createDailyReportRangeChartConfig<
    ThirdPartyAgentActivity['daily'][number],
    'bar'
  >({
    data: data.daily,
    reportStartDay,
    reportEndDay,
    type: 'bar',
    series: data.agents.map((agent, index) => ({
      label: agent.name,
      color: getSequentialColor(index),
      getValue: entry => entry?.interactions[agent.id] ?? 0,
    })),
    createDataset: (series, values) => createBarDataset(series.color, series.label, values),
    options: {
      xAxisLabel: 'Date',
      yAxisLabel: 'User-initiated interactions',
      yTicksCallback: yAxisFormatters.integer,
      xAutoSkip: true,
    },
  });

  return (
    <ChartContainer
      title="Daily third-party agent activity"
      description="Daily user-initiated interactions by third-party agent, separate from Copilot agent-native activity."
      summaryStats={data.agents.map(agent => ({
        label: agent.name,
        value: agent.interactions.toLocaleString(),
      }))}
    >
      <Bar
        data={chartData}
        options={options}
        role="img"
        aria-label={`Daily third-party agent activity: ${data.agents.map(agent => agent.name).join(', ')}.`}
      />
    </ChartContainer>
  );
}
