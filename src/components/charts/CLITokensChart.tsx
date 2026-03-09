'use client';

import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { registerChartJS } from './utils/chartSetup';
import { createStackedBarChartOptions } from './utils/chartOptions';
import { createBarDataset } from './utils/chartStyles';
import { chartColors } from './utils/chartColors';
import { formatShortDate } from '../../utils/formatters';
import { calculateTotal } from '../../domain/calculators/statsCalculators';
import type { DailyCliTokenData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface CLITokensChartProps {
  data: DailyCliTokenData[];
}

function formatTokenCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

export default function CLITokensChart({ data }: CLITokensChartProps) {
  const totalOutput = calculateTotal(data, d => d.outputTokens);
  const totalPrompt = calculateTotal(data, d => d.promptTokens);

  const chartData = {
    labels: data.map(d => formatShortDate(d.date)),
    datasets: [
      createBarDataset(chartColors.amber.solid, 'Prompt Tokens', data.map(d => d.promptTokens)),
      createBarDataset(chartColors.red.solid, 'Output Tokens', data.map(d => d.outputTokens)),
    ],
  };

  const options = createStackedBarChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Tokens',
    yTicksCallback: (value: unknown) => formatTokenCount(Number(value)),
    xMaxRotation: 45,
    xAutoSkip: true,
  }) as ChartOptions<'bar'>;

  return (
    <ChartContainer
      title="Daily CLI Token Usage"
      description="Stacked daily prompt and output tokens across all CLI users."
      isEmpty={data.length === 0}
      emptyState="No CLI token data available"
      summaryStats={[
        { value: formatTokenCount(totalPrompt), label: 'Total Prompt Tokens' },
        { value: formatTokenCount(totalOutput), label: 'Total Output Tokens' },
        { value: formatTokenCount(totalPrompt + totalOutput), label: 'Total Tokens' },
      ]}
    >
      <div style={{ height: 350 }}>
        <Bar data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
}
