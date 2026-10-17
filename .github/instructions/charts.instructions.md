---
applyTo: "src/components/charts/**"
---

# Chart Component Conventions

## Chart.js Registration

Call `registerChartJS()` from `./utils/chartSetup` at **module scope** (top of file, before the component). Never use direct `ChartJS.register(...)` calls. Registration also applies Primer's font stack, muted text color, and muted border color to Chart.js defaults; do not override fonts or tick/legend colors per chart.

## Date Ranges

When `reportStartDay` / `reportEndDay` props are available, time-series charts should prefer to show the **full report date range**, filling inactive days with zeros as appropriate. Accept these as string props when the chart uses them.

When you do zero-fill for display, do **not** let padded zeros dilute aggregate statistics. Compute averages and percentages from actual-activity-days only, then fill the display series separately.

## Chart Type Selection

Choose chart type based on data semantics:

- **Stacked bars** — only for additive parts-of-a-whole (e.g., prompt + output tokens = total tokens)
- **Grouped bars** — for comparing independent metrics side-by-side (e.g., sessions vs requests vs prompts)
- **Line overlay on bars** — for cumulative or trend data alongside daily values
- When data represents the same concept (e.g., CLI users are active users), merge into the existing series rather than adding a separate line
- **Horizontal bars** — for per-category comparisons and rankings; use `createHorizontalBarChartOptions`
- **Pie and doughnut** — documented exceptions to Primer's bar, line, and area guidance, used only for a single total's part-to-whole breakdown. Render them with `CompositionChart` from `./CompositionChart`, which draws at most five slices (the top four plus an expandable gray "Other") and lists each value and share in an HTML legend. Use `variant="pie"` for compact tiles and `variant="doughnut"` for standalone cards. When entries overlap (for example, users counted under several clients), their sum double-counts: say so in the description and pass `showTotal={false}`
- **Radar** — reserved for the existing user feature adoption profile; do not add new radar or polar area charts
- Documented exceptions to Primer chart guidance: Feature Adoption radar, day Clients doughnut, the three User Summary pies, and the organization Client Distribution donut. Do not add others.

## Chart Options

Use the factory functions from `./utils/chartOptions`:

- `createBaseChartOptions(config)` — standard single-axis bar charts
- `createBaseChartOptions<'line'>(config)` — standard single-axis line charts
- `createStackedBarChartOptions(config)` — stacked bars
- `createHorizontalBarChartOptions(config)` — horizontal bars
- `createDualAxisChartOptions(config)` — left/right dual axes

Use `yAxisFormatters` (`.percentage`, `.integer`, `.localeNumber`) for axis tick formatting.

Tooltip callbacks must use the chart's specific type (`TooltipItem<'bar'>` or
`TooltipItem<'line'>`). Reserve `TooltipItem<'line' | 'bar'>` for mixed charts
using `createDualAxisChartOptions`. Do not cast factory results to `ChartOptions`
to bypass type mismatches.

## Dataset Creation

Use helpers from `./utils/chartStyles`:

- `createBarDataset(color, label, data, options)`
- `createLineDataset(color, label, data, options)`
- `createFilledLineDataset(color, label, data, options)`

## Colors and Tokens

Colors come from `chartColors` in `./utils/chartColors` — use the `.solid`, `.alpha`, `.alpha60`, and `.muted` variants. Each named color resolves a Primer data-visualization token (`--data-<hue>-color-emphasis` / `-muted`) at access time through `./utils/chartTheme`, with a static light-theme fallback for prerendering and tests. Read colors inside render or memoized builders rather than capturing them in module-level constants.

- Never add Tailwind RGB, hex, or HSL literals for chart series; use `chartColors`, the semantic maps (`featureColors`, `chatModeColors`, `modelCategoryColors`, `modelVendorColors`), or `getSequentialColor(index)` for dynamic categories. Gray is reserved for unknown/other series.
- IDE and language brand colors (`ideColors`, `getIdeColor`, `languageColors`) are the only explicit exceptions.
- Use `withAlpha(color, alpha)` from `./utils/chartTheme` for custom opacity instead of string replacement.
- Grid, tick, and legend colors come from `resolveChartTheme()`; chart options factories already apply them.
- Ordered three-step blue categories need `resolveChartTheme().sequentialBlue` (Primer `--display-blue-scale-1/4/9`) because data-viz tokens only provide two steps per hue.
- ESLint rejects Tailwind palette utilities (`bg-blue-500`) and arbitrary hex classes (`bg-[#fff]`) in chart components; legends must use Primer tokens.
- When chart series colors must match HTML legends, use the same Primer token in an arbitrary Tailwind value, for example `bg-[var(--data-blue-color-emphasis)]`.

## Container Pattern

Wrap every chart in `ChartContainer` from `../ui/ChartContainer`:

- `title` and optional `description` for the header
- `stats` for right-aligned header metrics
- `summaryStats` for large centered metric tiles
- `footer` for insight tiles (see below)
- `chartHeight` defaults to `h-80`

## Insight Tiles

Place `InsightsCard` components exclusively in the `footer` prop of `ChartContainer`. The insight must semantically relate to the chart it's placed in. Wrap multiple insights in a `<div className="space-y-4">`.
