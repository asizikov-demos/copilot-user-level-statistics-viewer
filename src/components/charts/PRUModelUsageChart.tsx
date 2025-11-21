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
  TooltipItem,
  Filler
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { DailyModelUsageData } from '../../utils/metricCalculators';
import InsightsCard from '../ui/InsightsCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PRUModelUsageChartProps {
  data: DailyModelUsageData[];
}

export default function PRUModelUsageChart({ data }: PRUModelUsageChartProps) {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily PRU vs Standard Model Usage</h3>
        <div className="text-center text-gray-500 py-8">
          No model usage data available
        </div>
      </div>
    );
  }

  // Calculate summary statistics
  const totalPRURequests = data.reduce((sum, d) => sum + d.pruModels, 0);
  const totalStandardRequests = data.reduce((sum, d) => sum + d.standardModels, 0);
  const totalUnknownRequests = data.reduce((sum, d) => sum + d.unknownModels, 0);
  const totalPRUs = data.reduce((sum, d) => sum + d.totalPRUs, 0);
  const totalCost = data.reduce((sum, d) => sum + d.serviceValue, 0);
  const grandTotal = totalPRURequests + totalStandardRequests + totalUnknownRequests;

  const chartData = {
    labels: data.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Premium Models (PRU)',
        data: data.map(d => d.pruModels),
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        fill: chartType === 'area',
        tension: 0.4
      },
      {
        label: 'Standard Models (GPT-4.1/4o)',
        data: data.map(d => d.standardModels),
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        fill: chartType === 'area',
        tension: 0.4
      },
      {
        label: 'Unknown Models',
        data: data.map(d => d.unknownModels),
        backgroundColor: 'rgba(156, 163, 175, 0.6)',
        borderColor: 'rgb(156, 163, 175)',
        borderWidth: 2,
        fill: chartType === 'area',
        tension: 0.4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'line' | 'bar'>) {
            const value = context.parsed.y;
            const datasetLabel = context.dataset.label;
            
            return `${datasetLabel}: ${value} requests`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Number of Requests',
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Daily PRU vs Standard Model Usage</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('area')}
            className={`px-3 py-1 text-sm rounded ${
              chartType === 'area' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Area
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 text-sm rounded ${
              chartType === 'bar' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Bar
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{totalPRURequests}</div>
          <div className="text-sm text-gray-600">PRU Requests</div>
          <div className="text-xs text-gray-500">
            {grandTotal > 0 ? `${Math.round((totalPRURequests / grandTotal) * 100)}%` : '0%'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{totalStandardRequests}</div>
          <div className="text-sm text-gray-600">Standard Requests</div>
          <div className="text-xs text-gray-500">
            {grandTotal > 0 ? `${Math.round((totalStandardRequests / grandTotal) * 100)}%` : '0%'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-600">{totalUnknownRequests}</div>
          <div className="text-sm text-gray-600">Unknown Requests</div>
          <div className="text-xs text-gray-500">
            {grandTotal > 0 ? `${Math.round((totalUnknownRequests / grandTotal) * 100)}%` : '0%'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{Math.round(totalPRUs * 100) / 100}</div>
          <div className="text-sm text-gray-600">Total PRUs</div>
          <div className="text-xs text-gray-500">
            Avg: {data.length > 0 ? Math.round((totalPRUs / data.length) * 100) / 100 : 0}/day
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">${Math.round(totalCost * 100) / 100}</div>
          <div className="text-sm text-gray-600">Service Value</div>
          <div className="text-xs text-gray-500">
            Avg: ${data.length > 0 ? Math.round((totalCost / data.length) * 100) / 100 : 0}/day
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        <Chart type={chartType === 'area' ? 'line' : 'bar'} data={chartData} options={options} />
      </div>

      {/* Insights */}
      <div className="mt-4">
        <InsightsCard title="Model Types" variant="blue">
          <p>
            <strong>PRU Models:</strong> Premium models like Claude and Gemini that consume Premium Request Units (PRUs).{' '}
            <strong className="ml-1">Standard Models:</strong> GPT-4.1 and GPT-4o included with paid plans at no additional cost.
          </p>
        </InsightsCard>
      </div>
    </div>
  );
}
