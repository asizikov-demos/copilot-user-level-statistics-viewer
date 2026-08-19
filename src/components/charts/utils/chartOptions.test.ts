import { describe, expect, it } from 'vitest';
import { createDualAxisChartOptions } from './chartOptions';

describe('createDualAxisChartOptions', () => {
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
