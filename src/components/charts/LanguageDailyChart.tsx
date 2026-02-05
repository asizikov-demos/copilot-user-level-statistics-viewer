'use client';

import { useMemo } from 'react';
import { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createStackedBarChartOptions } from './utils/chartOptions';
import { formatShortDate } from '../../utils/formatters';
import { CopilotMetrics } from '../../types/metrics';
import ChartContainer from '../ui/ChartContainer';

registerChartJS();

interface LanguageDailyChartProps {
  metrics: CopilotMetrics[];
  variant: 'generations' | 'loc';
}

const LANGUAGE_COLORS = [
  'hsl(210, 70%, 55%)',
  'hsl(160, 70%, 45%)',
  'hsl(280, 70%, 55%)',
  'hsl(30, 80%, 55%)',
  'hsl(340, 70%, 55%)',
  'hsl(190, 70%, 50%)',
  'hsl(50, 80%, 50%)',
  'hsl(120, 60%, 45%)',
  'hsl(260, 60%, 60%)',
  'hsl(0, 70%, 55%)',
];

export default function LanguageDailyChart({ metrics, variant }: LanguageDailyChartProps) {
  const isGenerations = variant === 'generations';

  const { labels, datasets, total } = useMemo(() => {
    const daySet = new Set<string>();
    const languageTotals: Record<string, number> = {};
    const map: Record<string, Record<string, number>> = {};

    for (const metric of metrics) {
      const date = metric.day;
      daySet.add(date);
      if (!map[date]) map[date] = {};

      for (const lf of metric.totals_by_language_feature) {
        const language = lf.language;
        const value = isGenerations
          ? lf.code_generation_activity_count
          : lf.loc_added_sum + lf.loc_deleted_sum;

        map[date][language] = (map[date][language] || 0) + value;
        languageTotals[language] = (languageTotals[language] || 0) + value;
      }
    }

    const sortedDates = Array.from(daySet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const sortedLanguages = Object.keys(languageTotals)
      .sort((a, b) => (languageTotals[b] || 0) - (languageTotals[a] || 0))
      .slice(0, 10);

    const datasets = sortedLanguages.map((language, index) => {
      const color = LANGUAGE_COLORS[index % LANGUAGE_COLORS.length];
      return {
        label: language,
        data: sortedDates.map(d => map[d]?.[language] || 0),
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1,
        stack: 'languages',
      };
    });

    const total = sortedLanguages.reduce((sum, lang) => sum + (languageTotals[lang] || 0), 0);

    return {
      labels: sortedDates.map(d => formatShortDate(d)),
      datasets,
      total,
    };
  }, [metrics, isGenerations]);

  const chartData = { labels, datasets };

  const options = createStackedBarChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: isGenerations ? 'Generations' : 'Lines of Code',
    tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
      const value = context.parsed.y || 0;
      const unit = isGenerations ? 'generations' : 'LOC';
      return `${context.dataset.label}: ${value.toLocaleString()} ${unit}`;
    },
    tooltipFooterCallback: (items: TooltipItem<'line' | 'bar'>[]) => {
      if (!items.length) return '';
      const dayTotal = items.reduce((sum, it) => sum + (it.parsed.y || 0), 0);
      return `Total: ${dayTotal.toLocaleString()}`;
    },
  });

  const title = isGenerations
    ? 'Daily Code Generations by Language'
    : 'Daily LOC Impact by Language';

  const description = isGenerations
    ? 'Number of code generations per day, broken down by programming language (top 10)'
    : 'Lines of code impacted (added + deleted) per day, by programming language (top 10)';

  const emptyMessage = isGenerations
    ? 'No generation data available'
    : 'No LOC impact data available';

  return (
    <ChartContainer
      title={title}
      description={description}
      isEmpty={!metrics || metrics.length === 0 || datasets.length === 0}
      emptyState={emptyMessage}
      summaryStats={[
        { value: datasets.length, label: 'Languages', colorClass: 'text-blue-600' },
        {
          value: total.toLocaleString(),
          label: isGenerations ? 'Total Generations' : 'Total LOC',
          colorClass: 'text-green-600',
        },
      ]}
      chartHeight="h-80"
    >
      <Bar data={chartData} options={options} />
    </ChartContainer>
  );
}
