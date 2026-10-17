'use client';

import { useMemo } from 'react';
import CompositionChart from './CompositionChart';
import { hasCompositionData, type CompositionEntry } from './utils/compositionChart';
import { getIdeColor, hasIdeColor, ideColors } from './utils/chartColors';
import ChartContainer from '../ui/ChartContainer';
import { formatIDEName } from '../icons/IDEIcons';
import { sortBySelector } from '../../utils/sorting';
import type { IDEStatsData } from '../../types/metrics';

interface IDEDistributionChartProps {
  ideStats: IDEStatsData[];
  cliUsers: number;
}

export default function IDEDistributionChart({ ideStats, cliUsers }: IDEDistributionChartProps) {
  const entries = useMemo<CompositionEntry[]>(() => {
    let fallbackIndex = 0;
    const clients = sortBySelector(ideStats, ide => ide.uniqueUsers, 'desc').map((ide) => {
      const color = getIdeColor(ide.ide, fallbackIndex);
      if (!hasIdeColor(ide.ide)) {
        fallbackIndex += 1;
      }
      return { label: formatIDEName(ide.ide), value: ide.uniqueUsers, color };
    });
    if (cliUsers > 0) {
      clients.push({ label: 'Copilot CLI', value: cliUsers, color: ideColors['copilot_cli'] });
    }
    return clients;
  }, [ideStats, cliUsers]);

  return (
    <ChartContainer
      title="Client Distribution"
      description="Unique users per client. Users may appear in multiple segments if they use more than one client."
      chartHeight="h-auto"
      isEmpty={!hasCompositionData(entries)}
      emptyState="No IDE or CLI usage data available"
    >
      {/* Users of several clients count in each segment, so the segments do not sum to a user total. */}
      <CompositionChart
        variant="doughnut"
        entries={entries}
        unit="users"
        label="Users by client"
        legendPlacement="right"
        showTotal={false}
        className="flex min-h-80 flex-col justify-center print:min-h-0"
      />
    </ChartContainer>
  );
}
