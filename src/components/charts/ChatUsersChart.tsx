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
import { DailyChatUsersData } from '../../utils/metricCalculators';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ChatUsersChartProps {
  data: DailyChatUsersData[];
}

export default function ChatUsersChart({ data }: ChatUsersChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Chat Users Trends</h3>
        <div className="text-center py-8 text-gray-500">
          No chat user data available
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
        label: 'Chat: Ask Mode',
        data: data.map(d => d.askModeUsers),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Chat: Agent Mode',
        data: data.map(d => d.agentModeUsers),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointBackgroundColor: 'rgb(147, 51, 234)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Chat: Edit Mode',
        data: data.map(d => d.editModeUsers),
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointBackgroundColor: 'rgb(245, 158, 11)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Chat: Inline Mode',
        data: data.map(d => d.inlineModeUsers),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointBackgroundColor: 'rgb(239, 68, 68)',
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
            const value = context.parsed.y;
            const datasetLabel = context.dataset.label;
            
            return `${datasetLabel}: ${value} users`;
          },
          afterBody: function(tooltipItems: TooltipItem<'line'>[]) {
            if (tooltipItems.length > 0) {
              const dataIndex = tooltipItems[0].dataIndex;
              const dayData = data[dataIndex];
              const totalChatUsers = Math.max(dayData.askModeUsers, dayData.agentModeUsers, dayData.editModeUsers, dayData.inlineModeUsers);
              return [
                '',
                `Date: ${dayData.date}`,
                `Peak chat users: ${totalChatUsers}`
              ];
            }
            return [];
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
          text: 'Number of Users',
        },
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          stepSize: 1,
          callback: function(value: unknown) {
            return Number(value);
          }
        }
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  // Calculate summary statistics
  const avgAskMode = data.length > 0 
    ? Math.round((data.reduce((sum, d) => sum + d.askModeUsers, 0) / data.length) * 100) / 100
    : 0;

  const avgAgentMode = data.length > 0 
    ? Math.round((data.reduce((sum, d) => sum + d.agentModeUsers, 0) / data.length) * 100) / 100
    : 0;

  const avgEditMode = data.length > 0 
    ? Math.round((data.reduce((sum, d) => sum + d.editModeUsers, 0) / data.length) * 100) / 100
    : 0;

  const avgInlineMode = data.length > 0 
    ? Math.round((data.reduce((sum, d) => sum + d.inlineModeUsers, 0) / data.length) * 100) / 100
    : 0;

  const maxAskMode = data.length > 0 ? Math.max(...data.map(d => d.askModeUsers)) : 0;
  const maxAgentMode = data.length > 0 ? Math.max(...data.map(d => d.agentModeUsers)) : 0;
  const maxEditMode = data.length > 0 ? Math.max(...data.map(d => d.editModeUsers)) : 0;
  const maxInlineMode = data.length > 0 ? Math.max(...data.map(d => d.inlineModeUsers)) : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Daily Chat Users Trends</h3>
          <p className="text-sm text-gray-600">
            Number of unique users using different chat modes each day
          </p>
        </div>
        <div className="text-right space-y-1">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Avg Ask:</span> {avgAskMode}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Avg Agent:</span> {avgAgentMode}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Avg Edit:</span> {avgEditMode}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Avg Inline:</span> {avgInlineMode}
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
      
      <div className="mt-4 grid grid-cols-4 gap-4 text-xs text-gray-500">
        <div>
          <span className="font-medium text-green-600">Ask Mode:</span> Max {maxAskMode} users
        </div>
        <div>
          <span className="font-medium text-purple-600">Agent Mode:</span> Max {maxAgentMode} users
        </div>
        <div>
          <span className="font-medium text-amber-600">Edit Mode:</span> Max {maxEditMode} users
        </div>
        <div>
          <span className="font-medium text-red-600">Inline Mode:</span> Max {maxInlineMode} users
        </div>
      </div>
    </div>
  );
}
