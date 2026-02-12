'use client';

import { useMemo } from 'react';
import { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createStackedBarChartOptions } from './utils/chartOptions';
import { formatShortDate } from '../../utils/formatters';
import type { ModelDailyUsageEntry } from '../../types/metrics';
import ChartContainer from '../ui/ChartContainer';
import InsightsCard from '../ui/InsightsCard';

registerChartJS();

interface ModelsUsageChartProps {
  modelEntries: ModelDailyUsageEntry[];
  dates: string[];
  totalInteractions: number;
  variant: 'standard' | 'premium';
}

export default function ModelsUsageChart({ modelEntries, dates, totalInteractions, variant }: ModelsUsageChartProps) {
  const isPremium = variant === 'premium';

  const { labels, datasets, modelTotals, modelOrder } = useMemo(() => {
    const sortedModels = [...modelEntries].sort((a, b) => b.total - a.total);
    const modelOrder = sortedModels.map(e => e.model);
    const modelTotals: Record<string, number> = {};
    for (const entry of sortedModels) {
      modelTotals[entry.model] = entry.total;
    }

    const UNKNOWN_COLOR = 'hsl(0, 70%, 50%)';
    const modelsWithoutUnknown = modelOrder.filter(m => m !== 'unknown');
    const modelIndexMap = new Map(modelsWithoutUnknown.map((m, i) => [m, i]));

    const getModelColor = (model: string): string => {
      if (model === 'unknown') {
        return UNKNOWN_COLOR;
      }
      const adjustedIndex = modelIndexMap.get(model) ?? 0;
      const hueStep = isPremium ? 45 : 55;
      const startHue = 30;
      const hue = (startHue + adjustedIndex * hueStep) % 360;
      if (hue >= 350 || hue <= 10) {
        return `hsl(${(hue + 50) % 360}, 70%, 55%)`;
      }
      return `hsl(${hue}, 70%, 55%)`;
    };

    const datasets = sortedModels.map((entry) => {
      const color = getModelColor(entry.model);
      return {
        label: entry.model,
        data: dates.map(d => entry.dailyData[d] || 0),
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1,
        stack: isPremium ? 'premium-models' : 'standard-models'
      };
    });

    return {
      labels: dates.map(d => formatShortDate(d)),
      datasets,
      modelTotals,
      modelOrder
    };
  }, [modelEntries, dates, isPremium]);

  const insights = useMemo(() => {
    if (!totalInteractions || !modelOrder.length) return null;

    const shares = modelOrder.map(m => ({
      model: m,
      count: modelTotals[m] || 0,
      share: (modelTotals[m] || 0) / totalInteractions
    }));

    const top = shares[0];
    const second = shares[1];
    const dominantThreshold = 0.5;
    const strongDominanceThreshold = 0.7;

    let insightVariant: 'green' | 'blue' | 'red' | 'orange' | 'purple';
    const paragraphs: string[] = [];
    const title = `${isPremium ? 'Premium' : 'Standard'} Model Usage Insights`;
    let showDocLink = false;

    if (top.share >= strongDominanceThreshold) {
      insightVariant = 'red';
      paragraphs.push(
        `One model (${top.model}) accounts for ${(top.share * 100).toFixed(1)}% of all interactions, indicating a heavy concentration. This may suggest teams are defaulting to a single model and could benefit from deeper awareness of alternatives.`
      );
      showDocLink = true;
    } else if (top.share >= dominantThreshold) {
      insightVariant = 'orange';
      paragraphs.push(
        `A single model (${top.model}) holds ${(top.share * 100).toFixed(1)}% share. A moderate skew like this can mean users are comfortable with that model but may be overlooking scenarios where other models perform better.`
      );
      showDocLink = true;
    } else {
      const cumulativeTop3 = shares.slice(0, 3).reduce((s, x) => s + x.share, 0);
      if (top.share < 0.4 && shares.length >= 3 && cumulativeTop3 <= 0.8) {
        insightVariant = 'green';
        paragraphs.push(
          `Usage is well distributed. The leading model (${top.model}) is at ${(top.share * 100).toFixed(1)}% with good variability across ${shares.length} models, suggesting teams select models based on their strengths.`
        );
      } else {
        insightVariant = 'blue';
        paragraphs.push(
          `Distribution is moderately diversified. The top model (${top.model}) sits at ${(top.share * 100).toFixed(1)}%${second ? ` and the second at ${(second.share * 100).toFixed(1)}%` : ''}. Continued experimentation could further optimize fit for specific tasks.`
        );
        showDocLink = true;
      }
    }

    const summary = shares.slice(0, 5).map(s => `${s.model}: ${(s.share * 100).toFixed(1)}%`).join(', ');
    paragraphs.push(`Top model share summary: ${summary}${shares.length > 5 ? ', ...' : ''}.`);

    return { title, variant: insightVariant, paragraphs, showDocLink };
  }, [modelTotals, modelOrder, totalInteractions, isPremium]);

  const chartData = { labels, datasets };

  const options = createStackedBarChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Interactions',
    tooltipLabelCallback: (context: TooltipItem<'line' | 'bar'>) => {
      const value = context.parsed.y || 0;
      return `${context.dataset.label}: ${value} interactions`;
    },
    tooltipFooterCallback: (items: TooltipItem<'line' | 'bar'>[]) => {
      if (!items.length) return '';
      const dayTotal = items.reduce((sum, it) => sum + (it.parsed.y || 0), 0);
      return `Total: ${dayTotal}`;
    },
  });

  return (
    <ChartContainer
      title={`${isPremium ? 'Premium' : 'Standard'} Models Daily Usage`}
      isEmpty={dates.length === 0 || datasets.length === 0}
      emptyState={`No ${isPremium ? 'premium' : 'standard'} model usage data available`}
      summaryStats={[
        { value: datasets.length, label: 'Models', colorClass: isPremium ? 'text-purple-600' : 'text-blue-600' },
        { value: totalInteractions, label: 'Total Interactions', colorClass: isPremium ? 'text-red-600' : 'text-green-600' },
      ]}
      chartHeight="h-96"
      footer={
        <>
          <p className="text-xs text-gray-600 mb-4">
            Counts aggregate user initiated interactions across all features per {isPremium ? 'premium' : 'standard'} model per day.
          </p>
          {insights && (
            <InsightsCard title={insights.title} variant={insights.variant}>
              {insights.paragraphs.map((p, i) => (
                <p key={i} className={i > 0 ? 'mt-2' : ''}>{p}</p>
              ))}
              {insights.showDocLink && (
                <p className="mt-3">
                  Learn more in the{' '}
                  <a
                    href="https://docs.github.com/en/copilot/reference/ai-models/model-comparison"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    model comparison guide
                  </a>
                  .
                </p>
              )}
            </InsightsCard>
          )}
        </>
      }
    >
      <Bar data={chartData} options={options} />
    </ChartContainer>
  );
}
