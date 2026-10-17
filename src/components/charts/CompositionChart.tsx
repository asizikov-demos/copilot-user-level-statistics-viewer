'use client';

import { useId, useMemo, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { ChevronDownIcon, ChevronRightIcon } from '@primer/octicons-react';
import { registerChartJS } from './utils/chartSetup';
import { readChartToken, toRgbColor } from './utils/chartTheme';
import {
  createCompositionChartConfig,
  formatCompositionShare,
  groupCompositionEntries,
  type CompositionEntry,
  type CompositionSlice,
} from './utils/compositionChart';
import { cn } from '../../utils/cn';

registerChartJS();

export interface CompositionChartProps {
  /** Pie for compact tiles; doughnut for standalone cards, with the total in its center */
  variant: 'pie' | 'doughnut';
  entries: readonly CompositionEntry[];
  /** Plural unit for values, such as "interactions" */
  unit: string;
  /** Accessible name for the breakdown list */
  label: string;
  /** "right" moves the legend beside the chart once the container is wide enough */
  legendPlacement?: 'bottom' | 'right';
  /** Surface behind the chart; slice separators use its color */
  surface?: 'default' | 'muted';
  /** Doughnut only. Hide the center total when entries overlap, because their sum double-counts. */
  showTotal?: boolean;
  className?: string;
}

const DOUGHNUT_CUTOUT = '62%';

// Swatch, label, value and share columns are shared by every legend row so figures align.
// Rows align to the first line because long labels wrap instead of hiding their text.
const LEGEND_ROW_CLASS = 'grid grid-cols-[0.625rem_minmax(0,1fr)_auto_3.5rem] items-start gap-x-2 rounded-sm px-1';

function Swatch({ color }: { color: string }) {
  // The offset centers the swatch on the first line of a text-sm label.
  return <span aria-hidden="true" className="mt-1.25 size-2.5 rounded-full" style={{ backgroundColor: color }} />;
}

function SliceFigures({ slice, unit }: { slice: CompositionSlice; unit: string }) {
  return (
    <>
      <span className="text-right tabular-nums">
        {slice.value.toLocaleString()}
        <span className="sr-only"> {unit}</span>
      </span>
      <span className="text-right tabular-nums text-muted">{formatCompositionShare(slice.share)}</span>
    </>
  );
}

/**
 * Pie or doughnut for a single total's part-to-whole breakdown, with an HTML legend that lists
 * every value and share. Small slices beyond the top four are grouped into an expandable "Other".
 */
export default function CompositionChart({
  variant,
  entries,
  unit,
  label,
  legendPlacement = 'bottom',
  surface = 'default',
  showTotal = true,
  className,
}: CompositionChartProps) {
  const [isOtherExpanded, setIsOtherExpanded] = useState(false);
  const otherListId = useId();
  const group = useMemo(() => groupCompositionEntries(entries), [entries]);
  const { chartData, options } = useMemo(
    () => createCompositionChartConfig({
      group,
      unit,
      cutout: variant === 'pie' ? 0 : DOUGHNUT_CUTOUT,
      borderColor: toRgbColor(readChartToken(surface === 'muted' ? 'bgColor-muted' : 'bgColor-default')),
    }),
    [group, unit, variant, surface],
  );

  if (group.slices.length === 0) return null;

  const isDoughnut = variant === 'doughnut';
  const isLegendRight = legendPlacement === 'right';
  const ExpandIcon = isOtherExpanded ? ChevronDownIcon : ChevronRightIcon;

  return (
    <div className={cn(isLegendRight && '@container', className)}>
      <div
        className={cn(
          'flex flex-col gap-4',
          // Capped legends keep each value near its label on wide cards.
          isLegendRight ? '@md:flex-row @md:items-center @md:justify-center @md:gap-6' : 'mx-auto w-full max-w-sm',
        )}
      >
        <div className={cn('relative w-full', isDoughnut ? 'h-52' : 'h-40', isLegendRight && '@md:w-52 @md:shrink-0')}>
          <Doughnut data={chartData} options={options} aria-hidden="true" />
          {isDoughnut && showTotal && (
            <p className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="sr-only">Total: </span>
              <span className="text-xl font-semibold leading-none tabular-nums text-default">
                {group.total.toLocaleString()}
              </span>
              <span className="mt-1 text-xs text-muted">{unit}</span>
            </p>
          )}
        </div>

        <ul aria-label={label} className={cn('-mx-1 min-w-0 text-sm text-default', isLegendRight && '@md:max-w-sm @md:flex-1')}>
          {group.slices.map((slice, index) =>
            slice.isOther ? (
              <li key="__other__">
                <button
                  type="button"
                  className={cn(
                    LEGEND_ROW_CLASS,
                    'w-full py-1 text-left hover:bg-[var(--control-transparent-bgColor-hover)]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-outlineColor)]',
                  )}
                  aria-expanded={isOtherExpanded}
                  aria-controls={otherListId}
                  onClick={() => setIsOtherExpanded(expanded => !expanded)}
                >
                  <Swatch color={slice.color} />
                  <span className="flex items-center gap-1">
                    {slice.label} ({group.otherEntries.length})
                    <ExpandIcon size={16} className="shrink-0 text-muted print:hidden" />
                  </span>
                  <SliceFigures slice={slice} unit={unit} />
                </button>
                <ul id={otherListId} hidden={!isOtherExpanded} className="pb-1 text-xs text-muted">
                  {group.otherEntries.map((entry, entryIndex) => (
                    <li key={`${entryIndex}-${entry.label}`} className={cn(LEGEND_ROW_CLASS, 'py-0.5')}>
                      <span aria-hidden="true" />
                      <span className="wrap-break-word">{entry.label}</span>
                      <SliceFigures slice={entry} unit={unit} />
                    </li>
                  ))}
                </ul>
              </li>
            ) : (
              <li key={`${index}-${slice.label}`} className={cn(LEGEND_ROW_CLASS, 'py-1')}>
                <Swatch color={slice.color} />
                <span className="wrap-break-word">{slice.label}</span>
                <SliceFigures slice={slice} unit={unit} />
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}
