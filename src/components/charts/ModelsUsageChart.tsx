'use client';

import { useMemo } from 'react';
import { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { registerChartJS } from '../../utils/chartSetup';
import { createStackedBarChartOptions } from '../../utils/chartOptions';
import { formatShortDate } from '../../utils/formatters';
import { CopilotMetrics } from '../../types/metrics';
import { KNOWN_MODELS } from '../../domain/modelConfig';
import ChartContainer from '../ui/ChartContainer';
import InsightsCard from '../ui/InsightsCard';

registerChartJS();

interface ModelsUsageChartProps {
  metrics: CopilotMetrics[];
  variant: 'standard' | 'premium';
}

export default function ModelsUsageChart({ metrics, variant }: ModelsUsageChartProps) {
  const isPremium = variant === 'premium';

  const modelNames = useMemo(
    () => KNOWN_MODELS.filter(m => m.isPremium === isPremium).map(m => m.name.toLowerCase()),
    [isPremium]
  );

  const { labels, datasets, totalInteractions, modelTotals, modelOrder } = useMemo(() => {
    const daySet = new Set<string>();
    const modelTotals: Record<string, number> = {};
    const map: Record<string, Record<string, number>> = {};

    for (const metric of metrics) {
      const date = metric.day;
      daySet.add(date);
      if (!map[date]) map[date] = {};

      for (const mf of metric.totals_by_model_feature) {
        const model = mf.model.toLowerCase();
        if (!modelNames.includes(model)) continue;
        const count = mf.user_initiated_interaction_count;
        map[date][model] = (map[date][model] || 0) + count;
        modelTotals[model] = (modelTotals[model] || 0) + count;
      }
    }

    const sortedDates = Array.from(daySet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const sortedModels = Object.keys(modelTotals).sort((a, b) => (modelTotals[b] || 0) - (modelTotals[a] || 0));

    const colors = sortedModels.map((_, i) => `hsl(${(i * (isPremium ? 45 : 55)) % 360},70%,55%)`);

    const datasets = sortedModels.map((model, idx) => ({
      label: model,
      data: sortedDates.map(d => map[d]?.[model] || 0),
      backgroundColor: colors[idx],
      borderColor: colors[idx],
      borderWidth: 1,
      stack: isPremium ? 'premium-models' : 'standard-models'
    }));

    const totalInteractions = sortedModels.reduce((sum, m) => sum + (modelTotals[m] || 0), 0);

    return {
      labels: sortedDates.map(d => formatShortDate(d)),
      datasets,
      totalInteractions,
      modelTotals,
      modelOrder: sortedModels
    };
  }, [metrics, modelNames, isPremium]);

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
      isEmpty={!metrics || metrics.length === 0 || datasets.length === 0}
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
