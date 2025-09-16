'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { AgentImpactData } from '../utils/metricsParser';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface CodingAgentImpactChartProps {
  data: AgentImpactData[];
}

export default function CodingAgentImpactChart({ data }: CodingAgentImpactChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Coding Agent Impact</h3>
        <div className="text-center py-8 text-gray-500">
          No agent edit data available
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }),
    datasets: [
      {
        label: 'Lines Deleted',
        data: data.map(d => d.locDeleted),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
      },
      {
        label: 'Lines Added',
        data: data.map(d => d.locAdded),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'Date',
        },
        grid: {
          display: false,
        },
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: 'Lines of Code',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value: unknown) {
            const numValue = typeof value === 'number' ? value : 0;
            return numValue.toLocaleString();
          }
        }
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'bar'>) {
            const dataset = context.dataset.label;
            const value = context.parsed.y;
            
            if (dataset === 'Lines Added') {
              return `Lines Added: +${value.toLocaleString()}`;
            } else if (dataset === 'Lines Deleted') {
              return `Lines Deleted: -${value.toLocaleString()}`;
            }
            return '';
          },
          afterBody: function(tooltipItems: TooltipItem<'bar'>[]) {
            if (tooltipItems.length > 0) {
              const dataIndex = tooltipItems[0].dataIndex;
              const dayData = data[dataIndex];
              return [
                `Net Change: ${dayData.netChange >= 0 ? '+' : ''}${dayData.netChange.toLocaleString()} lines`,
                `Active Users: ${dayData.userCount}`
              ];
            }
            return [];
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  // Calculate summary statistics
  const totalAdded = data.reduce((sum, d) => sum + d.locAdded, 0);
  const totalDeleted = data.reduce((sum, d) => sum + d.locDeleted, 0);
  const netTotalChange = totalAdded - totalDeleted;
  const uniqueUsers = data.length > 0 ? data[0].totalUniqueUsers || 0 : 0;
  const avgDailyUsers = data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.userCount, 0) / data.length) : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Coding Agent Impact ({uniqueUsers} Unique Users)
          </h3>
          <p className="text-sm text-gray-600">
            Daily lines of code added and deleted through coding agent features
          </p>
        </div>
        <div className="text-right space-y-1">
          <div className="text-sm">
            <span className="font-medium text-green-600">+ Total Added:</span> <span className="text-green-600">{totalAdded.toLocaleString()}</span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-red-600">- Total Deleted:</span> <span className="text-red-600">{totalDeleted.toLocaleString()}</span>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Net Change:</span> 
            <span className={`ml-1 ${netTotalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netTotalChange >= 0 ? '+' : ''}{netTotalChange.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <Bar data={chartData} options={options} />
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-gray-500">
        <div>
          Average daily users with agent activity: {avgDailyUsers}
        </div>
        <div className="text-right">
          Agent productivity ratio: {totalDeleted > 0 ? (totalAdded / totalDeleted).toFixed(1) : '∞'}:1 (add:delete)
        </div>
      </div>
    </div>
  );
}