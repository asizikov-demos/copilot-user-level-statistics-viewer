'use client';

import { useState } from 'react';
import { TooltipItem } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { registerChartJS } from './utils/chartSetup';
import { createDualAxisChartOptions } from './utils/chartOptions';
import { formatShortDate } from '../../utils/formatters';
import { calculateTotal, calculatePercentage, findMaxItem } from '../../domain/calculators/statsCalculators';
import { chartColors } from './utils/chartColors';
import { DailyPRUAnalysisData } from '../../domain/calculators/metricCalculators';
import ChartContainer from '../ui/ChartContainer';
import ChartToggleButtons from '../ui/ChartToggleButtons';
import InsightsCard from '../ui/InsightsCard';

registerChartJS();

interface PRUCostAnalysisChartProps {
  data: DailyPRUAnalysisData[];
}

const VIEW_TYPE_OPTIONS = [
  { value: 'cost' as const, label: 'Service Value' },
  { value: 'percentage' as const, label: 'Usage %' },
  { value: 'models' as const, label: 'Models' },
];

export default function PRUCostAnalysisChart({ data }: PRUCostAnalysisChartProps) {
  const [viewType, setViewType] = useState<'cost' | 'percentage' | 'models'>('cost');

  const totalPRUs = calculateTotal(data, d => d.totalPRUs);
  const totalCost = calculateTotal(data, d => d.serviceValue);
  const totalPRURequests = calculateTotal(data, d => d.pruRequests);
  const totalStandardRequests = calculateTotal(data, d => d.standardRequests);
  const totalRequests = totalPRURequests + totalStandardRequests;
  const overallPRUPercentage = calculatePercentage(totalPRURequests, totalRequests);

  const maxCostDay = findMaxItem(data, d => d.serviceValue) ?? { serviceValue: 0, date: '' };

  const premiumModelAggregate = data.reduce((acc, day) => {
    for (const m of day.models) {
      if (!m.isPremium || m.name === 'unknown') continue;
      const existing = acc.get(m.name) || { prus: 0, requests: 0 };
      existing.prus += m.prus;
      existing.requests += m.requests;
      acc.set(m.name, existing);
    }
    return acc;
  }, new Map<string, { prus: number; requests: number }>());

  const sortedPremiumModels = Array.from(premiumModelAggregate.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => (b.prus - a.prus) || (b.requests - a.requests));

  const topModels = sortedPremiumModels.map(m => m.name);

  const getChartData = () => {
    switch (viewType) {
      case 'cost':
        return {
          labels: data.map(d => formatShortDate(d.date)),
          datasets: [
            {
              type: 'bar' as const,
              label: 'PRU Requests',
              data: data.map(d => d.pruRequests),
              backgroundColor: chartColors.red.alpha60,
              borderColor: chartColors.red.solid,
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              type: 'line' as const,
              label: 'Service Value ($)',
              data: data.map(d => d.serviceValue),
              backgroundColor: chartColors.purple.alpha,
              borderColor: chartColors.purple.solid,
              borderWidth: 3,
              fill: false,
              tension: 0.4,
              yAxisID: 'y1'
            }
          ]
        };
      case 'percentage':
        return {
          labels: data.map(d => formatShortDate(d.date)),
          datasets: [
            {
              type: 'bar' as const,
              label: 'PRU Requests',
              data: data.map(d => d.pruRequests),
              backgroundColor: chartColors.red.alpha60,
              borderColor: chartColors.red.solid,
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              type: 'bar' as const,
              label: 'Standard Requests',
              data: data.map(d => d.standardRequests),
              backgroundColor: chartColors.green.alpha60,
              borderColor: chartColors.green.solid,
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              type: 'line' as const,
              label: 'PRU Percentage (%)',
              data: data.map(d => d.pruPercentage),
              backgroundColor: chartColors.blue.alpha,
              borderColor: chartColors.blue.solid,
              borderWidth: 3,
              fill: false,
              tension: 0.4,
              yAxisID: 'y1'
            }
          ]
        };
      case 'models':
        return {
          labels: data.map(d => formatShortDate(d.date)),
          datasets: [
            {
              type: 'bar' as const,
              label: 'Total PRUs',
              data: data.map(d => d.totalPRUs),
              backgroundColor: chartColors.violet.alpha60,
              borderColor: chartColors.violet.solid,
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              type: 'line' as const,
              label: 'Top Model PRUs',
              data: data.map(d => d.topModelPRUs),
              backgroundColor: chartColors.amber.alpha,
              borderColor: chartColors.amber.solid,
              borderWidth: 3,
              fill: false,
              tension: 0.4,
              yAxisID: 'y'
            }
          ]
        };
      default:
        return { labels: [], datasets: [] };
    }
  };

  const chartData = getChartData();

  const options = {
    ...createDualAxisChartOptions({
      xAxisLabel: 'Date',
      yAxisLabel: viewType === 'cost' ? 'Number of Requests' : viewType === 'percentage' ? 'Number of Requests' : 'PRUs',
      y1AxisLabel: viewType === 'cost' ? 'Service Value ($)' : viewType === 'percentage' ? 'Percentage (%)' : 'PRUs',
      y1Max: viewType === 'percentage' ? 100 : undefined,
      tooltipAfterBodyCallback: (context: TooltipItem<'line' | 'bar'>[]) => {
        const dataIndex = context[0].dataIndex;
        const dayData = data[dataIndex];
        return [
          '',
          `PRU Requests: ${dayData.pruRequests}`,
          `Standard Requests: ${dayData.standardRequests}`,
          `PRU Percentage: ${dayData.pruPercentage}%`,
          `Total PRUs: ${dayData.totalPRUs}`,
          `Service Value: $${dayData.serviceValue}`,
          `Top Model: ${dayData.topModel}`,
          `Top Model PRUs: ${dayData.topModelPRUs}`
        ];
      },
    }),
    plugins: {
      title: { display: true, text: `PRU ${viewType === 'cost' ? 'Service Value' : viewType === 'percentage' ? 'Usage' : 'Model'} Analysis` },
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          afterBody: (context: TooltipItem<'line' | 'bar'>[]) => {
            const dataIndex = context[0].dataIndex;
            const dayData = data[dataIndex];
            return [
              '',
              `PRU Requests: ${dayData.pruRequests}`,
              `Standard Requests: ${dayData.standardRequests}`,
              `PRU Percentage: ${dayData.pruPercentage}%`,
              `Total PRUs: ${dayData.totalPRUs}`,
              `Service Value: $${dayData.serviceValue}`,
              `Top Model: ${dayData.topModel}`,
              `Top Model PRUs: ${dayData.topModelPRUs}`
            ];
          }
        }
      }
    },
  };

  return (
    <ChartContainer
      title="PRU Service Value Analysis"
      isEmpty={!data || data.length === 0}
      emptyState="No PRU service value data available"
      headerActions={
        <ChartToggleButtons options={VIEW_TYPE_OPTIONS} value={viewType} onChange={setViewType} />
      }
      summaryStats={[
        { value: Math.round(totalPRUs * 100) / 100, label: 'Total PRUs', sublabel: `${data.length > 0 ? Math.round((totalPRUs / data.length) * 100) / 100 : 0}/day avg`, colorClass: 'text-purple-600' },
        { value: `$${Math.round(totalCost * 100) / 100}`, label: 'Service Value', sublabel: `$${data.length > 0 ? Math.round((totalCost / data.length) * 100) / 100 : 0}/day avg`, colorClass: 'text-green-600' },
        { value: `${overallPRUPercentage}%`, label: 'Avg PRU Usage', sublabel: `${totalPRURequests}/${totalRequests} requests`, colorClass: 'text-red-600' },
        { value: `$${Math.round(maxCostDay.serviceValue * 100) / 100}`, label: 'Peak Service Value Day', sublabel: maxCostDay.date ? formatShortDate(maxCostDay.date) : 'N/A', colorClass: 'text-orange-600' },
        { value: topModels.length, label: 'Premium Models', sublabel: 'Used in period', colorClass: 'text-blue-600' },
      ]}
      chartHeight="h-96"
      footer={
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <InsightsCard title="Model Insights" variant="blue">
            <p>
              Top premium models used: {topModels.length > 0 ? topModels.slice(0, 3).join(', ') : 'None'}
              {topModels.length > 3 && ` +${topModels.length - 3} more`}
            </p>
          </InsightsCard>
        </div>
      }
    >
      <Chart type="bar" data={chartData} options={options} />
    </ChartContainer>
  );
}
