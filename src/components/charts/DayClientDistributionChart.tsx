'use client';

import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import { registerChartJS } from './utils/chartSetup';
import { createDoughnutChartOptions } from './utils/chartOptions';
import { createDoughnutDataset } from './utils/chartStyles';
import { getIdeColor, hasIdeColor, ideColors } from './utils/chartColors';
import ChartContainer from '../ui/ChartContainer';
import { formatIDEName } from '../icons/IDEIcons';
import { sortBySelector } from '../../utils/sorting';
import type { UserDayData } from '../../types/metrics';
import { getTotalUserInitiatedInteractionCount } from '../../domain/assumedInteractions';

registerChartJS();

interface DayClientDistributionChartProps {
  dayMetrics: UserDayData;
  cliInteractionCount: number;
}

export default function DayClientDistributionChart({ dayMetrics, cliInteractionCount }: DayClientDistributionChartProps) {
  const sorted = sortBySelector(
    dayMetrics.totals_by_ide.filter((ide) => getTotalUserInitiatedInteractionCount(ide) > 0),
    getTotalUserInitiatedInteractionCount,
    'desc'
  );
  const hasCliActivity = cliInteractionCount > 0;
  const hasData = sorted.length > 0 || hasCliActivity;

  const labels = [
    ...sorted.map((ide) => formatIDEName(ide.ide)),
    ...(hasCliActivity ? ['Copilot CLI'] : []),
  ];

  const dataValues = [
    ...sorted.map(getTotalUserInitiatedInteractionCount),
    ...(hasCliActivity ? [cliInteractionCount] : []),
  ];

  let fallbackIndex = 0;
  const backgroundColors = [
    ...sorted.map((ide) => {
      const color = getIdeColor(ide.ide, fallbackIndex);
      if (!hasIdeColor(ide.ide)) {
        fallbackIndex += 1;
      }
      return color;
    }),
    ...(hasCliActivity ? [ideColors['copilot_cli']] : []),
  ];

  const totalInteractions = dataValues.reduce((sum, v) => sum + v, 0);

  const chartData = {
    labels,
    datasets: [
      createDoughnutDataset(dataValues, backgroundColors),
    ],
  };

  const options = createDoughnutChartOptions({
    tooltipLabelCallback: (context: TooltipItem<'doughnut'>) => {
      const value = context.parsed;
      const percentage = totalInteractions > 0
        ? ((value / totalInteractions) * 100).toFixed(1)
        : '0.0';
      return `${context.label}: ${value.toLocaleString()} interactions (${percentage}%)`;
    },
  });

  return (
    <ChartContainer
      title="Clients"
      description="Share of recorded and assumed interactions across clients on this day."
      chartHeight="h-64"
      className="h-full"
      isEmpty={!hasData}
      emptyState="No client activity recorded"
    >
      <Doughnut data={chartData} options={options} />
    </ChartContainer>
  );
}
