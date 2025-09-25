'use client';

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { CopilotMetrics } from '../../types/metrics';
import { KNOWN_MODELS } from '../../domain/modelConfig';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface PremiumModelsUsageChartProps {
  metrics: CopilotMetrics[];
}

/**
 * Stacked bar chart showing daily interactions per premium (PRU) model.
 * Aggregates user_initiated_interaction_count across all features for each model and day.
 */
export default function PremiumModelsUsageChart({ metrics }: PremiumModelsUsageChartProps) {
  const premiumModelNames = useMemo(() => KNOWN_MODELS.filter(m => m.isPremium).map(m => m.name.toLowerCase()), []);

  const { labels, datasets, totalInteractions } = useMemo(() => {
    const daySet = new Set<string>();
    const modelTotals: Record<string, number> = {};
    const map: Record<string, Record<string, number>> = {};

    for (const metric of metrics) {
      const date = metric.day;
      daySet.add(date);
      if (!map[date]) map[date] = {};

      for (const mf of metric.totals_by_model_feature) {
        const model = mf.model.toLowerCase();
        if (!premiumModelNames.includes(model)) continue;
        const count = mf.user_initiated_interaction_count;
        map[date][model] = (map[date][model] || 0) + count;
        modelTotals[model] = (modelTotals[model] || 0) + count;
      }
    }

    const sortedDates = Array.from(daySet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const sortedModels = Object.keys(modelTotals).sort((a, b) => (modelTotals[b] || 0) - (modelTotals[a] || 0));

    const colors = sortedModels.map((_, i) => `hsl(${(i * 45) % 360},65%,55%)`);

    const datasets = sortedModels.map((model, idx) => ({
      label: model,
      data: sortedDates.map(d => map[d]?.[model] || 0),
      backgroundColor: colors[idx],
      borderColor: colors[idx],
      borderWidth: 1,
      stack: 'premium-models'
    }));

    const totalInteractions = sortedModels.reduce((sum, m) => sum + (modelTotals[m] || 0), 0);

    return {
      labels: sortedDates.map(d => new Date(d).toLocaleDateString()),
      datasets,
      totalInteractions
    };
  }, [metrics, premiumModelNames]);

  if (!metrics || metrics.length === 0 || datasets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Premium Models Daily Usage</h3>
        <div className="text-center text-gray-500 py-8">No premium model usage data available</div>
      </div>
    );
  }

  const chartData = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'bar'>) {
            const value = context.parsed.y || 0;
            return `${context.dataset.label}: ${value} interactions`;
          },
          footer: function(items: TooltipItem<'bar'>[]) {
            if (!items.length) return '';
            const dayTotal = items.reduce((sum, it) => sum + (it.parsed.y || 0), 0);
            return `Total: ${dayTotal}`;
          }
        }
      }
    },
    scales: {
      x: { stacked: true, title: { display: true, text: 'Date' } },
      y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Interactions' } }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Premium Models Daily Usage</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{datasets.length}</div>
          <div className="text-sm text-gray-600">Models</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{totalInteractions}</div>
          <div className="text-sm text-gray-600">Total Interactions</div>
        </div>
        <div className="text-center col-span-2 md:col-span-2">
          <p className="text-xs text-gray-600 mt-2">Counts aggregate user initiated interactions across all features per premium model per day.</p>
        </div>
      </div>
      <div className="h-96">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
