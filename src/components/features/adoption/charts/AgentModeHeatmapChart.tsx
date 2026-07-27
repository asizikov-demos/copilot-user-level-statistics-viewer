'use client';

import { useState } from 'react';
import { TooltipItem } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { registerChartJS } from '../../../charts/utils/chartSetup';
import { createBaseChartOptions, createDualAxisChartOptions } from '../../../charts/utils/chartOptions';
import { formatShortDate } from '../../../../utils/formatters';
import { calculateTotal, calculateAverage, findMaxItem, findMaxValue } from '../../../../domain/calculators/statsCalculators';
import { chartColors } from '../../../charts/utils/chartColors';
import { AgentModeHeatmapData } from '../../../../domain/calculators/metricCalculators';
import ChartContainer from '../../../ui/ChartContainer';
import ChartToggleButtons from '../../../ui/ChartToggleButtons';
import InsightsCard from '../../../ui/InsightsCard';

registerChartJS();

interface AgentModeHeatmapChartProps {
  data: AgentModeHeatmapData[];
}

const CHART_TYPE_OPTIONS = [
  { value: 'heatmap' as const, label: 'Heatmap' },
  { value: 'line' as const, label: 'Line' },
  { value: 'bar' as const, label: 'Bar' },
];

const getIntensityColor = (intensity: number) => {
  const colors = [
    'rgb(243, 244, 246)',
    'rgb(254, 202, 202)',
    'rgb(252, 165, 165)',
    'rgb(248, 113, 113)',
    chartColors.red.solid,
    'rgb(220, 38, 38)'
  ];
  return colors[Math.min(intensity, 5)];
};

export default function AgentModeHeatmapChart({ data }: AgentModeHeatmapChartProps) {
  const [chartType, setChartType] = useState<'heatmap' | 'line' | 'bar'>('heatmap');

  const totalRequests = calculateTotal(data, d => d.agentModeRequests);
  const peakDay = findMaxItem(data, d => d.agentModeRequests) ?? { agentModeRequests: 0, date: '' };
  const avgRequestsPerDay = calculateAverage(data, d => d.agentModeRequests);
  const totalUserDays = calculateTotal(data, d => d.uniqueUsers);
  const maxIntensity = findMaxValue(data, d => d.intensity);

  const chartData = chartType === 'heatmap' ? {
    labels: data.map(d => formatShortDate(d.date)),
    datasets: [{
      label: 'Agent Mode Requests',
      data: data.map(d => d.agentModeRequests),
      backgroundColor: data.map(d => getIntensityColor(d.intensity)),
      borderColor: chartColors.red.solid,
      borderWidth: 1
    }]
  } : {
    labels: data.map(d => formatShortDate(d.date)),
    datasets: [
      {
        label: 'Agent Mode Requests',
        data: data.map(d => d.agentModeRequests),
        backgroundColor: chartColors.red.alpha60,
        borderColor: chartColors.red.solid,
        borderWidth: 2,
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: 'Unique Users',
        data: data.map(d => d.uniqueUsers),
        backgroundColor: chartColors.blue.alpha60,
        borderColor: chartColors.blue.solid,
        borderWidth: 2,
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  };

  const tooltipAfterBody = (context: TooltipItem<'bar' | 'line'>[]) => {
    const dataIndex = context[0].dataIndex;
    const dayData = data[dataIndex];
    return ['', `Unique Users: ${dayData.uniqueUsers}`, `Intensity Level: ${dayData.intensity}/5`];
  };

  const baseHeatmapOptions = createBaseChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Agent Mode Requests',
    tooltipAfterBodyCallback: tooltipAfterBody,
  });

  const dualAxisOptions = createDualAxisChartOptions({
    xAxisLabel: 'Date',
    yAxisLabel: 'Agent Mode Requests',
    y1AxisLabel: 'Unique Users',
    tooltipAfterBodyCallback: tooltipAfterBody,
  });

  const options = chartType === 'heatmap' ? {
    ...baseHeatmapOptions,
    plugins: {
      ...baseHeatmapOptions.plugins,
      title: { display: true, text: 'Agent Mode Usage Intensity' },
    },
  } : {
    ...dualAxisOptions,
    plugins: {
      ...dualAxisOptions.plugins,
      title: { display: true, text: 'Agent Mode Usage Intensity' },
    },
  };

  const renderChart = () => {
    if (chartType === 'line') return <Line data={chartData} options={options} />;
    return <Bar data={chartData} options={options} />;
  };

  return (
    <ChartContainer
      title="Agent Mode Usage Heatmap"
      isEmpty={!data || data.length === 0}
      emptyState="No Agent Mode usage data available"
      headerActions={
        <ChartToggleButtons options={CHART_TYPE_OPTIONS} value={chartType} onChange={setChartType} />
      }
      summaryStats={[
        { value: totalRequests, label: 'Total Requests', sublabel: `${avgRequestsPerDay}/day avg`, colorClass: 'text-red-600' },
        { value: totalUserDays, label: 'User-Days', sublabel: 'Total user sessions', colorClass: 'text-blue-600' },
        { value: peakDay.agentModeRequests, label: 'Peak Day', sublabel: peakDay.date ? formatShortDate(peakDay.date) : 'N/A', colorClass: 'text-green-600' },
        { value: maxIntensity, label: 'Max Intensity', sublabel: 'Scale 1-5', colorClass: 'text-orange-600' },
      ]}
      chartHeight="h-96"
      footer={
        <>
          {chartType === 'heatmap' && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Intensity Scale:</h4>
              <div className="flex items-center gap-2 text-xs">
                {[0, 1, 2, 3, 4, 5].map(level => (
                  <div key={level} className="flex items-center gap-1">
                    <div 
                      className="w-4 h-4 border border-gray-300 rounded"
                      style={{ backgroundColor: getIntensityColor(level) }}
                    />
                    <span className="text-gray-600">{level}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <InsightsCard title="Agent Mode Insights" variant="red">
            <p>
              Agent Mode is an advanced feature that creates autonomous coding sessions.
              {totalRequests > 100 ? ' High usage indicates strong adoption of advanced AI features.' : ' Consider promoting Agent Mode for complex coding tasks.'}
            </p>
          </InsightsCard>
        </>
      }
    >
      {renderChart()}
    </ChartContainer>
  );
}
