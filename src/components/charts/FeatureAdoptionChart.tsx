'use client';

import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { FeatureAdoptionData } from '../../utils/metricsParser';
import InsightsCard from '../ui/InsightsCard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface FeatureAdoptionChartProps {
  data: FeatureAdoptionData;
}

export default function FeatureAdoptionChart({ data }: FeatureAdoptionChartProps) {
  const [viewType, setViewType] = useState<'absolute' | 'percentage'>('absolute');

  if (!data || data.totalUsers === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Feature Adoption Funnel</h3>
        <div className="text-center text-gray-500 py-8">
          No feature adoption data available
        </div>
      </div>
    );
  }

  const features = [
    { name: 'Total Users', count: data.totalUsers, color: 'rgb(99, 102, 241)', description: 'All users in the dataset' },
    { name: 'Code Completion', count: data.completionUsers, color: 'rgb(34, 197, 94)', description: 'Users who used code completion' },
    { name: 'Chat Features', count: data.chatUsers, color: 'rgb(59, 130, 246)', description: 'Users who used any chat feature' },
    { name: 'Ask Mode', count: data.askModeUsers, color: 'rgb(147, 51, 234)', description: 'Users who used chat ask mode' },
    { name: 'Edit Mode', count: data.editModeUsers, color: 'rgb(245, 158, 11)', description: 'Users who used chat edit mode' },
    { name: 'Agent Mode', count: data.agentModeUsers, color: 'rgb(239, 68, 68)', description: 'Users who used agent mode' },
    { name: 'Inline Chat', count: data.inlineModeUsers, color: 'rgb(168, 85, 247)', description: 'Users who used inline chat' },
    { name: 'Code Review', count: data.codeReviewUsers, color: 'rgb(20, 184, 166)', description: 'Users who used code review features' }
  ];

  const chartData = {
    labels: features.map(f => f.name),
    datasets: [{
      label: viewType === 'absolute' ? 'Number of Users' : 'Percentage of Total Users',
      data: viewType === 'absolute' 
        ? features.map(f => f.count)
        : features.map(f => data.totalUsers > 0 ? Math.round((f.count / data.totalUsers) * 100 * 100) / 100 : 0),
      backgroundColor: features.map(f => f.color),
      borderColor: features.map(f => f.color),
      borderWidth: 1
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      title: {
        display: true,
        text: 'GitHub Copilot Feature Adoption Funnel'
      },
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          title: function(context: TooltipItem<'bar'>[]) {
            const index = context[0].dataIndex;
            return features[index].name;
          },
          label: function(context: TooltipItem<'bar'>) {
            const index = context.dataIndex;
            const feature = features[index];
            const percentage = data.totalUsers > 0 ? Math.round((feature.count / data.totalUsers) * 100 * 100) / 100 : 0;
            return [
              `Users: ${feature.count}`,
              `Percentage: ${percentage}%`,
              `Description: ${feature.description}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: viewType === 'absolute' ? 'Number of Users' : 'Percentage (%)'
        },
        max: viewType === 'percentage' ? 100 : undefined
      },
      y: {
        title: {
          display: true,
          text: 'Features'
        }
      }
    }
  };

  // Calculate adoption rates
  const completionRate = data.totalUsers > 0 ? (data.completionUsers / data.totalUsers) * 100 : 0;
  const chatRate = data.totalUsers > 0 ? (data.chatUsers / data.totalUsers) * 100 : 0;
  const agentRate = data.totalUsers > 0 ? (data.agentModeUsers / data.totalUsers) * 100 : 0;
  const advancedUserRate = data.totalUsers > 0 ? (data.agentModeUsers / data.totalUsers) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Feature Adoption Funnel</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewType('absolute')}
            className={`px-3 py-1 text-sm rounded ${
              viewType === 'absolute' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Absolute
          </button>
          <button
            onClick={() => setViewType('percentage')}
            className={`px-3 py-1 text-sm rounded ${
              viewType === 'percentage' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Percentage
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{Math.round(completionRate)}%</div>
          <div className="text-sm text-gray-600">Completion Adoption</div>
          <div className="text-xs text-gray-500">{data.completionUsers} users</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{Math.round(chatRate)}%</div>
          <div className="text-sm text-gray-600">Chat Adoption</div>
          <div className="text-xs text-gray-500">{data.chatUsers} users</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{Math.round(agentRate)}%</div>
          <div className="text-sm text-gray-600">Agent Mode Adoption</div>
          <div className="text-xs text-gray-500">{data.agentModeUsers} users</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{Math.round(advancedUserRate)}%</div>
          <div className="text-sm text-gray-600">Advanced Users</div>
          <div className="text-xs text-gray-500">Using Agent Mode</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        <Bar data={chartData} options={options} />
      </div>

      {/* Insights */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <InsightsCard title="Feature Journey" variant="green">
          <p>
            {completionRate > 80 ? 'Excellent' : completionRate > 60 ? 'Good' : 'Low'} code completion adoption.
            {chatRate > 40 ? ' Strong' : chatRate > 20 ? ' Moderate' : ' Low'} chat feature engagement.
            {agentRate > 10 ? ' Good' : agentRate > 5 ? ' Emerging' : ' Limited'} Agent Mode usage.
          </p>
        </InsightsCard>
        <InsightsCard title="Advanced Features" variant="blue">
          <p>
            Agent Mode is an advanced feature that can drive significant value for users.
            {agentRate > 15 ? ' High adoption suggests good value perception.' : ' Consider promoting Agent Mode benefits to increase adoption.'}
          </p>
        </InsightsCard>
      </div>
    </div>
  );
}
