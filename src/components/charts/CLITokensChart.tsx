'use client';

import { Chart } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import { registerChartJS } from './utils/chartSetup';
import { createDualAxisChartOptions } from './utils/chartOptions';
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
  const totalRequests = calculateTotal(data, d => d.requestCount);
  const averageTokensPerRequest = totalRequests > 0
    ? Math.round(((totalPrompt + totalOutput) / totalRequests) * 10) / 10
    : 0;
  const dailyAverageTokensPerRequest = data.map(d =>
    d.requestCount > 0 ? Math.round(((d.promptTokens + d.outputTokens) / d.requestCount) * 10) / 10 : null
  );

  const chartData = {
    labels: data.map(d => formatShortDate(d.date)),
    datasets: [
      {
        type: 'bar' as const,
        ...createBarDataset(chartColors.amber.solid, 'Prompt Tokens', data.map(d => d.promptTokens), {
          yAxisID: 'y',
          stack: 'tokens',
        }),
      },
      {
        type: 'bar' as const,
        ...createBarDataset(chartColors.red.solid, 'Output Tokens', data.map(d => d.outputTokens), {
          yAxisID: 'y',
          stack: 'tokens',
        }),
      },
      {
        type: 'line' as const,
        label: 'Avg Tokens per Request',
        data: dailyAverageTokensPerRequest,
        backgroundColor: chartColors.blue.alpha,
        borderColor: chartColors.blue.solid,
        borderWidth: 2,
        borderDash: [5, 3],
        fill: false,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 4,
        spanGaps: true,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    ...createDualAxisChartOptions({
      xAxisLabel: 'Date',
      yAxisLabel: 'Tokens',
      y1AxisLabel: 'Avg Tokens / Request',
      tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
        const label = context.dataset.label || '';
        const value = context.parsed.y;
        if (value === null) return `${label}: N/A`;
        if (label === 'Avg Tokens per Request') {
          return `${label}: ${formatTokenCount(value)}`;
        }
        return `${label}: ${formatTokenCount(value)} tokens`;
      },
    }),
    scales: {
      x: {
        stacked: true,
        display: true,
        title: { display: true, text: 'Date' },
        ticks: { maxRotation: 45, autoSkip: true },
      },
      y: {
        stacked: true,
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: 'Tokens' },
        beginAtZero: true,
        ticks: {
          callback: (value: string | number) => formatTokenCount(Number(value)),
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: { display: true, text: 'Avg Tokens / Request' },
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: {
          callback: (value: string | number) => formatTokenCount(Number(value)),
        },
      },
    },
  };

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
        { value: formatTokenCount(averageTokensPerRequest), label: 'Avg Tokens / Request' },
      ]}
    >
      <div className="h-full">
        <Chart type="bar" data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
}
