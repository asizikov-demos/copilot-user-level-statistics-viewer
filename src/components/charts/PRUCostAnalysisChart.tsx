'use client';

import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { DailyPRUAnalysisData } from '../../utils/metricCalculators';
import InsightsCard from '../ui/InsightsCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PRUCostAnalysisChartProps {
  data: DailyPRUAnalysisData[];
}

export default function PRUCostAnalysisChart({ data }: PRUCostAnalysisChartProps) {
  const [viewType, setViewType] = useState<'cost' | 'percentage' | 'models'>('cost');

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">PRU Service Value Analysis</h3>
        <div className="text-center text-gray-500 py-8">
          No PRU service value data available
        </div>
      </div>
    );
  }

  // Calculate summary statistics
  const totalPRUs = data.reduce((sum, d) => sum + d.totalPRUs, 0);
  const totalCost = data.reduce((sum, d) => sum + d.serviceValue, 0);
  const totalPRURequests = data.reduce((sum, d) => sum + d.pruRequests, 0);
  const totalStandardRequests = data.reduce((sum, d) => sum + d.standardRequests, 0);
  const totalRequests = totalPRURequests + totalStandardRequests;
  const avgPRUPercentage = data.length > 0 ? data.reduce((sum, d) => sum + d.pruPercentage, 0) / data.length : 0;

  // Find most expensive day
  const maxCostDay = data.reduce((max, d) => d.serviceValue > max.serviceValue ? d : max, data[0]);

  // Aggregate premium models across the entire period using expanded daily models list
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
          labels: data.map(d => new Date(d.date).toLocaleDateString()),
          datasets: [
            {
              type: 'bar' as const,
              label: 'PRU Requests',
              data: data.map(d => d.pruRequests),
              backgroundColor: 'rgba(239, 68, 68, 0.6)',
              borderColor: 'rgb(239, 68, 68)',
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              type: 'line' as const,
              label: 'Service Value ($)',
              data: data.map(d => d.serviceValue),
              backgroundColor: 'rgba(147, 51, 234, 0.2)',
              borderColor: 'rgb(147, 51, 234)',
              borderWidth: 3,
              fill: false,
              tension: 0.4,
              yAxisID: 'y1'
            }
          ]
        };
      case 'percentage':
        return {
          labels: data.map(d => new Date(d.date).toLocaleDateString()),
          datasets: [
            {
              type: 'bar' as const,
              label: 'PRU Requests',
              data: data.map(d => d.pruRequests),
              backgroundColor: 'rgba(239, 68, 68, 0.6)',
              borderColor: 'rgb(239, 68, 68)',
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              type: 'bar' as const,
              label: 'Standard Requests',
              data: data.map(d => d.standardRequests),
              backgroundColor: 'rgba(34, 197, 94, 0.6)',
              borderColor: 'rgb(34, 197, 94)',
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              type: 'line' as const,
              label: 'PRU Percentage (%)',
              data: data.map(d => d.pruPercentage),
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 3,
              fill: false,
              tension: 0.4,
              yAxisID: 'y1'
            }
          ]
        };
      case 'models':
        return {
          labels: data.map(d => new Date(d.date).toLocaleDateString()),
          datasets: [
            {
              type: 'bar' as const,
              label: 'Total PRUs',
              data: data.map(d => d.totalPRUs),
              backgroundColor: 'rgba(168, 85, 247, 0.6)',
              borderColor: 'rgb(168, 85, 247)',
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              type: 'line' as const,
              label: 'Top Model PRUs',
              data: data.map(d => d.topModelPRUs),
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              borderColor: 'rgb(245, 158, 11)',
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
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: viewType === 'cost' ? 'Number of Requests' : 
                viewType === 'percentage' ? 'Number of Requests' : 'PRUs'
        },
        beginAtZero: true
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
      text: viewType === 'cost' ? 'Service Value ($)' : 
                viewType === 'percentage' ? 'Percentage (%)' : 'PRUs'
        },
        beginAtZero: true,
        max: viewType === 'percentage' ? 100 : undefined,
        grid: {
          drawOnChartArea: false,
        },
      }
    },
    plugins: {
      title: {
        display: true,
  text: `PRU ${viewType === 'cost' ? 'Service Value' : viewType === 'percentage' ? 'Usage' : 'Model'} Analysis`
      },
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          afterBody: function(context: TooltipItem<'bar' | 'line'>[]) {
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
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">PRU Service Value Analysis</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewType('cost')}
            className={`px-3 py-1 text-sm rounded ${
              viewType === 'cost' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Service Value
          </button>
          <button
            onClick={() => setViewType('percentage')}
            className={`px-3 py-1 text-sm rounded ${
              viewType === 'percentage' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Usage %
          </button>
          <button
            onClick={() => setViewType('models')}
            className={`px-3 py-1 text-sm rounded ${
              viewType === 'models' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Models
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{Math.round(totalPRUs * 100) / 100}</div>
          <div className="text-sm text-gray-600">Total PRUs</div>
          <div className="text-xs text-gray-500">{data.length > 0 ? Math.round((totalPRUs / data.length) * 100) / 100 : 0}/day avg</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">${Math.round(totalCost * 100) / 100}</div>
          <div className="text-sm text-gray-600">Service Value</div>
          <div className="text-xs text-gray-500">${data.length > 0 ? Math.round((totalCost / data.length) * 100) / 100 : 0}/day avg</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{Math.round(avgPRUPercentage * 100) / 100}%</div>
          <div className="text-sm text-gray-600">Avg PRU Usage</div>
          <div className="text-xs text-gray-500">{totalPRURequests}/{totalRequests} requests</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">${Math.round(maxCostDay.serviceValue * 100) / 100}</div>
          <div className="text-sm text-gray-600">Peak Service Value Day</div>
          <div className="text-xs text-gray-500">{new Date(maxCostDay.date).toLocaleDateString()}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{topModels.length}</div>
          <div className="text-sm text-gray-600">Premium Models</div>
          <div className="text-xs text-gray-500">Used in period</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        <Chart type="bar" data={chartData} options={options} />
      </div>

      {/* Cost Breakdown */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <InsightsCard title="PRU Efficiency" variant="purple">
          <p>
            Average cost per PRU request: ${totalPRURequests > 0 ? Math.round((totalCost / totalPRURequests) * 100) / 100 : 0}.
            {avgPRUPercentage > 30 ? ' High premium model usage.' : avgPRUPercentage > 15 ? ' Moderate premium usage.' : ' Primarily standard models.'}
          </p>
        </InsightsCard>
        <InsightsCard title="Cost Optimization" variant="green">
          <p>
            {avgPRUPercentage > 50 ? 'Consider reviewing premium model usage for optimization opportunities.' : 
             avgPRUPercentage > 25 ? 'Balanced usage of premium and standard models.' :
             'Efficient use of included models minimizes additional costs.'}
          </p>
        </InsightsCard>
        <InsightsCard title="Model Insights" variant="blue">
          <p>
            Top premium models used: {topModels.length > 0 ? topModels.slice(0, 3).join(', ') : 'None'}
            {topModels.length > 3 && ` +${topModels.length - 3} more`}
          </p>
        </InsightsCard>
      </div>
    </div>
  );
}
