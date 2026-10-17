import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserDayData } from '../../../../../types/metrics';
import { makeMetric } from '../../../../../__tests__/factories/metrics';
import { ideColors } from '../../../../charts/utils/chartColors';
import type { CompositionChartProps } from '../../../../charts/CompositionChart';
import DayClientDistributionChart from '../DayClientDistributionChart';

const { compositionChart } = vi.hoisted(() => ({ compositionChart: vi.fn<(props: CompositionChartProps) => void>() }));
vi.mock('../../../../charts/CompositionChart', () => ({
  default: (props: CompositionChartProps) => {
    compositionChart(props);
    return <div>Client composition</div>;
  },
}));

const ideTotals = (ide: string, interactions: number, assumedInteractions = 0) => ({
  ide,
  user_initiated_interaction_count: interactions,
  assumed_user_initiated_interaction_count: assumedInteractions,
  code_generation_activity_count: 0,
  code_acceptance_activity_count: 0,
  loc_added_sum: 0,
  loc_deleted_sum: 0,
  loc_suggested_to_add_sum: 0,
  loc_suggested_to_delete_sum: 0,
});

const dayWith = (totalsByIde: ReturnType<typeof ideTotals>[]): UserDayData => ({
  ...makeMetric(),
  used_copilot_app: false,
  used_copilot_coding_agent: false,
  used_copilot_code_review_active: false,
  used_copilot_code_review_passive: false,
  totals_by_ide: totalsByIde,
});

describe('DayClientDistributionChart', () => {
  beforeEach(() => compositionChart.mockClear());

  it('draws a doughnut of recorded and assumed interactions per client, including Copilot CLI', () => {
    renderToStaticMarkup(
      <DayClientDistributionChart
        dayMetrics={dayWith([ideTotals('jetbrains', 4), ideTotals('vscode', 2, 8), ideTotals('intellij', 0)])}
        cliInteractionCount={6}
      />,
    );

    expect(compositionChart).toHaveBeenCalledTimes(1);
    expect(compositionChart.mock.lastCall![0]).toMatchObject({
      variant: 'doughnut',
      unit: 'interactions',
      label: 'Interactions by client',
      legendPlacement: 'right',
      entries: [
        { label: 'VS Code', value: 10, color: ideColors.vscode },
        { label: 'JetBrains', value: 4, color: ideColors.jetbrains },
        { label: 'Copilot CLI', value: 6, color: ideColors.copilot_cli },
      ],
    });
  });

  it('shows the empty state when no client has interactions', () => {
    const markup = renderToStaticMarkup(
      <DayClientDistributionChart dayMetrics={dayWith([ideTotals('vscode', 0)])} cliInteractionCount={0} />,
    );

    expect(markup).toContain('No client activity recorded');
    expect(compositionChart).not.toHaveBeenCalled();
  });
});
