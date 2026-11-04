'use client';

import { useMemo } from 'react';
import CompositionChart from '../../../charts/CompositionChart';
import { hasCompositionData, type CompositionEntry } from '../../../charts/utils/compositionChart';
import { getIdeColor, hasIdeColor, ideColors } from '../../../charts/utils/chartColors';
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
      let fallbackIndex = 0;
      return sortBySelector([...totals], ([, count]) => count, 'desc').map(([client, value]) => {
        const color = getIdeColor(client, fallbackIndex);
        if (!hasIdeColor(client)) fallbackIndex += 1;
        return { label: formatIDEName(client), value, color };
      });
    }
    const sorted = sortBySelector(
      dayMetrics.totals_by_ide.filter((ide) => getTotalUserInitiatedInteractionCount(ide) > 0),
      getTotalUserInitiatedInteractionCount,
      'desc'
    );

    let fallbackIndex = 0;
    const clients = sorted.map((ide) => {
      const color = getIdeColor(ide.ide, fallbackIndex);
      if (!hasIdeColor(ide.ide)) {
        fallbackIndex += 1;
      }
      return { label: formatIDEName(ide.ide), value: getTotalUserInitiatedInteractionCount(ide), color };
    });
    if (cliInteractionCount > 0) {
      clients.push({ label: 'Copilot CLI', value: cliInteractionCount, color: ideColors['copilot_cli'] });
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
