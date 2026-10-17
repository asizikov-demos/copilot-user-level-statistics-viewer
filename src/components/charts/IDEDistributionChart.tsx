'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createDistributionBarChartConfig, type DistributionBarEntry } from './utils/distributionBarChart';
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

  let fallbackIndex = 0;
  const entries: DistributionBarEntry[] = sorted.map((ide) => {
    const color = getIdeColor(ide.ide, fallbackIndex);
    if (!hasIdeColor(ide.ide)) {
      fallbackIndex += 1;
    }
    return { label: formatIDEName(ide.ide), value: ide.uniqueUsers, color };
  });
  if (hasCliUsers) {
    entries.push({ label: 'Copilot CLI', value: cliUsers, color: ideColors['copilot_cli'] });
  }

  const { chartData, options } = createDistributionBarChartConfig({
    entries,
    datasetLabel: 'Unique users',
    unit: 'users',
  });

  return (
    <ChartContainer
      title="Client Distribution"
      description="Unique users per client. Users may appear in multiple segments if they use more than one client."
      chartHeight="h-80"
      isEmpty={!hasData}
      emptyState="No IDE or CLI usage data available"
    >
      <Bar data={chartData} options={options} />
    </ChartContainer>
  );
}
