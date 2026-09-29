import type { ChartOptions, TooltipItem } from 'chart.js';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  createBaseChartOptions,
  createDualAxisChartOptions,
  createHorizontalBarChartOptions,
  createStackedBarChartOptions,
} from './chartOptions';

describe('single-axis chart options', () => {
  it('preserves bar tooltip callbacks and chart defaults without casts', () => {
    const title = (items: TooltipItem<'bar'>[]) => items[0]?.label ?? '';
    const label = (item: TooltipItem<'bar'>): string | string[] => `${item.parsed.y} users`;
    const afterBody = (items: TooltipItem<'bar'>[]) => [`${items.length} series`];
    const footer = (items: TooltipItem<'bar'>[]) => `${items.length} total`;
    const options = createBaseChartOptions({
      tooltipTitleCallback: title,
      tooltipLabelCallback: label,
      tooltipAfterBodyCallback: afterBody,
      tooltipFooterCallback: footer,
    });

    expectTypeOf(options).toExtend<ChartOptions<'bar'>>();
    expectTypeOf(options.plugins.tooltip.callbacks.label).toEqualTypeOf<typeof label | undefined>();
    expect(options.plugins.tooltip.callbacks).toEqual({ title, label, afterBody, footer });
    expect(options).toMatchObject({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'x',
      scales: { x: { stacked: false }, y: { stacked: false, beginAtZero: true } },
      interaction: { intersect: false, mode: 'index' },
    });
  });

  it('preserves line-specific tooltip types', () => {
    const label = (item: TooltipItem<'line'>): string | string[] => `${item.parsed.y}%`;
    const options = createBaseChartOptions<'line'>({ tooltipLabelCallback: label });

    expectTypeOf(options).toExtend<ChartOptions<'line'>>();
    expectTypeOf(options.plugins.tooltip.callbacks.label).toEqualTypeOf<typeof label | undefined>();
    expect(options.plugins.tooltip.callbacks.label).toBe(label);
  });

  it('keeps bar-specific types and layout in the stacked and horizontal factories', () => {
    const label = (item: TooltipItem<'bar'>) => `${item.parsed.y} interactions`;
    const stacked = createStackedBarChartOptions({ tooltipLabelCallback: label });
    const horizontal = createHorizontalBarChartOptions({ tooltipLabelCallback: label });

    expectTypeOf(stacked).toExtend<ChartOptions<'bar'>>();
    expectTypeOf(horizontal).toExtend<ChartOptions<'bar'>>();
    expect(stacked.scales.x.stacked).toBe(true);
    expect(stacked.scales.y.stacked).toBe(true);
    expect(horizontal.indexAxis).toBe('y');
    expect(stacked.plugins.tooltip.callbacks.label).toBe(label);
    expect(horizontal.plugins.tooltip.callbacks.label).toBe(label);
  });
});

describe('createDualAxisChartOptions', () => {
  it('retains mixed bar/line tooltip types', () => {
    const label = (item: TooltipItem<'line' | 'bar'>): string | string[] => `${item.parsed.y} tokens`;
    const options = createDualAxisChartOptions({ tooltipLabelCallback: label });

    expectTypeOf(options).toExtend<ChartOptions<'line' | 'bar'>>();
    expectTypeOf(options.plugins.tooltip.callbacks.label).toEqualTypeOf<typeof label | undefined>();
    expect(options.plugins.tooltip.callbacks.label).toBe(label);
  });

  it('supports stacked scales, shared tick config, and hidden extra axes', () => {
    const formatTick = (value: unknown) => `${String(value)} units`;
    const options = createDualAxisChartOptions({
      xAxisLabel: 'Date',
      yAxisLabel: 'Tokens',
      y1AxisLabel: 'Average',
      stacked: true,
      xMaxRotation: 45,
      xAutoSkip: true,
      yStepSize: 1_000,
      yTicksCallback: formatTick,
      y1TicksCallback: formatTick,
      extraYAxes: {
        y2: {
          display: false,
          min: 0,
          max: 100,
        },
      },
    });

    expect(options.scales.x).toMatchObject({
      stacked: true,
      title: { display: true, text: 'Date' },
      ticks: { maxRotation: 45, autoSkip: true },
    });
    expect(options.scales.y).toMatchObject({
      stacked: true,
      title: { display: true, text: 'Tokens' },
      beginAtZero: true,
      ticks: { stepSize: 1_000 },
    });
    expect(options.scales.y.ticks!.callback).toBe(formatTick);
    expect(options.scales.y1).toMatchObject({
      title: { display: true, text: 'Average' },
      beginAtZero: true,
      grid: { drawOnChartArea: false },
    });
    expect(options.scales.y1.ticks!.callback).toBe(formatTick);
    expect((options.scales as Record<string, unknown>).y2).toMatchObject({
      display: false,
      position: 'right',
      beginAtZero: true,
      min: 0,
      max: 100,
    });
  });
});
