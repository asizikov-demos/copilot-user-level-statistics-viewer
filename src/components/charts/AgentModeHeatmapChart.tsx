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
import { Bar, Line } from 'react-chartjs-2';
import { AgentModeHeatmapData } from '../../utils/metricCalculators';
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

interface AgentModeHeatmapChartProps {
  data: AgentModeHeatmapData[];
}

export default function AgentModeHeatmapChart({ data }: AgentModeHeatmapChartProps) {
  const [chartType, setChartType] = useState<'heatmap' | 'line' | 'bar'>('heatmap');

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Agent Mode Usage Heatmap</h3>
        <div className="text-center text-gray-500 py-8">
          No Agent Mode usage data available
        </div>
      </div>
    );
  }

  // Calculate summary statistics
  const totalRequests = data.reduce((sum, d) => sum + d.agentModeRequests, 0);
  const peakDay = data.reduce((max, d) => d.agentModeRequests > max.agentModeRequests ? d : max, data[0]);
  const avgRequestsPerDay = data.length > 0 ? Math.round((totalRequests / data.length) * 100) / 100 : 0;

  // Generate heatmap visualization
  const getIntensityColor = (intensity: number) => {
    const colors = [
      'rgb(243, 244, 246)', // intensity 0 - very light gray
      'rgb(254, 202, 202)', // intensity 1 - very light red
      'rgb(252, 165, 165)', // intensity 2 - light red
      'rgb(248, 113, 113)', // intensity 3 - medium red
      'rgb(239, 68, 68)',   // intensity 4 - red
      'rgb(220, 38, 38)'    // intensity 5 - dark red
    ];
    return colors[Math.min(intensity, 5)];
  };

  const chartData = chartType === 'heatmap' ? {
    labels: data.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [{
      label: 'Agent Mode Requests',
      data: data.map(d => d.agentModeRequests),
      backgroundColor: data.map(d => getIntensityColor(d.intensity)),
      borderColor: 'rgb(239, 68, 68)',
      borderWidth: 1
    }]
  } : {
    labels: data.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Agent Mode Requests',
        data: data.map(d => d.agentModeRequests),
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: 'Unique Users',
        data: data.map(d => d.uniqueUsers),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: chartType === 'heatmap' ? {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Agent Mode Requests'
        },
        beginAtZero: true
      }
    } : {
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
          text: 'Agent Mode Requests'
        },
        beginAtZero: true
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Unique Users'
        },
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
      }
    },
    plugins: {
      title: {
        display: true,
        text: 'Agent Mode Usage Intensity'
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
              `Unique Users: ${dayData.uniqueUsers}`,
              `Intensity Level: ${dayData.intensity}/5`
            ];
          }
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Agent Mode Usage Heatmap</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('heatmap')}
            className={`px-3 py-1 text-sm rounded ${
              chartType === 'heatmap' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Heatmap
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 text-sm rounded ${
              chartType === 'line' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Line
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{totalRequests}</div>
          <div className="text-sm text-gray-600">Total Requests</div>
          <div className="text-xs text-gray-500">{avgRequestsPerDay}/day avg</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{data.reduce((sum, d) => sum + d.uniqueUsers, 0)}</div>
          <div className="text-sm text-gray-600">User-Days</div>
          <div className="text-xs text-gray-500">Total user sessions</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{peakDay.agentModeRequests}</div>
          <div className="text-sm text-gray-600">Peak Day</div>
          <div className="text-xs text-gray-500">{new Date(peakDay.date).toLocaleDateString()}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{Math.max(...data.map(d => d.intensity))}</div>
          <div className="text-sm text-gray-600">Max Intensity</div>
          <div className="text-xs text-gray-500">Scale 1-5</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        {chartType === 'heatmap' && <Bar data={chartData} options={options} />}
        {chartType === 'line' && <Line data={chartData} options={options} />}
        {chartType === 'bar' && <Bar data={chartData} options={options} />}
      </div>

      {/* Intensity Legend for Heatmap */}
      {chartType === 'heatmap' && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Intensity Scale:</h4>
          <div className="flex items-center gap-2 text-xs">
            {[0, 1, 2, 3, 4, 5].map(level => (
              <div key={level} className="flex items-center gap-1">
                <div 
                  className="w-4 h-4 border border-gray-300 rounded"
                  style={{ backgroundColor: getIntensityColor(level) }}
                ></div>
                <span className="text-gray-600">{level}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Insights */}
      <div className="mt-6">
        <InsightsCard title="Agent Mode Insights" variant="red">
          <p>
            Agent Mode is an advanced feature that creates autonomous coding sessions.
            {totalRequests > 100 ? ' High usage indicates strong adoption of advanced AI features.' : ' Consider promoting Agent Mode for complex coding tasks.'}
          </p>
        </InsightsCard>
      </div>
    </div>
  );
}
