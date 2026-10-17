'use client';

import type { TooltipItem } from 'chart.js';
import { sortBySelector } from '../../../utils/sorting';
import { chartColors } from './chartColors';
import { createDoughnutChartOptions } from './chartOptions';
import { createDoughnutDataset } from './chartStyles';

export interface CompositionEntry {
  label: string;
  value: number;
  color: string;
}

export interface CompositionSlice extends CompositionEntry {
  /** Percentage of the composition total (0–100) */
  share: number;
  /** True for the slice that groups the long tail */
  isOther?: boolean;
}

export interface CompositionGroup {
  /** Slices to draw, largest first, with the grouped "Other" slice last */
  slices: CompositionSlice[];
  /** Entries folded into the "Other" slice, largest first */
  otherEntries: CompositionSlice[];
  total: number;
}

export const COMPOSITION_OTHER_LABEL = 'Other';

/** Pie and doughnut charts stay readable with at most five slices, including "Other". */
export const MAX_COMPOSITION_SLICES = 5;

const isPositiveValue = (entry: CompositionEntry) => Number.isFinite(entry.value) && entry.value > 0;

/** True when at least one entry would draw a slice. */
export function hasCompositionData(entries: readonly CompositionEntry[] | undefined): boolean {
  return entries?.some(isPositiveValue) ?? false;
}

/**
 * Prepares a single total's part-to-whole breakdown for a pie or doughnut chart. Drops
 * non-positive values, orders entries largest first, and folds the long tail into a gray
 * "Other" slice so that at most `maxSlices` slices are drawn.
 */
export function groupCompositionEntries(
  entries: readonly CompositionEntry[],
  maxSlices: number = MAX_COMPOSITION_SLICES,
): CompositionGroup {
  const ranked = sortBySelector(entries.filter(isPositiveValue), entry => entry.value, 'desc');
  const total = ranked.reduce((sum, entry) => sum + entry.value, 0);
  const toSlice = (entry: CompositionEntry): CompositionSlice => ({
    ...entry,
    share: total > 0 ? (entry.value / total) * 100 : 0,
  });

  if (ranked.length <= maxSlices) {
    return { slices: ranked.map(toSlice), otherEntries: [], total };
  }

  const visibleCount = Math.max(1, maxSlices - 1);
  const otherEntries = ranked.slice(visibleCount).map(toSlice);
  const otherSlice: CompositionSlice = {
    ...toSlice({
      label: COMPOSITION_OTHER_LABEL,
      value: otherEntries.reduce((sum, entry) => sum + entry.value, 0),
      color: chartColors.gray.solid,
    }),
    isOther: true,
  };

  return {
    slices: [...ranked.slice(0, visibleCount).map(toSlice), otherSlice],
    otherEntries,
    total,
  };
}

/**
 * Formats a slice share with one decimal, without rounding a partial share to 0% or 100%.
 */
export function formatCompositionShare(share: number): string {
  if (share > 0 && share < 0.05) return '<0.1%';
  if (share < 100 && share >= 99.95) return '>99.9%';
  return `${share.toFixed(1)}%`;
}

interface CompositionChartConfig {
  group: CompositionGroup;
  unit: string;
  /** Inner radius; 0 draws a pie */
  cutout: string | number;
  /** Slice separator color; match the surface behind the chart */
  borderColor: string;
}

/**
 * Builds Chart.js data and options for a pie or doughnut whose legend is rendered in HTML.
 */
export function createCompositionChartConfig({ group, unit, cutout, borderColor }: CompositionChartConfig) {
  const { slices } = group;

  return {
    chartData: {
      labels: slices.map(slice => slice.label),
      datasets: [
        createDoughnutDataset(
          slices.map(slice => slice.value),
          slices.map(slice => slice.color),
          {
            borderColor,
            // A lone full-circle slice would show its separator as a seam.
            borderWidth: slices.length > 1 ? 2 : 0,
            hoverOffset: 4,
          },
        ),
      ],
    },
    options: createDoughnutChartOptions({
      cutout,
      showLegend: false,
      // The slice name sits in the title so each line stays narrow enough for small canvases.
      tooltipTitleCallback: (items: TooltipItem<'doughnut'>[]) => slices[items[0]?.dataIndex ?? -1]?.label ?? '',
      tooltipLabelCallback: (context: TooltipItem<'doughnut'>) => {
        const slice = slices[context.dataIndex];
        if (!slice) return '';
        return `${slice.value.toLocaleString()} ${unit} (${formatCompositionShare(slice.share)})`;
      },
    }),
  };
}
