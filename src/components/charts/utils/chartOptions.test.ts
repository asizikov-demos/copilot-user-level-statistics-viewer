import type { TooltipItem } from 'chart.js';
import { describe, expect, it } from 'vitest';
import {
  createBaseChartOptions,
  createDoughnutChartOptions,
  createDualAxisChartOptions,
  createHorizontalBarChartOptions,
  createRadarChartOptions,
  createStackedBarChartOptions,
} from './chartOptions';

const formatTick = (value: unknown) => `${String(value)} units`;

describe('createBaseChartOptions', () => {
  it('propagates tooltip callbacks and axis config to an unstacked vertical chart', () => {
    const title = (items: TooltipItem<'bar'>[]) => items[0]?.label ?? '';
    const label = (item: TooltipItem<'bar'>) => `${item.parsed.y} users`;
    const afterBody = (items: TooltipItem<'bar'>[]) => [`${items.length} series`];
    const footer = (items: TooltipItem<'bar'>[]) => `${items.length} total`;
    const options = createBaseChartOptions({
      yAxisLabel: 'Users',
      yTicksCallback: formatTick,
      tooltipTitleCallback: title,
      tooltipLabelCallback: label,
      tooltipAfterBodyCallback: afterBody,
      tooltipFooterCallback: footer,
    });

    expect(options.plugins.tooltip.callbacks).toEqual({ title, label, afterBody, footer });
    expect(options.indexAxis).toBe('x');
    expect(options.scales.y).toMatchObject({ stacked: false, title: { display: true, text: 'Users' } });
    expect(options.scales.y.ticks.callback).toBe(formatTick);
  });

  it('propagates line tooltip callbacks', () => {
    const label = (item: TooltipItem<'line'>) => `${item.parsed.y}%`;

    expect(createBaseChartOptions<'line'>({ tooltipLabelCallback: label }).plugins.tooltip.callbacks.label).toBe(label);
  });
});

describe.each([
  ['createStackedBarChartOptions', createStackedBarChartOptions, { stacked: true, indexAxis: 'x' }],
  ['createHorizontalBarChartOptions', createHorizontalBarChartOptions, { stacked: false, indexAxis: 'y' }],
] as const)('%s', (_name, factory, expected) => {
  it(`uses ${expected.indexAxis}-indexed bars with stacked=${expected.stacked} and propagates tooltip callbacks`, () => {
    const label = (item: TooltipItem<'bar'>) => `${item.parsed.y} interactions`;
    const options = factory({ tooltipLabelCallback: label });

    expect(options.indexAxis).toBe(expected.indexAxis);
    expect([options.scales.x.stacked, options.scales.y.stacked]).toEqual([expected.stacked, expected.stacked]);
    expect(options.plugins.tooltip.callbacks.label).toBe(label);
  });
});

describe('createDualAxisChartOptions', () => {
  it('adds a right-hand y1 axis and configurable extra axes while propagating callbacks', () => {
    const label = (item: TooltipItem<'line' | 'bar'>) => `${item.parsed.y} tokens`;
    const options = createDualAxisChartOptions({
      y1AxisLabel: 'Average',
      stacked: true,
      y1TicksCallback: formatTick,
      tooltipLabelCallback: label,
      extraYAxes: { y2: { display: false, min: 0, max: 100 } },
    });

    expect(options.plugins.tooltip.callbacks.label).toBe(label);
    expect([options.scales.x.stacked, options.scales.y.stacked]).toEqual([true, true]);
    expect(options.scales.y1).toMatchObject({
      position: 'right',
      title: { display: true, text: 'Average' },
      grid: { drawOnChartArea: false },
    });
    expect(options.scales.y1.ticks!.callback).toBe(formatTick);
    expect((options.scales as Record<string, unknown>).y2).toMatchObject({
      display: false,
      position: 'right',
      min: 0,
      max: 100,
    });
  });
});

describe('grid colors', () => {
  it('uses the Primer muted border token for both axes', () => {
    const options = createBaseChartOptions({ showGridX: true });

    expect(options.scales.x.grid.color).toBe('rgba(209, 217, 224, 0.7)');
    expect(options.scales.y.grid.color).toBe('rgba(209, 217, 224, 0.7)');
  });
});

describe('tooltip interaction axis', () => {
  it('hit-tests along the index axis so horizontal bars match the hovered category', () => {
    expect(createBaseChartOptions().interaction.axis).toBe('x');
    expect(createHorizontalBarChartOptions().interaction.axis).toBe('y');
  });
});

describe('createRadarChartOptions', () => {
  it('themes the radial grid and point labels with Primer tokens', () => {
    const label = (item: TooltipItem<'radar'>) => `${item.parsed.r} interactions`;
    const options = createRadarChartOptions({ tooltipLabelCallback: label });

    expect(options.plugins.legend.display).toBe(false);
    expect(options.plugins.tooltip.callbacks.label).toBe(label);
    expect(options.scales.r).toMatchObject({
      beginAtZero: true,
      grid: { color: 'rgba(209, 217, 224, 0.7)' },
      angleLines: { color: 'rgba(209, 217, 224, 0.7)' },
      pointLabels: { color: 'rgb(89, 99, 110)', font: { size: 13, weight: 'bold' } },
    });
  });
});

describe('createDoughnutChartOptions', () => {
  it('defaults to a doughnut with a right-hand canvas legend', () => {
    const options = createDoughnutChartOptions();

    expect(options.cutout).toBe('55%');
    expect(options.plugins.legend).toEqual({ display: true, position: 'right' });
    expect(options.plugins.tooltip.callbacks).toEqual({});
  });

  it('draws a pie without a canvas legend when configured', () => {
    const title = (items: TooltipItem<'doughnut'>[]) => items[0]?.label ?? '';
    const label = (item: TooltipItem<'doughnut'>) => `${item.parsed} interactions`;
    const options = createDoughnutChartOptions({
      cutout: 0,
      showLegend: false,
      tooltipTitleCallback: title,
      tooltipLabelCallback: label,
    });

    expect(options.cutout).toBe(0);
    expect(options.plugins.legend.display).toBe(false);
    expect(options.plugins.tooltip.callbacks).toEqual({ title, label });
  });
});
