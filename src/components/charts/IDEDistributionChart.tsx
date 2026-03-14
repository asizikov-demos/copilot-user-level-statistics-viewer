'use client';

import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { registerChartJS } from './utils/chartSetup';
import ChartContainer from '../ui/ChartContainer';
import { formatIDEName } from '../icons/IDEIcons';
import type { IDEStatsData } from '../../types/metrics';

registerChartJS();

interface IDEDistributionChartProps {
  ideStats: IDEStatsData[];
  cliUsers: number;
}

// Visually distinct palette — prioritizes chart readability over brand colors
const IDE_COLORS: Record<string, string> = {
  'vscode': '#007ACC',       // blue (brand)
  'visualstudio': '#68217A', // purple (brand)
  'jetbrains': '#FC801D',    // orange (JetBrains brand)
  'vim': '#019733',          // green (brand)
  'neovim': '#57A143',       // lime green (brand)
  'emacs': '#9266CC',        // lavender
  'eclipse': '#2C2255',      // dark indigo (brand)
  'xcode': '#29ABE2',        // sky blue
  'intellij': '#FC801D',     // orange (same as jetbrains)
  'copilot_cli': '#DB61A2',  // pink (Copilot accent)
  'zed': '#F9CE49',          // yellow (Zed brand)
};

const FALLBACK_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#14B8A6',
];

export default function IDEDistributionChart({ ideStats, cliUsers }: IDEDistributionChartProps) {
  const sorted = [...ideStats].sort((a, b) => b.uniqueUsers - a.uniqueUsers);
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
      const key = ide.ide.toLowerCase().trim();
      if (IDE_COLORS[key]) return IDE_COLORS[key];
      return FALLBACK_COLORS[fallbackIndex++ % FALLBACK_COLORS.length];
    }),
    ...(hasCliUsers ? [IDE_COLORS['copilot_cli']] : []),
  ];

  const totalUsers = dataValues.reduce((sum, v) => sum + v, 0);

  const chartData = {
    labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: backgroundColors,
        borderWidth: 1,
        borderColor: '#ffffff',
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '55%',
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label(context: TooltipItem<'doughnut'>) {
            const value = context.parsed;
            const percentage = totalUsers > 0
              ? ((value / totalUsers) * 100).toFixed(1)
              : '0.0';
            return `${context.label}: ${value} users (${percentage}%)`;
          },
        },
      },
    },
  };

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
