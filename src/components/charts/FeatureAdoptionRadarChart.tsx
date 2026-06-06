'use client';

import { Radar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { registerChartJS } from './utils/chartSetup';
import { FEATURE_ADOPTION_RADAR_METADATA } from '../../domain/featureCategories';

registerChartJS();

interface FeatureAdoptionRadarChartProps {
  agentInteractions: number;
  planInteractions: number;
  cliInteractions: number;
  askModeInteractions: number;
  editModeInteractions: number;
  completionInteractions: number;
}

export default function FeatureAdoptionRadarChart({
  agentInteractions,
  planInteractions,
  cliInteractions,
  askModeInteractions,
  editModeInteractions,
  completionInteractions,
}: FeatureAdoptionRadarChartProps) {
  const radarValues = {
    agentInteractions,
    planInteractions,
    cliInteractions,
    askModeInteractions,
    editModeInteractions,
    completionInteractions,
  } as const;

  const radarItems = FEATURE_ADOPTION_RADAR_METADATA.map((item) => ({
    ...item,
    value: radarValues[item.key],
  }));

  const chartData = {
    labels: radarItems.map((item) => item.label),
    datasets: [
      {
        label: 'Interactions',
        data: radarItems.map((item) => item.value),
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
      },
    ],
  };

  const options: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const unit = radarItems[context.dataIndex]?.unit || 'interactions';
            return `${context.label}: ${context.parsed.r.toLocaleString()} ${unit}`;
          },
        },
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          display: true,
          backdropColor: 'transparent',
        },
        pointLabels: {
          font: { size: 13, weight: 'bold' },
          color: '#374151',
        },
        grid: { color: 'rgba(0, 0, 0, 0.08)' },
        angleLines: { color: 'rgba(0, 0, 0, 0.08)' },
      },
    },
  };

  const total = radarItems.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="bg-white rounded-md border border-[#d1d9e0] p-6 h-full flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Adoption</h3>
        <div className="flex-1 flex items-center justify-center text-gray-500">No feature adoption data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md border border-[#d1d9e0] p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Adoption</h3>
      <div className="flex-1 min-h-0">
        <Radar data={chartData} options={options} />
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-4 text-sm text-gray-600">
        {radarItems.map((item) => (
          <span key={item.key}>{item.summaryLabel}: <strong>{item.value.toLocaleString()}</strong></span>
        ))}
      </div>
    </div>
  );
}
