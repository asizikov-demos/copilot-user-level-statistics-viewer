---
applyTo: "src/components/charts/**"
---

# Chart Component Conventions

## Chart.js Registration

Call `registerChartJS()` from `./utils/chartSetup` at **module scope** (top of file, before the component). Never use direct `ChartJS.register(...)` calls.

## Date Ranges

When `reportStartDay` / `reportEndDay` props are available, time-series charts should prefer to show the **full report date range**, filling inactive days with zeros as appropriate. Accept these as string props when the chart uses them.

When you do zero-fill for display, do **not** let padded zeros dilute aggregate statistics. Compute averages and percentages from actual-activity-days only, then fill the display series separately.

## Chart Type Selection

Choose chart type based on data semantics:

- **Stacked bars** — only for additive parts-of-a-whole (e.g., prompt + output tokens = total tokens)
- **Grouped bars** — for comparing independent metrics side-by-side (e.g., sessions vs requests vs prompts)
- **Line overlay on bars** — for cumulative or trend data alongside daily values
- When data represents the same concept (e.g., CLI users are active users), merge into the existing series rather than adding a separate line

## Chart Options

Use the factory functions from `./utils/chartOptions`:

- `createBaseChartOptions(config)` — standard single-axis charts
- `createStackedBarChartOptions(config)` — stacked bars
- `createHorizontalBarChartOptions(config)` — horizontal bars
- `createDualAxisChartOptions(config)` — left/right dual axes

Use `yAxisFormatters` (`.percentage`, `.integer`, `.localeNumber`) for axis tick formatting.

## Dataset Creation

Use helpers from `./utils/chartStyles`:

- `createBarDataset(color, label, data, options)`
- `createLineDataset(color, label, data, options)`
- `createFilledLineDataset(color, label, data, options)`

Colors come from `chartColors` in `./utils/chartColors` — use the `.solid`, `.alpha`, `.alpha60` variants.

## Container Pattern

Wrap every chart in `ChartContainer` from `../ui/ChartContainer`:

- `title` and optional `description` for the header
- `stats` for right-aligned header metrics
- `summaryStats` for large centered metric tiles
- `footer` for insight tiles (see below)
- `chartHeight` defaults to `h-80`

## Insight Tiles

Place `InsightsCard` components exclusively in the `footer` prop of `ChartContainer`. The insight must semantically relate to the chart it's placed in. Wrap multiple insights in a `<div className="space-y-4">`.
