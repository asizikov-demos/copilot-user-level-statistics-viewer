'use client';

import { useMemo } from 'react';
import CompositionChart from '../../../charts/CompositionChart';
import { hasCompositionData, type CompositionEntry } from '../../../charts/utils/compositionChart';
import { getIdeColor } from '../../../charts/utils/chartColors';
import ChartContainer from '../../../ui/ChartContainer';
import { formatIDEName } from '../../../icons/IDEIcons';
import { sortBySelector } from '../../../../utils/sorting';
import type { UserDayData } from '../../../../types/metrics';
import { getTotalUserInitiatedInteractionCount } from '../../../../domain/assumedInteractions';

interface DayClientDistributionChartProps {
  dayMetrics: UserDayData;
  cliInteractionCount: number;
  measure?: 'interactions' | 'requests';
}

export default function DayClientDistributionChart({ dayMetrics, cliInteractionCount, measure = 'interactions' }: DayClientDistributionChartProps) {
  const entries = useMemo<CompositionEntry[]>(() => {
    if (measure === 'requests') {
      const totals = new Map<string, number>();
      for (const client of dayMetrics.totals_by_client ?? []) {
        totals.set(client.client, (totals.get(client.client) ?? 0) + client.request_count);
      }
      return sortBySelector([...totals], ([, count]) => count, 'desc').map(([client, value]) => {
        return { clientKey: client, label: formatIDEName(client), value, color: getIdeColor(client) };
      });
    }
    const sorted = sortBySelector(
      dayMetrics.totals_by_ide.filter((ide) => getTotalUserInitiatedInteractionCount(ide) > 0),
      getTotalUserInitiatedInteractionCount,
      'desc'
    );

    const clients = sorted.map((ide) => {
      return { clientKey: ide.ide, label: formatIDEName(ide.ide), value: getTotalUserInitiatedInteractionCount(ide), color: getIdeColor(ide.ide) };
    });
    if (cliInteractionCount > 0) {
      clients.push({ clientKey: 'copilot_cli', label: 'Copilot CLI', value: cliInteractionCount, color: getIdeColor('copilot_cli') });
    }
    return clients;
  }, [dayMetrics.totals_by_ide, dayMetrics.totals_by_client, cliInteractionCount, measure]);

  return (
    <ChartContainer
      title="Clients"
      description={measure === 'requests'
        ? 'Share of reported model requests across clients on this day.'
        : 'Share of recorded and assumed interactions across clients on this day.'}
      chartHeight="h-auto"
      className="h-full"
      isEmpty={!hasCompositionData(entries)}
      emptyState="No client activity recorded"
    >
      <CompositionChart
        variant="doughnut"
        entries={entries}
        unit={measure}
        label={measure === 'requests' ? 'Requests by client' : 'Interactions by client'}
        legendPlacement="right"
      />
    </ChartContainer>
  );
}
