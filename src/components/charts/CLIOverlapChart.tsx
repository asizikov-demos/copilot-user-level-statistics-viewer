'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import type { TooltipItem } from 'chart.js';
import { registerChartJS } from './utils/chartSetup';
import { createHorizontalBarChartOptions } from './utils/chartOptions';
import ChartContainer from '../ui/ChartContainer';
import { formatIDEName } from '../icons/IDEIcons';
import type { IDEStatsData } from '../../types/metrics';

registerChartJS();

interface CLIOverlapChartProps {
  ideStats: IDEStatsData[];
}

export default function CLIOverlapChart({ ideStats }: CLIOverlapChartProps) {
  const sorted = [...ideStats]
    .filter(ide => ide.uniqueUsers > 0)
    .sort((a, b) => (b.cliOverlapUsers / b.uniqueUsers) - (a.cliOverlapUsers / a.uniqueUsers));

  const labels = sorted.map(ide => formatIDEName(ide.ide));
  const cliOverlap = sorted.map(ide => ide.cliOverlapUsers);
  const ideOnly = sorted.map(ide => ide.uniqueUsers - ide.cliOverlapUsers);

  const data = {
    labels,
    datasets: [
      {
        label: 'Also uses CLI',
        data: cliOverlap,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
      },
      {
        label: 'IDE only',
        data: ideOnly,
        backgroundColor: 'rgba(209, 213, 219, 0.8)',
        borderColor: 'rgb(156, 163, 175)',
        borderWidth: 1,
      },
    ],
  };

  const options = createHorizontalBarChartOptions({
    stacked: true,
    tooltipLabelCallback: (ctx: TooltipItem<'bar'>) => {
      const idx = ctx.dataIndex;
      const total = sorted[idx].uniqueUsers;
      const overlap = sorted[idx].cliOverlapUsers;
      const pct = total > 0 ? ((overlap / total) * 100).toFixed(1) : '0.0';
      if (ctx.datasetIndex === 0) {
        return `Also uses CLI: ${overlap} of ${total} users (${pct}%)`;
      }
      return `IDE only: ${total - overlap} users`;
    },
  });

  return (
    <ChartContainer title="CLI Adoption by IDE" chartHeight="h-80" isEmpty={sorted.length === 0} emptyState="No IDE usage data available">
      <Bar data={data} options={options} />
    </ChartContainer>
  );
}
