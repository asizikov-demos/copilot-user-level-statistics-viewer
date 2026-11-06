'use client';

import { useMemo } from 'react';
import CompositionChartCard from './CompositionChartCard';
import type { CompositionEntry } from './utils/compositionChart';
import { getIdeColor } from './utils/chartColors';
import { formatIDEName } from '../icons/IDEIcons';
import { sortBySelector } from '../../utils/sorting';
import type { IDEStatsData } from '../../types/metrics';

interface IDEDistributionChartProps {
  ideStats: IDEStatsData[];
  cliUsers: number;
}

export default function IDEDistributionChart({ ideStats, cliUsers }: IDEDistributionChartProps) {
  const entries = useMemo<CompositionEntry[]>(() => {
    const clients = sortBySelector(ideStats, ide => ide.uniqueUsers, 'desc').map((ide) => {
      return { clientKey: ide.ide, label: formatIDEName(ide.ide), value: ide.uniqueUsers, color: getIdeColor(ide.ide) };
    });
    if (cliUsers > 0) {
      clients.push({ clientKey: 'copilot_cli', label: 'Copilot CLI', value: cliUsers, color: getIdeColor('copilot_cli') });
    }
    return clients;
  }, [ideStats, cliUsers]);

  return (
    <CompositionChartCard
      title="Client Distribution"
      description="Unique users per client. Users may appear in multiple segments if they use more than one client."
      emptyState="No IDE or CLI usage data available"
      entries={entries}
      unit="users"
      label="Users by client"
      legendPlacement="right"
      showTotal={false}
      chartClassName="flex min-h-80 flex-col justify-center print:min-h-0"
    />
  );
}
