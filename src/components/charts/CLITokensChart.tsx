'use client';

import { Chart } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import { registerChartJS } from './utils/chartSetup';
import { createDualAxisChartOptions } from './utils/chartOptions';
import { createBarDataset, createLineDataset } from './utils/chartStyles';
import { chartColors } from './utils/chartColors';
import { formatShortDate } from '../../utils/formatters';
import { calculateTotal } from '../../domain/calculators/statsCalculators';
import type { DailyCliTokenData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface CLITokensChartProps {
  data: DailyCliTokenData[];
  appData?: DailyCliTokenData[];
}

function formatTokenCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

export default function CLITokensChart({ data, appData }: CLITokensChartProps) {
  const combinedData = [...data, ...(appData ?? [])];
  const totalOutput = calculateTotal(combinedData, d => d.outputTokens);
  const totalPrompt = calculateTotal(combinedData, d => d.promptTokens);
  const totalRequests = calculateTotal(combinedData, d => d.requestCount);
  const averageTokensPerRequest = totalRequests > 0
    ? Math.round(((totalPrompt + totalOutput) / totalRequests) * 10) / 10
    : 0;
  const dailyAverageTokensPerRequest = data.map(d =>
    d.requestCount > 0 ? Math.round(((d.promptTokens + d.outputTokens) / d.requestCount) * 10) / 10 : null
  );
  const dailyAppAverageTokensPerRequest = appData?.map(d =>
    d.requestCount > 0 ? Math.round(((d.promptTokens + d.outputTokens) / d.requestCount) * 10) / 10 : null
  );
  const showApp = appData !== undefined;
  const labels = (data.length > 0 ? data : appData ?? []).map(d => formatShortDate(d.date));
  const formatTokenAxisTick = (value: unknown) => formatTokenCount(Number(value));

  const chartData = {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        ...createBarDataset(chartColors.amber.solid, showApp ? 'CLI Prompt Tokens' : 'Prompt Tokens', data.map(d => d.promptTokens), {
          yAxisID: 'y',
          stack: showApp ? 'cli-tokens' : 'tokens',
          order: 2,
        }),
      },
      {
        type: 'bar' as const,
        ...createBarDataset(chartColors.red.solid, showApp ? 'CLI Output Tokens' : 'Output Tokens', data.map(d => d.outputTokens), {
          yAxisID: 'y',
          stack: showApp ? 'cli-tokens' : 'tokens',
          order: 2,
        }),
      },
      {
        type: 'line' as const,
        ...createLineDataset(chartColors.blue.solid, showApp ? 'CLI Avg Tokens per Request' : 'Avg Tokens per Request', dailyAverageTokensPerRequest, {
          backgroundColor: chartColors.blue.alpha,
          borderWidth: 2,
          borderDash: [5, 3],
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 4,
          spanGaps: true,
          yAxisID: 'y1',
          order: 1,
        }),
      },
      ...(showApp ? [
        {
          type: 'bar' as const,
          ...createBarDataset(chartColors.gray.solid, 'App Prompt Tokens', appData.map(d => d.promptTokens), {
            yAxisID: 'y',
            stack: 'app-tokens',
            order: 2,
          }),
        },
        {
          type: 'bar' as const,
          ...createBarDataset(chartColors.black.solid, 'App Output Tokens', appData.map(d => d.outputTokens), {
            yAxisID: 'y',
            stack: 'app-tokens',
            order: 2,
          }),
        },
        {
          type: 'line' as const,
          ...createLineDataset(chartColors.orange.solid, 'App Avg Tokens per Request', dailyAppAverageTokensPerRequest ?? [], {
            backgroundColor: chartColors.orange.alpha,
            borderWidth: 2,
            borderDash: [5, 3],
            tension: 0.3,
            pointRadius: 2,
            pointHoverRadius: 4,
            spanGaps: true,
            yAxisID: 'y1',
            order: 1,
          }),
        },
      ] : []),
    ],
  };

  const options = {
    ...createDualAxisChartOptions({
      xAxisLabel: 'Date',
      yAxisLabel: 'Tokens',
      y1AxisLabel: 'Avg Tokens / Request',
      stacked: true,
      xMaxRotation: 45,
      xAutoSkip: true,
      yTicksCallback: formatTokenAxisTick,
      y1TicksCallback: formatTokenAxisTick,
      tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
        const label = context.dataset.label || '';
        const value = context.parsed.y;
        if (value === null) return `${label}: N/A`;
        if (label.includes('Avg Tokens per Request')) {
          return `${label}: ${formatTokenCount(value)}`;
        }
        return `${label}: ${formatTokenCount(value)} tokens`;
      },
    }),
  };

  return (
    <ChartContainer
      title={showApp ? 'Daily CLI and App Token Usage' : 'Daily CLI Token Usage'}
      description={showApp
        ? 'Daily prompt and output tokens for Copilot CLI and App.'
        : 'Stacked daily prompt and output tokens across all CLI users.'}
      isEmpty={combinedData.length === 0}
      emptyState={showApp ? 'No CLI or App token data available' : 'No CLI token data available'}
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
