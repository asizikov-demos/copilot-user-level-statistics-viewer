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
}

export default function DayClientDistributionChart({ dayMetrics, cliInteractionCount }: DayClientDistributionChartProps) {
  const entries = useMemo<CompositionEntry[]>(() => {
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
  }, [dayMetrics.totals_by_ide, cliInteractionCount]);

  return (
    <ChartContainer
      title="Clients"
      description="Share of recorded and assumed interactions across clients on this day."
      chartHeight="h-auto"
      className="h-full"
      isEmpty={!hasCompositionData(entries)}
      emptyState="No client activity recorded"
    >
      <CompositionChart
        variant="doughnut"
        entries={entries}
        unit="interactions"
        label="Interactions by client"
        legendPlacement="right"
      />
    </ChartContainer>
  );
}
