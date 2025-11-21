'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { DailyEngagementData } from '../../utils/metricCalculators';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface EngagementChartProps {
  data: DailyEngagementData[];
}

export default function EngagementChart({ data }: EngagementChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily User Engagement</h3>
        <div className="text-center py-8 text-gray-500">
          No engagement data available
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
        label: 'User Engagement %',
        data: data.map(d => d.engagementPercentage),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
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
          label: function(context: TooltipItem<'line'>) {
            const dataIndex = context.dataIndex;
            const dayData = data[dataIndex];
            return [
              `Engagement: ${dayData.engagementPercentage}%`,
              `Active Users: ${dayData.activeUsers}`,
              `Total Users: ${dayData.totalUsers}`,
            ];
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
        grid: {
          display: false,
        },
      },
      y: {
        title: {
          display: true,
          text: 'Engagement Percentage (%)',
        },
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value: unknown) {
            return value + '%';
          }
        }
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const avgEngagement = data.length > 0 
    ? Math.round((data.reduce((sum, d) => sum + d.engagementPercentage, 0) / data.length) * 100) / 100
    : 0;

  const maxEngagement = data.length > 0 
    ? Math.max(...data.map(d => d.engagementPercentage))
    : 0;

  const minEngagement = data.length > 0 
    ? Math.min(...data.map(d => d.engagementPercentage))
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Daily User Engagement</h3>
          <p className="text-sm text-gray-600">
            Percentage of total users active each day during the reporting period
          </p>
        </div>
        <div className="text-right space-y-1">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Avg:</span> {avgEngagement}%
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Max:</span> {maxEngagement}%
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Min:</span> {minEngagement}%
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        Total unique users in reporting period: {data[0]?.totalUsers || 0}
      </div>
    </div>
  );
}
