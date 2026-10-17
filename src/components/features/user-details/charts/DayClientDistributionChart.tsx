'use client';

import React from 'react';
import { Bar } from 'react-chartjs-2';
import { registerChartJS } from '../../../charts/utils/chartSetup';
import { createDistributionBarChartConfig, type DistributionBarEntry } from '../../../charts/utils/distributionBarChart';
import { getIdeColor, hasIdeColor, ideColors } from '../../../charts/utils/chartColors';
import ChartContainer from '../../../ui/ChartContainer';
import { formatIDEName } from '../../../icons/IDEIcons';
import { sortBySelector } from '../../../../utils/sorting';
import type { UserDayData } from '../../../../types/metrics';
import { getTotalUserInitiatedInteractionCount } from '../../../../domain/assumedInteractions';

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

  let fallbackIndex = 0;
  const entries: DistributionBarEntry[] = sorted.map((ide) => {
    const color = getIdeColor(ide.ide, fallbackIndex);
    if (!hasIdeColor(ide.ide)) {
      fallbackIndex += 1;
    }
    return { label: formatIDEName(ide.ide), value: getTotalUserInitiatedInteractionCount(ide), color };
  });
  if (hasCliActivity) {
    entries.push({ label: 'Copilot CLI', value: cliInteractionCount, color: ideColors['copilot_cli'] });
  }

  const { chartData, options } = createDistributionBarChartConfig({
    entries,
    datasetLabel: 'Interactions',
    unit: 'interactions',
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
      <Bar data={chartData} options={options} />
    </ChartContainer>
  );
}
