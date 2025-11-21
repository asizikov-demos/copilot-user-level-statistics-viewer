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
import type { ModeImpactData } from '../../utils/metricCalculators';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface ModeImpactChartProps {
  data: ModeImpactData[];
  title: string;
  description: string;
  addedColor?: string;
  addedBorderColor?: string;
  deletedColor?: string;
  deletedBorderColor?: string;
  emptyStateMessage?: string;
}

const DEFAULT_DELETED_COLOR = 'rgba(248, 113, 113, 0.85)';
const DEFAULT_DELETED_BORDER_COLOR = 'rgb(239, 68, 68)';

export default function ModeImpactChart({
  data,
  title,
  description,
  addedColor = 'rgba(34, 197, 94, 0.85)',
  addedBorderColor = 'rgb(34, 197, 94)',
  deletedColor = DEFAULT_DELETED_COLOR,
  deletedBorderColor = DEFAULT_DELETED_BORDER_COLOR,
  emptyStateMessage = 'No impact data available for this mode',
}: ModeImpactChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="text-center py-8 text-gray-500">{emptyStateMessage}</div>
      </div>
    );
  }

  const chartData = {
    labels: data.map(entry => {
      const date = new Date(entry.date);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }),
    datasets: [
      {
        label: 'Lines Deleted',
        data: data.map(entry => entry.locDeleted),
        backgroundColor: deletedColor,
        borderColor: deletedBorderColor,
        borderWidth: 1,
        stack: 'impact',
      },
      {
        label: 'Lines Added',
        data: data.map(entry => entry.locAdded),
        backgroundColor: addedColor,
        borderColor: addedBorderColor,
        borderWidth: 1,
        stack: 'impact',
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
        ticks: {
          callback: function (value: unknown) {
            const numeric = typeof value === 'number' ? value : 0;
            return numeric.toLocaleString();
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
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
          label: function (context: TooltipItem<'bar'>) {
            const dataset = context.dataset.label;
            const value = context.parsed.y;

            if (dataset === 'Lines Added') {
              return `Lines Added: +${value.toLocaleString()}`;
            }
            if (dataset === 'Lines Deleted') {
              return `Lines Deleted: -${value.toLocaleString()}`;
            }
            return '';
          },
          afterBody: function (tooltipItems: TooltipItem<'bar'>[]) {
            if (tooltipItems.length === 0) return [];
            const index = tooltipItems[0].dataIndex;
            const entry = data[index];
            const net = entry.netChange;
            const netPrefix = net >= 0 ? '+' : '';
            return [
              `Net Change: ${netPrefix}${net.toLocaleString()} lines`,
              `Active Users: ${entry.userCount}`,
            ];
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const totalAdded = data.reduce((sum, entry) => sum + entry.locAdded, 0);
  const totalDeleted = data.reduce((sum, entry) => sum + entry.locDeleted, 0);
  const netChange = totalAdded - totalDeleted;
  const uniqueUsers = data[0]?.totalUniqueUsers ?? 0;
  const averageDailyUsers = Math.round(
    data.reduce((sum, entry) => sum + entry.userCount, 0) / data.length
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {title} ({uniqueUsers} Unique Users)
          </h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <div className="text-right space-y-1">
          <div className="text-sm">
            <span className="font-medium text-green-600">+ Total Added:</span>{' '}
            <span className="text-green-600">{totalAdded.toLocaleString()}</span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-red-600">- Total Deleted:</span>{' '}
            <span className="text-red-600">{totalDeleted.toLocaleString()}</span>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">Net Change:</span>
            <span className={`ml-1 ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netChange >= 0 ? '+' : ''}{netChange.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="h-80">
        <Bar data={chartData} options={options} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-gray-500">
        <div>Average daily users: {averageDailyUsers}</div>
      </div>
    </div>
  );
}
