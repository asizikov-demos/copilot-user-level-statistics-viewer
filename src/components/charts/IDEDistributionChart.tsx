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
import type { IDEStatsData } from '../../types/metrics';

registerChartJS();

interface IDEDistributionChartProps {
  ideStats: IDEStatsData[];
  cliUsers: number;
}

export default function IDEDistributionChart({ ideStats, cliUsers }: IDEDistributionChartProps) {
  const sorted = sortBySelector(ideStats, ide => ide.uniqueUsers, 'desc');
  const hasCliUsers = cliUsers > 0;
  const hasData = sorted.length > 0 || hasCliUsers;

  const labels = [
    ...sorted.map((ide) => formatIDEName(ide.ide)),
    ...(hasCliUsers ? ['Copilot CLI'] : []),
  ];

  const dataValues = [
    ...sorted.map((ide) => ide.uniqueUsers),
    ...(hasCliUsers ? [cliUsers] : []),
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
    ...(hasCliUsers ? [ideColors['copilot_cli']] : []),
  ];

  const totalUsers = dataValues.reduce((sum, v) => sum + v, 0);

  const chartData = {
    labels,
    datasets: [
      createDoughnutDataset(dataValues, backgroundColors),
    ],
  };

  const options = createDoughnutChartOptions({
    tooltipLabelCallback: (context: TooltipItem<'doughnut'>) => {
      const value = context.parsed;
      const percentage = totalUsers > 0
        ? ((value / totalUsers) * 100).toFixed(1)
        : '0.0';
      return `${context.label}: ${value} users (${percentage}%)`;
    },
  });

  return (
    <ChartContainer
      title="Client Distribution"
      description="Unique users per client. Users may appear in multiple segments if they use more than one client."
      chartHeight="h-80"
      isEmpty={!hasData}
      emptyState="No IDE or CLI usage data available"
    >
      <Doughnut data={chartData} options={options} />
    </ChartContainer>
  );
}
