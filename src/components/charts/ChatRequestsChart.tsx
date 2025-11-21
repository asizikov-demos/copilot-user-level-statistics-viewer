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
import { DailyChatRequestsData } from '../../utils/metricCalculators';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ChatRequestsChartProps {
  data: DailyChatRequestsData[];
}

export default function ChatRequestsChart({ data }: ChatRequestsChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Chat Requests</h3>
        <div className="text-center py-8 text-gray-500">
          No chat request data available
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
        label: 'Ask Mode Requests',
        data: data.map(d => d.askModeRequests),
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
        label: 'Agent Mode Requests',
        data: data.map(d => d.agentModeRequests),
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
        label: 'Edit Mode Requests',
        data: data.map(d => d.editModeRequests),
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
        label: 'Inline Mode Requests',
        data: data.map(d => d.inlineModeRequests),
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
            
            return `${datasetLabel}: ${value} requests`;
          },
          afterBody: function(tooltipItems: TooltipItem<'line'>[]) {
            if (tooltipItems.length > 0) {
              const dataIndex = tooltipItems[0].dataIndex;
              const dayData = data[dataIndex];
              const totalRequests = dayData.askModeRequests + dayData.agentModeRequests + dayData.editModeRequests + dayData.inlineModeRequests;
              return [
                '',
                `Date: ${dayData.date}`,
                `Total requests: ${totalRequests}`
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
          text: 'Number of Requests',
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
  const totalAskRequests = data.reduce((sum, d) => sum + d.askModeRequests, 0);
  const totalAgentRequests = data.reduce((sum, d) => sum + d.agentModeRequests, 0);
  const totalEditRequests = data.reduce((sum, d) => sum + d.editModeRequests, 0);
  const totalInlineRequests = data.reduce((sum, d) => sum + d.inlineModeRequests, 0);
  const grandTotal = totalAskRequests + totalAgentRequests + totalEditRequests + totalInlineRequests;

  const avgAskRequests = data.length > 0 
    ? Math.round((totalAskRequests / data.length) * 100) / 100
    : 0;

  const avgAgentRequests = data.length > 0 
    ? Math.round((totalAgentRequests / data.length) * 100) / 100
    : 0;

  const avgEditRequests = data.length > 0 
    ? Math.round((totalEditRequests / data.length) * 100) / 100
    : 0;

  const avgInlineRequests = data.length > 0 
    ? Math.round((totalInlineRequests / data.length) * 100) / 100
    : 0;

  const maxAskRequests = data.length > 0 ? Math.max(...data.map(d => d.askModeRequests)) : 0;
  const maxAgentRequests = data.length > 0 ? Math.max(...data.map(d => d.agentModeRequests)) : 0;
  const maxEditRequests = data.length > 0 ? Math.max(...data.map(d => d.editModeRequests)) : 0;
  const maxInlineRequests = data.length > 0 ? Math.max(...data.map(d => d.inlineModeRequests)) : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Daily Chat Requests</h3>
          <p className="text-sm text-gray-600">
            Number of user-initiated chat interactions per mode each day
          </p>
        </div>
        <div className="text-right space-y-1">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Avg Ask:</span> {avgAskRequests}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Avg Agent:</span> {avgAgentRequests}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Avg Edit:</span> {avgEditRequests}
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Avg Inline:</span> {avgInlineRequests}
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
      
      <div className="mt-4 grid grid-cols-5 gap-4 text-xs text-gray-500">
        <div>
          <span className="font-medium text-green-600">Ask Mode:</span> {totalAskRequests} total (max {maxAskRequests}/day)
        </div>
        <div>
          <span className="font-medium text-purple-600">Agent Mode:</span> {totalAgentRequests} total (max {maxAgentRequests}/day)
        </div>
        <div>
          <span className="font-medium text-amber-600">Edit Mode:</span> {totalEditRequests} total (max {maxEditRequests}/day)
        </div>
        <div>
          <span className="font-medium text-red-600">Inline Mode:</span> {totalInlineRequests} total (max {maxInlineRequests}/day)
        </div>
        <div>
          <span className="font-medium text-gray-600">All Modes:</span> {grandTotal} total requests
        </div>
      </div>
    </div>
  );
}
